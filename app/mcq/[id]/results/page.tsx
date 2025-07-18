"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback, useRef, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, RotateCcw, Home, Trophy, Medal, Crown, Loader2 } from "lucide-react"
import { use } from "react"
import { useAuth } from "@/context/auth-context"
import { useStomp } from "@/context/StompContextType"
import type { StompSubscription } from "@stomp/stompjs"
import { getApiUrl } from '@/lib/api'

interface ApiQuizData {
  questionId: number
  questionText: string
  correctAnswerId: number
  answerOptions: {
    id: number
    answerText: string
  }[]
  userAnswers: {
    answerText: string | null
    username: string  }[]
}

interface UserScore {
  username: string
  correctAnswers: number
  totalQuestions: number
  score: number
  rank: number
}

function MCQResultsContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params) // This is the roomCode
  const { user, loading: authLoading } = useAuth()
  const { subscribeToTopic, unsubscribeFromTopic, stompClient } = useStomp()
  const subscriptionRef = useRef<StompSubscription | null>(null)
  const roomCode = id
  const [isLoading, setIsLoading] = useState(false)
  const [quizData, setQuizData] = useState<ApiQuizData[]>([])
  const [userScores, setUserScores] = useState<UserScore[]>([])
  const [isExamGoing, setIsExamGoing] = useState<boolean | null>(null)
  const searchParams = useSearchParams()
  const roomJoinCode = searchParams.get('roomCode') || roomCode // Fallback to params if not in search params


  // Calculate user scores for leaderboard
  const calculateUserScores = (data: ApiQuizData[]) => {
    const allUsers = new Set<string>()
    
    // Collect all unique usernames
    data.forEach(question => {
      question.userAnswers.forEach(answer => {
        if (answer.username) {
          allUsers.add(answer.username)
        }
      })
    })

    // Calculate scores for each user
    const scores = Array.from(allUsers).map(username => {
      let correctAnswers = 0
      let totalQuestions = data.length

      data.forEach(question => {
        const correctOption = question.answerOptions.find(opt => opt.id === question.correctAnswerId)
        const userAnswer = question.userAnswers.find(ua => ua.username === username)
        
        if (userAnswer && userAnswer.answerText === correctOption?.answerText) {
          correctAnswers++
        }
      })

      return {
        username,
        correctAnswers,
        totalQuestions,
        score: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
        rank: 0 // Will be set after sorting
      }
    }).sort((a, b) => b.score - a.score || b.correctAnswers - a.correctAnswers) // Sort by score, then by correct answers    // Assign ranks
    const rankedScores = scores.map((score, index) => ({
      ...score,
      rank: index + 1
    }))
    
    setUserScores(rankedScores)
  }

  // Check if exam is still going
  const checkExamStatus = async () => {
    if (!user) return

    try {
      const response = await fetch(getApiUrl('api/v1/scheduler/check'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ roomId: roomCode })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Exam status check:', data)
      setIsExamGoing(data.isGoing)
      
      // If exam is not going, fetch the summary
      if (!data.isGoing) {
        fetchQuizResults()
      } else {
        // If exam is still going, set loading to true
        setIsLoading(true)
      }
      
    } catch (error) {
      console.error('Error checking exam status:', error)
      // On error, assume exam is not going and try to fetch results
      setIsExamGoing(false)
      fetchQuizResults()
    }
  }
  const fetchQuizResults = async () => {
    if (!user) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch(getApiUrl(`api/v1/squadgames/questions-collector/${roomCode}/summary`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }      const data: ApiQuizData[] = await response.json()
      console.log('Quiz results fetched successfully:', data)
      
      // Sort questions by questionId to ensure consistent order on every reload
      const sortedData = data.sort((a, b) => a.questionId - b.questionId)
      
      setQuizData(sortedData)
      calculateUserScores(sortedData)
      
    } catch (error) {
      console.error('Error fetching quiz results:', error)
    } finally {
      setIsLoading(false)
    }
  }  // Effect to check exam status and fetch results when component mounts
  useEffect(() => {
    if (roomCode && user && !authLoading) {
      checkExamStatus()
    }
  }, [roomCode, user, authLoading])
  // Room message handler for WebSocket events
  const handleRoomMessage = useCallback(
    (message: { body: any }) => {
      try {
        const response = JSON.parse(message.body)
        console.log("📥 [MCQ_RESULTS_ROOM_MESSAGE] Received event:", response.eventType, response)
        
        if (response.eventType === "EXAM_IS_NOT_GOING") {
          setIsExamGoing(false)
          setIsLoading(false)
          fetchQuizResults()
        }
        
      } catch (err) {
        console.error("❌ [MCQ_RESULTS_ROOM_MESSAGE] Failed to parse room message", err)
      }
    },
    [fetchQuizResults]
  )

  // Subscribe to room when page loads
  useEffect(() => {
    if (!user || !roomCode || !stompClient) {
      return
    }

    const topic = `/topic/rooms/${roomCode}`
    const currentSubscription = subscribeToTopic(topic, handleRoomMessage)
    subscriptionRef.current = currentSubscription

    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromTopic(topic)
        subscriptionRef.current = null
      }
    }  }, [user, roomCode, stompClient, subscribeToTopic, unsubscribeFromTopic, handleRoomMessage])

  // Show loading while authentication is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Only redirect to login if we're sure the user is not authenticated (and not loading)
  if (!authLoading && !user) {
    router.push('/login')
    return null
  }

  const handleForwardToRoom = () => {


    
    window.open(`/lobby/${roomJoinCode}`, '_blank')
  }
 

  // Helper function to get rank icon
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Trophy className="h-5 w-5 text-amber-600" />
      default:
        return null
    }
  }

  // Helper function to get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400"
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }
  if (isLoading || isExamGoing === true) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            {isExamGoing === true ? "Exam is still in progress..." : "Loading quiz results..."}
          </p>
        </div>
      </div>
    )
  }

  if (!quizData || quizData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 dark:text-gray-400">No quiz results available.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Award className="h-16 w-16 text-yellow-500" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Quiz Results
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Winners leaderboard and detailed question review
          </p>
        </div>

        {/* Winners Leaderboard */}
        {userScores.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Winners Leaderboard
              </CardTitle>
              <CardDescription>
                Top performers ranked by score (correct answers / total questions)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userScores.map((userScore, index) => (
                  <div
                    key={userScore.username}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                      userScore.username === user?.name
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-md'
                        : index < 3
                        ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-300 dark:border-yellow-700'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(userScore.rank)}
                        <Badge
                          variant={userScore.rank === 1 ? "default" : userScore.rank === 2 ? "secondary" : "outline"}
                          className={`w-8 h-8 rounded-full flex items-center justify-center p-0 text-sm font-bold ${
                            userScore.rank === 1 ? 'bg-yellow-500 text-white' :
                            userScore.rank === 2 ? 'bg-gray-400 text-white' :
                            userScore.rank === 3 ? 'bg-amber-600 text-white' : ''
                          }`}
                        >
                          {userScore.rank}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white text-lg">
                          {userScore.username === user?.name ? `${userScore.username} (You)` : userScore.username}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {userScore.correctAnswers} / {userScore.totalQuestions} correct answers
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(userScore.score)}`}>
                        {userScore.score}%
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Score
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions and Answers */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Question by Question Review</CardTitle>
            <CardDescription>
              Green indicates the correct answer. See who selected each option below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {quizData.map((questionData, index) => (
              <div key={questionData.questionId} className="border-b border-gray-200 dark:border-gray-700 pb-8 last:border-b-0">
                <div className="flex items-start justify-between mb-4">
                  <Badge variant="outline" className="px-2 py-1">
                    Q{index + 1}
                  </Badge>
                </div>

                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4 text-lg">
                    {questionData.questionText}
                  </h4>

                  <div className="space-y-3">
                    {questionData.answerOptions.map((option, optionIndex) => {
                      const isCorrect = option.id === questionData.correctAnswerId
                      const usersWhoSelected = questionData.userAnswers.filter(ua => ua.answerText === option.answerText)
                      const optionLabel = String.fromCharCode(97 + optionIndex) // a, b, c, d
                      
                      let className = "p-4 rounded-lg border text-sm "
                      if (isCorrect) {
                        className += "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                      } else {
                        className += "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      }

                      return (
                        <div key={option.id} className={className}>
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium flex items-center">
                              <span className="flex w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold items-center justify-center mr-3">
                                {optionLabel}
                              </span>
                              {option.answerText}
                            </span>
                            <div className="flex items-center gap-2">
                              {isCorrect && (
                                <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
                                  ✓ Correct Answer
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Show users who selected this answer */}
                          {usersWhoSelected.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                Selected by ({usersWhoSelected.length}):
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {usersWhoSelected.map((userAnswer, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className={`text-xs ${
                                      userAnswer.username === user?.name
                                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'
                                        : 'bg-gray-100 dark:bg-gray-700'
                                    }`}
                                  >
                                    {userAnswer.username === user?.name ? `${userAnswer.username} (You)` : userAnswer.username}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={handleForwardToRoom} size="lg" className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Back to the Room 
          </Button>
          
        </div>
      </div>
    </div>
  )
}

export default function MCQResultsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading quiz results...</p>
        </div>
      </div>
    }>
      <MCQResultsContent params={params} />
    </Suspense>
  )
}