import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  File,
  FolderOpen,
  Info,
  RefreshCw,
  UploadCloud,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getUserProfile,
  getUserTasks,
  normalizeTasks,
} from "../../services/api";
import { showError, showSuccess, showWarning } from "../../lib/toast";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";

const STATUS_META = {
  pending: { label: "รอดำเนินการ", className: "bg-blue-100 text-blue-800" },
  scheduled: { label: "รอกำหนดส่ง", className: "bg-blue-100 text-blue-800" },
  in_progress: {
    label: "กำลังดำเนินการ",
    className: "bg-amber-100 text-amber-800",
  },
  "in-progress": {
    label: "กำลังดำเนินการ",
    className: "bg-amber-100 text-amber-800",
  },
  overdue: { label: "เกินกำหนด", className: "bg-red-100 text-red-800" },
  completed: { label: "เสร็จแล้ว", className: "bg-green-100 text-green-800" },
  approved: { label: "อนุมัติแล้ว", className: "bg-green-100 text-green-800" },
  submitted: { label: "ส่งแล้ว", className: "bg-green-100 text-green-800" },
  reviewed: { label: "ตรวจแล้ว", className: "bg-green-100 text-green-800" },
  cancelled: { label: "ยกเลิก", className: "bg-gray-100 text-gray-700" },
};

const PRIORITY_META = {
  low: { label: "ต่ำ", className: "text-green-600" },
  medium: { label: "ปานกลาง", className: "text-amber-600" },
  high: { label: "สูง", className: "text-red-600" },
  urgent: { label: "ด่วน", className: "text-red-600" },
};

const MAX_ATTACHMENTS = 5;

const formatDateTime = (value) => {
  if (!value) return "ไม่มีกำหนด";
  try {
    return format(new Date(value), "dd MMM yyyy HH:mm", { locale: th });
  } catch {
    return value;
  }
};

const getStatusMeta = (status) => {
  if (!status) return STATUS_META.pending;
  const meta = STATUS_META[status];
  if (meta) return meta;
  const normalized = status.replace("_", "-");
  return STATUS_META[normalized] || STATUS_META.pending;
};

const getPriorityMeta = (priority) => {
  if (!priority) return PRIORITY_META.medium;
  return PRIORITY_META[priority.toLowerCase()] || PRIORITY_META.medium;
};

const getGroupName = (task) => {
  return (
    task.raw?.group?.name ||
    task.group?.name ||
    task.groupName ||
    task.raw?.group?.lineGroupId ||
    task.groupId ||
    "ไม่ทราบกลุ่ม"
  );
};

const getAssigneeNames = (task) => {
  const names = [];
  if (Array.isArray(task.assignedUsers)) {
    task.assignedUsers.forEach((member) => {
      names.push(
        member.displayName ||
          member.realName ||
          member.name ||
          member.lineUserId,
      );
    });
  }
  if (task.assignee) {
    names.push(
      task.assignee.name ||
        task.assignee.displayName ||
        task.assignee.lineUserId,
    );
  }
  const unique = names.filter(Boolean);
  return unique.length > 0 ? Array.from(new Set(unique)).join(", ") : "ไม่ระบุ";
};

const submitTaskDashboard = async (taskId, userId, comment, files, groupId) => {
  const { submitTask } = await import("../../services/api");

  // Create FormData for submission
  const formData = new FormData();
  formData.append("comment", comment || "");
  files.forEach((file) => formData.append("attachments", file));

  // Use api.js submitTask function
  const result = await submitTask(groupId, taskId, formData, userId);
  return result?.data || result || null;
};

export default function SubmitMultipleView() {
  const { groupId, userId, currentUser } = useAuth();
  const readOnly = !userId;

  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState({
    current: 0,
    total: 0,
  });

  const selectedTasks = useMemo(
    () => tasks.filter((task) => selectedIds.has(task.id)),
    [tasks, selectedIds],
  );

  const selectionCount = selectedTasks.length;

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoadingProfile(true);
    try {
      const data = await getUserProfile(userId, groupId);
      setProfile(data || null);
    } catch (profileError) {
      console.warn("⚠️ ไม่สามารถโหลดข้อมูลผู้ใช้ได้", profileError);
    } finally {
      setLoadingProfile(false);
    }
  }, [userId, groupId]);

  const loadTasks = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      return;
    }

    setLoadingTasks(true);
    setError(null);

    try {
      const response = await getUserTasks(userId, {
        status: "pending,in_progress,overdue",
        excludeSubmitted: "true",
      });
      const normalized = normalizeTasks(response || []);
      setTasks(normalized);
    } catch (taskError) {
      console.error("❌ โหลดรายการงานไม่สำเร็จ", taskError);
      setError(taskError.message || "ไม่สามารถโหลดรายการงานได้");
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleToggleTask = (taskId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectionCount === tasks.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(tasks.map((task) => task.id)));
  };

  const handleFilesAdded = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    setFiles((prev) => {
      const spaceLeft = MAX_ATTACHMENTS - prev.length;
      if (spaceLeft <= 0) {
        showWarning(`เพิ่มไฟล์ได้สูงสุด ${MAX_ATTACHMENTS} ไฟล์`);
        return prev;
      }

      if (incoming.length > spaceLeft) {
        showWarning(`เพิ่มได้อีก ${spaceLeft} ไฟล์เท่านั้น`);
      }

      const allowed = incoming.slice(0, spaceLeft);
      return [...prev, ...allowed];
    });
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files) {
      handleFilesAdded(event.dataTransfer.files);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const openSubmitDialog = () => {
    if (readOnly) {
      showWarning("โหมดดูอย่างเดียวไม่สามารถส่งงานได้");
      return;
    }
    if (selectionCount === 0) {
      showWarning("กรุณาเลือกงานที่ต้องการส่งก่อน");
      return;
    }
    setIsSubmitOpen(true);
  };

  const closeSubmitDialog = () => {
    if (submitting) return;
    setIsSubmitOpen(false);
    setComment("");
    setFiles([]);
    setSubmitProgress({ current: 0, total: 0 });
  };

  const handleSubmitTasks = async () => {
    if (!userId) {
      showWarning("กรุณาเข้าสู่ระบบผ่านลิงก์ใน LINE ส่วนตัวก่อนส่งงาน");
      return;
    }

    setSubmitting(true);
    setSubmitProgress({ current: 0, total: selectionCount });

    const results = [];

    for (let i = 0; i < selectedTasks.length; i += 1) {
      const task = selectedTasks[i];
      try {
        await submitTaskDashboard(task.id, userId, comment, files, groupId);
        results.push({ taskId: task.id, success: true });
      } catch (taskError) {
        console.error(`❌ ส่งงาน ${task.id} ไม่สำเร็จ`, taskError);
        results.push({
          taskId: task.id,
          success: false,
          message: taskError.message || "ส่งงานไม่สำเร็จ",
        });
      }
      setSubmitProgress({ current: i + 1, total: selectionCount });
    }

    const successCount = results.filter((item) => item.success).length;
    const failItems = results.filter((item) => !item.success);

    if (successCount > 0) {
      showSuccess(`ส่งงานสำเร็จ ${successCount} รายการ`);
    }

    if (failItems.length > 0) {
      failItems.forEach((item) => {
        const task = tasks.find((t) => t.id === item.taskId);
        showError(
          `ส่งงาน "${task?.title || item.taskId}" ไม่สำเร็จ: ${item.message}`,
        );
      });
    }

    if (successCount > 0) {
      setSelectedIds(new Set());
      setComment("");
      setFiles([]);
      setIsSubmitOpen(false);
      await loadTasks();
    }

    setSubmitting(false);
  };

  const stats = useMemo(
    () => ({
      total: tasks.length,
      selected: selectionCount,
    }),
    [tasks.length, selectionCount],
  );

  return (
    <div className="p-3 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ส่งงาน</h1>
          <p className="text-muted-foreground">
            เลือกงานที่ต้องการส่งแล้วแนบไฟล์เพิ่มเติมได้ตามต้องการ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadTasks} disabled={loadingTasks}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {loadingTasks ? "กำลังโหลด..." : "รีเฟรช"}
          </Button>
          <Button
            onClick={openSubmitDialog}
            disabled={readOnly || selectionCount === 0}
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            {selectionCount > 0 ? `ส่งงาน ${selectionCount} รายการ` : "ส่งงาน"}
          </Button>
        </div>
      </div>

      {readOnly && (
        <Alert variant="warning">
          <AlertTitle>โหมดดูอย่างเดียว</AlertTitle>
          <AlertDescription>
            กรุณาเข้าสู่ระบบผ่านลิงก์ใน LINE
            ส่วนตัวเพื่อส่งงานและแนบไฟล์ได้ครบถ้วน
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>ไม่สามารถโหลดรายการงานได้</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Info className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">ข้อมูลผู้ใช้งาน</CardTitle>
              <CardDescription>
                {loadingProfile
                  ? "กำลังโหลดข้อมูล..."
                  : profile?.displayName ||
                    profile?.name ||
                    currentUser?.displayName ||
                    currentUser?.name ||
                    userId ||
                    "ไม่ทราบชื่อ"}
              </CardDescription>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>งานที่ต้องส่ง: {stats.total} รายการ</p>
            <p>เลือกแล้ว: {stats.selected} รายการ</p>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>รายการงานที่ต้องส่ง</CardTitle>
            <CardDescription>
              เลือกงานที่ต้องการส่ง จากนั้นกดปุ่ม "ส่งงาน"
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={tasks.length === 0 || readOnly || loadingTasks}
          >
            {selectionCount === tasks.length
              ? "ยกเลิกการเลือกทั้งหมด"
              : "เลือกทั้งหมด"}
          </Button>
        </CardHeader>
        <CardContent>
          {loadingTasks ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
              กำลังโหลดรายการงาน...
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-green-500" />
              ไม่มีงานที่ต้องส่งในขณะนี้
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const statusMeta = getStatusMeta(task.status);
                const priorityMeta = getPriorityMeta(task.priority);
                const selected = selectedIds.has(task.id);

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "rounded-lg border p-4 transition-colors",
                      selected
                        ? "border-blue-400 bg-blue-50"
                        : "border-border bg-white",
                    )}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => handleToggleTask(task.id)}
                          disabled={readOnly}
                          className="mt-1"
                        />
                        <div className="space-y-2">
                          <div className="flex flex-col gap-1">
                            <div className="font-semibold text-base text-foreground">
                              {task.title || "ไม่ทราบชื่องาน"}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge className={statusMeta.className}>
                                {statusMeta.label}
                              </Badge>
                              <span className={priorityMeta.className}>
                                • ความสำคัญ: {priorityMeta.label}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDateTime(task.dueTime || task.dueDate)}
                              </span>
                            </div>
                          </div>
                          <div className="grid gap-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-4 w-4" />
                              <span>{getGroupName(task)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{getAssigneeNames(task)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>สร้างเมื่อ: {formatDateTime(task.createdAt)}</div>
                        {task.completedAt && (
                          <div>
                            ส่งล่าสุด: {formatDateTime(task.completedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isSubmitOpen} onOpenChange={closeSubmitDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ยืนยันการส่งงาน</DialogTitle>
            <DialogDescription>
              ตรวจสอบสรุปงานและแนบไฟล์เพิ่มเติมก่อนยืนยันการส่ง
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-blue-900">
                  สรุปงานที่เลือก ({selectionCount} รายการ)
                </CardTitle>
                <CardDescription>
                  ระบบจะส่งงานให้ผู้ดูแลเมื่อคุณยืนยัน
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {selectedTasks.map((task) => (
                  <div
                    key={`summary-${task.id}`}
                    className="flex items-center gap-2 text-blue-900"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{task.title}</span>
                    <span className="text-blue-700">
                      ({getGroupName(task)})
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="submit-comment">หมายเหตุ (ไม่บังคับ)</Label>
              <Textarea
                id="submit-comment"
                placeholder="กรอกหมายเหตุเพิ่มเติมสำหรับผู้ตรวจ"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>ไฟล์แนบเพิ่มเติม (สูงสุด {MAX_ATTACHMENTS} ไฟล์)</Label>
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/40 px-6 py-8 text-center transition hover:border-blue-300"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <UploadCloud className="mb-2 h-8 w-8 text-blue-500" />
                <p className="text-sm text-muted-foreground">
                  ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์จากเครื่องของคุณ
                </p>
                <Input
                  type="file"
                  multiple
                  className="mt-3 w-auto cursor-pointer"
                  onChange={(event) => handleFilesAdded(event.target.files)}
                  accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,.rar,.7z,.mp4,.mov,.avi,.mp3,.wav"
                />
              </div>

              {files.length > 0 && (
                <div className="grid gap-2 rounded-lg border bg-white p-3">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between text-sm text-muted-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-blue-500" />
                        <span className="truncate max-w-[220px] sm:max-w-[320px]">
                          {file.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleRemoveFile(index)}
                        disabled={submitting}
                      >
                        ลบ
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {submitting && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>กำลังส่งงาน...</AlertTitle>
                <AlertDescription>
                  {`กำลังส่ง ${submitProgress.current} / ${submitProgress.total} รายการ`}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeSubmitDialog}
              disabled={submitting}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleSubmitTasks} disabled={submitting}>
              {submitting ? "กำลังส่ง..." : "ยืนยันการส่ง"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
