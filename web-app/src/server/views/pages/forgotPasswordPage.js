import { renderLayout } from "../layout.js";
import { renderPublicNav } from "../partials/publicNav.js";
import { renderTurnstileSlot } from "../partials/turnstile.js";

export function renderForgotPasswordPage({ turnstileSiteKey = "", errorMessage = "" } = {}) {
  return renderLayout({
    title: "Forgot password",
    body: `
      ${renderPublicNav()}
      <main class="auth-shell">
        <div class="auth-card card">
          <div class="auth-header">
            <h1>Forgot password</h1>
            <p>We will send a reset link if the address exists.</p>
          </div>

          <form class="stack" method="post" action="/forgot-password">
            <div class="field">
              <label>Email</label>
              <input type="email" name="email" placeholder="you@example.com" autocomplete="email" required />
            </div>

            ${renderTurnstileSlot(turnstileSiteKey)}
            ${errorMessage ? `<p class="error">${errorMessage}</p>` : ""}
            <button class="submit-btn" type="submit">Send reset link</button>
          </form>

          <p class="bottom-link"><a href="/login">Back to login</a></p>
        </div>
      </main>
    `,
  });
}
