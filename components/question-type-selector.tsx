"use client"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, ListChecks, Edit3, CheckSquare } from "lucide-react"

interface QuestionTypeSelectorProps {
  selectedType: "text" | "mcq" | "cw" | "tf"
  onTypeChange: (type: "text" | "mcq" | "cw" | "tf") => void
}

export default function QuestionTypeSelector({ selectedType, onTypeChange }: QuestionTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Question Type:</label>
      <Tabs
        value={selectedType}
        onValueChange={(value) => onTypeChange(value as "text" | "mcq" | "cw" | "tf")}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="text" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Text</span>
          </TabsTrigger>
          <TabsTrigger value="mcq" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            <span>MCQ</span>
          </TabsTrigger>
          <TabsTrigger value="cw" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            <span>Fill Blanks</span>
          </TabsTrigger>
          <TabsTrigger value="tf" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span>True/False</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="text-xs text-muted-foreground">
        {selectedType === "text" && "Open-ended question with a free-form answer"}
        {selectedType === "mcq" && "Multiple choice question with predefined options"}
        {selectedType === "cw" && "Fill-in-the-blank question with specific answers"}
        {selectedType === "tf" && "True/False statement that is either correct or incorrect"}
      </div>
    </div>
  )
}
