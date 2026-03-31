import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PublicNavbar } from "@/components/PublicNavbar"
import { PaymentClient } from "./PaymentClient"

export default async function PaymentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/checkout")
  }

  // If user already has an active pro subscription, send them to dashboard
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, expires_at")
    .eq("user_id", user.id)
    .single()

  const isActivePro =
    sub?.plan === "pro" &&
    sub?.status === "active" &&
    (sub?.expires_at === null || new Date(sub.expires_at) > new Date())

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
