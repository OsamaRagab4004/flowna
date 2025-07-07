"use client"

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X, Play, RotateCcw, Plus, Minus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// Memoized snowflake component for better performance
const Snowflake = memo(({ index }: { index: number }) => (
  <motion.div
    key={`timer-snow-${index}`}
    className="absolute w-1 h-1 bg-white/20 rounded-full"
    initial={{ 
      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
      y: -10,
      opacity: 0
    }}
    animate={{
      y: [0, (typeof window !== 'undefined' ? window.innerHeight : 1080) + 10],
      x: [
        Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
        Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920) + (Math.sin(index) * 30),
      ],
      opacity: [0, 0.6, 0]
    }}
    transition={{
      duration: 6 + Math.random() * 4,
      repeat: Infinity,
      ease: "linear",
      delay: Math.random() * 6
    }}
  />
))

Snowflake.displayName = 'Snowflake'

// Memoized timer display component
const TimerDisplay = memo(({ currentTime, isTimerRunning, progress }: {
  currentTime: { hours: number; minutes: number; seconds: number }
  isTimerRunning: boolean
  progress: number
}) => {
  const circumference = useMemo(() => 2 * Math.PI * 45, [])
  const strokeDashoffset = useMemo(() => circumference * (1 - progress / 100), [circumference, progress])
  
  return (
    <div className="relative w-96 h-96 mx-auto mb-8">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="45"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8" fill="none"
        />
        <motion.circle
          cx="50" cy="50" r="45"
          stroke="url(#gradient)"
          strokeWidth="8" fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5 }}
        />
        <defs>
          <linearGradient id="gradient">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-6xl font-mono font-bold tracking-wider">
            {String(currentTime.hours).padStart(2, '0')}:
            {String(currentTime.minutes).padStart(2, '0')}:
            {String(currentTime.seconds).padStart(2, '0')}
          </div>
          <div className="text-lg text-white/70 mt-2 font-medium">
            {isTimerRunning ? 'Running' : 'Ready'}
          </div>
        </div>
      </div>
    </div>
  )
})

TimerDisplay.displayName = 'TimerDisplay'

// Memoized time control component
const TimeControl = memo(({ 
  label, 
  value, 
  onIncrement, 
  onDecrement 
}: {
  label: string
  value: number
  onIncrement: () => void
  onDecrement: () => void
}) => (
  <div className="text-center">
    <div className="text-white/70 text-sm mb-2">{label}</div>
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onIncrement}
        className="text-white hover:bg-white/20 h-8 w-8 bg-white/10 backdrop-blur-sm"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <div className="text-white text-2xl font-mono w-16 text-center">
        {String(value).padStart(2, '0')}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDecrement}
        className="text-white hover:bg-white/20 h-8 w-8 bg-white/10 backdrop-blur-sm"
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  </div>
))

TimeControl.displayName = 'TimeControl'

interface FullScreenTimerProps {
  isOpen: boolean
  onClose: () => void
  isHost?: boolean
  initialDuration?: number
  onTimerSet?: (duration: number) => void
  description?: string
  onDescriptionSet?: (description: string) => void
  isTimerRunning?: boolean
  onTimerStateChange?: (isRunning: boolean) => void
  startTime?: number // Add startTime to props
  originalDuration?: number // Add original duration for progress calculation
}

export default memo(function FullScreenTimer({ 
  isOpen, 
  onClose, 
  isHost = false, 
  initialDuration = 25 * 60, 
  onTimerSet,
  description = "",
  onDescriptionSet,
  isTimerRunning = false,
  onTimerStateChange,
  originalDuration: propOriginalDuration,
  startTime
}: FullScreenTimerProps) {const [time, setTime] = useState(() => {
    const hours = Math.floor(initialDuration / 3600)
    const minutes = Math.floor((initialDuration % 3600) / 60)
    const seconds = initialDuration % 60
    return { hours, minutes, seconds }
  })
  const [totalSeconds, setTotalSeconds] = useState(initialDuration)
  const [initialSeconds, setInitialSeconds] = useState(initialDuration)
  const [originalDuration, setOriginalDuration] = useState(() => {
    // Initialize with prop value or fallback to initial duration
    return propOriginalDuration || initialDuration
  }) // Track original timer duration for progress calculation
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Convert time object to total seconds - memoized
  const timeToSeconds = useCallback((h: number, m: number, s: number) => h * 3600 + m * 60 + s, [])

  // Convert seconds to time object - memoized
  const secondsToTime = useCallback((seconds: number) => ({
    hours: Math.floor(seconds / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60
  }), [])
  // Update total seconds when time changes
  useEffect(() => {
    if (!isTimerRunning) {
      const newTotal = timeToSeconds(time.hours, time.minutes, time.seconds)
      setTotalSeconds(newTotal)
      setInitialSeconds(newTotal)
      // Only notify parent if this is a manual change by host, not a sync operation
      if (onTimerSet && newTotal !== initialDuration && isHost && process.env.NODE_ENV === 'development') {
        console.log("🔄 [TIMER_CHANGE] Host manually changed timer, notifying parent:", newTotal)
      }
      if (onTimerSet && newTotal !== initialDuration && isHost) {
        onTimerSet(newTotal)
      }
    }
  }, [time, isTimerRunning, onTimerSet, initialDuration, isHost])  // Sync with external duration changes (from server updates or localStorage)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("🔄 [TIMER_SYNC] Initial duration changed:", initialDuration, "isHost:", isHost, "isTimerRunning:", isTimerRunning)
    }
    
    // For non-host users, always sync with server data even if timer is running
    // For host users, only sync when timer is not running to avoid overriding their settings
    if (!isHost || !isTimerRunning) {
      const newTime = secondsToTime(initialDuration)
      
      // For host users, only update internal timer state, don't update time controls
      if (isHost && !isTimerRunning) {
        // Host: only update if it's a reset (25 minutes) to avoid interfering with manual changes
        if (initialDuration === 25 * 60) {
          setTime(newTime)
          setTotalSeconds(initialDuration)
          setInitialSeconds(initialDuration)
          setOriginalDuration(initialDuration)
          if (process.env.NODE_ENV === 'development') {
            console.log("✅ [TIMER_SYNC] Host timer reset to default:", initialDuration)
          }
        } else {
          // Don't update time controls for host, just internal state
          setTotalSeconds(initialDuration)
          setInitialSeconds(initialDuration)
          if (process.env.NODE_ENV === 'development') {
            console.log("✅ [TIMER_SYNC] Host internal state synced, controls unchanged")
          }
        }
      } else {
        // Non-host: full sync
        setTime(newTime)
        setTotalSeconds(initialDuration)
        setInitialSeconds(initialDuration)
        
        if (!isTimerRunning) {
          setOriginalDuration(initialDuration)
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log("✅ [TIMER_SYNC] Non-host timer synced with new duration:", {
            duration: initialDuration,
            time: newTime,
            isHost,
            isTimerRunning
          })
        }
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log("⏭️ [TIMER_SYNC] Skipping sync - host has timer running")
    }
  }, [initialDuration, isTimerRunning, isHost, secondsToTime])

  // Sync original duration from props when it changes
  useEffect(() => {
    if (propOriginalDuration && propOriginalDuration !== originalDuration) {
      if (process.env.NODE_ENV === 'development') {
        console.log("🔄 [ORIGINAL_DURATION_SYNC] Updating original duration from props:", propOriginalDuration)
      }
      setOriginalDuration(propOriginalDuration)
    }
  }, [propOriginalDuration, originalDuration])  // Timer countdown logic using real-time calculation with server sync
  useEffect(() => {
    if (isTimerRunning && originalDuration > 0) {
      const updateTimer = () => {
        let actualStartTime: number;
        
        // Use the provided startTime prop if available, otherwise try localStorage
        if (startTime) {
          actualStartTime = startTime
        } else if (typeof window !== "undefined") {
          try {
            // This is a hack - we need the roomCode here. Let's extract it from the current URL
            const roomCode = window.location.pathname.split('/')[2] // /lobby/{roomCode}
            const saved = localStorage.getItem(`timer_${roomCode}`)
            if (saved) {
              const timerData = JSON.parse(saved)
              if (timerData.startTime) {
                actualStartTime = timerData.startTime
              } else {
                // Fallback: calculate from current state
                actualStartTime = Date.now() - ((originalDuration - totalSeconds) * 1000)
              }
            } else {
              // Fallback: calculate from current state
              actualStartTime = Date.now() - ((originalDuration - totalSeconds) * 1000)
            }
          } catch (e) {
            // Fallback: calculate from current state
            actualStartTime = Date.now() - ((originalDuration - totalSeconds) * 1000)
          }
        } else {
          // Fallback: calculate from current state
          actualStartTime = Date.now() - ((originalDuration - totalSeconds) * 1000)
        }
        
        const elapsed = Math.floor((Date.now() - actualStartTime) / 1000)
        const remaining = Math.max(0, originalDuration - elapsed)
        
        // Only update if there's a difference to avoid unnecessary re-renders
        if (Math.abs(remaining - totalSeconds) >= 1) {
          setTotalSeconds(remaining)
        }
        
        if (remaining <= 0) {
          onTimerStateChange?.(false)
          return
        }
      }

      // Update immediately
      updateTimer()
      
      // Set interval to update every 100ms for smooth countdown
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
  }, [isTimerRunning, originalDuration, totalSeconds, onTimerStateChange, startTime])

  const handleStart = useCallback(() => {
    if (totalSeconds > 0) {
      onTimerStateChange?.(true)
    }
  }, [totalSeconds, onTimerStateChange])

  const handleStop = useCallback(() => {
    onTimerStateChange?.(false)
    setTotalSeconds(initialSeconds)
  }, [onTimerStateChange, initialSeconds])

  const handleTimeChange = useCallback((type: 'hours' | 'minutes' | 'seconds', increment: boolean) => {
    if (isTimerRunning || !isHost) return // Don't allow changes while running or if not host

    setTime(prev => {
      const newTime = { ...prev }
      const change = increment ? 1 : -1

      switch (type) {
        case 'hours':
          newTime.hours = Math.max(0, Math.min(23, prev.hours + change))
          break
        case 'minutes':
          newTime.minutes = Math.max(0, Math.min(59, prev.minutes + change))
          break
        case 'seconds':
          newTime.seconds = Math.max(0, Math.min(59, prev.seconds + change))
          break
      }
      return newTime
    })
  }, [isTimerRunning, isHost])

  // Memoize expensive calculations
  const currentTime = useMemo(() => secondsToTime(totalSeconds), [totalSeconds, secondsToTime])
  const progress = useMemo(() => 
    originalDuration > 0 ? ((originalDuration - totalSeconds) / originalDuration) * 100 : 0,
    [originalDuration, totalSeconds]
  )

  // Preset time options - memoized since they never change
  const presets = useMemo(() => [
    { label: "5 min", seconds: 5 * 60 },
    { label: "10 min", seconds: 10 * 60 },
    { label: "15 min", seconds: 15 * 60 },
    { label: "25 min", seconds: 25 * 60 },
    { label: "25 min", seconds: 25 * 60 },
    { label: "45 min", seconds: 45 * 60 },
    { label: "1 hour", seconds: 60 * 60 },
  ], [])

  const setPreset = useCallback((seconds: number) => {
    if (isTimerRunning || !isHost) return // Don't allow changes if not host
    const timeObj = secondsToTime(seconds)
    setTime(timeObj)
    // Notify parent component of the timer duration change
    if (onTimerSet) {
      onTimerSet(seconds)
    }
  }, [isTimerRunning, isHost, secondsToTime, onTimerSet])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center"
      >
        {/* Winter Animation Background - Optimized */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Reduced snowflakes for better performance */}
          {[...Array(15)].map((_, i) => (
            <Snowflake key={i} index={i} />
          ))}
        </div>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-6 right-6 h-12 w-12 text-white hover:bg-white/20 z-10 bg-white/10 backdrop-blur-sm"
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Main Timer Content */}
        <div className="relative z-10 text-center">
          {/* Timer Display */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <TimerDisplay 
              currentTime={currentTime} 
              isTimerRunning={isTimerRunning} 
              progress={progress} 
            />
          </motion.div>

          {/* Description Display */}
          {description && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-6 max-w-md mx-auto"
            >
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
                <div className="text-white/70 text-sm mb-2 font-medium">Session Goals</div>
                <div className="text-white text-base leading-relaxed">{description}</div>
              </div>
            </motion.div>
          )}

          {/* Description Input for Host (only shown when not running and user is host) */}
          {!isTimerRunning && isHost && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mb-6 max-w-md mx-auto"
            >
              <div className="text-white/70 text-sm mb-2 font-medium">Add Description (Optional)</div>
              <Textarea
                value={description}
                onChange={(e) => onDescriptionSet?.(e.target.value)}
                placeholder="Add a description for this timer session..."
                className="bg-white/10 backdrop-blur-sm border-white/30 text-white placeholder:text-white/50 focus:border-white/50 focus:ring-white/20 resize-none"
                rows={3}
                maxLength={200}
              />
              <div className="text-white/50 text-xs mt-1 text-right">
                {description.length}/200 characters
              </div>
            </motion.div>
          )}

          {/* Time Controls (only shown when not running and user is host) */}
          {!isTimerRunning && isHost && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <div className="flex items-center justify-center gap-8 mb-6">
                <TimeControl
                  label="Hours"
                  value={time.hours}
                  onIncrement={() => handleTimeChange('hours', true)}
                  onDecrement={() => handleTimeChange('hours', false)}
                />
                <TimeControl
                  label="Minutes"
                  value={time.minutes}
                  onIncrement={() => handleTimeChange('minutes', true)}
                  onDecrement={() => handleTimeChange('minutes', false)}
                />
                <TimeControl
                  label="Seconds"
                  value={time.seconds}
                  onIncrement={() => handleTimeChange('seconds', true)}
                  onDecrement={() => handleTimeChange('seconds', false)}
                />
              </div>

              {/* Preset Buttons */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setPreset(preset.seconds)}
                    className="text-white border-white/30 hover:bg-white/20 hover:border-white/50 bg-white/10 backdrop-blur-sm"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Control Buttons */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-4"
          >
            {!isTimerRunning ? (
              <Button
                onClick={handleStart}
                disabled={totalSeconds === 0 || !isHost}
                className="h-14 px-8 bg-green-600/80 hover:bg-green-700/80 text-white text-lg font-medium backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="h-6 w-6 mr-2" />
                {isHost ? "Start Timer" : "Timer (Host Only)"}
              </Button>
            ) : (
              <>
                {isHost && (
                  <Button
                    onClick={handleStop}
                    variant="outline"
                    className="h-14 px-8 text-white border-white/30 hover:bg-white/20 hover:border-white/50 text-lg font-medium bg-red-600/20 backdrop-blur-sm"
                  >
                    <RotateCcw className="h-6 w-6 mr-2" />
                    Stop Timer
                  </Button>
                )}
              </>
            )}
          </motion.div>

          {/* Non-host viewing message */}
          {!isHost && !isTimerRunning && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg"
            >
              <div className="text-blue-400 text-lg font-medium">👁️ View Only</div>
              <div className="text-white/70 mt-1">Only the host can start and control the timer</div>
            </motion.div>
          )}

          {/* Timer finished notification */}
          {totalSeconds === 0 && initialSeconds > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-8 p-4 bg-green-600/20 border border-green-500/30 rounded-lg"
            >
              <div className="text-green-400 text-xl font-bold">🎉 Time's Up!</div>
              <div className="text-white/70 mt-1">Your timer has finished</div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
})
