export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/courses/:path*",
    "/graphs/:path*",
    "/calendar/:path*",
    "/integrations/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/billing/:path*",
    "/ai/:path*",
  ],
}
