import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api';

export interface TimerHook {
  timerDuration: number;
  timerDescription: string;
  isTimerRunning: boolean;
  originalTimerDuration: number;
  currentRemainingTime: number;
  formatTime: (seconds: number) => string;
  setTimerDuration: (duration: number) => void;
  setTimerDescription: (description: string) => void;
  setIsTimerRunning: (running: boolean) => void;
  setOriginalTimerDuration: (duration: number) => void;
  handleTimerStateChange: (isRunning: boolean) => Promise<void>;
  handleTimerStartedFromServer: (timerData: any) => void;
  handleTimerStoppedFromServer: (timerData: any) => void;
  saveTimerToLocalStorage: (duration: number, description: string, isRunning: boolean, startTime?: number, originalDuration?: number) => void;
  clearTimerFromLocalStorage: () => void;
  validateTimerFromLocalStorage: (skipUserValidation?: boolean) => any;
}

// Utility function to calculate remaining time for timer
const calculateRemainingTime = (startTime: number, originalDuration: number): number => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  return Math.max(0, originalDuration - elapsed);
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

export const useTimer = (
  user: any,
  roomCode: string,
  setVisibleTabs: (tabs: Set<string> | ((prev: Set<string>) => Set<string>)) => void
): TimerHook => {
  const { toast } = useToast();
  
  // Timer state initialization from localStorage
  const [timerDuration, setTimerDuration] = useState(() => {
    if (typeof window !== "undefined" && roomCode) {
      const savedTimer = localStorage.getItem(`timer_${roomCode}`);
      if (savedTimer) {
        try {
          const parsed = JSON.parse(savedTimer);
          
          // If timer is running, calculate the remaining time
          if (parsed.isRunning && parsed.startTime) {
            const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
            const remaining = Math.max(0, (parsed.originalDuration || parsed.duration) - elapsed);
            console.log("🔄 [TIMER_INIT] Calculated remaining time from localStorage:", {
              originalDuration: parsed.originalDuration || parsed.duration,
              elapsed,
              remaining,
              startTime: new Date(parsed.startTime).toISOString()
            });
            return remaining;
          }
          
          return parsed.duration || 25 * 60;
        } catch (e) {
          console.error("Error parsing saved timer duration:", e);
        }
      }
    }
    return 25 * 60;
  });

  const [timerDescription, setTimerDescription] = useState<string>(() => {
    if (typeof window !== "undefined" && roomCode) {
      const savedTimer = localStorage.getItem(`timer_${roomCode}`);
      if (savedTimer) {
        try {
          const parsed = JSON.parse(savedTimer);
          return parsed.description || "";
        } catch (e) {
          console.error("Error parsing saved timer description:", e);
        }
      }
    }
    return "";
  });

  const [isTimerRunning, setIsTimerRunning] = useState(() => {
    if (typeof window !== "undefined" && roomCode) {
      const savedTimer = localStorage.getItem(`timer_${roomCode}`);
      if (savedTimer) {
        try {
          const parsed = JSON.parse(savedTimer);
          return parsed.isRunning || false;
        } catch (e) {
          console.error("Error parsing saved timer running state:", e);
        }
      }
    }
    return false;
  });

  const [originalTimerDuration, setOriginalTimerDuration] = useState(() => {
    if (typeof window !== "undefined" && roomCode) {
      const savedTimer = localStorage.getItem(`timer_${roomCode}`);
      if (savedTimer) {
        try {
          const parsed = JSON.parse(savedTimer);
          return parsed.originalDuration || 25 * 60;
        } catch (e) {
          console.error("Error parsing saved original timer duration:", e);
        }
      }
    }
    return 25 * 60;
  });

  // Timer tick state for forcing re-renders
  const [timerTick, setTimerTick] = useState(0);
  const isCleaningUpTimer = useRef(false);
  const isTimerInitialized = useRef(false);

  // Calculate current remaining time
  const currentRemainingTime = (() => {
    if (!isTimerRunning) return timerDuration;
    
    try {
      const savedTimer = localStorage.getItem(`timer_${roomCode}`);
      if (savedTimer) {
        const parsed = JSON.parse(savedTimer);
        if (parsed.isRunning && parsed.startTime && parsed.originalDuration) {
          return calculateRemainingTime(parsed.startTime, parsed.originalDuration);
        }
      }
    } catch (e) {
      console.error("Error calculating remaining time:", e);
    }
    
    return timerDuration;
  })();

  // Function to save timer state to localStorage
  const saveTimerToLocalStorage = useCallback((duration: number, description: string, isRunning: boolean, startTime?: number, originalDuration?: number) => {
    if (typeof window !== "undefined" && roomCode) {
      const timerData = {
        duration,
        description,
        isRunning,
        startTime: startTime || Date.now(),
        originalDuration: originalDuration || duration,
        timestamp: Date.now(),
        roomCode, // Include room code for validation
        username: user?.name, // Include username for validation
        sessionId: Date.now() // Unique session identifier to prevent conflicts
      };
      
      localStorage.setItem(`timer_${roomCode}`, JSON.stringify(timerData));
      console.log("💾 [TIMER_STORAGE] Saved timer to localStorage:", timerData);
    }
  }, [roomCode, user?.name]);

  // Function to clear timer from localStorage
  const clearTimerFromLocalStorage = useCallback(() => {
    if (typeof window !== "undefined" && roomCode) {
      localStorage.removeItem(`timer_${roomCode}`);
      console.log("🗑️ [TIMER_STORAGE] Cleared timer from localStorage");
    }
  }, [roomCode]);

  // Function to validate timer localStorage data
  const validateTimerFromLocalStorage = useCallback((skipUserValidation = false) => {
    if (typeof window !== "undefined" && roomCode) {
      const savedTimer = localStorage.getItem(`timer_${roomCode}`);
      if (savedTimer) {
        try {
          const parsed = JSON.parse(savedTimer);
          
          // Validate that the timer data belongs to current room
          if (parsed.roomCode !== roomCode) {
            console.warn("🚨 [TIMER_VALIDATION] Timer data from different room, clearing:", parsed.roomCode, "vs", roomCode);
            clearTimerFromLocalStorage();
            return null;
          }
          
          // Only validate username if user is available and we're not skipping validation
          if (!skipUserValidation && user?.name && parsed.username && parsed.username !== user.name) {
            console.warn("🚨 [TIMER_VALIDATION] Timer data from different user, clearing:", parsed.username, "vs", user.name);
            clearTimerFromLocalStorage();
            return null;
          }
          
          // Check if timer data is too old (older than 24 hours)
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          if (parsed.timestamp && (Date.now() - parsed.timestamp) > maxAge) {
            console.warn("🚨 [TIMER_VALIDATION] Timer data too old, clearing");
            clearTimerFromLocalStorage();
            return null;
          }
          
          // Validate timer data structure
          if (parsed.duration && parsed.startTime && parsed.originalDuration) {
            const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
            const remainingTime = Math.max(0, parsed.originalDuration - elapsed);
            
            // If timer has expired, clean up
            if (remainingTime <= 0 && parsed.isRunning) {
              console.log("⏰ [TIMER_VALIDATION] Timer expired, cleaning up");
              clearTimerFromLocalStorage();
              return null;
            }
            
            console.log("✅ [TIMER_VALIDATION] Timer data validated successfully:", parsed);
            return {
              ...parsed,
              remainingTime
            };
          }
        } catch (e) {
          console.error("Error validating timer from localStorage:", e);
          clearTimerFromLocalStorage();
        }
      }
    }
    return null;
  }, [roomCode, user?.name, clearTimerFromLocalStorage]);

  // Function to start timer on server
  const startTimerOnServer = async (duration: number, description: string): Promise<boolean> => {
    if (!user || !roomCode) {
      console.error("❌ [START_TIMER] Cannot start timer: missing user or room code");
      return false;
    }

    console.log("🚀 [START_TIMER] Starting timer on server with:", {
      duration,
      description,
      roomCode,
      user: user.name
    });

    try {
      const requestBody = {
        roomJoinCode: roomCode,
        timerDurationInSeconds: duration,
        sessionGoals: description,
        timerEnabled: true
      };
      
      console.log("📤 [START_TIMER] Request body:", requestBody);

      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/start-timer"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 [START_TIMER] Response status:", response.status, response.statusText);

      if (response.ok) {
        const responseData = await response.json().catch(() => null);
        console.log("✅ [START_TIMER] Timer started successfully on server, response:", responseData);
        return true;
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("❌ [START_TIMER] Failed to start timer on server:", errorData);
        toast({
          title: "Error",
          description: `Failed to start timer: ${errorData.message}`,
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error("❌ [START_TIMER] Error starting timer on server:", error);
      toast({
        title: "Error", 
        description: "Failed to start timer on server",
        variant: "destructive"
      });
      return false;
    }
  };

  // Function to stop timer on server
  const stopTimerOnServer = async (): Promise<boolean> => {
    if (!user || !roomCode) {
      console.error("❌ [STOP_TIMER] Cannot stop timer: missing user or room code");
      return false;
    }

    console.log("🛑 [STOP_TIMER] Stopping timer on server for room:", roomCode);

    try {
      const requestBody = {
        roomJoinCode: roomCode,
        timerEnabled: false
      };
      
      console.log("📤 [STOP_TIMER] Request body:", requestBody);

      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/stop-timer"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 [STOP_TIMER] Response status:", response.status, response.statusText);

      if (response.ok) {
        const responseData = await response.json().catch(() => null);
        console.log("✅ [STOP_TIMER] Timer stopped successfully on server, response:", responseData);
        return true;
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("❌ [STOP_TIMER] Failed to stop timer on server:", errorData);
        toast({
          title: "Error",
          description: `Failed to stop timer: ${errorData.message}`,
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error("❌ [STOP_TIMER] Error stopping timer on server:", error);
      toast({
        title: "Error",
        description: "Failed to stop timer on server", 
        variant: "destructive"
      });
      return false;
    }
  };

  // Enhanced timer state change handler that communicates with server
  const handleTimerStateChange = async (isRunning: boolean) => {
    console.log("🎯 [TIMER_STATE_CHANGE] Timer state changing to:", isRunning);
    console.log("🎯 [TIMER_STATE_CHANGE] Current timer data:", {
      duration: timerDuration,
      description: timerDescription,
      isCurrentlyRunning: isTimerRunning
    });
    
    if (isRunning) {
      // Starting timer - communicate with server
      const success = await startTimerOnServer(timerDuration, timerDescription);

      if (success) {
        setIsTimerRunning(true);
        setOriginalTimerDuration(timerDuration);
        
        // Save timer state to localStorage when starting
        saveTimerToLocalStorage(timerDuration, timerDescription, true, Date.now(), timerDuration);
        
        // Show timer tab
        setVisibleTabs(prev => new Set([...prev, 'timer']));
        
        console.log("✅ [TIMER_STATE_CHANGE] Timer started successfully, saved to localStorage");
      } else {
        console.error("❌ [TIMER_STATE_CHANGE] Failed to start timer on server");
      }
    } else {
      console.log("🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯" + localStorage.getItem(`timer_${roomCode}`));
      
      // Stopping timer - communicate with server
      const success = await stopTimerOnServer();
      
      if (success) {
        // Complete cleanup when stopping timer locally
        setIsTimerRunning(false);
        setTimerDuration(25 * 60); // Reset to default 25 minutes
        setTimerDescription(""); // Clear description  
        setOriginalTimerDuration(25 * 60); // Reset original duration
        
        // Clear timer from localStorage when host stops the timer
        clearTimerFromLocalStorage();
        console.log("✅ [TIMER_STATE_CHANGE] Timer stopped successfully, all states reset and cleared from localStorage");
      } else {
        console.error("❌ [TIMER_STATE_CHANGE] Failed to stop timer on server");
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
      
      // Check if existing timer is still valid
      if (existingTimerData.remainingTime > 0) {
        console.log("🔄 [TIMER_STARTED] Preserving existing timer state:", {
          duration: existingTimerData.duration,
          description: existingTimerData.description,
          remainingTime: existingTimerData.remainingTime
        });
        
        // Update states with existing timer data
        setTimerDuration(existingTimerData.remainingTime);
        setTimerDescription(existingTimerData.description);
        setIsTimerRunning(true);
        setOriginalTimerDuration(existingTimerData.originalDuration);
        
        // Show timer tab
        setVisibleTabs(prev => new Set([...prev, 'timer']));
        return;
      } else {
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
      setTimerDuration(remainingTime);
      setTimerDescription(timerData.sessionGoals);
      setIsTimerRunning(true);
      setOriginalTimerDuration(timerData.timerDurationInSeconds);
      
      // Save timer state to localStorage
      saveTimerToLocalStorage(remainingTime, timerData.sessionGoals, true, serverStartTime, timerData.timerDurationInSeconds);
      
      // Show timer tab
      setVisibleTabs(prev => new Set([...prev, 'timer']));
      
      toast({
        title: "Timer Started",
        description: `Study timer running: ${formatTime(remainingTime)} remaining`,
      });
    } else {
      console.log("🛑 [TIMER_STARTED] Server timer has no remaining time, not starting");
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

  // Update timer state and page title every second when timer is running
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setTimerTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Effect to save timer settings to localStorage whenever they change (except when running or during cleanup)
  useEffect(() => {
    // Don't save during cleanup or if timer is running
    if (isCleaningUpTimer.current || isTimerRunning) return;
    
    // Don't save the default reset value to prevent conflicts
    if (timerDuration === 25 * 60 && timerDescription === "") return;
    
    // Only save if timer has a valid duration
    if (timerDuration > 0) {
      saveTimerToLocalStorage(timerDuration, timerDescription, false);
    }
  }, [timerDuration, timerDescription, isTimerRunning, saveTimerToLocalStorage]);

  // Effect to check and sync timer state on component mount
  useEffect(() => {
    if (typeof window !== "undefined" && roomCode && !isTimerInitialized.current) {
      const existingTimer = validateTimerFromLocalStorage();
      if (existingTimer && existingTimer.isRunning) {
        if (existingTimer.remainingTime > 0) {
          console.log("🔄 [TIMER_INIT] Restoring running timer from localStorage");
          setTimerDuration(existingTimer.remainingTime);
          setTimerDescription(existingTimer.description);
          setIsTimerRunning(true);
          setOriginalTimerDuration(existingTimer.originalDuration);
          setVisibleTabs(prev => new Set([...prev, 'timer']));
        } else {
          console.log("🛑 [TIMER_INIT] Timer expired, cleaning up");
          clearTimerFromLocalStorage();
          toast({
            title: "Timer Finished",
            description: "Your study timer has finished!",
          });
        }
      }
      isTimerInitialized.current = true;
    }
  }, [roomCode, validateTimerFromLocalStorage, clearTimerFromLocalStorage, toast, setVisibleTabs]);

  // Effect to periodically sync timer for running timers
  useEffect(() => {
    // Wait for timer initialization to complete before starting sync
    if (!isTimerRunning || isCleaningUpTimer.current || !isTimerInitialized.current) return;

    const syncInterval = setInterval(async () => {
      const existingTimer = validateTimerFromLocalStorage();
      if (existingTimer && existingTimer.isRunning) {
        if (existingTimer.remainingTime <= 0) {
          console.log("⏰ [TIMER_SYNC] Timer finished!");
          
          // Add study time to server when timer finishes
          if (user && roomCode && existingTimer.originalDuration) {
            const timeInMinutes = Math.floor(existingTimer.originalDuration / 60);
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
                  sessionType: 'study',
                }),
              });

              if (response.ok) {
                console.log("✅ [TIMER_FINISHED] Study time added to server:", timeInMinutes, "minutes");
              } else {
                console.error("❌ [TIMER_FINISHED] Failed to add study time to server");
              }
            } catch (error) {
              console.error("❌ [TIMER_FINISHED] Error adding study time:", error);
            }
          }
          
          setIsTimerRunning(false);
          setTimerDuration(25 * 60);
          setTimerDescription("");
          setOriginalTimerDuration(25 * 60);
          clearTimerFromLocalStorage();
          
          toast({
            title: "Timer Finished",
            description: "Your study timer has finished!",
          });
        } else {
          // Update current duration to remaining time
          setTimerDuration(existingTimer.remainingTime);
        }
      }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [isTimerRunning, timerDuration, roomCode, clearTimerFromLocalStorage, validateTimerFromLocalStorage, toast, user]);

  return {
    timerDuration,
    timerDescription,
    isTimerRunning,
    originalTimerDuration,
    currentRemainingTime,
    formatTime,
    setTimerDuration,
    setTimerDescription,
    setIsTimerRunning,
    setOriginalTimerDuration,
    handleTimerStateChange,
    handleTimerStartedFromServer,
    handleTimerStoppedFromServer,
    saveTimerToLocalStorage,
    clearTimerFromLocalStorage,
    validateTimerFromLocalStorage
  };
};
