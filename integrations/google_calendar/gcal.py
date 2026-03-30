"""
gcal.py — Reads grades.json and creates/updates Google Calendar events.

Each assignment gets one event on its date.  Events are keyed by a stable
extendedProperty (mdienynas_id) so reruns upsert rather than duplicate.

Auth: OAuth2 with credentials.json (downloaded from Google Cloud Console).
      First run opens a browser; token is cached in token.json.

Env vars:
  GOOGLE_CALENDAR_ID   — target calendar, default "primary"
  GRADES_JSON_PATH     — path to grades.json
  CREDENTIALS_FILE     — path to credentials.json (default: credentials.json)
  TOKEN_FILE           — where to cache OAuth token (default: token.json)
"""

import json
import os
import sys
from datetime import date, datetime
from pathlib import Path

from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

load_dotenv()

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

GOOGLE_CALENDAR_ID = os.getenv("GOOGLE_CALENDAR_ID", "primary")
GRADES_JSON_PATH   = os.getenv("GRADES_JSON_PATH", "../../scraper/grades.json")
CREDENTIALS_FILE   = os.getenv("CREDENTIALS_FILE", "credentials.json")
TOKEN_FILE         = os.getenv("TOKEN_FILE", "token.json")

SCORE_LABELS: dict[str, str] = {
    "įsk": "Įsk.",
    "n":   "N",
    "nn":  "NN",
    "p":   "P",
    "np":  "NP",
}

# Colour IDs supported by the Google Calendar API
COURSE_COLORS = [
    "11",  # Tomato
    "6",   # Tangerine
    "5",   # Banana
    "2",   # Sage
    "7",   # Peacock
    "9",   # Blueberry
    "3",   # Grape
    "4",   # Flamingo
    "10",  # Basil
    "1",   # Lavender
]


# ── Auth ─────────────────────────────────────────────────────────────────────

def get_credentials() -> Credentials:
    creds = None
    token_path = Path(TOKEN_FILE)

    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            creds_path = Path(CREDENTIALS_FILE)
            if not creds_path.exists():
                print(
                    f"ERROR: {creds_path} not found.\n"
                    "Download it from Google Cloud Console → APIs & Services → Credentials.",
                    file=sys.stderr,
                )
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), SCOPES)
            creds = flow.run_local_server(port=0)

        token_path.write_text(creds.to_json())

    return creds


# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_date(raw: str | None) -> str | None:
    """Return YYYY-MM-DD string or None."""
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw).strftime("%Y-%m-%d")
    except ValueError:
        return None


def fmt_score(raw) -> str:
    if raw is None:
        return "–"
    s = str(raw)
    return SCORE_LABELS.get(s.lower(), s)


def stable_id(assignment_id: str, course_id: str) -> str:
    import hashlib
    return hashlib.sha1(f"{course_id}::{assignment_id}".encode()).hexdigest()


def find_existing_event(service, calendar_id: str, mdienynas_id: str) -> str | None:
    """Return event id if an event with this mdienynas_id already exists."""
    try:
        resp = (
            service.events()
            .list(
                calendarId=calendar_id,
                privateExtendedProperty=f"mdienynas_id={mdienynas_id}",
                maxResults=1,
                singleEvents=True,
            )
            .execute()
        )
        items = resp.get("items", [])
        return items[0]["id"] if items else None
    except HttpError:
        return None


def build_event(assignment: dict, course_name: str, color_id: str) -> dict:
    date_str = parse_date(assignment.get("date") or assignment.get("due_date"))
    if not date_str:
        return None

    score_str = fmt_score(assignment.get("score"))
    max_score = assignment.get("max_score")
    score_display = f"{score_str}/{max_score}" if max_score else score_str

    summary = f"{course_name}: {assignment.get('name', 'Grade entry')} [{score_display}]"

    description_lines = [
        f"Course: {course_name}",
        f"Category: {assignment.get('category', '–')}",
        f"Score: {score_display}",
        f"Status: {assignment.get('status', '–')}",
    ]

    return {
        "summary": summary,
        "description": "\n".join(description_lines),
        "start": {"date": date_str},
        "end": {"date": date_str},
        "colorId": color_id,
        "extendedProperties": {
            "private": {
                "mdienynas_id": stable_id(
                    assignment.get("id", ""), course_name
                )
            }
        },
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    grades_path = Path(GRADES_JSON_PATH)
    if not grades_path.exists():
        print(f"ERROR: grades.json not found at {grades_path.resolve()}", file=sys.stderr)
        sys.exit(1)

    with open(grades_path, encoding="utf-8") as f:
        grades = json.load(f)

    creds   = get_credentials()
    service = build("calendar", "v3", credentials=creds)

    courses = grades.get("courses", [])
    created = updated = skipped = failed = 0

    print(f"Syncing {len(courses)} courses to calendar '{GOOGLE_CALENDAR_ID}'…")

    for idx, course in enumerate(courses):
        color_id    = COURSE_COLORS[idx % len(COURSE_COLORS)]
        course_name = course.get("name", "Unknown Course")

        for assignment in course.get("assignments", []):
            event = build_event(assignment, course_name, color_id)
            if event is None:
                skipped += 1
                continue

            mdienynas_id = event["extendedProperties"]["private"]["mdienynas_id"]
            existing_id  = find_existing_event(service, GOOGLE_CALENDAR_ID, mdienynas_id)

            try:
                if existing_id:
                    service.events().update(
                        calendarId=GOOGLE_CALENDAR_ID,
                        eventId=existing_id,
                        body=event,
                    ).execute()
                    updated += 1
                else:
                    service.events().insert(
                        calendarId=GOOGLE_CALENDAR_ID,
                        body=event,
                    ).execute()
                    created += 1
            except HttpError as exc:
                print(f"  Failed ({course_name}): {exc}", file=sys.stderr)
                failed += 1

    print(f"\nDone. {created} created, {updated} updated, {skipped} skipped (no date), {failed} failed.")


if __name__ == "__main__":
    main()
