"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, Calendar, Clock, Trophy, BookOpen } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/context/auth-context"
import { getApiUrl } from "@/lib/api"

interface PreviousRoom {
  id: number
  name: string
  roomJoinCode: string
}

export default function PreviousRooms() {
  const router = useRouter()
  const { user } = useAuth()
  const [rooms, setRooms] = useState<PreviousRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push("/")
      return
    }

    // Fetch previous rooms from server
    const fetchRooms = async () => {
      try {
        const response = await fetch(getApiUrl('api/v1/squadgames/rooms/archived/all'),
          
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
        
              'Authorization': `Bearer ${user.access_token}`
            }
          }
        ) // Replace with your actual API endpoint
        if (response.ok) {
          const data = await response.json()
          setRooms(data)
        } else {
          console.error('Failed to fetch rooms:', response.statusText)
          // Fallback to empty array or show error message
          setRooms([])
        }
      } catch (error) {
        console.error('Error fetching rooms:', error)
        // Fallback to empty array or show error message
        setRooms([])
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()
  }, [user, router])

  const joinRoom = (roomJoinCode: string) => {
    router.push(`/lobby/${roomJoinCode}`)
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="w-full shadow-xl border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold tracking-tight">Loading Available Rooms</CardTitle>
              <CardDescription>Fetching study rooms...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center py-8">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-4">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </Button>
          </Link>

          <Card className="shadow-xl border-0">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <BookOpen className="h-10 w-10 text-blue-500" />
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight">Available Study Rooms</CardTitle>
              <CardDescription className="text-lg">Join existing study rooms  {user.name}</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {rooms.length === 0 ? (
          <Card className="shadow-xl border-0">
            <CardContent className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">No Available Rooms</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                There are no study rooms available to join right now. Create a new room to get started!
              </p>
              <Link href="/">
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
                  Start Studying
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <Card
                key={room.id}
                className="shadow-lg border-0 hover:shadow-xl transition-all duration-200"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Room Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{room.name}</h3>
                        <Badge
                          variant="outline"
                          className="border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:bg-blue-900/30"
                        >
                          Available
                        </Badge>
                      </div>

                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Room Code: <span className="font-mono font-bold">{room.roomJoinCode}</span>
                      </div>

                      <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Click to join this study room →
                      </div>
                    </div>

                    {/* Join Button */}
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={() => joinRoom(room.roomJoinCode)}
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 will-change-transform"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Join Room
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Summary Stats */}
            <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Available Rooms</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {rooms.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Total Rooms Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      Ready
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">All Rooms Ready to Join</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  )
}
