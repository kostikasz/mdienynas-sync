import { renderLayout } from "../layout.js";

function formatValue(value) {
  return value ? String(value) : "—";
}

export function renderAdminUsersPage({ rows }) {
  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>
            <div class="admin-user">
              <strong>${row.email}</strong>
              <span class="admin-user__meta">ID ${row.id}</span>
            </div>
          </td>
          <td>
            <span class="status-badge ${row.is_confirmed ? "status-badge--confirmed" : "status-badge--pending"}">
              ${row.is_confirmed ? "Confirmed" : "Pending"}
            </span>
          </td>
          <td>${formatValue(row.confirmed_at)}</td>
          <td>${formatValue(row.created_at)}</td>
          <td>${formatValue(row.latest_session_at)}</td>
          <td>
            <form method="post" action="/admin/users/${row.id}/confirmation">
              <input type="hidden" name="confirmed" value="${row.is_confirmed ? "false" : "true"}" />
              <button type="submit">${row.is_confirmed ? "Revoke confirmation" : "Confirm account"}</button>
            </form>
            ${row.is_confirmed ? "" : `
            <form method="post" action="/admin/users/${row.id}/resend-confirmation" style="margin-top:8px;">
              <button type="submit">Resend confirmation</button>
            </form>
            `}
            <form method="post" action="/admin/users/${row.id}/login-link" style="margin-top:8px;">
              <button type="submit">Create login link</button>
            </form>
            <form method="post" action="/admin/users/${row.id}/test-email" style="margin-top:8px;">
              <button type="submit">Send test email</button>
            </form>
          </td>
        </tr>
      `,
    )
    .join("");

  return renderLayout({
    title: "Admin users",
    body: `
      <main class="app-page">
        <section class="card admin-panel">
          <div class="admin-panel__header">
            <div>
              <p class="eyebrow">Admin</p>
              <h1>User management</h1>
              <p class="section-copy">Review confirmation status, see the latest activity, and override access when needed.</p>
            </div>
            <div class="admin-panel__summary">
              <div>
                <strong>${rows.length}</strong>
                <span>Total users</span>
              </div>
              <div>
                <strong>${rows.filter((row) => row.is_confirmed).length}</strong>
                <span>Confirmed</span>
              </div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Confirmation status</th>
                <th>Confirmed at</th>
                <th>Created at</th>
                <th>Latest session</th>
                <th>Email actions</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </section>
      </main>
    `,
  });
}
