import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ChatState {
  messages: any[];
  typingUsers: string[];
  hasUnreadMessages: boolean;
  lastSeenMessageCount: number;
  chatData: {
    messages: any[];
    typingUsers: string[];
    hasUnread: boolean;
  };
}

interface ChatActions {
  setMessages: (messages: any[]) => void;
  setTypingUsers: (users: string[]) => void;
  setHasUnreadMessages: (hasUnread: boolean) => void;
  setLastSeenMessageCount: (count: number) => void;
  sendMessage: (messageContent: string) => Promise<boolean>;
  handleTypingStart: () => void;
  handleTypingStop: () => void;
}

export const useChat = (
  roomCode: string,
  user: any,
  stompClient: any,
  visibleTabs: Set<string>
): ChatState & ChatActions => {
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);
  
  const messagesRef = useRef<any[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref whenever messages change
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Effect to update last seen message count when chat is open and messages change
  useEffect(() => {
    if (visibleTabs.has('chat') && messages.length > 0) {
      const timeoutId = setTimeout(() => {
        setLastSeenMessageCount(messages.length);
        setHasUnreadMessages(false);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, visibleTabs]);

  // Debug: Log typing users changes - only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("👥 [TYPING_USERS] Typing users changed:", typingUsers);
    }
  }, [typingUsers]);

  // Debug effect - only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("💬 [CHAT_STATE] Chat state changed:", {
        hasUnreadMessages,
        lastSeenMessageCount,
        messagesLength: messages.length,
        chatVisible: visibleTabs.has('chat')
      });
    }
  }, [hasUnreadMessages, lastSeenMessageCount, messages.length, visibleTabs]);

  // Function to send message via fetch request
  const sendMessage = useCallback(async (messageContent: string): Promise<boolean> => {
    if (!user || !roomCode || !messageContent.trim()) return false;

    try {
      // Implementation would go here - API call to send message
      console.log("📤 [SEND_MESSAGE] Sending message:", messageContent);
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Message Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [user, roomCode, toast]);

  // Function to handle typing indicator
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
        destination: "/app/user-typing",
        body: JSON.stringify({
          roomJoinCode: roomCode,
          username: user.name,
          typing: true
        }),
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

  // Function to handle stop typing
  const handleTypingStop = useCallback(() => {
    if (!user || !roomCode) return;
    
    // Remove current user from typing array
    setTypingUsers(prev => prev.filter(u => u !== user.name));
    
    // Send stop typing event to server via WebSocket
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: "/app/user-typing",
        body: JSON.stringify({
          roomJoinCode: roomCode,
          username: user.name,
          typing: false
        }),
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

  // Memoize chat-related data to prevent unnecessary re-renders
  const chatData = useMemo(() => ({
    messages,
    typingUsers,
    hasUnread: hasUnreadMessages && !visibleTabs.has('chat')
  }), [messages, typingUsers, hasUnreadMessages, visibleTabs]);

  return {
    messages,
    typingUsers,
    hasUnreadMessages,
    lastSeenMessageCount,
    chatData,
    setMessages,
    setTypingUsers,
    setHasUnreadMessages,
    setLastSeenMessageCount,
    sendMessage,
    handleTypingStart,
    handleTypingStop
  };
};
