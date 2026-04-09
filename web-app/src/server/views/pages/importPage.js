import { renderAppShell } from "../partials/appShell.js";

export function renderImportPage() {
  const examplePayload = `{
  "courses": [
    {
      "name": "Mathematics",
      "grades": [
        { "title": "Quiz 1", "value": "10" }
      ]
    }
  ]
}`;

  return renderAppShell({
    title: "Import",
    body: `
      <section class="card import-panel">
        <div>
          <p class="eyebrow">Data</p>
          <h1>Manual import</h1>
          <p class="section-copy">Paste exported JSON here to create courses and grades in the simplified database.</p>
        </div>
        <form method="post" action="/import">
          <div class="field">
            <label>Paste JSON payload</label>
            <textarea
              name="payload"
              rows="12"
              placeholder="Paste exported course/grade JSON here"
              spellcheck="false"
            ></textarea>
          </div>
          <div class="import-panel__example">
            <p class="eyebrow">Example payload</p>
            <pre>${examplePayload}</pre>
          </div>
          <button class="submit-btn" type="submit">Import</button>
        </form>
      </section>
    `,
  });
}
