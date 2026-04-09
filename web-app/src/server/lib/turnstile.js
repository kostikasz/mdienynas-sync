export async function verifyTurnstile({ token, ip, env = process.env, fetchImpl = fetch }) {
  const secret = env.TURNSTILE_SECRET_KEY || "";
  const nodeEnv = env.NODE_ENV || "development";

  if (!secret && nodeEnv !== "production") {
    return { success: true, skipped: true };
  }

  if (!token) {
    return { success: false, error: "missing-token" };
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (ip) {
    body.set("remoteip", ip);
  }

  const response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });

  const data = await response.json();
  return {
    success: Boolean(data.success),
    challenge_ts: data.challenge_ts || null,
    hostname: data.hostname || null,
    error: data["error-codes"] || [],
  };
}
