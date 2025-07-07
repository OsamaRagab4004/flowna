export interface Player {
  id: string
  name: string
  isHost: boolean
  isConnected: boolean
  isReady?: boolean
  score?: number
}

export interface GameState {
  phase: "lobby" | "writing" | "answering" | "reveal" | "results"
  roomCode: string
  round: number
  totalRounds: number
  questions: Question[]
  assignedQuestions: AssignedQuestion[]
  answers: Answer[]
  votes: Vote[]
}

export interface Question {
  id: string
  text: string
  authorId: string
  authorName: string
  type: "text" | "mcq" | "cw" | "tf" // Added "tf" for True/False questions
  options?: string[] // For MCQ questions
  correctOption?: number // For MCQ questions (index of correct option)
  blanks?: string[] // For C/W questions (parts to be filled)
  correctAnswer?: string // For C/W questions (complete answer)
  isTrue?: boolean // For True/False questions
}
export interface QuestionSettings {
  types: Array<"mcq" | "tf" | "cw">
  difficulties: string[]
  questionCount: number
}

export interface SummarySettings {
  createMindmap: boolean
  createDefinitions: boolean
  createQA: boolean
  createStepbystep: boolean
}

export interface MCQSettings {
  type: 'practical' | 'theoretical'
}

export interface AssignedQuestion {
  id: string
  questionId: string
  assignedToId: string
}

export interface Answer {
  id: string
  questionId: string
  text: string // For text questions
  authorId: string
  authorName: string
  selectedOption?: number // For MCQ questions
  filledBlanks?: string[] // For C/W questions
  isTrue?: boolean // For True/False questions
}

export interface Vote {
  id: string
  answerId: string
  voterId: string
  category: "correct" | "halfCorrect" | "incorrect"
}

export interface RevealItem {
  questionId: string
  question: string
  questionAuthorId: string
  questionAuthorName: string
  type?: "text" | "mcq" | "cw" | "tf" // Added "tf" for True/False questions
  options?: string[]
  correctOption?: number
  blanks?: string[]
  correctAnswer?: string
  isTrue?: boolean // For True/False questions
  answers: {
    id: string
    text: string
    authorId: string
    authorName: string
    selectedOption?: number
    filledBlanks?: string[]
    isTrue?: boolean // For True/False questions
    votes: {
      correct: number
      halfCorrect: number
      incorrect: number
    }
  }[]
}
