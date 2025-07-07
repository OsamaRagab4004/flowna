"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Upload, X, CheckCircle, Brain, Target, Zap } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import SimpleModal from "./simple-modal"
import type { QuestionSettings, SummarySettings, MCQSettings } from "@/types/game"

interface PDFUploadModalProps {
  onFileUpload: (file: File, type: 'summary' | 'mcq', summarySettings?: SummarySettings, mcqSettings?: MCQSettings) => void
  uploadedFile: File | null
  onRemoveFile: () => void
  isGenerating: boolean
  questionsGenerated: boolean
  uploadFailed: boolean
  isOpen: boolean
  onClose: () => void
}

export default function PDFUploadModal({
  onFileUpload,
  uploadedFile,
  onRemoveFile,
  isGenerating,
  questionsGenerated,
  uploadFailed,
  isOpen,
  onClose,
}: PDFUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedType, setSelectedType] = useState<'summary' | 'mcq' | null>(null)
  
  // Summary settings
  const [summarySettings, setSummarySettings] = useState<SummarySettings>({
    createMindmap: true,
    createDefinitions: true,
    createQA: true,
    createStepbystep: true,
  })
  
  // MCQ settings
  const [mcqSettings, setMCQSettings] = useState<MCQSettings>({
    type: 'practical',
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleCloseModal = () => {
    onClose()
    // Reset form when closing
    setSelectedFile(null)
    setSelectedType(null)
    setSummarySettings({
      createMindmap: true,
      createDefinitions: true,
      createQA: true,
      createStepbystep: true,
    })
    setMCQSettings({
      type: 'practical',
    })
  }

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
      description: "Now choose your generation type and configure settings.",
    })
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleSummarySettingChange = (setting: keyof SummarySettings, checked: boolean) => {
    setSummarySettings(prev => ({
      ...prev,
      [setting]: checked
    }))
  }

  const handleMCQSettingChange = (type: 'practical' | 'theoretical') => {
    setMCQSettings({ type })
  }

  const handleGenerate = () => {
    if (selectedFile && selectedType) {
      if (selectedType === 'summary') {
        onFileUpload(selectedFile, 'summary', summarySettings)
      } else {
        onFileUpload(selectedFile, 'mcq', undefined, mcqSettings)
      }
      handleCloseModal()
    }
  }

  const handleRemove = () => {
    setSelectedFile(null)
    onRemoveFile()
  }

  const canGenerate = selectedFile && selectedType && 
    (selectedType === 'summary' ? 
      Object.values(summarySettings).some(Boolean) : 
      mcqSettings.type // MCQ type is always selected
    )



  return (
    <SimpleModal isOpen={isOpen} onClose={handleCloseModal} title="Upload Study Material">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Upload a PDF and configure generation settings
        </p>

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
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">Drop your PDF here or click to browse</p>
                  <p className="text-xs text-muted-foreground">Supports PDF files up to 10MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Upload Failure State - Show retry message */}
          {uploadFailed && (
            <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start justify-between space-x-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">Upload Failed</p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      There was an error processing your file. Please try uploading again.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClick}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Generation Type Selection - Only show if file is selected */}
          {selectedFile && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-medium">Choose Generation Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedType === 'summary' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedType('summary')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${selectedType === 'summary' ? 'bg-blue-500' : 'bg-gray-400'}`}>
                        <Brain className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Summary</p>
                        <p className="text-xs text-muted-foreground">Generate study materials</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedType === 'mcq' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-950' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedType('mcq')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${selectedType === 'mcq' ? 'bg-green-500' : 'bg-gray-400'}`}>
                        <Target className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">MCQs</p>
                        <p className="text-xs text-muted-foreground">Generate practice questions</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Settings */}
              {selectedType === 'summary' && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">Summary Options</Label>
                  <p className="text-sm text-muted-foreground">
                    Select which study materials to generate
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="mindmap"
                        checked={summarySettings.createMindmap}
                        onCheckedChange={(checked) => handleSummarySettingChange('createMindmap', checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="mindmap" className="text-sm font-medium cursor-pointer">
                          Mind Map
                        </Label>
                        <p className="text-xs text-muted-foreground">Visual representation of key concepts</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="definitions"
                        checked={summarySettings.createDefinitions}
                        onCheckedChange={(checked) => handleSummarySettingChange('createDefinitions', checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="definitions" className="text-sm font-medium cursor-pointer">
                          Definitions
                        </Label>
                        <p className="text-xs text-muted-foreground">Key terms and their explanations</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="qa"
                        checked={summarySettings.createQA}
                        onCheckedChange={(checked) => handleSummarySettingChange('createQA', checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="qa" className="text-sm font-medium cursor-pointer">
                          Q&A
                        </Label>
                        <p className="text-xs text-muted-foreground">Question and answer pairs</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="stepbystep"
                        checked={summarySettings.createStepbystep}
                        onCheckedChange={(checked) => handleSummarySettingChange('createStepbystep', checked as boolean)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="stepbystep" className="text-sm font-medium cursor-pointer">
                          Step by Step Explanation
                        </Label>
                        <p className="text-xs text-muted-foreground">Detailed step-by-step breakdowns</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MCQ Settings */}
              {selectedType === 'mcq' && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">MCQ Type</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose the type of questions to generate
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        mcqSettings.type === 'practical' 
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => handleMCQSettingChange('practical')}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${mcqSettings.type === 'practical' ? 'bg-orange-500' : 'bg-gray-400'}`}>
                          <Zap className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Practical Questions</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            These questions measure understanding through practical scenarios with critical thinking. 
                            Perfect for testing application of knowledge.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        mcqSettings.type === 'theoretical' 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => handleMCQSettingChange('theoretical')}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${mcqSettings.type === 'theoretical' ? 'bg-purple-500' : 'bg-gray-400'}`}>
                          <Brain className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Direct Questions</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            These questions measure your knowledge by recalling information directly. 
                            Ideal if you want to quickly test yourself on facts and concepts. 
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Generating Content...
                  </>
                ) : (
                  <>
                    Generate {selectedType === 'summary' ? 'Study Materials' : 'MCQ Questions'}
                    {selectedType && (
                      <span className="ml-2">
                        {selectedType === 'summary' ? <Brain className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                      </span>
                    )}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </SimpleModal>
    )
  }