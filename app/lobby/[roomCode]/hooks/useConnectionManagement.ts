import { useRef, useEffect } from 'react';

interface ConnectionManagementProps {
  isConnected: boolean;
  user: any;
  roomCode: string;
  forceReconnect: () => void;
  fetchRoomMembers: () => void;
  fetchRoomMessages: () => void;
  validateTimerFromLocalStorage: (preserveStateForReconnect?: boolean) => any;
  clearTimerFromLocalStorage: () => void;
  setTimerDuration: (duration: number) => void;
  setTimerDescription: (description: string) => void;
  setIsTimerRunning: (running: boolean) => void;
  setOriginalTimerDuration: (duration: number) => void;
  toast: any;
}

export const useConnectionManagement = ({
  isConnected,
  user,
  roomCode,
  forceReconnect,
  fetchRoomMembers,
  fetchRoomMessages,
  validateTimerFromLocalStorage,
  clearTimerFromLocalStorage,
  setTimerDuration,
  setTimerDescription,
  setIsTimerRunning,
  setOriginalTimerDuration,
  toast
}: ConnectionManagementProps) => {
  const connectionLostRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  useEffect(() => {
    if (!user || !roomCode) return;

    if (isConnected) {
      // Connection restored
      if (connectionLostRef.current) {
        console.log("🔄 [CONNECTION] Connection restored, fetching room data");
        connectionLostRef.current = false;
        reconnectAttemptRef.current = 0;
        
        // Preserve timer state during reconnection
        const existingTimerData = validateTimerFromLocalStorage(true);
        if (existingTimerData && existingTimerData.isRunning) {
          console.log("🔄 [CONNECTION] Preserving timer state during reconnection:", {
            description: existingTimerData.description,
            startTime: new Date(existingTimerData.startTime).toISOString(),
            originalDuration: existingTimerData.originalDuration
          });
          
          // Calculate remaining time
          const elapsed = Math.floor((Date.now() - existingTimerData.startTime) / 1000);
          const remaining = Math.max(0, existingTimerData.originalDuration - elapsed);
          
          if (remaining > 0) {
            // Timer is still running, preserve its state
            setTimerDuration(remaining);
            setTimerDescription(existingTimerData.description || "");
            setIsTimerRunning(true);
            setOriginalTimerDuration(existingTimerData.originalDuration);
            console.log("🔄 [CONNECTION] Timer state preserved with remaining time:", remaining);
          } else {
            // Timer has finished during disconnection
            console.log("🛑 [CONNECTION] Timer finished during disconnection, cleaning up");
            clearTimerFromLocalStorage();
            setIsTimerRunning(false);
            setTimerDuration(25 * 60);
            setTimerDescription("");
            setOriginalTimerDuration(25 * 60);
          }
        }
        
        // Refetch room data after reconnection immediately
        fetchRoomMembers();
        fetchRoomMessages();
        
        toast({
          title: "Connection Restored",
          description: "Successfully reconnected to the room",
        });
      }
    } else {
      // Connection lost
      if (!connectionLostRef.current) {
        console.log("⚠️ [CONNECTION] Connection lost, will attempt to reconnect");
        connectionLostRef.current = true;
        
        toast({
          title: "Connection Lost",
          description: "Attempting to reconnect...",
          variant: "destructive"
        });
      }
      
      // Automatic reconnection: Attempts to reconnect when issues are detected - MUCH FASTER
      const attemptReconnect = () => {
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current++;
          console.log(`🔄 [CONNECTION] IMMEDIATE reconnection attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts}`);
          
          // Immediate reconnection - no delay
          if (!isConnected && user && roomCode) {
            forceReconnect();
          }
        } else {
          console.log("❌ [CONNECTION] Max reconnection attempts reached");
          toast({
            title: "Connection Failed",
            description: "Unable to reconnect. Please refresh the page.",
            variant: "destructive"
          });
        }
      };
      
      // Start reconnection attempts immediately - no delay
      if (connectionLostRef.current && reconnectAttemptRef.current === 0) {
        attemptReconnect();
      }
    }
  }, [
    isConnected,
    user,
    roomCode,
    forceReconnect,
    fetchRoomMembers,
    fetchRoomMessages,
    validateTimerFromLocalStorage,
    clearTimerFromLocalStorage,
    setTimerDuration,
    setTimerDescription,
    setIsTimerRunning,
    setOriginalTimerDuration,
    toast
  ]);

  return {
    connectionLostRef,
    reconnectAttemptRef,
    maxReconnectAttempts
  };
};
