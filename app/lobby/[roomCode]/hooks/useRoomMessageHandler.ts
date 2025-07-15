import { useCallback } from 'react';

interface RoomMessageHandlerProps {
  roomCode: string;
  fetchRoomMembers: () => void;
  fetchRoomMessages: () => void;
  fetchRoomGoals: () => void;
  fetchDiscordLink: () => void;
  fetchLectures: () => void;
  fetchSessions: () => void;
  updateRoomStats: () => void;
  setRoomLoading: (loading: boolean) => void;
  leaveRoom: () => void;
  toast: any;
  user: any;
  handleTimerStartedFromServer: (timerData: any) => void;
  handleTimerStoppedFromServer: (timerData: any) => void;
  setPlayers: (players: any) => void;
  setSessionGoalHours: (hours: number) => void;
  setDiscordLink: (link: string) => void;
  setMessages: (messages: any) => void;
  setTypingUsers: (users: any) => void;
  setHasUnreadMessages: (hasUnread: boolean) => void;
  setLastSeenMessageCount: (count: number) => void;
  setSessions: (sessions: any) => void;
  setLectures: (lectures: any) => void;
  setStudyTimeMinutes: (minutes: number) => void;
  setPracticeTimeMinutes: (minutes: number) => void;
  router: any;
  visibleTabs: Set<string>;
}

export const useRoomMessageHandler = ({
  roomCode,
  fetchRoomMembers,
  fetchRoomMessages,
  fetchRoomGoals,
  fetchDiscordLink,
  fetchLectures,
  fetchSessions,
  updateRoomStats,
  setRoomLoading,
  leaveRoom,
  toast,
  user,
  handleTimerStartedFromServer,
  handleTimerStoppedFromServer,
  setPlayers,
  setSessionGoalHours,
  setDiscordLink,
  setMessages,
  setTypingUsers,
  setHasUnreadMessages,
  setLastSeenMessageCount,
  setSessions,
  setLectures,
  setStudyTimeMinutes,
  setPracticeTimeMinutes,
  router,
  visibleTabs
}: RoomMessageHandlerProps) => {
  
  const handleRoomMessage = useCallback(
    (message: { body: any }) => {
      try {
        const response = JSON.parse(message.body);
        
        if (response.eventType === "ROOM_MEMBERS_LIST") {
          // Fetch additional data when room members are received
          fetchRoomMessages();
          fetchRoomGoals();
          fetchDiscordLink();
          fetchLectures();
          fetchSessions();
          updateRoomStats();
          
          const newPlayers = Array.isArray(response.payload) ? response.payload : [];
          console.log("👥 [ROOM_MEMBERS] Received room members:", newPlayers);
          setPlayers(newPlayers);
          
          // Mark room data as loaded after first fetch
          setRoomLoading(false);
        }
        
        if (response.eventType === "SET_ROOM_HOURS_GOAL") {
          console.log("🎯 [ROOM_GOAL] Room goal set:", response.payload);
          setSessionGoalHours(response.payload);
          localStorage.setItem(`sessionGoal_${roomCode}`, JSON.stringify(response.payload));
        }

        if (response.eventType === "EXAM_STARTED") {
          console.log("📝 [EXAM_STARTED] Exam started, redirecting...");
          const collectorId = response.payload;
          leaveRoom(); // Leave the room before opening exam page
          // Open the exam page in a new tab
          router.push(`/mcq/${collectorId}?roomCode=${roomCode}`);
        }

        if (response.eventType === "SET_DISCORD_LINK") {
          console.log("🔗 [DISCORD_LINK] Discord link updated:", response.payload);
          setDiscordLink(response.payload);
        }
        
        if (response.eventType === "PLAYER_READY") {
          console.log("✅ [PLAYER_READY] Player ready status updated");
          fetchRoomMembers();
        }
        
        if (response.eventType === "ROOM_SESSIONS") {
          console.log("📚 [ROOM_SESSIONS] Sessions updated:", response.payload);
          // Also fetch goals from server when sessions are updated
          fetchRoomGoals();
        }
        
        if (response.eventType === "USER_LEFT") {
          console.log("👋 [USER_LEFT] User left room");
          fetchRoomMembers();
        }
        
        if (response.eventType === "NEW_USER_JOINED") {
          console.log("👋 [USER_JOINED] New user joined room");
          fetchRoomMembers();
        }
        
        if (response.eventType === "SEND_MESSAGE" || response.eventType === "GET_ALL_MESSAGES") {
          console.log("💬 [CHAT_MESSAGE] Chat message received:", response.payload);
          
          // Handle message received event from server - server returns ALL messages, not just new one
          if (response.payload && Array.isArray(response.payload)) {
            // Server sends all messages as an array, so we replace the entire messages array
            const allMessages = response.payload.map((msgData: any) => ({
              id: `msg-${msgData.id}`, // Use server's message ID
              message: msgData.msgContent || "",
              senderName: msgData.username || "Unknown User",
              timestamp: msgData.createdAt ? new Date(msgData.createdAt).getTime() : Date.now(),
            }));
            
            // Sort messages by timestamp (oldest to newest)
            const sortedMessages = allMessages.length > 1 
              ? allMessages.sort((a: any, b: any) => a.timestamp - b.timestamp)
              : allMessages;

            // Batch state updates to prevent multiple re-renders
            setMessages((prev: any[]) => {
              // Only update if messages actually changed
              const shouldUpdate = prev.length !== sortedMessages.length || 
                  (sortedMessages.length > 0 && prev[prev.length - 1]?.id !== sortedMessages[sortedMessages.length - 1]?.id);
              
              if (shouldUpdate) {
                // Check if chat is closed and we have new messages to show notification
                const isChatClosed = !visibleTabs.has('chat');
                const hasNewMessages = sortedMessages.length > prev.length;
                
                if (isChatClosed && hasNewMessages && response.eventType === "SEND_MESSAGE") {
                  // Use requestAnimationFrame to defer notification update
                  requestAnimationFrame(() => setHasUnreadMessages(true));
                }
                
                return sortedMessages;
              }
              return prev;
            });
          }
        }
        
        if (response.eventType === "TIMER_STARTED") {
          console.log("⏰ [TIMER_STARTED] Timer started event received");
          handleTimerStartedFromServer(response.payload);
        }

        if (response.eventType === "UPDATE_LECTURE_LIST") {
          console.log("📖 [LECTURE_UPDATE] Lecture list updated:", response.payload);
          setLectures(response.payload || []);
        }
        
        if (response.eventType === "UPDATE_SESSION_LIST") {
          console.log("📚 [SESSION_UPDATE] Session list updated:", response.payload);
          setSessions(response.payload || []);
        }

        if (response.eventType === "TIMER_STOPED") {
          console.log("⏰ [TIMER_STOPPED] Timer stopped event received");
          handleTimerStoppedFromServer(response.payload);
        }
        
        if (response.eventType === "USER_TYPING") {
          console.log("⌨️ [USER_TYPING] User typing event:", response.payload);
          // Handle typing indicator events - optimized
          const { username, typing } = response.payload;
          
          if (username !== user?.name) { // Don't show own typing indicator
            setTypingUsers((prev: string[]) => {
              if (typing) {
                // Add user to typing list if not already there
                return prev.includes(username) ? prev : [...prev, username];
              } else {
                // Remove user from typing list
                return prev.filter((u: string) => u !== username);
              }
            });
          }
        }
        
        if (response.eventType === "ROOM_SESSION_TIME_UPDATE") {
          console.log("📊 [SESSION_TIME_UPDATE] Session time updated:", response.payload);
          const data = response.payload;
          
          // Update study and practice time based on server data
          setStudyTimeMinutes(data.roomStudyMinutes || 0);
          setPracticeTimeMinutes(data.roomPractiseMinutes || 0);
        }
        
      } catch (err) {
        console.error("Lobby: Failed to parse or process room message", err);
      }
    },
    [
      roomCode,
      fetchRoomMembers,
      fetchRoomMessages,
      fetchRoomGoals,
      fetchDiscordLink,
      fetchLectures,
      fetchSessions,
      updateRoomStats,
      setRoomLoading,
      leaveRoom,
      toast,
      user,
      handleTimerStartedFromServer,
      handleTimerStoppedFromServer,
      setPlayers,
      setSessionGoalHours,
      setDiscordLink,
      setMessages,
      setTypingUsers,
      setHasUnreadMessages,
      setLastSeenMessageCount,
      setSessions,
      setLectures,
      setStudyTimeMinutes,
      setPracticeTimeMinutes,
      router,
      visibleTabs
    ]
  );

  return handleRoomMessage;
};
