import { renderLayout } from "../layout.js";
import { renderPublicNav } from "../partials/publicNav.js";
import { renderTurnstileSlot } from "../partials/turnstile.js";

function GoogleIcon() {
  return `
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  `;
}

function DiscordIcon() {
  return `
    <svg width="20" height="15" viewBox="0 0 71 55" aria-hidden="true" fill="currentColor">
      <path d="M60.1 4.9A58.5 58.5 0 0045.7.4a.2.2 0 00-.2.1 40.7 40.7 0 00-1.8 3.7 54 54 0 00-16.2 0A37.6 37.6 0 0025.6.5a.2.2 0 00-.2-.1A58.3 58.3 0 0010.9 4.9a.2.2 0 00-.1.1C1.6 18.1-.9 31 .3 43.6a.2.2 0 00.1.2 58.8 58.8 0 0017.7 8.9.2.2 0 00.2-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 010-.4l1.1-.8a.2.2 0 01.2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 01.2 0l1.1.8a.2.2 0 010 .4 36.2 36.2 0 01-5.5 2.6.2.2 0 00-.1.3 47.1 47.1 0 003.6 5.9.2.2 0 00.2.1 58.6 58.6 0 0017.7-8.9.2.2 0 00.1-.2c1.5-15.2-2.5-28-10.5-39.6a.2.2 0 00-.1-.1zM23.7 35.8c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2z"/>
    </svg>
  `;
}

export function renderLoginPage({
  errorMessage = "",
  turnstileSiteKey = "",
} = {}) {
  return renderLayout({
    title: "Login",
    body: `
      ${renderPublicNav()}
      <main class="auth-shell">
        <div class="auth-card card">
          <div class="auth-header">
            <h1>Welcome back</h1>
            <p>Sign in to your account</p>
          </div>

          <div class="stack" style="margin-bottom:24px;">
            <button class="oauth-btn" type="button">${GoogleIcon()}<span>Continue with Google</span></button>
            <button class="oauth-btn oauth-btn--discord" type="button">${DiscordIcon()}<span>Continue with Discord</span></button>
          </div>

          <div class="divider"><span>or</span></div>

          <form class="stack" method="post" action="/login">
            <div class="field">
              <label>Email</label>
              <input type="email" name="email" placeholder="you@example.com" autocomplete="email" required />
            </div>

            <div class="field">
              <label>Password</label>
              <input type="password" name="password" placeholder="••••••••" autocomplete="current-password" required />
            </div>

            ${renderTurnstileSlot(turnstileSiteKey)}
            ${errorMessage ? `<p class="error" role="alert">${errorMessage}</p>` : ""}
            <button class="submit-btn" type="submit">Sign in</button>
          </form>

          <p class="bottom-link">No account? <a href="/register">Create one</a></p>
        </div>
      </main>
    `,
  });
}
