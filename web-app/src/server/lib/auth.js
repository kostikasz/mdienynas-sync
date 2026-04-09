import cookie from "cookie";
import { findSessionByToken } from "../db/auth.js";

export function isAdminEmail(email, { adminEmail }) {
  return Boolean(
    email && adminEmail && email.trim().toLowerCase() === adminEmail.trim().toLowerCase(),
  );
}

export function readSessionToken(req) {
  const cookies = cookie.parse(req.headers.cookie || "");
  return cookies.session || "";
}

export function setSessionCookie(res, token, { maxAgeSeconds = 60 * 60 * 24 * 30 } = {}) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: maxAgeSeconds,
    }),
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize("session", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 0,
    }),
  );
}

export function createAuthMiddleware({ adminEmail }) {
  return async function attachCurrentUser(req, _res, next) {
    const token = readSessionToken(req);
    if (!token) {
      req.user = null;
      req.session = null;
      next();
      return;
    }

    const session = await findSessionByToken(token);
    if (!session) {
      req.user = null;
      req.session = null;
      next();
      return;
    }

    req.session = session;
    req.user = {
      id: session.user_id,
      email: session.email,
      isConfirmed: session.is_confirmed,
      isAdmin: isAdminEmail(session.email, { adminEmail }),
    };
    next();
  };
}

export function requireUser(req, res, next) {
  if (!req.user) {
    res.redirect("/login");
    return;
  }

  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    res.redirect("/login");
    return;
  }

  if (!req.user.isAdmin) {
    res.status(403).send("Forbidden");
    return;
  }

  next();
}
