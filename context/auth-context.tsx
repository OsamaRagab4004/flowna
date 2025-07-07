"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { getApiUrl } from "@/lib/api"

interface User {
  name: string
  access_token: string // Optional if not always returned
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  loginWithGoogle: (token:string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  refreshToken: () => Promise<boolean>
  logout: () => void
  loading: boolean, 
  resetPassword: (email: string) => Promise<boolean> // <-- Add this line

}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const savedUser = localStorage.getItem("study-squad-user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true)
    try {
      const response = await fetch(getApiUrl("api/v1/auth/authenticate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        setLoading(false)
        return false
      }

      

      const data = await response.json()

      const loggedInUser: User = {
        name: data.username,
        access_token: data.access_token 
      }

      setUser(loggedInUser)
      localStorage.setItem("study-squad-user", JSON.stringify(loggedInUser))
      setLoading(false)
      return true
    } catch (error) {
      setLoading(false)
      return false
    }



  }
  

  const refreshToken = async (): Promise<boolean> => {

    if(!user) {
      return false
    }

    try {
      const response = await fetch(getApiUrl("api/v1/auth/refresh-token"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"

      })

      if (!response.ok) {
        return false;
      }

      const data = await response.json()
      const updatedUser: User = {
        name: user.name, // Keep the existing name
        access_token: data.access_token // Update the access token
      }
      setUser(updatedUser)
      localStorage.setItem("study-squad-user", JSON.stringify(updatedUser))
      return true;

    } catch (error) {
      //console.error("Error refreshing token:", error)
      return false;
    }



  }


 const loginWithGoogle = async (token: string): Promise<boolean> => {
  setLoading(true)
  try {
    const response = await fetch(getApiUrl("api/v1/auth/google"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })

    if (!response.ok) {
      setLoading(false)
      return false
    }

    const data = await response.json()
    // Map user data as needed
    const loggedInUser: User = {
      name: data.username,
      access_token: data.access_token // Ensure this matches your API response
    }
    setUser(loggedInUser)
    localStorage.setItem("study-squad-user", JSON.stringify(loggedInUser))
    console.log("User logged in with Google:", loggedInUser)
    setLoading(false)
    return true
  } catch (error) {
    setLoading(false)
    return false
  }
}




  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    setLoading(true)
    // Split name into firstname and lastname
    const [firstname, ...rest] = name.trim().split(" ")
    const lastname = rest.join(" ") || ""

    try {
      const response = await fetch(getApiUrl("api/v1/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname,
          lastname,
          email,
          password,
        }),
      })

      if (!response.ok) {
        setLoading(false)
        return false
      }

      setLoading(false)
      return true
    } catch (error) {
      setLoading(false)
      return false
    }
  }

  const resetPassword = async (email: string): Promise<boolean> => {
    setLoading(true)
    try {
      const response = await fetch(getApiUrl("api/v1/auth/request-reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      setLoading(false)
      if (!response.ok) {
        return false
      }
      return true
    } catch (error) {
      setLoading(false)
      return false
    }
  }



  const logout = () => {
    setUser(null)
    localStorage.removeItem("study-squad-user")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithGoogle,
        signup,
        refreshToken,
        logout,
        loading,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}