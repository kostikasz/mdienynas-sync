import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasRole } from "@/lib/roles"
import AppShell from "@/components/AppShell"
import AdminClient from "./AdminClient"

export default async function AdminPage() {
  const session = await auth()
  if (!session) redirect("/api/auth/signin")
  if (!hasRole(session.user.roles, "ADMIN")) redirect("/dashboard")

  return (
    <AppShell>
      <AdminClient />
    </AppShell>
  )
}
