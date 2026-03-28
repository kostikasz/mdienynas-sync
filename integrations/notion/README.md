# Notion Integration — Setup Guide

Reads `grades.json` (produced by the scraper) and upserts **one Notion page per course** into a Notion database.

Re-running the script updates existing pages in-place (no duplicates).

## 1. Install dependencies

```bash
pip install requests python-dotenv
```

---

## 2. Set up Notion

### Create an integration
1. Go to https://www.notion.so/my-integrations
2. Click **"New integration"**, give it a name (e.g. "Dienynas Sync"), select your workspace.
3. Copy the **Internal Integration Token** → this is your `NOTION_API_KEY`.

### Create the database
Create a new Notion page and add a **Database (full page)**. Add these properties:

| Property name | Type   | Notes                                        |
|---------------|--------|----------------------------------------------|
| Course Name   | Title  | Required                                     |
| Grade         | Select | Latest grade for the course (e.g. "8", "Įsk.") |
| Average       | Number | Mean of all numeric grades (1–10 scale)      |
| Term          | Select | e.g. "Spring 2026"                           |
| Last Updated  | Date   | Date of the last scrape                      |
| EntryID       | Text   | Hidden deduplication key — do not edit       |

### Connect the integration to your database
- Open the database page in Notion.
- Click `•••` (top right) → **Connections** → add your integration.

### Get the database ID
The URL of your database page looks like:
```
https://www.notion.so/myworkspace/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX?v=...
```
The 32-character string before `?v=` is your `NOTION_DATABASE_ID`.

---

## 3. Configure .env

Edit `integrations/notion/.env`:

```bash
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GRADES_JSON_PATH=../../scraper/grades.json
```

---

## 4. Run a scrape first

```bash
cd ../../scraper
python scraper.py
```

This produces `scraper/grades.json` which `notion.py` reads.

---

## 5. Run the Notion sync

```bash
cd integrations/notion
python notion.py
```

Each course becomes one database row. The page body lists all grade and attendance entries sorted by date.

---

## What gets synced

- **Course Name** — full course name from the portal
- **Grade** — most recent grade entry for the course
- **Average** — mean of all numeric grades (out of 10)
- **Term** — from `grades.json` metadata (or "–" if not set)
- **Last Updated** — date of the scrape
- **Page body** — all assignments/attendance entries with date, category, score

Lithuanian score labels are translated:
| Raw | Displayed |
|-----|-----------|
| `įsk` | Įsk. (pass) |
| `n`   | N (absent) |
| `nn`  | NN (double absent) |
| `p`   | P (late) |
| `np`  | NP (not prepared) |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Notion 401` | Check `NOTION_API_KEY` and that the integration is connected to the DB |
| `0 courses loaded` | Make sure `scraper/grades.json` exists and is non-empty |
| Duplicate pages | Make sure the `EntryID` Text property exists in your Notion database |
| `Notion 400` on Grade/Term | Make sure those are **Select** type, not Text |
