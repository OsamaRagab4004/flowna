"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X, Play, Pause, RotateCcw, Plus, Minus, Timer as TimerIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getApiUrl } from "@/lib/api"

interface TimerWidgetProps {
  isHost?: boolean
  initialDuration?: number
  onTimerSet?: (duration: number) => void
  description?: string
  onDescriptionSet?: (description: string) => void
  isTimerRunning?: boolean
  onTimerStateChange?: (isRunning: boolean) => void
  startTime?: number
  originalDuration?: number
  sessionType?: 'practice' | 'learn'
  onSessionTypeChange?: (type: 'practice' | 'learn') => void
  onTimerComplete?: (sessionType: 'practice' | 'learn', durationMinutes: number) => Promise<void>
  accessToken?: string
  roomJoinCode?: string
}

export default function TimerWidget({ 
  isHost = false, 
  initialDuration = 25 * 60, 
  onTimerSet,
  description = "",
  onDescriptionSet,
  isTimerRunning = false,
  onTimerStateChange,
  originalDuration: propOriginalDuration,
  startTime,
  sessionType = 'practice',
  onSessionTypeChange,
  onTimerComplete,
  accessToken,
  roomJoinCode
}: TimerWidgetProps) {
  const [time, setTime] = useState(() => {
    const hours = Math.floor(initialDuration / 3600)
    const minutes = Math.floor((initialDuration % 3600) / 60)
    const seconds = initialDuration % 60
    return { hours, minutes, seconds }
  })
  const [totalSeconds, setTotalSeconds] = useState(initialDuration)
  const [initialSeconds, setInitialSeconds] = useState(initialDuration)
  const [originalDuration, setOriginalDuration] = useState(() => {
    return propOriginalDuration || initialDuration
  })
  const [localSessionType, setLocalSessionType] = useState<'practice' | 'learn'>(sessionType)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Function to play notification sound when timer completes
  const playNotificationSound = () => {
    try {
      // Create audio context for better browser compatibility
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        // Create a ring sound pattern - multiple tones to simulate ringing
        const createRingTone = (frequency: number, startTime: number, duration: number) => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.setValueAtTime(frequency, startTime)
          oscillator.type = 'sine'
          
          // Ring pattern: fade in, sustain, fade out
          gainNode.gain.setValueAtTime(0, startTime)
          gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.05)
          gainNode.gain.setValueAtTime(0.4, startTime + duration - 0.05)
          gainNode.gain.linearRampToValueAtTime(0, startTime + duration)
          
          oscillator.start(startTime)
          oscillator.stop(startTime + duration)
        }
        
        // Create a 2-second ring pattern with multiple tones
        const currentTime = audioContext.currentTime
        const ringDuration = 5.0 // 2 seconds total
        const toneDuration = 0.3 // Each tone lasts 0.3 seconds
        const pauseDuration = 0.1 // 0.1 second pause between tones
        
        // Create ring pattern: high-low-high-low over 2 seconds
        for (let i = 0; i < 6; i++) {
          const startTime = currentTime + i * (toneDuration + pauseDuration)
          if (startTime < currentTime + ringDuration) {
            // Alternate between high and low frequencies for ring effect
            const frequency = i % 2 === 0 ? 880 : 660 // A5 and E5 notes
            const actualDuration = Math.min(toneDuration, currentTime + ringDuration - startTime)
            createRingTone(frequency, startTime, actualDuration)
          }
        }
        
        console.log('🔊 Timer completion ring sound played for 2 seconds')
      } else {
        // Fallback: create a simple repeating beep pattern
        let beepCount = 0
        const maxBeeps = 8
        const beepInterval = setInterval(() => {
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBz6O1fPTeikGKHzN7+ONQUE...')
            audio.volume = 0.4
            audio.play().catch(() => {})
            beepCount++
            
            if (beepCount >= maxBeeps) {
              clearInterval(beepInterval)
            }
          } catch (e) {}
        }, 250) // Beep every 250ms for 2 seconds total
        
        // Stop after 2 seconds regardless
        setTimeout(() => clearInterval(beepInterval), 2000)
        console.log('🔊 Timer completion ring pattern played')
      }
    } catch (error) {
      console.log('🔇 Could not play notification sound:', error)
    }
  }

  // Sync session type from props (but don't override user selection)
  useEffect(() => {
    // Only sync from props if this is the initial load or if props change from external source
    console.log('Session type sync check:', { sessionType, localSessionType })
    if (sessionType !== localSessionType && sessionType !== undefined) {
      console.log('Syncing session type from props:', sessionType)
      setLocalSessionType(sessionType)
    }
  }, [sessionType]) // Removed localSessionType from dependency to prevent loops

  // Convert time object to total seconds
  const timeToSeconds = (h: number, m: number, s: number) => h * 3600 + m * 60 + s

  // Convert seconds to time object
  const secondsToTime = (seconds: number) => ({
    hours: Math.floor(seconds / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60
  })

  // Update total seconds when time changes
  useEffect(() => {
    if (!isTimerRunning) {
      const newTotal = timeToSeconds(time.hours, time.minutes, time.seconds)
      setTotalSeconds(newTotal)
      setInitialSeconds(newTotal)
      if (onTimerSet && newTotal !== initialDuration && isHost) {
        onTimerSet(newTotal)
      }
    }
  }, [time, isTimerRunning, onTimerSet, initialDuration, isHost])

  // Sync with external duration changes
  useEffect(() => {
    if (!isHost || !isTimerRunning) {
      const newTime = secondsToTime(initialDuration)
      
      if (isHost && !isTimerRunning) {
        if (initialDuration === 25 * 60) {
          setTime(newTime)
          setTotalSeconds(initialDuration)
          setInitialSeconds(initialDuration)
          setOriginalDuration(initialDuration)
        } else {
          setTotalSeconds(initialDuration)
          setInitialSeconds(initialDuration)
        }
      } else {
        setTime(newTime)
        setTotalSeconds(initialDuration)
        setInitialSeconds(initialDuration)
        
        if (!isTimerRunning) {
          setOriginalDuration(initialDuration)
        }
      }
    }
  }, [initialDuration, isTimerRunning, isHost])

  // Sync original duration from props
  useEffect(() => {
    if (propOriginalDuration && propOriginalDuration !== originalDuration) {
      setOriginalDuration(propOriginalDuration)
    }
  }, [propOriginalDuration, originalDuration])

  // Timer countdown logic
  useEffect(() => {
    if (isTimerRunning && originalDuration > 0) {
      const updateTimer = () => {
        let actualStartTime: number;
        
        if (startTime) {
          actualStartTime = startTime
        } else if (typeof window !== "undefined") {
          try {
            const roomCode = window.location.pathname.split('/')[2]
            const saved = localStorage.getItem(`timer_${roomCode}`)
            if (saved) {
              const timerData = JSON.parse(saved)
              if (timerData.startTime) {
                actualStartTime = timerData.startTime
              } else {
                actualStartTime = Date.now() - ((originalDuration - totalSeconds) * 1000)
              }
            } else {
              actualStartTime = Date.now() - ((originalDuration - totalSeconds) * 1000)
            }
          } catch (e) {
            actualStartTime = Date.now() - ((originalDuration - totalSeconds) * 1000)
          }
        } else {
          actualStartTime = Date.now() - ((originalDuration - totalSeconds) * 1000)
        }
        
        const elapsed = Math.floor((Date.now() - actualStartTime) / 1000)
        const remaining = Math.max(0, originalDuration - elapsed)
        
        if (Math.abs(remaining - totalSeconds) >= 1) {
          setTotalSeconds(remaining)
        }
        
        if (remaining <= 0) {
          // Timer has finished - play notification sound
          playNotificationSound()
          
          // Log the session time
          const completedMinutes = Math.round(originalDuration / 60)
          const completedSessionType = localSessionType || 'practice'
          
          // Call API to log the completed session
          handleTimerCompletion(completedSessionType, completedMinutes)
          
          onTimerStateChange?.(false)
          return
        }
      }

      updateTimer()
      intervalRef.current = setInterval(updateTimer, 100)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isTimerRunning, originalDuration, totalSeconds, onTimerStateChange, startTime, localSessionType])

  const handleStart = () => {
    if (totalSeconds > 0) {
      onTimerStateChange?.(true)
    }
  }

  const handleStop = () => {
    onTimerStateChange?.(false)
    setTotalSeconds(initialSeconds)
  }

  const handleTimeChange = (type: 'hours' | 'minutes' | 'seconds', increment: boolean) => {
    if (isTimerRunning || !isHost) return

    setTime(prev => {
      const newTime = { ...prev }
      const change = increment ? 1 : -1

      switch (type) {
        case 'hours':
          newTime.hours = Math.max(0, Math.min(23, prev.hours + change))
          newTime.seconds = 0 // Reset seconds when changing hours
          break
        case 'minutes':
          newTime.minutes = Math.max(0, Math.min(59, prev.minutes + change))
          newTime.seconds = 0 // Reset seconds when changing minutes
          break
        case 'seconds':
          newTime.seconds = Math.max(0, Math.min(59, prev.seconds + change))
          break
      }
      return newTime
    })
  }

  const handleSessionTypeChange = (type: 'practice' | 'learn') => {
    console.log('Changing session type to:', type)
    setLocalSessionType(type)
    onSessionTypeChange?.(type)
  }

  // Function to send timer completion data to API
  const handleTimerCompletion = async (completedSessionType: 'practice' | 'learn', durationMinutes: number) => {
    try {
      if (onTimerComplete) {
        await onTimerComplete(completedSessionType, durationMinutes)
      }
      
      // Default API call if no callback provided
      const response = await fetch(getApiUrl('api/v1/squadgames/rooms/set-session-time'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || ''}`,
        },
        body: JSON.stringify({
          type: completedSessionType,
          studyMinutes : completedSessionType === 'learn' ? durationMinutes : 0,
          practiceMinutes : completedSessionType === 'practice' ? durationMinutes : 0,
          studySession :completedSessionType === 'practice' ? false : true,
          roomJoinCode: roomJoinCode || ''
        }),
      })

      if (!response.ok) {
        console.warn('Failed to log study time:', response.statusText)
      } else {
        console.log(`✅ Successfully logged ${durationMinutes} minutes of ${completedSessionType} time`)
      }
    } catch (error) {
      console.error('Error logging study time:', error)
    }
  }

  const currentTime = secondsToTime(totalSeconds)
  const progress = isTimerRunning && originalDuration > 0 ? ((originalDuration - totalSeconds) / originalDuration) * 100 : 0

  // Debug log
  console.log('Current session type state:', { sessionType, localSessionType, isHost, isTimerRunning })

  // Preset time options
  const presets = [
    { label: "5m", seconds: 5 * 60 },
    { label: "10m", seconds: 10 * 60 },
    { label: "15m", seconds: 15 * 60 },
    { label: "25m", seconds: 25 * 60 },
    { label: "30m", seconds: 30 * 60 },
    { label: "45m", seconds: 45 * 60 },
    { label: "1h", seconds: 60 * 60 },
  ]

  const setPreset = (seconds: number) => {
    if (isTimerRunning || !isHost) return
    const timeObj = secondsToTime(seconds)
    // Reset seconds to 0 for cleaner display
    timeObj.seconds = 0
    setTime(timeObj)
    if (onTimerSet) {
      onTimerSet(seconds)
    }
  }

  return (
    <Card className="w-full border-0 bg-white rounded-3xl overflow-hidden">
      <CardHeader className="text-center bg-purple-50 pb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-10 w-10 rounded-2xl bg-purple-500 flex items-center justify-center">
            <TimerIcon className="h-5 w-5 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-purple-600">Study Timer</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Timer Display */}
        <div className="text-center">
          {/* Circular Progress Ring */}
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="rgba(139, 92, 246, 0.1)"
                strokeWidth="8"
                fill="none"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                stroke="#8b5cf6"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - progress / 100) }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            
            {/* Time Display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-purple-600">
                  {currentTime.hours > 0 ? (
                    `${String(currentTime.hours).padStart(2, '0')}:${String(currentTime.minutes).padStart(2, '0')}:${String(currentTime.seconds).padStart(2, '0')}`
                  ) : (
                    `${String(currentTime.minutes).padStart(2, '0')}:${String(currentTime.seconds).padStart(2, '0')}`
                  )}
                </div>
                <div className="text-xs text-purple-500 mt-1">
                  {isTimerRunning ? 'Running' : 'Ready'}
                </div>
              </div>
            </div>
          </div>
        </div>

        

        {/* Description Display */}
        {description && (
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-purple-600 text-sm font-medium mb-1">Session Goals</div>
            <div className="text-purple-700 text-sm">{description}</div>
          </div>
        )}

        {/* Session Type Selection for Host */}
        {!isTimerRunning && isHost && (
          <div className="space-y-2">
            <label className="text-purple-600 text-sm font-medium">Session Type</label>
            <div className="text-xs text-gray-500 mb-1">Current: {localSessionType}</div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('Practice button clicked')
                  handleSessionTypeChange('practice')
                }}
                className={`flex-1 h-9 transition-all duration-200 ${
                  localSessionType === 'practice'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <span className="mr-1.5 text-sm">🎯</span>
                <span className="text-sm">Practice</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('Learn button clicked')
                  handleSessionTypeChange('learn')
                }}
                className={`flex-1 h-9 transition-all duration-200 ${
                  localSessionType === 'learn'
                    ? 'bg-green-50 text-green-700 border border-green-200 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <span className="mr-1.5 text-sm">📚</span>
                <span className="text-sm">Learn</span>
              </Button>
            </div>
          </div>
        )}

        {/* Description Input for Host */}
        {!isTimerRunning && isHost && (
          <div className="space-y-2">
            <label className="text-purple-600 text-sm font-medium">Add Description (Optional)</label>
            <Textarea
              value={description}
              onChange={(e) => onDescriptionSet?.(e.target.value)}
              placeholder="Add goals for this timer session..."
              className="resize-none text-sm"
              rows={2}
              maxLength={150}
            />
            <div className="text-xs text-gray-500 text-right">
              {description.length}/150
            </div>
          </div>
        )}

        {/* Time Controls (only shown when not running and user is host) */}
        {!isTimerRunning && isHost && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-6">
              {/* Hours */}
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Hours</div>
                <div className="flex flex-col items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTimeChange('hours', true)}
                    className="text-purple-600 hover:bg-purple-50 h-6 w-8 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <div className="text-purple-600 text-lg font-mono w-8 text-center">
                    {String(time.hours).padStart(2, '0')}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTimeChange('hours', false)}
                    className="text-purple-600 hover:bg-purple-50 h-6 w-8 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Minutes */}
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Minutes</div>
                <div className="flex flex-col items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTimeChange('minutes', true)}
                    className="text-purple-600 hover:bg-purple-50 h-6 w-8 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <div className="text-purple-600 text-lg font-mono w-8 text-center">
                    {String(time.minutes).padStart(2, '0')}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTimeChange('minutes', false)}
                    className="text-purple-600 hover:bg-purple-50 h-6 w-8 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Preset Buttons */}
            <div className="flex flex-wrap justify-center gap-1">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setPreset(preset.seconds)}
                  className="text-xs h-7 px-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex justify-center gap-2">
          {!isTimerRunning ? (
            <Button
              onClick={handleStart}
              disabled={totalSeconds === 0 || !isHost}
              className="bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
            >
              <Play className="h-4 w-4 mr-2" />
              {isHost ? "Start" : "Host Only"}
            </Button>
          ) : (
            <>
              {isHost && (
                <Button
                  onClick={handleStop}
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              )}
            </>
          )}
        </div>

        {/* Non-host viewing message */}
        {!isHost && !isTimerRunning && (
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-blue-600 text-sm font-medium">👁️ View Only</div>
            <div className="text-blue-500 text-xs mt-1">Host controls the timer</div>
          </div>
        )}

        {/* Timer finished notification */}
        {totalSeconds === 0 && initialSeconds > 0 && (
          <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
            <div className="text-green-600 text-sm font-bold mb-2">🎉 Session Complete!</div>
            <div className="text-green-700 text-xs mb-1">
              {Math.round(originalDuration / 60)} minutes of {localSessionType} time logged
            </div>
            
          </div>
        )}
      </CardContent>
    </Card>
  )
}
