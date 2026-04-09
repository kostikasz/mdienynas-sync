export function renderAppShell({ title, body }) {
  return `
    <div class="app-shell">
      <aside style="width:240px;background:var(--sidebar);color:var(--sidebar-fg);min-height:100vh;padding:24px;">
        <strong>Dienynas SYNC</strong>
      </aside>
      <main style="flex:1;">
        <div class="app-page">
          <h1>${title}</h1>
          ${body}
        </div>
      </main>
    </div>
  `;
}
