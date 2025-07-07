"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { History } from "lucide-react"
import { AuthForm } from "@/components/auth-form"
import { useAuth } from "@/context/auth-context"
import Image from "next/image"
import { useCallback, memo, useMemo } from "react"
import { usePageTitle } from "@/hooks/use-page-title"
import { FeedbackButton } from "@/components/feedback-button"

const Home = memo(function Home() {
  const { user, logout } = useAuth()
  
  // Set dynamic page title
  usePageTitle("Home")

  // Memoize user name to prevent re-renders
  const userName = useMemo(() => user?.name, [user?.name])

  // Optimize logout function to prevent delays
  const handleLogout = useCallback(() => {
    logout()
  }, [logout])

  // Show auth form if user is not logged in
  if (!user) {
    return <AuthForm />
  }

  // Show main app if user is logged in
  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="w-full shadow-lg border-0">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <Image 
                  src="/flowna.svg" 
                  alt="Flowna Logo" 
                  width={120} 
                  height={120} 
                  className="text-blue-500"
                  priority
                />
              </div>
              <CardTitle className="text-3xl font-bold">flowna</CardTitle>
              <CardDescription className="text-base">Welcome back, {userName}!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/create" className="w-full block">
                <Button
                  size="lg"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 text-base rounded-lg"
                >
                  Create Study Room
                </Button>
              </Link>
              <Link href="/join" className="w-full block">
                <Button size="lg" variant="outline" className="w-full border-2 font-bold py-3 text-base rounded-lg">
                  Join Study Room
                </Button>
              </Link>
              <Link href="/previous-rooms" className="w-full block">
                <Button size="lg" variant="secondary" className="w-full font-bold py-3 text-base rounded-lg">
                  <History className="mr-2 h-4 w-4" />
                  Previous Rooms
                </Button>
              </Link>
              <Button
                size="lg"
                variant="destructive"
                className="w-full font-bold py-3 text-base rounded-lg"
                onClick={handleLogout}
              >
                Log Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <FeedbackButton />
    </>
  )
})

export default Home
