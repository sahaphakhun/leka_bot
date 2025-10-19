import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon, Loader2, AlertCircle } from "lucide-react";
import { format, isValid } from "date-fns";
import { cn } from "../../lib/utils";
import { showSuccess, showError, showWarning } from "../../lib/toast";

const THAI_TIMEZONE = "Asia/Bangkok";

const recurrenceOptions = [
  {
    value: "weekly",
    label: "รายสัปดาห์",
    description: "สร้างงานใหม่เมื่อเลยกำหนดส่งของรอบล่าสุดทุกสัปดาห์",
    icon: "📅",
  },
  {
    value: "monthly",
    label: "รายเดือน",
    description: "สร้างงานใหม่เมื่อเลยกำหนดส่งของรอบล่าสุดทุกเดือน",
    icon: "📆",
  },
  {
    value: "quarterly",
    label: "รายไตรมาส",
    description: "สร้างงานใหม่เมื่อเลยกำหนดส่งของรอบล่าสุดทุก 3 เดือน",
    icon: "📈",
  },
];

const getMemberIdentifier = (member) =>
  member?.lineUserId || member?.id || member?.userId || null;

const parseExistingInitialDue = (raw) => {
  if (!raw) {
    return { date: null, time: "23:59" };
  }

  let dateObj = raw instanceof Date ? raw : new Date(raw);

  if (typeof raw === "object" && raw?.seconds) {
    dateObj = new Date(raw.seconds * 1000);
  }

  if (!isValid(dateObj)) {
    return { date: null, time: "23:59" };
  }

  return {
    date: dateObj,
    time: format(dateObj, "HH:mm"),
  };
};

const buildInitialDueIso = (date, time) => {
  if (!date || !isValid(date)) return null;
  const datePart = format(date, "yyyy-MM-dd");
  const timePart = time && time.trim() ? time : "23:59";
  return `${datePart}T${timePart}:00`;
};

const formatThaiDate = (date) => {
  if (!date || !isValid(date)) return "—";
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const defaultFormState = {
  title: "",
  description: "",
  recurrence: "weekly",
  initialDueDate: null,
  initialDueTime: "23:59",
  priority: "medium",
  requireAttachment: false,
  tags: "",
  assignedUsers: [],
  reviewer: "",
};

const extractAssigneeIds = (task) => {
  if (!task) return [];

  if (Array.isArray(task.assigneeLineUserIds)) {
    return task.assigneeLineUserIds.filter(Boolean);
  }

  if (Array.isArray(task.assignedUsers)) {
    return task.assignedUsers.map(getMemberIdentifier).filter(Boolean);
  }

  if (Array.isArray(task.assignees)) {
    return task.assignees.map(getMemberIdentifier).filter(Boolean);
  }

  return [];
};

export default function RecurringTaskModal({ onTaskCreated, onTaskUpdated }) {
  const { groupId, canModify, userId, currentUser } = useAuth();
  const { isRecurringTaskOpen, closeRecurringTask, selectedRecurring } =
    useModal();
  const [loading, setLoading] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState(defaultFormState);

  const isEditMode = Boolean(selectedRecurring?.id);
  const hasPermission = canModify();
  const formDisabled = !hasPermission || prefilling;

  const resetForm = () => {
    setFormData({ ...defaultFormState });
  };

  const populateFormFromRecurring = (data) => {
    if (!data) {
      resetForm();
      return;
    }

    const { date, time } = parseExistingInitialDue(
      data.initialDueTime ||
        data.firstDueDate ||
        data.startDate ||
        data.nextRun ||
        data.dueDate,
    );

    setFormData({
      title: data.title || data.name || "",
      description: data.description || "",
      recurrence: data.recurrence || data.frequency || "weekly",
      initialDueDate: date,
      initialDueTime: time || "23:59",
      priority: data.priority || "medium",
      requireAttachment: !!(
        data.requireAttachment ??
        data.requiresAttachment ??
        false
      ),
      tags: Array.isArray(data.tags)
        ? data.tags.join(", ")
        : typeof data.tags === "string"
          ? data.tags
          : "",
      assignedUsers: extractAssigneeIds(data),
      reviewer:
        data.reviewerLineUserId ||
        data.reviewer?.lineUserId ||
        data.reviewer ||
        "",
    });
  };

  const loadMembers = async () => {
    if (!groupId) return;
    try {
      const { getGroupMembers } = await import("../../services/api");
      const response = await getGroupMembers(groupId);
      const list =
        response?.members ||
        response?.data ||
        (Array.isArray(response) ? response : []);
      const normalized = Array.isArray(list)
        ? list.filter((member) => getMemberIdentifier(member))
        : [];
      setMembers(normalized);
      console.log("✅ Loaded members:", normalized.length);
    } catch (error) {
      console.error("❌ Failed to load members:", error);
      showWarning("ไม่สามารถโหลดรายชื่อสมาชิกได้");
    }
  };

  const prefillRecurringTask = async (task) => {
    setPrefilling(true);
    try {
      let detail = task;
      if (task?.id && groupId) {
        try {
          const { getRecurringTask } = await import("../../services/api");
          const response = await getRecurringTask(groupId, task.id);
          detail = response?.data || response || task;
        } catch (error) {
          console.warn("⚠️ Failed to fetch recurring detail:", error);
        }
      }
      populateFormFromRecurring(detail);
    } finally {
      setPrefilling(false);
    }
  };

  useEffect(() => {
    if (!isRecurringTaskOpen) return;
    loadMembers();
    if (selectedRecurring?.id) {
      prefillRecurringTask(selectedRecurring);
    } else {
      resetForm();
    }
  }, [isRecurringTaskOpen, selectedRecurring?.id, groupId]);

  const handleAssigneeToggle = (memberId) => {
    if (!memberId) return;
    setFormData((prev) => {
      const exists = prev.assignedUsers.includes(memberId);
      return {
        ...prev,
        assignedUsers: exists
          ? prev.assignedUsers.filter((id) => id !== memberId)
          : [...prev.assignedUsers, memberId],
      };
    });
  };

  const handleSelectAll = () => {
    if (!hasPermission) return;
    setFormData((prev) => ({
      ...prev,
      assignedUsers: members
        .map((member) => getMemberIdentifier(member))
        .filter(Boolean),
    }));
  };

  const handleClearAll = () => {
    setFormData((prev) => ({ ...prev, assignedUsers: [] }));
  };

  const recurrencePreview = useMemo(() => {
    const option = recurrenceOptions.find(
      (item) => item.value === formData.recurrence,
    );
    const recurrenceLabel = option ? option.label : "ที่เลือก";
    const dateText = formatThaiDate(formData.initialDueDate);
    const timeText = formData.initialDueTime || "—";
    const timeDisplay = timeText !== "—" ? ` ${timeText}` : "";
    return `เริ่มด้วยกำหนดส่งครั้งแรก: ${dateText}${timeDisplay} • เมื่อเลยกำหนดส่ง ระบบจะสร้างงานรอบถัดไปแบบ${recurrenceLabel}ทันที`;
  }, [formData.recurrence, formData.initialDueDate, formData.initialDueTime]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!hasPermission) {
      showWarning("คุณไม่มีสิทธิ์สร้าง/แก้ไขงานประจำ");
      return;
    }

    if (prefilling) {
      return;
    }

    const title = formData.title.trim();
    if (!title) {
      showWarning("กรุณากรอกชื่องาน");
      return;
    }

    if (formData.assignedUsers.length === 0) {
      showWarning("กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน");
      return;
    }

    const initialDueIso = buildInitialDueIso(
      formData.initialDueDate,
      formData.initialDueTime,
    );
    if (!initialDueIso) {
      showWarning("กรุณาเลือกวันครบกำหนดครั้งแรก");
      return;
    }

    setLoading(true);

    try {
      const { createRecurringTask, updateRecurringTask } = await import(
        "../../services/api"
      );

      const creatorId =
        userId || currentUser?.lineUserId || currentUser?.id || "unknown";

      const payload = {
        title,
        description: formData.description?.trim() || undefined,
        recurrence: formData.recurrence,
        priority: formData.priority || "medium",
        requireAttachment: !!formData.requireAttachment,
        initialDueTime: initialDueIso,
        timezone: THAI_TIMEZONE,
        assigneeLineUserIds: formData.assignedUsers,
        createdBy: creatorId,
        createdByLineUserId: creatorId,
      };

      if (formData.reviewer) {
        payload.reviewerLineUserId = formData.reviewer;
      }

      const tagsArray = (formData.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      if (tagsArray.length > 0) {
        payload.tags = tagsArray;
      }

      if (isEditMode && selectedRecurring?.id) {
        await updateRecurringTask(groupId, selectedRecurring.id, payload);
        showSuccess("อัปเดตงานประจำสำเร็จ");
        onTaskUpdated?.();
      } else {
        await createRecurringTask(groupId, payload);
        showSuccess("สร้างงานประจำสำเร็จ");
        onTaskCreated?.();
      }

      resetForm();
      closeRecurringTask();
    } catch (error) {
      console.error("❌ Failed to save recurring task:", error);
      showError(
        isEditMode ? "ไม่สามารถอัปเดตงานประจำได้" : "ไม่สามารถสร้างงานประจำได้",
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open) => {
    if (!open) {
      closeRecurringTask();
    }
  };

  return (
    <Dialog open={isRecurringTaskOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "แก้ไขงานประจำ" : "สร้างงานประจำใหม่"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "แก้ไขข้อมูลงานประจำแล้วบันทึกเพื่อใช้งานต่อ"
              : "ตั้งค่างานที่จะสร้างซ้ำเมื่อครบกำหนดส่งในครั้งต่อไป"}
          </DialogDescription>
        </DialogHeader>

        {!hasPermission && (
          <Alert variant="warning" className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-amber-800">
              ⚠️ <strong>โหมดดูอย่างเดียว</strong> - คุณไม่มีสิทธิ์
              {isEditMode ? "แก้ไข" : "สร้าง"}งานประจำ
              <br />
              กรุณาเข้าผ่าน LINE ส่วนตัว (ต้องการ userId) เพื่อ
              {isEditMode ? "แก้ไข" : "สร้าง"}งานประจำ
            </AlertDescription>
          </Alert>
        )}

        {prefilling && hasPermission && (
          <div className="flex items-center gap-2 rounded border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังโหลดข้อมูลงานประจำ...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">ชื่องาน *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="ระบุชื่องาน"
              required
              disabled={formDisabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">รายละเอียด</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder="ระบุรายละเอียด (ไม่บังคับ)"
              rows={3}
              disabled={formDisabled}
            />
          </div>

          <div className="space-y-2">
            <Label>ผู้รับผิดชอบ *</Label>
            <div className="rounded-lg border p-4 space-y-3">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  ไม่พบข้อมูลสมาชิกในกลุ่ม
                </p>
              ) : (
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {members.map((member) => {
                    const memberId = getMemberIdentifier(member);
                    if (!memberId) return null;
                    return (
                      <div
                        key={memberId}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`assignee-${memberId}`}
                          checked={formData.assignedUsers.includes(memberId)}
                          onCheckedChange={() => handleAssigneeToggle(memberId)}
                          disabled={formDisabled}
                        />
                        <label
                          htmlFor={`assignee-${memberId}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {member.displayName ||
                            member.realName ||
                            member.name ||
                            memberId}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2 border-t pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={formDisabled || members.length === 0}
                >
                  เลือกทั้งหมด
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={formDisabled || formData.assignedUsers.length === 0}
                >
                  ล้างทั้งหมด
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>ความสำคัญ</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, priority: value }))
                }
                disabled={formDisabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">ต่ำ</SelectItem>
                  <SelectItem value="medium">ปานกลาง</SelectItem>
                  <SelectItem value="high">สูง</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ผู้ตรวจงาน</Label>
              <Select
                value={formData.reviewer || "__none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    reviewer: value === "__none" ? "" : value,
                  }))
                }
                disabled={formDisabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="(ไม่ระบุ)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">(ไม่ระบุ)</SelectItem>
                  {members.map((member) => {
                    const memberId = getMemberIdentifier(member);
                    if (!memberId) return null;
                    return (
                      <SelectItem key={memberId} value={memberId}>
                        {member.displayName ||
                          member.realName ||
                          member.name ||
                          memberId}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tags">แท็ก (คั่นด้วยจุลภาค)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, tags: event.target.value }))
                }
                placeholder="เช่น: รายงาน, ประจำ"
                disabled={formDisabled}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="requireAttachment"
                checked={formData.requireAttachment}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    requireAttachment: Boolean(checked),
                  }))
                }
                disabled={formDisabled}
              />
              <Label
                htmlFor="requireAttachment"
                className="text-sm font-medium leading-none"
              >
                ต้องแนบไฟล์ทุกครั้ง
              </Label>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-lg font-medium text-gray-800">
              รอบการทำงาน
            </Label>
            <div className="grid gap-3">
              {recurrenceOptions.map((option) => {
                const active = formData.recurrence === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        recurrence: option.value,
                      }))
                    }
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition",
                      active
                        ? "border-blue-500 bg-blue-50"
                        : "border-border hover:bg-muted/60",
                      formDisabled && "cursor-not-allowed opacity-60",
                    )}
                    disabled={formDisabled}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{option.icon}</span>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>วันครบกำหนดครั้งแรก *</Label>
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.initialDueDate && "text-muted-foreground",
                    )}
                    disabled={formDisabled}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.initialDueDate
                      ? formatThaiDate(formData.initialDueDate)
                      : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.initialDueDate}
                    onSelect={(date) =>
                      setFormData((prev) => ({ ...prev, initialDueDate: date }))
                    }
                    initialFocus
                    disabled={formDisabled ? () => true : undefined}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="initialDueTime">เวลาครบกำหนด</Label>
              <Input
                id="initialDueTime"
                type="time"
                value={formData.initialDueTime}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    initialDueTime: event.target.value,
                  }))
                }
                disabled={formDisabled}
              />
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
            {recurrencePreview}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeRecurringTask}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading || formDisabled}>
              {loading
                ? "กำลังบันทึก..."
                : isEditMode
                  ? "บันทึก"
                  : "สร้างงานประจำ"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
