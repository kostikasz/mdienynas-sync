import nodemailer from "nodemailer";
import { loadConfig } from "../config.js";

export function createMailer(env = process.env) {
  const config = loadConfig(env);

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: false,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
}

export async function sendAuthMail({ env = process.env, to, subject, text, html }) {
  const config = loadConfig(env);
  if (!config.smtpHost || !config.smtpFrom) {
    if ((env.NODE_ENV || "development") !== "production") {
      console.log(`[mail-skip] ${subject} -> ${to}`);
    }
    return { skipped: true };
  }

  const transporter = createMailer(env);
  await transporter.sendMail({
    from: config.smtpFrom,
    to,
    subject,
    text,
    html,
  });

  return { skipped: false };
}
