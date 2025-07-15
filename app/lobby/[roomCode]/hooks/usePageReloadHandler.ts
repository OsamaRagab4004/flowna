import { useEffect } from 'react';
import { getApiUrl } from '@/lib/api';

interface PageReloadHandlerProps {
  roomCode: string;
  toast: any;
  user: any;
  loading: boolean;
  router: any;
  stompClient: any;
  fetchRoomMembers: () => void;
  validateTimerFromLocalStorage: (skipUserValidation?: boolean) => any;
  clearTimerFromLocalStorage: () => void;
  setVisibleTabs: (tabs: React.SetStateAction<Set<string>>) => void;
  setNeedsRejoin: (needsRejoin: boolean) => void;
  setTimerDuration: (duration: number) => void;
  setTimerDescription: (description: string) => void;
  setIsTimerRunning: (running: boolean) => void;
  setOriginalTimerDuration: (duration: number) => void;
}

export const usePageReloadHandler = ({
  roomCode,
  toast,
  user,
  loading,
  router,
  stompClient,
  fetchRoomMembers,
  validateTimerFromLocalStorage,
  clearTimerFromLocalStorage,
  setVisibleTabs,
  setNeedsRejoin,
  setTimerDuration,
  setTimerDescription,
  setIsTimerRunning,
  setOriginalTimerDuration
}: PageReloadHandlerProps) => {
  
  useEffect(() => {
    const checkPageReload = async () => {
      try {
        if (typeof window === "undefined") return;

        if (sessionStorage.getItem(`reloading_${roomCode}`)) {
          console.log("🔄 Page reload detected using sessionStorage");
          sessionStorage.removeItem(`reloading_${roomCode}`);

          setNeedsRejoin(true);

          if (loading) {
            console.log("⏳ Still loading user authentication, waiting...");
            return;
          }
          
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
                
                // Restore timer state from localStorage after successful rejoin
                const existingTimerData = validateTimerFromLocalStorage(true);
                if (existingTimerData && existingTimerData.isRunning) {
                  const elapsed = Math.floor((Date.now() - existingTimerData.startTime) / 1000);
                  const remaining = Math.max(0, existingTimerData.originalDuration - elapsed);
                  
                  if (remaining > 0) {
                    console.log("✅ [PAGE_RELOAD] Timer state restored with remaining time:", remaining);
                    setTimerDuration(remaining);
                    setTimerDescription(existingTimerData.description || "");
                    setIsTimerRunning(true);
                    setOriginalTimerDuration(existingTimerData.originalDuration);
                    
                    // Automatically open timer tab when timer is restored
                    setVisibleTabs(prev => new Set([...prev, 'timer']));
                  } else {
                    console.log("🛑 [PAGE_RELOAD] Timer finished during reload, cleaning up");
                    clearTimerFromLocalStorage();
                    setIsTimerRunning(false);
                  }
                }
                
                // Wait for STOMP connection and fetch members
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
                
                waitForStompAndFetch();
                
              } else {
                console.warn("⚠️ Failed to auto-rejoin room, server responded with error.");
                const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
                toast({ 
                  title: "Rejoin Failed", 
                  description: errorData.message, 
                  variant: "destructive" 
                });
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

    if (!loading) {
      checkPageReload();
    }
  }, [
    roomCode,
    toast,
    user,
    loading,
    router,
    stompClient,
    fetchRoomMembers,
    validateTimerFromLocalStorage,
    clearTimerFromLocalStorage,
    setVisibleTabs,
    setNeedsRejoin,
    setTimerDuration,
    setTimerDescription,
    setIsTimerRunning,
    setOriginalTimerDuration
  ]);

  // Handle beforeunload and unload events
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      sessionStorage.setItem(`reloading_${roomCode}`, 'true');
      console.log("🔄 [BEFOREUNLOAD] Page refresh detected, preserving timer state");
    };
    
    const handleUnload = () => {
      const isPageReload = sessionStorage.getItem(`reloading_${roomCode}`) === 'true';
      
      if (user && !isPageReload) {
        // Only clean up if this is NOT a page reload
        console.log("🧹 [UNLOAD] Cleaning up on page close");
      } else if (isPageReload) {
        console.log("🔄 [UNLOAD] Page reload detected, preserving state");
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [roomCode, user, clearTimerFromLocalStorage]);
};
