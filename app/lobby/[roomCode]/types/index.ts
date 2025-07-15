// Common types used across the lobby components

export interface User {
  id: string;
  name: string;
  access_token: string;
}

export interface Player {
  id: string;
  username: string;
  host: boolean;
  ready: boolean;
  joinTime: string;
}

export interface Message {
  id: string;
  content: string;
  username: string;
  timestamp: string;
  userId: string;
}

export interface Goal {
  id: string;
  text: string;
  done: boolean;
  duration?: {
    hours: number;
    minutes: number;
  };
}

export interface Lecture {
  lectureId: number;
  title: string;
  creationTime: string;
}

export interface Session {
  id: number;
  title: string;
}

export interface Question {
  id: string;
  text: string;
  options?: string[];
  correctAnswer?: string;
  type: 'text' | 'mcq' | 'cw' | 'tf';
  authorId: string;
  authorName: string;
}

export interface SummarySettings {
  createMindmap: boolean;
  createDefinitions: boolean;
  createQA: boolean;
  createStepbystep: boolean;
}

export interface MCQSettings {
  type: 'practical' | 'theoretical';
}

export interface TimerData {
  timerDurationInSeconds: number;
  sessionGoals: string;
  roomJoinCode: string;
  timerEnabled: boolean;
  startTime?: number;
}

export interface RoomMessage {
  eventType: string;
  data: any;
  timestamp: string;
}

export interface StompClient {
  connected: boolean;
  publish: (params: { destination: string; body: string }) => void;
}

export interface ToastFunction {
  (params: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }): void;
}
