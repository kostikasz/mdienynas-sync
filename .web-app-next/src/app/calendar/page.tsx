import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AppShell from "@/components/AppShell"
import CalendarClient from "./CalendarClient"
import type { HomeworkData } from "@/types/homework"

export default async function CalendarPage() {
  const session = await auth()
  if (!session) redirect("/api/auth/signin")

  const snapshot = await prisma.homeworkSnapshot.findFirst({
    where:   { userId: session.user.id },
    orderBy: { generatedAt: "desc" },
  })

  const homework = snapshot?.rawJson as HomeworkData | null

  return (
    <AppShell>
      <CalendarClient homework={homework} generatedAt={snapshot?.generatedAt?.toISOString() ?? null} />
    </AppShell>
  )
}
