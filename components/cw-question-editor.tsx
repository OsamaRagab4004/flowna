"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CWQuestionEditorProps {
  question: string
  blanks: string[]
  correctAnswer: string
  onQuestionChange: (value: string) => void
  onBlanksChange: (blanks: string[]) => void
  onCorrectAnswerChange: (value: string) => void
  disabled?: boolean
}

export default function CWQuestionEditor({
  question,
  blanks,
  correctAnswer,
  onQuestionChange,
  onBlanksChange,
  onCorrectAnswerChange,
  disabled = false,
}: CWQuestionEditorProps) {
  const [showHelp, setShowHelp] = useState(false)

  const handleBlankChange = (index: number, value: string) => {
    const newBlanks = [...blanks]
    newBlanks[index] = value
    onBlanksChange(newBlanks)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="font-medium">Question with Blanks:</label>
          <Button variant="ghost" size="sm" onClick={() => setShowHelp(!showHelp)}>
            {showHelp ? "Hide Help" : "Show Help"}
          </Button>
        </div>

        {showHelp && (
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertDescription>
              Use underscores (_____) to indicate blanks in your question. Example: "The capital of France is _____."
            </AlertDescription>
          </Alert>
        )}

        <Textarea
          placeholder="Enter your question with blanks using underscores (_____)..."
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          className="min-h-[80px]"
          disabled={disabled}
        />
      </div>

      <div className="space-y-3">
        <label className="font-medium">Correct Answer (Complete):</label>
        <Textarea
          placeholder="Enter the complete correct answer..."
          value={correctAnswer}
          onChange={(e) => onCorrectAnswerChange(e.target.value)}
          className="min-h-[80px]"
          disabled={disabled}
        />
      </div>

      <div className="space-y-3">
        <label className="font-medium">Answers for Each Blank:</label>
        {blanks.map((blank, index) => (
          <div key={index} className="space-y-1">
            <label className="text-sm text-muted-foreground">Blank {index + 1}:</label>
            <Input
              placeholder={`Answer for blank ${index + 1}`}
              value={blank}
              onChange={(e) => handleBlankChange(index, e.target.value)}
              disabled={disabled}
            />
          </div>
        ))}

        {blanks.length === 0 && (
          <div className="text-sm text-muted-foreground italic">
            Add underscores (_____) in your question to create blanks
          </div>
        )}
      </div>
    </div>
  )
}
