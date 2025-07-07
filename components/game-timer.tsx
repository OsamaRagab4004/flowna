import { Progress } from "@/components/ui/progress"

interface GameTimerProps {
  timeLeft: number
  maxTime: number
}

export default function GameTimer({ timeLeft, maxTime }: GameTimerProps) {
  const percentage = (timeLeft / maxTime) * 100

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Determine color based on time left
  const getTimeColor = () => {
    if (timeLeft < 60) return "text-red-300" // Less than 1 minute - bright red
    if (timeLeft < 300) return "text-yellow-300" // Less than 5 minutes - bright yellow
    return "text-green-300" // Normal - bright green
  }

  const getProgressColor = () => {
    if (timeLeft < 60) return "bg-red-500" // Less than 1 minute - bright red
    if (timeLeft < 300) return "bg-yellow-500" // Less than 5 minutes - bright yellow
    return "bg-green-500" // Normal - bright green
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-white/90 font-medium">Time Remaining</span>
        <span className={`font-bold text-xl ${getTimeColor()}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      <div className="relative">
        <div className="w-full bg-gray-700/80 rounded-full h-4 overflow-hidden border border-white/20">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out ${getProgressColor()} shadow-lg`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Subtle glow effect for better visibility */}
        <div 
          className={`absolute top-0 h-4 rounded-full transition-all duration-1000 ease-out opacity-30 ${getProgressColor()} blur-sm`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
