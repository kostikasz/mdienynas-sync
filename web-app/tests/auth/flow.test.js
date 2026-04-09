import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

function createFakePool() {
  const store = {
    users: [],
    sessions: [],
    emailVerificationTokens: [],
    passwordResetTokens: [],
    courses: [],
  };

  return {
    store,
    async query(sql, params = []) {
      const normalized = String(sql).replace(/\s+/g, " ").trim().toLowerCase();

      if (normalized.startsWith("insert into users")) {
        const [email, passwordHash] = params;
        const row = {
          id: randomUUID(),
          email,
          password_hash: passwordHash,
          is_confirmed: false,
          confirmed_at: null,
          created_at: new Date(),
        };
        store.users.push(row);
        return { rows: [row] };
      }

      if (normalized.startsWith("select * from users where email = $1")) {
        const [email] = params;
        return { rows: store.users.filter((user) => user.email === email) };
      }

      if (normalized.startsWith("update users set is_confirmed")) {
        const [userId, confirmed] = params;
        const row = store.users.find((user) => user.id === userId);
        if (!row) return { rows: [] };
        row.is_confirmed = confirmed;
        row.confirmed_at = confirmed ? new Date() : null;
        return { rows: [row] };
      }

      if (normalized.startsWith("update users set password_hash")) {
        const [userId, passwordHash] = params;
        const row = store.users.find((user) => user.id === userId);
        if (!row) return { rows: [] };
        row.password_hash = passwordHash;
        return { rows: [row] };
      }

      if (normalized.startsWith("select * from users where id = $1")) {
        const [userId] = params;
        return { rows: store.users.filter((user) => user.id === userId) };
      }

      if (normalized.startsWith("insert into email_verification_tokens")) {
        const [userId, tokenHash, expiresAt] = params;
        const row = {
          id: randomUUID(),
          user_id: userId,
          token_hash: tokenHash,
          expires_at: expiresAt,
          used_at: null,
        };
        store.emailVerificationTokens.push(row);
        return { rows: [row] };
      }

      if (normalized.startsWith("update email_verification_tokens")) {
        const [tokenHash] = params;
        const row = store.emailVerificationTokens.find(
          (token) => token.token_hash === tokenHash && !token.used_at && token.expires_at > new Date(),
        );
        if (!row) return { rows: [] };
        row.used_at = new Date();
        return { rows: [row] };
      }

      if (normalized.startsWith("insert into password_reset_tokens")) {
        const [userId, tokenHash, expiresAt] = params;
        const row = {
          id: randomUUID(),
          user_id: userId,
          token_hash: tokenHash,
          expires_at: expiresAt,
          used_at: null,
        };
        store.passwordResetTokens.push(row);
        return { rows: [row] };
      }

      if (normalized.startsWith("update password_reset_tokens")) {
        const [tokenHash] = params;
        const row = store.passwordResetTokens.find(
          (token) => token.token_hash === tokenHash && !token.used_at && token.expires_at > new Date(),
        );
        if (!row) return { rows: [] };
        row.used_at = new Date();
        return { rows: [row] };
      }

      if (normalized.startsWith("select * from password_reset_tokens")) {
        const [tokenHash] = params;
        return {
          rows: store.passwordResetTokens.filter(
            (token) => token.token_hash === tokenHash && !token.used_at && token.expires_at > new Date(),
          ),
        };
      }

      if (normalized.startsWith("delete from sessions where user_id = $1")) {
        const [userId] = params;
        store.sessions = store.sessions.filter((session) => session.user_id !== userId);
        return { rows: [] };
      }

      if (normalized.startsWith("delete from sessions where token_hash = $1")) {
        const [tokenHash] = params;
        store.sessions = store.sessions.filter((session) => session.token_hash !== tokenHash);
        return { rows: [] };
      }

      if (normalized.startsWith("insert into sessions")) {
        const [userId, tokenHash, expiresAt] = params;
        const row = {
          id: randomUUID(),
          user_id: userId,
          token_hash: tokenHash,
          expires_at: expiresAt,
          created_at: new Date(),
        };
        store.sessions.push(row);
        return { rows: [row] };
      }

      if (normalized.includes("from sessions s join users u on u.id = s.user_id")) {
        const [tokenHash] = params;
        const session = store.sessions.find(
          (row) => row.token_hash === tokenHash && row.expires_at > new Date(),
        );
        if (!session) return { rows: [] };
        const user = store.users.find((row) => row.id === session.user_id);
        if (!user) return { rows: [] };
        return {
          rows: [{
            ...session,
            email: user.email,
            is_confirmed: user.is_confirmed,
          }],
        };
      }

      if (normalized.startsWith("select * from courses where user_id = $1")) {
        const [userId] = params;
        return { rows: store.courses.filter((course) => course.user_id === userId) };
      }

      return { rows: [] };
    },
  };
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    ended: false,
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    getHeader(name) {
      return this.headers[String(name).toLowerCase()];
    },
    removeHeader(name) {
      delete this.headers[String(name).toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      if (payload !== undefined) {
        this.body += String(payload);
      }
      this.ended = true;
      return this;
    },
    redirect(location) {
      this.statusCode = 302;
      this.setHeader("location", location);
      this.ended = true;
      return this;
    },
    end(payload) {
      if (payload !== undefined) {
        this.body += String(payload);
      }
      this.ended = true;
      return this;
    },
  };
}

async function dispatchHandlers(handlers, req, res) {
  for (const handler of handlers) {
    let nextCalled = false;
    const next = (err) => {
      if (err) {
        throw err;
      }
      nextCalled = true;
    };

    const result = handler(req, res, next);
    if (result && typeof result.then === "function") {
      await result;
    }

    if (res.ended) {
      return;
    }

    if (handler.length < 3) {
      return;
    }

    if (!nextCalled) {
      return;
    }
  }
}

function pathnameFrom(url) {
  return new URL(url, "http://localhost").pathname;
}

async function dispatchRouter(router, req, res) {
  const pathname = pathnameFrom(req.url);

  for (const layer of router.stack) {
    if (!layer.route) {
      if (layer.handle.length >= 3) {
        let nextCalled = false;
        const next = (err) => {
          if (err) {
            throw err;
          }
          nextCalled = true;
        };
        const result = layer.handle(req, res, next);
        if (result && typeof result.then === "function") {
          await result;
        }
        if (res.ended || !nextCalled) {
          return;
        }
      }
      continue;
    }

    if (!layer.route.methods[req.method.toLowerCase()]) {
      continue;
    }

    if (layer.route.path !== pathname) {
      continue;
    }

    await dispatchHandlers(layer.route.stack.map((entry) => entry.handle), req, res);
    return;
  }
}

async function request(router, { method, path, body = {}, headers = {}, preMiddleware = [] }) {
  const req = {
    method,
    url: path,
    originalUrl: path,
    headers: { host: "localhost", ...headers },
    body,
    query: Object.fromEntries(new URL(path, "http://localhost").searchParams.entries()),
    params: {},
    ip: "127.0.0.1",
  };
  const res = createResponse();

  for (const middleware of preMiddleware) {
    await middleware(req, res, () => {});
    if (res.ended) {
      return { req, res };
    }
  }

  await dispatchRouter(router, req, res);
  return { req, res };
}

test("register and login flow works end to end", async () => {
  const pg = await import("pg");
  const fakePool = createFakePool();
  pg.default.Pool = class FakePool {
    query(sql, params) {
      return fakePool.query(sql, params);
    }
  };

  const [
    { createAuthRouter },
    { createAuthMiddleware },
    { createAppRouter },
  ] = await Promise.all([
    import("../../src/server/routes/authRoutes.js"),
    import("../../src/server/lib/auth.js"),
    import("../../src/server/routes/appRoutes.js"),
  ]);

  const sentMail = [];
  const appConfig = {
    NODE_ENV: "development",
    APP_BASE_URL: "http://localhost:3000",
    TURNSTILE_SECRET_KEY: "",
    ADMIN_EMAIL: "",
  };

  const authRouter = createAuthRouter({
    config: {
      baseUrl: appConfig.APP_BASE_URL,
      turnstileSiteKey: "",
    },
    env: appConfig,
    sendMail: async (message) => {
      sentMail.push(message);
      return { skipped: false };
    },
    verifyTurnstileImpl: async () => ({ success: true }),
  });

  const authMiddleware = createAuthMiddleware({ adminEmail: "" });
  const appRouter = createAppRouter({
    requireUser: (req, res, next) => {
      if (!req.user) {
        res.redirect("/login");
        return;
      }
      next();
    },
  });

  const email = `user-${randomUUID()}@example.com`;
  const password = "password123";

  let response = await request(authRouter, {
    method: "POST",
    path: "/register",
    body: { email, password },
  });

  assert.equal(response.res.statusCode, 200);
  assert.match(response.res.body, /Account ready/);
  assert.equal(sentMail.length, 0);

  response = await request(authRouter, {
    method: "POST",
    path: "/login",
    body: { email, password },
  });

  assert.equal(response.res.statusCode, 302);
  const cookie = response.res.getHeader("set-cookie");
  assert.ok(cookie);
  assert.match(String(cookie), /session=/);

  const dashboardRequest = {
    method: "GET",
    url: "/dashboard",
    originalUrl: "/dashboard",
    path: "/dashboard",
    headers: { cookie: String(cookie) },
    body: {},
    query: {},
    params: {},
    ip: "127.0.0.1",
  };
  const dashboardResponse = createResponse();
  await authMiddleware(dashboardRequest, dashboardResponse, () => {});
  await dispatchRouter(appRouter, dashboardRequest, dashboardResponse);

  assert.equal(dashboardResponse.statusCode, 200);
  assert.match(dashboardResponse.body, /Dashboard/);
});
