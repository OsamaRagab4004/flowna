"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Send, Smile, Maximize2, Palette, X, Eraser } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Player } from "@/types/game"
import EmojiPicker from "./emoji-picker"
import DOMPurify from 'dompurify'

// Configure DOMPurify to only allow safe HTML elements and styles
const createSafeHTML = (html: string) => {
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return html.replace(/<[^>]*>/g, '')
  }
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['span', 'br'],
    ALLOWED_ATTR: ['style'],
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: false,
    // Remove any dangerous protocols and tags
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
  })
}

// Interface definitions (assuming they are correct and in "@/types/game")
interface Message {
  id: string | number
  message: string
  senderName: string
  timestamp: number
  roomJoinCode?: string
  isSystem?: boolean
}

// Memoized message component to prevent unnecessary re-renders
const MessageItem = memo(({ 
  message, 
  showUserInfo, 
  isOwnMessage, 
  username,
  formatTime 
}: {
  message: Message
  showUserInfo: boolean
  isOwnMessage: boolean
  username: string
  formatTime: (timestamp: number) => string
}) => (
  <motion.div
    key={message.id}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex gap-2 my-2 ${
      message.isSystem ? "justify-center" : isOwnMessage ? "justify-end" : "justify-start"
    }`}
  >
    {message.isSystem ? (
      <div 
        className="bg-blue-100 dark:bg-blue-900/30 text-center py-2 px-4 rounded-lg text-sm mx-4"
        dangerouslySetInnerHTML={{ __html: createSafeHTML(message.message) }}
      />
    ) : (
      <div className={`flex gap-2 max-w-[80%] w-fit ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}>
        {!isOwnMessage && (
          <div className="h-8 w-8 flex-shrink-0 self-end">
            {showUserInfo && (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs">
                  {message.senderName?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}
        <div className={`flex flex-col min-w-0 ${isOwnMessage ? "items-end" : "items-start"}`}>
          {showUserInfo && (
            <span className="font-medium text-xs text-gray-600 dark:text-gray-400 px-1 mb-1">
              {isOwnMessage ? "You" : message.senderName || "Unknown"}
            </span>
          )}
          <div
            className={`rounded-lg px-3 py-2 ${
              isOwnMessage
                ? "bg-blue-500 text-white rounded-br-none"
                : "bg-gray-100 dark:bg-gray-800/50 rounded-bl-none"
            }`}
          >
            <div 
              className="text-sm whitespace-pre-wrap" 
              style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: createSafeHTML(message.message) }}
            />
            <div className={`text-xs mt-1 text-right ${isOwnMessage ? "text-blue-100" : "text-gray-500"}`}>
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      </div>
    )}
  </motion.div>
))

MessageItem.displayName = 'MessageItem'

interface ChatRoomProps {
  username: string
  roomCode: string
  players: Player[]
  isLobby?: boolean
  messages?: Message[]
  sendMessage?: (message: string) => Promise<boolean>
  typingUsers?: string[]
  onTypingStart?: () => void
  onTypingStop?: () => void
}

export default function ChatRoom({
  username,
  roomCode,
  players,
  isLobby = false,
  messages: propsMessages = [],
  sendMessage,
  typingUsers = [],
  onTypingStart,
  onTypingStop,
}: ChatRoomProps) {
  const [newMessage, setNewMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showExpandedEditor, setShowExpandedEditor] = useState(false)
  const [selectedColor, setSelectedColor] = useState({ bg: '#FFFF00', text: '#000000', name: 'Yellow Highlight' })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const expandedInputRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Memoize the messages to prevent unnecessary re-renders
  const displayMessages = useMemo(() => propsMessages, [propsMessages])

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [])

  const isScrolledToBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    // Consider "near bottom" as within 50px of the bottom (reduced for better responsiveness)
    return scrollTop + clientHeight >= scrollHeight - 50
  }, [])

  useEffect(() => {
    // Always scroll to bottom when messages change (including when sending)
    // Use a small delay to ensure DOM has updated
    const timeoutId = setTimeout(() => {
      scrollToBottom()
    }, 50)
    
    return () => clearTimeout(timeoutId)
  }, [displayMessages, scrollToBottom])

  // Initial scroll to bottom when component mounts (when chat opens)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom()
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [scrollToBottom])

  // Separate effect for typing indicator to avoid interfering with message scrolling
  useEffect(() => {
    // Only auto-scroll for typing indicator if user is already at the bottom
    if (typingUsers.length > 0 && isScrolledToBottom()) {
      const timeoutId = setTimeout(() => {
        scrollToBottom()
      }, 50)
      return () => clearTimeout(timeoutId)
    }
  }, [typingUsers, scrollToBottom, isScrolledToBottom])

  // Effect to close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node) &&
        !document.querySelector(".emoji-picker-container")?.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showEmojiPicker])

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Handle keyboard shortcuts for the expanded editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showExpandedEditor && expandedInputRef.current?.contains(e.target as Node)) {
        // Ctrl+Shift+C to clear formatting from selection
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
          e.preventDefault()
          clearCurrentFormatting()
        }
        // Ctrl+Shift+A to clear all formatting
        else if (e.ctrlKey && e.shiftKey && e.key === 'A') {
          e.preventDefault()
          clearAllFormatting()
        }
        // Handle Enter key to ensure proper line breaks
        else if (e.key === 'Enter' && !e.shiftKey) {
          // Let the default behavior handle Enter key for line breaks
          // The browser will insert <div> or <br> elements which we handle in handleExpandedInputChange
        }
      }
    }

    if (showExpandedEditor) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [showExpandedEditor]) // Remove function dependencies to avoid errors

  // Helper function to strip HTML for plain text display while preserving line breaks
  const getPlainText = useCallback((html: string) => {
    if (!html) return ''
    try {
      // First try with DOM parsing
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      
      // Convert <br> tags to newlines before extracting text
      const brTags = tempDiv.querySelectorAll('br')
      brTags.forEach(br => {
        br.replaceWith('\n')
      })
      
      // Convert <div> tags to newlines (contentEditable creates divs for new lines)
      const divTags = tempDiv.querySelectorAll('div')
      divTags.forEach(div => {
        if (div.previousSibling) {
          div.insertAdjacentText('beforebegin', '\n')
        }
      })
      
      const textContent = tempDiv.textContent || tempDiv.innerText || ''
      
      // If DOM parsing fails or returns empty, try regex fallback with line break preservation
      if (!textContent.trim()) {
        const regexResult = html
          .replace(/<br\s*\/?>/gi, '\n')  // Convert <br> to newlines
          .replace(/<\/div>/gi, '\n')     // Convert closing div to newlines
          .replace(/<div[^>]*>/gi, '')    // Remove opening div tags
          .replace(/<[^>]*>/g, '')        // Remove all other HTML tags
          .replace(/&nbsp;/g, ' ')        // Convert non-breaking spaces
        return regexResult
      }
      
      return textContent
    } catch (e) {
      // Fallback: strip HTML tags with regex while preserving line breaks
      return html
        .replace(/<br\s*\/?>/gi, '\n')  // Convert <br> to newlines
        .replace(/<\/div>/gi, '\n')     // Convert closing div to newlines
        .replace(/<div[^>]*>/gi, '')    // Remove opening div tags
        .replace(/<[^>]*>/g, '')        // Remove all other HTML tags
        .replace(/&nbsp;/g, ' ')        // Convert non-breaking spaces
    }
  }, [])

  const handleSendMessage = useCallback(async () => {
    if (!newMessage || !sendMessage) return
    
    // Check if the message contains HTML formatting (highlighting)
    const hasHTMLFormatting = newMessage.includes('<span') || newMessage.includes('<br')
    
    let messageToSend: string
    
    if (hasHTMLFormatting) {
      // For messages with HTML formatting, preserve the HTML but ensure line breaks are proper
      messageToSend = newMessage
        .replace(/\n/g, '<br>')  // Convert any plain newlines to <br> tags
        .replace(/<div[^>]*>/gi, '')  // Remove div opening tags
        .replace(/<\/div>/gi, '<br>')  // Convert div closing tags to <br>
      
      // Clean up multiple consecutive <br> tags
      messageToSend = messageToSend.replace(/(<br>\s*){3,}/gi, '<br><br>')
      
      // Sanitize the message before sending
      messageToSend = createSafeHTML(messageToSend)
    } else {
      // For plain text messages, convert newlines to <br> tags for display
      messageToSend = newMessage.replace(/\n/g, '<br>')
    }
    
    // Check for actual text content (strip HTML and whitespace)
    const plainText = getPlainText(messageToSend).trim()
    console.log('Message to send:', messageToSend)
    console.log('Plain text:', plainText)
    console.log('Plain text length:', plainText.length)
    
    if (!plainText) {
      console.log('No plain text content, not sending')
      return
    }

    // Clear typing timeout and stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    onTypingStop?.()

    // Send the processed message
    const success = await sendMessage(messageToSend)
    if (success) {
      setNewMessage("")
      setShowEmojiPicker(false)
      setShowExpandedEditor(false)
      // Force scroll to bottom after sending a message
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [newMessage, sendMessage, onTypingStop, scrollToBottom, getPlainText])

  // Formatting functions for rich text editor
  const applyFormat = useCallback((command: string, value?: string, bgColor?: string) => {
    if (!expandedInputRef.current) return
    
    if (command === 'highlight') {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0)
        const selectedText = selection.toString().trim()
        
        // Only apply highlight if there's actual text selected
        if (selectedText) {
          const span = document.createElement('span')
          span.style.backgroundColor = bgColor || '#FFFF00'
          span.style.color = value || '#000000'
          span.style.padding = '2px 4px'
          span.style.borderRadius = '3px'
          span.style.display = 'inline'
          
          try {
            // Extract the content and wrap it
            const contents = range.extractContents()
            span.appendChild(contents)
            range.insertNode(span)
          } catch (e) {
            // Fallback: just insert the text with formatting
            span.textContent = selectedText
            range.deleteContents()
            range.insertNode(span)
          }
          
          // Clear selection and place cursor after the highlight
          selection.removeAllRanges()
          const newRange = document.createRange()
          newRange.setStartAfter(span)
          newRange.collapse(true)
          selection.addRange(newRange)
          
          // Update the message state with the HTML content
          setTimeout(() => {
            if (expandedInputRef.current) {
              const htmlContent = expandedInputRef.current.innerHTML
              setNewMessage(htmlContent)
            }
          }, 0)
        }
      }
    }
    
    expandedInputRef.current.focus()
  }, [])

  const changeColor = useCallback((colorObj: { bg: string; text: string; name: string }) => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const selectedText = selection.toString().trim()
      if (selectedText) {
        setSelectedColor(colorObj)
        applyFormat('highlight', colorObj.text, colorObj.bg)
      }
    }
  }, [applyFormat])

  const clearAllFormatting = useCallback(() => {
    if (!expandedInputRef.current) return
    
    try {
      // Get the current HTML content
      const currentContent = expandedInputRef.current.innerHTML
      
      // Strip all HTML tags and get plain text, but preserve line breaks
      const plainText = getPlainText(currentContent)
      
      // Clear the editor and set plain text
      expandedInputRef.current.innerHTML = ''
      expandedInputRef.current.textContent = plainText
      
      // Update the message state
      setNewMessage(plainText)
      
      // Focus the editor and place cursor at the end
      expandedInputRef.current.focus()
      
      // Use a more reliable method to place cursor at the end
      setTimeout(() => {
        if (expandedInputRef.current) {
          const range = document.createRange()
          const selection = window.getSelection()
          
          if (expandedInputRef.current.childNodes.length > 0) {
            // If there are child nodes, go to the end of the last text node
            const lastNode = expandedInputRef.current.childNodes[expandedInputRef.current.childNodes.length - 1]
            if (lastNode.nodeType === Node.TEXT_NODE) {
              range.setStart(lastNode, lastNode.textContent?.length || 0)
            } else {
              range.setStartAfter(lastNode)
            }
          } else {
            // If no child nodes, set range at the beginning of the container
            range.setStart(expandedInputRef.current, 0)
          }
          
          range.collapse(true)
          selection?.removeAllRanges()
          selection?.addRange(range)
        }
      }, 0)
      
      console.log('Cleared all formatting, plain text:', plainText)
    } catch (e) {
      console.warn('Error clearing formatting:', e)
      // Fallback: just focus the editor
      expandedInputRef.current?.focus()
    }
  }, [getPlainText])

  const clearCurrentFormatting = useCallback(() => {
    if (!expandedInputRef.current) return
    
    try {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        
        // If there's a selection, remove formatting from selected text
        if (!selection.isCollapsed) {
          const selectedText = range.toString()
          
          if (selectedText) {
            // Create a document fragment to hold the plain text
            const textNode = document.createTextNode(selectedText)
            
            // Replace selected content with plain text
            range.deleteContents()
            range.insertNode(textNode)
            
            // Position cursor after the inserted text and ensure it's outside any spans
            const newRange = document.createRange()
            newRange.setStartAfter(textNode)
            newRange.collapse(true)
            selection.removeAllRanges()
            selection.addRange(newRange)
          }
        }
        
        // Always check if cursor is in a formatted area and move it outside
        let currentNode: Node | null = range.startContainer
        let foundFormattedElement = false
        let targetSpan: Element | null = null
        
        // Check if cursor is inside any span element
        while (currentNode && currentNode !== expandedInputRef.current) {
          if (currentNode.nodeType === Node.ELEMENT_NODE && (currentNode as Element).tagName === 'SPAN') {
            foundFormattedElement = true
            targetSpan = currentNode as Element
            break
          }
          currentNode = currentNode.parentNode
        }
        
        // If cursor is inside a formatted element, exit it
        if (foundFormattedElement && targetSpan) {
          console.log('Found cursor inside formatted element, moving outside...')
          
          // Create a zero-width space to ensure we have a safe cursor position
          const zwsp = document.createTextNode('\u200B')
          
          // Insert after the span element
          if (targetSpan.nextSibling) {
            targetSpan.parentNode?.insertBefore(zwsp, targetSpan.nextSibling)
          } else {
            targetSpan.parentNode?.appendChild(zwsp)
          }
          
          // Position cursor after the zero-width space
          const newRange = document.createRange()
          newRange.setStartAfter(zwsp)
          newRange.collapse(true)
          selection.removeAllRanges()
          selection.addRange(newRange)
          
          console.log('Cursor moved outside formatted element')
        }
        // If no selection was made and cursor is not in a formatted area,
        // still ensure we're in a good position for plain text
        else if (selection.isCollapsed) {
          // Double-check that we're not at the edge of a span
          const container = range.startContainer
          if (container.nodeType === Node.TEXT_NODE && container.parentNode) {
            const parent = container.parentNode as Element
            if (parent.tagName === 'SPAN') {
              // We're in a text node inside a span, move outside
              const zwsp = document.createTextNode('\u200B')
              if (parent.nextSibling) {
                parent.parentNode?.insertBefore(zwsp, parent.nextSibling)
              } else {
                parent.parentNode?.appendChild(zwsp)
              }
              
              const newRange = document.createRange()
              newRange.setStartAfter(zwsp)
              newRange.collapse(true)
              selection.removeAllRanges()
              selection.addRange(newRange)
              
              console.log('Moved cursor from inside span text node to outside')
            }
          }
        }
        
        // Update content after a small delay to ensure DOM changes are applied
        setTimeout(() => {
          if (expandedInputRef.current) {
            const htmlContent = expandedInputRef.current.innerHTML
            setNewMessage(htmlContent)
          }
        }, 10)
      }
      
      expandedInputRef.current.focus()
      console.log('Clear formatting completed - new text should be plain')
    } catch (e) {
      console.warn('Error clearing current formatting:', e)
      // Fallback: just focus the editor
      expandedInputRef.current?.focus()
    }
  }, [])

  const handleExpandedInputChange = useCallback(() => {
    if (!expandedInputRef.current) return
    
    try {
      const htmlContent = expandedInputRef.current.innerHTML
      console.log('Raw HTML content:', htmlContent)
      
      // Process the content to preserve line breaks properly
      let processedContent = htmlContent
        // Convert div elements to line breaks (contentEditable creates divs for new lines)
        .replace(/<div[^>]*><br[^>]*><\/div>/gi, '<br>')  // Empty divs with br
        .replace(/<div[^>]*>/gi, '<br>')                   // Opening div tags
        .replace(/<\/div>/gi, '')                          // Closing div tags
      
      // Clean up excessive line breaks
      processedContent = processedContent
        .replace(/^<br>/, '')  // Remove leading br
        .replace(/(<br>\s*){3,}/gi, '<br><br>')  // Limit consecutive br tags
      
      // Sanitize the content to prevent XSS
      const sanitizedContent = createSafeHTML(processedContent)
      
      // Clean up any empty or invalid elements
      const cleanedContent = sanitizedContent.replace(/<span[^>]*>\s*<\/span>/g, '')
      console.log('Cleaned HTML content:', cleanedContent)
      
      setNewMessage(cleanedContent)
      
      // Trigger typing indicators
      const plainText = getPlainText(cleanedContent)
      console.log('Plain text from cleaned content:', plainText)
      
      if (plainText && onTypingStart) {
        onTypingStart()
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        typingTimeoutRef.current = setTimeout(() => {
          onTypingStop?.()
        }, 2000)
      } else if (!plainText && onTypingStop) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = null
        }
        onTypingStop()
      }
    } catch (e) {
      console.warn('Error handling expanded input change:', e)
    }
  }, [onTypingStart, onTypingStop, getPlainText])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    // For simple textarea input, store as plain text (no HTML formatting)
    setNewMessage(value)

    // Debounce typing indicators to reduce excessive calls
    if (value && onTypingStart) {
      onTypingStart()
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      // Set a timeout to stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStop?.()
      }, 2000)
    } else if (!value && onTypingStop) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      onTypingStop()
    }
  }, [onTypingStart, onTypingStop])

  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewMessage((prev) => prev + emoji)
    inputRef.current?.focus()
  }, [])

  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker(prev => !prev)
  }, [])

  const toggleExpandedEditor = useCallback(() => {
    setShowExpandedEditor(prev => {
      if (!prev && expandedInputRef.current) {
        // When opening, set the content and focus
        setTimeout(() => {
          if (expandedInputRef.current) {
            expandedInputRef.current.innerHTML = newMessage
            expandedInputRef.current.focus()
          }
        }, 100)
      }
      return !prev
    })
  }, [newMessage])

  // Helper to determine if consecutive messages are from the same user to group them
  const shouldShowUserInfo = useCallback((currentIndex: number) => {
    if (currentIndex === 0) return true
    const currentMessage = displayMessages[currentIndex]
    const previousMessage = displayMessages[currentIndex - 1]
    const timeDifference = currentMessage.timestamp - previousMessage.timestamp
    const fiveMinutes = 5 * 60 * 1000

    return (
      currentMessage.senderName !== previousMessage.senderName ||
      timeDifference > fiveMinutes ||
      currentMessage.isSystem ||
      previousMessage.isSystem
    )
  }, [displayMessages])

  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [])
  
  const otherTypingUsers = useMemo(() => 
    typingUsers.filter((user) => user !== username),
    [typingUsers, username]
  )

  const colorPalette = useMemo(() => [
    { bg: '#FFFF00', text: '#000000', name: 'Yellow Highlight' },
    { bg: '#FF6B6B', text: '#FFFFFF', name: 'Red Highlight' },
    { bg: '#4ECDC4', text: '#000000', name: 'Teal Highlight' },
    { bg: '#45B7D1', text: '#FFFFFF', name: 'Blue Highlight' },
    { bg: '#96CEB4', text: '#000000', name: 'Green Highlight' },
    { bg: '#FFEAA7', text: '#000000', name: 'Orange Highlight' },
    { bg: '#DDA0DD', text: '#000000', name: 'Purple Highlight' },
    { bg: '#98D8C8', text: '#000000', name: 'Mint Highlight' },
    { bg: '#F7DC6F', text: '#000000', name: 'Gold Highlight' },
    { bg: '#BB8FCE', text: '#FFFFFF', name: 'Lavender Highlight' },
    { bg: '#85C1E9', text: '#000000', name: 'Sky Blue Highlight' },
    { bg: '#F8C471', text: '#000000', name: 'Peach Highlight' },
  ], [])

  // Memoize the send button disabled state for debugging
  const isSendDisabled = useMemo(() => {
    const hasMessage = !!newMessage
    const plainText = getPlainText(newMessage).trim()
    const hasPlainText = !!plainText
    
    console.log('Send button check:', {
      hasMessage,
      plainText,
      hasPlainText,
      disabled: !hasMessage || !hasPlainText
    })
    
    return !hasMessage || !hasPlainText
  }, [newMessage, getPlainText])

  return (
    // The main container now uses flex column and takes full height of its parent
    <div className="flex flex-col h-full">
      {/* Messages area grows to fill available space */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto pr-2 mb-4">
        <AnimatePresence>
          {displayMessages.map((message, index) => {
            const showUserInfo = shouldShowUserInfo(index)
            const isOwnMessage = message.senderName === username

            return (
              <MessageItem
                key={message.id}
                message={message}
                showUserInfo={showUserInfo || false}
                isOwnMessage={isOwnMessage}
                username={username}
                formatTime={formatTime}
              />
            )
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {otherTypingUsers.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
           <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            {otherTypingUsers.length === 1
              ? `${otherTypingUsers[0]} is typing...`
              : `${otherTypingUsers.length} users are typing...`}
          </span>
        </div>
      )}

      {/* Message Input - This section no longer grows and stays at the bottom */}
      <div className="relative flex-shrink-0 pt-2 border-t dark:border-gray-700">
        <div className="flex gap-2 items-end">
          <div className="relative flex-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground z-10"
              onClick={toggleEmojiPicker}
              ref={emojiButtonRef}
            >
              <Smile className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground z-10"
              onClick={toggleExpandedEditor}
              title="Expand editor with formatting options"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Textarea
              ref={inputRef}
              value={newMessage.includes('<') ? getPlainText(newMessage) : newMessage} // Show plain text or strip HTML
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="pl-10 pr-10 py-2 resize-none min-h-[52px] max-h-[150px] overflow-y-auto"
              rows={1}
            />
          </div>
          <Button
            type="button"
            onClick={handleSendMessage}
            disabled={isSendDisabled}
            className="h-[52px] px-4 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {showEmojiPicker && (
          <div className="absolute bottom-full mb-2 left-0 right-0 emoji-picker-container">
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </div>
        )}
      </div>

      {/* Expanded Rich Text Editor Modal */}
      {showExpandedEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Rich Text Editor
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleExpandedEditor}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 p-3 border-b dark:border-gray-700 flex-wrap">
              {/* Color Picker */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Palette className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Select text, then choose highlight:</span>
                </div>
                <div className="flex gap-1 flex-wrap max-w-xs">
                  {colorPalette.map((colorObj, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => changeColor(colorObj)}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center text-xs font-bold transition-all hover:scale-105 ${
                        selectedColor.bg === colorObj.bg ? 'border-gray-800 dark:border-gray-200 ring-2 ring-blue-500' : 'border-gray-300'
                      }`}
                      style={{ 
                        backgroundColor: colorObj.bg,
                        color: colorObj.text
                      }}
                      title={colorObj.name}
                    >
                      A
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Clear Format Button */}
              <div className="flex items-center gap-2 ml-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearCurrentFormatting}
                  className="h-8 px-3 flex items-center gap-1"
                  title="Exit color/highlight formatting - ensures new text is plain (Ctrl+Shift+C)"
                >
                  <Eraser className="h-3 w-3" />
                  Remove Format
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFormatting}
                  className="h-8 px-3 text-xs"
                  title="Remove all formatting from entire message (Ctrl+Shift+A)"
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 p-4 flex flex-col min-h-0">
              <div
                ref={expandedInputRef}
                contentEditable
                onInput={handleExpandedInputChange}
                className="flex-1 w-full min-h-[200px] max-h-[400px] p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white empty:before:content-['Type_your_message..._Select_text_to_highlight_it!'] empty:before:text-gray-400 empty:before:pointer-events-none"
                style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', overflowWrap: 'break-word' }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Select text first, then click a color to highlight it. Use "Remove Format" to exit color/highlight effects so new text is plain.
                <br />
                <span className="text-xs">Shortcuts: Ctrl+Shift+C (Remove Format), Ctrl+Shift+A (Clear All)</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleExpandedEditor}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isSendDisabled} // Check if there's actual text content
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}