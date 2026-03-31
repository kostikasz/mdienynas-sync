import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user already has an active pro subscription
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
    return NextResponse.json(
      { error: "You already have an active Pro subscription." },
      { status: 400 }
    )
  }

  // Parse body (optional, we only support "pro" plan for now)
  let body: { plan?: string } = {}
  try {
    body = await req.json()
  } catch {
    // Body is optional
  }

  if (body.plan && body.plan !== "pro") {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 })
  }

  const orderId = randomUUID()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  // Insert pending payment record
  const { data: payment, error: insertError } = await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      provider: "paysera",
      amount_cents: 399,
      currency: "EUR",
      status: "pending",
      metadata: { order_id: orderId },
    })
    .select("id")
    .single()

  if (insertError || !payment) {
    console.error("Failed to insert payment record:", insertError)
    return NextResponse.json({ error: "Failed to create payment." }, { status: 500 })
  }

  // Call Paysera Checkout v3 API
  const projectId = process.env.PAYSERA_PROJECT_ID
  const signPassword = process.env.PAYSERA_SIGN_PASSWORD

  if (!projectId || !signPassword) {
    // Clean up pending record
    await supabase.from("payments").delete().eq("id", payment.id)
    return NextResponse.json(
      { error: "Payment provider not configured." },
      { status: 503 }
    )
  }

  const auth = Buffer.from(`${projectId}:${signPassword}`).toString("base64")

  let payseraRes: Response
  try {
    payseraRes = await fetch("https://checkout.paysera.com/api/v3/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: 399,
        currency: "EUR",
        order_id: orderId,
        description: "Dienynas SYNC Pro - 1 month",
        accept_url: `${appUrl}/checkout/success`,
        cancel_url: `${appUrl}/checkout`,
        callback_url: `${appUrl}/api/payments/callback`,
        payment: "paysera",
      }),
    })
  } catch (err) {
    console.error("Paysera API network error:", err)
    await supabase.from("payments").delete().eq("id", payment.id)
    return NextResponse.json(
      { error: "Payment provider unreachable. Please try again." },
      { status: 502 }
    )
  }

  if (!payseraRes.ok) {
    const body = await payseraRes.text()
    console.error("Paysera API error:", payseraRes.status, body)
    await supabase.from("payments").delete().eq("id", payment.id)
    return NextResponse.json(
      { error: "Payment provider returned an error. Please try again." },
      { status: 502 }
    )
  }

  const payseraData = await payseraRes.json()
  const paymentUrl: string | undefined = payseraData.pay_url

  if (!paymentUrl) {
    console.error("Paysera response missing pay_url:", payseraData)
    await supabase.from("payments").delete().eq("id", payment.id)
    return NextResponse.json(
      { error: "Payment provider returned an unexpected response." },
      { status: 502 }
    )
  }

  return NextResponse.json({ paymentUrl })
}
