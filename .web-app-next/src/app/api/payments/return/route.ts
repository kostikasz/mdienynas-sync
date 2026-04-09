import { NextRequest, NextResponse } from "next/server"

// GET /api/payments/return
// Paysera redirects the user here after completing (or cancelling) payment.
// We inspect the status query param and forward to the right page.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  if (status === "success" || status === "1") {
    return NextResponse.redirect(new URL("/checkout/success", req.url))
  }

  return NextResponse.redirect(new URL("/checkout?cancelled=1", req.url))
}
