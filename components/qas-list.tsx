"use client"

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface QA {
  id?: string
  question: string
  answer: string
}

interface QAsListProps {
  questions: QA[]
  title?: string
}

export default function QAsList({ 
  questions, 
  title = "Questions & Answers"
}: QAsListProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  // Debug logging
  console.log('🔍 [QAS_LIST] Received questions:', questions);
  console.log('🔍 [QAS_LIST] Questions count:', questions?.length || 0);

  const getQuestionId = (qa: QA, index: number): string => {
    return qa.id ?? index.toString();
  }

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId)
    } else {
      newExpanded.add(questionId)
    }
    setExpandedQuestions(newExpanded)
  }

  const expandAll = () => {
    setExpandedQuestions(new Set(questions.map((q, index) => getQuestionId(q, index))))
  }
  const collapseAll = () => {
    setExpandedQuestions(new Set())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-purple-500" />
            {title}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Click on questions to reveal answers
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="text-xs"
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
            className="text-xs"
          >
            Collapse All
          </Button>        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">
                No questions found.
              </p>
            </CardContent>
          </Card>
        ) : (
          questions.map((qa, index) => {
            const questionId = getQuestionId(qa, index);
            const isExpanded = expandedQuestions.has(questionId)
            
            return (
              <Card 
                key={questionId} 
                className={cn(
                  "transition-all duration-200 hover:shadow-md cursor-pointer",
                  isExpanded && "ring-2 ring-purple-500/20"
                )}
                onClick={() => toggleQuestion(questionId)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-purple-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>                      <div className="flex-1">
                        <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                          {qa.question}
                        </h3>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="pl-8">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border-l-4 border-purple-500">
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {qa.answer}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                )}              </Card>
            )
          })
        )}
      </div>

      {/* Statistics */}
      {questions.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span>Total Questions: {questions.length}</span>
              <span>Expanded: {expandedQuestions.size}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
