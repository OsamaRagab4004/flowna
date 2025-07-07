"use client"

import { useMemo, useState, useCallback } from "react"
import { BookOpen, Target, Plus, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface StudyStatsProps {
  studyTimeMinutes: number
  practiceTimeMinutes: number
  sessionGoalHours?: number
  className?: string
  onTimeAdded?: (type: 'study' | 'practice', minutes: number) => Promise<void>
}

export default function StudyStats({ 
  studyTimeMinutes, 
  practiceTimeMinutes,
  sessionGoalHours,
  className = "",
  onTimeAdded
}: StudyStatsProps) {
  
  const [showAddTime, setShowAddTime] = useState(false)
  const [selectedType, setSelectedType] = useState<'study' | 'practice'>('study')
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Memoize all calculations to avoid recomputing on every render
  const stats = useMemo(() => {
    const formatTime = (totalMinutes: number) => {
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      return { hours, minutes }
    }

    const studyTime = formatTime(studyTimeMinutes)
    const practiceTime = formatTime(practiceTimeMinutes)
    const totalTime = formatTime(studyTimeMinutes + practiceTimeMinutes)
    const totalMinutes = studyTimeMinutes + practiceTimeMinutes
    const goalMinutes = (sessionGoalHours || 5) * 60
    const progressPercentage = Math.min(100, Math.round((totalMinutes / goalMinutes) * 100))
    
    // Simplified achievement levels
    const getAchievementLevel = (percentage: number) => {
      if (percentage >= 100) return { level: "Expert", color: "bg-blue-500", icon: "💎" }
      if (percentage >= 75) return { level: "Advanced", color: "bg-green-500", icon: "⚡" }
      if (percentage >= 50) return { level: "Intermediate", color: "bg-yellow-500", icon: "🔥" }
      if (percentage >= 25) return { level: "Beginner", color: "bg-gray-400", icon: "🌟" }
      return { level: "Newbie", color: "bg-gray-300", icon: "🚀" }
    }

    const achievement = getAchievementLevel(progressPercentage)
    
    return {
      studyTime,
      practiceTime, 
      totalTime,
      progressPercentage,
      achievement
    }
  }, [studyTimeMinutes, practiceTimeMinutes, sessionGoalHours])

  // Quick add time presets - memoized to prevent recreation
  const quickAddOptions = useMemo(() => [
    { label: '15m', minutes: 15 },
    { label: '30m', minutes: 30 },
    { label: '1h', minutes: 60 },
    { label: '2h', minutes: 120 }
  ], [])

  // Handle quick add time - memoized callback
  const handleQuickAdd = useCallback(async (minutes: number, type: 'study' | 'practice') => {
    if (!onTimeAdded) return
    
    setIsSubmitting(true)
    try {
      await onTimeAdded(type, minutes)
    } catch (error) {
      console.error('Failed to add time:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [onTimeAdded])

  // Handle custom time submission - memoized callback
  const handleCustomSubmit = useCallback(async () => {
    if (!onTimeAdded) return
    
    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0)
    if (totalMinutes <= 0) return

    setIsSubmitting(true)
    try {
      await onTimeAdded(selectedType, totalMinutes)
      // Reset form
      setHours('')
      setMinutes('')
      setShowAddTime(false)
    } catch (error) {
      console.error('Failed to add time:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [onTimeAdded, selectedType, hours, minutes])

  return (
    <div className={`w-full ${className}`}>
      <Card className="bg-white border will-change-transform">
        <CardContent className="p-3">
          {/* Header */}
          <div className="text-center mb-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className={`size-14 rounded-full ${stats.achievement.color} flex items-center justify-center text-lg will-change-transform`}>
                {stats.achievement.icon}
              </div>
              <div>
                <h3 className="text-base font-bold">Study Stats</h3>
                <span className="text-xs font-semibold text-gray-600">{stats.achievement.level} Level</span>
              </div>
            </div>
          </div>

          {/* Total Time */}
          <div className="text-center mb-3">
            <div className="text-xl font-bold text-indigo-600 mb-1">
              {stats.totalTime.hours}h {stats.totalTime.minutes}m
            </div>
            <p className="text-xs font-medium text-gray-600 uppercase">Total Study Time 🎯</p>
            
            {/* Progress bar */}
            <div className="mt-1 relative">
              <div className="h-6 bg-gray-200 rounded-full relative overflow-hidden">
                <div 
                  className={`h-full ${stats.achievement.color} rounded-full transition-all duration-300 ease-out will-change-transform`}
                  style={{ width: `${stats.progressPercentage}%` }}
                />
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-700">
                  {stats.progressPercentage}%
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-700">
                  Goal: {sessionGoalHours || 5}h
                </div>
              </div>
            </div>
          </div>

          {/* Study vs Practice Breakdown */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Study Time */}
            <div className="text-center bg-blue-50 rounded p-2">
              <div className="flex items-center justify-center mb-1">
                <div className="size-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <BookOpen className="size-2.5 text-white" />
                </div>
              </div>
              <div className="text-base font-bold text-blue-600 mb-1">
                {stats.studyTime.hours}h {stats.studyTime.minutes}m
              </div>
              <p className="text-xs font-medium text-blue-500 uppercase">Learning 📚</p>
            </div>

            {/* Practice Time */}
            <div className="text-center bg-emerald-50 rounded p-2">
              <div className="flex items-center justify-center mb-1">
                <div className="size-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Target className="size-2.5 text-white" />
                </div>
              </div>
              <div className="text-base font-bold text-emerald-600 mb-1">
                {stats.practiceTime.hours}h {stats.practiceTime.minutes}m
              </div>
              <p className="text-xs font-medium text-emerald-500 uppercase">Practice ⚡</p>
            </div>
          </div>

          {/* Motivational Message */}
          <div className="text-center bg-indigo-50 rounded p-1.5 mb-3">
            <p className="text-xs font-semibold text-indigo-600">
              {stats.progressPercentage >= 100
                ? "🎉 Goal Smashed! You're a study champion! 🏆"
                : stats.progressPercentage >= 75
                ? "🔥 Almost there! Final push to greatness! 💪"
                : stats.progressPercentage >= 50
                ? "⚡ Halfway there! You're crushing it! 🚀"
                : stats.progressPercentage >= 25
                ? "💎 Great momentum! Keep the energy up! ⭐"
                : "🌟 Every minute counts! You've got this! 💪"
              }
            </p>
          </div>

          {/* Add Time Section */}
          {onTimeAdded && (
            <div className="border-t pt-3">
              {!showAddTime ? (
                <div className="space-y-3">
                  {/* Quick Add Buttons */}
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Quick Add Time</p>
                    <div className="grid grid-cols-2 gap-2">
                      {quickAddOptions.map((option) => (
                        <div key={option.label} className="space-y-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAdd(option.minutes, 'study')}
                            disabled={isSubmitting}
                            className="w-full h-8 text-xs bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            <BookOpen className="size-3 mr-1" />
                            {option.label}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAdd(option.minutes, 'practice')}
                            disabled={isSubmitting}
                            className="w-full h-8 text-xs bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          >
                            <Target className="size-3 mr-1" />
                            {option.label}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom Time Button */}
                  <div className="text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddTime(true)}
                      className="text-xs transition-colors"
                    >
                      <Clock className="size-3 mr-1" />
                      Custom Time
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Custom Time Form */}
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Add Custom Time</p>
                    
                    {/* Session Type Selection */}
                    <div className="flex gap-2 mb-3 justify-center">
                      <Button
                        size="sm"
                        variant={selectedType === 'study' ? 'default' : 'outline'}
                        onClick={() => setSelectedType('study')}
                        className={`text-xs transition-colors ${selectedType === 'study' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        <BookOpen className="size-3 mr-1" />
                        Study
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedType === 'practice' ? 'default' : 'outline'}
                        onClick={() => setSelectedType('practice')}
                        className={`text-xs transition-colors ${selectedType === 'practice' 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        <Target className="size-3 mr-1" />
                        Practice
                      </Button>
                    </div>

                    {/* Time Input */}
                    <div className="flex gap-2 items-center justify-center mb-3">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          placeholder="0"
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                          min="0"
                          max="23"
                          className="w-14 h-8 text-xs text-center"
                        />
                        <span className="text-xs text-gray-500">h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          placeholder="0"
                          value={minutes}
                          onChange={(e) => setMinutes(e.target.value)}
                          min="0"
                          max="59"
                          className="w-14 h-8 text-xs text-center"
                        />
                        <span className="text-xs text-gray-500">m</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAddTime(false)
                          setHours('')
                          setMinutes('')
                        }}
                        disabled={isSubmitting}
                        className="text-xs transition-colors"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCustomSubmit}
                        disabled={isSubmitting || (parseInt(hours) || 0) + (parseInt(minutes) || 0) <= 0}
                        className="text-xs transition-colors"
                      >
                        <Plus className="size-3 mr-1" />
                        Add Time
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
