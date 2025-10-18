import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(null); // 'personal' | 'group'
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Get URL parameters
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      userId:
        params.get("userId") ||
        params.get("userid") ||
        params.get("lineUserId"),
      groupId: params.get("groupId") || params.get("groupid"),
      taskId: params.get("taskId") || params.get("taskid"),
      action: params.get("action"),
      view: params.get("view"),
    };
  };

  // Detect view mode from URL
  const detectViewMode = (params) => {
    // ถ้ามี userId → Personal mode (เปิดจากแชทส่วนตัว)
    if (params.userId) {
      console.log("🔐 Personal Mode: userId =", params.userId);
      return "personal";
    }

    // ถ้ามีแค่ groupId → Group mode (เปิดจากแชทกลุ่ม)
    if (params.groupId) {
      console.log("👥 Group Mode: groupId =", params.groupId);
      return "group";
    }

    // ถ้าไม่มีทั้งสองอย่าง → ลองโหลดจาก localStorage
    const storedGroupId = localStorage.getItem("leka_groupId");
    const storedUserId = localStorage.getItem("leka_userId");

    if (storedUserId && storedGroupId) {
      console.log("💾 Restored Personal Mode from localStorage");
      return "personal";
    }

    if (storedGroupId) {
      console.log("💾 Restored Group Mode from localStorage");
      return "group";
    }

    console.warn("⚠️ No auth parameters found");
    return null;
  };

  // Initialize auth from URL
  useEffect(() => {
    console.log("🚀 Initializing AuthContext...");
    const params = getUrlParams();
    console.log("🔍 URL Parameters:", params);

    // Detect mode
    const mode = detectViewMode(params);
    setViewMode(mode);

    let finalUserId = null;
    let finalGroupId = null;

    // Set userId (only in personal mode)
    if (params.userId) {
      finalUserId = params.userId;
      setUserId(params.userId);
      localStorage.setItem("leka_userId", params.userId);
      console.log("✅ User ID set:", params.userId);
    } else if (mode === "personal") {
      // Try to restore from localStorage
      const storedUserId = localStorage.getItem("leka_userId");
      if (storedUserId) {
        finalUserId = storedUserId;
        setUserId(storedUserId);
        console.log("💾 User ID restored from localStorage:", storedUserId);
      }
    }

    // Set groupId (required in both modes)
    if (params.groupId) {
      finalGroupId = params.groupId;
      setGroupId(params.groupId);
      localStorage.setItem("leka_groupId", params.groupId);
      console.log("✅ Group ID set:", params.groupId);
    } else {
      // Try to restore from localStorage
      const storedGroupId = localStorage.getItem("leka_groupId");
      if (storedGroupId) {
        finalGroupId = storedGroupId;
        setGroupId(storedGroupId);
        console.log("💾 Group ID restored from localStorage:", storedGroupId);
      }
    }

    // Determine if read-only mode
    // Read-only: ไม่มี userId ใน Personal mode หรือเข้าผ่าน Group mode แต่ต้องการสิทธิ์พิเศษ
    const readOnly = mode === "group" || !finalUserId;
    setIsReadOnly(readOnly);

    if (readOnly && mode !== "group") {
      console.warn("⚠️ Read-only mode: No userId provided");
    }

    console.log("📍 Auth Status:", {
      userId: finalUserId,
      groupId: finalGroupId,
      viewMode: mode,
      isReadOnly: readOnly,
    });

    setLoading(false);
  }, []);

  // Update URL when userId or groupId changes
  const updateUrl = (newUserId, newGroupId) => {
    const params = new URLSearchParams(window.location.search);

    if (newUserId) {
      params.set("userId", newUserId);
      setUserId(newUserId);
      localStorage.setItem("leka_userId", newUserId);
    }

    if (newGroupId) {
      params.set("groupId", newGroupId);
      setGroupId(newGroupId);
      localStorage.setItem("leka_groupId", newGroupId);
    }

    // Update URL without reloading
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  };

  // Set user info
  const setUser = (user) => {
    setCurrentUser(user);
    if (user?.lineUserId && !userId) {
      updateUrl(user.lineUserId, groupId);
    }
  };

  // Set group info
  const setGroup = (group) => {
    setCurrentGroup(group);
    if (group?.lineGroupId && !groupId) {
      const newGroupId = group.lineGroupId || group.id;
      updateUrl(userId, newGroupId);
    }
  };

  // Logout
  const logout = () => {
    setUserId(null);
    setGroupId(null);
    setCurrentUser(null);
    setCurrentGroup(null);
    setViewMode(null);
    setIsReadOnly(true);
    localStorage.removeItem("leka_userId");
    localStorage.removeItem("leka_groupId");

    // Clear URL params
    window.history.replaceState({}, "", window.location.pathname);
    console.log("👋 Logged out");
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    // ต้องมี groupId เสมอ
    if (!groupId) {
      return false;
    }

    // Personal mode: ต้องมีทั้ง userId + groupId
    if (viewMode === "personal") {
      return !!(userId && groupId);
    }

    // Group mode: มีแค่ groupId ก็พอ (แต่เป็น read-only)
    if (viewMode === "group") {
      return !!groupId;
    }

    // Fallback: ถ้ามี groupId ก็ถือว่า authenticated
    return !!groupId;
  };

  // Check if in personal mode
  const isPersonalMode = () => {
    return viewMode === "personal" && !!userId;
  };

  // Check if in group mode (read-only)
  const isGroupMode = () => {
    return viewMode === "group" || (!userId && !!groupId);
  };

  // Check if user can create/edit/delete (ต้องมี userId)
  const canModify = () => {
    return !!userId && !!groupId;
  };

  // Check if user can only view
  const canOnlyView = () => {
    return !!groupId && !userId;
  };

  // Check if user has permission for specific action
  const hasPermission = (action) => {
    // Actions ที่ต้องการ userId
    const requiresUserId = [
      "create_task",
      "edit_task",
      "delete_task",
      "create_recurring",
      "edit_recurring",
      "delete_recurring",
      "invite_member",
      "remove_member",
      "change_role",
      "upload_file",
      "delete_file",
    ];

    // Actions ที่อนุญาตให้ทำได้ในโหมด group (ไม่ต้องมี userId)
    const allowedInGroupMode = [
      "view_dashboard",
      "view_tasks",
      "view_calendar",
      "view_files",
      "view_members",
      "view_leaderboard",
      "view_reports",
      "submit_task", // อนุญาตให้ส่งงานได้เสมอ (เหมือน dashboard เก่า)
    ];

    // ตรวจสอบว่า authenticated หรือไม่
    if (!isAuthenticated()) {
      return false;
    }

    // ถ้า action อนุญาตใน group mode
    if (allowedInGroupMode.includes(action)) {
      return true;
    }

    // ถ้า action ต้องการ userId
    if (requiresUserId.includes(action)) {
      return canModify();
    }

    // Default: อนุญาต
    return true;
  };

  // Get auth error message
  const getAuthError = () => {
    if (!groupId) {
      return {
        title: "ไม่พบ Group ID",
        message: "กรุณาเข้าถึงหน้านี้ผ่าน LINE bot",
        details: "URL ต้องมี ?groupId=xxx",
      };
    }

    if (isReadOnly && !isGroupMode()) {
      return {
        title: "โหมดดูอย่างเดียว",
        message: "คุณสามารถดูข้อมูลได้ แต่ไม่สามารถแก้ไขได้",
        details: "เข้าผ่านลิงก์ใน LINE ส่วนตัวเพื่อใช้งานเต็มรูปแบบ",
      };
    }

    return null;
  };

  const value = {
    // States
    userId,
    groupId,
    currentUser,
    currentGroup,
    loading,
    viewMode,
    isReadOnly,

    // Setters
    setUser,
    setGroup,
    updateUrl,
    logout,

    // Auth checks
    isAuthenticated,
    isPersonalMode,
    isGroupMode,
    canModify,
    canOnlyView,
    hasPermission,
    getAuthError,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
