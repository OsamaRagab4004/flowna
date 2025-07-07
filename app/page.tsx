"use client"

import { useAuth } from "@/context/auth-context"
import { AuthForm } from "@/components/auth-form"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.replace("/home")
    }
  }, [user, router])

  if (!user) {
    return <AuthForm />
  }

  // Optionally, you can return null here since the redirect will happen
  return null
}