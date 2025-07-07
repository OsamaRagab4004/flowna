"use client"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

interface RevealCardProps {
  question: string
  answer: string
  authorName: string
  answererName: string
  isRevealed: boolean
  onReveal: () => void
}

export default function RevealCard({
  question,
  answer,
  authorName,
  answererName,
  isRevealed,
  onReveal,
}: RevealCardProps) {
  return (
    <div className="w-full perspective">
      <div className={`relative w-full transition-all duration-500 preserve-3d ${isRevealed ? "rotate-y-180" : ""}`}>
        {/* Front of card (Question) */}
        <div className={`absolute w-full backface-hidden ${isRevealed ? "opacity-0" : "opacity-100"}`}>
          <div className="bg-purple-100 dark:bg-purple-900/30 p-6 sm:p-8 rounded-lg shadow-md">
            <h3 className="font-semibold mb-4">Question:</h3>
            <p className="text-lg mb-6 leading-relaxed">{question}</p>
            <div className="text-sm text-right text-muted-foreground">Written by: {authorName}</div>
            <div className="mt-4">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-3 text-lg"
                onClick={onReveal}
              >
                Reveal Answer
              </Button>
            </div>
          </div>
        </div>

        {/* Back of card (Answer) */}
        <AnimatePresence>
          {isRevealed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute w-full backface-hidden rotate-y-180"
            >
              <div className="bg-pink-100 dark:bg-pink-900/30 p-6 sm:p-8 rounded-lg shadow-md">
                <h3 className="font-semibold mb-2">Question:</h3>
                <p className="mb-4 leading-relaxed">{question}</p>
                <h3 className="font-semibold mb-2">Answer:</h3>
                <p className="text-lg font-medium mb-6 leading-relaxed">{answer}</p>
                <div className="text-sm text-right text-muted-foreground">Answered by: {answererName}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
