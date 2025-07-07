"use client"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Check, X } from "lucide-react"

interface TFQuestionEditorProps {
  statement: string
  isTrue: boolean
  onStatementChange: (value: string) => void
  onIsTrueChange: (value: boolean) => void
  disabled?: boolean
}

export default function TFQuestionEditor({
  statement,
  isTrue,
  onStatementChange,
  onIsTrueChange,
  disabled = false,
}: TFQuestionEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="font-medium">Statement:</label>
        <Textarea
          placeholder="Enter a statement that is either true or false..."
          value={statement}
          onChange={(e) => onStatementChange(e.target.value)}
          className="min-h-[80px]"
          disabled={disabled}
        />
      </div>

      <div className="space-y-3">
        <label className="font-medium">Correct Answer:</label>
        <RadioGroup value={isTrue ? "true" : "false"} onValueChange={(v) => onIsTrueChange(v === "true")}>
          <div className="flex items-center space-x-2 mb-2">
            <RadioGroupItem value="true" id="true" disabled={disabled} />
            <Label htmlFor="true" className="flex items-center gap-2 text-green-600 dark:text-green-400 cursor-pointer">
              <Check className="h-4 w-4" /> True (The statement is correct)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="false" id="false" disabled={disabled} />
            <Label htmlFor="false" className="flex items-center gap-2 text-red-600 dark:text-red-400 cursor-pointer">
              <X className="h-4 w-4" /> False (The statement is incorrect)
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  )
}
