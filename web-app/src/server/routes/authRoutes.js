import express from "express";
import { createMemoryRateLimiter, makeEmailKey, makeIpKey } from "../lib/rateLimit.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";
import { makeToken } from "../lib/tokens.js";
import { sendAuthMail } from "../lib/mailer.js";
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from "../lib/auth.js";
import {
  consumeEmailVerificationToken,
  createPasswordResetToken,
  consumePasswordResetToken,
  consumeOneTimeLoginToken,
  findPasswordResetToken,
  deleteSessionsForUser,
  deleteSessionByToken,
} from "../db/auth.js";
import { createSession } from "../db/sessions.js";
import { createUser, findUserByEmail, setUserConfirmation, updateUserPassword } from "../db/users.js";
import { renderLayout } from "../views/layout.js";
import { renderForgotPasswordPage } from "../views/pages/forgotPasswordPage.js";
import { renderLoginPage } from "../views/pages/loginPage.js";
import { renderRegisterPage } from "../views/pages/registerPage.js";
import { renderResetPasswordPage } from "../views/pages/resetPasswordPage.js";
import { loadConfig } from "../config.js";

function renderNoticePage({ title, heading, body, linkHref, linkLabel }) {
  return renderLayout({
    title,
    body: `
      <main class="auth-shell">
        <div class="auth-card card">
          <div class="auth-header">
            <h1>${heading}</h1>
            <p>${body}</p>
          </div>
          <p class="bottom-link"><a href="${linkHref}">${linkLabel}</a></p>
        </div>
      </main>
    `,
  });
}

function turnstileTokenFromBody(body) {
  return body["cf-turnstile-response"] || body.turnstileToken || "";
}

async function verifyGate(req, env, verifier = verifyTurnstile) {
  return verifier({
    token: turnstileTokenFromBody(req.body),
    ip: req.ip,
    env,
  });
}

export function createAuthRouter({
  config: inputConfig,
  env = process.env,
  sendMail = sendAuthMail,
  verifyTurnstileImpl = verifyTurnstile,
} = {}) {
  const router = express.Router();
  const config = inputConfig || loadConfig(env);
  const loginLimiter = createMemoryRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyFn: (req) => `${makeIpKey(req)}:${makeEmailKey(req)}`,
  });
  const registerLimiter = createMemoryRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    keyFn: (req) => `${makeIpKey(req)}:${makeEmailKey(req)}`,
  });
  const resetLimiter = createMemoryRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyFn: (req) => `${makeIpKey(req)}:${makeEmailKey(req)}`,
  });

  router.get("/login", (_req, res) => res.send(renderLoginPage({ turnstileSiteKey: config.turnstileSiteKey })));
  router.get("/register", (_req, res) => res.send(renderRegisterPage({ turnstileSiteKey: config.turnstileSiteKey })));
  router.get("/forgot-password", (_req, res) => res.send(renderForgotPasswordPage({ turnstileSiteKey: config.turnstileSiteKey })));
  router.get("/magic-login", async (req, res) => {
    const token = String(req.query.token || "");
    const tokenRow = token ? await consumeOneTimeLoginToken(token) : null;
    if (!tokenRow) {
      res.status(400).send(
        renderNoticePage({
          title: "Magic login",
          heading: "Login link expired",
          body: "Ask an admin to generate a fresh link.",
          linkHref: "/login",
          linkLabel: "Back to login",
        }),
      );
      return;
    }

    const sessionToken = makeToken();
    await createSession({
      userId: tokenRow.user_id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });
    setSessionCookie(res, sessionToken);
    res.redirect("/dashboard");
  });
  router.get("/confirm-email", async (req, res) => {
    const token = String(req.query.token || "");
    const tokenRow = token ? await consumeEmailVerificationToken(token) : null;
    if (!tokenRow) {
      res.status(400).send(
        renderNoticePage({
          title: "Confirm email",
          heading: "Confirmation link expired",
          body: "Request a new confirmation email to continue.",
          linkHref: "/login",
          linkLabel: "Back to login",
        }),
      );
      return;
    }

    await setUserConfirmation(tokenRow.user_id, true);
    res.send(
      renderNoticePage({
        title: "Confirm email",
        heading: "Email confirmed",
        body: "You can now sign in to your account.",
        linkHref: "/login",
        linkLabel: "Go to login",
      }),
    );
  });

  router.post("/register", registerLimiter, async (req, res) => {
    const gate = await verifyGate(req, env, verifyTurnstileImpl);
    if (!gate.success) {
      res.status(400).send(
        renderRegisterPage({
          turnstileSiteKey: config.turnstileSiteKey,
          errorMessage: "Please complete the security check.",
        }),
      );
      return;
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || password.length < 8) {
      res.status(400).send(
        renderRegisterPage({
          turnstileSiteKey: config.turnstileSiteKey,
          errorMessage: "Please enter a valid email and password.",
        }),
      );
      return;
    }

    let user = await findUserByEmail(email);
    const passwordHash = await hashPassword(password);

    if (!user) {
      user = await createUser({ email, passwordHash });
    } else {
      if (user.is_confirmed) {
        res.status(400).send(
          renderRegisterPage({
            turnstileSiteKey: config.turnstileSiteKey,
            errorMessage: "Account already exists.",
          }),
        );
        return;
      }

      await updateUserPassword(user.id, passwordHash);
    }

    await setUserConfirmation(user.id, true);

    res.send(
      renderNoticePage({
        title: "Register",
        heading: "Account ready",
        body: "You can sign in right away.",
        linkHref: "/login",
        linkLabel: "Back to login",
      }),
    );
  });

  router.post("/login", loginLimiter, async (req, res) => {
    const gate = await verifyGate(req, env, verifyTurnstileImpl);
    if (!gate.success) {
      res.status(400).send(
        renderLoginPage({
          turnstileSiteKey: config.turnstileSiteKey,
          errorMessage: "Please complete the security check.",
        }),
      );
      return;
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = email ? await findUserByEmail(email) : null;

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      res.status(400).send(
        renderLoginPage({
          turnstileSiteKey: config.turnstileSiteKey,
          errorMessage: "Wrong email or password.",
        }),
      );
      return;
    }

    const token = makeToken();
    await createSession({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });
    setSessionCookie(res, token);
    res.redirect("/dashboard");
  });

  router.post("/logout", async (req, res) => {
    const sessionToken = readSessionToken(req);
    if (sessionToken) {
      await deleteSessionByToken(sessionToken);
    }
    clearSessionCookie(res);
    res.redirect("/login");
  });

  router.post("/forgot-password", resetLimiter, async (req, res) => {
    const gate = await verifyGate(req, env, verifyTurnstileImpl);
    if (!gate.success) {
      res.status(400).send(
        renderForgotPasswordPage({
          turnstileSiteKey: config.turnstileSiteKey,
          errorMessage: "Please complete the security check.",
        }),
      );
      return;
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    const user = email ? await findUserByEmail(email) : null;

    if (user) {
      const token = makeToken();
      await createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      await sendMail({
        env,
        to: email,
        subject: "Reset your Dienynas Sync password",
        text: `${config.baseUrl}/reset-password?token=${token}`,
        html: `<p>Reset your password:</p><p><a href="${config.baseUrl}/reset-password?token=${token}">${config.baseUrl}/reset-password?token=${token}</a></p>`,
      });
    }

    res.send(
      renderNoticePage({
        title: "Forgot password",
        heading: "Check your email",
        body: "If the address exists, we sent a reset link.",
        linkHref: "/login",
        linkLabel: "Back to login",
      }),
    );
  });

  router.get("/reset-password", async (req, res) => {
    const token = String(req.query.token || "");
    if (!token) {
      res.send(renderResetPasswordPage({ turnstileSiteKey: config.turnstileSiteKey }));
      return;
    }

    const row = await findPasswordResetToken(token);
    if (!row) {
      res.status(400).send(
        renderResetPasswordPage({
          turnstileSiteKey: config.turnstileSiteKey,
          token,
          heading: "Reset link expired",
          body: "Request a new reset email to continue.",
          errorMessage: "Reset link expired.",
        }),
      );
      return;
    }

    res.send(renderResetPasswordPage({ token, turnstileSiteKey: config.turnstileSiteKey, heading: "Set a new password", body: "Submit the form to finish resetting your account." }));
  });

  router.post("/reset-password", resetLimiter, async (req, res) => {
    const gate = await verifyGate(req, env, verifyTurnstileImpl);
    if (!gate.success) {
      res.status(400).send(
        renderNoticePage({
          title: "Reset password",
          heading: "Security check required",
          body: "Please retry the reset form.",
          linkHref: "/forgot-password",
          linkLabel: "Try again",
        }),
      );
      return;
    }

    const token = String(req.body.token || "");
    const password = String(req.body.password || "");
    if (password.length < 8) {
      res.status(400).send(
        renderResetPasswordPage({
          token,
          turnstileSiteKey: config.turnstileSiteKey,
          errorMessage: "The link is invalid or the password is too short.",
        }),
      );
      return;
    }

    const row = token ? await consumePasswordResetToken(token) : null;
    if (!row) {
      res.status(400).send(
        renderResetPasswordPage({
          token,
          turnstileSiteKey: config.turnstileSiteKey,
          errorMessage: "The link is invalid or the password is too short.",
        }),
      );
      return;
    }

    const passwordHash = await hashPassword(password);
    await updateUserPassword(row.user_id, passwordHash);
    await deleteSessionsForUser(row.user_id);

    res.send(
      renderNoticePage({
        title: "Reset password",
        heading: "Password updated",
        body: "You can now sign in with your new password.",
        linkHref: "/login",
        linkLabel: "Back to login",
      }),
    );
  });

  return router;
}
