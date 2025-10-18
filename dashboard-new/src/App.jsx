import { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ModalProvider, useModal } from "./context/ModalContext";
import Sidebar from "./components/layout/Sidebar";
import MainLayout from "./components/layout/MainLayout";
import ReadOnlyBanner from "./components/common/ReadOnlyBanner";
import DashboardView from "./components/DashboardView";
import CalendarView from "./components/calendar/CalendarView";
import TasksView from "./components/tasks/TasksView";
import RecurringTasksView from "./components/recurring/RecurringTasksView";
import FilesView from "./components/files/FilesView";
import MembersView from "./components/members/MembersView";
import ReportsView from "./components/reports/ReportsView";
import ProfileView from "./components/profile/ProfileView";
import SubmitMultipleView from "./components/submit/SubmitMultipleView";
import LeaderboardView from "./components/leaderboard/LeaderboardView";
import AddTaskModal from "./components/modals/AddTaskModal";
import EditTaskModal from "./components/modals/EditTaskModal";
import TaskDetailModal from "./components/modals/TaskDetailModal";
import SubmitTaskModal from "./components/modals/SubmitTaskModal";
import FilePreviewModal from "./components/modals/FilePreviewModal";
import ConfirmDialog from "./components/modals/ConfirmDialog";
import RecurringTaskModal from "./components/recurring/RecurringTaskModal";
import RecurringHistoryModal from "./components/recurring/RecurringHistoryModal";
import InviteMemberModal from "./components/members/InviteMemberModal";
import MemberActionsModal from "./components/members/MemberActionsModal";
import {
  fetchTasks,
  normalizeTasks,
  calculateStats,
  getGroup,
  getGroupStats,
  getLeaderboard,
  testConnection,
} from "./services/api";
import "./App.css";

function AppContent() {
  const {
    userId,
    groupId,
    isAuthenticated,
    setGroup,
    viewMode,
    isPersonalMode,
    isGroupMode,
    canModify,
    getAuthError,
  } = useAuth();
  const {
    openTaskDetail,
    openAddTask,
    openEditTask,
    openSubmitTask,
    openRecurringTask,
  } = useModal();
  const [activeView, setActiveView] = useState("dashboard");
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [membersRefreshKey, setMembersRefreshKey] = useState(0);
  const [recurringRefreshKey, setRecurringRefreshKey] = useState(0);
  const [groupStats, setGroupStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [statsPeriod, setStatsPeriod] = useState("this_week");
  const [apiConnected, setApiConnected] = useState(null);
  const filesRefreshKey = 0;

  // Test API connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await testConnection();
        setApiConnected(connected);
        console.log(
          "🔌 API Connection:",
          connected ? "✅ Connected" : "❌ Disconnected",
        );
      } catch (err) {
        console.error("❌ Connection test failed:", err);
        setApiConnected(false);
      }
    };
    checkConnection();
  }, []);

  // Handle URL parameter actions (e.g., ?action=new-task)
  useEffect(() => {
    if (!isAuthenticated() || loading) return;

    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get("action");
    const taskId = urlParams.get("taskId");

    if (action) {
      console.log(
        "🎯 URL Action detected:",
        action,
        taskId ? `(taskId: ${taskId})` : "",
      );

      // Check permission for actions that require userId
      const requiresUserId = [
        "new-task",
        "create-task",
        "edit",
        "new-recurring-task",
      ];
      if (requiresUserId.includes(action) && !canModify()) {
        console.warn("⚠️ Action requires userId (Personal Mode)");
        // Toast warning will be shown by modal itself
      }

      // Handle different actions
      switch (action) {
        case "new-task":
        case "create-task":
          console.log("📝 Opening AddTask modal...");
          openAddTask();
          break;

        case "new-recurring-task":
          console.log("🔄 Opening RecurringTask modal...");
          openRecurringTask();
          break;

        case "view":
          if (taskId) {
            console.log("👁️ Opening TaskDetail modal for task:", taskId);
            // Find task and open detail modal
            const task = tasks.find((t) => t.id === taskId);
            if (task) {
              openTaskDetail(task);
            } else {
              console.warn("⚠️ Task not found:", taskId);
            }
          }
          break;

        case "edit":
          if (taskId) {
            console.log("✏️ Opening EditTask modal for task:", taskId);
            // Find task and open edit modal
            const task = tasks.find((t) => t.id === taskId);
            if (task) {
              openEditTask(task);
            } else {
              console.warn("⚠️ Task not found:", taskId);
            }
          }
          break;

        case "submit-task":
          console.log("📤 Opening SubmitTask modal...");
          openSubmitTask();
          break;

        default:
          console.log("❓ Unknown action:", action);
      }

      // Remove action parameter from URL to prevent reopening on refresh
      urlParams.delete("action");
      if (taskId) urlParams.delete("taskId");
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [
    isAuthenticated,
    loading,
    tasks,
    canModify,
    openAddTask,
    openEditTask,
    openTaskDetail,
    openSubmitTask,
    openRecurringTask,
  ]);

  const loadSampleData = useCallback(async () => {
    try {
      const { sampleTasks, sampleStats } = await import("./data/sampleData");
      setTasks(sampleTasks);
      setStats(sampleStats);
    } catch (err) {
      console.error("Failed to load sample data:", err);
    }
  }, []);

  const loadMiniLeaderboard = useCallback(async () => {
    if (!groupId) return;
    try {
      const response = await getLeaderboard(groupId, {
        period: statsPeriod === "last_week" ? "weekly" : statsPeriod,
        limit: 5,
      });
      const list = response?.data || response?.leaderboard || response;
      setLeaderboard(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("⚠️ Failed to load leaderboard:", err.message);
      setLeaderboard([]);
    }
  }, [groupId, statsPeriod]);

  const loadData = useCallback(async () => {
    console.log("=== Load Data Start ===");
    console.log("View Mode:", viewMode);
    console.log("User ID:", userId);
    console.log("Group ID:", groupId);
    console.log("Is Personal Mode:", isPersonalMode());
    console.log("Is Group Mode:", isGroupMode());
    console.log("Can Modify:", canModify());

    if (!groupId) {
      console.log("❌ No groupId, stopping");
      setLoading(false);
      setError("Missing groupId parameter");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      try {
        console.log("📥 Fetching group info...");
        const group = await getGroup(groupId);
        console.log("✅ Group loaded:", group);
        setGroupInfo(group);
        setGroup(group);
      } catch (err) {
        console.warn("⚠️ Failed to load group info:", err);
      }

      console.log("📥 Fetching tasks...");
      const response = await fetchTasks(groupId, { period: statsPeriod });
      console.log("✅ Tasks loaded:", response);

      let normalizedTasks = normalizeTasks(
        response.data || response.tasks || response,
      );

      if (isPersonalMode() && userId) {
        console.log("🔍 Filtering tasks for user:", userId);
        normalizedTasks = normalizedTasks.filter((task) => {
          const isAssigned = task.assignedUsers?.some(
            (u) => u.lineUserId === userId,
          );
          const isCreator = task.createdBy === userId;
          return isAssigned || isCreator;
        });
        console.log("✅ Filtered tasks:", normalizedTasks.length);
      }

      setTasks(normalizedTasks);

      const calculatedStats = calculateStats(normalizedTasks);
      console.log("📊 Stats:", calculatedStats);
      setStats(calculatedStats);

      try {
        console.log("📥 Fetching group stats...");
        const statsResponse = await getGroupStats(groupId, {
          period: statsPeriod,
        });
        console.log("✅ Group stats loaded:", statsResponse);
        setGroupStats(statsResponse?.data || statsResponse);
      } catch (statsError) {
        console.warn("⚠️ Failed to load group stats:", statsError);
        setGroupStats(null);
      }

      await loadMiniLeaderboard();
    } catch (err) {
      console.error("❌ Failed to load data:", err);
      console.error("Error stack:", err.stack);
      setError(err.message);
      console.log("⚠️ Loading sample data as fallback");
      loadSampleData();
      setGroupStats(null);
      setLeaderboard([]);
    } finally {
      console.log("✅ Setting loading to false");
      setLoading(false);
    }
  }, [
    groupId,
    userId,
    viewMode,
    isPersonalMode,
    isGroupMode,
    setGroup,
    loadSampleData,
    loadMiniLeaderboard,
    statsPeriod,
  ]);

  // Load tasks from API
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (groupId) {
      loadMiniLeaderboard();
    }
  }, [groupId, statsPeriod, loadMiniLeaderboard]);

  const handleTasksReload = useCallback(() => {
    loadData();
  }, [loadData]);

  const handleMembersRefresh = useCallback(() => {
    setMembersRefreshKey((prev) => prev + 1);
  }, []);

  const handleRecurringRefresh = useCallback(() => {
    setRecurringRefreshKey((prev) => prev + 1);
  }, []);

  // Handle task update (for drag-and-drop)
  const handleTaskUpdate = async (taskId, updates) => {
    if (!groupId) return;

    try {
      // Optimistically update UI
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task,
        ),
      );

      // Update on server
      const { updateTask } = await import("./services/api");
      await updateTask(groupId, taskId, updates);

      // Recalculate stats
      const updatedTasks = tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task,
      );
      setStats(calculateStats(updatedTasks));
    } catch (err) {
      console.error("Failed to update task:", err);
      // Reload tasks on error
      const response = await fetchTasks(groupId);
      const normalizedTasks = normalizeTasks(response.tasks || response);
      setTasks(normalizedTasks);
    }
  };

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังโหลด...</p>
            {viewMode && (
              <p className="text-sm text-gray-400 mt-2">
                โหมด: {viewMode === "personal" ? "👤 ส่วนตัว" : "👥 กลุ่ม"}
              </p>
            )}
            {apiConnected === false && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <p className="font-semibold">⚠️ ไม่สามารถเชื่อมต่อ API</p>
                <p className="text-xs mt-1">กรุณาตรวจสอบการตั้งค่า backend</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (!isAuthenticated()) {
      const authError = getAuthError();
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md p-6">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold mb-2">
              {authError?.title || "ต้องการการยืนยันตัวตน"}
            </h2>
            <p className="text-gray-600 mb-4">
              {authError?.message ||
                "กรุณาเข้าถึงหน้านี้ผ่าน LINE bot พร้อม parameters ที่ถูกต้อง"}
            </p>
            {authError?.details && (
              <p className="text-sm text-blue-600 mb-4">
                💡 {authError.details}
              </p>
            )}
            <div className="space-y-2 text-sm text-gray-500 mb-4">
              <p className="font-semibold">วิธีการเข้าใช้งาน:</p>
              <p>🏠 สำหรับ group dashboard: ?groupId=xxx</p>
              <p>👤 สำหรับ personal dashboard: ?userId=xxx&groupId=yyy</p>
            </div>
            <div className="mt-4 p-3 bg-gray-100 rounded text-left text-xs font-mono">
              <p className="font-bold mb-2">URL parameters ปัจจุบัน:</p>
              <p>userId: {userId || "❌ ไม่มี"}</p>
              <p>groupId: {groupId || "❌ ไม่มี"}</p>
              <p>viewMode: {viewMode || "❌ ไม่มี"}</p>
            </div>
            {apiConnected === false && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-700 font-semibold">
                  🔌 สถานะ API: ไม่เชื่อมต่อ
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Backend server อาจไม่ทำงาน
                </p>
              </div>
            )}
            <div className="mt-6">
              <a
                href="https://line.me/R/ti/p/@leka-bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                เปิดใน LINE
              </a>
            </div>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case "dashboard":
        return (
          <DashboardView
            tasks={tasks}
            stats={stats}
            leaderboard={leaderboard}
            groupStats={groupStats}
            onTaskSelect={openTaskDetail}
            onRefresh={loadData}
            onNavigate={setActiveView}
            onStatsPeriodChange={setStatsPeriod}
            statsPeriod={statsPeriod}
          />
        );
      case "calendar":
        return <CalendarView tasks={tasks} onTaskUpdate={handleTaskUpdate} />;
      case "tasks":
        return <TasksView tasks={tasks} onTaskUpdate={handleTaskUpdate} />;
      case "recurring":
        return <RecurringTasksView refreshKey={recurringRefreshKey} />;
      case "files":
        return <FilesView refreshKey={filesRefreshKey} />;
      case "team":
        return <MembersView refreshKey={membersRefreshKey} />;
      case "leaderboard":
        return <LeaderboardView />;
      case "reports":
        return <ReportsView />;
      case "profile":
        return <ProfileView />;
      case "submit":
        return <SubmitMultipleView />;
      default:
        return <DashboardView tasks={tasks} stats={stats} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Read-Only Banner */}
      <ReadOnlyBanner />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          groupInfo={groupInfo}
          userId={userId}
          viewMode={viewMode}
        />
        <MainLayout>
          {renderView()}
          <AddTaskModal onTaskCreated={handleTasksReload} />
          <EditTaskModal onTaskUpdated={handleTasksReload} />
          <TaskDetailModal
            onTaskUpdated={handleTasksReload}
            onTaskDeleted={handleTasksReload}
          />
          <SubmitTaskModal onTaskSubmitted={handleTasksReload} />
          <FilePreviewModal />
          <ConfirmDialog />
          <RecurringTaskModal
            onTaskCreated={handleRecurringRefresh}
            onTaskUpdated={handleRecurringRefresh}
          />
          <RecurringHistoryModal />
          <InviteMemberModal onInvited={handleMembersRefresh} />
          <MemberActionsModal onUpdated={handleMembersRefresh} />
        </MainLayout>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <AppContent />
      </ModalProvider>
    </AuthProvider>
  );
}

export default App;
