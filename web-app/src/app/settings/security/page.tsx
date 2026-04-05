import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import AppShell from "@/components/AppShell"
import SecurityClient from "./SecurityClient"

export default async function SecurityPage() {
  const session = await auth()
  if (!session) redirect("/api/auth/signin")

  return (
    <AppShell>
      <SecurityClient />
    </AppShell>
  )
}
