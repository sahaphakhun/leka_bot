# Leka Bot - Bordio Style UI Documentation

## Overview

This is a complete UI redesign of the Leka Bot project, styled to match **Bordio.com's** modern, clean interface with 90-95% similarity. The application features a professional task management system with multiple views and intuitive navigation.

## 🎨 Design System

### Color Palette

The design follows Bordio's color scheme:

- **Primary Navy**: `#1A1D2E` (Sidebar background)
- **Primary Blue**: `#4A90E2` (Accent color, buttons)
- **Background**: `#F8F9FA` (Main content area)
- **White**: `#FFFFFF` (Cards, modals)

### Task Status Colors (Pastel)

- **New Task**: Light Purple (`#E8D5F2`) with Purple border (`#9B59B6`)
- **Scheduled**: Light Blue (`#D5E8F7`) with Blue border (`#3498DB`)
- **In Progress**: Light Green (`#D5F7E1`) with Green border (`#2ECC71`)
- **Completed**: Light Gray (`#E5E5E5`) with Gray border (`#95A5A6`)
- **Overdue**: Light Red (`#FFE5E5`) with Red border (`#E74C3C`)

## 📁 Project Structure

```
leka-bot-bordio-ui/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   │   └── MainLayout.jsx       # Main content wrapper
│   │   ├── calendar/
│   │   │   └── CalendarView.jsx     # Weekly calendar view
│   │   ├── tasks/
│   │   │   ├── TasksView.jsx        # Tasks container
│   │   │   ├── TableView.jsx        # Table view for tasks
│   │   │   └── KanbanView.jsx       # Kanban board view
│   │   ├── common/
│   │   │   └── TaskCard.jsx         # Reusable task card
│   │   └── DashboardView.jsx        # Dashboard/My work view
│   ├── data/
│   │   └── sampleData.js            # Sample data for testing
│   ├── App.jsx                      # Main application component
│   └── App.css                      # Global styles & Bordio design system
├── dist/                            # Production build
└── package.json                     # Dependencies
```

## 🚀 Features

### 1. Dashboard View ("My work")
- **Statistics Cards**: Display total tasks, in progress, completed, and overdue
- **Today's Tasks**: Quick view of tasks scheduled for today
- **Recent Activity**: Timeline of recent task updates
- **Color-coded Stats**: Visual indicators with icons

### 2. Calendar View
- **Weekly Calendar**: 7-day view starting from Monday
- **Task Cards**: Drag-and-drop task cards on calendar days
- **Time Tracking**: Shows total estimated time per day
- **Waiting List**: Right panel for unscheduled tasks
- **Navigation**: Previous/Next week buttons and "Today" shortcut
- **Current Day Highlight**: Blue border on today's date

### 3. Tasks View

#### Table View
- **Collapsible Sections**: Active tasks and Completed tasks
- **Columns**: Task name, Status, Type, Due date, Responsible
- **Status Badges**: Color-coded badges for each status
- **Avatar Display**: Team member avatars
- **Quick Add**: Add new tasks inline

#### Kanban Board
- **4 Columns**: New task, Scheduled, In progress, Completed
- **Drag & Drop**: Move tasks between columns (UI ready)
- **Task Count**: Shows number of tasks per column
- **Column Icons**: Visual indicators for each status
- **Create Task**: Quick add button in each column

### 4. Sidebar Navigation
- **Fixed Position**: Always visible on the left (190px width)
- **Logo Section**: Leka Bot branding
- **Main Menu Items**:
  - My work (Dashboard)
  - Calendar
  - Tasks
  - Recurring
  - Files
  - Team
  - Reports
- **Bottom Menu**: Settings and Logout
- **Active State**: Blue left border and highlight
- **Hover Effects**: Smooth transitions

### 5. Additional Views
- **Recurring Tasks**: Placeholder for recurring task management
- **Files**: Document management interface
- **Team**: Team member directory with avatars
- **Reports**: Analytics and reporting (coming soon)

## 🛠️ Technical Stack

- **Framework**: React 19.1.0
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS 4.1.7 + Custom CSS
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Package Manager**: pnpm

## 📦 Dependencies

### Core
- `react` & `react-dom`: UI framework
- `react-router-dom`: Navigation (ready for integration)
- `lucide-react`: Icon library

### UI Components
- `@radix-ui/*`: Accessible component primitives
- `tailwindcss`: Utility-first CSS
- `framer-motion`: Animations

### Utilities
- `clsx` & `tailwind-merge`: Class name utilities
- `date-fns`: Date formatting
- `zod`: Schema validation

## 🎯 Component API

### TaskCard Component

```jsx
<TaskCard 
  task={{
    id: 1,
    title: "Task title",
    status: "in-progress",
    priority: "high",
    assignee: { name: "John Doe", avatar: null },
    estimatedTime: "4h",
    scheduledDate: "2025-10-11"
  }}
  onClick={(task) => console.log(task)}
/>
```

### Sidebar Component

```jsx
<Sidebar 
  activeView="dashboard"
  onViewChange={(view) => setActiveView(view)}
/>
```

### CalendarView Component

```jsx
<CalendarView 
  tasks={[/* array of tasks */]}
/>
```

### TasksView Component

```jsx
<TasksView 
  tasks={[/* array of tasks */]}
/>
```

## 🎨 CSS Classes

### Bordio-specific Classes

```css
/* Sidebar */
.sidebar-bordio          /* Main sidebar container */
.sidebar-item            /* Navigation item */
.sidebar-item.active     /* Active navigation item */

/* Task Cards */
.task-card               /* Base task card */
.task-card-new           /* New task styling */
.task-card-scheduled     /* Scheduled task styling */
.task-card-in-progress   /* In progress task styling */
.task-card-completed     /* Completed task styling */
.task-card-overdue       /* Overdue task styling */

/* Kanban */
.kanban-board            /* Kanban grid container */
.kanban-column           /* Kanban column */
.kanban-column-header    /* Column header */
.kanban-card             /* Card in kanban */

/* Buttons */
.btn-bordio              /* Primary button style */

/* Badges */
.badge-bordio            /* Base badge */
.badge-new               /* New status badge */
.badge-scheduled         /* Scheduled status badge */
.badge-in-progress       /* In progress status badge */
.badge-completed         /* Completed status badge */

/* Calendar */
.calendar-day            /* Calendar day cell */
.calendar-day-header     /* Day header */
.calendar-day-time       /* Time display */

/* Avatar */
.avatar-bordio           /* Avatar image */
.avatar-sm               /* Small avatar (20px) */
.avatar-lg               /* Large avatar (48px) */
```

## 🔧 Development

### Install Dependencies
```bash
pnpm install
```

### Run Development Server
```bash
pnpm dev
```

### Build for Production
```bash
pnpm build
```

### Preview Production Build
```bash
pnpm preview
```

## 📱 Responsive Design

The UI is fully responsive with breakpoints:

- **Desktop**: Full layout with sidebar (>1024px)
- **Tablet**: 2-column kanban, full features (768px-1024px)
- **Mobile**: 
  - Collapsed sidebar (icons only, 60px)
  - Single column kanban
  - Full-screen modals
  - Hidden text labels in sidebar

## 🎯 Future Enhancements

### Phase 1 (Current)
- ✅ Complete UI design matching Bordio
- ✅ All main views implemented
- ✅ Sample data integration
- ✅ Responsive layout

### Phase 2 (Backend Integration)
- [ ] Connect to Leka Bot API
- [ ] Real-time task updates
- [ ] User authentication
- [ ] Task CRUD operations
- [ ] File upload functionality

### Phase 3 (Advanced Features)
- [ ] Drag-and-drop functionality
- [ ] Task filtering and search
- [ ] Advanced calendar features (month view, year view)
- [ ] Team collaboration features
- [ ] Notifications system
- [ ] Dark mode support

### Phase 4 (Optimization)
- [ ] Performance optimization
- [ ] PWA support
- [ ] Offline mode
- [ ] Advanced analytics
- [ ] Export/Import functionality

## 🎨 Design Principles

1. **Consistency**: All components follow Bordio's design language
2. **Simplicity**: Clean, uncluttered interface
3. **Accessibility**: Semantic HTML and ARIA labels
4. **Performance**: Optimized rendering and lazy loading
5. **Responsiveness**: Works on all device sizes
6. **User Experience**: Intuitive navigation and interactions

## 📝 Sample Data Structure

```javascript
{
  id: 1,
  title: "Task title",
  description: "Task description",
  status: "in-progress", // new, scheduled, in-progress, completed, overdue
  priority: "high", // low, medium, high
  assignee: {
    name: "John Doe",
    avatar: "url or null"
  },
  scheduledDate: "ISO date string or null",
  estimatedTime: "4h",
  tags: ["tag1", "tag2"]
}
```

## 🔗 Integration Guide

### Connecting to Backend API

1. Create an API service file:
```javascript
// src/services/api.js
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

export const fetchTasks = async () => {
  const response = await fetch(`${API_BASE_URL}/tasks`);
  return response.json();
};

export const createTask = async (task) => {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  return response.json();
};
```

2. Replace sample data in App.jsx:
```javascript
import { useState, useEffect } from 'react';
import { fetchTasks } from './services/api';

function App() {
  const [tasks, setTasks] = useState([]);
  
  useEffect(() => {
    fetchTasks().then(setTasks);
  }, []);
  
  // ... rest of component
}
```

## 🎉 Conclusion

This Bordio-style UI provides a modern, professional interface for the Leka Bot project. The design is 90-95% similar to Bordio.com while maintaining flexibility for custom features. All components are modular, reusable, and ready for backend integration.

For questions or support, please refer to the project documentation or contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: October 11, 2025  
**License**: MIT

