"""
apple_cal.py — Reads homework.json and generates homework.ics

Each homework entry becomes one VEVENT due on its due_date.

No API key required.  Output: homework.ics
"""

import json
import os
import sys
from datetime import date, datetime
from pathlib import Path

from dotenv import load_dotenv
from icalendar import Calendar, Event

load_dotenv()

HOMEWORK_JSON_PATH = os.getenv("HOMEWORK_JSON_PATH", "../../scraper/homework.json")
OUTPUT_PATH        = os.getenv("ICS_OUTPUT_PATH", "homework.ics")

SUBJECT_COLORS = [
    "#FF2D55", "#FF9500", "#FFCC00", "#4CD964", "#5AC8FA",
    "#007AFF", "#5856D6", "#FF3B30", "#34AADC", "#8E8E93",
]


def parse_dt(raw: str | None) -> date | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw).date()
    except ValueError:
        return None


def stable_uid(hw_id: str) -> str:
    import hashlib
    return hashlib.sha1(hw_id.encode()).hexdigest() + "@mdienynas-hw"


def build_calendar(data: dict) -> tuple[Calendar, int]:
    cal = Calendar()
    cal.add("prodid", "-//mdienynas-sync//apple_cal_homework//LT")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")
    cal.add("method", "PUBLISH")
    cal.add("x-wr-calname", "Mano Dienynas Homework")
    cal.add("x-wr-timezone", "Europe/Vilnius")

    # Build a stable colour per subject
    subject_colors: dict[str, str] = {}
    color_idx = 0

    total = 0
    for hw in data.get("homework", []):
        dt = parse_dt(hw.get("due_date") or hw.get("assigned_date"))
        if dt is None:
            continue

        subject = hw.get("subject", "Homework")
        if subject not in subject_colors:
            subject_colors[subject] = SUBJECT_COLORS[color_idx % len(SUBJECT_COLORS)]
            color_idx += 1
        color = subject_colors[subject]

        ev = Event()
        ev.add("uid", stable_uid(hw.get("id", "")))
        ev.add("summary", f"[HW] {subject}: {hw.get('description', '')[:60]}")
        ev.add("dtstart", dt)
        ev.add("dtend", dt)

        desc_lines = [f"Subject: {subject}"]
        if hw.get("teacher"):
            desc_lines.append(f"Teacher: {hw['teacher']}")
        if hw.get("description"):
            desc_lines.append(f"Task: {hw['description']}")
        if hw.get("assigned_date"):
            desc_lines.append(f"Assigned: {hw['assigned_date'][:10]}")
        ev.add("description", "\n".join(desc_lines))
        ev.add("x-apple-calendar-color", color)

        cal.add_component(ev)
        total += 1

    return cal, total


def main() -> None:
    hw_path = Path(HOMEWORK_JSON_PATH)
    if not hw_path.exists():
        print(f"ERROR: homework.json not found at {hw_path.resolve()}", file=sys.stderr)
        sys.exit(1)

    with open(hw_path, encoding="utf-8") as f:
        data = json.load(f)

    cal, total = build_calendar(data)

    out = Path(OUTPUT_PATH)
    out.write_bytes(cal.to_ical())
    print(f"Written {total} homework events → {out.resolve()}")


if __name__ == "__main__":
    main()
