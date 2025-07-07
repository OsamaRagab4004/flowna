"use client"

import React from 'react'
import MindMapViewer from './mindmap-viewer'
import DefinitionsList from './definitions-list'
import StepByStepList from './step-by-step-list'
import QAsList from './qas-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContentRendererProps {
  activeSection: string
  contentData: any
  mindmapData?: string  // Changed from array to string
  definitionsData?: any[]
  qasData?: any[]
  stepByStepData?: any[]
}

export default function ContentRenderer({ 
  activeSection, 
  contentData,
  mindmapData,  // Changed from mindmapsData
  definitionsData,
  qasData,
  stepByStepData
}: ContentRendererProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'Advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }  // Handle MindMaps section with nested navigation
  if (activeSection === 'mindmaps') {
    return (
      <div className="w-full h-full">
        <MindMapViewer mindMapDefinition={mindmapData || undefined} />
      </div>
    )
  }// Handle Definitions section with custom component
  if (activeSection === 'definitions') {
    return (
      <DefinitionsList definitions={definitionsData || []} />
    )
  }

  // Handle QAs section with custom component
  if (activeSection === 'qas') {
    return (
      <QAsList questions={qasData || []} />
    )
  }
  // Handle Step-by-Step section with custom component
  if (activeSection === 'step-by-step') {
    return (
      <StepByStepList stepByStepData={stepByStepData?.[0] || null} />
    )
  }

  // Handle other sections with default grid layout
  const activeContent = contentData[activeSection]
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {activeContent.items.map((item: any, index: number) => (
        <Card key={index} className="group hover:shadow-lg transition-all duration-200 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <Badge 
                    variant="secondary" 
                    className="text-xs w-fit mb-1"
                  >
                    {item.type}
                  </Badge>
                  <Badge 
                    className={cn("text-xs w-fit", getDifficultyColor(item.difficulty))}
                  >
                    {item.difficulty}
                  </Badge>
                </div>
              </div>
            </div>
            <CardTitle className="text-lg leading-tight text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200">
              {item.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {item.description}
            </CardDescription>
            <Separator className="bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm"
                className="group-hover:bg-purple-50 group-hover:border-purple-300 dark:group-hover:bg-purple-900/20 dark:group-hover:border-purple-700 transition-colors duration-200"
              >
                Explore
              </Button>
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Updated 2 days ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
