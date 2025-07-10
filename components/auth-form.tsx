"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Mail, Lock, User, Loader2 } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/hooks/use-toast"
import { GoogleLogin } from '@react-oauth/google'
import Image from "next/image"

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [showReset, setShowReset] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })
  const [resetEmail, setResetEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login, loginWithGoogle, signup, loading, resetPassword } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)


     // Validation
  if (!isLogin) {
    // Username (first + last) must be at least 5 characters
    if (formData.name.trim().replace(/\s+/g, "").length < 5) {
      toast({
        title: "Invalid Name",
        description: "Full name must be at least 5 characters (excluding spaces).",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }
  }
  // Password must be at least 8 characters
  if (formData.password.length < 8) {
    toast({
      title: "Invalid Password",
      description: "Password must be at least 8 characters.",
      variant: "destructive",
    })
    setIsSubmitting(false)
    return
  }

// Email validation (simple regex)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.email)) {
    toast({
      title: "Invalid Email",
      description: "Please enter a valid email address.",
      variant: "destructive",
    })
    setIsSubmitting(false)
    return
  }
  
  
    try {
      let success = false

      if (isLogin) {
        success = await login(formData.email, formData.password)
        if (success) {
          toast({
            title: "Welcome back!",
            description: "You've successfully logged in.",
          })
        } else {
          toast({
            title: "Authentication failed",
            description: "Please check your credentials and try again.",
            variant: "destructive",
          })
        }
      } else {
        success = await signup(formData.name, formData.email, formData.password)
        if (success) {
            toast({
            title: "Account created!",
            description: "Please confirm your email before logging in.",
            duration: 2000,
            })
          setIsLogin(true) // Switch to login after successful signup
        } else {
          toast({
            title: "Registration failed",
            description: "Please check your details and try again.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const success = await resetPassword(resetEmail)
      if (success) {
        toast({
          title: "Reset Email Sent",
          description: "Please check your email for password reset instructions.",
          duration: 5000,
        })
        setShowReset(false)
        setResetEmail("")
      } else {
        toast({
          title: "Reset Failed",
          description: "Could not send reset email. Please try again.",
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="backdrop-blur-lg bg-white/10 border-white/20 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm">
                <Image 
                  src="/flowna.svg" 
                  alt="Flowna Logo" 
                  width={120} 
                  height={120} 
                  className="text-white"
                />
              </div>
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-white">flowna</CardTitle>
              <CardDescription className="text-white/80 text-lg">
                {showReset
                  ? "Reset your password"
                  : isLogin
                  ? "Welcome back! Sign in to continue"
                  : "Create your account to get started"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {!showReset ? (
              <>
                {/* Video Section */}
                <div className="mb-6">
                  <div className="relative rounded-lg overflow-hidden bg-black/20 backdrop-blur-sm">
                    <video 
                      controls 
                      className="w-full h-48 object-contain"
                      poster="/placeholder.jpg"
                    >
                      <source src="/flowna-demo.mp4" type="video/mp4" />
                      <source src="/flowna-demo.webm" type="video/webm" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <p className="text-white/80 text-sm text-center mt-2">
                    Watch how flowna transforms your learning experience
                  </p>
                </div>

                {/* Google Login Button */}
                <GoogleLogin              
                  onSuccess={async (credentialResponse) => {
                    if (credentialResponse.credential) {
                      setIsSubmitting(true)
                      try {
                        const success = await loginWithGoogle(credentialResponse.credential)
                        if (success) {
                          toast({
                            title: "Welcome!",
                            description: "You've successfully logged in with Google.",
                            duration: 500
                          })
                        } else {
                          toast({
                            title: "Google Login Failed",
                            description: "Could not authenticate with Google. Please try again.",
                            variant: "destructive",
                          })
                        }
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Google login failed. Please try again.",
                          variant: "destructive",
                        })
                      } finally {
                        setIsSubmitting(false)
                      }
                    } else {
                      toast({
                        title: "Google Login Failed",
                        description: "No credential received. Please try again.",
                        variant: "destructive",
                      })
                    }
                  }}
                  onError={() => {
                    toast({
                      title: "Google Login Failed",
                      description: "Please try again.",
                      variant: "destructive",
                    })
                  }}
                />


                

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/30"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-transparent text-white/80">or</span>
                  </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                      <Input
                        type="text"
                        name="name"
                        minLength={5}
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required={!isLogin}
                        className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                    <Input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                    <Input
                      type="password"
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength={8}
                      className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 transition-all duration-200"
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : isLogin ? "Sign In" : "Create Account"}
                  </Button>
                </form>

                {/* Toggle between login/signup */}
                <div className="text-center flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-white/80 hover:text-white transition-colors duration-200 text-sm"
                  >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setShowReset(true)}
                      className="text-blue-200 hover:text-white transition-colors duration-200 text-xs underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              </>
            ) : (
              // Reset password form
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                  <Input
                    type="email"
                    name="resetEmail"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                    className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 transition-all duration-200"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Reset Email"}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowReset(false)}
                    className="text-white/80 hover:text-white transition-colors duration-200 text-sm"
                  >
                    Back to login
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}