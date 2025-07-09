"use client"

import React, { createContext, useContext, useRef, useEffect, useState, useCallback } from "react"
import { Client, IMessage, StompSubscription } from "@stomp/stompjs"
import SockJS from "sockjs-client"
import { useAuth } from "./auth-context"
import { getWebSocketUrl } from "@/lib/api"

interface SubscriptionInfo {
  topic: string
  callback: (message: IMessage) => void
}

interface StompContextType {
  stompClient: Client | null
  isConnected: boolean
  subscribeToTopic: (topic: string, callback: (message: IMessage) => void) => StompSubscription | null
  unsubscribeFromTopic: (topic: string) => void
  forceReconnect: () => void
}

const StompContext = createContext<StompContextType>({
  stompClient: null,
  isConnected: false,
  subscribeToTopic: () => null,
  unsubscribeFromTopic: () => {},
  forceReconnect: () => {},
})

export function StompProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const stompClientRef = useRef<Client | null>(null)
  const subscriptionsRef = useRef<SubscriptionInfo[]>([]) // Stores desired subscriptions { topic, callback }
  const [isConnected, setIsConnected] = useState(false)
  const activeSubscriptionsRef = useRef<{ [topic: string]: StompSubscription }>({}) // Stores active STOMP subscription objects
  
  // Connection monitoring refs
  const connectionMonitorRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMonitoringRef = useRef(false)

  // Simple connection health monitoring function
  const startConnectionMonitoring = useCallback(() => {
    if (connectionMonitorRef.current || !user) return
    
    console.log("STOMP: Starting simple connection monitoring")
    isMonitoringRef.current = true
    
    const checkConnection = () => {
      if (!stompClientRef.current || !user || !isMonitoringRef.current) return
      
      const client = stompClientRef.current
      
      // Simple check: if client thinks it's connected but WebSocket is not open, force reconnect
      if (client.connected && client.webSocket && client.webSocket.readyState !== WebSocket.OPEN) {
        console.warn("STOMP: WebSocket detected as stale, forcing simple reconnect")
        setIsConnected(false)
        
        // Force a clean reconnection by deactivating and reactivating
        client.deactivate().then(() => {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            if (stompClientRef.current && user && isMonitoringRef.current) {
              console.log("STOMP: Reactivating client after stale detection")
              stompClientRef.current.activate()
            }
          }, 2000)
        }).catch(e => {
          console.error("STOMP: Error during forced deactivation", e)
        })
      } else if (!client.connected && isMonitoringRef.current) {
        console.log("STOMP: Client not connected, attempting simple reconnect")
        setIsConnected(false)
        try {
          client.activate()
        } catch (error) {
          console.error("STOMP: Error activating client", error)
        }
      }
      // Remove ping-based testing entirely - rely only on WebSocket state
    }
    
    // Check connection every 5 seconds
    connectionMonitorRef.current = setInterval(checkConnection, 5000)
    
    // Initial check after 3 seconds
    setTimeout(checkConnection, 3000)
  }, [user])

  const stopConnectionMonitoring = useCallback(() => {
    console.log("STOMP: Stopping connection monitoring")
    isMonitoringRef.current = false
    
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current)
      connectionMonitorRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!user) {
      // User logged out or not available, cleanup STOMP client
      stopConnectionMonitoring() // Stop monitoring when user logs out
      
      if (stompClientRef.current) {
        console.log("STOMP: User logged out or unavailable. Deactivating client.");
        stompClientRef.current.deactivate()
          .then(() => console.log("STOMP: Client deactivated successfully due to user logout."))
          .catch(e => console.warn("STOMP: Error during client deactivation on user logout", e));
        stompClientRef.current = null;
      }
      setIsConnected(false);
      activeSubscriptionsRef.current = {}; // Clear active subscriptions
      subscriptionsRef.current = []; // Clear desired subscriptions
      return;
    }

    const client = new Client({
      webSocketFactory: () => {
        const sockjs = new SockJS(getWebSocketUrl(), null, {
          // Better SockJS configuration for stability
          transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
          timeout: 30000,
        })
        
        // Add event listeners for connection monitoring
        sockjs.onopen = () => console.log("SockJS: Connection opened")
        sockjs.onclose = (event) => console.log("SockJS: Connection closed", event.code, event.reason)
        sockjs.onerror = (error) => console.error("SockJS: Error", error)
        
        return sockjs
      },
      connectHeaders: {
        Authorization: `Bearer ${user.access_token}`,
      },
      debug: function (str) {
        // console.log("STOMP DEBUG:", str); // Uncomment for verbose debugging
      },
      heartbeatIncoming: 4000, // Shorter heartbeat intervals - every 4 seconds
      heartbeatOutgoing: 4000,
      reconnectDelay: 1000, // Faster reconnection - 1 second
      onStompError: (frame) => {
        console.error("STOMP Error:", frame.headers['message'], frame.body);
        setIsConnected(false);
      },
      onWebSocketError: (event) => {
        console.error("WebSocket Error:", event);
        setIsConnected(false);
      },
      onWebSocketClose: (event) => {
        console.warn("WebSocket Closed:", event.code, event.reason);
        setIsConnected(false);
      },
      onConnect: () => {
        console.log("STOMP: Connected");
        setIsConnected(true);
        startConnectionMonitoring(); // Start monitoring when connected
        
        // Re-subscribe to all desired topics
        subscriptionsRef.current.forEach(({ topic, callback }) => {
          if (!activeSubscriptionsRef.current[topic] && client.connected) {
            console.log(`STOMP: Re-subscribing to ${topic} on connect`);
            try {
              activeSubscriptionsRef.current[topic] = client.subscribe(topic, callback);
            } catch (e) {
              console.error(`STOMP: Error re-subscribing to ${topic}`, e);
            }
          }
        });
      },
      onDisconnect: () => {
        console.log("STOMP: Disconnected");
        setIsConnected(false);
        stopConnectionMonitoring(); // Stop monitoring when disconnected
        // Active subscriptions are not cleared here as the client attempts to reconnect.
        // If deactivate is called, then they are cleared.
      },
    });

    stompClientRef.current = client;
    console.log("STOMP: Activating client");
    client.activate();

    return () => {
      console.log("STOMP: Cleaning up StompProvider. Deactivating client.");
      stopConnectionMonitoring(); // Stop monitoring on cleanup
      
      if (client) {
        Object.values(activeSubscriptionsRef.current).forEach(sub => {
          try {
            sub.unsubscribe();
          } catch (e) {
            console.warn("STOMP: Error unsubscribing during provider cleanup", e);
          }
        });
        activeSubscriptionsRef.current = {};
        
        client.deactivate()
          .then(() => console.log("STOMP: Client deactivated successfully during provider cleanup."))
          .catch(e => console.warn("STOMP: Error during client deactivation in provider cleanup", e));
      }
      stompClientRef.current = null;
      setIsConnected(false);
      // subscriptionsRef.current is not cleared here, as it might be needed if the provider remounts with the same user.
      // It's cleared if the user changes/logs out.
    };
  }, [user, startConnectionMonitoring, stopConnectionMonitoring]); // Re-initialize client only if user changes

  // Browser Event Handling - Page visibility changes: Simple reconnection check
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && stompClientRef.current && user) {
        // Page became visible, check connection health after a short delay
        console.log("STOMP: Page became visible, checking connection")
        setTimeout(() => {
          if (stompClientRef.current && (!stompClientRef.current.connected || 
              (stompClientRef.current.webSocket && stompClientRef.current.webSocket.readyState !== WebSocket.OPEN))) {
            console.log("STOMP: Connection issue detected after page became visible, attempting simple reconnect")
            try {
              stompClientRef.current.activate()
            } catch (error) {
              console.warn("STOMP: Visibility reconnect failed", error)
            }
          }
        }, 2000) // Wait 2 seconds for things to stabilize
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  // Network change detection: Handles online/offline events for reconnection
  useEffect(() => {
    const handleOnline = () => {
      console.log("STOMP: Network came online")
      if (stompClientRef.current && user) {
        setTimeout(() => {
          if (!stompClientRef.current?.connected) {
            console.log("STOMP: Reconnecting after network came online")
            stompClientRef.current?.activate()
          }
        }, 3000) // Wait longer for network to stabilize
      }
    }

    const handleOffline = () => {
      console.log("STOMP: Network went offline")
      setIsConnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [user])

  // Focus/blur events: Simple connection check when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log("STOMP: Window gained focus")
      if (stompClientRef.current && user && !stompClientRef.current.connected) {
        console.log("STOMP: Reconnecting on window focus")
        setTimeout(() => {
          if (stompClientRef.current && !stompClientRef.current.connected) {
            stompClientRef.current.activate()
          }
        }, 500)
      }
    }

    const handleBlur = () => {
      console.log("STOMP: Window lost focus - maintaining background connection")
      // No disconnection on tab hide: Keeps connection alive in background
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [user])

  const subscribeToTopic = useCallback(
    (topic: string, callback: (message: IMessage) => void): StompSubscription | null => {
      // Robust Subscription Management - Persistent subscriptions: Maintains desired subscriptions and re-subscribes on reconnect
      if (!subscriptionsRef.current.some(sub => sub.topic === topic)) {
        subscriptionsRef.current.push({ topic, callback });
        console.log(`STOMP: Added ${topic} to desired subscriptions.`);
      } else {
        // If already in desired, update callback just in case it changed (e.g. due to dependencies)
        const subInfo = subscriptionsRef.current.find(sub => sub.topic === topic);
        if (subInfo && subInfo.callback !== callback) {
            console.log(`STOMP: Updating callback for desired subscription ${topic}.`);
            subInfo.callback = callback;
            // If already actively subscribed, re-subscribe with new callback
            if (stompClientRef.current && stompClientRef.current.connected && activeSubscriptionsRef.current[topic]) {
                console.log(`STOMP: Re-subscribing to ${topic} with updated callback.`);
                try {
                    activeSubscriptionsRef.current[topic].unsubscribe();
                    delete activeSubscriptionsRef.current[topic]; // Ensure it's removed before re-adding
                    activeSubscriptionsRef.current[topic] = stompClientRef.current.subscribe(topic, callback);
                } catch (e) {
                    console.error(`STOMP: Error re-subscribing to ${topic} with new callback`, e);
                }
            }
        }
      }

      if (stompClientRef.current && stompClientRef.current.connected) {
        if (!activeSubscriptionsRef.current[topic]) {
          console.log(`STOMP: Subscribing to ${topic} immediately.`);
          try {
            const sub = stompClientRef.current.subscribe(topic, callback);
            activeSubscriptionsRef.current[topic] = sub;
            return sub;
          } catch (e) {
            console.error(`STOMP: Error subscribing to ${topic}`, e);
            // Error recovery: Handles subscription failures gracefully
            setIsConnected(false);
            return null;
          }
        } else {
          console.log(`STOMP: Already actively subscribed to ${topic}. Returning existing subscription.`);
          return activeSubscriptionsRef.current[topic];
        }
      }
      console.log(`STOMP: Not connected or client not ready, ${topic} will be subscribed on connect.`);
      return null;
    },
    [] // Callbacks use refs, so no direct state/prop dependencies needed here for useCallback itself.
  );

  const unsubscribeFromTopic = useCallback(
    (topic: string) => {
      console.log(`STOMP: Attempting to unsubscribe from ${topic}`);
      subscriptionsRef.current = subscriptionsRef.current.filter(sub => sub.topic !== topic);
      console.log(`STOMP: Removed ${topic} from desired subscriptions.`);

      if (activeSubscriptionsRef.current[topic]) {
        try {
          activeSubscriptionsRef.current[topic].unsubscribe();
          console.log(`STOMP: Unsubscribed from ${topic} on client.`);
        } catch (e) {
          console.warn(`STOMP: Error unsubscribing from ${topic} on client`, e);
        }
        delete activeSubscriptionsRef.current[topic];
      } else {
        console.log(`STOMP: No active subscription found for ${topic} to unsubscribe from client.`);
      }
    },
    [] // Uses refs
  );

  // Manual reconnection: Creates a completely new client instance for reliable reconnection
  const forceReconnect = useCallback(() => {
    console.log("STOMP: Force reconnect requested - creating new client instance");
    if (!user) return
    
    setIsConnected(false);
    stopConnectionMonitoring();
    
    // Clean up existing client completely
    if (stompClientRef.current) {
      try {
        Object.values(activeSubscriptionsRef.current).forEach(sub => {
          try {
            sub.unsubscribe();
          } catch (e) {
            console.warn("STOMP: Error unsubscribing during force reconnect", e);
          }
        });
        activeSubscriptionsRef.current = {};
        
        stompClientRef.current.deactivate().catch(e => {
          console.warn("STOMP: Error during force reconnect deactivation", e);
        });
      } catch (e) {
        console.warn("STOMP: Error during client cleanup", e);
      }
    }
    
    // Create completely new client instance after a short delay
    setTimeout(() => {
      if (!user || !isMonitoringRef.current) return;
      
      console.log("STOMP: Creating new client instance for force reconnect");
      
      const newClient = new Client({
        webSocketFactory: () => {
          const sockjs = new SockJS(getWebSocketUrl(), null, {
            transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
            timeout: 30000,
          })
          
          sockjs.onopen = () => console.log("SockJS: New connection opened")
          sockjs.onclose = (event) => console.log("SockJS: New connection closed", event.code, event.reason)
          sockjs.onerror = (error) => console.error("SockJS: New connection error", error)
          
          return sockjs
        },
        connectHeaders: {
          Authorization: `Bearer ${user.access_token}`,
        },
        debug: function (str) {
          // console.log("STOMP DEBUG:", str);
        },
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        reconnectDelay: 2000, // Slightly longer delay for stability
        onStompError: (frame) => {
          console.error("STOMP Error:", frame.headers['message'], frame.body);
          setIsConnected(false);
        },
        onWebSocketError: (event) => {
          console.error("WebSocket Error:", event);
          setIsConnected(false);
        },
        onWebSocketClose: (event) => {
          console.warn("WebSocket Closed:", event.code, event.reason);
          setIsConnected(false);
        },
        onConnect: () => {
          console.log("STOMP: New client connected successfully");
          setIsConnected(true);
          startConnectionMonitoring();
          
          // Re-subscribe to all desired topics with the new client
          subscriptionsRef.current.forEach(({ topic, callback }) => {
            if (!activeSubscriptionsRef.current[topic] && newClient.connected) {
              console.log(`STOMP: Re-subscribing to ${topic} with new client`);
              try {
                activeSubscriptionsRef.current[topic] = newClient.subscribe(topic, callback);
              } catch (e) {
                console.error(`STOMP: Error re-subscribing to ${topic} with new client`, e);
              }
            }
          });
        },
        onDisconnect: () => {
          console.log("STOMP: New client disconnected");
          setIsConnected(false);
          stopConnectionMonitoring();
        },
      });

      stompClientRef.current = newClient;
      newClient.activate();
      
    }, 1500); // Wait 1.5 seconds before creating new client
  }, [user, stopConnectionMonitoring, startConnectionMonitoring]);

  return (
    <StompContext.Provider value={{
      stompClient: stompClientRef.current,
      isConnected,
      subscribeToTopic,
      unsubscribeFromTopic,
      forceReconnect
    }}>
      {children}
    </StompContext.Provider>
  );
}

export function useStomp() {
  return useContext(StompContext);
}