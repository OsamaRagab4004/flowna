"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { FileText, Clock, Users, Award } from "lucide-react"

export default function MCQDemoPage() {
  const quizSets = [
    {
      id: "demo",
      title: "Demo Quiz",
      description: "A sample quiz with 5 questions covering general knowledge",
      questions: 5,
      timeLimit: "30 minutes",
      difficulty: "Easy"
    },
    {
      id: "javascript",
      title: "JavaScript Fundamentals",
      description: "Test your knowledge of JavaScript basics and ES6 features",
      questions: 10,
      timeLimit: "45 minutes",
      difficulty: "Medium"
    },
    {
      id: "react",
      title: "React Concepts",
      description: "Advanced React concepts including hooks, context, and performance",
      questions: 15,
      timeLimit: "60 minutes",
      difficulty: "Hard"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            MCQ Quiz Center
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Test your knowledge with our interactive multiple-choice quizzes. 
            Track your progress and see detailed results after completion.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="p-4">
              <FileText className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <h3 className="font-medium text-sm">Multiple Choice</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">4 options per question</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Clock className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <h3 className="font-medium text-sm">Timed Quizzes</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Beat the clock</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Users className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <h3 className="font-medium text-sm">Progress Tracking</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">See answered questions</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Award className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <h3 className="font-medium text-sm">Detailed Results</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Review your performance</p>
            </CardContent>
          </Card>
        </div>

        {/* Quiz Sets */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Available Quizzes
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizSets.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">{quiz.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {quiz.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Questions:</span>
                      <p className="font-medium">{quiz.questions}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Time Limit:</span>
                      <p className="font-medium">{quiz.timeLimit}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      quiz.difficulty === 'Easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      quiz.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {quiz.difficulty}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/mcq/${quiz.id}`} className="flex-1">
                      <Button className="w-full">
                        Start Quiz
                      </Button>
                    </Link>
                    <Link href={`/mcq/${quiz.id}/results`}>
                      <Button variant="outline" size="sm">
                        View Results
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link href="/home">
            <Button variant="outline" size="lg">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
