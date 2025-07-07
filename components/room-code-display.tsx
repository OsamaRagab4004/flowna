"use client"

import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RoomCodeDisplayProps {
  roomCode: string
  onCopy: () => void
}

export default function RoomCodeDisplay({ roomCode, onCopy }: RoomCodeDisplayProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
      <div>
        <div className="text-xs text-muted-foreground mb-1">Room Code:</div>
        <div className="text-xs font-bold tracking-wider">{roomCode}</div>
      </div>
      <Button variant="outline" size="icon" onClick={onCopy}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  )
}
