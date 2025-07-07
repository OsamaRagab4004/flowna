"use client"


import { createContext, useContext, useRef, useEffect } from "react"
import { Client } from "@stomp/stompjs"
import SockJS from "sockjs-client"
import { getWebSocketUrl } from "@/lib/api"

const WebSocketContext = createContext<any>(null)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const stompClientRef = useRef<Client | null>(null)

  useEffect(() => {
    const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvc0BnbWFpbC5jb20iLCJpYXQiOjE3NDg3MzI0NzEsImV4cCI6MTc0ODgxODg3MX0.ss42kEbZNy18fDKe17j2DQ9oUqPTSh0p4GXK4leriHA"
    const client = new Client({
      webSocketFactory: () => new SockJS(getWebSocketUrl()),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onStompError: (frame) => {
        alert("WebSocket error: " + frame.headers["message"])
        console.error("WebSocket error: " + frame.headers["message"])
      }
    })
    client.activate()
    stompClientRef.current = client

    return () => {
      client.deactivate()
    }
  }, [])

  return (
    <WebSocketContext.Provider value={stompClientRef}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  return useContext(WebSocketContext)
}