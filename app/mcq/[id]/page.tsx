"use client"

import { useEffect, useState, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Circle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import MCQAnswerInput from "@/components/mcq-answer-input"
import { use } from "react"
import { useAuth } from "@/context/auth-context"
import { useStomp } from "@/context/StompContextType"
import type { StompSubscription } from "@stomp/stompjs"
import { getApiUrl } from '@/lib/api'

interface MCQOption {
  id: string
  answerText: string
}

interface MCQQuestion {
  id: string
  questionText: string
  answerOptionsSQ: MCQOption[]
}

interface UserAnswer {
  questionId: string
  selectedOptionId: string | null
  answeredAt: Date | null
}



function MCQContent({ params }: { params: Promise<{ id: string }> }) {  const router = useRouter()
  const searchParams = useSearchParams()
  const { id } = use(params)
  const { user, loading: authLoading } = useAuth()
  const { subscribeToTopic, unsubscribeFromTopic, stompClient } = useStomp()
  const subscriptionRef = useRef<StompSubscription | null>(null)
    // Get roomCode from query parameters, with fallback to localStorage
  const [roomCode, setRoomCode] = useState<string | null>(null)
  
  // Debug roomCode changes
  useEffect(() => {
    console.log('🔍 [MCQ_DEBUG] roomCode state changed:', roomCode)
  }, [roomCode])
  
  useEffect(() => {
    // First priority: get roomCode from query parameters
    const urlRoomCode = searchParams.get('roomCode')
    if (urlRoomCode) {
      setRoomCode(urlRoomCode)
      console.log('📍 [MCQ] Found roomCode from URL query:', urlRoomCode)
    } else {
      // Second priority: try to get roomCode from localStorage or sessionStorage
      const storedRoomCode = localStorage.getItem('currentRoomCode') || sessionStorage.getItem('currentRoomCode')
      if (storedRoomCode) {
        setRoomCode(storedRoomCode)
        console.log('📍 [MCQ] Found roomCode from storage:', storedRoomCode)
      } else {
        // Third priority: use the id parameter as roomCode (fallback)
        if (id) {
          setRoomCode(id)
          console.log('📍 [MCQ] Using id parameter as roomCode fallback:', id)
        } else {
          console.warn('⚠️ [MCQ] No roomCode found in URL query, storage, or id parameter')
        }
      }
    }
  }, [searchParams, id])
  // Function to clean escaped characters from text
  const cleanText = (text: string): string => {
    if (!text) return text
    
    let cleaned = text
    
    // Handle multiple types of escaping
    cleaned = cleaned
      .replace(/\\"/g, '"')           // Replace \" with "
      .replace(/\\'/g, "'")           // Replace \' with '
      .replace(/\\n/g, '\n')          // Replace \n with actual newlines
      .replace(/\\t/g, '\t')          // Replace \t with actual tabs
      .replace(/\\r/g, '\r')          // Replace \r with carriage returns
      .replace(/\\\\/g, '\\')         // Replace \\ with \
      // Additional cleaning for HTML entities
      .replace(/&quot;/g, '"')        // Replace &quot; with "
      .replace(/&apos;/g, "'")        // Replace &apos; with '
      .replace(/&lt;/g, '<')          // Replace &lt; with <
      .replace(/&gt;/g, '>')          // Replace &gt; with >
      .replace(/&amp;/g, '&')         // Replace &amp; with & (do this last)
    
    // If it's still showing escaped quotes, try this approach
    // Sometimes the data comes with literal backslash characters
    if (cleaned.includes('\\"')) {
      cleaned = cleaned.replace(/\\"/g, '"')
    }
      return cleaned
  }
    // Function to execute POST request when page loads/reloads
  const handlePageLoad = async () => {
    if (!user || !id || !roomCode) {
      console.log('Cannot execute page load request: missing user, quiz ID, or roomCode', {
        hasUser: !!user,
        hasId: !!id,
        hasRoomCode: !!roomCode,
        roomCode: roomCode
      })
      return
    }

    try {
      console.log(`Executing page load POST request for quiz: ${id}, roomCode: ${roomCode}`)
      
      const response = await fetch(getApiUrl("api/v1/scheduler/join"), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({
          roomId : roomCode,
          username: user.name
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Page load request successful:', data)
      } else {
        console.error('Page load request failed:', response.status)
      }
    } catch (error) {
      console.error('Error executing page load request:', error)
    }
  }
  // Function to execute POST request when component unmounts
  const handlePageUnmount = async () => {
    if (!user || !id || !roomCode) {
      console.log('Cannot execute page unmount request: missing user, quiz ID, or roomCode', {
        hasUser: !!user,
        hasId: !!id,
        hasRoomCode: !!roomCode,
        roomCode: roomCode
      })
      return
    }

     try {
      console.log(`Executing page unmount POST request for quiz: ${id}, roomCode: ${roomCode}`)
      
      const response = await fetch(getApiUrl("api/v1/scheduler/leave"), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({
          roomId : roomCode,
          username: user.name
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Page unmount request successful:', data)
      } else {
        console.error('Page unmount request failed:', response.status)
      }
    } catch (error) {
      console.error('Error executing page unmount request:', error)
    }
  }
    // State management
  const [questions, setQuestions] = useState<MCQQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [answeredQuestions, setAnsweredQuestions] = useState<{questionId: string, answerId: string}[]>([])
  const [timeLeft, setTimeLeft] = useState(2100) // 35 minutes default
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [maxTime] = useState(2100) // 35 minutes
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null)

  // Helper function to format time in MM:SS format
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Fetch questions from database using URL parameter when component mounts
  useEffect(() => {
    const fetchQuestionsFromDB = async () => {
      try {
        setIsLoading(true)
        setFetchError(null)
        
        // Wait for authentication to complete
        if (authLoading) {
          console.log('Waiting for authentication to complete...')
          return
        }
        
        // Check if user is authenticated
        if (!user) {
          setFetchError('User not authenticated. Please log in.')
          console.error('User not authenticated. Cannot fetch quiz data.')
          setIsLoading(false)
          return
        }
        
        // Fetch questions from database using the URL parameter
        const response = await fetch(getApiUrl(`api/v1/squadgames/questions-collector/${id}/questions`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.access_token}`
          },
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
          const data = await response.json()
        
        // Your API returns a direct array of questions, not an object with success/questions properties
        console.log('Raw API response:', data)
          // Check if data is an array of questions
        if (Array.isArray(data) && data.length > 0) {          // Clean escaped characters from questions and answers
          const cleanedQuestions = data.map((question: MCQQuestion) => {
            console.log('Original question text:', question.questionText)
            const cleanedQuestionText = cleanText(question.questionText)
            console.log('Cleaned question text:', cleanedQuestionText)
            
            return {
              ...question,
              questionText: cleanedQuestionText,
              answerOptionsSQ: question.answerOptionsSQ.map((option: MCQOption) => {
                console.log('Original answer text:', option.answerText)
                const cleanedAnswerText = cleanText(option.answerText)
                console.log('Cleaned answer text:', cleanedAnswerText)
                return {
                  ...option,
                  answerText: cleanedAnswerText
                }
              })
            }
          })
          
          setQuestions(cleanedQuestions)
          console.log(`Successfully fetched and cleaned ${cleanedQuestions.length} questions for quiz ID: ${id}`)
          
          // Initialize or restore timer state
          const timerKey = `mcq_timer_${user.name}_${id}_${roomCode}`
          const storedRemainingTime = localStorage.getItem(timerKey)
          
          if (storedRemainingTime) {
            // Quiz was already started, restore remaining time
            const remainingTime = parseInt(storedRemainingTime, 10)
            if (remainingTime > 0) {
              setTimeLeft(remainingTime)
              console.log(`Quiz timer restored for user ${user.name}: ${remainingTime} seconds remaining`)
            } else {
              // Time has expired, auto-submit
              console.log('Quiz time has expired, auto-submitting...')
              localStorage.removeItem(timerKey)
              handleSubmit()
              return
            }
          } else {
            // First time starting this quiz, set initial time
            const initialTime = 2100 // 35 minutes default
            setTimeLeft(initialTime)
            localStorage.setItem(timerKey, initialTime.toString())
            console.log(`Quiz timer started for user ${user.name}: ${initialTime} seconds (35 minutes)`)
          }
          
        } else if (Array.isArray(data) && data.length === 0) {
          console.warn('No questions found in database response')
          setFetchError('No questions found for this quiz.')
        } else {
          // If it's not an array, maybe your API structure is different
          console.error('Unexpected API response format:', data)
          setFetchError('Unexpected response format from server.')
        }
        
      } catch (error) {
        console.error('Error fetching questions from database:', error)
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        setFetchError(`Failed to load quiz from database: ${errorMessage}`)
        
        console.log('Database fetch failed')
        
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch if we have a valid quiz ID and authentication is ready
    if (id && typeof id === 'string' && id.trim() !== '' && !authLoading) {
      fetchQuestionsFromDB()
    } else if (!id || id.trim() === '') {
      console.error('Invalid quiz ID parameter:', id)
      setFetchError('Invalid quiz ID provided in URL')
      setIsLoading(false)
    }
    // If authLoading is true, we wait (don't set loading to false)
      }, [id, user, authLoading])
  // Handle page load and unmount events
  useEffect(() => {
    // Execute page load function when component mounts and user is ready
    if (user && id && roomCode && !authLoading) {
      console.log('Conditions met for handlePageLoad:', {
        hasUser: !!user,
        hasId: !!id,
        hasRoomCode: !!roomCode,
        authLoading,
        roomCode: roomCode
      })
      handlePageLoad()
    } else {
      console.log('Waiting for conditions to call handlePageLoad:', {
        hasUser: !!user,
        hasId: !!id,
        hasRoomCode: !!roomCode,
        authLoading,
        roomCode: roomCode
      })
    }

    // Set up beforeunload event listener for page unmount
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Execute unmount function
      handlePageUnmount()
      // Note: We don't clear the timer here since user might be refreshing
    }

    // Set up pagehide event as backup (works better on mobile)
    const handlePageHide = () => {
      handlePageUnmount()
      // Note: We don't clear the timer here since user might be refreshing
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)

    // Cleanup function - this runs when component unmounts
    return () => {
      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
      
      // Execute unmount function one final time
      handlePageUnmount()
      
      // Clear timer localStorage when user leaves the page
      if (user && id && roomCode) {
        const timerKey = `mcq_timer_${user.name}_${id}_${roomCode}`
        localStorage.removeItem(timerKey)
        console.log(`Quiz timer cleared from localStorage on page leave for user ${user.name}`)
      }
    }
  }, [user, id, roomCode, authLoading]) // Added roomCode as dependency
    // Room message handler - callback function to handle WebSocket events
  const handleRoomMessage = useCallback(
    (message: { body: any }) => {
      try {
        const response = JSON.parse(message.body)
        console.log("📥 [MCQ_ROOM_MESSAGE] Received event:", response.eventType, response)
          // #region ExamFinished
        if (response.eventType === "EXAM_FINISHED") {
          console.log("🏁 [EXAM_FINISHED] Exam has finished")   
          // Auto-submit and navigate to results
          handleSubmit();
          setTimeout(() => {
            router.push(`/mcq/${id}/results?roomCode=${roomCode}`)
          }, 3000)
        }
        
        
        // Add more event handlers as needed for your application
        
      } catch (err) {
        console.error("❌ [MCQ_ROOM_MESSAGE] Failed to parse or process room message", err)
      }    },
    [id, router, setIsSubmitting] // Dependencies for the callback
  )

  // Utility functions for handling specific exam events
  
  // Function to handle exam finish event
  const handleExamFinished = useCallback(() => {
    console.log("🏁 [HANDLE_EXAM_FINISHED] Processing exam finish")
    
    // Stop any running timers
    setIsSubmitting(true)
    
    // Show alert to user
    alert('The exam has finished. You can now view your results.')
    
    // You can add additional logic here like:
    // - Auto-submit current answers
    // - Show a final confirmation dialog
    // - Navigate to results after a delay
    
    setTimeout(() => {
      router.push(`/mcq/${id}/results?roomCode=${roomCode}`)
    }, 3000) // Give user 3 seconds to see the notification
  }, [id, router, setIsSubmitting])

  // Function to handle time warnings
  const handleTimeWarning = useCallback((remainingTime: number) => {
    console.log("⏰ [HANDLE_TIME_WARNING] Time warning:", remainingTime)
    
    // You can show toast notifications or update UI
    // For example, if 5 minutes remaining:
    if (remainingTime === 300) { // 5 minutes in seconds
      alert(`⚠️ Time Warning: Only 5 minutes remaining!`)
    } else if (remainingTime === 60) { // 1 minute in seconds
      alert(`🚨 Final Warning: Only 1 minute remaining!`)
    }
  }, [])

  // Function to handle exam pause/resume
  const handleExamPauseResume = useCallback((isPaused: boolean) => {
    console.log("⏸️▶️ [HANDLE_EXAM_PAUSE_RESUME] Exam paused:", isPaused)
    
    // You can update UI state or show overlays
    // For example:
    // setIsExamPaused(isPaused)
    
    if (isPaused) {
      alert("⏸️ Exam has been paused by the administrator")
    } else {
      alert("▶️ Exam has been resumed")
    }
  }, [])

  // Function to handle system messages
  const handleSystemMessage = useCallback((message: string) => {
    console.log("💬 [HANDLE_SYSTEM_MESSAGE] System message:", message)
    
    // Show system messages as alerts or toast notifications
    alert(`📢 System Message: ${message}`)
  }, [])
  



    // Subscribe to room when page loads and user is authenticated
  useEffect(() => {    if (!user || !roomCode || !stompClient) {
      console.log('⚠️ [MCQ_SUBSCRIPTION] Cannot subscribe:', {
        hasUser: !!user,
        hasRoomCode: !!roomCode,
        hasStompClient: !!stompClient
      })
      return
    }

    console.log("✅ [MCQ_SUBSCRIPTION] Conditions met. Setting up STOMP subscription...")

       const topic = `/topic/rooms/${roomCode}`
    console.log('📡 [MCQ_SUBSCRIPTION] Subscribing to topic:', topic)
    
    const currentSubscription = subscribeToTopic(topic, handleRoomMessage)
    subscriptionRef.current = currentSubscription

    // The cleanup function ONLY handles unsubscribing from the STOMP topic.
    return () => {
      console.log("❌ [MCQ_SUBSCRIPTION] Component unmounting. Cleaning up subscription...")
      if (subscriptionRef.current) {
        unsubscribeFromTopic(topic)
        subscriptionRef.current = null
        console.log("✅ [MCQ_SUBSCRIPTION] Unsubscribed from STOMP topic.")
      }
    }  }, [
    user,
    authLoading,
    roomCode,
    stompClient,
    subscribeToTopic,
    unsubscribeFromTopic,
    handleRoomMessage,
  ])

  // Initialize user answers when questions are loaded
  useEffect(() => {
    if (questions.length > 0) {
      const initialAnswers = questions.map(q => ({
        questionId: q.id,
        selectedOptionId: null,
        answeredAt: null
      }))
      setUserAnswers(initialAnswers)
    }
  }, [questions])

  // Submit answers (navigate to results)
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)

    // Clear the timer from localStorage when submitting
    if (id && roomCode && user) {
      const timerKey = `mcq_timer_${user.name}_${id}_${roomCode}`
      localStorage.removeItem(timerKey)
      console.log(`Quiz timer cleared from localStorage for user ${user.name}`)
    }

    const res = await fetch(getApiUrl("api/v1/student-answers/save"), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.access_token}`
      },    
        body: JSON.stringify({
         answers : userAnswers
        })
    })
    // Simulate a brief delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    router.push(`/mcq/${id}/results?roomCode=${roomCode}`)
  }, [id, roomCode, user, userAnswers, router])

  // Timer countdown with localStorage persistence
  useEffect(() => {
    if (timeLeft > 0 && !isSubmitting && user && id && roomCode) {
      const timerKey = `mcq_timer_${user.name}_${id}_${roomCode}`
      
      const timer = setTimeout(() => {
        const newTime = timeLeft - 1
        setTimeLeft(newTime)
        
        // Update localStorage with remaining time
        if (newTime > 0) {
          localStorage.setItem(timerKey, newTime.toString())
        } else {
          // Time expired - clear localStorage and auto-submit
          localStorage.removeItem(timerKey)
          console.log('Quiz time expired, auto-submitting...')
          handleSubmit()
        }
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [timeLeft, isSubmitting, user, id, roomCode, handleSubmit])  // Handle answer selection
  const handleAnswerSelect = (optionIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex]
    if (!currentQuestion) return

    // Get the actual answer ID from the server data, not the index
    const selectedOption = currentQuestion.answerOptionsSQ[optionIndex]
    if (!selectedOption || !selectedOption.id) return

    const selectedOptionId = selectedOption.id

    console.log(`🎯 [ANSWER_SELECTION] User selected option at index ${optionIndex}:`, {
      optionIndex,
      actualAnswerId: selectedOptionId,
      answerText: selectedOption.answerText,
      questionId: currentQuestion.id
    })

    // Update user answers state
    const updatedAnswers = userAnswers.map(answer => 
      answer.questionId === currentQuestion.id
        ? { 
            ...answer, 
            selectedOptionId,
            answeredAt: new Date()
          }
        : answer
    )
    
    setUserAnswers(updatedAnswers)

    // Create array of answered questions with their actual answer IDs
    const newAnsweredQuestions = updatedAnswers
      .filter(answer => answer.selectedOptionId !== null)
      .map(answer => ({
        questionId: answer.questionId,
        answerId: answer.selectedOptionId as string // This is now the real server ID
      }))

    // Update the answered questions state
    setAnsweredQuestions(newAnsweredQuestions)

    // Console log the array each time user answers
    console.log('📝 [STUDENT_ANSWERS] Current answered questions with real IDs:', newAnsweredQuestions)
    console.log(`📊 [STUDENT_PROGRESS] ${newAnsweredQuestions.length}/${questions.length} questions answered`)
    
    // Also log the specific answer for this question with real ID
    console.log(`✅ [QUESTION_ANSWERED] Question ID: ${currentQuestion.id}, Real Answer ID: ${selectedOptionId}`)
  }

  // Navigation between questions
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index)
    }
  }

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }


  // Get current question data
  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = userAnswers.find(a => a.questionId === currentQuestion?.id)
  const selectedOptionIndex = currentAnswer?.selectedOptionId 
    ? currentQuestion?.answerOptionsSQ.findIndex(opt => opt.id === currentAnswer.selectedOptionId)
    : undefined
  
  // Ensure no invalid index is used
  const validSelectedIndex = selectedOptionIndex !== undefined && selectedOptionIndex >= 0 
    ? selectedOptionIndex 
    : undefined  // Calculate progress
  const answeredCount = userAnswers.filter(a => a.selectedOptionId !== null).length
  const progressPercentage = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0  // Loading state - wait for authentication first, then quiz data
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-white mx-auto"></div>
          <p className="mt-4 text-xl text-white font-medium">
            {authLoading ? "Checking authentication..." : "Fetching questions from database..."}
          </p>
          <p className="mt-2 text-white/80">Quiz ID: {id}</p>
          <p className="mt-1 text-white/60 text-sm">
            {authLoading ? "Please wait while we verify your login" : "Please wait while we load your quiz"}
          </p>
        </div>
      </div>
    )
  }

  // Authentication required - redirect to login
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to access this quiz.</p>
          <button 
            onClick={() => router.push('/home')}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-600 mr-2"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // No questions state
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Questions Found</h2>
          <p className="text-gray-600 mb-6">This quiz doesn't contain any questions.</p>
          <button 
            onClick={() => router.push('/home')}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-600"
          >
            Go Back Home
          </button>
        </div>
      </div>
    )
  }

  return (    <div className="mcq-page-container h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-4 overflow-hidden">
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        {/* Error notification banner */}
        {fetchError && (
          <div className="mb-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg flex-shrink-0">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{fetchError}</p>
                <p className="text-xs mt-1">You can still proceed with the sample questions provided.</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">
              MCQ Quiz
            </h1>
            <Badge variant="outline" className="text-lg px-3 py-1 bg-white/90 border-white/50">
              Question {currentQuestionIndex + 1} of {questions.length}
            </Badge>
          </div>

          {/* Timer */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">Time Remaining:</span>
              <span className="text-2xl font-bold text-white font-mono">
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="mt-2 bg-white/20 rounded-full h-2">
              <div 
                className="rounded-full h-2 transition-all duration-1000"
                style={{ 
                  width: `${(timeLeft / maxTime) * 100}%`,
                  background: timeLeft < 300 
                    ? 'linear-gradient(90deg, #ef4444, #dc2626)' // Red gradient for < 5 min
                    : timeLeft < 600 
                      ? 'linear-gradient(90deg, #f59e0b, #d97706)' // Orange gradient for < 10 min
                      : timeLeft < 900
                        ? 'linear-gradient(90deg, #eab308, #ca8a04)' // Yellow gradient for < 15 min
                        : 'linear-gradient(90deg, #10b981, #059669)' // Green gradient for > 15 min
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl h-[600px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-lg text-gray-800">Questions</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <div className="mcq-question-list grid grid-cols-5 lg:grid-cols-1 gap-2 overflow-y-auto pr-2"
                     style={{
                       scrollbarWidth: 'thin',
                       scrollbarColor: '#d1d5db #f3f4f6',
                       maxHeight: '400px'
                     }}>
                  {questions.map((question, index) => {
                    const isAnswered = userAnswers[index]?.selectedOptionId !== null
                    const isCurrent = index === currentQuestionIndex
                    
                    return (                      <Button
                        key={question.id}
                        variant="ghost"
                        size="sm"
                        className={`w-full justify-start transition-colors duration-200 ${
                          isCurrent 
                            ? "bg-blue-500 text-white shadow-md" 
                            : isAnswered 
                              ? "bg-green-100 text-green-700 hover:bg-green-200" 
                              : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                        style={{
                          WebkitTapHighlightColor: 'transparent'
                        }}
                        onClick={() => goToQuestion(index)}
                      >
                        <div className="flex items-center gap-2">
                          {isAnswered ? (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                          <span>{index + 1}</span>
                        </div>
                      </Button>
                    )
                  })}
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-200 flex-shrink-0">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-blue-500 hover:bg-blue-600 focus:bg-blue-600 active:bg-blue-700 text-white transition-colors duration-200"
                    size="lg"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Quiz"}
                  </Button>
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    {answeredCount} of {questions.length} questions answered
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-gray-800">
                    Question {currentQuestionIndex + 1}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousQuestion}
                      disabled={currentQuestionIndex === 0}
                      className="border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextQuestion}
                      disabled={currentQuestionIndex === questions.length - 1}
                      className="border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Question Text */}
                <div className="text-lg font-medium text-gray-800 leading-relaxed">
                  {currentQuestion.questionText}
                </div>

                {/* Answer Options */}                <div>
                  <MCQAnswerInput
                    options={currentQuestion.answerOptionsSQ.map(opt => opt.answerText)}
                    selectedOption={validSelectedIndex}
                    onOptionSelect={handleAnswerSelect}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={goToPreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous Question
                  </Button>
                  
                  {currentQuestionIndex === questions.length - 1 ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Quiz"}
                    </Button>
                  ) : (
                    <Button
                      onClick={goToNextQuestion}
                      disabled={currentQuestionIndex === questions.length - 1}
                      className="bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200"
                    >
                      Next Question
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MCQPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="mcq-page-container h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-4 overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <Card className="w-full max-w-4xl bg-white/95 backdrop-blur-sm shadow-2xl">
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-lg text-gray-600">Loading quiz...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <MCQContent params={params} />
    </Suspense>
  )
}
