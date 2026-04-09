import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

export default NextAuth(authConfig).auth

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
