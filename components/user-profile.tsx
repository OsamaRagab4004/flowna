"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, User } from "lucide-react"
import { useAuth } from "@/context/auth-context"

export function UserProfile() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <div className="flex items-center space-x-3 p-4 bg-white/10 backdrop-blur-sm rounded-lg">
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
        <AvatarFallback>
          <User className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{user.name}</p>
        <p className="text-xs text-white/70 truncate">{user.email}</p>
      </div>

      <Button onClick={logout} variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}
