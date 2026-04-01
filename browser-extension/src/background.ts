import { signIn, signOut, getValidToken } from "./lib/auth"
import { parseGrades, parseHomework } from "./lib/parser"
import { buildGradesJson, buildHomeworkJson } from "./lib/exporter"
import { uploadGrades, uploadHomework } from "./lib/api"

const GRADES_URL = "https://www.manodienynas.lt/1/lt/page/marks_pupil/marks"
const HOMEWORK_URL = "https://www.manodienynas.lt/1/lt/page/classhomework/home_work"

type SyncResult =
  | { courses: number; homework: number }
  | { error: string }

chrome.runtime.onMessage.addListener(
  (
    message: { type: string; email?: string; password?: string },
    _sender,
    sendResponse: (r: unknown) => void
  ) => {
    if (message.type === "SIGN_IN") {
      signIn(message.email!, message.password!)
        .then(() => sendResponse({}))
        .catch((err: Error) => sendResponse({ error: err.message }))
      return true
    }

    if (message.type === "SIGN_OUT") {
      signOut().then(() => sendResponse({})).catch(() => sendResponse({}))
      return true
    }

    if (message.type === "SYNC") {
      handleSync()
        .then(sendResponse)
        .catch((err: Error) => sendResponse({ error: err.message }))
      return true
    }
  }
)

async function handleSync(): Promise<SyncResult> {
  const token = await getValidToken()
  if (!token) return { error: "Not signed in to Dienynas Sync." }

  // Fetch grades HTML — session cookies auto-included via host_permissions
  let gradesHtml: string
  try {
    const res = await fetch(GRADES_URL, { credentials: "include" })
    gradesHtml = await res.text()
  } catch {
    return { error: "Could not reach Mano Dienynas. Check your connection." }
  }

  // Detect portal login page
  if (gradesHtml.includes("dl_username")) {
    return { error: "Not logged in to Mano Dienynas — please open the portal and log in first." }
  }

  // Fetch homework HTML
  let homeworkHtml: string
  try {
    const res = await fetch(HOMEWORK_URL, { credentials: "include" })
    homeworkHtml = await res.text()
  } catch {
    return { error: "Could not reach Mano Dienynas. Check your connection." }
  }

  // Parse and build JSON
  const gradeEntries = parseGrades(gradesHtml)
  const homeworkEntries = parseHomework(homeworkHtml)
  const gradesJson = buildGradesJson(gradeEntries)
  const homeworkJson = buildHomeworkJson(homeworkEntries)

  // Upload
  try {
    const [gradesResult, homeworkResult] = await Promise.all([
      uploadGrades(gradesJson, token),
      uploadHomework(homeworkJson, token),
    ])
    await chrome.storage.local.set({ lastSync: new Date().toISOString() })
    return { courses: gradesResult.courses, homework: homeworkResult.count }
  } catch {
    return { error: "Sync failed — could not save data. Try again." }
  }
}
