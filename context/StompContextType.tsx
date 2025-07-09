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
  const subscriptionsRef = useRef<SubscriptionInfo[]>([]) // Stores desired subscriptions to re-apply on reconnect
  const [isConnected, setIsConnected] = useState(false)
  const activeSubscriptionsRef = useRef<{ [topic: string]: StompSubscription }>({}) // Stores active STOMP subscription objects

  /**
   * Creates a new STOMP client instance, configures it, and activates it.
   * This is the core function for establishing a connection.
   */
  const connect = useCallback(() => {
    // Prevent connection if no user is authenticated or if a client is already active.
    if (!user || (stompClientRef.current && stompClientRef.current.active)) {
      return
    }

    // Deactivate any existing client before creating a new one to ensure a clean state.
    if (stompClientRef.current) {
        stompClientRef.current.deactivate()
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(getWebSocketUrl()),
      connectHeaders: {
        Authorization: `Bearer ${user.access_token}`,
      },
      // ===================================================================
      // KEY CHANGE: Heartbeats are disabled (set to 0).
      // This prevents the client from disconnecting when it doesn't receive
      // keep-alive responses from the server.
      // ===================================================================
      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,

      // ===================================================================
      // KEY CHANGE: Rely on the library's built-in automatic reconnection.
      // The client will attempt to reconnect every 5 seconds if the connection is lost.
      // ===================================================================
      reconnectDelay: 5000,

      debug: (str) => {
        // Uncomment for verbose STOMP logs in the console
        // console.log("STOMP DEBUG:", str)
      },

      onConnect: () => {
        console.log("✅ STOMP: Connected successfully.")
        setIsConnected(true)

        // When connection is established, re-subscribe to all topics that the app needs.
        subscriptionsRef.current.forEach(({ topic, callback }) => {
          if (!activeSubscriptionsRef.current[topic]) {
            console.log(`🔄 STOMP: Re-subscribing to ${topic} on connect.`)
            try {
              activeSubscriptionsRef.current[topic] = client.subscribe(topic, callback)
            } catch (e) {
              console.error(`❌ STOMP: Error re-subscribing to ${topic}`, e)
            }
          }
        })
      },

      onDisconnect: () => {
        console.log("❌ STOMP: Disconnected.")
        setIsConnected(false)
      },

      onStompError: (frame) => {
        console.error("❌ STOMP Error:", frame.headers['message'], frame.body)
        setIsConnected(false)
      },

      onWebSocketClose: () => {
        console.warn("⚠️ WebSocket Closed. STOMP will attempt to reconnect automatically.")
        setIsConnected(false)
      },
    })

    stompClientRef.current = client
    console.log("🔄 STOMP: Activating new client...")
    client.activate()

  }, [user])

  /**
   * Gracefully deactivates and cleans up the STOMP client.
   */
  const disconnect = useCallback(() => {
    if (stompClientRef.current) {
      console.log("🚪 STOMP: Deactivating client...")
      stompClientRef.current.deactivate()
      stompClientRef.current = null
      setIsConnected(false)
      activeSubscriptionsRef.current = {}
    }
  }, [])

  /**
   * Manages the connection lifecycle based on user authentication status.
   */
  useEffect(() => {
    if (user) {
      connect()
    } else {
      disconnect()
    }
    
    // Cleanup on component unmount
    return () => {
      disconnect()
    }
  }, [user, connect, disconnect])

  /**
   * A function that can be called from the UI or event listeners
   * to manually trigger a reconnection attempt.
   */
  const forceReconnect = useCallback(() => {
      console.log("🔄 STOMP: Manual reconnect triggered.")
      if (stompClientRef.current && !stompClientRef.current.connected) {
          console.log("STOMP: Client not connected, calling activate() to reconnect.")
          stompClientRef.current.activate()
      } else if (!stompClientRef.current) {
          console.log("STOMP: No client instance found, calling connect() to initialize.")
          connect()
      }
  }, [connect])

  /**
   * Adds event listeners to the browser window to detect changes
   * (like regaining focus or network) and trigger a reconnect if needed.
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("👁️ STOMP: Page became visible, checking connection...")
        forceReconnect()
      }
    }

    const handleOnline = () => {
      console.log("🌐 STOMP: Network came online, checking connection...")
      forceReconnect()
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('focus', forceReconnect) // Also check on focus

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('focus', forceReconnect)
    }
  }, [forceReconnect])

  /**
   * Subscribes to a STOMP topic. It maintains a list of desired subscriptions
   * so they can be automatically re-established after a disconnection.
   */
  const subscribeToTopic = useCallback(
    (topic: string, callback: (message: IMessage) => void): StompSubscription | null => {
      // Add to the list of desired subscriptions for automatic reconnection.
      if (!subscriptionsRef.current.some(sub => sub.topic === topic)) {
        subscriptionsRef.current.push({ topic, callback })
      }

      const client = stompClientRef.current
      if (client && client.connected) {
        if (!activeSubscriptionsRef.current[topic]) {
          console.log(`STOMP: Subscribing to ${topic}`)
          try {
            const sub = client.subscribe(topic, callback)
            activeSubscriptionsRef.current[topic] = sub
            return sub
          } catch (e) {
            console.error(`❌ STOMP: Error subscribing to ${topic}`, e)
            return null
          }
        }
        return activeSubscriptionsRef.current[topic]
      }
      
      console.log(`⏳ STOMP: Client not connected. Subscription to ${topic} will occur upon connection.`)
      return null
    },
    []
  )

  /**
   * Unsubscribes from a STOMP topic and removes it from the list of desired subscriptions.
   */
  const unsubscribeFromTopic = useCallback(
    (topic: string) => {
      // Remove from desired subscriptions list.
      subscriptionsRef.current = subscriptionsRef.current.filter(sub => sub.topic !== topic)

      if (activeSubscriptionsRef.current[topic]) {
        try {
          activeSubscriptionsRef.current[topic].unsubscribe()
          console.log(`STOMP: Unsubscribed from ${topic}.`)
        } catch (e) {
          console.warn(`⚠️ STOMP: Error unsubscribing from ${topic}`, e)
        }
        delete activeSubscriptionsRef.current[topic]
      }
    },
    []
  )

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
  )
}

export function useStomp() {
  return useContext(StompContext)
}
