import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { showSuccess, showError, showWarning } from "../../lib/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Separator } from "../ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Calendar,
  Clock,
  User,
  Users,
  FileText,
  Paperclip,
  CheckCircle2,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

export default function TaskDetailModal({ onTaskUpdated, onTaskDeleted }) {
  const { groupId, userId, canModify, hasPermission } = useAuth();
  const {
    isTaskDetailOpen,
    closeTaskDetail,
    selectedTask,
    openEditTask,
    openSubmitTask,
    openConfirmDialog,
  } = useModal();
  const [loading, setLoading] = useState(false);

  if (!selectedTask) return null;

  const getPriorityColor = (priority) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      new: "bg-purple-100 text-purple-800",
      scheduled: "bg-blue-100 text-blue-800",
      "in-progress": "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      overdue: "bg-red-100 text-red-800",
    };
    return colors[status] || colors.new;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      general: "ทั่วไป",
      meeting: "การประชุม",
      report: "รายงาน",
      project: "โครงการ",
      maintenance: "บำรุงรักษา",
    };
    return labels[category] || category;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      low: "ต่ำ",
      medium: "ปานกลาง",
      high: "สูง",
      urgent: "ด่วน",
    };
    return labels[priority] || priority;
  };

  const getStatusLabel = (status) => {
    const labels = {
      new: "ใหม่",
      scheduled: "กำหนดเวลาแล้ว",
      "in-progress": "กำลังดำเนินการ",
      completed: "เสร็จสิ้น",
      overdue: "เกินกำหนด",
    };
    return labels[status] || status;
  };

  const handleEdit = () => {
    if (!canModify()) {
      showWarning("คุณไม่มีสิทธิ์แก้ไขงาน");
      return;
    }
    closeTaskDetail();
    openEditTask(selectedTask);
  };

  const handleDelete = () => {
    if (!canModify()) {
      showWarning("คุณไม่มีสิทธิ์ลบงาน");
      return;
    }

    openConfirmDialog({
      title: "ลบงาน",
      description:
        "คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้? การกระทำนี้ไม่สามารถย้อนกลับได้",
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      variant: "destructive",
      onConfirm: async () => {
        try {
          setLoading(true);
          const { deleteTask } = await import("../../services/api");
          await deleteTask(groupId, selectedTask.id);
          showSuccess("ลบงานสำเร็จ");
          if (onTaskDeleted) onTaskDeleted();
          closeTaskDetail();
        } catch (error) {
          console.error("Failed to delete task:", error);
          showError("ลบงานไม่สำเร็จ", error);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSubmit = () => {
    closeTaskDetail();
    openSubmitTask(selectedTask);
  };

  const handleApprove = async () => {
    if (!canModify()) {
      showWarning("คุณไม่มีสิทธิ์อนุมัติงาน");
      return;
    }

    try {
      setLoading(true);
      const { approveTask } = await import("../../services/api");
      await approveTask(groupId, selectedTask.id);
      showSuccess("อนุมัติงานสำเร็จ");
      if (onTaskUpdated) onTaskUpdated();
      closeTaskDetail();
    } catch (error) {
      console.error("Failed to approve task:", error);
      showError("อนุมัติงานไม่สำเร็จ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!canModify()) {
      showWarning("คุณไม่มีสิทธิ์เปิดงานใหม่");
      return;
    }

    try {
      setLoading(true);
      const { reopenTask } = await import("../../services/api");
      await reopenTask(groupId, selectedTask.id);
      showSuccess("เปิดงานใหม่สำเร็จ");
      if (onTaskUpdated) onTaskUpdated();
      closeTaskDetail();
    } catch (error) {
      console.error("Failed to reopen task:", error);
      showError("เปิดงานใหม่ไม่สำเร็จ", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (selectedTask.status === "completed") return 100;
    if (selectedTask.status === "in-progress") return 50;
    if (selectedTask.status === "scheduled") return 25;
    return 0;
  };

  const calculateTimeRemaining = () => {
    if (!selectedTask.dueDate) return null;
    const dueDate = new Date(selectedTask.dueDate);
    const now = new Date();

    if (dueDate < now) {
      return { text: "เกินกำหนดแล้ว", isOverdue: true };
    }

    return {
      text: `เหลืออีก ${formatDistanceToNow(dueDate, { locale: th })}`,
      isOverdue: false,
    };
  };

  const timeRemaining = calculateTimeRemaining();

  const handleOpenChange = (open) => {
    if (!open) {
      closeTaskDetail();
    }
  };

  return (
    <Dialog open={isTaskDetailOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>รายละเอียดงาน</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                disabled={!canModify()}
                title={!canModify() ? "ไม่มีสิทธิ์แก้ไขงาน" : "แก้ไขงาน"}
              >
                <Edit className="w-4 h-4 mr-1" />
                แก้ไข
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={loading || !canModify()}
                title={!canModify() ? "ไม่มีสิทธิ์ลบงาน" : "ลบงาน"}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                ลบ
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task ID & Title */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              รหัสงาน: {selectedTask.id}
            </p>
            <h2 className="text-2xl font-bold">{selectedTask.title}</h2>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={getStatusColor(selectedTask.status)}>
              {getStatusLabel(selectedTask.status)}
            </Badge>
            <Badge className={getPriorityColor(selectedTask.priority)}>
              {getPriorityLabel(selectedTask.priority)}
            </Badge>
            <Badge variant="outline">
              {getCategoryLabel(selectedTask.category)}
            </Badge>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">วันที่สร้าง</p>
              <p className="font-medium">
                {selectedTask.createdAt
                  ? format(new Date(selectedTask.createdAt), "PPP", {
                      locale: th,
                    })
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">แก้ไขล่าสุด</p>
              <p className="font-medium">
                {selectedTask.updatedAt
                  ? format(new Date(selectedTask.updatedAt), "PPP", {
                      locale: th,
                    })
                  : "-"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Description */}
          {selectedTask.description && (
            <>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold">รายละเอียด</h3>
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedTask.description}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Assigned Users */}
          {selectedTask.assignedUsers &&
            selectedTask.assignedUsers.length > 0 && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold">ผู้รับผิดชอบ</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {selectedTask.assignedUsers.map((user, i) => (
                      <div
                        key={user.lineUserId || i}
                        className="flex items-center gap-2"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.pictureUrl} />
                          <AvatarFallback>
                            {(user.displayName || user.name || "?").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {user.displayName || user.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

          {/* Reviewer */}
          {selectedTask.reviewer && (
            <>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold">ผู้ตรวจงาน</h3>
                </div>
                <p className="text-sm">{selectedTask.reviewer}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Due Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold">กำหนดเวลา</h3>
              </div>
              <p className="text-sm">
                {selectedTask.dueDate
                  ? format(new Date(selectedTask.dueDate), "PPP", {
                      locale: th,
                    })
                  : "-"}
                {selectedTask.dueTime && ` เวลา ${selectedTask.dueTime}`}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold">เวลาที่เหลือ</h3>
              </div>
              {timeRemaining && (
                <p
                  className={`text-sm ${timeRemaining.isOverdue ? "text-red-600 font-semibold" : ""}`}
                >
                  {timeRemaining.text}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">ความคืบหน้า</h3>
              <span className="text-sm text-muted-foreground">
                {calculateProgress()}%
              </span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>

          {/* Submission Info */}
          {selectedTask.submissionCount !== undefined && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">จำนวนครั้งที่ส่ง</p>
                  <p className="font-medium">
                    {selectedTask.submissionCount} ครั้ง
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">ส่งล่าสุด</p>
                  <p className="font-medium">
                    {selectedTask.lastSubmittedAt
                      ? format(new Date(selectedTask.lastSubmittedAt), "PPP", {
                          locale: th,
                        })
                      : "-"}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Files */}
          {selectedTask.files && selectedTask.files.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold">
                    ไฟล์แนบ ({selectedTask.files.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {selectedTask.files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm">{file.name}</span>
                      <Button variant="ghost" size="sm">
                        ดาวน์โหลด
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {selectedTask.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">หมายเหตุ</h3>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedTask.notes}
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="flex gap-2">
            {selectedTask.status !== "completed" && (
              <Button onClick={handleSubmit} disabled={loading}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                ส่งงาน
              </Button>
            )}
            {selectedTask.status === "submitted" && (
              <Button onClick={handleApprove} disabled={loading}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                อนุมัติงาน
              </Button>
            )}
            {selectedTask.status === "completed" && (
              <Button
                onClick={handleReopen}
                variant="outline"
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                เปิดใหม่
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
