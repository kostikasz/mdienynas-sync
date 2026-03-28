"""
notion.py — Reads grades.json and upserts one Notion page per course.

Notion DB schema expected:
  Name         (Title)
  Grade        (Select)   ← average of all numeric grades, e.g. "8.5"
  Average      (Number)   ← same value as Grade, useful for sorting/filtering
  Grades       (Text)     ← chronological list of all numeric scores, e.g. "9, 8, 10"
  Term         (Select)
  Last Updated (Date)
  EntryID      (Text)     ← stable hash used for upsert deduplication
"""

import hashlib
import json
import os
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

NOTION_API_KEY     = os.getenv("NOTION_API_KEY")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")
GRADES_JSON_PATH   = os.getenv("GRADES_JSON_PATH", "../../scraper/grades.json")

NOTION_API = "https://api.notion.com/v1"
HEADERS = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
}

# Lithuanian score labels → human-readable
SCORE_LABELS = {
    "įsk":  "Įsk.",
    "n":    "N",
    "nn":   "NN",
    "p":    "P",
    "np":   "NP",
}

REQUIRED_PROPERTIES = {
    "Grade":        {"select": {}},
    "Average":      {"number": {"format": "number"}},
    "Grades":       {"rich_text": {}},
    "Term":         {"select": {}},
    "Last Updated": {"date": {}},
    "EntryID":      {"rich_text": {}},
}


def ensure_db_properties() -> None:
    """Add any missing properties to the Notion database."""
    resp = requests.get(
        f"{NOTION_API}/databases/{NOTION_DATABASE_ID}",
        headers=HEADERS,
        timeout=15,
    )
    if not resp.ok:
        raise RuntimeError(f"Could not fetch database: {resp.status_code} {resp.text}")

    existing = set(resp.json().get("properties", {}).keys())
    to_add   = {k: v for k, v in REQUIRED_PROPERTIES.items() if k not in existing}

    if not to_add:
        return

    print(f"  Adding missing properties: {', '.join(to_add)}")
    patch = requests.patch(
        f"{NOTION_API}/databases/{NOTION_DATABASE_ID}",
        headers=HEADERS,
        json={"properties": to_add},
        timeout=15,
    )
    if not patch.ok:
        raise RuntimeError(f"Failed to add properties: {patch.status_code} {patch.text}")


def load_grades(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def stable_id(course_id: str) -> str:
    return hashlib.md5(course_id.encode()).hexdigest()


def split_score(raw: str) -> list[str]:
    """
    Lithuanian grades are 1–10. A score string like "810" is two grades
    concatenated (8 and 10) due to a scraper quirk. Split it if possible.
    """
    try:
        val = int(raw)
    except (ValueError, TypeError):
        return [raw]

    if 1 <= val <= 10:
        return [raw]

    # Try every split point and keep the first valid pair
    s = str(raw)
    for i in range(1, len(s)):
        a, b = s[:i], s[i:]
        try:
            if 1 <= int(a) <= 10 and 1 <= int(b) <= 10:
                return [a, b]
        except ValueError:
            continue

    return [raw]  # couldn't split — return unchanged


def grade_scores_in_order(assignments: list[dict]) -> list[str]:
    """
    Return all Grade-category scores in chronological order,
    splitting any concatenated values (e.g. "810" → ["8", "10"]).
    """
    grade_entries = [
        a for a in assignments
        if a.get("category") == "Grade" and a.get("score") is not None
    ]
    grade_entries.sort(key=lambda a: a.get("date") or a.get("due_date") or "")

    scores = []
    for a in grade_entries:
        scores.extend(split_score(str(a["score"])))
    return scores


def numeric_grades(assignments: list[dict]) -> list[float]:
    """Return numeric values from Grade-category scores (after splitting)."""
    result = []
    for s in grade_scores_in_order(assignments):
        try:
            result.append(float(s))
        except ValueError:
            pass
    return result


def assignment_blocks(assignments: list[dict]) -> list[dict]:
    """Build Notion paragraph blocks listing each assignment."""
    blocks = []
    sorted_entries = sorted(
        assignments,
        key=lambda a: a.get("date") or a.get("due_date") or "",
    )
    for a in sorted_entries:
        date_str  = (a.get("date") or a.get("due_date") or "")[:10]
        score_raw = a.get("score")
        if score_raw is not None:
            parts     = split_score(str(score_raw))
            score_str = " / ".join(
                SCORE_LABELS.get(p.lower(), p) for p in parts
            )
        else:
            score_str = "–"
        category  = a.get("category", "")
        name      = a.get("name", "Grade entry")
        max_score = a.get("max_score")
        max_part  = f"/{max_score}" if max_score is not None else ""

        line = f"{date_str}  [{category}]  {name}  →  {score_str}{max_part}"
        blocks.append({
            "object": "block",
            "type":   "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": line}}]
            },
        })
    return blocks


def find_existing_page(entry_id: str) -> str | None:
    """Return page ID if a page with this EntryID already exists, else None."""
    resp = requests.post(
        f"{NOTION_API}/databases/{NOTION_DATABASE_ID}/query",
        headers=HEADERS,
        json={"filter": {"property": "EntryID", "rich_text": {"equals": entry_id}}},
        timeout=15,
    )
    if not resp.ok:
        raise RuntimeError(f"Query failed {resp.status_code}: {resp.text}")
    results = resp.json().get("results", [])
    return results[0]["id"] if results else None


def build_properties(course: dict, meta: dict) -> dict:
    assignments = course.get("assignments", [])
    nums        = numeric_grades(assignments)
    avg         = round(sum(nums) / len(nums), 2) if nums else None
    scores      = grade_scores_in_order(assignments)
    grades_str  = ", ".join(scores) if scores else ""
    term        = meta.get("term") or "–"
    scraped     = meta.get("scraped_at", datetime.now(timezone.utc).isoformat())[:10]

    props = {
        "Name": {
            "title": [{"text": {"content": course["name"]}}]
        },
        "Term": {
            "select": {"name": term}
        },
        "Last Updated": {
            "date": {"start": scraped}
        },
    }

    if avg is not None:
        # Grade (Select) shows the average as a display label
        props["Grade"]   = {"select": {"name": str(avg)}}
        props["Average"] = {"number": avg}

    if grades_str:
        props["Grades"] = {"rich_text": [{"text": {"content": grades_str}}]}

    return props


def create_page(course: dict, entry_id: str, meta: dict) -> None:
    props  = build_properties(course, meta)
    props["EntryID"] = {"rich_text": [{"text": {"content": entry_id}}]}
    blocks = assignment_blocks(course.get("assignments", []))

    resp = requests.post(
        f"{NOTION_API}/pages",
        headers=HEADERS,
        json={
            "parent":     {"database_id": NOTION_DATABASE_ID},
            "properties": props,
            "children":   blocks,
        },
        timeout=15,
    )
    if not resp.ok:
        raise RuntimeError(f"Create page failed {resp.status_code}: {resp.text}")
    print(f"  Created: {course['name']}")


def update_page(page_id: str, course: dict, meta: dict) -> None:
    props = build_properties(course, meta)
    patch = requests.patch(
        f"{NOTION_API}/pages/{page_id}",
        headers=HEADERS,
        json={"properties": props},
        timeout=15,
    )
    if not patch.ok:
        raise RuntimeError(f"Update properties failed {patch.status_code}: {patch.text}")

    # Replace body blocks
    existing = requests.get(
        f"{NOTION_API}/blocks/{page_id}/children",
        headers=HEADERS,
        timeout=15,
    ).json().get("results", [])

    for block in existing:
        requests.delete(
            f"{NOTION_API}/blocks/{block['id']}",
            headers=HEADERS,
            timeout=15,
        )

    blocks = assignment_blocks(course.get("assignments", []))
    if blocks:
        requests.patch(
            f"{NOTION_API}/blocks/{page_id}/children",
            headers=HEADERS,
            json={"children": blocks},
            timeout=15,
        ).raise_for_status()

    print(f"  Updated: {course['name']}")


def main() -> None:
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Starting Notion sync…")

    ensure_db_properties()

    grades  = load_grades(GRADES_JSON_PATH)
    meta    = grades.get("metadata", {})
    courses = grades.get("courses", [])
    print(f"→ {len(courses)} courses loaded from grades.json")

    created = updated = failed = 0
    for course in courses:
        entry_id = stable_id(course["id"])
        try:
            existing = find_existing_page(entry_id)
            if existing:
                update_page(existing, course, meta)
                updated += 1
            else:
                create_page(course, entry_id, meta)
                created += 1
        except Exception as exc:
            print(f"  Failed ({course['name']}): {exc}")
            failed += 1

    print(f"\nDone. {created} created, {updated} updated, {failed} failed.")


if __name__ == "__main__":
    main()
