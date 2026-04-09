import { renderLayout } from "../layout.js";
import { renderPublicNav } from "../partials/publicNav.js";

function renderIcon(name) {
  const paths = {
    dashboard:
      '<path d="M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-12h8V3h-8v6Z"/>',
    trending:
      '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
    plug:
      '<path d="M10 13l-2 2a4 4 0 0 0 5.7 5.7l2-2"/><path d="M14 11l2-2a4 4 0 0 0-5.7-5.7l-2 2"/><path d="M8 8l8 8"/>',
    check:
      '<path d="M20 6 9 17l-5-5"/>',
    sparkles:
      '<path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5Z"/><path d="M19 2l.8 3 3 .8-3 .8-.8 3-.8-3-3-.8 3-.8Z"/>',
  };

  return `
    <svg class="feature-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      ${paths[name]}
    </svg>
  `;
}

const FEATURES = [
  {
    icon: "dashboard",
    title: "Fast dashboard",
    body: "See your latest grades, course progress, and course list at a glance.",
  },
  {
    icon: "trending",
    title: "Grade graphs",
    body: "Track how your marks change across the term with simple visual summaries.",
  },
  {
    icon: "calendar",
    title: "Calendar integration",
    body: "Keep deadlines visible with quick calendar links and synced reminders.",
  },
  {
    icon: "plug",
    title: "Sync integrations",
    body: "Connect with Notion, Google Calendar, and Apple Calendar when needed.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Log in",
    body: "Use your Mano Dienynas credentials to connect your account.",
  },
  {
    step: "2",
    title: "Sync",
    body: "Pull your grades and course data into a cleaner dashboard.",
  },
  {
    step: "3",
    title: "Track",
    body: "Keep up with grades, deadlines, and changes in one place.",
  },
];

const FREE_FEATURES = [
  "Courses dashboard",
  "Recent grades view",
  "Basic calendar links",
];

const PRO_FEATURES = [
  { label: "More AI insights", ai: true },
  { label: "Advanced graphing", ai: false },
  { label: "Calendar sync", ai: false },
];

export function renderHomePage() {
  return renderLayout({
    title: "Dienynas Sync",
    body: `
      ${renderPublicNav({ showCenterLinks: true })}
      <main>
        <section class="hero">
          <div class="pill">For Mano Dienynas students</div>
          <h1>
            Your grades,
            <br />
            <span class="accent">always in sync.</span>
          </h1>
          <p>A clean, fast dashboard for your courses — with grade graphs, calendar integration, and sync to Notion, Google Calendar, and Apple Calendar.</p>
          <div class="hero-actions">
            <a class="button button-primary" href="/api/auth/signin">Get started — it&apos;s free</a>
            <a class="button" href="/api/auth/signin">Sign in →</a>
          </div>
          <a class="section-link" href="#pricing">See Pro plan →</a>
        </section>

        <section class="section" id="features">
          <div class="section-inner">
            <p class="section-title">What you get</p>
            <div class="grid-2">
              ${FEATURES.map(
                (feature) => `
                  <div class="feature-card">
                    <div class="feature-icon">${renderIcon(feature.icon)}</div>
                    <h3>${feature.title}</h3>
                    <p class="section-copy">${feature.body}</p>
                  </div>
                `,
              ).join("")}
            </div>
          </div>
        </section>

        <section class="section steps-section">
          <div class="section-inner" id="about">
            <h2>How it works</h2>
            <div class="grid-3">
              ${STEPS.map(
                (step) => `
                  <div class="step-card">
                    <div class="step-number">${step.step}</div>
                    <h3>${step.title}</h3>
                    <p class="section-copy">${step.body}</p>
                  </div>
                `,
              ).join("")}
            </div>
          </div>
        </section>

        <section class="section price-section" id="pricing">
          <div class="section-inner">
            <h2>Simple pricing</h2>
            <p class="section-copy">Start free. Upgrade when you need more AI insights.</p>
            <div class="grid-2">
              <div class="price-card">
                <p class="section-title" style="text-align:left;margin-bottom:16px;">Free</p>
                <p class="price-value">€0</p>
                <p class="section-copy" style="text-align:left;margin:4px 0 24px;">Forever</p>
                <ul class="list-clean">
                  ${FREE_FEATURES.map((feature) => `<li><span>✓</span><span>${feature}</span></li>`).join("")}
                </ul>
                <a class="button button-primary" href="/register" style="justify-content:center;">Get started free</a>
              </div>
              <div class="price-card price-card--featured">
                <span class="badge">Most popular</span>
                <p class="section-title" style="text-align:left;margin-bottom:16px;">Pro</p>
                <p class="price-value">€3.99</p>
                <p class="section-copy" style="text-align:left;margin:4px 0 24px;">/ month</p>
                <ul class="list-clean">
                  ${PRO_FEATURES.map(
                    (feature) => `
                      <li><span>${feature.ai ? "✦" : "✓"}</span><span>${feature.label}</span></li>
                    `,
                  ).join("")}
                </ul>
                <a class="button button-primary" href="/checkout" style="justify-content:center;">Buy Pro</a>
                <p class="section-copy" style="text-align:center;margin:12px 0 0;">One-time monthly charge · Cancel anytime</p>
              </div>
            </div>
          </div>
        </section>

        <section class="footer-cta">
          <div class="section-inner">
            <h2>Ready to get started?</h2>
            <p class="section-copy">Setup takes two minutes. You&apos;ll need your Mano Dienynas credentials.</p>
            <div class="hero-actions">
            <a class="button button-primary" href="/api/auth/signin">Create your free account</a>
            </div>
          </div>
        </section>
      </main>
    `,
  });
}
