import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      roles: string[]
      mfaPending: boolean
    }
  }
  interface User {
    roles?: string[]
    mfaPending?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: string[]
    email?: string
    mfaPending?: boolean
  }
}
