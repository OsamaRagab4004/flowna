import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api';

interface TimerData {
  timerDurationInSeconds: number;
  sessionGoals: string;
  roomJoinCode: string;
  timerEnabled: boolean;
  startTime?: number;
}

interface TimerState {
  timerDuration: number;
  timerDescription: string;
  isTimerRunning: boolean;
  originalTimerDuration: number;
  timerTick: number;
  showTimer: boolean;
  currentRemainingTime: number;
  pageTitle: string;
}

interface TimerActions {
  setTimerDuration: (duration: number) => void;
  setTimerDescription: (description: string) => void;
  setIsTimerRunning: (running: boolean) => void;
  setOriginalTimerDuration: (duration: number) => void;
  setTimerTick: (tick: number) => void;
  setShowTimer: (show: boolean) => void;
  saveTimerToLocalStorage: (duration: number, description: string, isRunning: boolean, startTime?: number, originalDuration?: number) => void;
  clearTimerFromLocalStorage: () => void;
  validateTimerFromLocalStorage: (skipUserValidation?: boolean) => any;
  handleTimerStartedFromServer: (timerData: TimerData) => void;
  handleTimerStoppedFromServer: (timerData: { roomJoinCode: string; timerEnabled: boolean }) => void;
  startTimerOnServer: (duration: number, description: string) => Promise<void>;
  stopTimerOnServer: () => Promise<void>;
  handleTimerStateChange: (isRunning: boolean) => Promise<void>;
  formatTime: (seconds: number) => string;
}

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

// Utility function to calculate remaining time for timer
const calculateRemainingTime = (startTime: number, originalDuration: number): number => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  return Math.max(0, originalDuration - elapsed);
};

export const useTimer = (
  roomCode: string,
  user: any,
  setVisibleTabs: (tabs: React.SetStateAction<Set<string>>) => void
): TimerState & TimerActions => {
  const { toast } = useToast();
  
  const [timerDuration, setTimerDuration] = useState(() => {
    if (typeof window !== "undefined") {
      const savedDuration = localStorage.getItem(`timer_${roomCode}_duration`);
      return savedDuration ? parseInt(savedDuration) : 25 * 60;
    }
    return 25 * 60;
  });
  
  const [timerDescription, setTimerDescription] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`timer_${roomCode}_description`) || "";
    }
    return "";
  });
  
  const [isTimerRunning, setIsTimerRunning] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`timer_${roomCode}_running`) === 'true';
    }
    return false;
  });
  
  const [originalTimerDuration, setOriginalTimerDuration] = useState(() => {
    if (typeof window !== "undefined") {
      const savedOriginal = localStorage.getItem(`timer_${roomCode}_original`);
      return savedOriginal ? parseInt(savedOriginal) : 25 * 60;
    }
    return 25 * 60;
  });
  
  const [timerTick, setTimerTick] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  
  const isCleaningUpTimer = useRef(false);
  const isTimerInitialized = useRef(false);

  // Function to save timer state to localStorage
  const saveTimerToLocalStorage = useCallback((duration: number, description: string, isRunning: boolean, startTime?: number, originalDuration?: number) => {
    if (typeof window !== "undefined") {
      const prefix = `timer_${roomCode}`;
      localStorage.setItem(`${prefix}_duration`, duration.toString());
      localStorage.setItem(`${prefix}_description`, description);
      localStorage.setItem(`${prefix}_running`, isRunning.toString());
      localStorage.setItem(`${prefix}_user`, user?.name || "");
      
      if (startTime) {
        localStorage.setItem(`${prefix}_startTime`, startTime.toString());
      }
      if (originalDuration) {
        localStorage.setItem(`${prefix}_original`, originalDuration.toString());
      }
    }
  }, [roomCode, user?.name]);

  // Function to clear timer from localStorage
  const clearTimerFromLocalStorage = useCallback(() => {
    if (typeof window !== "undefined") {
      const prefix = `timer_${roomCode}`;
      localStorage.removeItem(`${prefix}_duration`);
      localStorage.removeItem(`${prefix}_description`);
      localStorage.removeItem(`${prefix}_running`);
      localStorage.removeItem(`${prefix}_user`);
      localStorage.removeItem(`${prefix}_startTime`);
      localStorage.removeItem(`${prefix}_original`);
    }
  }, [roomCode]);

  // Function to validate timer localStorage data
  const validateTimerFromLocalStorage = useCallback((skipUserValidation = false) => {
    if (typeof window !== "undefined" && roomCode) {
      const prefix = `timer_${roomCode}`;
      const savedDuration = localStorage.getItem(`${prefix}_duration`);
      const savedDescription = localStorage.getItem(`${prefix}_description`);
      const savedRunning = localStorage.getItem(`${prefix}_running`);
      const savedUser = localStorage.getItem(`${prefix}_user`);
      const savedStartTime = localStorage.getItem(`${prefix}_startTime`);
      const savedOriginal = localStorage.getItem(`${prefix}_original`);
      
      if (savedDuration && savedRunning === 'true') {
        if (!skipUserValidation && savedUser !== user?.name) {
          clearTimerFromLocalStorage();
          return null;
        }
        
        return {
          duration: parseInt(savedDuration),
          description: savedDescription || "",
          isRunning: true,
          startTime: savedStartTime ? parseInt(savedStartTime) : Date.now(),
          originalDuration: savedOriginal ? parseInt(savedOriginal) : parseInt(savedDuration)
        };
      }
    }
    return null;
  }, [roomCode, user?.name, clearTimerFromLocalStorage]);

  // Function to handle timer started event from server
  const handleTimerStartedFromServer = useCallback((timerData: TimerData) => {
    console.log("🔔 [TIMER_STARTED] Received timer data from server:", timerData);
    
    const existingTimerData = validateTimerFromLocalStorage();
    
    if (existingTimerData && existingTimerData.isRunning) {
      console.log("🔔 [TIMER_STARTED] Already have running timer, keeping existing");
      return;
    }
    
    const serverStartTime = timerData.startTime || Date.now();
    const elapsed = Math.floor((Date.now() - serverStartTime) / 1000);
    const remainingTime = Math.max(0, timerData.timerDurationInSeconds - elapsed);
    
    if (remainingTime > 0) {
      setTimerDuration(remainingTime);
      setTimerDescription(timerData.sessionGoals || "");
      setIsTimerRunning(true);
      setOriginalTimerDuration(timerData.timerDurationInSeconds);
      
      saveTimerToLocalStorage(remainingTime, timerData.sessionGoals || "", true, serverStartTime, timerData.timerDurationInSeconds);
      setVisibleTabs(prev => new Set([...prev, 'timer']));
      
      toast({
        title: "Timer Started",
        description: `Study timer started for ${Math.floor(timerData.timerDurationInSeconds / 60)} minutes`,
      });
    } else {
      clearTimerFromLocalStorage();
    }
  }, [toast, saveTimerToLocalStorage, setVisibleTabs, validateTimerFromLocalStorage, clearTimerFromLocalStorage]);

  // Function to handle timer stopped event from server
  const handleTimerStoppedFromServer = useCallback((timerData: { roomJoinCode: string; timerEnabled: boolean }) => {
    console.log("🛑 [TIMER_STOPPED] Received timer stopped data from server:", timerData);
    
    setIsTimerRunning(false);
    setTimerDuration(25 * 60);
    setTimerDescription("");
    setOriginalTimerDuration(25 * 60);
    
    clearTimerFromLocalStorage();
    
    toast({
      title: "Timer Stopped",
      description: "Study timer has been stopped",
    });
  }, [toast, clearTimerFromLocalStorage]);

  // Function to start timer on server
  const startTimerOnServer = async (duration: number, description: string) => {
    if (!user || !roomCode) return;

    console.log("🚀 [START_TIMER] Starting timer on server with:", {
      duration,
      description,
      roomCode,
      user: user.name
    });

    // Implementation would go here - API call to start timer
  };

  // Function to stop timer on server
  const stopTimerOnServer = async () => {
    if (!user || !roomCode) return;

    console.log("🛑 [STOP_TIMER] Stopping timer on server for room:", roomCode);

    // Implementation would go here - API call to stop timer
  };

  // Enhanced timer state change handler
  const handleTimerStateChange = async (isRunning: boolean) => {
    console.log("🎯 [TIMER_STATE_CHANGE] Timer state changing to:", isRunning);
    
    if (isRunning) {
      await startTimerOnServer(timerDuration, timerDescription);
    } else {
      await stopTimerOnServer();
    }
  };

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

  // Update timer state every second when running
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setTimerTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, roomCode, timerDuration]);

  return {
    timerDuration,
    timerDescription,
    isTimerRunning,
    originalTimerDuration,
    timerTick,
    showTimer,
    currentRemainingTime,
    pageTitle,
    setTimerDuration,
    setTimerDescription,
    setIsTimerRunning,
    setOriginalTimerDuration,
    setTimerTick,
    setShowTimer,
    saveTimerToLocalStorage,
    clearTimerFromLocalStorage,
    validateTimerFromLocalStorage,
    handleTimerStartedFromServer,
    handleTimerStoppedFromServer,
    startTimerOnServer,
    stopTimerOnServer,
    handleTimerStateChange,
    formatTime
  };
};
