"""
parser.py — HTML → structured Python dicts.

Accepts raw HTML strings from authenticated GET requests to Mano Dienynas.
"""

import re
from datetime import datetime, timezone
from bs4 import BeautifulSoup


def parse_homework(html: str) -> list[dict]:
    """
    Parse homework entries from classhomework/home_work page HTML.

    Table: table.classhomework_table
    Rows:  tr.simple_info_block
    Columns:
      0 - lesson date (month name + div.month_day + day name)
      1 - subject (td.mark_subject, data-lesson-id)
      2 - teacher
      3 - description (td.chDescription)
      4 - due date ("2026-03-30 00:00:00")
      5 - entered date ("2026-03-26")
    """
    soup = BeautifulSoup(html, "html.parser")
    entries = []
    for row in soup.select("tr.simple_info_block"):
        cols = row.select("td")
        if len(cols) < 6:
            continue
        lesson_date_raw = cols[0].get_text(strip=True)
        lesson_date     = parse_date(lesson_date_raw)
        subject         = cols[1].get_text(strip=True)
        teacher         = cols[2].get_text(strip=True)
        description     = cols[3].get_text(strip=True)
        due_raw         = cols[4].get_text(strip=True)
        due_date        = parse_date(due_raw)
        if subject:
            entries.append({
                "type":        "Homework",
                "subject":     subject,
                "content":     description,
                "lesson_date": lesson_date,
                "due_date":    due_date,
                "grade":       None,
                "teacher":     teacher,
            })
    return entries


def parse_grades(html: str) -> list[dict]:
    """
    Parse grade entries from marks_pupil/marks page HTML.

    The table has two separate sections:
      - Subject rows: td.mark_subject with data-group-id
      - Grade rows:   td.td-class-mark with id="td-YYYY-MM-DD-{group_id}"

    Strategy: build group_id → {subject, teacher} map, then scan all grade cells.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Build group_id → subject/teacher map from all mark_subject cells
    subjects = {}
    for td in soup.select("td.mark_subject"):
        group_id  = td.get("data-group-id")
        if not group_id:
            continue
        name      = td.get("title", td.get_text(strip=True))
        name      = re.sub(r'\s*\(-\)\s*\w+\s*$', '', name).strip()
        teacher_a = td.find("a")
        teacher   = teacher_a.get_text(strip=True) if teacher_a else ""
        subjects[group_id] = {"subject": name, "teacher": teacher}

    entries = []
    for cell in soup.select("td.td-class-mark"):
        cell_id = cell.get("id", "")
        # id format: "td-YYYY-MM-DD-{group_id}"
        m = re.match(r"td-(\d{4}-\d{2}-\d{2})-(\d+)$", cell_id)
        if not m:
            continue
        date_str   = m.group(1)
        date_iso   = parse_date(date_str)
        group_id   = m.group(2)
        info       = subjects.get(group_id, {"subject": "", "teacher": ""})
        value_spans = cell.find_all("span", class_=re.compile(r"span-mark-value"))
        info_span   = cell.find("span", class_=re.compile(r"span-mark-info"))
        grade_info  = info_span.get_text(strip=True) if info_span else ""
        grade_vals  = [s.get_text(strip=True) for s in value_spans if s.get_text(strip=True)]

        # No grade value — fall back to info span (e.g. attendance notes)
        if not grade_vals:
            if grade_info:
                grade_vals = [grade_info]
            else:
                continue

        for idx, grade_val in enumerate(grade_vals):
            suffix = f"-{idx}" if len(grade_vals) > 1 else ""
            entries.append({
                "type":      "Grade",
                "subject":   info["subject"],
                "content":   grade_info if idx == 0 else "",
                "due_date":  date_iso,
                "lesson_id": f"{group_id}-{date_str}{suffix}",
                "grade":     grade_val,
                "teacher":   info["teacher"],
            })
    return entries


def parse_date(raw: str) -> str | None:
    """Try common date formats. Returns ISO 8601 UTC string or None."""
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d.%m.%Y", "%d-%m-%Y"):
        try:
            dt = datetime.strptime(raw.strip(), fmt)
            return dt.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue
    return None
