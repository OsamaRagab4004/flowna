import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { GameProvider } from "@/context/game-context"
import { AuthProvider } from "@/context/auth-context"
import { WebSocketProvider } from "@/context/WebSocketContext"
import { GoogleOAuthProvider } from '@react-oauth/google'
import { StompProvider } from "@/context/StompContextType"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    template: "%s | Flowna",
    default: "Flowna - Study App"
  },
  description: "A modern study app for collaborative learning",
  icons: {
    icon: [
      { url: '/flowna.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '65x65', type: 'image/x-icon' }
    ],
    shortcut: '/flowna.svg',
    apple: '/flowna.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange={false}>
          <AuthProvider>
            <GameProvider>
              <WebSocketProvider>
                <GoogleOAuthProvider clientId={"429779320499-pjt5ti9c2fcoe6svvmichvfa292b7tkk.apps.googleusercontent.com"}>
                  <StompProvider>
                    {children}
                    <Toaster />
                  </StompProvider>
                </GoogleOAuthProvider>
              </WebSocketProvider>
            </GameProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
