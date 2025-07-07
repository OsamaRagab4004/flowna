"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { AuthForm } from "@/components/auth-form"
import { useAuth } from "@/context/auth-context"
import { useStomp } from "@/context/StompContextType"
import { getApiUrl } from "@/lib/api"

export default function CreateRoom() {
  const router = useRouter()
  const [roomName, setRoomName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const subscriptionRef = useRef<any>(null)
  const roomIdRef = useRef<string | null>(null)

  const { user, refreshToken } = useAuth()
  const { subscribeToTopic, unsubscribeFromTopic } = useStomp()

  // Show auth form if user is not logged in
  if (!user) {
    return <AuthForm />
  }

  const handleCreateRoom = useCallback(async () => {
    if (!roomName.trim()) return
    setIsCreating(true)

    try {
      // 1. Call API to create room
      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/create"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ name: roomName }),
      })

      // refresh jwt for user
      if (response.status === 403) {
        const res = await refreshToken();
        if (!res) {
          console.error("Session expired. Please log in again.")
          return
        }
        window.location.reload()
        return
      }

      if (!response.ok) throw new Error("Failed to create room")

      const data = await response.json()
      const roomId = data.roomJoinCode
      roomIdRef.current = roomId

      setSubscribed(true)
      console.log(`Subscribed to room ${roomName}!`)

      // 3. Navigate to the lobby
      localStorage.setItem("isHost", "true")
      localStorage.setItem("roomId", roomId)
      localStorage.setItem("roomName", roomName)
      router.push(`/lobby/${roomId}`)
    } catch (error: any) {
      console.error("Error creating room:", error)
      setIsCreating(false)
    }
  }, [roomName, user.access_token, refreshToken, router])

  const handleDisconnectRoom = useCallback(() => {
    if (roomIdRef.current) {
      unsubscribeFromTopic(`/topic/rooms/${roomIdRef.current}`)
      subscriptionRef.current = null
      setSubscribed(false)
      console.log("Disconnected from room.")
    } else {
      console.error("Not subscribed to any room.")
    }
  }, [unsubscribeFromTopic])

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="w-full shadow-xl border-0">
          <CardHeader className="text-center">
            <Link href="/" className="absolute left-4 top-4">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <CardTitle className="text-2xl font-bold tracking-tight">Create a Study Room</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomName">Room Name</Label>
              <Input
                id="roomName"
                placeholder="Enter room name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="text-lg py-6 transition-all duration-150"
                autoComplete="off"
                maxLength={150}
              />
            </div>
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3 text-lg rounded-xl transition-all duration-150 active:scale-95"
              onClick={handleCreateRoom}
              disabled={!roomName.trim() || isCreating || subscribed}
            >
              {isCreating ? "Creating Room..." : "Create Room"}
            </Button>
            
          </CardContent>
        </Card>
      </div>
    </main>
  )
}