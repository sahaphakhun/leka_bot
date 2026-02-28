import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { showError, showSuccess, showWarning } from "../../lib/toast";
import { cn } from "../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  CalendarDays,
  Check,
  ChevronsUpDown,
  Clock,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { uploadFiles } from "../../services/api";

const THAI_TIMEZONE = "Asia/Bangkok";

const TASK_ASSIGNEE_ID_PATTERN =
  /^(?:[U][a-zA-Z0-9]+|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

const isTaskAssigneeId = (value) => TASK_ASSIGNEE_ID_PATTERN.test((value || "").trim());
const extractValidationMessage = (error) =>
  error?.data?.error ||
  error?.data?.message ||
  error?.message ||
  "ไม่สามารถสร้างงานได้";

const toYYYYMMDD = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatThaiDate = (yyyyMmDd) => {
  if (!yyyyMmDd) return "—";
  try {
    const [y, m, d] = yyyyMmDd.split("-").map((v) => parseInt(v, 10));
    const date = new Date(y, (m || 1) - 1, d || 1);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return yyyyMmDd;
  }
};

const parseTags = (raw) => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
};

const uniqueKeepOrder = (items) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
};

const buildDueTimeIso = (dueDate, dueTime) => {
  if (!dueDate) return null;
  const timePart = dueTime && dueTime.trim() ? dueTime.trim() : "23:59";
  return `${dueDate}T${timePart}:00.000+07:00`;
};

const buildInitialDueIso = (dueDate, dueTime) => {
  if (!dueDate) return null;
  const timePart = dueTime && dueTime.trim() ? dueTime.trim() : "23:59";
  return `${dueDate}T${timePart}:00`;
};

const formatFileSize = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

const normalizeMembers = (membersList) => {
  const normalized = [];
  const seen = new Set();

  for (const member of membersList || []) {
    const lineId = member?.lineUserId || member?.userId || member?.id;
    if (!lineId || seen.has(lineId)) continue;
    seen.add(lineId);

    normalized.push({
      id: lineId,
      name:
        member?.displayName ||
        member?.realName ||
        member?.name ||
        member?.userId ||
        lineId,
      pictureUrl: member?.pictureUrl,
      selectable: isTaskAssigneeId(lineId),
    });
  }

  return normalized;
};

const CATEGORY_OPTIONS = [
  { value: "general", label: "ทั่วไป" },
  { value: "meeting", label: "การประชุม" },
  { value: "report", label: "รายงาน" },
  { value: "project", label: "โครงการ" },
  { value: "maintenance", label: "บำรุงรักษา" },
  { value: "other", label: "อื่นๆ" },
];

const PRIORITY_NORMAL = [
  { value: "low", label: "ต่ำ", className: "border-blue-200 bg-blue-50 text-blue-700" },
  { value: "medium", label: "ปานกลาง", className: "border-amber-200 bg-amber-50 text-amber-800" },
  { value: "high", label: "สูง", className: "border-orange-200 bg-orange-50 text-orange-800" },
  { value: "urgent", label: "ด่วน", className: "border-red-200 bg-red-50 text-red-700" },
];

const PRIORITY_RECURRING = [
  { value: "low", label: "ต่ำ", className: "border-blue-200 bg-blue-50 text-blue-700" },
  { value: "medium", label: "ปานกลาง", className: "border-amber-200 bg-amber-50 text-amber-800" },
  { value: "high", label: "สูง", className: "border-orange-200 bg-orange-50 text-orange-800" },
];

const RECURRENCE_OPTIONS = [
  {
    value: "weekly",
    title: "รายสัปดาห์",
    description: "สร้างงานใหม่เมื่อเลยกำหนดส่งของรอบล่าสุด • ทุกสัปดาห์",
    icon: "📅",
  },
  {
    value: "monthly",
    title: "รายเดือน",
    description: "สร้างงานใหม่เมื่อเลยกำหนดส่งของรอบล่าสุด • ทุกเดือน",
    icon: "📆",
  },
  {
    value: "quarterly",
    title: "รายไตรมาส",
    description: "สร้างงานใหม่เมื่อเลยกำหนดส่งของรอบล่าสุด • ทุก 3 เดือน",
    icon: "📈",
  },
];

const makeEmptyNormalForm = () => ({
  title: "",
  description: "",
  dueDate: "",
  dueTime: "23:59",
  priority: "medium",
  category: "general",
  assigneeIds: [],
  tagsText: "",
  reviewerUserId: "",
  notes: "",
  files: [],
});

const makeEmptyRecurringForm = () => ({
  title: "",
  description: "",
  assigneeLineUserIds: [],
  reviewerLineUserId: "",
  priority: "medium",
  tagsText: "",
  requireAttachment: false,
  recurrence: "weekly",
  initialDueDate: "",
  initialDueTime: "23:59",
});

function SegmentedTabs({ value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-2 rounded-xl border bg-muted/30 p-1">
      <button
        type="button"
        onClick={() => onChange("normal")}
        disabled={disabled}
        className={cn(
          "h-10 rounded-lg text-sm font-semibold transition-colors",
          value === "normal"
            ? "bg-background shadow-sm"
            : "text-muted-foreground hover:bg-background/60",
        )}
      >
        งานครั้งเดียว
      </button>
      <button
        type="button"
        onClick={() => onChange("recurring")}
        disabled={disabled}
        className={cn(
          "h-10 rounded-lg text-sm font-semibold transition-colors",
          value === "recurring"
            ? "bg-background shadow-sm"
            : "text-muted-foreground hover:bg-background/60",
        )}
      >
        งานประจำ
      </button>
    </div>
  );
}

function MemberPicker({
  title,
  members,
  selectedIds,
  onChange,
  query,
  onQueryChange,
  disabled,
  errorsText,
}) {
  const memberNameById = useMemo(() => {
    const map = new Map();
    for (const m of members) {
      map.set(m.id, m.name);
    }
    return map;
  }, [members]);

  const selectableMembers = useMemo(
    () => members.filter((m) => m.selectable),
    [members],
  );

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    const base = selectableMembers;
    if (!q) return base;
    return base.filter((m) => (m.name || "").toLowerCase().includes(q));
  }, [query, selectableMembers]);

  const isAllSelected =
    selectableMembers.length > 0 &&
    selectedIds.length === selectableMembers.length;

  const toggleAll = () => {
    if (disabled) return;
    onChange(isAllSelected ? [] : selectableMembers.map((m) => m.id));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const selectVisible = () => {
    if (disabled) return;
    onChange(uniqueKeepOrder([...selectedIds, ...filtered.map((m) => m.id)]));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold">
            {title} <span className="text-destructive">*</span>
          </Label>
        </div>
        <span className="text-xs text-muted-foreground">
          เลือกแล้ว {selectedIds.length} คน
        </span>
      </div>

      {errorsText && <p className="text-xs text-destructive">{errorsText}</p>}

      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-3 border-b bg-muted/30 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="ค้นหาสมาชิก..."
              className="pl-9 h-10"
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={toggleAll}
              disabled={disabled || selectableMembers.length === 0}
            >
              {isAllSelected ? "ยกเลิกทีมทั้งหมด" : "ทีมทั้งหมด"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={clearAll}
              disabled={disabled || selectedIds.length === 0}
            >
              ล้างทั้งหมด
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={selectVisible}
              disabled={disabled || filtered.length === 0}
              className="col-span-2"
            >
              เลือกทั้งหมด (ที่ค้นเจอ)
            </Button>
          </div>
        </div>

        <div className="max-h-[40vh] overflow-y-auto p-2">
          {selectableMembers.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              ไม่พบรายชื่อสมาชิกสำหรับเลือก
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              ไม่พบสมาชิกที่ตรงกับคำค้นหา
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((member) => {
                const checked = selectedIds.includes(member.id);
                const nextIds = checked
                  ? selectedIds.filter((id) => id !== member.id)
                  : [...selectedIds, member.id];

                return (
                  <div
                    key={member.id}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-pressed={checked}
                    onClick={() => {
                      if (disabled) return;
                      onChange(nextIds);
                    }}
                    onKeyDown={(e) => {
                      if (disabled) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onChange(nextIds);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                      checked ? "bg-primary/10" : "hover:bg-accent/40",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <Checkbox checked={checked} className="pointer-events-none" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {member.name}
                      </p>
                    </div>
                    {checked && <Check className="w-4 h-4 text-primary" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {selectedIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่ได้เลือกผู้รับผิดชอบ</p>
        ) : (
          selectedIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange(selectedIds.filter((x) => x !== id))}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-sm hover:bg-accent/40"
              title="แตะเพื่อลบออก"
            >
              <span className="truncate max-w-[10rem]">
                {memberNameById.get(id) || id}
              </span>
              <X className="w-3.5 h-3.5 opacity-70" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function AddTaskModal({
  onTaskCreated,
  onRecurringTaskCreated,
}) {
  const { groupId, userId, canModify } = useAuth();
  const { isAddTaskOpen, closeAddTask, addTaskDefaultTab } = useModal();

  const canCreate = canModify?.() && !!groupId && !!userId;

  const titleRef = useRef(null);
  const fileInputRef = useRef(null);
  const openSessionRef = useRef(false);

  const [activeTab, setActiveTab] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({ normal: {}, recurring: {} });

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [memberQueryNormal, setMemberQueryNormal] = useState("");
  const [memberQueryRecurring, setMemberQueryRecurring] = useState("");

  const [normal, setNormal] = useState(makeEmptyNormalForm);
  const [recurring, setRecurring] = useState(makeEmptyRecurringForm);

  const [isDragging, setIsDragging] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!groupId) return;

    setLoadingMembers(true);
    setMembersError(null);

    try {
      const { getGroupMembers } = await import("../../services/api");
      const response = await getGroupMembers(groupId);
      const list = Array.isArray(response)
        ? response
        : response?.members || response?.data || [];
      setMembers(normalizeMembers(list));
    } catch (error) {
      console.error("Failed to load members:", error);
      setMembersError(error?.message || "ไม่สามารถโหลดรายชื่อสมาชิกได้");
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [groupId]);

  const resetAll = useCallback(() => {
    setErrors({ normal: {}, recurring: {} });
    setMemberQueryNormal("");
    setMemberQueryRecurring("");
    setNormal(makeEmptyNormalForm());
    setRecurring(makeEmptyRecurringForm());
    setIsDragging(false);
  }, []);

  const requestClose = useCallback(() => {
    closeAddTask();
  }, [closeAddTask]);

  useEffect(() => {
    if (isAddTaskOpen) {
      if (openSessionRef.current) return;
      openSessionRef.current = true;

      resetAll();
      setMembersError(null);
      setActiveTab(addTaskDefaultTab === "recurring" ? "recurring" : "normal");
      loadMembers();
      requestAnimationFrame(() => titleRef.current?.focus());
      return;
    }

    if (!openSessionRef.current) return;
    openSessionRef.current = false;
    setSubmitting(false);
    setLoadingMembers(false);
    setMembersError(null);
    resetAll();
  }, [addTaskDefaultTab, isAddTaskOpen, loadMembers, resetAll]);

  useEffect(() => {
    if (!isAddTaskOpen) return;
    if (!canCreate) return;
    if (!isTaskAssigneeId(userId)) return;

    const hasMember = members.some((m) => m.id === userId && m.selectable);
    if (!hasMember) return;

    setNormal((prev) =>
      prev.reviewerUserId ? prev : { ...prev, reviewerUserId: userId },
    );
  }, [canCreate, isAddTaskOpen, members, userId]);

  const validateNormal = () => {
    const next = {};
    if (!normal.title.trim()) next.title = "กรุณาระบุชื่องาน";
    if (!normal.description.trim()) next.description = "กรุณาระบุรายละเอียด";
    if (!normal.dueDate) next.dueDate = "กรุณาเลือกวันที่ครบกำหนด";
    if (!normal.priority) next.priority = "กรุณาเลือกความสำคัญ";
    if (normal.assigneeIds.length === 0)
      next.assignees = "กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน";

    setErrors((prev) => ({ ...prev, normal: next }));
    return Object.keys(next).length === 0;
  };

  const validateRecurring = () => {
    const next = {};
    if (!recurring.title.trim()) next.title = "กรุณาระบุชื่องานประจำ";
    if (!recurring.initialDueDate)
      next.initialDueDate = "กรุณาเลือกวันกำหนดส่งครั้งแรก";
    if (!recurring.recurrence) next.recurrence = "กรุณาเลือกรอบการทำงาน";
    if (recurring.assigneeLineUserIds.length === 0)
      next.assignees = "กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน";

    setErrors((prev) => ({ ...prev, recurring: next }));
    return Object.keys(next).length === 0;
  };

  const addFiles = (incoming) => {
    const nextFiles = Array.isArray(incoming) ? incoming : [];
    if (nextFiles.length === 0) return;

    setNormal((prev) => {
      const existingKeys = new Set(
        (prev.files || []).map(
          (f) => `${f.name}:${f.size}:${f.lastModified || 0}`,
        ),
      );
      const merged = [...(prev.files || [])];
      for (const f of nextFiles) {
        const key = `${f.name}:${f.size}:${f.lastModified || 0}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          merged.push(f);
        }
      }
      return { ...prev, files: merged };
    });
  };

  const removeFileAt = (index) => {
    setNormal((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const totalFileSize = useMemo(
    () => (normal.files || []).reduce((sum, f) => sum + (f?.size || 0), 0),
    [normal.files],
  );

  const normalPreviewChips = useMemo(() => {
    const due = normal.dueDate
      ? `${formatThaiDate(normal.dueDate)} ${normal.dueTime || "23:59"}`
      : "—";
    const assignees = normal.assigneeIds.length || 0;
    const files = normal.files.length || 0;
    return { due, assignees, files };
  }, [normal.assigneeIds.length, normal.dueDate, normal.dueTime, normal.files.length]);

  const recurringPreviewText = useMemo(() => {
    const opt = RECURRENCE_OPTIONS.find((o) => o.value === recurring.recurrence);
    const label = opt ? opt.title : "ที่เลือก";
    const dateText = formatThaiDate(recurring.initialDueDate);
    const timeText = recurring.initialDueTime || "23:59";
    return `เริ่มด้วยกำหนดส่งครั้งแรก: ${dateText} ${timeText} • เมื่อเลยกำหนดส่ง ระบบจะสร้างงานรอบถัดไปแบบ${label}ทันที`;
  }, [recurring.initialDueDate, recurring.initialDueTime, recurring.recurrence]);

  const submitNormal = async () => {
    if (!canCreate) {
      showWarning("โหมดดูอย่างเดียว: ต้องมี userId เพื่อสร้างงาน");
      return;
    }
    if (!validateNormal()) return;

    const dueTimeIso = buildDueTimeIso(normal.dueDate, normal.dueTime);
    if (!dueTimeIso) {
      showWarning("กรุณาเลือกวันที่ครบกำหนด");
      return;
    }

    const priorityApi = normal.priority === "urgent" ? "high" : normal.priority;
    const tags = parseTags(normal.tagsText);
    const categoryTag =
      normal.category && normal.category !== "general"
        ? `category:${normal.category}`
        : null;
    const finalTags = uniqueKeepOrder(
      categoryTag ? [...tags, categoryTag] : tags,
    );

    const descriptionBase = normal.description.trim();
    const notes = normal.notes.trim();
    const description = notes
      ? `${descriptionBase}\n\nหมายเหตุ: ${notes}`
      : descriptionBase;

    setSubmitting(true);
    try {
      let fileIds = [];
      if (normal.files.length > 0) {
        const uploadRes = await uploadFiles(groupId, normal.files, {
          userId,
          attachmentType: "initial",
        });
        const uploaded = Array.isArray(uploadRes?.data) ? uploadRes.data : [];
        fileIds = uploaded.map((f) => f?.id).filter(Boolean);
      }

      const { createTask } = await import("../../services/api");
      const payload = {
        title: normal.title.trim(),
        description,
        dueTime: dueTimeIso,
        priority: priorityApi,
        tags: finalTags.length > 0 ? finalTags : undefined,
        assigneeIds: uniqueKeepOrder(normal.assigneeIds),
        reviewerUserId: normal.reviewerUserId || undefined,
        createdBy: userId,
        requireAttachment: false,
        ...(fileIds.length > 0 ? { fileIds } : {}),
      };

      await createTask(groupId, payload);

      showSuccess("สร้างงานสำเร็จ");
      onTaskCreated?.();
      requestClose();
    } catch (error) {
      console.error("Failed to create task:", error);
      showError(extractValidationMessage(error), error);
    } finally {
      setSubmitting(false);
    }
  };

  const submitRecurring = async () => {
    if (!canCreate) {
      showWarning("โหมดดูอย่างเดียว: ต้องมี userId เพื่อสร้างงานประจำ");
      return;
    }
    if (!validateRecurring()) return;

    const initialDueIso = buildInitialDueIso(
      recurring.initialDueDate,
      recurring.initialDueTime,
    );
    if (!initialDueIso) {
      showWarning("กรุณาเลือกวันกำหนดส่งครั้งแรก");
      return;
    }

    setSubmitting(true);
    try {
      const { createRecurringTask } = await import("../../services/api");

      const payload = {
        title: recurring.title.trim(),
        description: recurring.description?.trim() || "",
        recurrence: recurring.recurrence,
        initialDueTime: initialDueIso,
        timezone: THAI_TIMEZONE,
        assigneeLineUserIds: uniqueKeepOrder(recurring.assigneeLineUserIds),
        reviewerLineUserId: recurring.reviewerLineUserId || null,
        priority: recurring.priority || "medium",
        requireAttachment: !!recurring.requireAttachment,
        createdBy: userId,
        createdByLineUserId: userId,
      };

      const tags = parseTags(recurring.tagsText);
      if (tags.length > 0) {
        payload.tags = tags;
      }

      await createRecurringTask(groupId, payload);

      showSuccess("สร้างงานประจำสำเร็จ");
      onRecurringTaskCreated?.();
      requestClose();
    } catch (error) {
      console.error("Failed to create recurring task:", error);
      showError(extractValidationMessage(error), error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (activeTab === "recurring") {
      await submitRecurring();
    } else {
      await submitNormal();
    }
  };

  const handleOpenChange = useCallback(
    (open) => {
      if (!open) requestClose();
    },
    [requestClose],
  );

  return (
    <Dialog open={isAddTaskOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (submitting) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (submitting) e.preventDefault();
        }}
        className={cn(
          "p-0 gap-0 overflow-hidden flex flex-col w-full max-w-none",
          "top-auto bottom-0 left-0 right-0 translate-x-0 translate-y-0 rounded-t-2xl",
          "border-x-0 border-b-0 border-t",
          "max-h-[92dvh]",
          "sm:top-[50%] sm:left-[50%] sm:bottom-auto sm:right-auto sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:border-border sm:max-w-2xl sm:max-h-[90vh]",
        )}
      >
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="px-4 pt-4 pb-3 pr-12 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shrink-0 space-y-3">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                เพิ่มงานใหม่
              </DialogTitle>
              <DialogDescription className="text-sm">
                เลือกประเภทงาน แล้วกรอกข้อมูลให้ครบ
              </DialogDescription>
            </DialogHeader>

            <SegmentedTabs
              value={activeTab}
              onChange={setActiveTab}
              disabled={submitting}
            />

            <div className="flex flex-wrap gap-2 text-xs">
              {activeTab === "normal" ? (
                <>
                  <span className="inline-flex items-center rounded-full border px-2 py-1 text-muted-foreground">
                    <CalendarDays className="w-3.5 h-3.5 mr-1" />
                    {normalPreviewChips.due}
                  </span>
                  <span className="inline-flex items-center rounded-full border px-2 py-1 text-muted-foreground">
                    <Users className="w-3.5 h-3.5 mr-1" />
                    {normalPreviewChips.assignees} คน
                  </span>
                  <span className="inline-flex items-center rounded-full border px-2 py-1 text-muted-foreground">
                    <Paperclip className="w-3.5 h-3.5 mr-1" />
                    {normalPreviewChips.files} ไฟล์
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center rounded-full border px-2 py-1 text-muted-foreground">
                  <ChevronsUpDown className="w-3.5 h-3.5 mr-1" />
                  {recurringPreviewText}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-6">
            {!canCreate && (
              <Alert>
                <AlertDescription>
                  โหมดดูอย่างเดียว: ต้องเข้าผ่านลิงก์ที่มี{" "}
                  <span className="font-medium">userId</span> เพื่อสร้างงาน
                </AlertDescription>
              </Alert>
            )}

            {membersError && (
              <Alert>
                <AlertDescription className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    {membersError}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadMembers}
                    disabled={loadingMembers || submitting}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    โหลดใหม่
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {loadingMembers && (
              <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังโหลดรายชื่อสมาชิก...
              </div>
            )}

            {activeTab === "normal" ? (
              <>
                <section className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="taskTitle" className="text-sm font-semibold">
                      ชื่องาน <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="taskTitle"
                      ref={titleRef}
                      value={normal.title}
                      onChange={(e) =>
                        setNormal((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="เช่น: สรุปรายงานประจำสัปดาห์"
                      className={cn(
                        "h-11 text-base",
                        errors.normal.title &&
                          "border-destructive focus-visible:ring-destructive/40",
                      )}
                      disabled={submitting || !canCreate}
                    />
                    {errors.normal.title && (
                      <p className="text-xs text-destructive">
                        {errors.normal.title}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="taskDescription"
                      className="text-sm font-semibold"
                    >
                      รายละเอียด <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="taskDescription"
                      value={normal.description}
                      onChange={(e) =>
                        setNormal((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="อธิบายรายละเอียดงาน..."
                      rows={4}
                      className={cn(
                        "text-base resize-none",
                        errors.normal.description &&
                          "border-destructive focus-visible:ring-destructive/40",
                      )}
                      disabled={submitting || !canCreate}
                    />
                    {errors.normal.description && (
                      <p className="text-xs text-destructive">
                        {errors.normal.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taskNotes" className="text-sm font-semibold">
                      หมายเหตุเพิ่มเติม
                    </Label>
                    <Textarea
                      id="taskNotes"
                      value={normal.notes}
                      onChange={(e) =>
                        setNormal((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      placeholder="หมายเหตุหรือข้อมูลเพิ่มเติม..."
                      rows={2}
                      className="text-base resize-none"
                      disabled={submitting || !canCreate}
                    />
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      <Label
                        htmlFor="taskDueDate"
                        className="text-sm font-semibold"
                      >
                        วันที่ครบกำหนด <span className="text-destructive">*</span>
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setNormal((prev) => ({
                            ...prev,
                            dueDate: toYYYYMMDD(new Date()),
                          }))
                        }
                        disabled={submitting || !canCreate}
                      >
                        วันนี้
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 1);
                          setNormal((prev) => ({
                            ...prev,
                            dueDate: toYYYYMMDD(d),
                          }));
                        }}
                        disabled={submitting || !canCreate}
                      >
                        พรุ่งนี้
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Input
                        id="taskDueDate"
                        type="date"
                        value={normal.dueDate}
                        onChange={(e) =>
                          setNormal((prev) => ({
                            ...prev,
                            dueDate: e.target.value,
                          }))
                        }
                        className={cn(
                          "h-11",
                          errors.normal.dueDate &&
                            "border-destructive focus-visible:ring-destructive/40",
                        )}
                        disabled={submitting || !canCreate}
                      />
                      {errors.normal.dueDate && (
                        <p className="text-xs text-destructive">
                          {errors.normal.dueDate}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={normal.dueTime}
                          onChange={(e) =>
                            setNormal((prev) => ({
                              ...prev,
                              dueTime: e.target.value,
                            }))
                          }
                          className="h-11"
                          disabled={submitting || !canCreate}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ค่าเริ่มต้น 23:59
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      ความสำคัญ <span className="text-destructive">*</span>
                    </Label>
                    {errors.normal.priority && (
                      <p className="text-xs text-destructive">
                        {errors.normal.priority}
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PRIORITY_NORMAL.map((opt) => {
                        const selected = normal.priority === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setNormal((prev) => ({
                                ...prev,
                                priority: opt.value,
                              }))
                            }
                            disabled={submitting || !canCreate}
                            className={cn(
                              "h-11 rounded-xl border px-3 text-sm font-semibold transition-colors",
                              selected
                                ? opt.className
                                : "border-border bg-background text-foreground hover:bg-accent/40",
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taskCategory" className="text-sm font-semibold">
                      หมวดหมู่
                    </Label>
                    <select
                      id="taskCategory"
                      value={normal.category}
                      onChange={(e) =>
                        setNormal((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      disabled={submitting || !canCreate}
                      className={cn(
                        "h-11 w-full rounded-md border bg-background px-3 text-sm",
                        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
                      )}
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>

                <MemberPicker
                  title="ผู้รับผิดชอบ"
                  members={members}
                  selectedIds={normal.assigneeIds}
                  onChange={(assigneeIds) =>
                    setNormal((prev) => ({ ...prev, assigneeIds }))
                  }
                  query={memberQueryNormal}
                  onQueryChange={setMemberQueryNormal}
                  disabled={submitting || !canCreate || loadingMembers}
                  errorsText={errors.normal.assignees}
                />

                <section className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="taskTags" className="text-sm font-semibold">
                      แท็ก (คั่นด้วยจุลภาค)
                    </Label>
                    <Input
                      id="taskTags"
                      value={normal.tagsText}
                      onChange={(e) =>
                        setNormal((prev) => ({
                          ...prev,
                          tagsText: e.target.value,
                        }))
                      }
                      placeholder="เช่น: สำคัญ, ด่วน, รายงาน"
                      className="h-11"
                      disabled={submitting || !canCreate}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="taskReviewer"
                      className="text-sm font-semibold"
                    >
                      ผู้ตรวจงาน
                    </Label>
                    <select
                      id="taskReviewer"
                      value={normal.reviewerUserId}
                      onChange={(e) =>
                        setNormal((prev) => ({
                          ...prev,
                          reviewerUserId: e.target.value,
                        }))
                      }
                      disabled={submitting || !canCreate}
                      className={cn(
                        "h-11 w-full rounded-md border bg-background px-3 text-sm",
                        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
                      )}
                    >
                      <option value="">(ไม่ระบุ)</option>
                      {members
                        .filter((m) => m.selectable)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-semibold">ไฟล์แนบ</Label>
                    </div>
                    {normal.files.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {normal.files.length} ไฟล์ • {formatFileSize(totalFileSize)}
                      </span>
                    )}
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      if (submitting || !canCreate) return;
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      if (submitting || !canCreate) return;
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      if (submitting || !canCreate) return;
                      e.preventDefault();
                      setIsDragging(false);
                      addFiles(Array.from(e.dataTransfer.files || []));
                    }}
                    className={cn(
                      "rounded-2xl border-2 border-dashed p-4 transition-colors",
                      "bg-card hover:bg-accent/20",
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border",
                      (submitting || !canCreate) && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <UploadCloud className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          ลากไฟล์มาวาง หรือแตะเพื่อเลือกไฟล์
                        </p>
                        <p className="text-xs text-muted-foreground">
                          รองรับไฟล์หลายประเภท • ไม่จำกัดขนาด (ตามข้อจำกัดเซิร์ฟเวอร์)
                        </p>
                      </div>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addFiles(Array.from(e.target.files || []));
                      e.target.value = "";
                    }}
                    disabled={submitting || !canCreate}
                    accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,.rar,.7z,.mp4,.mov,.avi,.mp3,.wav"
                  />

                  {normal.files.length > 0 && (
                    <div className="rounded-2xl border bg-card overflow-hidden">
                      <div className="p-3 border-b bg-muted/30 text-xs text-muted-foreground">
                        แตะปุ่ม ✕ เพื่อเอาไฟล์ออก
                      </div>
                      <div className="divide-y">
                        {normal.files.map((file, index) => (
                          <div
                            key={`${file.name}:${file.size}:${file.lastModified || 0}`}
                            className="flex items-center justify-between gap-3 p-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFileAt(index)}
                              disabled={submitting || !canCreate}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <>
                <section className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="recurringTitle"
                      className="text-sm font-semibold"
                    >
                      ชื่องานประจำ <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="recurringTitle"
                      ref={titleRef}
                      value={recurring.title}
                      onChange={(e) =>
                        setRecurring((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="เช่น: รายงานยอดขายประจำสัปดาห์"
                      className={cn(
                        "h-11 text-base",
                        errors.recurring.title &&
                          "border-destructive focus-visible:ring-destructive/40",
                      )}
                      disabled={submitting || !canCreate}
                    />
                    {errors.recurring.title && (
                      <p className="text-xs text-destructive">
                        {errors.recurring.title}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="recurringDescription"
                      className="text-sm font-semibold"
                    >
                      รายละเอียด
                    </Label>
                    <Textarea
                      id="recurringDescription"
                      value={recurring.description}
                      onChange={(e) =>
                        setRecurring((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="อธิบายรายละเอียดงาน..."
                      rows={3}
                      className="text-base resize-none"
                      disabled={submitting || !canCreate}
                    />
                  </div>
                </section>

                <MemberPicker
                  title="ผู้รับผิดชอบ"
                  members={members}
                  selectedIds={recurring.assigneeLineUserIds}
                  onChange={(assigneeLineUserIds) =>
                    setRecurring((prev) => ({ ...prev, assigneeLineUserIds }))
                  }
                  query={memberQueryRecurring}
                  onQueryChange={setMemberQueryRecurring}
                  disabled={submitting || !canCreate || loadingMembers}
                  errorsText={errors.recurring.assignees}
                />

                <section className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">ความสำคัญ</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PRIORITY_RECURRING.map((opt) => {
                        const selected = recurring.priority === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setRecurring((prev) => ({
                                ...prev,
                                priority: opt.value,
                              }))
                            }
                            disabled={submitting || !canCreate}
                            className={cn(
                              "h-11 rounded-xl border px-3 text-sm font-semibold transition-colors",
                              selected
                                ? opt.className
                                : "border-border bg-background text-foreground hover:bg-accent/40",
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="recurringReviewer"
                      className="text-sm font-semibold"
                    >
                      ผู้ตรวจงาน
                    </Label>
                    <select
                      id="recurringReviewer"
                      value={recurring.reviewerLineUserId}
                      onChange={(e) =>
                        setRecurring((prev) => ({
                          ...prev,
                          reviewerLineUserId: e.target.value,
                        }))
                      }
                      disabled={submitting || !canCreate}
                      className={cn(
                        "h-11 w-full rounded-md border bg-background px-3 text-sm",
                        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
                      )}
                    >
                      <option value="">(ไม่ระบุ)</option>
                      {members
                        .filter((m) => m.selectable)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurringTags" className="text-sm font-semibold">
                      แท็ก (คั่นด้วยจุลภาค)
                    </Label>
                    <Input
                      id="recurringTags"
                      value={recurring.tagsText}
                      onChange={(e) =>
                        setRecurring((prev) => ({
                          ...prev,
                          tagsText: e.target.value,
                        }))
                      }
                      placeholder="เช่น: รายงาน, ประจำ, ขาย"
                      className="h-11"
                      disabled={submitting || !canCreate}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={recurring.requireAttachment}
                      onCheckedChange={(checked) =>
                        setRecurring((prev) => ({
                          ...prev,
                          requireAttachment: Boolean(checked),
                        }))
                      }
                      disabled={submitting || !canCreate}
                    />
                    ต้องแนบไฟล์เมื่อส่งงาน
                  </label>
                </section>

                <section className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      รอบการทำงาน <span className="text-destructive">*</span>
                    </Label>
                    {errors.recurring.recurrence && (
                      <p className="text-xs text-destructive">
                        {errors.recurring.recurrence}
                      </p>
                    )}
                    <div className="space-y-2">
                      {RECURRENCE_OPTIONS.map((opt) => {
                        const selected = recurring.recurrence === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setRecurring((prev) => ({
                                ...prev,
                                recurrence: opt.value,
                              }))
                            }
                            disabled={submitting || !canCreate}
                            className={cn(
                              "w-full rounded-2xl border p-3 text-left transition-colors",
                              selected
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card hover:bg-accent/30",
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="text-xl leading-none">{opt.icon}</div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold">
                                  {opt.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {opt.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-sm font-semibold">
                        วันกำหนดส่งครั้งแรก <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setRecurring((prev) => ({
                              ...prev,
                              initialDueDate: toYYYYMMDD(new Date()),
                            }))
                          }
                          disabled={submitting || !canCreate}
                        >
                          วันนี้
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            setRecurring((prev) => ({
                              ...prev,
                              initialDueDate: toYYYYMMDD(d),
                            }));
                          }}
                          disabled={submitting || !canCreate}
                        >
                          พรุ่งนี้
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Input
                          type="date"
                          value={recurring.initialDueDate}
                          onChange={(e) =>
                            setRecurring((prev) => ({
                              ...prev,
                              initialDueDate: e.target.value,
                            }))
                          }
                          className={cn(
                            "h-11",
                            errors.recurring.initialDueDate &&
                              "border-destructive focus-visible:ring-destructive/40",
                          )}
                          disabled={submitting || !canCreate}
                        />
                        {errors.recurring.initialDueDate && (
                          <p className="text-xs text-destructive">
                            {errors.recurring.initialDueDate}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Input
                          type="time"
                          value={recurring.initialDueTime}
                          onChange={(e) =>
                            setRecurring((prev) => ({
                              ...prev,
                              initialDueTime: e.target.value,
                            }))
                          }
                          className="h-11"
                          disabled={submitting || !canCreate}
                        />
                        <p className="text-xs text-muted-foreground">
                          ค่าเริ่มต้น 23:59
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                      <p className="text-xs text-blue-700 font-semibold mb-1">
                        💡 ตัวอย่าง
                      </p>
                      <p className="text-xs text-blue-700">{recurringPreviewText}</p>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>

          <div className="px-4 py-3 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shrink-0">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 text-base"
                onClick={requestClose}
                disabled={submitting}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-12 px-4"
                onClick={resetAll}
                disabled={submitting}
                title="ล้างข้อมูลทั้งหมด"
              >
                ล้าง
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 text-base font-semibold"
                disabled={submitting || !canCreate}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    กำลังสร้าง...
                  </>
                ) : activeTab === "recurring" ? (
                  "สร้างงานประจำ"
                ) : (
                  "เพิ่มงาน"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
