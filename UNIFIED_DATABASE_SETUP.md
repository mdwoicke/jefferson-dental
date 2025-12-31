# Unified Database Setup - Implementation Complete

## Overview

The unified database solution enables **both browser and telephony test calls to be stored in the same backend database**, making all call logs visible in the Data Viewer UI regardless of where the call originated.

## Architecture

### Before (Separate Databases)
```
Browser Test Page          Telephony Test Page
     ↓                            ↓
sql.js (in-memory)         better-sqlite3 (file)
     ↓                            ↓
Browser Database           Backend Database
     ↓                            ↓
Data Viewer UI            (No UI)
✅ Browser calls           ❌ Not visible in Data Viewer
```

### After (Unified Database)
```
Browser Test Page          Telephony Test Page
     ↓                            ↓
API Adapter                NodeDatabaseAdapter
     ↓                            ↓
Backend API (/api/db/*)    Backend Database
     ↓                            ↓
better-sqlite3 (file) - SHARED DATABASE
     ↓
Data Viewer UI
✅ ALL calls visible (browser + telephony)
```

## Implementation Details

### 1. Backend Database API (`backend/src/routes/database-api.ts`)
Created comprehensive REST API endpoints for all database operations:

**Conversation Endpoints:**
- `GET /api/db/conversations` - List all conversations
- `GET /api/db/conversations/:id` - Get conversation by ID
- `POST /api/db/conversations` - Create conversation
- `PUT /api/db/conversations/:id/end` - End conversation
- `GET /api/db/conversations/:id/turns` - Get conversation turns
- `POST /api/db/conversations/:id/turns` - Log conversation turn

**Function Call Endpoints:**
- `GET /api/db/conversations/:id/function-calls` - Get function calls
- `POST /api/db/function-calls` - Log function call
- `PUT /api/db/function-calls/:id/result` - Update function result
- `PUT /api/db/function-calls/:id/error` - Update function error

**Patient & Appointment Endpoints:**
- Full CRUD operations for patients, children, and appointments

### 2. API-Based Database Adapter (`database/frontend/api-adapter.ts`)
Implements the `DatabaseAdapter` interface by making HTTP requests to the backend API:

```typescript
export class APIBasedDatabaseAdapter implements DatabaseAdapter {
  constructor(backendUrl: string = 'http://localhost:3001') {
    this.baseUrl = `${backendUrl}/api/db`;
  }

  async createConversation(data: CreateConversationData): Promise<void> {
    await this.request('/conversations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ... all other DatabaseAdapter methods
}
```

### 3. Updated Database Context (`contexts/DatabaseContext.tsx`)
Configuration flag to enable/disable unified database:

```typescript
// Database mode configuration
const USE_UNIFIED_DATABASE = true; // Enable unified logging
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// In useEffect:
if (USE_UNIFIED_DATABASE) {
  // Use API-based adapter (unified database)
  adapter = new APIBasedDatabaseAdapter(BACKEND_URL);
} else {
  // Use local browser database (legacy mode)
  const db = await initBrowserDatabase();
  adapter = new BrowserDatabaseAdapter(db);
}
```

### 4. Call Manager Integration (`backend/src/call-manager.ts`)
Added method to expose database adapter:

```typescript
getDbAdapter(): DatabaseAdapter {
  return this.dbAdapter;
}
```

## Configuration

### Enable Unified Database (Default)
Set in `contexts/DatabaseContext.tsx`:
```typescript
const USE_UNIFIED_DATABASE = true;
```

### Backend URL Configuration
Default: `http://localhost:3001`

Override with environment variable in `.env.local`:
```
VITE_BACKEND_URL=http://your-backend-url:port
```

## Usage

### 1. Start the Backend Server
```bash
cd backend
npm start
```
The backend will:
- Listen on port 3001 (default)
- Create/use database at `backend/jefferson-dental.db`
- Expose database API at `/api/db/*`

### 2. Start the Frontend
```bash
npm run dev
```
The frontend will:
- Connect to backend at `http://localhost:3001`
- Use API adapter for all database operations
- Log all browser test calls to the backend database

### 3. View Unified Logs
Navigate to `/admin` in the browser to access the Data Viewer UI.

You will now see:
- ✅ **Browser test calls** (logged via API adapter)
- ✅ **Telephony test calls** (logged directly by backend)
- ✅ **All conversation turns and transcripts**
- ✅ **All function calls with arguments and results**
- ✅ **All appointments created**

## Data Flow Example

### Browser Test Call
1. User initiates call in browser
2. OpenAI provider calls `conversationLogger.startConversation()`
3. ConversationLogger uses `APIBasedDatabaseAdapter`
4. API adapter makes `POST /api/db/conversations` to backend
5. Backend writes to `jefferson-dental.db`
6. Data Viewer reads from same database

### Telephony Test Call
1. Backend receives Twilio webhook
2. CallManager creates conversation logger with `NodeDatabaseAdapter`
3. Logger writes directly to `jefferson-dental.db`
4. Data Viewer reads from same database

## Benefits

1. **Unified View**: All calls visible in one place
2. **Consistent Schema**: Same database structure for all calls
3. **Persistent Storage**: Browser calls persisted to file (not lost on refresh)
4. **Analytics**: Cross-channel analytics and reporting
5. **Debugging**: Easy comparison of browser vs telephony behavior

## Rollback to Separate Databases

If needed, revert to separate databases:

```typescript
// In contexts/DatabaseContext.tsx
const USE_UNIFIED_DATABASE = false;
```

This will:
- Browser: Use local sql.js database (in-memory)
- Telephony: Continue using backend database
- Data Viewer: Only show browser calls (legacy behavior)

## Files Modified

1. `backend/src/routes/database-api.ts` (NEW)
2. `backend/src/server.ts` (Updated - added API router)
3. `backend/src/call-manager.ts` (Updated - added getDbAdapter())
4. `database/frontend/api-adapter.ts` (NEW)
5. `contexts/DatabaseContext.tsx` (Updated - configurable adapter)

## Testing

To verify unified logging works:

1. **Start backend**: `cd backend && npm start`
2. **Start frontend**: `npm run dev`
3. **Make a browser test call**:
   - Go to `http://localhost:5173`
   - Click "Simulate Outbound Call"
   - Have a conversation with Sophia
   - End the call
4. **Make a telephony test call** (optional):
   - Use Twilio to initiate a call
   - Or use the backend API: `POST /api/calls`
5. **View Data Viewer**:
   - Go to `http://localhost:5173/admin`
   - Navigate to "Conversations" tab
   - **Verify**: You should see calls from both browser and telephony

## Troubleshooting

### "Failed to fetch" errors in browser console
- **Cause**: Backend not running or wrong URL
- **Fix**: Ensure backend is running on port 3001, check `VITE_BACKEND_URL`

### Calls not appearing in Data Viewer
- **Cause**: `USE_UNIFIED_DATABASE` set to false
- **Fix**: Set to `true` in `contexts/DatabaseContext.tsx`

### CORS errors
- **Cause**: Backend CORS not configured for frontend URL
- **Fix**: Check `backend/src/server.ts` CORS origin list includes your frontend URL

## Next Steps

Future enhancements could include:
- Real-time call updates via WebSockets
- Multi-tenancy support
- Database backup/export functionality
- Advanced filtering and search in Data Viewer
