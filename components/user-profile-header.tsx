"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, Zap } from "lucide-react"
import { useAuth } from "@/context/auth-context"

export function UserProfileHeader() {
  const { user } = useAuth()

  if (!user) return null

  const progressPercentage = (user.currentLevelPoints / (user.currentLevelPoints + user.pointsToNextLevel)) * 100

  const getLevelColor = (level: number) => {
    if (level >= 20) return "bg-gradient-to-r from-purple-500 to-pink-500"
    if (level >= 15) return "bg-gradient-to-r from-orange-500 to-red-500"
    if (level >= 10) return "bg-gradient-to-r from-blue-500 to-purple-500"
    if (level >= 5) return "bg-gradient-to-r from-green-500 to-blue-500"
    return "bg-gradient-to-r from-gray-500 to-green-500"
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/20">
      <div className="flex items-center space-x-4 mb-4">
        <div className="relative">
          <Avatar className="h-16 w-16 border-2 border-white/30">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div
            className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full ${getLevelColor(user.level)} flex items-center justify-center border-2 border-white`}
          >
            <span className="text-xs font-bold text-white">{user.level}</span>
          </div>
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-1">{user.name}</h2>
          <div className="flex items-center space-x-4 text-sm">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <Star className="h-3 w-3 mr-1" />
              Level {user.level}
            </Badge>
            <div className="flex items-center text-white/80">
              <Trophy className="h-4 w-4 mr-1 text-yellow-400" />
              {user.totalPoints.toLocaleString()} pts
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-white/80">
          <span>Progress to Level {user.level + 1}</span>
          <span>
            {user.currentLevelPoints} / {user.currentLevelPoints + user.pointsToNextLevel}
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2 bg-white/20" />
        <div className="flex items-center justify-center text-xs text-white/60">
          <Zap className="h-3 w-3 mr-1" />
          {user.pointsToNextLevel} points to next level
        </div>
      </div>
    </div>
  )
}
