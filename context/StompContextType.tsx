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
}

const StompContext = createContext<StompContextType>({
  stompClient: null,
  isConnected: false,
  subscribeToTopic: () => null,
  unsubscribeFromTopic: () => {},
})

export function StompProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const stompClientRef = useRef<Client | null>(null)
  const subscriptionsRef = useRef<SubscriptionInfo[]>([]) // Stores desired subscriptions { topic, callback }
  const [isConnected, setIsConnected] = useState(false)
  const activeSubscriptionsRef = useRef<{ [topic: string]: StompSubscription }>({}) // Stores active STOMP subscription objects

  useEffect(() => {
    if (!user) {
      // User logged out or not available, cleanup STOMP client
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
      webSocketFactory: () => new SockJS(getWebSocketUrl()),
      connectHeaders: {
        Authorization: `Bearer ${user.access_token}`,
      },
      debug: function (str) {
        // console.log("STOMP DEBUG:", str); // Uncomment for verbose debugging
      },
      reconnectDelay: 5000,
      onStompError: (frame) => {
        console.error("STOMP Error:", frame.headers['message'], frame.body);
        setIsConnected(false);
      },
      onConnect: () => {
        console.log("STOMP: Connected");
        setIsConnected(true);
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
        // Active subscriptions are not cleared here as the client attempts to reconnect.
        // If deactivate is called, then they are cleared.
      },
    });

    stompClientRef.current = client;
    console.log("STOMP: Activating client");
    client.activate();

    return () => {
      console.log("STOMP: Cleaning up StompProvider. Deactivating client.");
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
  }, [user]); // Re-initialize client only if user changes

  const subscribeToTopic = useCallback(
    (topic: string, callback: (message: IMessage) => void): StompSubscription | null => {
      // Add to desired subscriptions if not already there
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

  return (
    <StompContext.Provider value={{
      stompClient: stompClientRef.current,
      isConnected,
      subscribeToTopic,
      unsubscribeFromTopic
    }}>
      {children}
    </StompContext.Provider>
  );
}

export function useStomp() {
  return useContext(StompContext);
}