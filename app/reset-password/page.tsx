"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getApiUrl } from '@/lib/api'

function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Assume the email is passed as a query param: /reset-password?email=user@email.com
  const email = searchParams.get("email") || ""
  const resetCode = searchParams.get("id") || ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(getApiUrl("api/v1/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetCode,password }),
      })

      if (response.ok) {
        toast({
          title: "Password Reset",
          description: "Your password has been reset. Please log in.",
        })
        router.replace("/")
      } else {
        toast({
          title: "Reset Failed",
          description: "Could not reset password. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <div className="w-full max-w-md">
        <Card className="backdrop-blur-lg bg-white/10 border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                <Input
                  type="password"
                  placeholder="New Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                <Input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50"
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 transition-all duration-200"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Reset Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
        <div className="w-full max-w-md">
          <Card className="backdrop-blur-lg bg-white/10 border-white/20 shadow-2xl">
            <CardContent className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </CardContent>
          </Card>
        </div>
      </main>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}