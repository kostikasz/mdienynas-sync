import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { LoginForm } from "./LoginForm"

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
