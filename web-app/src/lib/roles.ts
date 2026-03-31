import type { User } from "@supabase/supabase-js"

export function hasRole(user: User, role: string): boolean {
  return ((user.app_metadata?.roles ?? []) as string[]).includes(role)
}
