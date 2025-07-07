"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, MessageCircle, LogOut, Play, Crown, Check, UserPlus, Timer, Target, Plus, CheckCircle, X, Upload, BarChart3, Home, BookOpen, Settings } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import PlayerList from "@/components/player-list"
import RoomCodeDisplay from "@/components/room-code-display"
import PDFUploadModal from "@/components/pdf-upload-modal"
import ChatRoom from "@/components/chat-room"
import TimerWidget from "@/components/timer-widget"
import StudyStats from "@/components/study-stats"
import SessionGoals, { Goal } from "@/components/session-goals"
import DiscordLinkButton from "@/components/discord-link-button"
import { useGameContext } from "@/context/game-context"
import { useAuth } from "@/context/auth-context"
import { useStomp } from "@/context/StompContextType"
import type { Question, QuestionSettings, SummarySettings, MCQSettings } from "@/types/game"
import { use } from "react"
import type { StompSubscription } from "@stomp/stompjs"
import { set } from "date-fns"
import "@/styles/strategic-mind.css"; // Import the new CSS file
import { LectureList } from "@/components/lecture-list";
import { SessionList } from "@/components/session-list";
import { getApiUrl } from '@/lib/api';

export default function Lobby({ params }: { params: Promise<{ roomCode: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const { roomCode } = use(params)
  const [isHost, setIsHost] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [questionsGenerated, setQuestionsGenerated] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadFailed, setUploadFailed] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const { setGameState, addQuestion } = useGameContext()
  const { user, loading } = useAuth()
  const [storedIsHost, setStoredIsHost] = useState(true)
  const { subscribeToTopic, unsubscribeFromTopic, stompClient } = useStomp()
  const subscriptionRef = useRef<StompSubscription | null>(null)
  const hasManuallyLeftRef = useRef(false) // Track manual leave action
  const [players, setPlayers] = useState<any[]>([])
  const isLecturesFetched = useRef<boolean>(false) // Track if lectures have been fetched
  const [archiveRoom, setArchiveRoom] = useState<boolean>(false)
  const [needsRejoin, setNeedsRejoin] = useState(false)
  const [isRejoining, setIsRejoining] = useState(false)
  const [hasLeftRoom, setHasLeftRoom] = useState(false)
  const [isRequestingHost, setIsRequestingHost] = useState(false) // New state for host request
  const isReload = useRef(false)
  const [roomLoading, setRoomLoading] = useState(true) // New loading state
  const [showTimer, setShowTimer] = useState(false) // Timer modal state
  const [showStudyGoal, setShowStudyGoal] = useState(false) // Study goal modal state
  const isCleaningUpTimer = useRef(false) // Flag to prevent conflicts during timer cleanup
  const [timerDuration, setTimerDuration] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`timer_${roomCode}`)
        if (saved) {
          const timerData = JSON.parse(saved)
          
          // If timer is running, calculate the remaining time
          if (timerData.isRunning && timerData.startTime) {
            const elapsed = Math.floor((Date.now() - timerData.startTime) / 1000)
            const remaining = Math.max(0, timerData.duration - elapsed)
            console.log("🔄 [TIMER_INIT] Calculated remaining time from localStorage:", {
              originalDuration: timerData.duration,
              elapsed,
              remaining,
              startTime: new Date(timerData.startTime).toISOString()
            })
            return remaining
          }
          
          return timerData.duration || 25*60
        }
      } catch (e) {
        console.warn("Failed to parse timer data from localStorage:", e)
      }
    }
    return 25*60 // Default 25 minutes
  })
  const [timerDescription, setTimerDescription] = useState<string>(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`timer_${roomCode}`)
        if (saved) {
          const timerData = JSON.parse(saved)
          return timerData.description || ""
        }
      } catch (e) {
        console.warn("Failed to parse timer data from localStorage:", e)
      }
    }
    return ""
  })
  const [isTimerRunning, setIsTimerRunning] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`timer_${roomCode}`)
        if (saved) {
          const timerData = JSON.parse(saved)
          return timerData.isRunning || false
        }
      } catch (e) {
        console.warn("Failed to parse timer data from localStorage:", e)
      }
    }
    return false
  })
    const [lectures, setLectures] = useState<{
    lectureId: number; title: string; creationTime: string 
}[]>([]);

  // Sessions state
  const [sessions, setSessions] = useState<{
    id: number; title: string;
  }[]>([]);
  const [showSessionList, setShowSessionList] = useState(false);
  const isSessionsFetched = useRef<boolean>(false);



  // Modern Tab System State - Changed to allow multiple tabs to be open
  const [visibleTabs, setVisibleTabs] = useState<Set<string>>(new Set(['study-room'])) // Start with study room visible

  // Chat notification state
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false) // Track if there are unread messages
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0) // Track last seen message count when chat was open
  
  // Messages state
  const [messages, setMessages] = useState<any[]>([]) // State for chat messages
  const messagesRef = useRef<any[]>([]) // Ref to track current messages for access in callbacks
  
  // Update ref whenever messages change
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])
  
  // Toggle function for tabs - memoized to prevent unnecessary re-renders
  const toggleTab = useCallback((tabId: string) => {
    setVisibleTabs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tabId)) {
        newSet.delete(tabId)
      } else {
        newSet.add(tabId)
        // When opening chat, clear notifications and update last seen message count
        if (tabId === 'chat') {
          setHasUnreadMessages(false)
          setLastSeenMessageCount(messagesRef.current.length)
        }
      }
      return newSet
    })
  }, []) // No dependencies needed


  const handleLectureSelect = (lectureId: string) => {
    console.log("🎓 [LECTURE_SELECT] Lecture selected:", lectureId);
    
    // Find the selected lecture from the lectures array (convert id to string for comparison)
    const selectedLecture = lectures.find((lecture) => String(lecture.lectureId) === lectureId);
    
    if (!selectedLecture) {
      console.error("❌ [LECTURE_SELECT] Lecture not found with ID:", lectureId);
      
      toast({
        title: "Error",
        description: "Selected lecture not found",
        variant: "destructive"
      });
      return;
    }

  router.push(`/lec/${selectedLecture.lectureId}`)

  

   
  };

  const handleSessionSelect = (sessionId: string) => {
    console.log("🎮 [SESSION_SELECT] Session selected:", sessionId);
    
    // Find the selected session from the sessions array (convert id to string for comparison)
    const selectedSession = sessions.find((session) => String(session.id) === sessionId);
    
    if (!selectedSession) {
      console.error("❌ [SESSION_SELECT] Session not found with ID:", sessionId);
      
      toast({
        title: "Error",
        description: "Selected session not found",
        variant: "destructive"
      });
      return;
    }

    // Close the session list
    setShowSessionList(false);

    // add exam to Scheduler and trigger event for other users to open exam
    const res = fetch(getApiUrl("api/v1/scheduler/schedule"), 
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",       
          Authorization: `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          roomId: roomCode,
          collectorId : selectedSession.id,

        }),
      }
    ).then((response) => {
      if (response.ok) {
        return response.json().then((data) => {
          console.log("📥 [SESSION_SELECT] Added session to room:", data);

          // You can add any additional logic here, such as updating state or notifying users
        });
      }
    });

    router.push(`/mcq/${selectedSession.id}?roomCode=${roomCode}`);
 

  }


  
  const [originalTimerDuration, setOriginalTimerDuration] = useState(() => {
    // Initialize original duration from localStorage if available
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`timer_${roomCode}`)
        if (saved) {
          const timerData = JSON.parse(saved)
          return timerData.originalDuration || timerData.duration || 25*60
        }
      } catch (e) {
        console.warn("Failed to parse timer data from localStorage:", e)
      }
    }
    return 25*60 // Default 25 minutes
  })
  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<string[]>([]) // Array of users currently typing
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Timeout for clearing typing status



  // Debug: Log typing users changes - only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("⌨️ [LOBBY] Typing users changed:", typingUsers)
    }
  }, [typingUsers])

  // Effect to update last seen message count when chat is open and messages change
  // Debounced to prevent excessive updates
  useEffect(() => {
    if (visibleTabs.has('chat') && messages.length > 0) {
      const timeoutId = setTimeout(() => {
        setLastSeenMessageCount(messages.length)
        setHasUnreadMessages(false) // Clear notifications when chat is open
      }, 100) // Small delay to batch updates
      
      return () => clearTimeout(timeoutId)
    }
  }, [messages.length, visibleTabs]) // Only depend on message count, not the whole array

  // Debug effect - only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("🔔 [NOTIFICATION_DEBUG] Notification state:", {
        hasUnreadMessages,
        lastSeenMessageCount,
        currentMessageCount: messages.length,
        isChatOpen: visibleTabs.has('chat')
      })
    }
  }, [hasUnreadMessages, lastSeenMessageCount, messages.length, visibleTabs])



  // Study Stats state variables  
 
  const [studyTimeMinutes, setStudyTimeMinutes] = useState(0) // Demo: 3 hours
  const [practiceTimeMinutes, setPracticeTimeMinutes] = useState(0) // Demo: 2 hours
  const [sessionGoalHours, setSessionGoalHours] = useState(0) // Default: 0 hours
  // Study goal modal state
  const [tempStudyGoal, setTempStudyGoal] = useState(0)
  // Session goals state
  const [sessionGoals, setSessionGoals] = useState<Goal[]>([])
  // Discord link state
  const [discordLink, setDiscordLink] = useState<string>("") // Default link
  // Removed canvas animation for better performance

  useEffect(() => {
    document.body.classList.add("strategic-mind-active");
    return () => {
      document.body.classList.remove("strategic-mind-active");
    };
  }, []);


  const getLocalName = () => {
    if (typeof window !== "undefined" ) {
      const savedName = localStorage.getItem("study-squad-user");
      return savedName ? JSON.parse(savedName).name : "Anonymous";
    }
    return "Anonymous"
  }

  const username = user?.name || getLocalName()

  // Memoize chat-related data to prevent unnecessary re-renders
  const chatData = useMemo(() => ({
    messages,
    typingUsers,
    hasUnread: hasUnreadMessages && !visibleTabs.has('chat')
  }), [messages, typingUsers, hasUnreadMessages, visibleTabs])

  // Function to send message via fetch request - optimized for performance
  const sendMessage = useCallback(async (messageContent: string) => {
    if (!user || !roomCode || !messageContent.trim()) {
      return false
    }

    try {
      const requestBody = {
        roomJoinCode: roomCode,
        msgContent: messageContent.trim(),
      }

      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/messages/send"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        return true
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }))
        toast({
          title: "Error",
          description: `Failed to send message: ${errorData.message}`,
          variant: "destructive"
        })
        return false
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
      return false
    }
  }, [user, roomCode, toast])
  



  // Function to handle typing indicator - optimized
  const handleTypingStart = useCallback(() => {
    if (!user || !roomCode) return
    
    // TEMP: Add current user to typing array for testing UI
    setTypingUsers(prev => {
      if (!prev.includes(user.name)) {
        return [...prev, user.name]
      }
      return prev
    })
    
    // Send typing event to server via WebSocket
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: "/app/typing",
        body: JSON.stringify({
          roomJoinCode: roomCode,
          username: user.name,
          typing: true
        })
      })
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop()
    }, 3000)
  }, [user, roomCode, stompClient])

  // Function to handle stop typing - optimized
  const handleTypingStop = useCallback(() => {
    if (!user || !roomCode) return
    
    // TEMP: Remove current user from typing array for testing UI
    setTypingUsers(prev => prev.filter(u => u !== user.name))
    
    // Send stop typing event to server via WebSocket
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: "/app/typing",
        body: JSON.stringify({
          roomJoinCode: roomCode,
          username: user.name,
          isTyping: false
        })
      })
    }

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [user, roomCode, stompClient])

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])



  const updateRoomStats = async () => {

    const res = await fetch(getApiUrl("api/v1/squadgames/rooms/session-time"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user?.access_token}`,
      },
      body: JSON.stringify({
        roomJoinCode: roomCode,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      console.log("📊 [ROOM_STATS] Updated room stats:", data)

      // Update study and practice time based on server data
      setStudyTimeMinutes(data.roomStudyMinutes || 0)
      setPracticeTimeMinutes(data.roomPractiseMinutes || 0)

      // Update session goals if available
      if (data.sessionGoals) {
        setSessionGoals(data.sessionGoals)
      }

    }



  }





  const leaveRoom = useCallback(() => {
    if (!user || !roomCode) {
      console.warn("leaveRoom called without user or roomCode. Aborting API call.")
      return
    }

    console.log("🚪 [LEAVE_ROOM] Leaving room:", { roomCode, user: user.name });

    if (isReload) {
      console.log("🔄 [LEAVE_ROOM] Page reload detected, setting needsRejoin flag");
      setNeedsRejoin(true);
    }

    const url = getApiUrl("api/v1/squadgames/rooms/leave-room")
    const body = JSON.stringify({
      roomJoinCode: roomCode,
      archive: false,
    })

    try {
      // Use fetch with keepalive flag for reliable request on unload
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body,
        // The keepalive flag ensures the request continues even if the page is being unloaded
        keepalive: true,
      }).then(response => {
        if (response.ok) {
          console.log("✅ [LEAVE_ROOM] Successfully left room");
          localStorage.removeItem(`sessionGoal_${roomCode}`);


        } else {
          console.error("❌ [LEAVE_ROOM] Failed to leave room:", response.status, response.statusText);
        }
      }).catch(error => {
        console.error("❌ [LEAVE_ROOM] Error leaving room:", error);
      });
      
      console.log("📤 [LEAVE_ROOM] Leave room request sent");
    } catch (e) {
      console.error("❌ [LEAVE_ROOM] Could not send leave room request:", e)
    }
  }, [user, roomCode])

  // Function to save timer state to localStorage
  const saveTimerToLocalStorage = useCallback((duration: number, description: string, isRunning: boolean, startTime?: number, originalDuration?: number) => {
    if (typeof window !== "undefined") {
      const timerData = {
        duration,
        description,
        isRunning,
        timestamp: Date.now(),
        startTime: startTime || Date.now(), // When the timer actually started
        originalDuration: originalDuration || duration // Store original duration for progress calculation
      }
      localStorage.setItem(`timer_${roomCode}`, JSON.stringify(timerData))
      console.log("💾 [TIMER_STORAGE] Saved timer to localStorage:", timerData)
    }
  }, [roomCode])

  // Function to clear timer from localStorage
  const clearTimerFromLocalStorage = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`timer_${roomCode}`)
      console.log("🗑️ [TIMER_STORAGE] Cleared timer from localStorage")
    }
  }, [roomCode])

  // Function to handle timer started event from server
  const handleTimerStartedFromServer = useCallback((timerData: { 
    timerDurationInSeconds: number, 
    sessionGoals: string, 
    roomJoinCode: string, 
    timerEnabled: boolean,
    startTime?: number
  }) => {
    console.log("🔔 [TIMER_STARTED] Received timer data from server:", timerData)
    
    const serverStartTime = timerData.startTime || Date.now()
    const elapsed = Math.floor((Date.now() - serverStartTime) / 1000)
    const remainingTime = Math.max(0, timerData.timerDurationInSeconds - elapsed)
    
    console.log("🔔 [TIMER_STARTED] Timer sync calculation:", {
      serverStartTime: new Date(serverStartTime).toISOString(),
      elapsed,
      originalDuration: timerData.timerDurationInSeconds,
      remainingTime
    })
    
    // Update all timer states from server with calculated remaining time
    setTimerDuration(remainingTime)
    setTimerDescription(timerData.sessionGoals || "")
    setIsTimerRunning(timerData.timerEnabled)
    setOriginalTimerDuration(timerData.timerDurationInSeconds)
    
    // Save timer state to localStorage when timer starts
    saveTimerToLocalStorage(timerData.timerDurationInSeconds, timerData.sessionGoals || "", timerData.timerEnabled, serverStartTime, timerData.timerDurationInSeconds)
    
    // Automatically open timer tab when timer starts for all users
    setVisibleTabs(prev => new Set([...prev, 'timer']))
    
    toast({
      title: "Timer Started",
      description: `Study timer started for ${Math.floor(timerData.timerDurationInSeconds / 60)} minutes`,
    })
  }, [toast, saveTimerToLocalStorage, setVisibleTabs])

  // Function to handle timer stopped event from server
  const handleTimerStoppedFromServer = useCallback((timerData: { 
    roomJoinCode: string, 
    timerEnabled: boolean 
  }) => {
    console.log("🛑 [TIMER_STOPPED] Received timer stopped data from server:", timerData)
    
    // Complete timer cleanup - stop all timer states and clear storage
    setIsTimerRunning(false)
    setTimerDuration(25 * 60) // Reset to default 25 minutes
    setTimerDescription("") // Clear description
    setOriginalTimerDuration(25 * 60) // Reset original duration
    
    // Clear timer from localStorage when timer is stopped by server
    clearTimerFromLocalStorage()
    
    console.log("🛑 [TIMER_STOPPED] Timer stopped successfully, all states reset and localStorage cleared")
    
    toast({
      title: "Timer Stopped",
      description: "Study timer has been stopped",
    })
  }, [toast, clearTimerFromLocalStorage])

  



  const fetchRoomMembers = useCallback(() => {
    if (stompClient && stompClient.connected && roomCode) {
      console.log("📡 [FETCH_MEMBERS] Sending room members request", { roomCode, connected: stompClient.connected });
      stompClient.publish({
        destination: "/app/room-members",
        body: JSON.stringify({ roomJoinCode: roomCode }),
      })
    } else {
      console.warn("⚠️ [FETCH_MEMBERS] Cannot fetch room members:", {
        hasStompClient: !!stompClient,
        isConnected: stompClient?.connected,
        hasRoomCode: !!roomCode
      });
    }
  }, [stompClient, roomCode])


  const fetchRoomMessages = useCallback(() => {
    if (stompClient && stompClient.connected && roomCode) {
      console.log("📡 [FETCH_MEMBERS] Sending room members request", { roomCode, connected: stompClient.connected });
      stompClient.publish({
        destination: "/app/room-messages",
        body: JSON.stringify({ roomJoinCode: roomCode }),
      })
    } else {
      console.warn("⚠️ [FETCH_MEMBERS] Cannot fetch room members:", {
        hasStompClient: !!stompClient,
        isConnected: stompClient?.connected,
        hasRoomCode: !!roomCode
      });
    }
  }, [stompClient, roomCode])



  const setRoomGoalStudyHours = () => {
    if(!user || !roomCode) {
      console.warn("Cannot set room goal: missing user or room code")
      return
    }
    if (sessionGoalHours <= 0) {
      const hours = localStorage.getItem(`sessionGoal_${roomCode}`)
      if (hours) {
        setSessionGoalHours(JSON.parse(hours))
      } else {
        const res = fetch(getApiUrl("api/v1/squadgames/rooms/room-hours-goal"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.access_token}`
          },
          body: JSON.stringify({ roomJoinCode: roomCode })
        }).then((response) => {
          if (response.ok) {
            return response.json().then((data) => {
              console.log("📥 [SET_ROOM_HOURS_GOAL] Fetched room hours goal:", data)
              setSessionGoalHours(data.roomHoursGoal || 0)
              localStorage.setItem(`sessionGoal_${roomCode}`, JSON.stringify(data.roomHoursGoal || 0))
              return data.roomHoursGoal || 0
            })
          } else {
            console.error("❌ [SET_ROOM_HOURS_GOAL] Failed to fetch room hours goal")
            return 0
          }
        })



      }
    }

  }



  
  const handleRoomMessage = useCallback(
    (message: { body: any }) => {
      try {
        const response = JSON.parse(message.body)
        
         if (response.eventType === "ROOM_MEMBERS_LIST") {
          fetchRoomMessages();
          getGoalsFromServer();
          setRoomGoalStudyHours();
          fetchDiscordLink();
          fetchLectures();
          fetchSessions();
          updateRoomStats();

          const newPlayers = Array.isArray(response.payload) ? response.payload : [];
        
          setPlayers(newPlayers);
          setRoomLoading(false); // Mark room data as loaded after first fetch
          // Directly update host status here when we get new player data
          if (user && user.name) {
            const currentUserIsHost = newPlayers.some(
              (player: any) => player.host && player.username === user.name
            );
            setIsHost(currentUserIsHost);
            setStoredIsHost(currentUserIsHost);
          }
        } 
         if (response.eventType === "SET_ROOM_HOURS_GOAL") {
          setSessionGoalHours(response.payload);
          localStorage.setItem(`sessionGoal_${roomCode}`, JSON.stringify(response.payload))
        }

        if(response.eventType === "EXAM_STARTED") {
          const collectorId = response.payload;
          leaveRoom(); // Leave the room before opening exam page
          // Open the exam page in a new tab
          router.push(`/mcq/${collectorId}?roomCode=${roomCode}`);
        }

         if (response.eventType === "SET_DISCORD_LINK") {
          setDiscordLink(response.payload);
        }
         if (response.eventType === "PLAYER_READY") {
          fetchRoomMembers()
        } 
          if (response.eventType === "ROOM_SESSIONS") {
          getGoalsFromServer();
        }  
        if (response.eventType === "USER_LEFT") {
          fetchRoomMembers()
        } 
        if (response.eventType === "NEW_USER_JOINED") {
          fetchRoomMembers()
        }
        if (response.eventType === "SEND_MESSAGE" || response.eventType === "GET_ALL_MESSAGES") {
          // Handle message received event from server - server returns ALL messages, not just new one
          if (response.payload && Array.isArray(response.payload)) {
            // Server sends all messages as an array, so we replace the entire messages array
            const allMessages = response.payload.map((msgData: any) => ({
              id: `msg-${msgData.id}`, // Use server's message ID
              message: msgData.msgContent || "",
              senderName: msgData.username || "Unknown User",
              timestamp: msgData.createdAt ? new Date(msgData.createdAt).getTime() : Date.now(),
            }))
            
            // Sort messages by timestamp (oldest to newest) - only if needed
            const sortedMessages = allMessages.length > 1 
              ? allMessages.sort((a: any, b: any) => a.timestamp - b.timestamp)
              : allMessages

            // Batch state updates to prevent multiple re-renders
            setMessages(prev => {
              // Only update if messages actually changed
              const shouldUpdate = prev.length !== sortedMessages.length || 
                  (sortedMessages.length > 0 && prev[prev.length - 1]?.id !== sortedMessages[sortedMessages.length - 1]?.id)
              
              if (shouldUpdate) {
                // Check if chat is closed and we have new messages to show notification
                // Access current state through a ref or closure to avoid stale state
                const currentVisibleTabs = visibleTabs
                const currentLastSeenCount = lastSeenMessageCount
                const isChatClosed = !currentVisibleTabs.has('chat')
                const hasNewMessages = sortedMessages.length > currentLastSeenCount
                
                if (isChatClosed && hasNewMessages && response.eventType === "SEND_MESSAGE") {
                  // Use requestAnimationFrame to defer notification update
                  requestAnimationFrame(() => setHasUnreadMessages(true))
                }
                
                return sortedMessages
              }
              return prev
            })
          }
        }
         if (response.eventType === "TIMER_STARTED") {
          // Handle timer started event from server
          handleTimerStartedFromServer(response.payload)
        }

        if (response.eventType === "UPDATE_LECTURE_LIST") {
          setLectures(response.payload);
        }
        if (response.eventType === "UPDATE_SESSION_LIST") {
          setSessions(response.payload);
        }

         if (response.eventType === "TIMER_STOPED") {
          // Handle timer stopped event from server
          handleTimerStoppedFromServer(response.payload);
        }
        if (response.eventType === "USER_TYPING") {
          // Handle typing indicator events - optimized
          const { username, typing } = response.payload

          if (username !== user?.name) { // Don't show own typing indicator
            setTypingUsers(prev => {
              if (typing) {
                // Add user to typing list if not already there
                return prev.includes(username) ? prev : [...prev, username]
              } else {
                // Remove user from typing list
                return prev.filter(u => u !== username)
              }
            })
          }
        }
        if (response.eventType === "ROOM_SESSION_TIME_UPDATE") {
         const data = response.payload;
          
          // Update study and practice time based on server data
          setStudyTimeMinutes(data.roomStudyMinutes);
          setPracticeTimeMinutes(data.roomPractiseMinutes);
          
        }
        
      } catch (err) {
        console.error("Lobby: Failed to parse or process room message", err)
      }
    },
    [fetchRoomMembers, toast, user, handleTimerStartedFromServer, handleTimerStoppedFromServer]
  )



  

  // Effect to update host status whenever players or user changes
  useEffect(() => {
    console.log(`[Host Effect] Checking host status. Loading: ${loading}, User: ${user?.name}, Players: ${players.length}`);
    
    if (loading || !user) {
      console.log(`[Host Effect] User not ready, setting isHost to false`);
      setIsHost(false);
      setStoredIsHost(false);
      return;
    }
    
    // Check host status from players array
    if (players && players.length > 0) {
      const currentUserIsHost = players.some(
        (player: any) => player.host && player.username === user.name
      );
      console.log(`[Host Effect] User: ${user.name}, IsHost: ${currentUserIsHost}`, players);
      setIsHost(currentUserIsHost);
      setStoredIsHost(currentUserIsHost);
    } else {
      console.log(`[Host Effect] No players data, setting isHost to false`);
      setIsHost(false);
      setStoredIsHost(false);
    }
  }, [players, user, loading]); // Include players in dependencies

  useEffect(() => {
    if (loading || !user || !roomCode || !stompClient) {
      return
    }

    console.log(players, "✅ Conditions met. Setting up STOMP subscription and fetching members...")

    // Function to join room on mount
    const joinRoomOnMount = async () => {
      try {
        console.log("🔗 [JOIN_ON_MOUNT] Joining room on component mount:", roomCode)
        const response = await fetch(getApiUrl("api/v1/squadgames/rooms/join"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.access_token}`,
          },
          body: JSON.stringify({ roomJoinCode: roomCode }),
        })

        if (response.ok) {
          console.log("✅ [JOIN_ON_MOUNT] Successfully joined room on mount")
        } else {
          console.warn("⚠️ [JOIN_ON_MOUNT] Failed to join room on mount:", response.status)
        }
      } catch (error) {
        console.error("❌ [JOIN_ON_MOUNT] Error joining room on mount:", error)
      }
    }

    // Execute join room on every mount
    joinRoomOnMount()

    const topic = `/topic/rooms/${roomCode}`
    const currentSubscription = subscribeToTopic(topic, handleRoomMessage)
    subscriptionRef.current = currentSubscription

    fetchRoomMembers()

    // The cleanup function now ONLY handles unsubscribing from the STOMP topic.
    return () => {
      console.log("❌ Component is unmounting. Cleaning up subscriptions...")
      if (subscriptionRef.current) {
        unsubscribeFromTopic(topic)
        subscriptionRef.current = null
        console.log("Unsubscribed from STOMP topic.")
      }
    }
  }, [
    user,
    loading,
    roomCode,
    stompClient,
    subscribeToTopic,
    unsubscribeFromTopic,
    handleRoomMessage,
    fetchRoomMembers,
  ])

  // Additional useEffect to fetch room members when STOMP connection becomes ready
  // This is especially important for rejoin scenarios
  useEffect(() => {
    if (stompClient && stompClient.connected && roomCode && user && !loading) {
      console.log("🔗 [STOMP_READY] STOMP client connected, checking if we need to fetch room members");
      
      // If we have no players and room is not loading, fetch members
      if (players.length === 0 && !roomLoading) {
        console.log("📡 [STOMP_READY] No players found, fetching room members...");
        fetchRoomMembers();
      }
    }
  }, [stompClient?.connected, roomCode, user, loading, players.length, roomLoading, fetchRoomMembers])

  // Check for page reload and show alert using sessionStorage
  useEffect(() => {
    const checkPageReload = async () => {
      try {
        if (typeof window === "undefined") return;

        if (sessionStorage.getItem(`reloading_${roomCode}`)) {
            console.log("🔄 Page reload detected using sessionStorage");
            sessionStorage.removeItem(`reloading_${roomCode}`); // Clean up the flag

            // Set flag that user might need to rejoin
            setNeedsRejoin(true);

            // Wait for user authentication to complete before proceeding
            if (loading) {
                console.log("⏳ Still loading user authentication, waiting...");
                return;
            }
            
            // Try to auto-rejoin if user is authenticated
            if (user) {
                console.log("🔄 Auto-rejoining room after reload...");
                try {
                    const response = await fetch(getApiUrl("api/v1/squadgames/rooms/join"), {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${user.access_token}`,
                        },
                        body: JSON.stringify({ roomJoinCode: roomCode, rejoin: true }),
                    });

                    if (response.ok) {
                        console.log("✅ Successfully auto-rejoined room after reload");
                        setNeedsRejoin(false);
                        
                        // Robustly wait for STOMP connection and fetch members
                        const waitForStompAndFetch = async (retries = 0, maxRetries = 10) => {
                            if (retries >= maxRetries) {
                                console.error("❌ [AUTO_REJOIN] Max retries reached, could not fetch room members");
                                return;
                            }
                            
                            if (stompClient && stompClient.connected) {
                                console.log(`✅ [AUTO_REJOIN] STOMP client ready on attempt ${retries + 1}, fetching room members`);
                                fetchRoomMembers();
                            } else {
                                console.log(`⏳ [AUTO_REJOIN] STOMP client not ready (attempt ${retries + 1}), waiting...`);
                                setTimeout(() => waitForStompAndFetch(retries + 1, maxRetries), 500);
                            }
                        };
                        
                        // Start the process
                        waitForStompAndFetch();
                        
                    } else {
                        console.warn("⚠️ Failed to auto-rejoin room, server responded with error.");
                        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
                        toast({ title: "Rejoin Failed", description: errorData.message, variant: "destructive" });
                    }
                } catch (err) {
                    console.error("❌ Error auto-rejoining room:", err);
                }
            } else {
                console.warn("⚠️ No user found after reload, user may need to login again");
            }
        }
      } catch (error) {
        console.error("Error checking page reload:", error);
      }
    };

    // Run the check after the initial render and user loading is complete
    if (!loading) {
      checkPageReload();
    }
    
  }, [roomCode, toast, user, loading, router, stompClient, fetchRoomMembers])
  
  // This new useEffect handles leaving the room automatically when the user closes the tab.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Set a flag in sessionStorage to indicate a reload is in progress
      // This flag will be checked by the next page load's useEffect
      sessionStorage.setItem(`reloading_${roomCode}`, 'true');

      // This part is for when the user closes the tab/browser, not for reloads
      // We rely on the browser's cleanup and the server's potential WebSocket disconnect handler
      // Or for a more robust solution, use sendBeacon as in the modified leaveRoom function.
    };
    
    const handleUnload = () => {
        // This is a more reliable place for leave actions if `beforeunload` is tricky
        if (user && hasManuallyLeftRef.current === false) {
             console.log("🚪 [UNLOAD] Tab/window closing, calling leaveRoom");
             leaveRoom();
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    // Remove the event listener when the component unmounts to prevent memory leaks.
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [leaveRoom, user, roomCode]); 

  

  const handleFileUploadAndGenerate = (file: File, type: 'summary' | 'mcq', summarySettings?: SummarySettings, mcqSettings?: MCQSettings) => {
    setUploadedFile(file)
    setIsGenerating(true)
    setUploadSuccess(false)
    setUploadFailed(false)
    setQuestionsGenerated(false)
    
    console.log("File upload settings:", { type, summarySettings, mcqSettings });

    const formData = new FormData();
    formData.append("file", file);

    const filename = file.name;

    fetch(getApiUrl("api/v1/rooms/gemini/upload"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${user?.access_token}`,
      },
      body: formData,
    })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to upload file")
      }

      const data = await response.json();
      const { mimeType, uri } = data.file || {};
      
      // Show upload success toast
      toast({
        title: "File Uploaded Successfully",
        description: `Now generating ${type === 'summary' ? 'study materials' : 'MCQ questions'} from your PDF...`,
      })
      
      setUploadSuccess(true)
      // Generate content based on type
      if (type === 'summary') {
        return generateSummary(mimeType, uri, summarySettings!, filename);
      } else {
        return generateMCQs(mimeType, uri, mcqSettings!, filename);
      }
    })
    .catch((error) => {
      console.error("Error uploading file:", error)
      toast({
        title: "Upload Failed",
        description: "There was an error uploading the file. Please try again.",
        variant: "destructive",
      })
      setIsGenerating(false)
      setUploadSuccess(false)
      setUploadFailed(true)
    })
  }


  


  const generateSummary = (mimeType: string, uri: string, settings: SummarySettings, filename: string): Question[] => {
    console.log("mimeType:", mimeType);
    console.log("uri:", uri);
    console.log("Summary settings:", settings);

    fetch(getApiUrl("api/v1/rooms/gemini/study/generate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user?.access_token}`,
      },
      body: JSON.stringify({
        fileUri: uri,
        title: filename,
        createMindmap: settings.createMindmap,
        createDefinitions: settings.createDefinitions,
        createQA: settings.createQA,
        createStepbystep: settings.createStepbystep,
        roomJoinCode: roomCode
      }),
    })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to generate summary")
      }
      const data = await response.json();
      console.log("!!!!!!!!!!!!!!! Summary Response !!!!!!!!!!!:", data);
      
      // Set generation complete and show success message
      setQuestionsGenerated(true)
      setIsGenerating(false)
      fetchSessions();

      toast({
        title: "Study Materials Generated Successfully!",
        description: `Successfully generated study materials from ${filename}`,
      })

    }).catch((error) => {
      console.error("Error generating summary:", error)
      setIsGenerating(false)
      setUploadSuccess(false)
      setUploadFailed(true)
      toast({
        title: "Generation Failed",
        description: "There was an error generating study materials. Please try again.",
        variant: "destructive",
      })
    });

    return [];
  }

  const generateMCQs = (mimeType: string, uri: string, settings: MCQSettings, filename: string): Question[] => {
    console.log("mimeType:", mimeType);
    console.log("uri:", uri);
    console.log("MCQ settings:", settings);

    fetch(getApiUrl("api/v1/rooms/gemini/practise/generate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user?.access_token}`,
      },
      body: JSON.stringify({
        fileUri: uri,
        title: filename,
        practicalQuestions: settings.type === 'practical',
        theoreticalQuestions: settings.type === 'theoretical',
        roomJoinCode: roomCode
      }),
    })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to generate MCQs")
      }
      const data = await response.json();
      console.log("!!!!!!!!!!!!!!! MCQ Response !!!!!!!!!!!:", data);
      
      // Set generation complete and show success message
      setQuestionsGenerated(true)
      setIsGenerating(false)
      fetchSessions();

      toast({
        title: "MCQ Questions Generated Successfully!",
        description: `Successfully generated MCQ questions from ${filename}`,
      })

    }).catch((error) => {
      console.error("Error generating MCQs:", error)
      setIsGenerating(false)
      setUploadSuccess(false)
      setUploadFailed(true)
      toast({
        title: "Generation Failed",
        description: "There was an error generating MCQ questions. Please try again.",
        variant: "destructive",
      })
    });

    return [];
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    setQuestionsGenerated(false)
    setUploadSuccess(false)
    setUploadFailed(false)
  }

  const handleStartGame = () => {
    console.log("Starting game...")
    router.push(`/play/${roomCode}`)
  }

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomCode)
    toast({
      title: "Copied!",
      description: "Room code copied to clipboard.",
    })
  }

  const setNewHost = async () => {
    console.log("Attempting to set new host...");
    setIsRequestingHost(true);
    
    if(loading) {
      console.warn("Still loading user, cannot set new host yet.");
      toast({ title: "Loading", description: "Please wait until the session is fully loaded.", variant: "destructive" });
      setIsRequestingHost(false);
      return;
    }

    if (!user || !roomCode) {
      console.error("Missing user or room code when trying to set new host.");
      toast({ title: "Error", description: "You must be logged in to set a host.", variant: "destructive" });
      setIsRequestingHost(false);
      return;
    }

    try {
      const res = await fetch(getApiUrl("api/v1/squadgames/rooms/set-host"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ roomJoinCode: roomCode}),
      });

      if (res.ok) {
        console.log("Successfully set new host.");
        toast({ title: "Host Set", description: "You are now the host of this room." });
        
        // Force refresh the room members to get updated host status
        setTimeout(() => {
          fetchRoomMembers();
        }, 500);
        
      } else {
        let errorMsg = "Failed to set host.";
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) {
          // Response might not be JSON, stick to default error.
        }
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error setting host:", error);
      toast({ title: "Error", description: "An error occurred while setting host.", variant: "destructive" });
    } finally {
      setIsRequestingHost(false);
    }
  };
  
  // This function now explicitly calls leaveRoom before navigating.
  const handleLeaveRoom = async () => {
  
    hasManuallyLeftRef.current = true; // Mark as manual leave
    setHasLeftRoom(true); 
    
    // Use the manual leave function for proper API call
    const success = await manualLeaveRoom();
    
    if (success) {
      router.push('/'); // Navigate home after successful leave
    } else {
      // Even if the API call failed, still navigate away
      console.warn("⚠️ [HANDLE_LEAVE] API call failed but navigating anyway");
      router.push('/');
    }
  };

  // Function specifically for manual leave room action
  const manualLeaveRoom = useCallback(async () => {
    if (!user || !roomCode) {
      console.warn("manualLeaveRoom called without user or roomCode. Aborting API call.")
      return false
    }

    console.log("🚪 [MANUAL_LEAVE] Manually leaving room:", { roomCode, user: user.name });

    const url = getApiUrl("api/v1/squadgames/rooms/leave-room")
    const body = JSON.stringify({
      roomJoinCode: roomCode,
      archive: false,
    })

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body,
      })

      if (response.ok) {
        console.log("✅ [MANUAL_LEAVE] Successfully left room");
        localStorage.removeItem(`sessionGoal_${roomCode}`);

        return true
      } else {
        console.error("❌ [MANUAL_LEAVE] Failed to leave room:", response.status, response.statusText);
        return false
      }
    } catch (error) {
      console.error("❌ [MANUAL_LEAVE] Error leaving room:", error)
      return false
    }
  }, [user, roomCode])


const fetchLectures = async () => {

  if(isLecturesFetched.current) {
    console.log("📚 [FETCH_LECTURES] Lectures already fetched, skipping request");
    return;
  }

    
    
    const res = await fetch(getApiUrl("api/v1/rooms/gemini/study/lectures/" + roomCode), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user?.access_token}`,
      },
    });
    if (!res.ok) {
      console.error("❌ [FETCH_LECTURES] Failed to fetch lectures:", res.statusText);
      toast({
        title: "Error",
        description: "Failed to fetch lectures. Please try again.",
        variant: "destructive"
      });
      const data = await res.json().catch(() => ({ message: "Unknown error" }));
      //setLectures(data); // Set to empty array on error
      isLecturesFetched.current = true; // Mark as fetched to prevent retries
      return;
    }

    // If response is ok, parse JSON and update lectures
    const data = await res.json();
    setLectures(data);
  }
  const fetchSessions = async () => {
    
    if (!user || !roomCode) {
      console.warn("⚠️ [FETCH_SESSIONS] Cannot fetch sessions: missing user or room code");
      return;
    }
    
    console.log("📡 [FETCH_SESSIONS] Fetching sessions from server", { roomCode, user: user.name });
    
    try {
      const res = await fetch(getApiUrl(`api/v1/squadgames/questions-collector/room/${roomCode}`), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
      });

      if (!res.ok) {
        console.error("❌ [FETCH_SESSIONS] Failed to fetch sessions:", res.statusText);
        toast({
          title: "Error",
          description: "Failed to fetch sessions. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // If response is ok, parse JSON and update sessions
      const data = await res.json();
      console.log("✅ [FETCH_SESSIONS] Sessions fetched successfully:", data);
      setSessions(data);
      isSessionsFetched.current = true; // Mark as fetched
    } catch (error) {
      console.error("❌ [FETCH_SESSIONS] Error fetching sessions:", error);
      
    }
  }



  // Function to rejoin the room (similar to join page logic)
  const handleRejoinRoom = async () => {
    console.log("🔄 [REJOIN] Attempting to rejoin room", { roomCode, user: !!user });
    
    if (!user || !roomCode) {
      console.error("❌ [REJOIN] Missing user or roomCode");
      toast({
        title: "Error",
        description: "Cannot rejoin: missing user or room code",
        variant: "destructive"
      });
      return;
    }

    setIsRejoining(true);
    
    try {
      // Send join request to backend (same as join page)
      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/join"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ roomJoinCode: roomCode }),
      });

      if (!response.ok) {
        throw new Error("Failed to rejoin room");
      }

      const data = await response.json();
      console.log("✅ [REJOIN] Successfully rejoined room", data);

      // Reset rejoin state
      setNeedsRejoin(false);
      setHasLeftRoom(false);
      hasManuallyLeftRef.current = false;

      toast({
        title: "Rejoined Room",
        description: "You have successfully rejoined the room",
      });

      // Use the same retry mechanism as auto-rejoin instead of page reload
      const waitForStompAndFetch = async (retries = 0, maxRetries = 5) => {
        if (retries >= maxRetries) {
          console.error("❌ [MANUAL_REJOIN] Max retries reached, refreshing page");
          window.location.reload();
          return;
        }
        
        console.log(`🔄 [MANUAL_REJOIN] Attempt ${retries + 1}/${maxRetries} to fetch room members`);
        
        if (stompClient && stompClient.connected) {
          console.log("✅ [MANUAL_REJOIN] STOMP client ready, fetching room members");
          fetchRoomMembers();
          
        } else {
          console.log("⏳ [MANUAL_REJOIN] STOMP client not ready, waiting...");
          setTimeout(() => waitForStompAndFetch(retries + 1, maxRetries), 500);
        }
      };
      
      // Start the retry process
      setTimeout(() => waitForStompAndFetch(), 500);

    } catch (err) {
      console.error("❌ [REJOIN] Error rejoining room:", err);
      toast({
        title: "Failed to Rejoin",
        description: "Could not rejoin the room. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRejoining(false);
    }
  };

  const handleReady = async () => {
    if (!user || !roomCode) return;
    try {
      await fetch(getApiUrl("api/v1/squadgames/rooms/toggle-ready"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ roomJoinCode: roomCode }),
      });
    } catch (e) {
      toast({ title: "Error", description: "Could not mark as ready.", variant: "destructive" });
    }
  };

  // Function to start timer on server
  const startTimerOnServer = async (duration: number, description: string) => {
    if (!user || !roomCode) {
      console.error("❌ [START_TIMER] Cannot start timer: missing user or room code")
      return false
    }

    console.log("🚀 [START_TIMER] Starting timer on server with:", {
      duration,
      description,
      roomCode,
      user: user.name
    })

    try {
      const requestBody = {
        roomJoinCode: roomCode,
        timerDurationInSeconds: duration,
        sessionGoals: description,
        timerEnabled: true
      }
      
      console.log("📤 [START_TIMER] Request body:", requestBody)

      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/start-timer"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify(requestBody),
      })

      console.log("📥 [START_TIMER] Response status:", response.status, response.statusText)

      if (response.ok) {
        const responseData = await response.json().catch(() => null)
        console.log("✅ [START_TIMER] Timer started successfully on server, response:", responseData)
        return true
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }))
        console.error("❌ [START_TIMER] Failed to start timer on server:", errorData)
        toast({
          title: "Error",
          description: `Failed to start timer: ${errorData.message}`,
          variant: "destructive"
        })
        return false
      }
    } catch (error) {
      console.error("❌ [START_TIMER] Error starting timer on server:", error)
      toast({
        title: "Error", 
        description: "Failed to start timer on server",
        variant: "destructive"
      })
      return false
    }
  }

  // Function to stop timer on server
  const stopTimerOnServer = async () => {
    if (!user || !roomCode) {
      console.error("❌ [STOP_TIMER] Cannot stop timer: missing user or room code")
      return false
    }

    console.log("🛑 [STOP_TIMER] Stopping timer on server for room:", roomCode)

    try {
      const requestBody = {
        roomJoinCode: roomCode,
        timerEnabled: false
      }
      
      console.log("📤 [STOP_TIMER] Request body:", requestBody)

      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/stop-timer"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify(requestBody),
      })

      console.log("📥 [STOP_TIMER] Response status:", response.status, response.statusText)

      if (response.ok) {
        const responseData = await response.json().catch(() => null)
        console.log("✅ [STOP_TIMER] Timer stopped successfully on server, response:", responseData)
        return true
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }))
        console.error("❌ [STOP_TIMER] Failed to stop timer on server:", errorData)
        toast({
          title: "Error",
          description: `Failed to stop timer: ${errorData.message}`,
          variant: "destructive"
        })
        return false
      }
    } catch (error) {
      console.error("❌ [STOP_TIMER] Error stopping timer on server:", error)
      toast({
        title: "Error",
        description: "Failed to stop timer on server", 
        variant: "destructive"
      })
      return false
    }
  }

  // Enhanced timer state change handler that communicates with server
  const handleTimerStateChange = async (isRunning: boolean) => {
    console.log("🎯 [TIMER_STATE_CHANGE] Timer state changing to:", isRunning)
    console.log("🎯 [TIMER_STATE_CHANGE] Current timer data:", {
      duration: timerDuration,
      description: timerDescription,
      isCurrentlyRunning: isTimerRunning
    })
    
    if (isRunning) {
      // Starting timer - communicate with server
      const success = await startTimerOnServer(timerDuration, timerDescription)

      if (success) {
        setIsTimerRunning(true)
        // Save timer state to localStorage when starting
        saveTimerToLocalStorage(timerDuration, timerDescription, true)
        console.log("✅ [TIMER_STATE_CHANGE] Timer started successfully, saved to localStorage")
      } else {
        console.error("❌ [TIMER_STATE_CHANGE] Failed to start timer on server")
      }


    } else {
     console.log("🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯"  +  localStorage.getItem(`timer_${roomCode}`))
      // Stopping timer - communicate with server
      const success = await stopTimerOnServer()
      if (success) {
        // Complete cleanup when stopping timer locally
        setIsTimerRunning(false)
        setTimerDuration(25 * 60) // Reset to default 25 minutes
        setTimerDescription("") // Clear description  
        setOriginalTimerDuration(25 * 60) // Reset original duration
        
        // Clear timer from localStorage when host stops the timer
        clearTimerFromLocalStorage()
        console.log("✅ [TIMER_STATE_CHANGE] Timer stopped successfully, all states reset and cleared from localStorage")
      } else {
        console.error("❌ [TIMER_STATE_CHANGE] Failed to stop timer on server")
      }
    }
  }

  // useEffect to save timer settings to localStorage whenever they change (except when running or during cleanup)
  useEffect(() => {
    // Don't save during cleanup or if timer is running
    if (isCleaningUpTimer.current || isTimerRunning) {
      return
    }
    
    // Don't save the default reset value to prevent conflicts
    if (timerDuration === 25 * 60 && timerDescription === "") {
      return
    }
    
    // Only save if timer has a valid duration
    if (timerDuration > 0) {
      saveTimerToLocalStorage(timerDuration, timerDescription, isTimerRunning)
    }
  }, [timerDuration, timerDescription, isTimerRunning, saveTimerToLocalStorage])

  // Debug useEffect to track timer state changes
  useEffect(() => {
    console.log("🎮 [TIMER_STATE] Timer state changed:", {
      isTimerRunning,
      timerDuration,
      timerDescription,
      showTimer
    })
  }, [isTimerRunning, timerDuration, timerDescription, showTimer])

  // Debug effect to track timer duration changes
  useEffect(() => {
    console.log("⏰ [TIMER_DURATION] Timer duration changed:", {
      duration: timerDuration,
      minutes: Math.floor(timerDuration / 60),
      seconds: timerDuration % 60,
      isHost,
      user: user?.name
    })
  }, [timerDuration, isHost, user])

  // Effect to check and sync timer state on component mount
  useEffect(() => {
    if (typeof window !== "undefined" && roomCode) {
      try {
        const saved = localStorage.getItem(`timer_${roomCode}`)
        if (saved) {
          const timerData = JSON.parse(saved)
          
          // If timer is running, ensure we have the correct remaining time
          if (timerData.isRunning && timerData.startTime) {
            const elapsed = Math.floor((Date.now() - timerData.startTime) / 1000)
            const remaining = Math.max(0, timerData.duration - elapsed)
            
            console.log("🔄 [COMPONENT_MOUNT] Syncing timer on mount:", {
              originalDuration: timerData.duration,
              elapsed,
              remaining,
              currentTimerDuration: timerDuration,
              startTime: new Date(timerData.startTime).toISOString(),
              savedOriginalDuration: timerData.originalDuration
            })
            
            // Update original duration if we have it from localStorage
            if (timerData.originalDuration && timerData.originalDuration !== originalTimerDuration) {
              console.log("🔄 [COMPONENT_MOUNT] Updating original duration from localStorage:", timerData.originalDuration)
              setOriginalTimerDuration(timerData.originalDuration)
            }
            
            // Only update if the calculated remaining time is different from current state
            if (Math.abs(remaining - timerDuration) > 1) { // Allow 1 second tolerance
              console.log("🔄 [COMPONENT_MOUNT] Updating timer duration to sync with localStorage")
              setTimerDuration(remaining)
            }
          }
        }
      } catch (e) {
        console.warn("Failed to sync timer on mount:", e)
      }
    }
  }, [roomCode]) // Only run once on mount

  // Effect to periodically sync timer for running timers
  useEffect(() => {
    if (!isTimerRunning || isCleaningUpTimer.current) return

    const syncInterval = setInterval(() => {
      // Double-check the cleanup flag inside the interval
      if (isCleaningUpTimer.current || !isTimerRunning) {
        clearInterval(syncInterval)
        return
      }
      
      if (typeof window !== "undefined" && roomCode) {
        try {
          const saved = localStorage.getItem(`timer_${roomCode}`)
          if (!saved) {
            // If localStorage is cleared, timer was stopped
            console.log("🛑 [TIMER_SYNC] No timer data in localStorage, timer was stopped")
            if (isTimerRunning) {
              setIsTimerRunning(false)
            }
            return
          }
          
          const timerData = JSON.parse(saved)
          
          if (timerData.isRunning && timerData.startTime) {
            const elapsed = Math.floor((Date.now() - timerData.startTime) / 1000)
            const remaining = Math.max(0, timerData.duration - elapsed)
            
            // Only update if there's a significant difference (more than 2 seconds)
            if (Math.abs(remaining - timerDuration) > 2) {
              console.log("🔄 [TIMER_SYNC] Periodic sync updating timer duration:", {
                current: timerDuration,
                calculated: remaining,
                difference: Math.abs(remaining - timerDuration)
              })
              setTimerDuration(remaining)
            }
            
            // If timer has finished, stop it
            if (remaining <= 0 && isTimerRunning) {
              console.log("🛑 [TIMER_SYNC] Timer finished during sync")
              setIsTimerRunning(false)
              clearTimerFromLocalStorage()
            }
          } else if (!timerData.isRunning) {
            // Timer is marked as not running in localStorage
            console.log("🛑 [TIMER_SYNC] Timer marked as stopped in localStorage")
            if (isTimerRunning) {
              setIsTimerRunning(false)
            }
          }
        } catch (e) {
          console.warn("Failed to sync timer during periodic check:", e)
        }
      }
    }, 1000) // Check every second

    return () => clearInterval(syncInterval)  }, [isTimerRunning, timerDuration, roomCode, clearTimerFromLocalStorage])

  // Function to add study time via API
  const addStudyTime = async (timeInMinutes: number, sessionType: 'study' | 'practice') => {
    if (!user || !roomCode) {
      console.warn("addStudyTime called without user or roomCode")
      return false
    }

    try {
      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/add-study-time"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({
          roomJoinCode: roomCode,
          timeInMinutes,
          sessionType,
        }),
      })

      if (response.ok) {
        // Update local state based on session type
        if (sessionType === 'study') {
          setStudyTimeMinutes(prev => prev + timeInMinutes)
        } else {
          setPracticeTimeMinutes(prev => prev + timeInMinutes)
        }
        
        toast({
          title: "Time Added",
          description: `${timeInMinutes} minutes of ${sessionType} time added successfully`,
        })
        
        return true
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }))
        toast({
          title: "Error",
          description: `Failed to add study time: ${errorData.message}`,
          variant: "destructive"
        })
        return false
      }
    } catch (error) {
      console.error("Error adding study time:", error)
      toast({
        title: "Error",
        description: "Failed to add study time",
        variant: "destructive"
      })
      return false
    }
  }

  // Study goal handler functions
  const handleStudyGoalSubmit = () => {
    if (tempStudyGoal > 0) {
      const res = fetch(getApiUrl("api/v1/squadgames/rooms/set-room-hours-goal"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify({
          roomJoinCode: roomCode,
          studyHoursGoal: tempStudyGoal,
        }),
      })
      
      setSessionGoalHours(tempStudyGoal)
      setShowStudyGoal(false)
      
    } else {
      toast({
        title: "Invalid Goal",
        description: "Please enter a valid study goal",
        variant: "destructive"
      })
    }
  }

  const handleStudyGoalCancel = () => {
    setTempStudyGoal(sessionGoalHours)
    setShowStudyGoal(false)
  }

  // Initialize temp study goal when modal opens
  const handleOpenStudyGoal = () => {
    setTempStudyGoal(sessionGoalHours)
    setShowStudyGoal(true)
  }

  // Session goals handler
  const handleGoalToggle = async (goalId: string) => {
    const goalToToggle = sessionGoals.find(goal => goal.id === goalId);
    if (!goalToToggle) return;

    console.log("🔄 [TOGGLE_GOAL] Toggling goal:", {
      id: goalId,
      text: goalToToggle.text,
      currentDone: goalToToggle.done,
      newDone: !goalToToggle.done
    });

    try {
      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/goals/toggle"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify({
          id: goalId,
          roomJoinCode: roomCode,
          done: !goalToToggle.done
        }),
      });

      if (response.ok) {
        console.log("✅ [TOGGLE_GOAL] Goal toggled successfully on server");
        
        // Refetch goals from server to ensure UI is in sync
       // await getGoalsFromServer();
        
       
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("❌ [TOGGLE_GOAL] Failed to toggle goal:", errorData);
        toast({
          title: "Error",
          description: `Failed to update goal: ${errorData.message}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("❌ [TOGGLE_GOAL] Network error:", error);
      toast({
        title: "Error",
        description: "Failed to update goal. Please check your connection.",
        variant: "destructive"
      });
    }
  }



  const getGoalsFromServer = async () => {
    if (!user || !roomCode) {
      console.warn("⚠️ [FETCH_GOALS] Cannot fetch goals: missing user or room code");
      return;
    }

    console.log("📡 [FETCH_GOALS] Fetching goals from server", { roomCode, user: user.name });

    try {
      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/goals/all"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ roomJoinCode: roomCode }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ [FETCH_GOALS] Goals fetched successfully:", data);
        
        if (data && Array.isArray(data)) {
          const sessionGoals = data.map((goal: any) => ({
            id: goal.id,
            text: goal.goalTitle || goal.title || "",
            done: goal.done || false,
            duration: {
              hours: goal.hours || 0,
              minutes: goal.minutes || 0
            }
          }));
          
          setSessionGoals(sessionGoals);
          console.log("📝 [FETCH_GOALS] Updated session goals:", sessionGoals);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("❌ [FETCH_GOALS] Failed to fetch goals:", errorData);
        toast({
          title: "Error",
          description: `Failed to fetch goals: ${errorData.message}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("❌ [FETCH_GOALS] Network error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch goals. Please check your connection.",
        variant: "destructive"
      });
    }
  }

  // Add new goal handler
  const handleAddGoal = (goalText: string, duration?: { hours: number; minutes: number }) => {
    // Ensure duration values are properly set as integers, preserving the original values
    const durationHours = duration?.hours || 0
    const durationMinutes = duration?.minutes || 0
    
    console.log("📝 [ADD_GOAL] Adding goal with duration:", {
      goalText,
      originalDuration: duration,
      durationHours,
      durationMinutes
    })

    const goalRequestBody = {
      roomJoinCode: roomCode,
      goalTitle: goalText,
      hours: durationHours,
      minutes: durationMinutes,
      done: false
    }
    
    
    
    const res = fetch(getApiUrl("api/v1/squadgames/rooms/goals/add"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user?.access_token}`
      },
      body: JSON.stringify(goalRequestBody)
    })
    
    res.then(async response => {
      if (response.ok) {
        const data = await response.json();
        console.log("✅ [ADD_GOAL] Goal added successfully:", data)
        
        // Refetch goals from server to ensure UI is in sync
        //await getGoalsFromServer();
        
        toast({
          title: "Goal Added",
          description: `Goal "${goalText}" added successfully`,
        })
      } else {
        console.error("❌ [ADD_GOAL] Failed to add goal:", response.statusText)
        toast({
          title: "Error",
          description: "Failed to add goal. Please try again.",
          variant: "destructive"
        })
      }
    }).catch(error => {
      console.error("❌ [ADD_GOAL] Network error:", error)
      toast({
        title: "Error",
        description: "Network error. Please check your connection.",
        variant: "destructive"
      })
    })

  }

  // Delete goal handler
  const handleDeleteGoal = (goalId: string) => {
    // Find the goal to be deleted
    const goalToDelete = sessionGoals.find(goal => goal.id === goalId)
    
    if (goalToDelete) {
      // Console log the deleted goal details
      console.log("🗑️ [DELETE_GOAL] Goal deleted:", {
        id: goalToDelete.id,
        text: goalToDelete.text,
        done: goalToDelete.done,
        deletedAt: new Date().toISOString(),
        totalGoalsRemaining: sessionGoals.length - 1
      })

      const goalRequestBody = {
        id: goalId,
        roomJoinCode: roomCode,
      }
      
      fetch(getApiUrl("api/v1/squadgames/rooms/goals/delete"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.access_token}`
        },
        body: JSON.stringify(goalRequestBody)
      }).then(async response => {
        if (response.ok) {
          console.log("✅ [DELETE_GOAL] Goal deleted successfully from server")

          
          // Refetch goals from server to ensure UI is in sync
          //await getGoalsFromServer();
          
          
        } else {
          console.error("❌ [DELETE_GOAL] Failed to delete goal:", response.statusText)
          toast({
            title: "Error",
            description: "Failed to delete goal. Please try again.",
            variant: "destructive"
          })
        }
      }).catch(error => {
        console.error("❌ [DELETE_GOAL] Network error:", error)
        toast({
          title: "Error",
          description: "Network error. Please check your connection.",
          variant: "destructive"
        })
      })
    }
  }
  // Discord link save handler
  const handleDiscordLinkSave = (link: string) => {
    const res = fetch(getApiUrl("api/v1/squadgames/rooms/set-discord-link"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user?.access_token}`,
      },
      body: JSON.stringify({ roomJoinCode: roomCode, discordLink: link }),
    }).then(async response => {
      if (response.ok) {
        console.log("✅ [DISCORD_LINK] Discord link saved successfully:", link)
        setDiscordLink(link)
      }
    })

  }

  const fetchDiscordLink = () => {
   
    const res = fetch(getApiUrl("api/v1/squadgames/rooms/discord-link"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user?.access_token}`,
      },
      body: JSON.stringify({ roomJoinCode: roomCode }),
    }).then(async response => {
      if (response.ok) {
        const data = await response.json()
        setDiscordLink(data.discordLink)
      }
    })

  } 


  

  if (loading || roomLoading) {
    return (
      <div className="strategic-mind-container">
        <div className="lobby-content-wrapper flex items-center justify-center">
          {/* Ensure text is readable on the new background */}
          <div className="text-center">
            <p className="text-xl font-semibold">Loading Session...</p>
            <p className="text-sm opacity-80">Please wait while we prepare the room.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="strategic-mind-container">
        <div className="lobby-content-wrapper flex items-center justify-center">
           {/* Ensure text is readable on the new background */}
          <p className="text-xl font-semibold">Authentication required. Please log in.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="strategic-mind-container">
      <div className="lobby-content-wrapper">
        <div className="p-4 max-w-6xl w-full mx-auto flex flex-col items-center">
          <div className="w-full space-y-4">
            {/* Main Content Grid */}
            <div className="max-w-4xl w-full mx-auto">
              {/* Main Content Area - Tab System */}
              <div className="w-full">
                {/* Tab Content Display - Multiple tabs can be visible */}
                <div className="min-h-[200px] mb-24">
                  {/* Responsive Masonry Layout - Better height handling */}
                  <div className="columns-1 lg:columns-2 space-y-6">
                    {/* Study Room Content */}
                    {visibleTabs.has('study-room') && (
                      <div className="tab-content mb-6 break-inside-avoid">
                        <Card className="w-full border-0 bg-white rounded-3xl overflow-hidden">
                          <CardHeader className="text-center bg-blue-50 pb-8">
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <div className="h-12 w-12 rounded-2xl bg-blue-500 flex items-center justify-center">
                                <Users className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <CardTitle className="text-3xl font-bold tracking-tight text-blue-600">Study Room</CardTitle>
                            <CardDescription className="text-lg text-gray-600">Waiting for participants to join...</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6 p-8">
                            <RoomCodeDisplay roomCode={roomCode} onCopy={handleCopyRoomCode} />

                            <div className="space-y-2">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                <h3 className="font-semibold">Participants ({players.length})</h3>
                              </div>
                              <PlayerList players={players} currentUsername={username} />
                            </div>

                           
                            {!isHost && (
                              <p className="text-center text-sm text-muted-foreground">
                                Waiting for the host to start the session...
                              </p>
                            )}

                            {/* Ready Button - Full Width */}
                            <Button
                             
                             
                              size="lg"
                              variant="secondary"
                              className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-4 text-lg rounded-2xl border-2 border-blue-200/50 hover:border-blue-300/70 group"
                              onClick={handleReady}
                            >
                              <Check className="mr-3 h-6 w-6" />
                              Mark as Ready
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Study Controls Content */}
                    {visibleTabs.has('study-controls') && (
                      <div className="tab-content mb-6 break-inside-avoid">
                        <Card className="w-full border-0 bg-white rounded-3xl overflow-hidden">
                          <CardHeader className="text-center bg-indigo-50 pb-8">
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <div className="h-12 w-12 rounded-2xl bg-indigo-500 flex items-center justify-center">
                                <Settings className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <CardTitle className="text-3xl font-bold tracking-tight text-indigo-600">Study Controls</CardTitle>
                            <CardDescription className="text-lg text-gray-600">Control your study session</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6 p-8">
                            {/* Modern Action Buttons Row */}
                            <div className="flex flex-wrap gap-4 justify-center pt-6">
                              {/* Start Session Button - Only for Host */}
                              {isHost && (
                                <div className="relative group">
                                  <Button
                                    size="icon"
                                    className="h-14 w-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl"
                                    onClick={() => setShowSessionList(true)}
                                    title="Start Practice Session - Start a quiz or practice session with generated questions"
                                  >
                                    <Play className="h-7 w-7" />
                                  </Button>
                                  {/* Custom tooltip */}
                                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    Start Practice Session
                                  </div>
                                </div>
                              )}

                              <div className="relative group">
                                <LectureList
                                  lectures={lectures.map(l => ({ ...l, id: String(l.lectureId) }))}
                                  onLectureSelect={handleLectureSelect}
                                />
                                {/* Custom tooltip */}
                                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  Study Materials
                                </div>
                              </div>

                              <div className="relative group">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-14 w-14 border-2 border-purple-400/50 text-purple-600 hover:bg-purple-50 hover:border-purple-500 rounded-2xl"
                                  onClick={() => toggleTab('timer')}
                                  title="Study Timer - Set and manage focus timer for study sessions"
                                >
                                  <Timer className="h-7 w-7" />
                                </Button>
                                {/* Custom tooltip */}
                                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  Study Timer
                                </div>
                              </div>

                              {/* Study Goal Button */}
                              {isHost && (
                                <div className="relative group">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-14 w-14 border-2 border-amber-400/50 text-amber-600 hover:bg-amber-50 hover:border-amber-500 rounded-2xl"
                                    onClick={handleOpenStudyGoal}
                                    title="Study Goal - Set daily study hour goal for the session"
                                  >
                                    <Target className="h-7 w-7" />
                                  </Button>
                                  {/* Custom tooltip */}
                                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    Study Goal
                                  </div>
                                </div>
                              )}

                              {/* Upload Material Button */}
                              {isHost && (
                                <div className="relative group">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-14 w-14 border-2 border-blue-400/50 text-blue-600 hover:bg-blue-50 hover:border-blue-500 rounded-2xl"
                                    onClick={() => setShowUploadModal(true)}
                                    disabled={isGenerating}
                                    title="Upload PDF - Upload PDF files to generate study materials and practice questions"
                                  >
                                    {isGenerating ? (
                                      <div className="animate-spin h-7 w-7 border-2 border-blue-600 border-t-transparent rounded-full" />
                                    ) : (
                                      <Upload className="h-7 w-7" />
                                    )}
                                  </Button>
                                  {/* Custom tooltip */}
                                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    Upload PDF
                                  </div>
                                  {/* Upload progress indicator */}
                                  {isGenerating && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  )}
                                  {questionsGenerated && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Discord Link Button */}
                              <DiscordLinkButton 
                                isHost={isHost}
                                discordLink={discordLink}
                                onSave={handleDiscordLinkSave}
                              />

                              {/* Request Host Button - Only for Non-Host */}
                              {!isHost && !hasLeftRoom && (
                                <div className="relative group">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-14 w-14 border-2 border-blue-400/50 text-blue-600 hover:bg-blue-50 hover:border-blue-500 rounded-2xl"
                                    onClick={setNewHost}
                                    disabled={isRequestingHost}
                                    title="Request Host - Request to become the host of this study session"
                                  >
                                    {isRequestingHost ? (
                                      <div className="h-7 w-7">...</div>
                                    ) : (
                                      <Crown className="h-7 w-7" />
                                    )}
                                  </Button>
                                  {/* Custom tooltip */}
                                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    Request Host
                                  </div>
                                </div>
                              )}

                              {/* Leave Room Button */}
                              <div className="relative group">
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="h-14 w-14 bg-red-500 hover:bg-red-600 rounded-2xl"
                                  onClick={handleLeaveRoom}
                                  title="Leave Session - Exit the current study session"
                                >
                                  <LogOut className="h-7 w-7" />
                                </Button>
                                {/* Custom tooltip */}
                                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  Leave Session
                                </div>
                              </div>
                            </div>

                            {/* Upload Progress and Success States */}
                            {isHost && isGenerating && (
                              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                <div className="flex items-center justify-center space-x-3">
                                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                  <span className="text-blue-700 font-medium">Processing PDF...</span>
                                </div>
                              </div>
                            )}

                            {isHost && uploadSuccess && !isGenerating && (
                              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                                <div className="flex items-center justify-center space-x-3">
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                  <span className="text-green-700 font-medium">Content generated successfully!</span>
                                </div>
                              </div>
                            )}

                            {isHost && uploadFailed && !isGenerating && (
                              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <div className="flex items-center justify-between space-x-3">
                                  <div className="flex items-center space-x-3">
                                    <X className="h-5 w-5 text-red-600" />
                                    <span className="text-red-700 font-medium">Upload failed. Please try again.</span>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setShowUploadModal(true)
                                      setUploadFailed(false)
                                    }}
                                    className="border-red-300 text-red-700 hover:bg-red-100"
                                  >
                                    Try Again
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Room Chat Content */}
                    {visibleTabs.has('chat') && (
                      <div className="tab-content mb-6 break-inside-avoid">
                        <Card className="w-full border-0 bg-white rounded-3xl overflow-hidden">
                          <CardHeader className="text-center bg-green-50 pb-8">
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <div className="h-12 w-12 rounded-2xl bg-green-500 flex items-center justify-center">
                                <MessageCircle className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <CardTitle className="text-3xl font-bold tracking-tight text-green-600">Room Chat</CardTitle>
                            <CardDescription className="text-lg text-gray-600">Chat with other participants</CardDescription>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="h-[500px] p-8">
                              <ChatRoom 
                                username={username} 
                                roomCode={roomCode} 
                                players={players} 
                                isLobby={true}
                                messages={chatData.messages}
                                sendMessage={sendMessage}
                                typingUsers={chatData.typingUsers}
                                onTypingStart={handleTypingStart}
                                onTypingStop={handleTypingStop}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Study Stats Content */}
                    {visibleTabs.has('stats') && (
                      <div className="tab-content mb-6 break-inside-avoid">
                        <Card className="w-full border-0 bg-white rounded-3xl overflow-hidden">
                          <CardHeader className="text-center bg-purple-50 pb-8">
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <div className="h-12 w-12 rounded-2xl bg-purple-500 flex items-center justify-center">
                                <BarChart3 className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <CardTitle className="text-3xl font-bold tracking-tight text-purple-600">Study Statistics</CardTitle>
                            <CardDescription className="text-lg text-gray-600">Track your study progress and performance</CardDescription>
                          </CardHeader>
                          <CardContent className="p-8">
                            <StudyStats 
                              studyTimeMinutes={studyTimeMinutes} 
                              practiceTimeMinutes={practiceTimeMinutes}
                              sessionGoalHours={sessionGoalHours}
                              className="h-full"
                            />
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Session Goals Content */}
                    {visibleTabs.has('goals') && (
                      <div className="tab-content mb-6 break-inside-avoid">
                        <Card className="w-full border-0 bg-white rounded-3xl overflow-hidden">
                          <CardHeader className="text-center bg-amber-50 pb-8">
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center">
                                <Target className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <CardTitle className="text-3xl font-bold tracking-tight text-amber-600">Session Goals</CardTitle>
                            <CardDescription className="text-lg text-gray-600">Set and track your study goals</CardDescription>
                          </CardHeader>
                          <CardContent className="p-6">
                            <SessionGoals 
                              goals={sessionGoals}
                              onGoalToggle={handleGoalToggle}
                              onAddGoal={handleAddGoal}
                              onDeleteGoal={handleDeleteGoal}
                              isHost={isHost}
                              className="h-full"
                            />
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Timer Widget Content */}
                    {visibleTabs.has('timer') && (
                      <div className="tab-content mb-6 break-inside-avoid">
                        <TimerWidget 
                          isHost={isHost}
                          initialDuration={timerDuration}
                          onTimerSet={(duration: number) => setTimerDuration(duration)}
                          description={timerDescription}
                          onDescriptionSet={(description: string) => setTimerDescription(description)}
                          isTimerRunning={isTimerRunning}
                          onTimerStateChange={handleTimerStateChange}
                          originalDuration={originalTimerDuration}
                          accessToken={user?.access_token}
                          roomJoinCode={roomCode}
                          startTime={(() => {
                            // Get start time from localStorage if available
                            if (typeof window !== "undefined" && isTimerRunning) {
                              try {
                                const saved = localStorage.getItem(`timer_${roomCode}`)
                                if (saved) {
                                  const timerData = JSON.parse(saved)
                                  return timerData.startTime
                                }
                              } catch (e) {
                                console.warn("Failed to get start time from localStorage:", e)
                              }
                            }
                            return undefined
                          })()}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

        {/* Modern Mac-style Dock */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="dock-container rounded-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Study Room Tab */}
              <button
                onClick={() => toggleTab('study-room')}
                className={`dock-item relative group flex flex-col items-center justify-center w-16 h-16 rounded-xl ${
                  visibleTabs.has('study-room') 
                    ? 'active bg-blue-500' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <Users className={`w-6 h-6 ${visibleTabs.has('study-room') ? 'text-white' : 'text-gray-600'}`} />
                <span className={`text-xs font-medium mt-1 ${visibleTabs.has('study-room') ? 'text-white' : 'text-gray-600'}`}>
                  Room
                </span>
                {/* Participants indicator */}
                {players.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{players.length}</span>
                  </div>
                )}
              </button>

              {/* Study Controls Tab */}
              <button
                onClick={() => toggleTab('study-controls')}
                className={`dock-item relative group flex flex-col items-center justify-center w-16 h-16 rounded-xl ${
                  visibleTabs.has('study-controls') 
                    ? 'active bg-indigo-500' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <Settings className={`w-6 h-6 ${visibleTabs.has('study-controls') ? 'text-white' : 'text-gray-600'}`} />
                <span className={`text-xs font-medium mt-1 ${visibleTabs.has('study-controls') ? 'text-white' : 'text-gray-600'}`}>
                  Controls
                </span>
              </button>

              {/* Room Chat Tab */}
              <button
                onClick={() => toggleTab('chat')}
                className={`dock-item relative group flex flex-col items-center justify-center w-16 h-16 rounded-xl ${
                  visibleTabs.has('chat') 
                    ? 'active bg-green-500' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <MessageCircle className={`w-6 h-6 ${visibleTabs.has('chat') ? 'text-white' : 'text-gray-600'}`} />
                <span className={`text-xs font-medium mt-1 ${visibleTabs.has('chat') ? 'text-white' : 'text-gray-600'}`}>
                  Chat
                </span>
                {/* Unread message notification indicator */}
                {chatData.hasUnread && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </button>

              {/* Study Stats Tab */}
              <button
                onClick={() => toggleTab('stats')}
                className={`dock-item relative group flex flex-col items-center justify-center w-16 h-16 rounded-xl ${
                  visibleTabs.has('stats') 
                    ? 'active bg-purple-500' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <BarChart3 className={`w-6 h-6 ${visibleTabs.has('stats') ? 'text-white' : 'text-gray-600'}`} />
                <span className={`text-xs font-medium mt-1 ${visibleTabs.has('stats') ? 'text-white' : 'text-gray-600'}`}>
                  Stats
                </span>
              </button>

              {/* Session Goals Tab */}
              <button
                onClick={() => toggleTab('goals')}
                className={`dock-item relative group flex flex-col items-center justify-center w-16 h-16 rounded-xl ${
                  visibleTabs.has('goals') 
                    ? 'active bg-amber-500' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <Target className={`w-6 h-6 ${visibleTabs.has('goals') ? 'text-white' : 'text-gray-600'}`} />
                <span className={`text-xs font-medium mt-1 ${visibleTabs.has('goals') ? 'text-white' : 'text-gray-600'}`}>
                  Goals
                </span>
                {/* Goals progress indicator - Enhanced for better visibility */}
                {sessionGoals.length > 0 && (
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <span className="text-white text-sm font-extrabold leading-none">
                      {sessionGoals.filter(g => g.done).length}/{sessionGoals.length}
                    </span>
                  </div>
                )}
              </button>

              {/* Timer Tab */}
              <button
                onClick={() => toggleTab('timer')}
                className={`dock-item relative group flex flex-col items-center justify-center w-16 h-16 rounded-xl ${
                  visibleTabs.has('timer') 
                    ? 'active bg-purple-500' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <Timer className={`w-6 h-6 ${visibleTabs.has('timer') ? 'text-white' : 'text-gray-600'}`} />
                <span className={`text-xs font-medium mt-1 ${visibleTabs.has('timer') ? 'text-white' : 'text-gray-600'}`}>
                  Timer
                </span>
                {/* Timer running indicator */}
                {isTimerRunning && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

      {/* Study Goal Modal */}
      <Dialog open={showStudyGoal} onOpenChange={setShowStudyGoal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-500" />
              Set Study Goal
            </DialogTitle>
            <DialogDescription>
              Set your session study goal in hours. This will help track your progress and achievements.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="study-goal" className="text-right">
                Hours
              </Label>
              <Input

                id="study-goal"
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={tempStudyGoal}
                onChange={(e) => setTempStudyGoal(parseFloat(e.target.value) || 0)}
                className="col-span-3"
                placeholder="Enter hours (e.g., 2.5)"
              />
            </div>
            {tempStudyGoal > 0 && (
              <div className="text-sm text-gray-600 text-center">
                Goal: {tempStudyGoal} hour{tempStudyGoal !== 1 ? 's' : ''} ({tempStudyGoal * 60} minutes)
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleStudyGoalCancel}>
              Cancel
            </Button>
            <Button onClick={handleStudyGoalSubmit} disabled={tempStudyGoal <= 0}>
              Set Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* PDF Upload Modal - Rendered outside of card structure for proper centering */}
      {isHost && (
        <PDFUploadModal
          onFileUpload={handleFileUploadAndGenerate}
          uploadedFile={uploadedFile}
          onRemoveFile={handleRemoveFile}
          isGenerating={isGenerating}
          questionsGenerated={questionsGenerated}
          uploadFailed={uploadFailed}
          isOpen={showUploadModal}
          onClose={() => {
            setShowUploadModal(false)
            setUploadFailed(false) // Clear failure state when modal closes
          }}
        />
      )}

      {/* Session List - Slides in from right */}
      {showSessionList && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setShowSessionList(false)}
        />
      )}
      <SessionList
        sessions={sessions}
        onSessionSelect={handleSessionSelect}
        onClose={() => setShowSessionList(false)}
        isVisible={showSessionList}
      />
      
          </div>
        </div>
      </div>
    </div>
  );
}