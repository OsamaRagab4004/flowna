"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Target, Trophy, CheckCircle2, Plus, X, Trash2, BookOpen, Brain, Copy } from "lucide-react" // Added Copy
import { cn } from "@/lib/utils"

export interface Goal {
  id: string
  text: string
  done: boolean
  duration?: {
    hours: number
    minutes: number
  }
}

interface SessionGoalsProps {
  goals: Goal[]
  onGoalToggle: (goalId: string) => void
  onAddGoal: (goalText: string, duration?: { hours: number; minutes: number }) => void
  onDeleteGoal: (goalId: string) => void
  isHost: boolean
  className?: string
  onStartTimerForGoal?: (goal: Goal) => void // Added this prop
}

export default function SessionGoals({ goals, onGoalToggle, onAddGoal, onDeleteGoal, isHost, className, onStartTimerForGoal }: SessionGoalsProps) {
  // Memoize sorted goals to avoid re-sorting on every render
  const [sortedGoals, activeGoals, achievedGoals] = useMemo(() => {
    const sorted = [...goals].sort((a, b) => parseInt(a.id) - parseInt(b.id))
    return [sorted, sorted.filter(goal => !goal.done), sorted.filter(goal => goal.done)]
  }, [goals])

  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoalText, setNewGoalText] = useState("")
  const [goalHours, setGoalHours] = useState(0)
  const [goalMinutes, setGoalMinutes] = useState(0)
  const [addStudyTag, setAddStudyTag] = useState(false)
  const [addPractisingTag, setAddPractisingTag] = useState(false)
  const [sessionNumber, setSessionNumber] = useState("")

  // Memoize regex operations to avoid recreating on every call
  const cleanTextRegex = useMemo(() => ({
    study: /\s*\[Study\]/g,
    practising: /\s*\[Practising\]/g,
    session: /\s*\(Session .*?\)/g
  }), [])

  const getCleanGoalText = useCallback((rawText: string): string => {
    return rawText
      .replace(cleanTextRegex.study, "")
      .replace(cleanTextRegex.practising, "")
      .replace(cleanTextRegex.session, "")
      .trim();
  }, [cleanTextRegex]);

  const handleCopyGoalText = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // Optionally, display a toast message here if the toast function is passed as a prop
        // For example: toast({ title: "Copied!", description: "Goal text copied to clipboard." });
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        // Optionally, display an error toast message here
      });
  };

  const handleGoalCheck = (goalId: string, checked: boolean) => {
    if (isHost) {
      onGoalToggle(goalId)
    }
  }
  const handleAddGoal = () => {
    if (newGoalText.trim()) {
      let finalText = newGoalText.trim();
      if (addStudyTag) finalText += " [Study]"; // Keep the tag in text for data
      if (addPractisingTag) finalText += " [Practising]"; // Keep the tag in text for data
      if (sessionNumber.trim()) finalText += ` (Session ${sessionNumber.trim()})`;

      const duration = (goalHours > 0 || goalMinutes > 0) ? { hours: goalHours, minutes: goalMinutes } : undefined
      onAddGoal(finalText, duration)
      setNewGoalText("")
      setGoalHours(0)
      setGoalMinutes(0)
      setShowAddGoal(false)
      setAddStudyTag(false)
      setAddPractisingTag(false)
      setSessionNumber("")
    }
  }
  const handleCancelAdd = () => {
    setNewGoalText("")
    setGoalHours(0)
    setGoalMinutes(0)
    setShowAddGoal(false)
    setAddStudyTag(false)
    setAddPractisingTag(false)
    setSessionNumber("")
  }
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddGoal()
    } else if (e.key === 'Escape') {
      handleCancelAdd()
    }
  }

  // Optimized memoized function to format duration
  const formatDuration = useCallback((duration?: { hours: number; minutes: number }) => {
    if (!duration || (duration.hours === 0 && duration.minutes === 0)) return null
    const parts = []
    if (duration.hours > 0) parts.push(`${duration.hours}h`)
    if (duration.minutes > 0) parts.push(`${duration.minutes}m`)
    return parts.join(' ')
  }, [])

  // Optimized function to parse and render goal text with tags
  const parseAndRenderGoalText = useCallback((text: string) => {
    const studyMatch = text.includes('[Study]')
    const practisingMatch = text.includes('[Practising]')
    const sessionMatch = text.match(/\(Session (.*?)\)/)
    
    const mainText = text
      .replace(/\s*\[Study\]/g, "")
      .replace(/\s*\[Practising\]/g, "")
      .replace(/\s*\(Session .*?\)/g, "")
      .trim()

    return (
      <>
        <div>{mainText}</div>
        {(studyMatch || practisingMatch || sessionMatch) && (
          <div className="mt-1 flex gap-1">
            {studyMatch && <Badge variant="default" className="bg-blue-500 text-white text-xs px-1 py-0">Study</Badge>}
            {practisingMatch && <Badge variant="default" className="bg-green-500 text-white text-xs px-1 py-0">Practising</Badge>}
            {sessionMatch && <Badge variant="outline" className="text-xs px-1 py-0">Session {sessionMatch[1]}</Badge>}
          </div>
        )}
      </>
    )
  }, [])

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Session Goals</CardTitle>
              <CardDescription className="text-sm">Track your study objectives</CardDescription>
            </div>
          </div>
          {isHost && (
            <Button
              variant="ghost" 
              size="sm"
              onClick={() => setShowAddGoal(true)}
              className="w-8 h-8 p-0 rounded-full bg-blue-100 text-blue-600"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              <h3 className="font-medium">Current Goals</h3>
              <Badge variant="secondary" className="text-xs">{activeGoals.length}</Badge>
            </div>
            {activeGoals.map((goal: Goal) => (
              <div key={goal.id} className="flex items-center gap-3 p-2 rounded group">
                <Checkbox
                  id={goal.id}
                  checked={goal.done}
                  onCheckedChange={(checked) => handleGoalCheck(goal.id, checked as boolean)}
                  disabled={!isHost}
                />
                <div className="flex-1 min-w-0">
                  <label htmlFor={isHost ? goal.id : undefined} className={`text-sm block ${isHost ? 'cursor-pointer' : ''}`}>
                    {parseAndRenderGoalText(goal.text)}
                  </label>
                  {formatDuration(goal.duration) && (
                    <div className="text-xs text-blue-600 mt-1">
                      <Target className="w-3 h-3 inline mr-1" /> {formatDuration(goal.duration)}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleCopyGoalText(getCleanGoalText(goal.text))}
                    className="w-7 h-7 p-1 text-blue-500 hover:bg-blue-100"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  {isHost && onStartTimerForGoal && goal.duration && (goal.duration.hours > 0 || goal.duration.minutes > 0) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onStartTimerForGoal(goal)}
                      className="w-7 h-7 p-1 text-green-500 hover:bg-green-100"
                      title="Start timer"
                    >
                      <Target className="w-4 h-4" />
                    </Button>
                  )}
                  {isHost && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDeleteGoal(goal.id)}
                      className="w-7 h-7 p-1 text-red-500 hover:bg-red-100"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}        {/* Add Goal Form */}
        {isHost && showAddGoal && (
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-500" />
              <h3 className="font-medium">Add New Goal</h3>
            </div>
            <div className="space-y-3">
              <Input
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter your study goal..."
                autoFocus
              />
              
              {/* Quick Tags & Session */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Quick Tags & Session</label>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="studyTag"
                      checked={addStudyTag}
                      onCheckedChange={(checked) => setAddStudyTag(checked as boolean)}
                    />
                    <label htmlFor="studyTag" className="text-sm">
                      <Badge className="bg-blue-500 text-white">Study</Badge>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="practisingTag"
                      checked={addPractisingTag}
                      onCheckedChange={(checked) => setAddPractisingTag(checked as boolean)}
                    />
                    <label htmlFor="practisingTag" className="text-sm">
                      <Badge className="bg-green-500 text-white">Practising</Badge>
                    </label>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="1"
                      value={sessionNumber}
                      onChange={(e) => setSessionNumber(e.target.value)}
                      className="w-20 text-center h-8 text-sm"
                      placeholder="1"
                    />
                    <span className="text-xs text-gray-500">Session</span>
                  </div>
                </div>
              </div>

              {/* Time Duration */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Estimated Time (Optional)</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={goalHours}
                      onChange={(e) => setGoalHours(parseInt(e.target.value) || 0)}
                      className="w-16 text-center border rounded h-8 text-sm"
                      placeholder="0"
                    />
                    <span className="text-xs text-gray-500">hrs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={goalMinutes}
                      onChange={(e) => setGoalMinutes(parseInt(e.target.value) || 0)}
                      className="w-16 text-center border rounded h-8 text-sm"
                      placeholder="0"
                    />
                    <span className="text-xs text-gray-500">mins</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleAddGoal}
                  disabled={!newGoalText.trim()}
                  className="bg-blue-500"
                >
                  Add Goal
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelAdd}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Achieved Goals */}
        {achievedGoals.length > 0 && (
          <div className="space-y-2 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-green-500" />
              <h3 className="font-medium">Achieved Goals</h3>
              <Badge className="text-xs bg-green-100 text-green-700">{achievedGoals.length}</Badge>
            </div>
            {achievedGoals.map((goal: Goal) => (
              <div key={goal.id} className="flex items-center gap-3 p-2 rounded bg-green-50">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-600 line-through block">
                    {parseAndRenderGoalText(goal.text)}
                  </span>
                  {formatDuration(goal.duration) && (
                    <div className="text-xs text-green-600 mt-1">⏱️ {formatDuration(goal.duration)}</div>
                  )}
                </div>
                <Badge variant="outline" className="text-xs text-green-600">Done</Badge>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleCopyGoalText(getCleanGoalText(goal.text))}
                    className="w-7 h-7 p-1 text-blue-500 hover:bg-blue-100"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  {isHost && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDeleteGoal(goal.id)}
                      className="w-7 h-7 p-1 text-red-500 hover:bg-red-100"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {goals.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No goals set for this session</p>
            <p className="text-xs text-gray-400 mt-1">Set study goals to track your progress</p>
          </div>
        )}

        {/* Progress Summary */}
        {goals.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{achievedGoals.length} of {goals.length} completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${goals.length > 0 ? (achievedGoals.length / goals.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
