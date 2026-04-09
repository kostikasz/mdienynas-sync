const defaultState = new Map();

export function createMemoryRateLimiter({ windowMs, max, keyFn }) {
  const state = defaultState;

  return function rateLimit(req, res, next) {
    const key = keyFn(req);
    const now = Date.now();
    const bucket = state.get(key);

    if (!bucket || bucket.resetAt <= now) {
      state.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      res.status(429).send("Too many attempts. Please try again later.");
      return;
    }

    bucket.count += 1;
    next();
  };
}

export function makeIpKey(req) {
  return req.ip || req.headers["x-forwarded-for"] || "unknown";
}

export function makeEmailKey(req) {
  return (req.body?.email || req.query?.email || "").trim().toLowerCase() || "unknown";
}
