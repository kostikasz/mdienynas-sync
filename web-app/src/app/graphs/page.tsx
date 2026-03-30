import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AppShell from "@/components/AppShell"
import GraphsClient from "./GraphsClient"
import type { GradesSnapshot } from "@/types/grades"

export default async function GraphsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: snapshot } = await supabase
    .from("grades_snapshots")
    .select("raw_json")
    .eq("user_id", user.id)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .single()

  const grades = snapshot?.raw_json as GradesSnapshot | null

  return (
    <AppShell>
      <GraphsClient grades={grades} />
    </AppShell>
  )
}
