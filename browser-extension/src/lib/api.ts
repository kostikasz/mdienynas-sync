import type { GradesJson, HomeworkJson } from "./types"

// Replace with your Vercel URL (or http://localhost:3000 for local dev)
const WEBAPP_URL = "https://mdienynas.kostikas.cloud"

export async function uploadGrades(
  json: GradesJson,
  token: string
): Promise<{ courses: number }> {
  const res = await fetch(`${WEBAPP_URL}/api/grades`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(json),
  })
  if (!res.ok) throw new Error("Sync failed — could not save data. Try again.")
  return res.json()
}

export async function uploadHomework(
  json: HomeworkJson,
  token: string
): Promise<{ count: number }> {
  const res = await fetch(`${WEBAPP_URL}/api/homework`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(json),
  })
  if (!res.ok) throw new Error("Sync failed — could not save data. Try again.")
  return res.json()
}
