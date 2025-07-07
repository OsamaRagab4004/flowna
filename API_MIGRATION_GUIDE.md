# API URL Migration Guide

## Environment Variable Setup ✅ DONE
- Created `.env.local` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`
- Created `lib/api.ts` utility functions

## Files Updated ✅ COMPLETED
- `context/auth-context.tsx` - All auth endpoints
- `components/feedback-button.tsx` - Feedback endpoint  
- `context/WebSocketContext.tsx` - WebSocket URL
- `context/StompContextType.tsx` - WebSocket URL
- `app/create/page.tsx` - Create room endpoint
- `lib/utils.ts` - Study time endpoint
- `app/previous-rooms/page.tsx` - Archived rooms endpoint
- `components/timer-widget.tsx` - Session time endpoint

## Usage Pattern
Replace this:
```typescript
const response = await fetch("http://localhost:8080/api/v1/endpoint", {
```

With this:
```typescript
import { getApiUrl } from "@/lib/api"

const response = await fetch(getApiUrl("api/v1/endpoint"), {
```

For WebSocket URLs:
```typescript
import { getWebSocketUrl } from "@/lib/api"

webSocketFactory: () => new SockJS(getWebSocketUrl())
```

## Remaining Files to Update
Run this search in VS Code to find remaining instances:
Search: `http://localhost:8080`

Key files that still need updates:
- `app/verify-user/page.tsx`
- `app/reset-password/page.tsx` 
- `app/mcq/[id]/page.tsx`
- `app/mcq/[id]/results/page.tsx`
- `app/lobby/[roomCode]/page.tsx`
- `app/lobby/[roomCode]/backup.tsx`

## How to Change Environment
To change the API URL for different environments:

1. **Development**: Update `.env.local`
   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
   ```

2. **Production**: Set environment variable
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-production-api.com
   ```

3. **Staging**: 
   ```
   NEXT_PUBLIC_API_BASE_URL=https://staging-api.com
   ```

## Benefits
- ✅ Single place to change API URL
- ✅ Environment-specific configurations
- ✅ Better maintainability
- ✅ Type-safe API calls
- ✅ Automatic URL construction
