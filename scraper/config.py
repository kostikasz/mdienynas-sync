import os
from dotenv import load_dotenv

load_dotenv()

PORTAL_URL      = os.getenv("PORTAL_URL", "https://www.manodienynas.lt/1/lt/public/public/login")
PORTAL_USERNAME = os.getenv("PORTAL_USERNAME")
PORTAL_PASSWORD = os.getenv("PORTAL_PASSWORD")

HOMEWORK_URL    = "https://www.manodienynas.lt/1/lt/page/classhomework/home_work"
GRADES_URL      = "https://www.manodienynas.lt/1/lt/page/marks_pupil/marks"
