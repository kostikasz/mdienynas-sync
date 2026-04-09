import { renderHomePage } from "../views/pages/homePage.js";
import { renderLoginPage } from "../views/pages/loginPage.js";
import { renderRegisterPage } from "../views/pages/registerPage.js";
import { createAuthRouter } from "./authRoutes.js";
import { createAdminRouter } from "./adminRoutes.js";
import { createAppRouter } from "./appRoutes.js";
import { createImportRouter } from "./importRoutes.js";
import { createAuthMiddleware, requireAdmin, requireUser } from "../lib/auth.js";
import { loadConfig } from "../config.js";

export function registerRoutes(app, options = {}) {
  const config = options.config || loadConfig(options.env);
  app.use(createAuthMiddleware({ adminEmail: config.adminEmail }));

  app.get("/health", (_req, res) => res.status(200).send("ok"));
  app.get("/api/auth/signin", (_req, res) => res.redirect("/login"));
  app.get("/checkout", (_req, res) => res.redirect("/register"));

  app.use(createAuthRouter({
    config,
    env: options.env,
    sendMail: options.sendMail,
    verifyTurnstileImpl: options.verifyTurnstileImpl,
  }));
  app.use(createAdminRouter({ requireAdmin, config }));
  app.use(createAppRouter({ requireUser }));
  app.use(createImportRouter({ requireUser }));
  app.get("/", (_req, res) => res.status(200).send(renderHomePage()));
  app.get("/login", (_req, res) => res.status(200).send(renderLoginPage({ turnstileSiteKey: config.turnstileSiteKey })));
  app.get("/register", (_req, res) => res.status(200).send(renderRegisterPage({ turnstileSiteKey: config.turnstileSiteKey })));
}
