import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import {
  createTaskDeletionRequest,
  getTaskDeletionRequest,
  fetchTasks,
  normalizeTasks,
} from "../../services/api";
import { showError, showSuccess, showWarning } from "../../lib/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const parsePositiveInt = (value, fallback = 0) => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.floor(numeric);
  }

  const fallbackNumeric =
    typeof fallback === "number"
      ? fallback
      : typeof fallback === "string"
        ? Number(fallback)
        : Number.NaN;

  if (Number.isFinite(fallbackNumeric) && fallbackNumeric > 0) {
    return Math.floor(fallbackNumeric);
  }

  return 0;
};

const COMPLETED_STATUSES = new Set([
  "completed",
  "approved",
  "submitted",
  "reviewed",
  "cancelled",
  "auto_approved",
]);

const FILTER_OPTIONS = [
  { value: "incomplete", label: "งานที่ยังไม่เสร็จ" },
  { value: "all", label: "งานทั้งหมด" },
];

export default function DeleteTasksModal({ tasks = [], onDeletionCompleted }) {
  const { groupId, userId, hasPermission } = useAuth();
  const {
    isDeleteTasksOpen,
    closeDeleteTasks,
    deleteTasksContext,
    closeAllModals,
  } = useModal();

  const [filterMode, setFilterMode] = useState("incomplete");
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [availableTasks, setAvailableTasks] = useState(tasks);

  const canDelete = hasPermission?.("delete_task");

  useEffect(() => {
    if (Array.isArray(tasks) && tasks.length > 0) {
      setAvailableTasks(tasks);
    }
  }, [tasks]);

  const resetState = useCallback(() => {
    setFilterMode(
      deleteTasksContext?.filter === "all" ||
        deleteTasksContext?.filter === "incomplete"
        ? deleteTasksContext.filter
        : "incomplete",
    );
    setSelectedTaskIds(new Set());
    setSearchQuery("");
    setTasksLoading(false);
    setPendingRequest(null);
    setAvailableTasks(Array.isArray(tasks) ? tasks : []);
  }, [deleteTasksContext, tasks]);

  const sanitizePendingRequest = useCallback((raw) => {
    if (!raw || !Array.isArray(raw.tasks) || raw.tasks.length === 0) {
      return null;
    }

    const approvals = Array.isArray(raw.approvals)
      ? raw.approvals.filter((item) => item && item.lineUserId)
      : [];

    const totalMembers = Math.max(
      parsePositiveInt(raw.totalMembers, approvals.length || 1),
      approvals.length || 1,
      1,
    );

    const requiredBaseline = Math.max(
      Math.ceil(totalMembers / 3),
      approvals.length ? 1 : 1,
    );

    const requiredApprovals = Math.max(
      parsePositiveInt(raw.requiredApprovals, requiredBaseline),
      1,
    );

    return {
      ...raw,
      approvals,
      totalMembers,
      requiredApprovals,
    };
  }, []);

  const loadPendingRequest = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoadingStatus(true);
      const response = await getTaskDeletionRequest(groupId);
      const data = response?.data ?? response;
      const normalized = sanitizePendingRequest(data);
      setPendingRequest(normalized);
    } catch (error) {
      console.warn("⚠️ Failed to load pending deletion request:", error);
      setPendingRequest(null);
    } finally {
      setLoadingStatus(false);
    }
  }, [groupId, sanitizePendingRequest]);

  const loadTasksForDeletion = useCallback(async () => {
    if (!groupId) return;

    try {
      setTasksLoading(true);
      const response = await fetchTasks(groupId, { limit: 200, page: 1 });
      const normalizedList = normalizeTasks(response);
      if (normalizedList.length > 0) {
        setAvailableTasks(normalizedList);
      } else if (!Array.isArray(tasks) || tasks.length === 0) {
        setAvailableTasks([]);
      }
    } catch (error) {
      console.error("⚠️ Failed to load tasks for deletion:", error);
      if (Array.isArray(tasks)) {
        setAvailableTasks(tasks);
      }
    } finally {
      setTasksLoading(false);
    }
  }, [groupId, tasks]);

  useEffect(() => {
    if (isDeleteTasksOpen) {
      resetState();
      loadPendingRequest();
      loadTasksForDeletion();
    } else {
      resetState();
    }
  }, [
    isDeleteTasksOpen,
    resetState,
    loadPendingRequest,
    loadTasksForDeletion,
  ]);

  useEffect(() => {
    setSelectedTaskIds((prev) => {
      if (!prev.size) return prev;
      const allowed = new Set(availableTasks.map((task) => task.id));
      const next = new Set(
        Array.from(prev).filter((taskId) => allowed.has(taskId)),
      );
      return next.size === prev.size ? prev : next;
    });
  }, [availableTasks]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return availableTasks.filter((task) => {
      if (!task) return false;
      const status = (task.status || "").toLowerCase();
      if (filterMode === "incomplete" && COMPLETED_STATUSES.has(status)) {
        return false;
      }

      if (!query) return true;
      const title = (task.title || "").toLowerCase();
      const description = (task.description || "").toLowerCase();
      return title.includes(query) || description.includes(query);
    });
  }, [availableTasks, filterMode, searchQuery]);

  const selectedCount = selectedTaskIds.size;
  const allVisibleSelected =
    filteredTasks.length > 0 &&
    filteredTasks.every((task) => selectedTaskIds.has(task.id));

  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (allVisibleSelected) {
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        filteredTasks.forEach((task) => next.delete(task.id));
        return next;
      });
    } else {
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        filteredTasks.forEach((task) => next.add(task.id));
        return next;
      });
    }
  };

  const handleClose = () => {
    resetState();
    closeDeleteTasks();
  };

  const handleOpenChange = (open) => {
    if (!open) {
      handleClose();
    }
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();

    if (!canDelete) {
      showWarning(
        "โหมดดูอย่างเดียว",
        "กรุณาเข้าผ่านลิงก์ที่มี userId เพื่อใช้งานลบงาน",
      );
      return;
    }

    if (selectedTaskIds.size === 0) {
      showWarning("กรุณาเลือกงานอย่างน้อย 1 งาน");
      return;
    }

    if (!groupId || !userId) {
      showError("ไม่พบข้อมูลผู้ใช้หรือกลุ่ม กรุณาเปิดลิงก์จาก LINE อีกครั้ง");
      return;
    }

    try {
      setSubmitting(true);
      const taskIds = Array.from(selectedTaskIds);
      await createTaskDeletionRequest(
        groupId,
        taskIds,
        userId,
        filterMode === "incomplete" ? "incomplete" : "all",
      );

      showSuccess(
        "ส่งคำขอลบงานแล้ว",
        "ระบบจะแจ้งรายละเอียดในกลุ่มและรอการยืนยันจากสมาชิก",
      );

      if (typeof onDeletionCompleted === "function") {
        onDeletionCompleted();
      }

      closeAllModals();
    } catch (error) {
      console.error("Failed to create deletion request:", error);
      const message =
        error?.message ||
        error?.data?.error ||
        "ไม่สามารถส่งคำขอลบงานได้ กรุณาลองใหม่";
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderPendingRequest = () => {
    if (!pendingRequest) return null;

    const approvals = pendingRequest.approvals || [];
    const totalMembers = Math.max(
      parsePositiveInt(pendingRequest.totalMembers, approvals.length || 1),
      approvals.length || 1,
      1,
    );
    const required = Math.max(
      parsePositiveInt(
        pendingRequest.requiredApprovals,
        Math.ceil(totalMembers / 3),
      ),
      1,
    );
    const remaining = Math.max(required - approvals.length, 0);
    const taskCount = Array.isArray(pendingRequest.tasks)
      ? pendingRequest.tasks.length
      : 0;

    if (taskCount === 0) {
      return null;
    }

    return (
      <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="font-semibold">มีคำขอลบงานที่รอการยืนยัน</p>
            <p className="text-sm">
              ต้องการการยืนยันอีก {remaining} คนจาก {required} คน เพื่อดำเนินการลบงาน {taskCount} รายการ
            </p>
          </div>
        </div>
        {taskCount > 0 && (
          <div className="rounded-md bg-white/70 p-3 text-sm text-amber-900">
            <p className="mb-2 font-medium">
              รายการงาน ({taskCount})
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {pendingRequest.tasks.slice(0, 10).map((task) => (
                <li key={task.id}>{task.title}</li>
              ))}
              {taskCount > 10 && (
                <li className="italic">…และอีก {taskCount - 10} งาน</li>
              )}
            </ul>
          </div>
        )}
        <p className="text-sm">
          พิมพ์{" "}
          <span className="rounded bg-white px-2 py-0.5 font-medium text-amber-700">
            ยอมรับ
          </span>{" "}
          ในกลุ่ม LINE เพื่อยืนยัน เมื่อครบ {required} คนระบบจะลบงานให้อัตโนมัติ
        </p>
      </div>
    );
  };

  const renderTaskList = () => {
    if (pendingRequest) {
      return (
        <p className="text-sm text-muted-foreground">
          เมื่อคำขอเดิมเสร็จสิ้นแล้ว สามารถกลับมาเลือกลบงานใหม่ได้อีกครั้ง
        </p>
      );
    }

    if (tasksLoading) {
      return (
        <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-muted p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดรายการงาน...
        </div>
      );
    }

    if (!filteredTasks.length) {
      return (
        <p className="rounded-md border border-dashed border-muted p-4 text-center text-sm text-muted-foreground">
          {!availableTasks.length
            ? "ไม่พบงานในกลุ่ม กรุณาโหลดข้อมูลหรือเปลี่ยนตัวกรอง"
            : filterMode === "incomplete"
              ? "ไม่มีงานที่ยังไม่เสร็จในตอนนี้ ลองดูงานทั้งหมดได้เลย"
              : "ไม่พบงานในกลุ่มตามเงื่อนไขที่เลือก"}
        </p>
      );
    }

    return (
      <div className="max-h-72 overflow-y-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-12 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-tasks"
                    checked={allVisibleSelected}
                    onCheckedChange={handleToggleAll}
                  />
                </div>
              </th>
              <th className="px-3 py-2">ชื่องาน</th>
              <th className="px-3 py-2">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr
                key={task.id}
                className="border-t border-border text-sm hover:bg-muted/40"
              >
                <td className="px-3 py-2">
                  <Checkbox
                    checked={selectedTaskIds.has(task.id)}
                    onCheckedChange={() => toggleTaskSelection(task.id)}
                    aria-label={`เลือกงาน ${task.title}`}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{task.title}</div>
                  {task.description && (
                    <div className="text-xs text-muted-foreground">
                      {task.description.slice(0, 120)}
                      {task.description.length > 120 ? "…" : ""}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-muted px-2 py-1 text-xs capitalize text-muted-foreground">
                    {task.status || "unknown"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Dialog open={isDeleteTasksOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>ลบงานที่เลือก</DialogTitle>
          <DialogDescription>
            เลือกงานที่ต้องการลบ ระบบจะแจ้งรายละเอียดในกลุ่มและรอการยืนยันจากสมาชิกก่อนลบจริง
          </DialogDescription>
        </DialogHeader>

        {!canDelete && (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-4 text-orange-900">
            <p className="font-medium">โหมดดูอย่างเดียว</p>
            <p className="text-sm">
              กรุณาเปิดลิงก์จากแชทส่วนตัวกับบอท (มี userId) เพื่อยืนยันตัวตนก่อนลบงาน
            </p>
          </div>
        )}

        {loadingStatus ? (
          <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-muted p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังโหลดสถานะคำขอลบงาน...
          </div>
        ) : (
          <div className="space-y-4">
            {renderPendingRequest()}

            {!pendingRequest && (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-2 rounded-full bg-muted/70 p-1 text-sm">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setFilterMode(option.value);
                  setSelectedTaskIds(new Set());
                }}
                className={cn(
                  "rounded-full px-3 py-1 transition",
                  filterMode === option.value
                    ? "bg-background font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ค้นหาชื่องานหรือคำอธิบาย..."
              className="h-9 w-full sm:w-64"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleToggleAll}
              disabled={!filteredTasks.length}
            >
              {allVisibleSelected ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
            </Button>
          </div>
        </div>

        {renderTaskList()}

                <div className="flex flex-col gap-2 rounded-md border border-muted-foreground/20 bg-muted/40 p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>
                      เลือกแล้ว{" "}
                      <span className="font-semibold text-foreground">
                        {selectedCount}
                      </span>{" "}
                      งาน
                    </span>
                  </div>
                  <p>ต้องยืนยันอย่างน้อย 1 ใน 3 ของสมาชิกก่อนที่จะลบงานจริง</p>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="sm:w-auto"
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              !!pendingRequest ||
              !canDelete ||
              selectedTaskIds.size === 0
            }
            className="sm:w-auto"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            ยืนยันคำขอลบงาน
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
