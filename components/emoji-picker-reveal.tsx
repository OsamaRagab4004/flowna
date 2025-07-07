"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩"],
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💪", "🧠"],
  },
  {
    name: "Study",
    emojis: ["📚", "📝", "✏️", "📖", "🔍", "💡", "🧮", "🔬", "🔭", "📊", "📈", "📉", "🧪", "🎓", "👨‍🎓", "👩‍🎓"],
  },
  {
    name: "Reactions",
    emojis: ["👀", "💯", "🎉", "🎊", "💥", "✨", "💫", "💤", "❓", "❗", "‼️", "⁉️", "🔴", "🟠", "🟡", "🟢"],
  },
]

interface EmojiPickerRevealProps {
  onEmojiSelect: (emoji: string) => void
  onClose: () => void
}

export default function EmojiPickerReveal({ onEmojiSelect, onClose }: EmojiPickerRevealProps) {
  const [activeCategory, setActiveCategory] = useState(0)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-10"
    >
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {EMOJI_CATEGORIES.map((category, index) => (
          <button
            key={category.name}
            className={`flex-1 p-2 text-xs font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
              activeCategory === index ? "bg-gray-100 dark:bg-gray-700" : ""
            }`}
            onClick={() => setActiveCategory(index)}
          >
            {category.name}
          </button>
        ))}
      </div>
      <div className="p-2 overflow-y-auto" style={{ maxHeight: "200px" }}>
        <div className="grid grid-cols-8 gap-1 sm:gap-2">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => {
                onEmojiSelect(emoji)
                onClose()
              }}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
