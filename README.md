OsamaRagab4004: write short documentation include most important features like system for reconnections, context, etc in app for github documentation

Workspace: Collecting workspace information# Flowna - Study App Documentation

A modern collaborative study application built with Next.js, featuring real-time communication, file processing, and interactive learning materials.

## 🚀 Key Features

### Real-time Collaboration
- **Study Rooms**: Create and join collaborative study sessions
- **Live Chat**: Real-time messaging with typing indicators
- **WebSocket Integration**: Persistent connections via STOMP protocol
- **Multi-user Support**: Host and participant roles with different permissions

### Intelligent Content Generation
- **AI-powered Study Materials**: Upload PDFs and generate:
  - Interactive mind maps (Mermaid diagrams)
  - Concept definitions with real-world examples
  - Q&A sessions
  - Step-by-step guides
- **Lecture Management**: Access pre-generated study materials by lecture ID

### Robust Connection Management
- **Automatic Reconnection**: Multi-layered reconnection system with exponential backoff
- **Connection Monitoring**: Real-time WebSocket health checks
- **State Persistence**: Timer and session data preserved during disconnections
- **Visual Feedback**: Connection status indicators and manual retry options

## 🏗️ Architecture

### Context System
The app uses multiple React contexts for state management:

- **`AuthProvider`**: User authentication and session management
- **`StompProvider`**: WebSocket connection and message handling
- **`GameProvider`**: Quiz and game state management
- **`WebSocketProvider`**: Base WebSocket functionality

### Connection Management
The `useConnectionManagement` hook provides:
- Automatic reconnection with up to 5 attempts
- Exponential backoff strategy
- Timer state preservation during reconnections
- Toast notifications for connection status

### Modular Hook System
Business logic is separated into focused hooks:
- **`useTimer`**: Timer functionality with localStorage persistence
- **`useChat`**: Real-time messaging and typing indicators
- **`useFileUpload`**: File processing and content generation
- **`useRoomManagement`**: Room joining/leaving and member management

## 🔧 Technical Implementation

### API Integration
- **Environment-based Configuration**: Uses `getApiUrl` for environment-specific endpoints
- **JWT Authentication**: Bearer token-based API authentication
- **REST + WebSocket**: Hybrid approach for real-time and request-response patterns

### State Management
- **React Context**: Global state management for authentication and WebSocket connections
- **Custom Hooks**: Encapsulated business logic with proper dependency management
- **LocalStorage**: Persistent timer and session data across page refreshes

### UI Components
Built with shadcn/ui components for consistent design:
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Mode Support**: Theme switching via ThemeProvider
- **Loading States**: Skeleton components and loading indicators
- **Toast Notifications**: User feedback for actions and errors

## 📁 Project Structure

```
app/
├── lobby/[roomCode]/          # Study room functionality
│   ├── hooks/                 # Custom hooks for business logic
│   ├── components/            # Room-specific UI components
│   └── types/                 # TypeScript definitions
├── lec/[id]/                  # Lecture-specific materials
├── create/                    # Room creation flow
├── join/                      # Room joining flow
└── home/                      # Main dashboard

components/
├── ui/                        # Reusable UI components
├── definitions-list.tsx       # Interactive concept definitions
├── mindmap-viewer.tsx         # Mermaid diagram renderer
├── timer-widget.tsx           # Study timer component
└── chat-room.tsx              # Real-time chat interface

context/
├── auth-context.tsx           # Authentication state
├── StompContextType.tsx       # WebSocket connections
└── game-context.tsx           # Quiz/game state
```

## 🔄 Connection Recovery System

The app implements a sophisticated connection recovery system:

1. **Health Monitoring**: Continuous WebSocket state checking
2. **Automatic Reconnection**: Immediate retry on connection loss
3. **Exponential Backoff**: Increasing delays between retry attempts
4. **Manual Override**: User-initiated reconnection button
5. **State Preservation**: Timer and session data maintained during outages

## 🎯 Getting Started

1. **Environment Setup**:
   ```bash
   # Create .env.local
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   ```

3. **Run Development Server**:
   ```bash
   pnpm dev
   ```

4. **Build for Production**:
   ```bash
   pnpm build
   ```

## 🛠️ Key Technologies

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **STOMP.js**: WebSocket messaging protocol
- **Mermaid**: Diagram generation
- **React Query**: Server state management
- **Zustand**: Client state management
