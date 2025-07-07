"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Play } from "lucide-react"

interface SessionItem {
  id: number
  title: string
}

interface SessionListProps {
  sessions: SessionItem[]
  onSessionSelect: (sessionId: string) => void
  onClose: () => void
  isVisible: boolean
}

export function SessionList({ sessions, onSessionSelect, onClose, isVisible }: SessionListProps) {
  if (!isVisible) return null

  return (
    <div 
      className={`fixed top-0 right-0 h-screen w-1/2 bg-background border-l border-border z-50`}
    >
      <Card className="h-full rounded-none border-0 flex flex-col">
        <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0`}>
          <CardTitle className="text-lg font-semibold">Exam Sessions</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex-grow overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-4">
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No sessions available</p>
                </div>
              ) : (
                sessions.map((session, index) => (
                  <Card
                    key={session.id}
                    className={`cursor-pointer`}
                    onClick={() => onSessionSelect(String(session.id))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-foreground break-words whitespace-normal leading-relaxed">
                            {session.title}
                          </h3>
                        </div>
                        <Play className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
