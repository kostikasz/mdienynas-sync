import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"
import { verifyTurnstile } from "@/lib/turnstile"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sub = await prisma.subscription.findUnique({
    where:  { userId: session.user.id },
    select: { plan: true, status: true, expiresAt: true },
  })

  const isActivePro =
    sub?.plan === "pro" &&
    sub?.status === "active" &&
    (sub?.expiresAt === null || sub.expiresAt > new Date())

  if (isActivePro) {
    return NextResponse.json({ error: "You already have an active Pro subscription." }, { status: 400 })
  }

  let body: { plan?: string; captchaToken?: string } = {}
  try { body = await req.json() } catch { /* Body is optional */ }

  if (!body.captchaToken || !(await verifyTurnstile(body.captchaToken))) {
    return NextResponse.json({ error: "Please complete the security check." }, { status: 400 })
  }

  if (body.plan && body.plan !== "pro") {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 })
  }

  const orderId = randomUUID()
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const payment = await prisma.payment.create({
    data: {
      userId:      session.user.id,
      provider:    "paysera",
      amountCents: 399,
      currency:    "EUR",
      status:      "pending",
      metadata:    { order_id: orderId },
    },
    select: { id: true },
  })

  const projectId    = process.env.PAYSERA_PROJECT_ID
  const signPassword = process.env.PAYSERA_SIGN_PASSWORD

  if (!projectId || !signPassword) {
    await prisma.payment.delete({ where: { id: payment.id } })
    return NextResponse.json({ error: "Payment provider not configured." }, { status: 503 })
  }

  const authHeader = Buffer.from(`${projectId}:${signPassword}`).toString("base64")

  let payseraRes: Response
  try {
    payseraRes = await fetch("https://checkout.paysera.com/api/v3/orders", {
      method:  "POST",
      headers: { Authorization: `Basic ${authHeader}`, "Content-Type": "application/json" },
      body:    JSON.stringify({
        amount:       399,
        currency:     "EUR",
        order_id:     orderId,
        description:  "Dienynas SYNC Pro - 1 month",
        accept_url:   `${appUrl}/checkout/success`,
        cancel_url:   `${appUrl}/checkout`,
        callback_url: `${appUrl}/api/payments/callback`,
        payment:      "paysera",
      }),
    })
  } catch (err) {
    console.error("Paysera API network error:", err)
    await prisma.payment.delete({ where: { id: payment.id } })
    return NextResponse.json({ error: "Payment provider unreachable. Please try again." }, { status: 502 })
  }

  if (!payseraRes.ok) {
    const errBody = await payseraRes.text()
    console.error("Paysera API error:", payseraRes.status, errBody)
    await prisma.payment.delete({ where: { id: payment.id } })
    return NextResponse.json({ error: "Payment provider returned an error. Please try again." }, { status: 502 })
  }

  const payseraData = await payseraRes.json()
  const paymentUrl: string | undefined = payseraData.pay_url

  if (!paymentUrl) {
    console.error("Paysera response missing pay_url:", payseraData)
    await prisma.payment.delete({ where: { id: payment.id } })
    return NextResponse.json({ error: "Payment provider returned an unexpected response." }, { status: 502 })
  }

  return NextResponse.json({ paymentUrl })
}
