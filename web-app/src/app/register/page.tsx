import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { RegisterForm } from "./RegisterForm"

export default async function RegisterPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return <RegisterForm />
}
