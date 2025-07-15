import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api';
import { useStomp } from '@/context/StompContextType';

export interface ChatMessage {
  id: string;
  message: string;
  senderName: string;
  timestamp: number;
}

export interface ChatHook {
  messages: ChatMessage[];
  typingUsers: string[];
  hasUnreadMessages: boolean;
  sendMessage: (messageContent: string) => Promise<boolean>;
  handleTypingStart: () => void;
  handleTypingStop: () => void;
  setMessages: (messages: ChatMessage[]) => void;
  setTypingUsers: (users: string[] | ((prev: string[]) => string[])) => void;
  setHasUnreadMessages: (hasUnread: boolean) => void;
  setLastSeenMessageCount: (count: number) => void;
  lastSeenMessageCount: number;
}

export const useChat = (
  user: any,
  roomCode: string,
  visibleTabs: Set<string>
): ChatHook => {
  const { toast } = useToast();
  const { stompClient } = useStomp();
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);
  
  // Typing timeout ref
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to update last seen message count when chat is open and messages change
  useEffect(() => {
    if (visibleTabs.has('chat') && messages.length > 0) {
      const timeoutId = setTimeout(() => {
        setLastSeenMessageCount(messages.length);
        setHasUnreadMessages(false);
      }, 100); // Debounce to prevent excessive updates
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, visibleTabs]);

  // Function to send message via fetch request
  const sendMessage = useCallback(async (messageContent: string): Promise<boolean> => {
    if (!user || !roomCode || !messageContent.trim()) {
      return false;
    }

    try {
      const requestBody = {
        roomJoinCode: roomCode,
        msgContent: messageContent.trim(),
      };

      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/messages/send"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        return true;
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        toast({
          title: "Error",
          description: `Failed to send message: ${errorData.message}`,
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      return false;
    }
  }, [user, roomCode, toast]);

  // Function to handle typing indicator start
  const handleTypingStart = useCallback(() => {
    if (!user || !roomCode) return;
    
    // Add current user to typing array for UI feedback
    setTypingUsers(prev => {
      if (!prev.includes(user.name)) {
        return [...prev, user.name];
      }
      return prev;
    });
    
    // Send typing event to server via WebSocket
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: "/app/typing",
        body: JSON.stringify({
          roomJoinCode: roomCode,
          username: user.name,
          typing: true
        })
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  }, [user, roomCode, stompClient]);

  // Function to handle typing indicator stop
  const handleTypingStop = useCallback(() => {
    if (!user || !roomCode) return;
    
    // Remove current user from typing array
    setTypingUsers(prev => prev.filter(u => u !== user.name));
    
    // Send stop typing event to server via WebSocket
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: "/app/typing",
        body: JSON.stringify({
          roomJoinCode: roomCode,
          username: user.name,
          isTyping: false
        })
      });
    }

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [user, roomCode, stompClient]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    typingUsers,
    hasUnreadMessages,
    sendMessage,
    handleTypingStart,
    handleTypingStop,
    setMessages,
    setTypingUsers,
    setHasUnreadMessages,
    setLastSeenMessageCount,
    lastSeenMessageCount
  };
};
