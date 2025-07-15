# Lobby Component Structure

This directory contains the refactored lobby component, organized into smaller, maintainable pieces.

## Directory Structure

```
lobby/[roomCode]/
├── components/          # Reusable UI components specific to lobby
├── hooks/              # Custom React hooks for business logic
│   ├── useTimer.ts     # Timer functionality
│   ├── useChat.ts      # Chat functionality
│   ├── useRoomManagement.ts  # Room joining/leaving/members
│   ├── useSessionManagement.ts  # Sessions, lectures, goals
│   ├── useFileUpload.ts  # File upload and processing
│   ├── useTabManagement.ts  # Tab visibility management
│   ├── useRoomMessageHandler.ts  # WebSocket message handling
│   ├── useConnectionManagement.ts  # Connection monitoring
│   ├── usePageReloadHandler.ts  # Page reload detection
│   └── index.ts        # Export all hooks
├── types/              # TypeScript type definitions
│   └── index.ts        # Common types
├── utils/              # Utility functions
│   └── timer-utils.ts  # Timer-related utilities
├── page.tsx            # Original large component
└── page-refactored.tsx # Refactored component using hooks
```

## Benefits of This Structure

1. **Separation of Concerns**: Each hook handles a specific domain (timer, chat, room management, etc.)
2. **Reusability**: Hooks can be easily reused in other components
3. **Testability**: Each hook can be tested independently
4. **Maintainability**: Changes to specific functionality are isolated
5. **Type Safety**: Centralized type definitions ensure consistency
6. **Performance**: Optimized with useCallback and useMemo where appropriate

## Usage

Import hooks as needed:

```typescript
import { useTimer, useChat, useRoomManagement } from './hooks';
```

Or import specific hooks:

```typescript
import { useTimer } from './hooks/useTimer';
import { useChat } from './hooks/useChat';
```

## Hook Responsibilities

### useTimer
- Timer state management
- localStorage persistence
- Server synchronization
- Page title updates

### useChat
- Message handling
- Typing indicators
- Unread message tracking
- WebSocket integration

### useRoomManagement
- Room joining/leaving
- Member management
- Host status
- Connection handling

### useSessionManagement
- Lecture management
- Session handling
- Goal tracking
- Study statistics

### useFileUpload
- File upload handling
- Content generation
- Progress tracking
- Error handling

### useTabManagement
- Tab visibility state
- Tab toggle functionality

### useRoomMessageHandler
- WebSocket message routing
- Event type handling
- State updates based on messages

### useConnectionManagement
- Connection monitoring
- Auto-reconnection
- Error handling

### usePageReloadHandler
- Page reload detection
- State restoration
- Auto-rejoin logic

## Migration Guide

To migrate from the original component to the refactored version:

1. Copy the refactored file: `cp page-refactored.tsx page.tsx`
2. Update any missing imports based on your actual component structure
3. Adjust component props to match your existing components
4. Test thoroughly to ensure all functionality works as expected

## Next Steps

- Move shared components to the `components/` directory
- Add unit tests for each hook
- Consider further splitting large hooks if needed
- Add documentation for each hook's API
- Implement error boundaries for better error handling
