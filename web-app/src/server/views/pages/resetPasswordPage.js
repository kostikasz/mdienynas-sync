import { renderLayout } from "../layout.js";
import { renderPublicNav } from "../partials/publicNav.js";
import { renderTurnstileSlot } from "../partials/turnstile.js";

export function renderResetPasswordPage({
  token = "",
  turnstileSiteKey = "",
  errorMessage = "",
  heading = "Reset password",
  body = "Enter a new password for your account.",
} = {}) {
  return renderLayout({
    title: "Reset password",
    body: `
      ${renderPublicNav()}
      <main class="auth-shell">
        <div class="auth-card card">
          <div class="auth-header">
            <h1>${heading}</h1>
            <p>${body}</p>
          </div>

          <form class="stack" method="post" action="/reset-password">
            <input type="hidden" name="token" value="${token}" />
            <div class="field">
              <label>New password</label>
              <input type="password" name="password" placeholder="Min. 8 characters" autocomplete="new-password" required minlength="8" />
            </div>

            ${renderTurnstileSlot(turnstileSiteKey)}
            ${errorMessage ? `<p class="error">${errorMessage}</p>` : ""}
            <button class="submit-btn" type="submit">Update password</button>
          </form>

          <p class="bottom-link"><a href="/login">Back to login</a></p>
        </div>
      </main>
    `,
  });
}
