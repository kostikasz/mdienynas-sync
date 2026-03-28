"""
exporter.py — Writes the universal grades.json file.

The grades.json schema is the single source of truth consumed by
all integrations and the web app. Nothing writes to it except this module.
"""

import json
import os
from datetime import datetime, timezone

ATTENDANCE_SCORES = {"n", "p", "nn"}
PASS_FAIL_SCORES  = {"įsk", "neįsk"}


def _new_course(subject: str) -> dict:
    return {
        "id": subject,
        "name": subject,
        "instructor": None,
        "credits": None,
        "current_grade": None,
        "current_percentage": None,
        "assignments": [],
        "categories": [],
    }


def build_grades_json(
    homework_entries: list[dict],
    grade_entries: list[dict],
    student_name: str | None = None,
    term: str | None = None,
) -> dict:
    """
    Assemble the universal grades.json structure from parsed entries.
    Extend this as the parser extracts richer data from the portal.
    """
    now = datetime.now(timezone.utc).isoformat()

    courses_map: dict[str, dict] = {}

    for entry in grade_entries:
        subject = entry["subject"]
        if subject not in courses_map:
            courses_map[subject] = _new_course(subject)

        score = entry["grade"]
        if score in ATTENDANCE_SCORES:
            category, max_score = "Attendance", None
        elif score in PASS_FAIL_SCORES:
            category, max_score = "Grade", None
        else:
            category, max_score = "Grade", 10

        lesson_date = entry.get("due_date")
        lesson_id   = entry.get("lesson_id") or (f"{subject}|{lesson_date}" if lesson_date else None)

        courses_map[subject]["assignments"].append({
            "id":        lesson_id,
            "name":      entry.get("content") or "Grade entry",
            "category":  category,
            "score":     score,
            "max_score": max_score,
            "date":      lesson_date,
            "lesson_id": lesson_id,
            "status":    "graded",
        })

    for entry in homework_entries:
        subject = entry["subject"]
        if subject not in courses_map:
            courses_map[subject] = _new_course(subject)

        lesson_date = entry.get("lesson_date")
        lesson_id   = f"{subject}|{lesson_date}" if lesson_date else None

        courses_map[subject]["assignments"].append({
            "id":        None,
            "name":      entry.get("content") or "Homework",
            "category":  "Homework",
            "due_date":  entry.get("due_date"),
            "lesson_id": lesson_id,
            "status":    "pending",
        })

    return {
        "metadata": {
            "student_name": student_name,
            "student_id": None,
            "institution": "Mano Dienynas",
            "scraped_at": now,
            "term": term,
        },
        "courses": list(courses_map.values()),
    }


def export(data: dict, path: str = "grades.json") -> None:
    """Write grades data to JSON file at the given path."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Exported grades.json → {os.path.abspath(path)}")
