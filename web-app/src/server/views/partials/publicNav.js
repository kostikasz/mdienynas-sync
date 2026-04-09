export function renderPublicNav({ showCenterLinks = false } = {}) {
  return `
    <nav class="public-nav">
      <div class="public-nav__brand">
        <a class="logo" href="/">Dienynas<span> SYNC</span></a>
      </div>
      <div class="public-nav__center">
        ${showCenterLinks ? `
          <div class="public-nav__links">
            <a href="/#features">Features</a>
            <a href="/#pricing">Pricing</a>
            <a href="/#about">About</a>
          </div>
        ` : ""}
      </div>
      <div class="nav-actions">
        <button class="theme-toggle" type="button" aria-label="Toggle theme" data-theme-toggle>◐</button>
        <a href="/login">Sign in</a>
        <a class="button button-primary" href="/register">Get started</a>
      </div>
    </nav>
  `;
}
