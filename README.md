# mdienynas-sync

> A student-built grade tracking system for Mano Dienynas — because the official portal wasn't good enough.

---

## The Problem

Every Lithuanian student knows the frustration. You open **Mano Dienynas** to check your grades and you're met with a slow, clunky interface that takes ages to load, breaks on mobile, and gives you almost no insight into your academic progress. Want to see how your average has trended over the semester? Not possible. Want a clean view of upcoming homework? Good luck navigating the UI. Want to get a notification when a new grade drops? Forget it.

As a student, I found myself checking the portal multiple times a day, squinting at dense tables, and manually calculating my own averages in my head. The data was there — it just wasn't being presented in any useful way.

So I built this.

---

## What This Is

**mdienynas-sync** is a personal-grade data pipeline that:

1. **Scrapes** your grades and homework from Mano Dienynas automatically
2. **Exports** everything into a clean, universal JSON format
3. **Syncs** with external services like Notion and Google Calendar
4. **Visualizes** your academic performance in a polished web dashboard

The idea is simple: the school portal owns the data, but it doesn't have to own the experience.

---

## Architecture

```
┌──────────────────────────────────────┐
│          Mano Dienynas Portal        │
│        (manodienynas.lt)             │
└──────────────────┬───────────────────┘
                   │  Playwright scrape (headless browser)
                   ▼
┌──────────────────────────────────────┐
│           scraper/                   │
│   Fresh login every run →            │
│   grades.json  (universal format)    │
└───────┬──────────────────────────────┘
        │  read
   ┌────┴──────────────────────────┐
   │           │                  │
   ▼           ▼                  ▼
notion/     gcal/             web-app/
Notion DB   Calendar events   Next.js dashboard
            for due dates
```

Each layer is fully decoupled. The scraper doesn't know about Notion. Notion doesn't know about the web app. Everything communicates through `grades.json`.

---

## Project Structure

```
mdienynas-sync/
│
├── scraper/
│   ├── scraper.py          — Logs in and scrapes the portal via Playwright
│   ├── config.py           — Reads credentials from .env
│   ├── parser.py           — Converts raw HTML into structured Python dicts
│   ├── exporter.py         — Writes the universal grades.json
│   └── requirements.txt
│
├── integrations/
│   ├── notion/
│   │   └── notion.py       — Upserts one Notion page per course
│   ├── google_calendar/
│   │   └── gcal.py         — Creates calendar events for due dates
│   └── apple_calendar/
│       └── apple_cal.py    — Generates a .ics file for any calendar app
│
├── web-app/                — Next.js dashboard (coming soon)
│
├── .env.example            — Template — copy to .env and fill in your credentials
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ (for the web app)
- A Mano Dienynas account

### Scraper Setup

```bash
cd scraper
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

cp ../.env.example .env         # fill in PORTAL_USERNAME and PORTAL_PASSWORD
python scraper.py
```

This will produce a `grades.json` file with all your current grades and homework.

### Notion Integration

```bash
cd integrations/notion
cp ../../.env.example .env      # fill in NOTION_API_KEY and NOTION_DATABASE_ID
python notion.py
```

### Google Calendar Integration

```bash
cd integrations/google_calendar
cp ../../.env.example .env      # fill in GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
python gcal.py
```

---

## Environment Variables

Copy `.env.example` and fill in your values. Never commit your `.env` file.

```bash
# Portal credentials
PORTAL_URL=https://www.manodienynas.lt
PORTAL_USERNAME=your_username
PORTAL_PASSWORD=your_password

# Notion
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=your_database_id

# Google Calendar
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALENDAR_ID=primary
```

---

## Roadmap

### Phase 1 — Scraper (complete)
- [x] Playwright-based login and session handling
- [x] HTML parser for grades and homework
- [x] Universal `grades.json` export format
- [x] Fresh login on every run (no stale session cookies)

### Phase 2 — Integrations (in progress)
- [x] Notion integration — one page per course, all grades listed
- [ ] Google Calendar — events for every due date
- [ ] Apple Calendar — `.ics` file export (no OAuth needed)
- [ ] Automatic re-scrape on a cron schedule

### Phase 3 — Web Dashboard (planned)
- [ ] Supabase auth (email/password login)
- [ ] Grade overview dashboard — GPA card, course cards, recent grades feed
- [ ] Per-course breakdown — assignments, categories, grade history
- [ ] Graphs page — GPA trend over time, grade distribution, category breakdown
- [ ] Calendar page — monthly/weekly view of all due dates, color-coded by course
- [ ] Integrations page — connect/disconnect Notion and Google Calendar in one click
- [ ] Mobile-responsive design throughout

### Phase 4 — Polish (future)
- [ ] Push notifications when a new grade is posted
- [ ] Grade predictions based on remaining assignments
- [ ] Support for multiple school portals beyond Mano Dienynas
- [ ] Public API for third-party integrations

---

## Design Principles

- **`grades.json` is the single source of truth** — the scraper writes it, everything else reads it
- **Integrations are stateless** — run them on demand or on a schedule; they store nothing locally
- **Secrets never in code** — all credentials live in `.env` files, never committed to version control
- **Portal-agnostic design** — only `parser.py` knows about Mano Dienynas HTML; swapping portals means rewriting one file

---

## Contributing

This is a personal project, but issues and PRs are welcome. If you're a Lithuanian student who wants to improve this or adapt it for a different portal, feel free to fork it.

---

## Legal

This tool scrapes a school portal for **personal use only**. It does not expose, share, or store your data anywhere outside your own machine (and the integrations you explicitly configure). Use it responsibly and in accordance with your school's terms of service.

This project is an independent, unofficial tool and is not affiliated with, endorsed by, or connected to UAB "Mano dienynas" or any related entity in any way.

**Takedown notice**: If this repository violates the Mano Dienynas terms of service and you would like it removed, please contact me directly at [kostikasz@kostikas.cloud](mailto:kostikasz@kostikas.cloud) before filing any formal complaint. I will respond promptly.

---

## License

MIT License — see [LICENSE](./LICENSE) for full text.

You are free to use, copy, modify, and distribute this project for any purpose. No warranty is provided. Attribution appreciated but not required.
