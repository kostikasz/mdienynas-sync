export function renderLayout({ title, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="/assets/app.css" />
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <script>
      (function () {
        try {
          var theme = localStorage.getItem("theme");
          if (!theme) {
            theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
          }
          document.documentElement.dataset.theme = theme;
        } catch (error) {
          document.documentElement.dataset.theme = "light";
        }
      }());
    </script>
    <script src="/assets/app.js" defer></script>
  </head>
  <body>${body}</body>
</html>`;
}
