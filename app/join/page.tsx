"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/context/auth-context"
import { useStomp } from "@/context/StompContextType"
import { getApiUrl } from "@/lib/api"

export default function JoinRoom() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")
  const { user } = useAuth()
  const subscriptionRef = useRef<any>(null)
  const { subscribeToTopic, unsubscribeFromTopic } = useStomp()
  
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const roomCodeFromQuery = queryParams.get("roomCode");
    if (roomCodeFromQuery) {
      setRoomCode(roomCodeFromQuery);
    }
  }, []);

  const handleJoinRoom = useCallback(async () => {
    if (!roomCode.trim()) {
      setError("Please enter a room code")
      return
    }

    setIsJoining(true)
    setError("")

    try {
      if (!user) {
        setError("You must be logged in to join a room.")
        setIsJoining(false)
        router.push("/")
        return
      }

      // Send join request to backend
      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/join"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ roomJoinCode: roomCode, isRejoining: true }),
      })

      if (!response.ok) {
        throw new Error("Failed to join room")
      }

      // Store necessary data in localStorage
      localStorage.setItem("isHost", "false")
      localStorage.setItem("roomCode", roomCode.trim())
      localStorage.setItem("username", username.trim())

      // Navigate to the lobby
      router.push(`/lobby/${roomCode.trim()}`)
    } catch (err) {
      console.error("Error joining room:", err)
      setError("Failed to join room. Please try again.")
      setIsJoining(false)
    }
  }, [roomCode, user, username, router])

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
            <CardTitle className="text-2xl font-bold tracking-tight">Join a Study Room</CardTitle>
            <CardDescription>Enter room code to join</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
           
            <div className="space-y-2">
              <Label htmlFor="roomCode">Room Code</Label>
              <Input
                id="roomCode"
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.trim())}
                className="text-lg py-6 uppercase transition-all duration-150"
                autoComplete="off"
                maxLength={250}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3 text-lg rounded-xl transition-all duration-150 active:scale-95"
              onClick={handleJoinRoom}
              disabled={!roomCode.trim() || isJoining}
            >
              {isJoining ? "Joining Room..." : "Join Room"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}