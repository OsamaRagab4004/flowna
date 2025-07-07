"use client"

import { useState, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageCircle, Send, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/auth-context"
import { getApiUrl } from "@/lib/api"

export const FeedbackButton = memo(function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message before submitting.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch(getApiUrl('api/v1/feedback'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.access_token && { 'Authorization': `Bearer ${user.access_token}` }),
        },
        body: JSON.stringify({
          message: message.trim(),
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      toast({
        title: "Feedback Sent!",
        description: "Thank you for your feedback. We appreciate it :)",
      })
      
      setMessage("")
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to send feedback:', error)
      toast({
        title: "Error",
        description: "Failed to send feedback. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [message, user?.access_token, toast])

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])

  return (
    <>
      {/* Fixed floating button */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/90 px-3 py-2 rounded-lg shadow-sm border">
            <p className="text-sm font-medium text-gray-700">Help us grow!</p>
            <p className="text-xs text-gray-500">Share your feedback anonymously<br />with one click reach us!</p>
          </div>
        </div>
        <Button
          onClick={handleOpen}
          size="lg"
          className="h-14 w-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md"
          aria-label="Send Feedback"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>

      {/* Simple modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={handleClose}
          />
          
          {/* Modal content */}
          <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Give us anonymous feedback</h2>
              </div>
              <Button
                onClick={handleClose}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">We'd love to hear your thoughts or issues. No email or name required.</p>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="feedback-message" className="text-sm font-medium">
                  Your Message
                </label>
                <Textarea
                  id="feedback-message"
                  placeholder="Tell us what you think about flowna or report any issues..."
                  value={message}
                  onChange={handleMessageChange}
                  rows={4}
                  maxLength={1000}
                  className="resize-none"
                />
                <div className="text-right text-xs text-gray-500">
                  {message.length}/1000
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !message.trim()}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
})
