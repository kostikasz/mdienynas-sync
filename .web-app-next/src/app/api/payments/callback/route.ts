import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const orderId = (body.order_id ?? body.orderid) as string | undefined
  const status  = (body.status  ?? body.payment_status) as string | undefined

  if (!orderId) return NextResponse.json({ error: "Missing order_id" }, { status: 400 })

  const payment = await prisma.payment.findFirst({
    where: { metadata: { path: ["order_id"], equals: orderId } },
    select: { id: true, userId: true, status: true },
  })

  if (!payment) {
    console.warn("Callback: no payment found for order_id", orderId)
    return NextResponse.json({ ok: true })
  }

  const isPaid = ["paid", "completed", "1", "confirmed"].includes(status ?? "")
  if (!isPaid) {
    console.log(`Callback: order ${orderId} status "${status}" — no action taken`)
    return NextResponse.json({ ok: true })
  }

  if (payment.status === "paid") return NextResponse.json({ ok: true })

  await prisma.payment.update({
    where: { id: payment.id },
    data:  { status: "paid", providerOrderId: orderId },
  })

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await prisma.subscription.upsert({
    where:  { userId: payment.userId },
    update: { plan: "pro", status: "active", startedAt: new Date(), expiresAt },
    create: { userId: payment.userId, plan: "pro", status: "active", expiresAt },
  })

  return NextResponse.json({ ok: true })
}
