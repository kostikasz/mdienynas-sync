export function renderTurnstileSlot(siteKey) {
  if (!siteKey) {
    return "";
  }

  return `
    <div class="turnstile-slot">
      <div class="cf-turnstile" data-sitekey="${siteKey}"></div>
    </div>
  `;
}
