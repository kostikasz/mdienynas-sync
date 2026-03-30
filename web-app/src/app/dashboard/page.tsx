import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AppShell from "@/components/AppShell"
import DashboardClient from "./DashboardClient"
import type { GradesSnapshot } from "@/types/grades"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: snapshot } = await supabase
    .from("grades_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .single()

  const grades = snapshot?.raw_json as GradesSnapshot | null

  return (
    <AppShell>
      <DashboardClient grades={grades} scrapedAt={snapshot?.scraped_at ?? null} />
    </AppShell>
  )
}
