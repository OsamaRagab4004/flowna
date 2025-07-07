"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plus, Minus, Check } from "lucide-react"

interface MCQQuestionEditorProps {
  question: string
  options: string[]
  correctOption: number
  onQuestionChange: (value: string) => void
  onOptionsChange: (options: string[]) => void
  onCorrectOptionChange: (index: number) => void
  disabled?: boolean
}

export default function MCQQuestionEditor({
  question,
  options,
  correctOption,
  onQuestionChange,
  onOptionsChange,
  onCorrectOptionChange,
  disabled = false,
}: MCQQuestionEditorProps) {
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    onOptionsChange(newOptions)
  }

  const addOption = () => {
    if (options.length < 5) {
      onOptionsChange([...options, ""])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options]
      newOptions.splice(index, 1)
      onOptionsChange(newOptions)

      // Adjust correct option if needed
      if (correctOption === index) {
        onCorrectOptionChange(0)
      } else if (correctOption > index) {
        onCorrectOptionChange(correctOption - 1)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="font-medium">Question:</label>
        <Textarea
          placeholder="Enter your multiple choice question..."
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          className="min-h-[80px]"
          disabled={disabled}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-medium">Options:</label>
          {!disabled && options.length < 5 && (
            <Button variant="outline" size="sm" onClick={addOption} className="flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Option
            </Button>
          )}
        </div>

        <RadioGroup
          value={correctOption.toString()}
          onValueChange={(value) => onCorrectOptionChange(Number.parseInt(value))}
        >
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <RadioGroupItem value={index.toString()} id={`option-${index}`} disabled={disabled} />
              <div className="flex-1">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="flex-1"
                  disabled={disabled}
                />
              </div>
              {!disabled && options.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                  className="h-8 w-8 text-muted-foreground"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </RadioGroup>

        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
          <Check className="h-4 w-4 text-green-500" />
          Select the correct answer above
        </div>
      </div>
    </div>
  )
}
