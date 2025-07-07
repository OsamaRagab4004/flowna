"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react" // Added useEffect
import type { GameState, Player, Question, Answer, AssignedQuestion, Vote } from "@/types/game"

interface GameContextType {
  gameState: GameState
  setGameState: (state: Partial<GameState>) => void
  players: Player[]
  addPlayer: (player: Player) => void
  removePlayer: (playerId: string) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  addQuestion: (question: Question) => void
  assignQuestion: (assignedQuestion: AssignedQuestion) => void
  addAnswer: (answer: Answer) => void
  addVote: (vote: Vote) => void
  getAssignedQuestionsForPlayer: (playerId: string) => Question[]
  getPlayerScore: (playerId: string) => number
  resetGame: () => void
  startNewRound: () => void
  setPlayerReady: (playerId: string, isReady: boolean) => void
  resetAllPlayersReadyStatus: () => void
}

const initialGameState: GameState = {
  phase: "lobby",
  roomCode: "",
  round: 1,
  totalRounds: 3,
  questions: [],
  assignedQuestions: [],
  answers: [],
  votes: [],
}

const GameContext = createContext<GameContextType | undefined>(undefined)

const PLAYERS_STORAGE_KEY = "truthBombsPlayers"; // Key for localStorage

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameStateInternal] = useState<GameState>(initialGameState)
  // Initialize players from localStorage or an empty array
  const [players, setPlayers] = useState<Player[]>(() => {
    if (typeof window !== "undefined") {
      const storedPlayers = localStorage.getItem(PLAYERS_STORAGE_KEY);
      if (storedPlayers) {
        try {
          return JSON.parse(storedPlayers);
        } catch (error) {
          console.error("Error parsing players from localStorage:", error);
          // localStorage.removeItem(PLAYERS_STORAGE_KEY); // Optionally clear corrupted data
          return []; // Fallback to empty array on parse error
        }
      }
    }
    return []; // Default to empty array if not in browser or no stored data
  });

  // Effect to save players to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(players));
    }
  }, [players]); // This effect runs when the `players` state changes

  const setGameState = (state: Partial<GameState>) => {
    setGameStateInternal((prev) => ({ ...prev, ...state }))
  }

const addPlayer = (player: Player) => {
    setPlayers((prevPlayers) => {
      // Key Change: The check for existing players is now inside the state setter,
      // which guarantees `prevPlayers` is the most current state.
      // We check by name as IDs might be different on client-side generation.
      const exists = prevPlayers.some((p) => p.name === player.name);
      if (exists) {
        // Optionally update the existing player's info, e.g., isConnected status
        return prevPlayers.map((p) => (p.name === player.name ? { ...p, ...player } : p));
      }
      return [...prevPlayers, player];
    });
  }

  const removePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId))
  }

  const updatePlayer = (playerId: string, updates: Partial<Player>) => {
    setPlayers((prev) => prev.map((player) => (player.id === playerId ? { ...player, ...updates } : player)))
  }

  const setPlayerReady = (playerId: string, isReady: boolean) => {
    updatePlayer(playerId, { isReady })
  }

  const resetAllPlayersReadyStatus = () => {
    setPlayers((prev) => prev.map((player) => ({ ...player, isReady: false })))
  }

  const addQuestion = (question: Question) => {
    setGameStateInternal((prev) => ({
      ...prev,
      questions: [...prev.questions, question],
    }))
  }

  const assignQuestion = (assignedQuestion: AssignedQuestion) => {
    setGameStateInternal((prev) => ({
      ...prev,
      assignedQuestions: [...prev.assignedQuestions, assignedQuestion],
    }))
  }

  const addAnswer = (answer: Answer) => {
    setGameStateInternal((prev) => ({
      ...prev,
      answers: [...prev.answers, answer],
    }))
  }

  const addVote = (vote: Vote) => {
    setGameStateInternal((prev) => ({
      ...prev,
      votes: [...prev.votes, vote],
    }))
  }

  const getAssignedQuestionsForPlayer = (playerId: string) => {
    const assignedQuestionIds = gameState.assignedQuestions
      .filter((aq) => aq.assignedToId === playerId)
      .map((aq) => aq.questionId)

    return gameState.questions.filter((q) => assignedQuestionIds.includes(q.id))
  }

  const getPlayerScore = (playerId: string) => {
    // Count votes for answers by this player
    const playerAnswerIds = gameState.answers.filter((a) => a.authorId === playerId).map((a) => a.id)

    // Count votes by category
    const correctVotes = gameState.votes.filter(
      (v) => playerAnswerIds.includes(v.answerId) && v.category === "correct",
    ).length

    const halfCorrectVotes = gameState.votes.filter(
      (v) => playerAnswerIds.includes(v.answerId) && v.category === "halfCorrect",
    ).length

    // Calculate total score (can adjust point values)
    return correctVotes * 3 + halfCorrectVotes * 1
  }

  const resetGame = () => {
    setGameStateInternal(initialGameState)
    resetAllPlayersReadyStatus()
  }

  const startNewRound = () => {
    setGameStateInternal((prev) => ({
      ...prev,
      phase: "writing",
      round: prev.round + 1,
      questions: [],
      assignedQuestions: [],
      answers: [],
      votes: [],
    }))
    resetAllPlayersReadyStatus()
  }

  return (
    <GameContext.Provider
      value={{
        gameState,
        setGameState,
        players,
        addPlayer,
        removePlayer,
        updatePlayer,
        addQuestion,
        assignQuestion,
        addAnswer,
        addVote,
        getAssignedQuestionsForPlayer,
        getPlayerScore,
        resetGame,
        startNewRound,
        setPlayerReady,
        resetAllPlayersReadyStatus,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGameContext() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error("useGameContext must be used within a GameProvider")
  }
  return context
}
