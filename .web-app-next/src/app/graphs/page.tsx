import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AppShell from "@/components/AppShell"
import GraphsClient from "./GraphsClient"
import type { GradesSnapshot } from "@/types/grades"

export default async function GraphsPage() {
  const session = await auth()
  if (!session) redirect("/api/auth/signin")

  const snapshot = await prisma.gradesSnapshot.findFirst({
    where:   { userId: session.user.id },
    orderBy: { scrapedAt: "desc" },
  })

  const grades = snapshot?.rawJson as GradesSnapshot | null

  return (
    <AppShell>
      <GraphsClient grades={grades} />
    </AppShell>
  )
}
