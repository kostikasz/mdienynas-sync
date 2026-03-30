"""
exporter.py — Writes grades.json and homework.json from parsed entries.

grades.json   — grade-only data consumed by integrations and the web app
homework.json — homework assignments consumed by the calendar
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
    grade_entries: list[dict],
    student_name: str | None = None,
    term: str | None = None,
) -> dict:
    """Build grades.json from grade entries only. Homework is excluded."""
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

    return {
        "metadata": {
            "student_name": student_name,
            "student_id":   None,
            "institution":  "Mano Dienynas",
            "scraped_at":   now,
            "term":         term,
        },
        "courses": list(courses_map.values()),
    }


def build_homework_json(homework_entries: list[dict]) -> dict:
    """Build homework.json from homework entries scraped from the portal."""
    now = datetime.now(timezone.utc).isoformat()

    homework = []
    for entry in homework_entries:
        subject   = entry["subject"]
        lesson_id = entry.get("lesson_id")
        assigned  = (entry.get("assigned_date") or now)[:10]
        hw_id     = f"hw-{lesson_id or subject}-{assigned}"

        homework.append({
            "id":            hw_id,
            "subject":       subject,
            "lesson_id":     lesson_id,
            "teacher":       entry.get("teacher") or None,
            "description":   entry.get("description") or None,
            "assigned_date": entry.get("assigned_date"),
            "due_date":      entry.get("due_date"),
            "homework_url":  entry.get("homework_url"),
        })

    return {
        "generated_at": now,
        "source":       "scraper",
        "count":        len(homework),
        "homework":     homework,
    }


def export(data: dict, path: str) -> None:
    """Write a dict to a JSON file."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Exported → {os.path.abspath(path)}")
