"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getApiUrl } from '@/lib/api'

function VerifyUserContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending")

  const email = searchParams.get("email") || ""
  const twoFactor = decodeURIComponent(searchParams.get("code") || "")

  useEffect(() => {
    const verify = async () => {
      if (!email || !twoFactor) {
        setStatus("error")
        return
      }
      try {
        const response = await fetch(getApiUrl("api/v1/auth/verify"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ twoFactor, email }),
        })
        if (response.ok) {
          setStatus("success")
          toast({
            title: "Account Verified",
            description: "Your account has been successfully verified. You can now log in.",
          })
          setTimeout(() => router.replace("/home"), 1000)
        } else {
          setStatus("error")
          toast({
            title: "Verification Failed",
            description: "Invalid or expired verification link.",
            variant: "destructive",
          })
        }
      } catch {
        setStatus("error")
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        })
      }
    }
    verify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, twoFactor])

 return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <div className="w-full max-w-md">
        <Card className="backdrop-blur-lg bg-white/10 border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-white text-center">Account Verification</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4 py-8">
            {status === "pending" && (
              <>
                <Loader2 className="h-8 w-8 text-white animate-spin" />
                <span className="text-white text-center">Verifying your account...</span>
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle className="h-8 w-8 text-green-400" />
                <span className="text-green-100 text-center">Your account has been verified! Redirecting...</span>
              </>
            )}
            {status === "error" && (
              <>
                <span className="text-red-100 text-center">Verification failed. Please check your link or try again.</span>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function VerifyUserPage() {
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
      <VerifyUserContent />
    </Suspense>
  )
}