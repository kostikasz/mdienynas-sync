import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AppShell from "@/components/AppShell"
import DashboardClient from "./DashboardClient"
import type { GradesSnapshot } from "@/types/grades"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/api/auth/signin")

  const snapshot = await prisma.gradesSnapshot.findFirst({
    where:   { userId: session.user.id },
    orderBy: { scrapedAt: "desc" },
  })

  const grades = snapshot?.rawJson as GradesSnapshot | null

  return (
    <AppShell>
      <DashboardClient grades={grades} scrapedAt={snapshot?.scrapedAt?.toISOString() ?? null} />
    </AppShell>
  )
}
