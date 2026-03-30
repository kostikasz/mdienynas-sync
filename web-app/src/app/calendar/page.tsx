import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AppShell from "@/components/AppShell"
import CalendarClient from "./CalendarClient"
import type { HomeworkData } from "@/types/homework"

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: snapshot } = await supabase
    .from("homework_snapshots")
    .select("raw_json, generated_at")
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single()

  const homework = snapshot?.raw_json as HomeworkData | null

  return (
    <AppShell>
      <CalendarClient homework={homework} generatedAt={snapshot?.generated_at ?? null} />
    </AppShell>
  )
}
