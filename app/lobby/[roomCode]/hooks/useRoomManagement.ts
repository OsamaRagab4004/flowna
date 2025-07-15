import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api';

interface RoomState {
  isHost: boolean;
  players: any[];
  roomLoading: boolean;
  needsRejoin: boolean;
  isRejoining: boolean;
  hasLeftRoom: boolean;
  isRequestingHost: boolean;
  archiveRoom: boolean;
  storedIsHost: boolean;
}

interface RoomActions {
  setIsHost: (isHost: boolean) => void;
  setPlayers: (players: any[]) => void;
  setRoomLoading: (loading: boolean) => void;
  setNeedsRejoin: (needsRejoin: boolean) => void;
  setIsRejoining: (rejoining: boolean) => void;
  setHasLeftRoom: (hasLeft: boolean) => void;
  setIsRequestingHost: (requesting: boolean) => void;
  setArchiveRoom: (archive: boolean) => void;
  setStoredIsHost: (isHost: boolean) => void;
  fetchRoomMembers: () => void;
  fetchRoomMessages: () => void;
  fetchRoomGoals: () => void;
  fetchDiscordLink: () => void;
  fetchLectures: () => void;
  fetchSessions: () => void;
  updateRoomStats: () => void;
  leaveRoom: () => void;
  manualLeaveRoom: () => Promise<boolean>;
  handleRejoinRoom: () => Promise<void>;
  setNewHost: () => Promise<void>;
  handleReady: () => Promise<void>;
}

export const useRoomManagement = (
  roomCode: string,
  user: any,
  stompClient: any,
  isConnected: boolean,
  clearTimerFromLocalStorage: () => void
): RoomState & RoomActions => {
  const { toast } = useToast();
  
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [roomLoading, setRoomLoading] = useState(true);
  const [needsRejoin, setNeedsRejoin] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);
  const [hasLeftRoom, setHasLeftRoom] = useState(false);
  const [isRequestingHost, setIsRequestingHost] = useState(false);
  const [archiveRoom, setArchiveRoom] = useState<boolean>(false);
  const [storedIsHost, setStoredIsHost] = useState(true);
  
  const hasManuallyLeftRef = useRef(false);
  const isReload = useRef(false);

  // Function to fetch room members
  const fetchRoomMembers = useCallback(() => {
    if (stompClient && stompClient.connected && roomCode) {
      stompClient.publish({
        destination: "/app/room-members",
        body: JSON.stringify({ roomJoinCode: roomCode }),
      });
    } else {
      console.warn("⚠️ [FETCH_MEMBERS] Cannot fetch room members:", {
        hasStompClient: !!stompClient,
        isConnected: stompClient?.connected,
        hasRoomCode: !!roomCode
      });
    }
  }, [stompClient, roomCode]);

  // Function to fetch room messages
  const fetchRoomMessages = useCallback(() => {
    if (stompClient && stompClient.connected && roomCode) {
      console.log("📡 [FETCH_MESSAGES] Sending room messages request", { roomCode, connected: stompClient.connected });
      stompClient.publish({
        destination: "/app/room-messages",
        body: JSON.stringify({ roomJoinCode: roomCode }),
      });
    } else {
      console.warn("⚠️ [FETCH_MESSAGES] Cannot fetch room messages:", {
        hasStompClient: !!stompClient,
        isConnected: stompClient?.connected,
        hasRoomCode: !!roomCode
      });
    }
  }, [stompClient, roomCode]);

  // Additional room data fetching functions
  const fetchRoomGoals = useCallback(() => {
    if (stompClient && stompClient.connected && roomCode) {
      console.log("📡 [FETCH_GOALS] Sending room goals request", { roomCode });
      stompClient.publish({
        destination: "/app/get-room-goals",
        body: JSON.stringify({ roomJoinCode: roomCode }),
      });
    }
  }, [stompClient, roomCode]);

  const fetchDiscordLink = useCallback(() => {
    if (stompClient && stompClient.connected && roomCode) {
      console.log("📡 [FETCH_DISCORD] Sending discord link request", { roomCode });
      stompClient.publish({
        destination: "/app/get-discord-link",
        body: JSON.stringify({ roomJoinCode: roomCode }),
      });
    }
  }, [stompClient, roomCode]);

  const fetchLectures = useCallback(() => {
    if (stompClient && stompClient.connected && roomCode) {
      console.log("📡 [FETCH_LECTURES] Sending lectures request", { roomCode });
      stompClient.publish({
        destination: "/app/get-lectures",
        body: JSON.stringify({ roomJoinCode: roomCode }),
      });
    }
  }, [stompClient, roomCode]);

  const fetchSessions = useCallback(() => {
    if (stompClient && stompClient.connected && roomCode) {
      console.log("📡 [FETCH_SESSIONS] Sending sessions request", { roomCode });
      stompClient.publish({
        destination: "/app/get-sessions",
        body: JSON.stringify({ roomJoinCode: roomCode }),
      });
    }
  }, [stompClient, roomCode]);

  const updateRoomStats = useCallback(() => {
    if (stompClient && stompClient.connected && roomCode) {
      console.log("📡 [UPDATE_STATS] Sending room stats update", { roomCode });
      stompClient.publish({
        destination: "/app/update-room-stats",
        body: JSON.stringify({ roomJoinCode: roomCode }),
      });
    }
  }, [stompClient, roomCode]);

  // Function to leave room
  const leaveRoom = useCallback(() => {
    if (!user || !roomCode) return;

    console.log("🚪 [LEAVE_ROOM] Leaving room:", { roomCode, user: user.name });

    // Only clean up timer localStorage when NOT reloading the page
    if (!isReload.current) {
      clearTimerFromLocalStorage();
    } else {
      console.log("🔄 [LEAVE_ROOM] Page reload detected, preserving timer state");
    }

    if (isReload.current) {
      sessionStorage.setItem(`reloading_${roomCode}`, 'true');
    }

    const url = getApiUrl("api/v1/squadgames/rooms/leave-room");
    const body = JSON.stringify({
      roomJoinCode: roomCode,
      archive: false,
    });

    try {
      navigator.sendBeacon(url, body);
    } catch (e) {
      console.error("Error leaving room:", e);
    }
  }, [user, roomCode, clearTimerFromLocalStorage]);

  // Function specifically for manual leave room action
  const manualLeaveRoom = useCallback(async () => {
    if (!user || !roomCode) return false;

    console.log("🚪 [MANUAL_LEAVE] Manually leaving room:", { roomCode, user: user.name });

    const url = getApiUrl("api/v1/squadgames/rooms/leave-room");
    const body = JSON.stringify({
      roomJoinCode: roomCode,
      archive: false,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.access_token}`,
        },
        body,
      });

      if (response.ok) {
        console.log("✅ [MANUAL_LEAVE] Successfully left room");
        return true;
      } else {
        console.error("❌ [MANUAL_LEAVE] Failed to leave room:", response.status);
        return false;
      }
    } catch (error) {
      console.error("❌ [MANUAL_LEAVE] Error leaving room:", error);
      return false;
    }
  }, [user, roomCode]);

  // Function to rejoin the room
  const handleRejoinRoom = useCallback(async () => {
    console.log("🔄 [REJOIN] Attempting to rejoin room", { roomCode, user: !!user });
    
    if (!user || !roomCode) return;

    setIsRejoining(true);
    
    try {
      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/join"), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ roomJoinCode: roomCode, rejoin: true }),
      });

      if (response.ok) {
        console.log("✅ [REJOIN] Successfully rejoined room");
        setNeedsRejoin(false);
        fetchRoomMembers();
      } else {
        console.error("❌ [REJOIN] Failed to rejoin room:", response.status);
        toast({
          title: "Rejoin Failed",
          description: "Failed to rejoin the room. Please try again.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("❌ [REJOIN] Error rejoining room:", err);
      toast({
        title: "Rejoin Failed",
        description: "An error occurred while rejoining the room.",
        variant: "destructive"
      });
    } finally {
      setIsRejoining(false);
    }
  }, [user, roomCode, toast, fetchRoomMembers]);

  // Function to set new host
  const setNewHost = useCallback(async () => {
    console.log("Attempting to set new host...");
    setIsRequestingHost(true);
    
    if (!user || !roomCode) return;

    try {
      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/set-host"), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ roomJoinCode: roomCode }),
      });

      if (response.ok) {
        console.log("✅ Successfully requested host status");
        toast({
          title: "Host Request Sent",
          description: "Your request to become host has been sent.",
        });
      } else {
        console.error("❌ Failed to request host status:", response.status);
        toast({
          title: "Host Request Failed",
          description: "Failed to request host status. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("❌ Error requesting host status:", error);
      toast({
        title: "Host Request Failed",
        description: "An error occurred while requesting host status.",
        variant: "destructive"
      });
    } finally {
      setIsRequestingHost(false);
    }
  }, [user, roomCode, toast]);

  // Function to handle ready status
  const handleReady = useCallback(async () => {
    if (!user || !roomCode) return;
    
    try {
      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/ready"), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ roomJoinCode: roomCode }),
      });

      if (response.ok) {
        console.log("✅ Successfully marked as ready");
      } else {
        console.error("❌ Failed to mark as ready:", response.status);
      }
    } catch (e) {
      console.error("❌ Error marking as ready:", e);
    }
  }, [user, roomCode]);

  return {
    isHost,
    players,
    roomLoading,
    needsRejoin,
    isRejoining,
    hasLeftRoom,
    isRequestingHost,
    archiveRoom,
    storedIsHost,
    setIsHost,
    setPlayers,
    setRoomLoading,
    setNeedsRejoin,
    setIsRejoining,
    setHasLeftRoom,
    setIsRequestingHost,
    setArchiveRoom,
    setStoredIsHost,
    fetchRoomMembers,
    fetchRoomMessages,
    fetchRoomGoals,
    fetchDiscordLink,
    fetchLectures,
    fetchSessions,
    updateRoomStats,
    leaveRoom,
    manualLeaveRoom,
    handleRejoinRoom,
    setNewHost,
    handleReady
  };
};
