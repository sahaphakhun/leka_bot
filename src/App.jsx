import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/layout/Sidebar'
import MainLayout from './components/layout/MainLayout'
import DashboardView from './components/DashboardView'
import CalendarView from './components/calendar/CalendarView'
import TasksView from './components/tasks/TasksView'
import { fetchTasks, normalizeTasks, calculateStats, getGroup, getGroupMembers } from './services/api'
import './App.css'

function AppContent() {
  const { userId, groupId, isAuthenticated, setGroup } = useAuth()
  const [activeView, setActiveView] = useState('dashboard')
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [groupInfo, setGroupInfo] = useState(null)

  // Load tasks from API
  useEffect(() => {
    const loadData = async () => {
      if (!groupId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Load group info
        try {
          const group = await getGroup(groupId)
          setGroupInfo(group)
          setGroup(group)
        } catch (err) {
          console.warn('Failed to load group info:', err)
        }

        // Load tasks
        const response = await fetchTasks(groupId)
        const normalizedTasks = normalizeTasks(response.tasks || response)
        setTasks(normalizedTasks)
        
        // Calculate stats
        const calculatedStats = calculateStats(normalizedTasks)
        setStats(calculatedStats)

      } catch (err) {
        console.error('Failed to load data:', err)
        setError(err.message)
        // Fall back to sample data on error
        loadSampleData()
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [groupId, setGroup])

  // Load sample data as fallback
  const loadSampleData = async () => {
    try {
      const { sampleTasks, sampleStats } = await import('./data/sampleData')
      setTasks(sampleTasks)
      setStats(sampleStats)
    } catch (err) {
      console.error('Failed to load sample data:', err)
    }
  }

  // Handle task update (for drag-and-drop)
  const handleTaskUpdate = async (taskId, updates) => {
    if (!groupId) return

    try {
      // Optimistically update UI
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      )

      // Update on server
      const { updateTask } = await import('./services/api')
      await updateTask(groupId, taskId, updates)

      // Recalculate stats
      const updatedTasks = tasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      )
      setStats(calculateStats(updatedTasks))

    } catch (err) {
      console.error('Failed to update task:', err)
      // Reload tasks on error
      const response = await fetchTasks(groupId)
      const normalizedTasks = normalizeTasks(response.tasks || response)
      setTasks(normalizedTasks)
    }
  }

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )
    }

    if (error && !isAuthenticated()) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md p-6">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">
              Please access this page through the LINE bot with proper userId and groupId parameters.
            </p>
            <p className="text-sm text-gray-500">
              Example: ?userId=U1234567890&groupId=C1234567890
            </p>
          </div>
        </div>
      )
    }

    switch (activeView) {
      case 'dashboard':
        return <DashboardView tasks={tasks} stats={stats} />
      case 'calendar':
        return <CalendarView tasks={tasks} onTaskUpdate={handleTaskUpdate} />
      case 'tasks':
        return <TasksView tasks={tasks} onTaskUpdate={handleTaskUpdate} />
      case 'recurring':
        return <RecurringView />
      case 'files':
        return <FilesView />
      case 'team':
        return <TeamView groupId={groupId} />
      case 'reports':
        return <ReportsView />
      default:
        return <DashboardView tasks={tasks} stats={stats} />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView}
        groupInfo={groupInfo}
        userId={userId}
      />
      <MainLayout>
        {renderView()}
      </MainLayout>
    </div>
  )
}

// Placeholder views for other sections
const RecurringView = () => (
  <div className="p-6">
    <div className="bg-white rounded-lg p-8 shadow-sm">
      <h1 className="text-2xl font-bold mb-4">Recurring Tasks</h1>
      <p className="text-muted-foreground mb-6">Manage your recurring tasks here.</p>
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">🔄</p>
        <p className="mt-2">No recurring tasks yet</p>
      </div>
    </div>
  </div>
)

const FilesView = () => (
  <div className="p-6">
    <div className="bg-white rounded-lg p-8 shadow-sm">
      <h1 className="text-2xl font-bold mb-4">Files</h1>
      <p className="text-muted-foreground mb-6">Access your files and documents here.</p>
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">📁</p>
        <p className="mt-2">No files uploaded yet</p>
      </div>
    </div>
  </div>
)

const TeamView = ({ groupId }) => {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMembers = async () => {
      if (!groupId) return

      try {
        const response = await getGroupMembers(groupId)
        setMembers(response.members || response)
      } catch (err) {
        console.error('Failed to load members:', err)
        // Sample data as fallback
        setMembers([
          { lineUserId: '1', displayName: 'John Doe', pictureUrl: null },
          { lineUserId: '2', displayName: 'Jane Smith', pictureUrl: null },
          { lineUserId: '3', displayName: 'Bob Johnson', pictureUrl: null },
          { lineUserId: '4', displayName: 'Alice Williams', pictureUrl: null },
          { lineUserId: '5', displayName: 'Charlie Brown', pictureUrl: null },
          { lineUserId: '6', displayName: 'David Lee', pictureUrl: null },
        ])
      } finally {
        setLoading(false)
      }
    }

    loadMembers()
  }, [groupId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg p-8 shadow-sm">
          <p>Loading team members...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Team</h1>
        <p className="text-muted-foreground mb-6">Manage your team members here.</p>
        <div className="grid grid-cols-3 gap-4 mt-6">
          {members.map((member, i) => (
            <div key={member.lineUserId || i} className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {member.pictureUrl ? (
                  <img src={member.pictureUrl} alt={member.displayName} className="w-full h-full rounded-full" />
                ) : (
                  member.displayName?.charAt(0) || '?'
                )}
              </div>
              <div>
                <p className="font-medium">{member.displayName || 'Unknown'}</p>
                <p className="text-sm text-gray-500">Team Member</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const ReportsView = () => (
  <div className="p-6">
    <div className="bg-white rounded-lg p-8 shadow-sm">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>
      <p className="text-muted-foreground mb-6">View your reports and analytics here.</p>
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">📊</p>
        <p className="mt-2">Reports coming soon</p>
      </div>
    </div>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App

