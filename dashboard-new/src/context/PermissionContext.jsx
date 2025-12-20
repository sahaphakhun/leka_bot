import { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";

const PermissionContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within PermissionProvider");
  }
  return context;
};

export const PermissionProvider = ({ children }) => {
  const { userId, groupId, viewMode, isPersonalMode, isGroupMode, canModify } = useAuth();

  /**
   * ตรวจสอบว่า user เป็นผู้สร้างงานหรือไม่
   */
  const isTaskCreator = (task) => {
    if (!userId || !task) return false;

    // ตรวจจาก createdBy field (string)
    if (task.createdBy === userId) return true;

    // ตรวจจาก createdByUser object
    if (task.createdByUser?.lineUserId === userId) return true;
    if (task.createdByUser?.id === userId) return true;

    return false;
  };

  /**
   * ตรวจสอบว่า user เป็นผู้รับผิดชอบงานหรือไม่
   */
  const isTaskAssignee = (task) => {
    if (!userId || !task) return false;

    // ตรวจจาก assignedUsers array
    if (task.assignedUsers?.some(
      (u) => u.lineUserId === userId || u.id === userId
    )) {
      return true;
    }

    // ตรวจจาก assignee object (legacy)
    if (task.assignee?.lineUserId === userId) return true;
    if (task.assignee?.id === userId) return true;

    return false;
  };

  /**
   * ตรวจสอบว่า user เป็นผู้ตรวจงานหรือไม่
   */
  const isTaskReviewer = (task) => {
    if (!userId || !task) return false;

    // ตรวจจาก reviewer field (string - lineUserId)
    if (task.reviewer === userId) return true;

    // ตรวจจาก reviewerUser object
    if (task.reviewerUser?.lineUserId === userId) return true;
    if (task.reviewerUser?.id === userId) return true;

    return false;
  };

  /**
   * สามารถแก้ไขงานได้หรือไม่
   * - Personal Mode: เฉพาะงานที่ตัวเองสร้าง
   * - Group Mode: ไม่สามารถแก้ไข
   */
  const canEditTask = (task) => {
    // Group mode: ไม่สามารถแก้ไข
    if (isGroupMode()) return false;

    // Personal mode: ต้องมี userId และเป็นผู้สร้าง
    if (isPersonalMode()) {
      return canModify() && isTaskCreator(task);
    }

    return false;
  };

  /**
   * สามารถลบงานได้หรือไม่
   * - Personal Mode: เฉพาะงานที่ตัวเองสร้าง
   * - Group Mode: ไม่สามารถลบ
   */
  const canDeleteTask = (task) => {
    // Group mode: ไม่สามารถลบ
    if (isGroupMode()) return false;

    // Personal mode: ต้องมี userId และเป็นผู้สร้าง
    if (isPersonalMode()) {
      return canModify() && isTaskCreator(task);
    }

    return false;
  };

  /**
   * สามารถส่งงานได้หรือไม่
   * - Personal Mode: เฉพาะงานที่ตัวเองรับผิดชอบ
   * - Group Mode: ไม่สามารถส่ง
   */
  const canSubmitTask = (task) => {
    // Group mode: ไม่สามารถส่ง
    if (isGroupMode()) return false;

    // Personal mode: ต้องมี userId และเป็นผู้รับผิดชอบ
    if (isPersonalMode()) {
      return canModify() && isTaskAssignee(task);
    }

    return false;
  };

  /**
   * สามารถตรวจงานได้หรือไม่
   * - Personal Mode: เฉพาะงานที่ตัวเองเป็นผู้ตรวจ
   * - Group Mode: ไม่สามารถตรวจ
   */
  const canReviewTask = (task) => {
    // Group mode: ไม่สามารถตรวจ
    if (isGroupMode()) return false;

    // Personal mode: ต้องมี userId และเป็นผู้ตรวจ
    if (isPersonalMode()) {
      return canModify() && isTaskReviewer(task);
    }

    return false;
  };

  /**
   * สามารถอนุมัติงานได้หรือไม่ (alias ของ canReviewTask)
   */
  const canApproveTask = (task) => {
    return canReviewTask(task);
  };

  /**
   * สามารถเปิดงานใหม่ได้หรือไม่ (เฉพาะผู้สร้างหรือผู้ตรวจ)
   */
  const canReopenTask = (task) => {
    // Group mode: ไม่สามารถเปิดใหม่
    if (isGroupMode()) return false;

    // Personal mode: ต้องเป็นผู้สร้างหรือผู้ตรวจ
    if (isPersonalMode()) {
      return canModify() && (isTaskCreator(task) || isTaskReviewer(task));
    }

    return false;
  };

  /**
   * สามารถดูรายละเอียดงานได้หรือไม่
   * - ทั้ง Personal และ Group Mode สามารถดูได้
   */
  const canViewTask = () => {
    return !!groupId;
  };

  /**
   * สามารถสร้างงานใหม่ได้หรือไม่
   * - Personal Mode: สามารถสร้างได้
   * - Group Mode: ไม่สามารถสร้าง
   */
  const canCreateTask = () => {
    return canModify() && isPersonalMode();
  };

  /**
   * ตรวจสอบสิทธิ์หลายอย่างพร้อมกัน
   */
  const getTaskPermissions = (task) => {
    return {
      canView: canViewTask(task),
      canEdit: canEditTask(task),
      canDelete: canDeleteTask(task),
      canSubmit: canSubmitTask(task),
      canReview: canReviewTask(task),
      canApprove: canApproveTask(task),
      canReopen: canReopenTask(task),
      isCreator: isTaskCreator(task),
      isAssignee: isTaskAssignee(task),
      isReviewer: isTaskReviewer(task),
    };
  };

  /**
   * ดึงข้อมูลสิทธิ์ทั้งหมด
   */
  const getPermissionSummary = () => {
    return {
      viewMode,
      userId,
      groupId,
      isPersonalMode: isPersonalMode(),
      isGroupMode: isGroupMode(),
      canModify: canModify(),
      canCreateTask: canCreateTask(),
    };
  };

  const value = {
    // Task-level permissions
    canEditTask,
    canDeleteTask,
    canSubmitTask,
    canReviewTask,
    canApproveTask,
    canReopenTask,
    canViewTask,

    // App-level permissions
    canCreateTask,

    // Helper checks
    isTaskCreator,
    isTaskAssignee,
    isTaskReviewer,

    // Batch checks
    getTaskPermissions,
    getPermissionSummary,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export default PermissionContext;
