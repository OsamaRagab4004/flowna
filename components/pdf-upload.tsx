"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Upload, X, CheckCircle, Brain, Target, Zap, FileText } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface QuestionSettings {
  types: string[]
  difficulties: string[]
  questionCount: number
}

interface PDFUploadProps {
  onFileUpload: (file: File, settings: QuestionSettings) => void
  uploadedFile: File | null
  onRemoveFile: () => void
  isGenerating: boolean
  questionsGenerated: boolean
}

export default function PDFUpload({
  onFileUpload,
  uploadedFile,
  onRemoveFile,
  isGenerating,
  questionsGenerated,
}: PDFUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["mcq"])
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(["intermediate"])
  const [questionCount, setQuestionCount] = useState([15])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const questionTypes = [
    { id: "mcq", label: "Multiple Choice (MCQ)", description: "4-option questions with one correct answer" },
    { id: "tf", label: "True/False", description: "Statement-based questions" },
    { id: "cw", label: "Fill in the Blanks", description: "Complete the missing parts" },
  ]

  const difficultyLevels = [
    {
      id: "basic",
      label: "Basic",
      description: "Simple recall and understanding",
      icon: Target,
      color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    },
    {
      id: "intermediate",
      label: "Intermediate",
      description: "Application and analysis",
      icon: Brain,
      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    },
    {
      id: "advanced",
      label: "Advanced",
      description: "Synthesis and evaluation",
      icon: Zap,
      color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    },
  ]

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const pdfFile = files.find((file) => file.type === "application/pdf")

    if (pdfFile) {
      handleFileSelect(pdfFile)
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      })
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === "application/pdf") {
      handleFileSelect(file)
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      })
    }
  }

  const handleFileSelect = async (file: File) => {
    setIsUploading(true)

    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setSelectedFile(file)
    setIsUploading(false)

    toast({
      title: "PDF uploaded successfully!",
      description: "Configure your question settings below.",
    })
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleTypeChange = (typeId: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes([...selectedTypes, typeId])
    } else {
      setSelectedTypes(selectedTypes.filter((t) => t !== typeId))
    }
  }

  const handleDifficultyChange = (difficultyId: string, checked: boolean) => {
    if (checked) {
      setSelectedDifficulties([...selectedDifficulties, difficultyId])
    } else {
      setSelectedDifficulties(selectedDifficulties.filter((d) => d !== difficultyId))
    }
  }

  const handleGenerateQuestions = () => {
    if (selectedFile) {
      onFileUpload(selectedFile, {
        types: selectedTypes,
        difficulties: selectedDifficulties,
        questionCount: questionCount[0],
      })
    }
  }

  const handleRemove = () => {
    setSelectedFile(null)
    onRemoveFile()
  }

  // Show success state if questions are generated
  if (questionsGenerated && uploadedFile) {
    return (
      <Card className="w-full border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Questions Generated Successfully!</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  From: {uploadedFile.name} • {questionCount[0]} questions ready
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRemove} className="text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl flex items-center gap-2 justify-center">
          <FileText className="h-5 w-5" />
          Upload Study Material
        </CardTitle>
        <CardDescription>Upload a PDF and configure question generation settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileInputChange} className="hidden" />

          {isUploading ? (
            <div className="space-y-2">
              <div className="animate-spin mx-auto h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
              <p className="text-sm text-muted-foreground">Uploading PDF...</p>
            </div>
          ) : selectedFile ? (
            <div className="space-y-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg mx-auto w-fit">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <Upload className="h-full w-full" />
              </div>
              <div>
                <p className="text-sm font-medium">Drop your PDF here or click to browse</p>
                <p className="text-xs text-muted-foreground">Supports PDF files up to 10MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Question Generation Settings - Only show if file is selected */}
        {selectedFile && (
          <>
            {/* Question Types */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Question Types Selection</Label>
              <div className="space-y-3">
                {questionTypes.map((type) => (
                  <div key={type.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={type.id}
                      checked={selectedTypes.includes(type.id)}
                      onCheckedChange={(checked) => handleTypeChange(type.id, checked as boolean)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor={type.id} className="text-sm font-medium cursor-pointer">
                        {type.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty Levels */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Difficulty Levels</Label>
              <p className="text-sm text-muted-foreground">Select one or more difficulty levels for your questions</p>
              <div className="space-y-3">
                {difficultyLevels.map((level) => {
                  const Icon = level.icon
                  return (
                    <div key={level.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={level.id}
                        checked={selectedDifficulties.includes(level.id)}
                        onCheckedChange={(checked) => handleDifficultyChange(level.id, checked as boolean)}
                      />
                      <Label htmlFor={level.id} className="flex items-center gap-3 cursor-pointer flex-1">
                        <div className={`p-2 rounded-lg ${level.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs text-muted-foreground">{level.description}</div>
                        </div>
                      </Label>
                    </div>
                  )
                })}
              </div>

              {/* Show selected difficulties */}
              {selectedDifficulties.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedDifficulties.map((diffId) => {
                    const level = difficultyLevels.find((l) => l.id === diffId)
                    return (
                      <Badge key={diffId} variant="secondary" className="text-xs">
                        {level?.label}
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Question Count */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Number of Questions</Label>
                <Badge variant="secondary">{questionCount[0]} questions</Badge>
              </div>
              <div className="px-2">
                <Slider
                  value={questionCount}
                  onValueChange={setQuestionCount}
                  max={50}
                  min={5}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5</span>
                  <span>25</span>
                  <span>50</span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateQuestions}
              disabled={selectedTypes.length === 0 || selectedDifficulties.length === 0 || isGenerating}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Generating Questions...
                </>
              ) : (
                "Generate Questions from PDF"
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
