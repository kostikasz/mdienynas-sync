export function loadConfig(env = process.env) {
  return {
    port: Number(env.APP_PORT || 3000),
    baseUrl: env.APP_BASE_URL || "http://localhost:3000",
    databaseUrl: env.DATABASE_URL || "",
    sessionSecret: env.SESSION_SECRET || "",
    adminEmail: (env.ADMIN_EMAIL || "").trim().toLowerCase(),
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
    turnstileSecretKey: env.TURNSTILE_SECRET_KEY || "",
    smtpHost: env.SMTP_HOST || "",
    smtpPort: Number(env.SMTP_PORT || 587),
    smtpUser: env.SMTP_USER || "",
    smtpPass: env.SMTP_PASS || "",
    smtpFrom: env.SMTP_FROM || ""
  };
}
