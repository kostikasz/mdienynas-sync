import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

function makeFakePool() {
  const store = {
    users: [],
    oneTimeLoginTokens: [],
    sessions: [],
  };

  return {
    store,
    async query(sql, params = []) {
      const normalized = String(sql).replace(/\s+/g, " ").trim().toLowerCase();

      if (normalized.startsWith("insert into one_time_login_tokens")) {
        const [userId, tokenHash, expiresAt] = params;
        const row = {
          id: randomUUID(),
          user_id: userId,
          token_hash: tokenHash,
          expires_at: expiresAt,
          used_at: null,
        };
        store.oneTimeLoginTokens.push(row);
        return { rows: [row] };
      }

      if (normalized.startsWith("update one_time_login_tokens")) {
        const [tokenHash] = params;
        const row = store.oneTimeLoginTokens.find(
          (token) => token.token_hash === tokenHash && !token.used_at && token.expires_at > new Date(),
        );
        if (!row) return { rows: [] };
        row.used_at = new Date();
        const user = store.users.find((entry) => entry.id === row.user_id);
        return { rows: user ? [{ ...row, email: user.email }] : [] };
      }

      if (normalized.startsWith("select * from users where id = $1")) {
        const [userId] = params;
        return { rows: store.users.filter((user) => user.id === userId) };
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
        const session = store.sessions.find((row) => row.token_hash === tokenHash && row.expires_at > new Date());
        if (!session) return { rows: [] };
        const user = store.users.find((row) => row.id === session.user_id);
        if (!user) return { rows: [] };
        return { rows: [{ ...session, email: user.email, is_confirmed: user.is_confirmed }] };
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
  };
}

async function dispatch(router, req, res) {
  const pathname = new URL(req.url, "http://localhost").pathname;

  for (const layer of router.stack) {
    if (!layer.route) continue;
    if (!layer.route.methods[req.method.toLowerCase()]) continue;
    if (layer.route.path !== pathname) continue;
    for (const entry of layer.route.stack) {
      await entry.handle(req, res, () => {});
      if (res.ended) return;
    }
    return;
  }
}

test("magic login link consumes once and sets a session cookie", async () => {
  const pg = await import("pg");
  const fakePool = makeFakePool();
  pg.default.Pool = class FakePool {
    query(sql, params) {
      return fakePool.query(sql, params);
    }
  };

  const { createAuthRouter } = await import("../../src/server/routes/authRoutes.js");
  const { createOneTimeLoginToken } = await import("../../src/server/db/auth.js");

  const user = {
    id: randomUUID(),
    email: "admin@example.com",
    is_confirmed: true,
  };
  fakePool.store.users.push(user);

  const token = "magic-token";
  await createOneTimeLoginToken({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  const router = createAuthRouter({
    config: { baseUrl: "http://localhost:3000", turnstileSiteKey: "" },
    env: { NODE_ENV: "development", TURNSTILE_SECRET_KEY: "" },
    verifyTurnstileImpl: async () => ({ success: true }),
    sendMail: async () => ({ skipped: true }),
  });

  const req = {
    method: "GET",
    url: `/magic-login?token=${token}`,
    headers: {},
    query: { token },
  };
  const res = createResponse();

  await dispatch(router, req, res);

  assert.equal(res.statusCode, 302);
  assert.equal(res.getHeader("location"), "/dashboard");
  assert.match(String(res.getHeader("set-cookie") || ""), /session=/);

  const secondRes = createResponse();
  await dispatch(router, req, secondRes);
  assert.equal(secondRes.statusCode, 400);
});
