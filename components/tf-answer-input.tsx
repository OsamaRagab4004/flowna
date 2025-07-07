"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Check, X } from "lucide-react"

interface TFAnswerInputProps {
  selectedValue: boolean | undefined
  onValueSelect: (value: boolean) => void
  disabled?: boolean
}

export default function TFAnswerInput({ selectedValue, onValueSelect, disabled = false }: TFAnswerInputProps) {
  return (
    <div className="space-y-4">
      <RadioGroup
        value={selectedValue !== undefined ? (selectedValue ? "true" : "false") : undefined}
        onValueChange={(value) => onValueSelect(value === "true")}
        className="space-y-3"
      >
        <div className="flex items-start space-x-2 p-3 rounded-md bg-green-50 dark:bg-green-900/20">
          <RadioGroupItem value="true" id="answer-true" disabled={disabled} />
          <Label
            htmlFor="answer-true"
            className="flex items-center gap-2 text-green-600 dark:text-green-400 cursor-pointer font-medium"
          >
            <Check className="h-5 w-5" /> True (The statement is correct)
          </Label>
        </div>
        <div className="flex items-start space-x-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20">
          <RadioGroupItem value="false" id="answer-false" disabled={disabled} />
          <Label
            htmlFor="answer-false"
            className="flex items-center gap-2 text-red-600 dark:text-red-400 cursor-pointer font-medium"
          >
            <X className="h-5 w-5" /> False (The statement is incorrect)
          </Label>
        </div>
      </RadioGroup>
    </div>
  )
}
