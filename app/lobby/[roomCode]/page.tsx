"use client"

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuth } from '@/context/auth-context';
import { useGameContext } from '@/context/game-context';
import { useStomp } from '@/context/StompContextType';
import { StompSubscription } from '@stomp/stompjs';

// Import custom hooks
import { useChat } from '@/hooks/useChat';
import { useSessionManagement } from './hooks/useSessionManagement';
import { useRoomMessageHandler } from './hooks/useRoomMessageHandler';
import { useFileUpload } from './hooks/useFileUpload';

// Import UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, MessageCircle, LogOut, Play, Crown, Check, UserPlus, Timer, Target, Plus, CheckCircle, X, Upload, BarChart3, Home, BookOpen, Settings } from "lucide-react";
import PlayerList from "@/components/player-list";
import RoomCodeDisplay from "@/components/room-code-display";
import PDFUploadModal from "@/components/pdf-upload-modal";
import ChatRoom from "@/components/chat-room";
import TimerWidget from "@/components/timer-widget";
import StudyStats from "@/components/study-stats";
import SessionGoals, { Goal } from "@/components/session-goals";
import DiscordLinkButton from "@/components/discord-link-button";
import { LectureList } from "@/components/lecture-list";
import { SessionList } from "@/components/session-list";
import { getApiUrl } from '@/lib/api';
import { Question, SummarySettings, MCQSettings } from '@/types/game';
import "@/styles/strategic-mind.css";

export default function Lobby({ params }: { params: Promise<{ roomCode: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const { roomCode } = use(params);
  const { user, loading } = useAuth();
  const { setGameState, addQuestion } = useGameContext();
  const { subscribeToTopic, unsubscribeFromTopic, stompClient, isConnected, forceReconnect } = useStomp();

  // Tab management
  const [visibleTabs, setVisibleTabs] = useState<Set<string>>(new Set(['study-room']));
  const toggleTab = useCallback((tabId: string) => {
    setVisibleTabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tabId)) {
        newSet.delete(tabId);
      } else {
        newSet.add(tabId);
      }
      return newSet;
    });
  }, []);

  // Room management state
  const [players, setPlayers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [roomLoading, setRoomLoading] = useState(true);
  const [hasLeftRoom, setHasLeftRoom] = useState(false);
  const [isRequestingHost, setIsRequestingHost] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questionsGenerated, setQuestionsGenerated] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Timer state
  const isCleaningUpTimer = useRef(false);
  const isTimerInitialized = useRef(false);
  const [timerDuration, setTimerDuration] = useState(() => {
    if (typeof window !== "undefined" && roomCode) {
      try {
        const saved = localStorage.getItem(`timer_${roomCode}`);
        if (saved) {
          const timerData = JSON.parse(saved);
          if (timerData.isRunning && timerData.startTime && timerData.originalDuration) {
            const elapsed = Math.floor((Date.now() - timerData.startTime) / 1000);
            const remaining = Math.max(0, timerData.originalDuration - elapsed);
            console.log("🔄 [TIMER_INIT] Calculated remaining time from localStorage:", {
              originalDuration: timerData.originalDuration,
              elapsed,
              remaining,
              startTime: new Date(timerData.startTime).toISOString()
            });
            return remaining;
          }
          return timerData.duration || 25 * 60;
        }
      } catch (e) {
        console.error("Error parsing saved timer duration:", e);
      }
    }
    return 25 * 60;
  });

  const [timerDescription, setTimerDescription] = useState<string>(() => {
    if (typeof window !== "undefined" && roomCode) {
      try {
        const saved = localStorage.getItem(`timer_${roomCode}`);
        if (saved) {
          const timerData = JSON.parse(saved);
          return timerData.description || "";
        }
      } catch (e) {
        console.error("Error parsing saved timer description:", e);
      }
    }
    return "";
  });

  const [isTimerRunning, setIsTimerRunning] = useState(() => {
    if (typeof window !== "undefined" && roomCode) {
      try {
        const saved = localStorage.getItem(`timer_${roomCode}`);
        if (saved) {
          const timerData = JSON.parse(saved);
          if (timerData.isRunning && timerData.startTime && timerData.originalDuration) {
            const elapsed = Math.floor((Date.now() - timerData.startTime) / 1000);
            const remaining = Math.max(0, timerData.originalDuration - elapsed);
            if (remaining <= 0) {
              console.log("🛑 [TIMER_INIT_STATE] Timer finished during initialization, marking as stopped");
              return false;
            }
          }
          return timerData.isRunning || false;
        }
      } catch (e) {
        console.warn("Failed to parse timer data from localStorage:", e);
      }
    }
    return false;
  });

  const [originalTimerDuration, setOriginalTimerDuration] = useState(() => {
    if (typeof window !== "undefined" && roomCode) {
      try {
        const saved = localStorage.getItem(`timer_${roomCode}`);
        if (saved) {
          const timerData = JSON.parse(saved);
          return timerData.originalDuration || 25 * 60;
        }
      } catch (e) {
        console.error("Error parsing saved original timer duration:", e);
      }
    }
    return 25 * 60;
  });

  const [timerTick, setTimerTick] = useState(0);

  // Initialize hooks
  const chat = useChat(user, roomCode, visibleTabs);
  const leaveRoom = useCallback(() => {
    if (!user || !roomCode) return;
    
    fetch(getApiUrl("api/v1/squadgames/rooms/leave-room"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.access_token}`,
      },
      body: JSON.stringify({
        roomJoinCode: roomCode,
        archive: false,
      }),
    });
  }, [user, roomCode]);
  
  const session = useSessionManagement(roomCode, user, router);

  // WebSocket subscription
  const subscriptionRef = useRef<StompSubscription | null>(null);
  const hasManuallyLeftRef = useRef(false);

  // Add strategic-mind-active class to body for proper styling
  useEffect(() => {
    document.body.classList.add("strategic-mind-active");
    return () => {
      document.body.classList.remove("strategic-mind-active");
    };
  }, []);

  // Get username
  const getLocalName = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("username") || "Anonymous";
    }
    return "Anonymous";
  };
  
  // Utility function to format time as MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const username = user?.name || getLocalName();

  // Timer handler functions (moved up to be available for messageHandler)
  // Function to save timer state to localStorage
  const saveTimerToLocalStorage = useCallback((duration: number, description: string, isRunning: boolean, startTime?: number, originalDuration?: number) => {
    if (typeof window !== "undefined") {
      const timerData = {
        duration,
        description,
        isRunning,
        timestamp: Date.now(),
        startTime: startTime || Date.now(), // When the timer actually started
        originalDuration: originalDuration || duration, // Store original duration for progress calculation
        roomCode, // Include room code for validation
        username: user?.name, // Include username for validation
        sessionId: Date.now() // Unique session identifier to prevent conflicts
      }
      localStorage.setItem(`timer_${roomCode}`, JSON.stringify(timerData))
      console.log("💾 [TIMER_STORAGE] Saved timer to localStorage:", timerData)
    }
  }, [roomCode, user?.name])

  // Function to clear timer from localStorage
  const clearTimerFromLocalStorage = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`timer_${roomCode}`)
      console.log("🗑️ [TIMER_STORAGE] Cleared timer from localStorage")
    }
  }, [roomCode])

  // Function to validate timer localStorage data
  const validateTimerFromLocalStorage = useCallback((skipUserValidation = false) => {
    if (typeof window !== "undefined" && roomCode) {
      try {
        const saved = localStorage.getItem(`timer_${roomCode}`)
        if (saved) {
          const timerData = JSON.parse(saved)
          
          // Validate that the timer data belongs to current room
          if (timerData.roomCode !== roomCode) {
            console.warn("🚨 [TIMER_VALIDATION] Timer data from different room, clearing:", timerData.roomCode, "vs", roomCode)
            clearTimerFromLocalStorage()
            return null
          }
          
          // Only validate username if user is available and we're not skipping validation
          if (!skipUserValidation && user?.name && timerData.username && timerData.username !== user.name) {
            console.warn("🚨 [TIMER_VALIDATION] Timer data from different user, clearing:", timerData.username, "vs", user.name)
            clearTimerFromLocalStorage()
            return null
          }
          
          // Check if timer data is too old (older than 24 hours)
          const maxAge = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
          if (timerData.timestamp && (Date.now() - timerData.timestamp) > maxAge) {
            console.warn("🚨 [TIMER_VALIDATION] Timer data too old, clearing")
            clearTimerFromLocalStorage()
            return null
          }
          
          // Validate that required fields exist
          if (timerData.startTime && timerData.originalDuration) {
            return timerData
          }
        }
      } catch (e) {
        console.warn("❌ [TIMER_VALIDATION] Failed to validate timer data:", e);
        clearTimerFromLocalStorage();
      }
    }
    return null;
  }, [roomCode, user?.name, clearTimerFromLocalStorage]);

  // Calculate current remaining time for timer badge and page title
  const currentRemainingTime = useMemo(() => {
    if (!isTimerRunning) return timerDuration;
    
    try {
      const existingTimerData = validateTimerFromLocalStorage();
      if (existingTimerData) {
        const elapsed = Math.floor((Date.now() - existingTimerData.startTime) / 1000);
        return Math.max(0, existingTimerData.originalDuration - elapsed);
      }
    } catch (e) {
      console.error("Error calculating remaining time:", e);
    }
    
    return timerDuration;
  }, [isTimerRunning, timerDuration, roomCode, timerTick, validateTimerFromLocalStorage]);

  // Update page title with timer
  const pageTitle = useMemo(() => {
    if (isTimerRunning && currentRemainingTime > 0) {
      const minutes = Math.floor(currentRemainingTime / 60);
      const seconds = currentRemainingTime % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')} - Study Room`;
    }
    return "Study Room";
  }, [isTimerRunning, currentRemainingTime]);

  usePageTitle(pageTitle);

  // Update timer state every second when running
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setTimerTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, roomCode, timerDuration]);

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
      user: user.name,
      hasToken: !!user?.access_token,
      tokenLength: user?.access_token?.length || 0
    })

    try {
      const requestBody = {
        roomJoinCode: roomCode,
        timerDurationInSeconds: duration,
        sessionGoals: description,
        timerEnabled: true
      }
      
      console.log("� [START_TIMER] Request body:", requestBody)

      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/start-timer"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify(requestBody),
      })

      console.log("� [START_TIMER] Response status:", response.status, response.statusText)

      if (response.ok) {
        const responseData = await response.json().catch(() => null)
        console.log("✅ [START_TIMER] Timer started successfully on server, response:", responseData)
        return true
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }))
        console.error("❌ [START_TIMER] Failed to start timer on server:", errorData)
        console.error("❌ [START_TIMER] Response status:", response.status, response.statusText)
        console.error("❌ [START_TIMER] Response headers:", Object.fromEntries(response.headers.entries()))
        toast({
          title: "Error",
          description: `Failed to start timer: ${errorData.message}`,
          variant: "destructive"
        })
        return false
      }
    } catch (error) {
      console.error("❌ [START_TIMER] Error starting timer on server:", error)
      console.error("❌ [START_TIMER] Error details:", {
        error: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      })
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
        const startTime = Date.now();
        setIsTimerRunning(true)
        // Save timer state to localStorage when starting
        saveTimerToLocalStorage(timerDuration, timerDescription, true, startTime, timerDuration)
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
  };

  // Function to handle timer started event from server
  const handleTimerStartedFromServer = useCallback((timerData: { 
    timerDurationInSeconds: number, 
    sessionGoals: string, 
    roomJoinCode: string, 
    timerEnabled: boolean,
    startTime?: number
  }) => {
    console.log("🔔 [TIMER_STARTED] Received timer data from server:", timerData);
    
    // Check if we already have a running timer from localStorage
    const existingTimerData = validateTimerFromLocalStorage();
    
    if (existingTimerData && existingTimerData.isRunning) {
      console.log("🔄 [TIMER_STARTED] Already have running timer from localStorage, preserving state");
      
      // Calculate remaining time from existing timer
      const elapsed = Math.floor((Date.now() - existingTimerData.startTime) / 1000);
      const remainingTime = Math.max(0, existingTimerData.originalDuration - elapsed);
      
      console.log("🔄 [TIMER_STARTED] Preserving existing timer state:", {
        existingStartTime: new Date(existingTimerData.startTime).toISOString(),
        elapsed,
        originalDuration: existingTimerData.originalDuration,
        remainingTime
      });
      
      // Only update if timer is still running
      if (remainingTime > 0) {
        setTimerDuration(remainingTime);
        setTimerDescription(existingTimerData.description || "");
        setIsTimerRunning(true);
        setOriginalTimerDuration(existingTimerData.originalDuration);
        
        // Automatically open timer tab when timer starts for all users
        setVisibleTabs(prev => new Set([...prev, 'timer']));
        return;
      } else {
        // Timer has finished, clean up
        console.log("🛑 [TIMER_STARTED] Existing timer has finished, cleaning up");
        clearTimerFromLocalStorage();
      }
    }
    
    // No existing timer or it has finished, use server data
    const serverStartTime = timerData.startTime || Date.now();
    const elapsed = Math.floor((Date.now() - serverStartTime) / 1000);
    const remainingTime = Math.max(0, timerData.timerDurationInSeconds - elapsed);
    
    console.log("🔔 [TIMER_STARTED] Using server timer data:", {
      serverStartTime: new Date(serverStartTime).toISOString(),
      elapsed,
      originalDuration: timerData.timerDurationInSeconds,
      remainingTime
    });
    
    // Only start timer if there's time remaining
    if (remainingTime > 0) {
      // Update all timer states from server with calculated remaining time
      setTimerDuration(remainingTime);
      setTimerDescription(timerData.sessionGoals || "");
      setIsTimerRunning(timerData.timerEnabled);
      setOriginalTimerDuration(timerData.timerDurationInSeconds);
      
      // Save timer state to localStorage when timer starts
      saveTimerToLocalStorage(timerData.timerDurationInSeconds, timerData.sessionGoals || "", timerData.timerEnabled, serverStartTime, timerData.timerDurationInSeconds);
      
      // Automatically open timer tab when timer starts for all users
      setVisibleTabs(prev => new Set([...prev, 'timer']));
      
      toast({
        title: "Timer Started",
        description: `Study timer started for ${Math.floor(timerData.timerDurationInSeconds / 60)} minutes`,
      });
    } else {
      console.log("🛑 [TIMER_STARTED] Server timer has no remaining time, not starting");
      clearTimerFromLocalStorage();
    }
  }, [toast, saveTimerToLocalStorage, setVisibleTabs, validateTimerFromLocalStorage, clearTimerFromLocalStorage]);

  // Function to handle timer stopped event from server
  const handleTimerStoppedFromServer = useCallback((timerData: { 
    roomJoinCode: string, 
    timerEnabled: boolean 
  }) => {
    console.log("🛑 [TIMER_STOPPED] Received timer stopped data from server:", timerData);
    
    // Complete timer cleanup - stop all timer states and clear storage
    setIsTimerRunning(false);
    setTimerDuration(25 * 60);
    setTimerDescription("");
    setOriginalTimerDuration(25 * 60);
    
    // Clear timer from localStorage when timer is stopped by server
    clearTimerFromLocalStorage();
    
    console.log("🛑 [TIMER_STOPPED] Timer stopped successfully, all states reset and localStorage cleared");
    
    toast({
      title: "Timer Stopped",
      description: "Study timer has been stopped",
    });
  }, [toast, clearTimerFromLocalStorage]);

  // Fetch room members
  const fetchRoomMembers = useCallback(() => {
    if (stompClient && stompClient.connected && roomCode) {
      stompClient.publish({
        destination: "/app/room-members",
        body: JSON.stringify({ roomJoinCode: roomCode })
      });
    }
  }, [stompClient, roomCode]);

  // Fetch room messages
  const fetchRoomMessages = useCallback(() => {
    if (stompClient && stompClient.connected && roomCode) {
      stompClient.publish({
        destination: "/app/room-messages",
        body: JSON.stringify({ roomJoinCode: roomCode })
      });
    }
  }, [stompClient, roomCode]);

  // Room message handler
  const messageHandler = useRoomMessageHandler({
    roomCode,
    fetchRoomMembers,
    fetchRoomMessages,
    fetchRoomGoals: session.getGoalsFromServer,
    fetchDiscordLink: session.fetchDiscordLink,
    fetchLectures: session.fetchLectures,
    fetchSessions: session.fetchSessions,
    updateRoomStats: session.updateRoomStats,
    setRoomLoading,
    leaveRoom,
    toast,
    user,
    handleTimerStartedFromServer,
    handleTimerStoppedFromServer,
    setPlayers,
    setSessionGoalHours: session.setSessionGoalHours,
    setDiscordLink: session.setDiscordLink,
    setMessages: chat.setMessages,
    setTypingUsers: chat.setTypingUsers,
    setHasUnreadMessages: chat.setHasUnreadMessages,
    setLastSeenMessageCount: chat.setLastSeenMessageCount,
    setSessions: session.setSessions,
    setLectures: session.setLectures,
    setStudyTimeMinutes: session.setStudyTimeMinutes,
    setPracticeTimeMinutes: session.setPracticeTimeMinutes,
    router,
    visibleTabs
  });

  // Effect to update host status whenever players or user changes
  useEffect(() => {
    console.log(`[Host Effect] Checking host status. Loading: ${loading}, User: ${user?.name}, Players: ${players.length}`);
    
    if (loading || !user) {
      console.log("[Host Effect] Still loading or no user, skipping host check");
      return;
    }
    
    // Check host status from players array
    if (players && players.length > 0) {
      const currentPlayer = players.find(p => p.username === user.name);
      if (currentPlayer) {
        console.log(`[Host Effect] Found current player:`, currentPlayer);
        setIsHost(currentPlayer.host || false);
      } else {
        console.log("[Host Effect] Current player not found in players array");
      }
    } else {
      console.log("[Host Effect] No players in array yet");
    }
  }, [players, user, loading]);

  // Effect to initialize room and set loading to false
  useEffect(() => {
    if (!loading && user && roomCode) {
      console.log("🏠 [ROOM_INIT] Initializing room, setting roomLoading to false");
      setRoomLoading(false);
    }
  }, [loading, user, roomCode]);

  // Set up WebSocket subscription
  useEffect(() => {
    if (!user || !roomCode || !stompClient || !isConnected || loading) {
      return;
    }

    // Function to join room on mount
    const joinRoomOnMount = async () => {
      try {
        const response = await fetch(getApiUrl("api/v1/squadgames/rooms/join"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.access_token}`,
          },
          body: JSON.stringify({ roomJoinCode: roomCode }),
        });

        if (response.ok) {
          console.log("✅ [JOIN_ROOM] Successfully joined room on mount");
        }
      } catch (error) {
        console.error("❌ [JOIN_ROOM] Error joining room on mount:", error);
      }
    };

    joinRoomOnMount();

    const topic = `/topic/rooms/${roomCode}`;
    const currentSubscription = subscribeToTopic(topic, messageHandler);
    subscriptionRef.current = currentSubscription;

    fetchRoomMembers();
    fetchRoomMessages();

    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromTopic(topic);
        subscriptionRef.current = null;
      }
    };
  }, [user, loading, roomCode, stompClient, isConnected, subscribeToTopic, unsubscribeFromTopic, messageHandler, fetchRoomMembers]);

  // Connection monitoring and recovery - provides user feedback for connection state
  const connectionLostRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  useEffect(() => {
    if (!user || !roomCode) return;

    if (isConnected) {
      if (connectionLostRef.current) {
        console.log("🔄 [CONNECTION_RECOVERED] Connection restored, fetching room data");
        connectionLostRef.current = false;
        reconnectAttemptRef.current = 0;
        
        // Re-fetch room members and messages when connection is restored
        setTimeout(() => {
          fetchRoomMembers();
          fetchRoomMessages();
        }, 1000);
        
        toast({
          title: "Connection Restored",
          description: "Successfully reconnected to the room.",
        });
      }
    } else {
      if (!connectionLostRef.current) {
        console.log("🔌 [CONNECTION_LOST] Connection lost, attempting to reconnect");
        connectionLostRef.current = true;
        
        // Attempt to reconnect with exponential backoff
        const attemptReconnect = () => {
          if (reconnectAttemptRef.current < maxReconnectAttempts) {
            reconnectAttemptRef.current++;
            console.log(`🔄 [RECONNECT_ATTEMPT] Attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts}`);
            
            setTimeout(() => {
              forceReconnect();
            }, Math.pow(2, reconnectAttemptRef.current) * 1000);
          } else {
            console.log("❌ [RECONNECT_FAILED] Max reconnection attempts reached");
            toast({
              title: "Connection Failed",
              description: "Unable to reconnect. Please refresh the page.",
              variant: "destructive",
            });
          }
        };
        
        attemptReconnect();
      }
    }
  }, [isConnected, user, roomCode, forceReconnect, fetchRoomMembers, fetchRoomMessages, toast]);

  // Additional useEffect to fetch room members when STOMP connection becomes ready
  // This is especially important for rejoin scenarios
  useEffect(() => {
    if (stompClient && stompClient.connected && roomCode && user && !loading) {
      console.log("🔄 [CONNECTION_READY] STOMP connection ready, fetching room members");
      
      // Only fetch if we don't have players yet or if room is still loading
      if (players.length === 0 || roomLoading) {
        console.log("🔄 [CONNECTION_READY] Fetching room members because:", {
          playersCount: players.length,
          roomLoading
        });
        fetchRoomMembers();
        fetchRoomMessages();
      }
    }
  }, [stompClient?.connected, roomCode, user, loading, players.length, roomLoading, fetchRoomMembers]);

  // Check for page reload and handle timer state
  useEffect(() => {
    const checkPageReload = async () => {
      if (typeof window !== "undefined" && roomCode && user) {
        const reloadKey = `page_reload_${roomCode}_${user.name}`;
        const wasReloaded = sessionStorage.getItem(reloadKey);
        
        if (wasReloaded) {
          console.log("🔄 [PAGE_RELOAD] Page was reloaded, cleaning up session storage");
          sessionStorage.removeItem(reloadKey);
          
          // Check if we have a valid timer to restore
          const timerData = validateTimerFromLocalStorage();
          if (timerData && timerData.isRunning) {
            console.log("🔄 [PAGE_RELOAD] Restoring timer from localStorage");
            setVisibleTabs(prev => new Set([...prev, 'timer']));
          }
        }
        
        // Set the reload flag for next time
        sessionStorage.setItem(reloadKey, "true");
      }
    };

    // Run the check after the initial render and user loading is complete
    if (!loading) {
      checkPageReload();
    }
  }, [roomCode, user, loading, setVisibleTabs]);

  // Handle page unload - clean up when user closes tab
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isTimerRunning) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    
    const handleUnload = () => {
      if (user && roomCode) {
        console.log("🚪 [PAGE_UNLOAD] Page unloading, cleaning up");
        // Don't clear timer on page unload, only on manual leave
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [user, roomCode, isTimerRunning]);

  // Handlers
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
      console.error("Error marking as ready:", e);
    }
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({
      title: "Copied!",
      description: "Room code copied to clipboard.",
    });
  };

  const handleLeaveRoom = async () => {
    console.log("🚪 [LEAVE_ROOM] User manually leaving room");
    clearTimerFromLocalStorage();
    leaveRoom();
    router.push("/home");
  };

  const setNewHost = async () => {
    console.log("🔄 [SET_HOST] Attempting to set new host");
    setIsRequestingHost(true);
    
    if (!user || !roomCode) {
      setIsRequestingHost(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/set-host"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({
          roomJoinCode: roomCode,
        }),
      });

      if (response.ok) {
        toast({
          title: "Host Request Sent",
          description: "Your request to become host has been sent.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to request host status.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error setting new host:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingHost(false);
    }
  };

  // Initialize file upload hook
  const fileUpload = useFileUpload(roomCode, user, (question: any) => {
    // Add question to the room's question list
    console.log("Generated question:", question);
  });
  
  // File upload handlers
  const handleFileUploadAndGenerate = async (file: File, type: 'summary' | 'mcq', summarySettings?: SummarySettings, mcqSettings?: MCQSettings) => {
    fileUpload.handleFileUploadAndGenerate(
      file, 
      type,
      summarySettings,
      mcqSettings
    );
  };

  const handleRemoveFile = () => {
    fileUpload.handleRemoveFile();
  };

  // Enhanced effect to restore timer state on mount - runs early to prevent timer loss
  useEffect(() => {
    if (typeof window !== "undefined" && roomCode) {
      console.log("🔄 [TIMER_EARLY_RESTORE] Attempting early timer state restoration");
      
      try {
        const saved = localStorage.getItem(`timer_${roomCode}`);
        if (saved) {
          const timerData = JSON.parse(saved);
          
          // Validate basic timer data structure
          if (timerData.isRunning && timerData.startTime && timerData.originalDuration) {
            const elapsed = Math.floor((Date.now() - timerData.startTime) / 1000);
            const remaining = Math.max(0, timerData.originalDuration - elapsed);
            
            if (remaining > 0) {
              console.log("✅ [TIMER_EARLY_RESTORE] Restoring timer state immediately:", {
                remaining,
                description: timerData.description,
                originalDuration: timerData.originalDuration
              });
              
              // Restore timer state immediately to prevent loss
              setTimerDuration(remaining);
              setTimerDescription(timerData.description || "");
              setIsTimerRunning(true);
              setOriginalTimerDuration(timerData.originalDuration);
              
              // Open timer tab immediately
              setVisibleTabs(prev => new Set([...prev, 'timer']));
            } else {
              console.log("🛑 [TIMER_EARLY_RESTORE] Timer finished, cleaning up");
              localStorage.removeItem(`timer_${roomCode}`);
            }
          }
        }
      } catch (e) {
        console.warn("❌ [TIMER_EARLY_RESTORE] Failed to restore timer state:", e);
      }
    }
  }, [roomCode]);

  // Effect to check and sync timer state on component mount
  useEffect(() => {
    if (typeof window !== "undefined" && roomCode && !isTimerInitialized.current) {
      console.log("🔄 [TIMER_INIT] Initializing timer state from localStorage");
      
      const existingTimer = validateTimerFromLocalStorage();
      if (existingTimer) {
        if (existingTimer.isRunning) {
          // Calculate remaining time
          const elapsed = Math.floor((Date.now() - existingTimer.startTime) / 1000);
          const remainingTime = Math.max(0, existingTimer.originalDuration - elapsed);
          
          if (remainingTime > 0) {
            console.log("🔄 [TIMER_INIT] Restoring running timer from localStorage with remaining time:", remainingTime);
            setTimerDuration(remainingTime);
            setTimerDescription(existingTimer.description || "");
            setIsTimerRunning(true);
            setOriginalTimerDuration(existingTimer.originalDuration);
            
            // Automatically open timer tab when timer is restored
            setVisibleTabs(prev => new Set([...prev, 'timer']));
          } else {
            console.log("🛑 [TIMER_INIT] Timer has finished, cleaning up");
            clearTimerFromLocalStorage();
            setIsTimerRunning(false);
            
            // Show timer finished notification
            toast({
              title: "Timer Finished",
              description: "Study timer has completed!",
            });
          }
        } else if (!existingTimer.isRunning) {
          // Timer is not running, set up from saved data but don't start it
          setTimerDescription(existingTimer.description || "");
          if (existingTimer.originalDuration) {
            setOriginalTimerDuration(existingTimer.originalDuration);
          }
          console.log("🔄 [TIMER_INIT] Timer not running, loaded description and duration");
        }
      } else {
        console.log("🔄 [TIMER_INIT] No existing timer data found");
      }
      
      // Mark timer as initialized to prevent further initialization attempts
      isTimerInitialized.current = true;
    }
  }, [roomCode, validateTimerFromLocalStorage, clearTimerFromLocalStorage, toast, setVisibleTabs]);

  // Loading states
  if (loading || roomLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Please log in to access this room.</div>
      </div>
    );
  }

  return (
    <div className="strategic-mind-container">
      <div className="lobby-content-wrapper">
        <div className="p-4 max-w-6xl w-full mx-auto flex flex-col items-center">
          <div className="w-full space-y-4">
            {/* Connection Status Indicator - Shows when reconnecting with a retry button */}
            {!isConnected && (
              <div className="w-full max-w-4xl mx-auto">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {/* Visual feedback: Amber indicator with pulsing animation during reconnection */}
                      <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-amber-700 font-medium">
                        {connectionLostRef.current 
                          ? `Reconnecting... (Attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts})`
                          : "Connecting to room..."
                        }
                      </span>
                    </div>
                    {/* Manual reconnection: Users can force reconnect if automatic attempts fail */}
                    {connectionLostRef.current && reconnectAttemptRef.current >= maxReconnectAttempts && (
                      <button
                        onClick={() => {
                          reconnectAttemptRef.current = 0
                          connectionLostRef.current = false
                          forceReconnect()
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Retry Connection
                      </button>
                    )}
                    {!connectionLostRef.current && (
                      <button
                        onClick={forceReconnect}
                        className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-1 rounded transition-colors"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Main Content Grid */}
            <div className="max-w-4xl w-full mx-auto">
              <div className="w-full">
                <div className="min-h-[200px] mb-24">
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
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="h-[500px] p-8">
                              <ChatRoom 
                                username={username} 
                                roomCode={roomCode} 
                                players={players} 
                                isLobby={true}
                                messages={chat.messages}
                                sendMessage={chat.sendMessage}
                                typingUsers={chat.typingUsers}
                                onTypingStart={chat.handleTypingStart}
                                onTypingStop={chat.handleTypingStop}
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
                            <CardTitle className="text-3xl font-bold tracking-tight text-purple-600">Study Stats</CardTitle>
                          </CardHeader>
                          <CardContent className="p-8">
                            <StudyStats 
                              studyTimeMinutes={session.studyTimeMinutes} 
                              practiceTimeMinutes={session.practiceTimeMinutes}
                              sessionGoalHours={session.sessionGoalHours}
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
                          </CardHeader>
                          <CardContent className="p-8">
                            <SessionGoals 
                              goals={session.sessionGoals}
                              onGoalToggle={session.handleGoalToggle}
                              onAddGoal={session.handleAddGoal}
                              onDeleteGoal={session.handleDeleteGoal}
                              isHost={isHost}
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
                                    onClick={() => session.setShowSessionList(true)}
                                    title="Start Practice Session - Start a quiz or practice session with generated questions"
                                  >
                                    <Play className="h-7 w-7" />
                                  </Button>
                                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    Start Practice Session
                                  </div>
                                </div>
                              )}

                              <div className="relative group">
                                <LectureList
                                  lectures={session.lectures.map(l => ({ ...l, id: String(l.lectureId) }))}
                                  onLectureSelect={session.handleLectureSelect}
                                />
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
                                    onClick={() => session.setShowStudyGoal(true)}
                                    title="Study Goal - Set daily study hour goal for the session"
                                  >
                                    <Target className="h-7 w-7" />
                                  </Button>
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
                                    onClick={() => fileUpload.setShowUploadModal(true)}
                                    disabled={fileUpload.isGenerating}
                                    title="Upload PDF - Upload PDF files to generate study materials and practice questions"
                                  >
                                    {fileUpload.isGenerating ? (
                                      <div className="animate-spin h-7 w-7 border-2 border-blue-600 border-t-transparent rounded-full" />
                                    ) : (
                                      <Upload className="h-7 w-7" />
                                    )}
                                  </Button>
                                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    Upload PDF
                                  </div>
                                  {/* Upload progress indicator */}
                                  {fileUpload.isGenerating && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  )}
                                  {fileUpload.questionsGenerated && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Request Host Button */}
                              {!isHost && (
                                <div className="relative group">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-14 w-14 border-2 border-gray-400/50 text-gray-600 hover:bg-gray-50 hover:border-gray-500 rounded-2xl"
                                    onClick={setNewHost}
                                    disabled={isRequestingHost}
                                    title="Request Host - Request to become the room host"
                                  >
                                    {isRequestingHost ? (
                                      <div className="animate-spin h-7 w-7 border-2 border-gray-600 border-t-transparent rounded-full" />
                                    ) : (
                                      <Crown className="h-7 w-7" />
                                    )}
                                  </Button>
                                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    Request Host
                                  </div>
                                </div>
                              )}

                              {/* Leave Room Button */}
                              <div className="relative group">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-14 w-14 border-2 border-red-400/50 text-red-600 hover:bg-red-50 hover:border-red-500 rounded-2xl"
                                  onClick={handleLeaveRoom}
                                  title="Leave Room - Exit the current study session"
                                >
                                  <LogOut className="h-7 w-7" />
                                </Button>
                                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  Leave Room
                                </div>
                              </div>
                            </div>

                            {/* Upload Progress and Success States */}
                            {isHost && fileUpload.isGenerating && (
                              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                <div className="flex items-center justify-center space-x-3">
                                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                  <span className="text-blue-700 font-medium">Processing PDF...</span>
                                </div>
                              </div>
                            )}

                            {isHost && fileUpload.uploadSuccess && !fileUpload.isGenerating && (
                              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                                <div className="flex items-center justify-center space-x-3">
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                  <span className="text-green-700 font-medium">Content generated successfully!</span>
                                </div>
                              </div>
                            )}

                            {isHost && fileUpload.uploadFailed && !fileUpload.isGenerating && (
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
                                      fileUpload.setShowUploadModal(true);
                                      fileUpload.setUploadFailed(false);
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
                  </div>
                </div>
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
                {players.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{players.length}</span>
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
                {chat.hasUnreadMessages && !visibleTabs.has('chat') && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
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

              {/* Goals Tab */}
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
                {session.sessionGoals.length > 0 && (
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <span className="text-white text-sm font-extrabold leading-none">
                      {session.sessionGoals.filter(g => g.done).length}/{session.sessionGoals.length}
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
                {isTimerRunning && (
                  <>
                    {currentRemainingTime > 0 ? (
                      <div className="absolute -top-2 -right-2 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg border-2 border-white px-1 py-0.5">
                        <span className="text-white text-xs font-bold leading-none whitespace-nowrap">
                          {formatTime(currentRemainingTime)}
                        </span>
                      </div>
                    ) : (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Study Goal Modal */}
        <Dialog open={session.showStudyGoal} onOpenChange={session.setShowStudyGoal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Set Study Goal</DialogTitle>
              <DialogDescription>
                Set your daily study hours goal for this session.
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
                  value={session.tempStudyGoal}
                  onChange={(e) => session.setTempStudyGoal(Number(e.target.value))}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={session.handleStudyGoalCancel}>
                Cancel
              </Button>
              <Button type="submit" onClick={session.handleStudyGoalSubmit}>
                Save Goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* PDF Upload Modal */}
        {isHost && (
          <PDFUploadModal
            onFileUpload={handleFileUploadAndGenerate}
            uploadedFile={fileUpload.uploadedFile}
            onRemoveFile={handleRemoveFile}
            isGenerating={fileUpload.isGenerating}
            questionsGenerated={fileUpload.questionsGenerated}
            uploadFailed={fileUpload.uploadFailed}
            isOpen={fileUpload.showUploadModal}
            onClose={() => fileUpload.setShowUploadModal(false)}
          />
        )}

        {/* Session List Modal */}
        {session.showSessionList && (
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => session.setShowSessionList(false)}
          />
        )}
        <SessionList
          sessions={session.sessions}
          onSessionSelect={session.handleSessionSelect}
          onClose={() => session.setShowSessionList(false)}
          isVisible={session.showSessionList}
        />
      </div>
    </div>
  );
}
