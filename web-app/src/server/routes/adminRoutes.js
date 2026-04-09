import express from "express";
import { makeToken } from "../lib/tokens.js";
import { createOneTimeLoginToken, createEmailVerificationToken } from "../db/auth.js";
import { listUsersForAdmin, setUserConfirmation, findUserById } from "../db/users.js";
import { renderAdminUsersPage } from "../views/pages/adminUsersPage.js";
import { renderLayout } from "../views/layout.js";
import { sendAuthMail } from "../lib/mailer.js";

function renderStatusPage({ title, heading, body }) {
  return renderLayout({
    title,
    body: `
      <main class="app-page">
        <section class="card admin-panel">
          <div>
            <p class="eyebrow">Admin</p>
            <h1>${heading}</h1>
            <p class="section-copy">${body}</p>
          </div>
          <p><a href="/admin">Back to users</a></p>
        </section>
      </main>
    `,
  });
}

function renderLoginLinkPage({ email, link }) {
  return renderLayout({
    title: "Login link",
    body: `
      <main class="app-page">
        <section class="card admin-panel">
          <div>
            <p class="eyebrow">Admin</p>
            <h1>One-time login link</h1>
            <p class="section-copy">Share this link once to sign in as ${email}. It expires after one use.</p>
          </div>
          <p><a href="${link}">${link}</a></p>
        </section>
      </main>
    `,
  });
}

export function createAdminRouter({
  requireAdmin,
  config,
  sendMail = sendAuthMail,
  listUsersForAdmin: listUsersForAdminImpl = listUsersForAdmin,
  setUserConfirmation: setUserConfirmationImpl = setUserConfirmation,
  findUserById: findUserByIdImpl = findUserById,
  createOneTimeLoginToken: createOneTimeLoginTokenImpl = createOneTimeLoginToken,
  createEmailVerificationToken: createEmailVerificationTokenImpl = createEmailVerificationToken,
  makeToken: makeTokenImpl = makeToken,
} = {}) {
  const router = express.Router();
  const guard = requireAdmin || ((_req, _res, next) => next());

  router.use(guard);

  router.get("/admin", async (_req, res) => {
    const rows = await listUsersForAdminImpl();
    res.send(renderAdminUsersPage({ rows }));
  });

  router.post("/admin/users/:userId/confirmation", async (req, res) => {
    await setUserConfirmationImpl(req.params.userId, req.body.confirmed === "true");
    res.redirect("/admin");
  });

  router.post("/admin/users/:userId/login-link", async (req, res) => {
    const user = await findUserByIdImpl(req.params.userId);
    if (!user) {
      res.status(404).send("User not found");
      return;
    }

    const token = makeTokenImpl();
    await createOneTimeLoginTokenImpl({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 15),
    });

    res.send(
      renderLoginLinkPage({
        email: user.email,
        link: `${config?.baseUrl || "http://localhost:3000"}/magic-login?token=${token}`,
      }),
    );
  });

  router.post("/admin/users/:userId/resend-confirmation", async (req, res) => {
    const user = await findUserByIdImpl(req.params.userId);
    if (!user) {
      res.status(404).send("User not found");
      return;
    }

    if (user.is_confirmed) {
      res.status(400).send(
        renderStatusPage({
          title: "Resend confirmation",
          heading: "Account already confirmed",
          body: `${user.email} is already confirmed and does not need a new confirmation link.`,
        }),
      );
      return;
    }

    const token = makeTokenImpl();
    await createEmailVerificationTokenImpl({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    await sendMail({
      to: user.email,
      subject: "Confirm your Dienynas Sync account",
      text: `${config?.baseUrl || "http://localhost:3000"}/confirm-email?token=${token}`,
      html: `<p>Confirm your account:</p><p><a href="${config?.baseUrl || "http://localhost:3000"}/confirm-email?token=${token}">${config?.baseUrl || "http://localhost:3000"}/confirm-email?token=${token}</a></p>`,
    });

    res.send(
      renderStatusPage({
        title: "Resend confirmation",
        heading: "Confirmation email sent",
        body: `A new confirmation link was sent to ${user.email}.`,
      }),
    );
  });

  router.post("/admin/users/:userId/test-email", async (req, res) => {
    const user = await findUserByIdImpl(req.params.userId);
    if (!user) {
      res.status(404).send("User not found");
      return;
    }

    await sendMail({
      to: user.email,
      subject: "Dienynas Sync admin test email",
      text: `This is a test email from the admin panel for ${user.email}.`,
      html: `<p>This is a test email from the admin panel.</p><p>Recipient: ${user.email}</p>`,
    });

    res.send(
      renderStatusPage({
        title: "Test email",
        heading: "Test email sent",
        body: `A test email was sent to ${user.email}.`,
      }),
    );
  });

  return router;
}
