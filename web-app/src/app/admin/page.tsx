import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasRole } from "@/lib/roles"
import AppShell from "@/components/AppShell"
import AdminClient from "./AdminClient"

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()
  const { data: { user: fullUser } } = await admin.auth.admin.getUserById(user.id)
  if (!fullUser || !hasRole(fullUser, "ADMIN")) redirect("/dashboard")

  return (
    <AppShell>
      <AdminClient />
    </AppShell>
  )
}
