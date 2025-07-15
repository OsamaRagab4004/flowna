import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChatMessage } from './useChat';

export interface RoomMessageHandlerHook {
  handleRoomMessage: (message: { body: any }) => void;
}

export const useRoomMessageHandler = (
  user: any,
  roomCode: string,
  // Chat handlers
  setMessages: (messages: ChatMessage[]) => void,
  setTypingUsers: (users: string[] | ((prev: string[]) => string[])) => void,
  setHasUnreadMessages: (hasUnread: boolean) => void,
  lastSeenMessageCount: number,
  visibleTabs: Set<string>,
  // Session handlers
  setSessionGoals: (goals: any[]) => void,
  setSessionGoalHours: (hours: number) => void,
  setDiscordLink: (link: string) => void,
  setSessions: (sessions: any[]) => void,
  setLectures: (lectures: any[]) => void,
  setStudyTimeMinutes: (minutes: number) => void,
  setPracticeTimeMinutes: (minutes: number) => void,
  // Timer handlers
  handleTimerStartedFromServer: (timerData: any) => void,
  handleTimerStoppedFromServer: (timerData: any) => void,
  // Room handlers
  fetchRoomMembers: () => void,
  fetchRoomMessages: () => void,
  getGoalsFromServer: () => Promise<void>,
  setRoomGoalStudyHours: () => void,
  fetchDiscordLink: () => void,
  fetchLectures: () => Promise<void>,
  fetchSessions: () => Promise<void>,
  updateRoomStats: () => Promise<void>,
  leaveRoom: () => void,
  setPlayers: (players: any[]) => void,
  setRoomLoading: (loading: boolean) => void,
  setIsHost: (isHost: boolean) => void,
  setStoredIsHost: (isHost: boolean) => void
): RoomMessageHandlerHook => {
  const router = useRouter();

  const handleRoomMessage = useCallback(
    (message: { body: any }) => {
      try {
        const response = JSON.parse(message.body);
        
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
          localStorage.setItem(`sessionGoal_${roomCode}`, JSON.stringify(response.payload));
        }

        if (response.eventType === "EXAM_STARTED") {
          const collectorId = response.payload;
          leaveRoom(); // Leave the room before opening exam page
          // Open the exam page in a new tab
          router.push(`/mcq/${collectorId}?roomCode=${roomCode}`);
        }

        if (response.eventType === "SET_DISCORD_LINK") {
          setDiscordLink(response.payload);
        }
        
        if (response.eventType === "PLAYER_READY") {
          fetchRoomMembers();
        } 
        
        if (response.eventType === "ROOM_SESSIONS") {
          getGoalsFromServer();
        }  
        
        if (response.eventType === "USER_LEFT") {
          fetchRoomMembers();
        } 
        
        if (response.eventType === "NEW_USER_JOINED") {
          fetchRoomMembers();
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
            }));
            
            // Sort messages by timestamp (oldest to newest) - only if needed
            const sortedMessages = allMessages.length > 1 
              ? allMessages.sort((a: any, b: any) => a.timestamp - b.timestamp)
              : allMessages;

            // Batch state updates to prevent multiple re-renders
            setMessages(sortedMessages);
            
            // Check if chat is closed and we have new messages to show notification
            const isChatClosed = !visibleTabs.has('chat');
            const hasNewMessages = sortedMessages.length > lastSeenMessageCount;
            
            if (isChatClosed && hasNewMessages && response.eventType === "SEND_MESSAGE") {
              // Use requestAnimationFrame to defer notification update
              requestAnimationFrame(() => setHasUnreadMessages(true));
            }
          }
        }
        
        if (response.eventType === "TIMER_STARTED") {
          // Handle timer started event from server
          handleTimerStartedFromServer(response.payload);
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
          const { username, typing } = response.payload;

          if (username !== user?.name) { // Don't show own typing indicator
            setTypingUsers(prev => {
              if (typing) {
                // Add user to typing list if not already there
                return prev.includes(username) ? prev : [...prev, username];
              } else {
                // Remove user from typing list
                return prev.filter(u => u !== username);
              }
            });
          }
        }
        
        if (response.eventType === "ROOM_SESSION_TIME_UPDATE") {
          const data = response.payload;
          
          // Update study and practice time based on server data
          setStudyTimeMinutes(data.roomStudyMinutes);
          setPracticeTimeMinutes(data.roomPractiseMinutes);
        }
        
      } catch (err) {
        console.error("Lobby: Failed to parse or process room message", err);
      }
    },
    [
      user,
      roomCode,
      router,
      setMessages,
      setTypingUsers,
      setHasUnreadMessages,
      lastSeenMessageCount,
      visibleTabs,
      setSessionGoals,
      setSessionGoalHours,
      setDiscordLink,
      setSessions,
      setLectures,
      setStudyTimeMinutes,
      setPracticeTimeMinutes,
      handleTimerStartedFromServer,
      handleTimerStoppedFromServer,
      fetchRoomMembers,
      fetchRoomMessages,
      getGoalsFromServer,
      setRoomGoalStudyHours,
      fetchDiscordLink,
      fetchLectures,
      fetchSessions,
      updateRoomStats,
      leaveRoom,
      setPlayers,
      setRoomLoading,
      setIsHost,
      setStoredIsHost
    ]
  );

  return {
    handleRoomMessage
  };
};
