import test from "node:test";
import assert from "node:assert/strict";

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

function matchRoutePath(template, pathname) {
  const templateParts = template.split("/");
  const pathParts = pathname.split("/");

  if (templateParts.length !== pathParts.length) {
    return null;
  }

  const params = {};

  for (let index = 0; index < templateParts.length; index += 1) {
    const templatePart = templateParts[index];
    const pathPart = pathParts[index];

    if (templatePart.startsWith(":")) {
      params[templatePart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }

    if (templatePart !== pathPart) {
      return null;
    }
  }

  return params;
}

async function dispatch(router, req, res) {
  const pathname = new URL(req.url, "http://localhost").pathname;

  for (const layer of router.stack) {
    if (!layer.route) {
      continue;
    }

    if (!layer.route.methods[req.method.toLowerCase()]) {
      continue;
    }

    const params = matchRoutePath(layer.route.path, pathname);
    if (!params) {
      continue;
    }

    req.params = params;

    for (const entry of layer.route.stack) {
      const result = entry.handle(req, res, () => {});
      if (result && typeof result.then === "function") {
        await result;
      }

      if (res.ended) {
        return;
      }
    }

    return;
  }
}

test("admin can resend confirmation email for an unconfirmed user", async () => {
  const { createAdminRouter } = await import("../../src/server/routes/adminRoutes.js");

  const user = {
    id: "user-1",
    email: "pending@example.com",
    is_confirmed: false,
  };

  const sentMail = [];
  const tokens = [];
  const router = createAdminRouter({
    requireAdmin: (_req, _res, next) => next(),
    config: { baseUrl: "http://localhost:3000" },
    sendMail: async (message) => {
      sentMail.push(message);
      return { skipped: false };
    },
    findUserById: async (userId) => (userId === user.id ? user : null),
    createEmailVerificationToken: async (token) => {
      tokens.push(token);
      return token;
    },
    makeToken: () => "test-confirm-token",
  });

  const req = {
    method: "POST",
    url: `/admin/users/${user.id}/resend-confirmation`,
    body: {},
    headers: {},
  };
  const res = createResponse();

  await dispatch(router, req, res);

  assert.equal(res.statusCode, 200);
  assert.match(res.body, /Confirmation email sent/);
  assert.equal(sentMail.length, 1);
  assert.equal(sentMail[0].to, user.email);
  assert.equal(sentMail[0].subject, "Confirm your Dienynas Sync account");
  assert.match(sentMail[0].text, /confirm-email\?token=/);
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].userId, user.id);
  assert.equal(tokens[0].token, "test-confirm-token");
});

test("admin can send a test email to a user", async () => {
  const { createAdminRouter } = await import("../../src/server/routes/adminRoutes.js");

  const user = {
    id: "user-2",
    email: "tester@example.com",
    is_confirmed: true,
  };

  const sentMail = [];
  const router = createAdminRouter({
    requireAdmin: (_req, _res, next) => next(),
    config: { baseUrl: "http://localhost:3000" },
    sendMail: async (message) => {
      sentMail.push(message);
      return { skipped: false };
    },
    findUserById: async (userId) => (userId === user.id ? user : null),
  });

  const req = {
    method: "POST",
    url: `/admin/users/${user.id}/test-email`,
    body: {},
    headers: {},
  };
  const res = createResponse();

  await dispatch(router, req, res);

  assert.equal(res.statusCode, 200);
  assert.match(res.body, /Test email sent/);
  assert.equal(sentMail.length, 1);
  assert.equal(sentMail[0].to, user.email);
  assert.equal(sentMail[0].subject, "Dienynas Sync admin test email");
  assert.match(sentMail[0].text, /This is a test email/);
});
