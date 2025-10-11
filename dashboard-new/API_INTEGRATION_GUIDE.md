# Leka Bot API Integration Guide

## 🎯 Overview

This guide explains how the Bordio-style UI integrates with the Leka Bot backend API, including authentication, data fetching, and real-time updates.

## 🔐 Authentication

### URL-Based Authentication

The application uses URL parameters for authentication, matching the original Leka Bot dashboard:

```
https://your-domain.com/?userId=U1234567890&groupId=C1234567890
```

**Parameters:**
- `userId` - LINE User ID (starts with 'U')
- `groupId` - LINE Group ID (starts with 'C' or 'G')

### How It Works

1. **URL Parsing**: The `AuthContext` automatically extracts `userId` and `groupId` from URL parameters
2. **Local Storage**: Parameters are saved to localStorage for persistence
3. **Auto-Loading**: On app load, it tries URL params first, then falls back to localStorage
4. **API Headers**: These parameters are used in all API calls

### Implementation

```javascript
// In AuthContext.jsx
const getUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    userId: params.get('userId') || params.get('userid'),
    groupId: params.get('groupId') || params.get('groupid'),
  };
};
```

### Using Auth in Components

```javascript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { userId, groupId, isAuthenticated } = useAuth();
  
  if (!isAuthenticated()) {
    return <div>Please login</div>;
  }
  
  // Use userId and groupId for API calls
}
```

## 📡 API Service Layer

### Configuration

Set your API base URL in `.env`:

```env
VITE_API_URL=http://localhost:3000/api
# or
VITE_API_URL=https://your-backend.com/api
```

### Available API Functions

#### Task APIs

```javascript
import { 
  fetchTasks, 
  getTask, 
  createTask, 
  updateTask, 
  deleteTask,
  completeTask,
  submitTask 
} from './services/api';

// Fetch all tasks for a group
const tasks = await fetchTasks(groupId, { status: 'in-progress' });

// Get single task
const task = await getTask(groupId, taskId);

// Create new task
const newTask = await createTask(groupId, {
  title: 'New Task',
  description: 'Task description',
  status: 'new',
  dueDate: '2025-10-15',
  assignees: ['U1234567890']
});

// Update task
await updateTask(groupId, taskId, { status: 'completed' });

// Delete task
await deleteTask(taskId);

// Complete task
await completeTask(taskId);

// Submit task for review
await submitTask(groupId, taskId, {
  comment: 'Task completed',
  files: []
});
```

#### Group APIs

```javascript
import { 
  getGroup, 
  getGroupMembers, 
  getGroupStats,
  getLeaderboard 
} from './services/api';

// Get group info
const group = await getGroup(groupId);

// Get group members
const members = await getGroupMembers(groupId);

// Get group statistics
const stats = await getGroupStats(groupId);

// Get leaderboard
const leaderboard = await getLeaderboard(groupId);
```

#### Calendar APIs

```javascript
import { getCalendarEvents } from './services/api';

// Get calendar events
const events = await getCalendarEvents(groupId, {
  startDate: '2025-10-01',
  endDate: '2025-10-31'
});
```

#### File APIs

```javascript
import { 
  getGroupFiles, 
  uploadFile, 
  downloadFile 
} from './services/api';

// Get files
const files = await getGroupFiles(groupId);

// Upload file
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('userId', userId);
const uploadedFile = await uploadFile(groupId, formData);

// Get download URL
const downloadUrl = downloadFile(groupId, fileId);
```

#### Recurring Task APIs

```javascript
import { 
  listRecurringTasks, 
  createRecurringTask,
  updateRecurringTask,
  deleteRecurringTask 
} from './services/api';

// List recurring tasks
const recurring = await listRecurringTasks(groupId);

// Create recurring task
const newRecurring = await createRecurringTask(groupId, {
  title: 'Weekly Report',
  pattern: 'weekly',
  dayOfWeek: 1, // Monday
  time: '09:00'
});

// Update recurring task
await updateRecurringTask(recurringId, { time: '10:00' });

// Delete recurring task
await deleteRecurringTask(recurringId);
```

## 🔄 Data Flow

### 1. Initial Load

```
User opens app with URL params
    ↓
AuthContext extracts userId & groupId
    ↓
App.jsx loads data:
  - fetchTasks(groupId)
  - getGroup(groupId)
  - getGroupMembers(groupId)
    ↓
Data normalized and displayed
```

### 2. Task Update (Drag & Drop)

```
User drags task to new column
    ↓
KanbanView.handleDragEnd()
    ↓
Optimistic UI update (instant feedback)
    ↓
API call: updateTask(groupId, taskId, { status: newStatus })
    ↓
Success: Keep UI update
Error: Revert UI and reload tasks
```

### 3. Real-time Updates

For real-time updates, you can implement polling or WebSocket:

**Polling Example:**

```javascript
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetchTasks(groupId);
    setTasks(normalizeTasks(response.tasks));
  }, 30000); // Every 30 seconds

  return () => clearInterval(interval);
}, [groupId]);
```

**WebSocket Example:**

```javascript
useEffect(() => {
  const ws = new WebSocket('wss://your-backend.com/ws');
  
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    if (update.type === 'task_updated') {
      // Update specific task
      setTasks(prev => prev.map(t => 
        t.id === update.taskId ? { ...t, ...update.data } : t
      ));
    }
  };

  return () => ws.close();
}, []);
```

## 🎨 Data Normalization

The API service includes helper functions to normalize backend data:

```javascript
import { normalizeTask, normalizeTasks, calculateStats } from './services/api';

// Normalize single task
const task = normalizeTask(backendTask);

// Normalize array of tasks
const tasks = normalizeTasks(backendTasks);

// Calculate statistics
const stats = calculateStats(tasks);
// Returns: { totalTasks, completedTasks, inProgressTasks, overdueTasks, ... }
```

### Backend Format → Frontend Format

```javascript
// Backend format
{
  id: "task-123",
  description: "Task title",
  status: "in_progress",
  dueDate: "2025-10-15",
  assignees: [
    { lineUserId: "U123", displayName: "John", pictureUrl: "..." }
  ],
  timeEstimate: "4h"
}

// Frontend format (after normalization)
{
  id: "task-123",
  title: "Task title",
  description: "Task title",
  status: "in-progress",
  scheduledDate: "2025-10-15",
  dueDate: "2025-10-15",
  assignee: {
    name: "John",
    avatar: "...",
    lineUserId: "U123"
  },
  assignees: [...],
  estimatedTime: "4h",
  tags: [],
  type: "operational"
}
```

## 🚨 Error Handling

### Automatic Fallback

The app automatically falls back to sample data if API calls fail:

```javascript
try {
  const response = await fetchTasks(groupId);
  setTasks(normalizeTasks(response.tasks));
} catch (err) {
  console.error('API failed, using sample data:', err);
  loadSampleData(); // Fallback to sample data
}
```

### Error States

```javascript
const [error, setError] = useState(null);

if (error && !isAuthenticated()) {
  return (
    <div className="error-message">
      <h2>Authentication Required</h2>
      <p>Please access via LINE bot with proper parameters</p>
    </div>
  );
}
```

## 🔧 Configuration

### CORS Setup

Your backend must allow CORS from your frontend domain:

```javascript
// Backend (Express)
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true
}));
```

### API Timeout

```javascript
// In api.js
const apiCall = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(endpoint, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return await response.json();
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
};
```

## 📊 Performance Optimization

### 1. Caching

```javascript
const cache = new Map();

export const fetchTasksWithCache = async (groupId) => {
  const cacheKey = `tasks_${groupId}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data; // Use cache if less than 1 minute old
  }
  
  const data = await fetchTasks(groupId);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};
```

### 2. Debouncing

```javascript
import { debounce } from 'lodash';

const debouncedUpdate = debounce(async (taskId, updates) => {
  await updateTask(groupId, taskId, updates);
}, 500);
```

### 3. Batch Updates

```javascript
const batchUpdate = async (updates) => {
  const promises = updates.map(({ taskId, data }) => 
    updateTask(groupId, taskId, data)
  );
  await Promise.all(promises);
};
```

## 🧪 Testing

### Mock API for Development

```javascript
// In .env.development
VITE_API_URL=http://localhost:3000/api
VITE_USE_MOCK=true

// In api.js
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const fetchTasks = async (groupId) => {
  if (USE_MOCK) {
    return mockTasks; // Return mock data
  }
  return apiCall(`/groups/${groupId}/tasks`);
};
```

## 📝 API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups/:groupId/tasks` | Get all tasks |
| GET | `/api/groups/:groupId/tasks/:taskId` | Get single task |
| POST | `/api/groups/:groupId/tasks` | Create task |
| PUT | `/api/groups/:groupId/tasks/:taskId` | Update task |
| DELETE | `/api/tasks/:taskId` | Delete task |
| POST | `/api/tasks/:taskId/complete` | Complete task |
| GET | `/api/groups/:groupId/calendar` | Get calendar events |
| GET | `/api/groups/:groupId` | Get group info |
| GET | `/api/groups/:groupId/members` | Get group members |
| GET | `/api/groups/:groupId/stats` | Get group statistics |
| GET | `/api/groups/:groupId/files` | Get files |
| POST | `/api/groups/:groupId/files` | Upload file |
| GET | `/api/groups/:groupId/recurring` | Get recurring tasks |
| POST | `/api/groups/:groupId/recurring` | Create recurring task |

## 🔗 Related Files

- `src/services/api.js` - API service layer
- `src/context/AuthContext.jsx` - Authentication context
- `src/App.jsx` - Main app with data loading
- `src/components/tasks/KanbanView.jsx` - Drag & drop with API updates

## 🆘 Troubleshooting

### Issue: "Failed to fetch"

**Cause**: CORS or network issue

**Solution**:
1. Check backend CORS configuration
2. Verify API_URL in .env
3. Check browser console for details

### Issue: "Authentication Required"

**Cause**: Missing userId or groupId

**Solution**:
1. Ensure URL has `?userId=...&groupId=...`
2. Check localStorage for saved values
3. Access via LINE bot link

### Issue: Tasks not updating

**Cause**: API call failed or wrong groupId

**Solution**:
1. Check network tab in browser devtools
2. Verify groupId matches backend
3. Check backend logs

---

**Version**: 2.0.0  
**Last Updated**: October 11, 2025  
**Status**: ✅ Production Ready

