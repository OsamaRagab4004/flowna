"use client"

import { motion } from "framer-motion"
import { User, Check } from "lucide-react"
import type { Player } from "@/types/game"

interface ReadyPlayersListProps {
  players: Player[]
  currentUsername: string
}

export default function ReadyPlayersList({ players, currentUsername }: ReadyPlayersListProps) {
  // Filter players who are ready
  const readyPlayers = players.filter((player) => player.isReady)

  // Sort players: current user first, then alphabetically
  const sortedPlayers = [...readyPlayers].sort((a, b) => {
    if (a.name === currentUsername) return -1
    if (b.name === currentUsername) return 1
    return a.name.localeCompare(b.name)
  })

  if (readyPlayers.length === 0) {
    return (
      <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-sm text-muted-foreground">No participants ready yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sortedPlayers.map((player, index) => (
        <motion.div
          key={player.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`flex items-center justify-between p-3 rounded-lg ${
            player.name === currentUsername ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-50 dark:bg-gray-800/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white">
              <User className="h-4 w-4" />
            </div>
            <span className="font-medium">{player.name}</span>
            {player.name === currentUsername && (
              <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
                You
              </span>
            )}
          </div>
          <Check className="h-4 w-4 text-green-500" />
        </motion.div>
      ))}
    </div>
  )
}
