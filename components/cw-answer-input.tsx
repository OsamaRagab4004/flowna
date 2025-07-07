"use client"

import { Input } from "@/components/ui/input"

interface CWAnswerInputProps {
  question: string
  blanks: string[]
  filledBlanks: string[]
  onBlankFill: (index: number, value: string) => void
  disabled?: boolean
}

export default function CWAnswerInput({
  question,
  blanks,
  filledBlanks,
  onBlankFill,
  disabled = false,
}: CWAnswerInputProps) {
  // Split the question by blanks (underscores)
  const parts = question.split("_____")

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {parts.map((part, index) => (
          <div key={index}>
            {/* Display the text part */}
            {part && <span className="text-base">{part}</span>}

            {/* Display input for blank (except after the last part) */}
            {index < parts.length - 1 && (
              <Input
                value={filledBlanks[index] || ""}
                onChange={(e) => onBlankFill(index, e.target.value)}
                className="inline-block w-32 mx-1"
                placeholder="..."
                disabled={disabled}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
