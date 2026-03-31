import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// POST /api/payments/callback
// Called server-to-server by Paysera to confirm a payment.
// No user auth — uses the admin/service client.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const orderId = (body.order_id ?? body.orderid) as string | undefined
  const status  = (body.status ?? body.payment_status) as string | undefined

  if (!orderId) {
    return NextResponse.json({ error: "Missing order_id" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Find the pending payment by order_id stored in metadata
  const { data: payments, error: queryError } = await admin
    .from("payments")
    .select("id, user_id, status")
    .eq("metadata->>order_id", orderId)
    .limit(1)

  if (queryError) {
    console.error("Callback: failed to query payments:", queryError)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }

  const payment = payments?.[0]
  if (!payment) {
    console.warn("Callback: no payment found for order_id", orderId)
    // Return 200 to prevent Paysera from retrying indefinitely
    return NextResponse.json({ ok: true })
  }

  // Only act on paid/completed statuses
  const isPaid =
    status === "paid" ||
    status === "completed" ||
    status === "1" ||
    status === "confirmed"

  if (!isPaid) {
    console.log(`Callback: order ${orderId} status is "${status}" — no action taken`)
    return NextResponse.json({ ok: true })
  }

  // Idempotency — skip if already processed
  if (payment.status === "paid") {
    return NextResponse.json({ ok: true })
  }

  // Update payment status to paid
  const { error: updateError } = await admin
    .from("payments")
    .update({
      status: "paid",
      provider_order_id: orderId,
    })
    .eq("id", payment.id)

  if (updateError) {
    console.error("Callback: failed to update payment:", updateError)
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 })
  }

  // Create/update subscription — +30 days from now
  const startedAt  = new Date().toISOString()
  const expiresAt  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { error: subError } = await admin
    .from("subscriptions")
    .upsert(
      {
        user_id:    payment.user_id,
        plan:       "pro",
        status:     "active",
        started_at: startedAt,
        expires_at: expiresAt,
      },
      { onConflict: "user_id" }
    )

  if (subError) {
    console.error("Callback: failed to upsert subscription:", subError)
    // Don't return 500 — payment is already marked paid; subscription can be
    // corrected manually. Returning 500 would cause Paysera to retry.
  }

  return NextResponse.json({ ok: true })
}
