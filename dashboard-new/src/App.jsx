import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ModalProvider } from './context/ModalContext'
import Sidebar from './components/layout/Sidebar'
import MainLayout from './components/layout/MainLayout'
import DashboardView from './components/DashboardView'
import CalendarView from './components/calendar/CalendarView'
import TasksView from './components/tasks/TasksView'
import RecurringTasksView from './components/recurring/RecurringTasksView'
import FilesView from './components/files/FilesView'
import MembersView from './components/members/MembersView'
import ReportsView from './components/reports/ReportsView'
import ProfileView from './components/profile/ProfileView'
import SubmitMultipleView from './components/submit/SubmitMultipleView'
import { fetchTasks, normalizeTasks, calculateStats, getGroup, getGroupMembers } from './services/api'
import './App.css'

function AppContent() {
  const { userId, groupId, isAuthenticated, setGroup, viewMode, isPersonalMode, isGroupMode } = useAuth()
  const [activeView, setActiveView] = useState('dashboard')
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [groupInfo, setGroupInfo] = useState(null)

  // Load tasks from API
  useEffect(() => {
    const loadData = async () => {
      console.log('=== Load Data Start ===')
      console.log('View Mode:', viewMode)
      console.log('User ID:', userId)
      console.log('Group ID:', groupId)
      console.log('Is Personal Mode:', isPersonalMode())
      console.log('Is Group Mode:', isGroupMode())
      
      if (!groupId) {
        console.log('❌ No groupId, stopping')
        setLoading(false)
        setError('Missing groupId parameter')
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Load group info
        try {
          console.log('📥 Fetching group info...')
          const group = await getGroup(groupId)
          console.log('✅ Group loaded:', group)
          setGroupInfo(group)
          setGroup(group)
        } catch (err) {
          console.warn('⚠️ Failed to load group info:', err)
        }

        // Load tasks
        console.log('📥 Fetching tasks...')
        const response = await fetchTasks(groupId)
        console.log('✅ Tasks loaded:', response)
        
        // API returns {success: true, data: [...]} so we need response.data
        let normalizedTasks = normalizeTasks(response.data || response.tasks || response)
        
        // ถ้าเป็น Personal mode → filter เฉพาะงานของ user
        if (isPersonalMode() && userId) {
          console.log('🔍 Filtering tasks for user:', userId)
          normalizedTasks = normalizedTasks.filter(task => {
            // แสดงงานที่ user เป็นผู้รับผิดชอบหรือสร้าง
            const isAssigned = task.assignedUsers?.some(u => u.lineUserId === userId)
            const isCreator = task.createdBy === userId
            return isAssigned || isCreator
          })
          console.log('✅ Filtered tasks:', normalizedTasks.length)
        }
        
        setTasks(normalizedTasks)
        
        // Calculate stats
        const calculatedStats = calculateStats(normalizedTasks)
        console.log('📊 Stats:', calculatedStats)
        setStats(calculatedStats)

      } catch (err) {
        console.error('❌ Failed to load data:', err)
        console.error('Error stack:', err.stack)
        setError(err.message)
        // Fall back to sample data on error
        console.log('⚠️ Loading sample data as fallback')
        loadSampleData()
      } finally {
        console.log('✅ Setting loading to false')
        setLoading(false)
      }
    }

    loadData()
  }, [groupId, userId, viewMode]) // แก้ไข: เอา functions ออกจาก dependencies

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
            {viewMode && (
              <p className="text-sm text-gray-400 mt-2">
                Mode: {viewMode === 'personal' ? '👤 Personal' : '👥 Group'}
              </p>
            )}
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
              Please access this page through the LINE bot with proper parameters.
            </p>
            <p className="text-sm text-gray-500 mb-2">
              For group dashboard: ?groupId=xxx
            </p>
            <p className="text-sm text-gray-500">
              For personal dashboard: ?userId=xxx&groupId=yyy
            </p>
            <div className="mt-4 p-3 bg-gray-100 rounded text-left text-xs">
              <p><strong>Current URL params:</strong></p>
              <p>userId: {userId || 'none'}</p>
              <p>groupId: {groupId || 'none'}</p>
              <p>viewMode: {viewMode || 'none'}</p>
            </div>
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
        return <RecurringTasksView />
      case 'files':
        return <FilesView />
      case 'team':
        return <MembersView />
      case 'reports':
        return <ReportsView />
      case 'profile':
        return <ProfileView />
      case 'submit':
        return <SubmitMultipleView />
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
        viewMode={viewMode}
      />
      <MainLayout>
        {renderView()}
      </MainLayout>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <AppContent />
      </ModalProvider>
    </AuthProvider>
  )
}

export default App

