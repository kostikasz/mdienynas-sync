import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import AppShell from "@/components/AppShell"
import SecurityClient from "./SecurityClient"

export default async function SecurityPage() {
  const session = await auth()
  if (!session) redirect("/api/auth/signin")

  const accountUrl = `${process.env.KEYCLOAK_ISSUER}/account`

  return (
    <AppShell>
      <SecurityClient accountUrl={accountUrl} />
    </AppShell>
  )
}
