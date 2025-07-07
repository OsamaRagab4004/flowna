"use client"

import { Crown } from "lucide-react"
import React from "react"

interface Player {
  id: string
  username: string
  host: boolean
  ready: boolean
}
interface PlayerListProps {
  players: Player[]
  currentUsername: string
}

export default function PlayerList({ players, currentUsername }: PlayerListProps) {
  return (
    <div className="space-y-2">
      {players.map((player) => {
        // Apply background color based on ready status and current user
        const bgColor = player.ready && player.username === currentUsername
          ? "bg-green-100"
          : player.username === currentUsername
          ? "bg-purple-100"
          : "bg-gray-50"

        return (
          <div
            key={player.id}
            className={`flex items-center justify-between p-3 rounded-lg ${bgColor}`}
          >
            <div className="flex items-center gap-2">
              {player.host ? (
                <span className="relative">
                  <Crown className="h-8 w-8 text-yellow-500" aria-label="Host" />
                </span>
              ) : (
                <div className="h-8 w-8 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold text-lg uppercase">
                  {player.username.charAt(0)}
                </div>
              )}
              <span className="font-medium">{player.username}</span>
              {player.username === currentUsername && (
                <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                  You
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              
              {player.ready && (
                <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">
                  Ready
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}