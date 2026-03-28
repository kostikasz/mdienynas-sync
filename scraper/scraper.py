"""
scraper.py — Main scraper entry point for Mano Dienynas.

Uses Playwright for a fresh login on every run, which avoids
PHPSESSID expiry (sessions expire after ~1 hour on this portal).
Credentials are read from .env — never hardcoded.
"""

import asyncio
import os
import sys

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

from config import PORTAL_URL, PORTAL_USERNAME, PORTAL_PASSWORD, HOMEWORK_URL, GRADES_URL
from parser import parse_homework, parse_grades
from exporter import build_grades_json, export

GRADES_JSON_PATH = os.path.join(os.path.dirname(__file__), "grades.json")


async def login(page) -> None:
    """
    Navigate to the portal and log in with username/password.
    A fresh login is performed on every run — no session reuse —
    because PHPSESSID expires after ~1 hour.
    """
    print(f"→ Navigating to {PORTAL_URL} ...")
    await page.goto(PORTAL_URL, wait_until="networkidle")

    await page.click('#dl_username')
    await page.type('#dl_username', PORTAL_USERNAME)
    await page.click('#dl_password')
    await page.type('#dl_password', PORTAL_PASSWORD)
    await page.wait_for_selector('#login_submit:not([disabled])')
    await page.click('#login_submit')

    await page.wait_for_load_state("networkidle")
    print("→ Logged in.")


async def scrape() -> None:
    if not PORTAL_USERNAME or not PORTAL_PASSWORD:
        print("Error: PORTAL_USERNAME and PORTAL_PASSWORD must be set in .env")
        sys.exit(1)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Do NOT persist browser state between runs (no storage_state=... kwarg)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            await login(page)

            print(f"→ Fetching homework from {HOMEWORK_URL} ...")
            homework_response = await context.request.get(HOMEWORK_URL)
            homework_html = await homework_response.text()
            homework_entries = parse_homework(homework_html)
            print(f"  Found {len(homework_entries)} homework entries.")

            print(f"→ Fetching grades from {GRADES_URL} ...")
            grades_response = await context.request.get(GRADES_URL)
            grades_html = await grades_response.text()
            grade_entries = parse_grades(grades_html)
            print(f"  Found {len(grade_entries)} grade entries.")

        except PlaywrightTimeout as e:
            print(f"Error: Page load timed out — {e}")
            sys.exit(1)
        except Exception as e:
            print(f"Error: {e}")
            raise
        finally:
            await browser.close()

    data = build_grades_json(homework_entries, grade_entries)
    export(data, GRADES_JSON_PATH)
    print(f"\nDone. {len(homework_entries)} homework, {len(grade_entries)} grades scraped.")


if __name__ == "__main__":
    asyncio.run(scrape())
