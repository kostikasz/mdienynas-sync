import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PublicNavbar } from "@/components/PublicNavbar"
import { PaymentClient } from "./PaymentClient"

export default async function PaymentPage() {
  const session = await auth()

  if (!session) {
    redirect("/checkout")
  }

  const sub = await prisma.subscription.findUnique({
    where:  { userId: session.user.id },
    select: { plan: true, status: true, expiresAt: true },
  })

  const isActivePro =
    sub?.plan === "pro" &&
    sub?.status === "active" &&
    (sub?.expiresAt === null || sub.expiresAt > new Date())

  if (isActivePro) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <PublicNavbar />
      <PaymentClient />
    </div>
  )
}
