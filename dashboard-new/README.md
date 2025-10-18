# Leka Bot - Dashboard ใหม่ (v2.0)

Dashboard สำหรับจัดการงานที่ทันสมัย รองรับการเปิดจาก LINE bot พร้อมระบบสิทธิ์แบบ Personal และ Group Mode

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![React](https://img.shields.io/badge/react-19.1.0-61dafb.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Progress](https://img.shields.io/badge/progress-58%25-yellow.svg)

## ✨ Features

### Core Features
- 🎨 **Modern UI/UX** - Clean, professional interface with React components
- 📊 **Dashboard View** - Statistics, today's tasks, and recent activity
- 📅 **Calendar View** - Weekly/monthly calendar with task management
- ✅ **Task Management** - Create, edit, delete tasks with full validation
- 🔄 **Recurring Tasks** - Automatic task creation (daily, weekly, monthly, custom)
- 📎 **File Management** - Upload, download, and share files
- 👥 **Member Management** - Invite members, manage roles and permissions
- 🏆 **Leaderboard** - Track team performance and achievements
- 📊 **Reports** - Analytics and statistics
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

### LINE Integration 🎉
- 📱 **Personal Mode** - Full access when opened from personal chat
  - ✅ Create/Edit/Delete tasks
  - ✅ Create recurring tasks
  - ✅ Manage members
  - ✅ Upload files
  - ✅ Full permissions
- 👥 **Group Mode** - Read-only when opened from group chat
  - ✅ View all data
  - ✅ Submit tasks
  - ❌ Cannot create/edit (must use personal chat)
- 🔐 **Smart Authentication** - Auto-detect mode from URL parameters
- 💾 **Persistent Sessions** - Remember auth via localStorage
- 🔔 **Toast Notifications** - Clear feedback for all actions

## 📱 การเปิดจาก LINE

### วิธีที่ 1: แชทส่วนตัว (แนะนำ) ⭐
```
💬 เปิดแชทส่วนตัวกับบอท → กดปุ่ม "แดชบอร์ด"
```
✅ สิทธิ์เต็มรูปแบบ (Personal Mode)

### วิธีที่ 2: แชทกลุ่ม
```
👥 เปิดแชทกลุ่ม → กดปุ่ม "แดชบอร์ด"
```
⚠️ โหมดดูอย่างเดียว (Group Mode)

**URL Pattern:**
- Personal: `?userId=U123456789&groupId=C123456789`
- Group: `?groupId=C123456789`

📖 [อ่านเพิ่มเติม: LINE Integration Guide](./LINE_INTEGRATION.md)

## 🚀 Quick Start

### สำหรับผู้ใช้งาน
📖 [Quick Start Guide](./QUICK_START.md) - เริ่มต้นใช้งานใน 3 นาที

### สำหรับนักพัฒนา

#### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Leka Bot backend running (for API integration)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd leka-bot-bordio-ui

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env and set VITE_API_URL

# Start development server
pnpm dev

# Build for production
pnpm build
```

### Environment Variables

Create `.env` file:

```env
# Backend API URL
VITE_API_URL=http://localhost:3000/api

# App Configuration
VITE_APP_NAME=Leka Bot
VITE_APP_VERSION=2.0.0

# Optional: Use mock data for development
VITE_USE_MOCK=false
```

### Development

```bash
# Start dev server (with hot reload)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Lint code
pnpm lint
```

## 🔐 Authentication

### URL Parameters

The app uses URL parameters for authentication (same as original Leka Bot):

```
https://your-domain.com/?userId=U1234567890&groupId=C1234567890
```

**Parameters:**
- `userId` - LINE User ID (required)
- `groupId` - LINE Group ID (required)

### How It Works

1. User clicks link from LINE bot with userId and groupId
2. App extracts parameters from URL
3. Parameters saved to localStorage for persistence
4. All API calls use these parameters automatically

### Example Usage

```javascript
// Access via LINE bot link
https://leka-bot.com/?userId=U1234567890&groupId=C1234567890

// The app will:
// 1. Extract userId and groupId
// 2. Load tasks for that group
// 3. Show user-specific data
// 4. Enable all features
```

## 📡 API Integration

### Backend Connection

The app connects to Leka Bot backend API:

```javascript
// Automatic API calls
- GET /api/groups/:groupId/tasks
- GET /api/groups/:groupId
- GET /api/groups/:groupId/members
- PUT /api/groups/:groupId/tasks/:taskId
- POST /api/tasks/:taskId/complete
// ... and more
```

### Features

- ✅ Automatic data loading on startup
- ✅ Optimistic UI updates
- ✅ Error handling with fallback
- ✅ Data normalization
- ✅ Statistics calculation
- ✅ Real-time task updates

See [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md) for detailed documentation.

## 🎯 Drag & Drop

### Kanban Board

The Kanban board now has **real drag-and-drop functionality**:

```javascript
// Drag a task card
// Drop it on another column
// → Task status updates automatically
// → API call sent to backend
// → UI updates instantly
```

**Features:**
- Smooth drag animations
- Visual feedback while dragging
- Automatic status update
- API sync with backend
- Error handling and rollback

**Implementation:**
- Uses `@dnd-kit/core` for drag-and-drop
- Optimistic UI updates
- Automatic API calls on drop
- Revert on error

## 📁 Project Structure

```
leka-bot-bordio-ui/
├── src/
│   ├── components/
│   │   ├── layout/              # Layout components
│   │   │   ├── Sidebar.jsx      # Navigation with group info
│   │   │   └── MainLayout.jsx   # Content wrapper
│   │   ├── calendar/            # Calendar view
│   │   │   └── CalendarView.jsx
│   │   ├── tasks/               # Task views
│   │   │   ├── TasksView.jsx
│   │   │   ├── TableView.jsx
│   │   │   └── KanbanView.jsx   # With drag-and-drop
│   │   ├── common/              # Shared components
│   │   │   └── TaskCard.jsx
│   │   └── DashboardView.jsx
│   ├── context/                 # React contexts
│   │   └── AuthContext.jsx      # Auth with URL params
│   ├── services/                # API services
│   │   └── api.js               # Backend API integration
│   ├── data/
│   │   └── sampleData.js        # Fallback sample data
│   ├── App.jsx                  # Main app with API loading
│   └── App.css                  # Global styles
├── API_INTEGRATION_GUIDE.md     # API documentation
├── DOCUMENTATION.md             # Technical docs
├── DEPLOYMENT_GUIDE.md          # Deployment guide
└── package.json
```

## 🎨 Design System

### Colors

```css
/* Primary Colors */
--bordio-navy: #1A1D2E;      /* Sidebar */
--bordio-blue: #4A90E2;      /* Accent */
--background: #F8F9FA;       /* Main area */

/* Task Status Colors */
--new-task: #E8D5F2;         /* Light Purple */
--scheduled: #D5E8F7;        /* Light Blue */
--in-progress: #D5F7E1;      /* Light Green */
--completed: #E5E5E5;        /* Light Gray */
--overdue: #FFE5E5;          /* Light Red */
```

## 🧩 Component Usage

### With Authentication

```jsx
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { userId, groupId, isAuthenticated } = useAuth();
  
  if (!isAuthenticated()) {
    return <div>Please login via LINE bot</div>;
  }
  
  return <div>Welcome, {userId}!</div>;
}
```

### With API

```jsx
import { fetchTasks, updateTask } from './services/api';

function TaskList() {
  const { groupId } = useAuth();
  const [tasks, setTasks] = useState([]);
  
  useEffect(() => {
    fetchTasks(groupId).then(data => {
      setTasks(normalizeTasks(data.tasks));
    });
  }, [groupId]);
  
  const handleUpdate = async (taskId, updates) => {
    await updateTask(groupId, taskId, updates);
  };
  
  return <TasksView tasks={tasks} onTaskUpdate={handleUpdate} />;
}
```

## 📦 Tech Stack

### Core
- **Framework**: React 19.1.0
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS 4.1.7
- **Package Manager**: pnpm

### UI Components
- **Radix UI**: Accessible primitives
- **shadcn/ui**: Pre-built components
- **Lucide React**: 510+ icons
- **Framer Motion**: Animations

### New Libraries
- **@dnd-kit/core**: Drag-and-drop functionality
- **@dnd-kit/sortable**: Sortable lists
- **@dnd-kit/utilities**: DnD utilities

### Utilities
- **date-fns**: Date formatting
- **clsx**: Class name utilities
- **tailwind-merge**: Class merging
- **zod**: Schema validation

## 🔧 Configuration

### Backend URL

Set in `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

### CORS

Backend must allow CORS:

```javascript
// Backend (Express)
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true
}));
```

## 🌐 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📱 Responsive Breakpoints

- **Desktop**: > 1024px (Full layout)
- **Tablet**: 768px - 1024px (Adjusted layout)
- **Mobile**: < 768px (Collapsed sidebar, stacked layout)

## 🚧 Roadmap

### v2.0 (Current) ✅
- [x] Backend API integration
- [x] URL-based authentication
- [x] Drag-and-drop in Kanban
- [x] Real-time updates
- [x] Error handling

### v2.1 (Next)
- [ ] Task creation modal
- [ ] Task editing modal
- [ ] File upload
- [ ] Recurring tasks management
- [ ] Advanced filtering

### v2.2 (Future)
- [ ] WebSocket real-time updates
- [ ] Dark mode
- [ ] PWA support
- [ ] Offline mode
- [ ] Push notifications

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Design inspiration from [Bordio.com](https://bordio.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)
- Drag-and-drop from [@dnd-kit](https://dndkit.com)

## 📞 Support

For questions or issues, please:
- Open an issue on GitHub
- Check the [API Integration Guide](./API_INTEGRATION_GUIDE.md)
- Check the [Documentation](./DOCUMENTATION.md)
- Check the [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## 🔗 Links

- **Backend**: [Leka Bot Backend](https://github.com/your-repo/leka-bot)
- **Design**: [Bordio.com](https://bordio.com)
- **Docs**: [Full Documentation](./DOCUMENTATION.md)

---

**Built with ❤️ using React, Tailwind CSS, and @dnd-kit**

**Version**: 2.0.0  
**Last Updated**: October 11, 2025  
**Status**: ✅ Production Ready with Backend Integration

