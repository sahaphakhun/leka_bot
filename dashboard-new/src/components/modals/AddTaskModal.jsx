import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { showError, showSuccess, showWarning } from "../../lib/toast";
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
import { Check, Loader2, Search, Users, X } from "lucide-react";
import { cn } from "../../lib/utils";

const PRIORITY_OPTIONS = [
  { value: "low", label: "ต่ำ", className: "border-blue-200 bg-blue-50 text-blue-700" },
  { value: "medium", label: "กลาง", className: "border-amber-200 bg-amber-50 text-amber-800" },
  { value: "high", label: "สูง", className: "border-orange-200 bg-orange-50 text-orange-800" },
  { value: "urgent", label: "ด่วน", className: "border-red-200 bg-red-50 text-red-700" },
];

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

const buildDueTimeIso = (dueDate, dueTime) => {
  if (!dueDate) return null;
  const timePart = dueTime && dueTime.trim() ? dueTime.trim() : "23:59";
  return `${dueDate}T${timePart}:00.000+07:00`;
};

const normalizeMembers = (membersList) => {
  const normalized = [];
  const seen = new Set();

  for (const member of membersList || []) {
    const id = member?.lineUserId || member?.userId || member?.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);

    normalized.push({
      ...member,
      __id: id,
      __name: member?.displayName || member?.realName || member?.name || "ไม่ระบุชื่อ",
    });
  }

  return normalized;
};

export default function AddTaskModal({ onTaskCreated }) {
  const { groupId, userId, canModify } = useAuth();
  const { isAddTaskOpen, closeAddTask } = useModal();

  const canCreate = canModify?.() && !!groupId && !!userId;

  const titleRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [assigneePanelOpen, setAssigneePanelOpen] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    dueTime: "23:59",
    priority: "medium",
    assigneeIds: [],
    reviewerUserId: "",
  });

  const [errors, setErrors] = useState({});

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [memberQuery, setMemberQuery] = useState("");

  const memberNameById = useMemo(() => {
    const map = new Map();
    for (const member of members) {
      if (member?.__id) map.set(member.__id, member.__name);
    }
    return map;
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (!memberQuery.trim()) return members;
    const q = memberQuery.trim().toLowerCase();
    return members.filter((member) => (member.__name || "").toLowerCase().includes(q));
  }, [members, memberQuery]);

  const resetAll = useCallback(() => {
    setForm({
      title: "",
      description: "",
      dueDate: "",
      dueTime: "23:59",
      priority: "medium",
      assigneeIds: [],
      reviewerUserId: "",
    });
    setMemberQuery("");
    setAssigneePanelOpen(true);
    setErrors({});
  }, []);

  const closeAndReset = useCallback(() => {
    closeAddTask();
    resetAll();
    setMembersError(null);
  }, [closeAddTask, resetAll]);

  const loadMembers = useCallback(async () => {
    if (!groupId) return;

    setLoadingMembers(true);
    setMembersError(null);

    try {
      const { getGroupMembers } = await import("../../services/api");
      const response = await getGroupMembers(groupId);
      const membersList = Array.isArray(response)
        ? response
        : response?.members || response?.data || [];
      setMembers(normalizeMembers(membersList));
    } catch (error) {
      console.error("Failed to load members:", error);
      setMembersError(error?.message || "ไม่สามารถโหลดรายชื่อสมาชิกได้");
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!isAddTaskOpen) return;
    loadMembers();
    setErrors({});
    requestAnimationFrame(() => titleRef.current?.focus());
  }, [isAddTaskOpen, loadMembers]);

  const clearError = (key) => {
    setErrors((prev) => {
      if (!prev?.[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const toggleAssignee = (assigneeId) => {
    if (!assigneeId) return;
    clearError("assignees");

    setForm((prev) => {
      const exists = prev.assigneeIds.includes(assigneeId);
      return {
        ...prev,
        assigneeIds: exists
          ? prev.assigneeIds.filter((id) => id !== assigneeId)
          : [...prev.assigneeIds, assigneeId],
      };
    });
  };

  const removeAssignee = (assigneeId) => {
    setForm((prev) => ({
      ...prev,
      assigneeIds: prev.assigneeIds.filter((id) => id !== assigneeId),
    }));
  };

  const selectAllVisible = () => {
    clearError("assignees");
    const visible = filteredMembers.map((m) => m.__id).filter(Boolean);
    setForm((prev) => ({
      ...prev,
      assigneeIds: Array.from(new Set([...prev.assigneeIds, ...visible])),
    }));
  };

  const clearAssignees = () => {
    setForm((prev) => ({ ...prev, assigneeIds: [] }));
  };

  const validate = useCallback(() => {
    const next = {};

    if (!form.title.trim()) next.title = "กรุณาระบุชื่องาน";
    if (!form.dueDate) next.dueDate = "กรุณาเลือกวันที่ครบกำหนด";
    if (form.assigneeIds.length === 0) next.assignees = "กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน";

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form.assigneeIds.length, form.dueDate, form.title]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!canCreate) {
        showWarning("โหมดดูอย่างเดียว: ต้องมี userId เพื่อสร้างงาน");
        return;
      }

      if (!validate()) {
        return;
      }

      const dueTimeIso = buildDueTimeIso(form.dueDate, form.dueTime);
      if (!dueTimeIso) {
        showWarning("กรุณาเลือกวันที่ครบกำหนด");
        return;
      }

      setSubmitting(true);
      try {
        const { createTask } = await import("../../services/api");

        const payload = {
          title: form.title.trim(),
          description: form.description?.trim() || "",
          dueTime: dueTimeIso,
          priority: form.priority,
          assigneeIds: Array.from(new Set(form.assigneeIds)),
          requireAttachment: false,
          createdBy: userId,
        };

        if (form.reviewerUserId) {
          payload.reviewerUserId = form.reviewerUserId;
        }

        await createTask(groupId, payload);

        showSuccess("สร้างงานสำเร็จ");
        onTaskCreated?.();
        closeAndReset();
      } catch (error) {
        console.error("Failed to create task:", error);
        showError(error?.message || "ไม่สามารถสร้างงานได้", error);
      } finally {
        setSubmitting(false);
      }
    },
    [canCreate, closeAndReset, form, groupId, onTaskCreated, userId, validate],
  );

  return (
    <Dialog open={isAddTaskOpen} onOpenChange={(open) => (!open ? closeAndReset() : null)}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden flex flex-col w-full max-w-none",
          "top-auto bottom-0 left-0 right-0 translate-x-0 translate-y-0 rounded-t-2xl",
          "border-x-0 border-b-0 border-t",
          "max-h-[92dvh]",
          "sm:top-[50%] sm:left-[50%] sm:bottom-auto sm:right-auto sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:border-border sm:max-w-xl sm:max-h-[90vh]",
        )}
      >
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="px-4 pt-4 pb-3 pr-12 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shrink-0">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                เพิ่มงานใหม่
              </DialogTitle>
              <DialogDescription className="text-sm">
                กรอกข้อมูลให้ครบ แล้วเลือกผู้รับผิดชอบ
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center rounded-full border px-2 py-1 text-muted-foreground">
                วันที่ครบกำหนด:{" "}
                <span className="ml-1 text-foreground">
                  {formatThaiDate(form.dueDate)}
                </span>
              </span>
              <span className="inline-flex items-center rounded-full border px-2 py-1 text-muted-foreground">
                ผู้รับผิดชอบ:{" "}
                <span className="ml-1 text-foreground">
                  {form.assigneeIds.length || 0} คน
                </span>
              </span>
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

            <section className="space-y-2">
              <Label htmlFor="taskTitle" className="text-sm font-semibold">
                ชื่องาน <span className="text-destructive">*</span>
              </Label>
              <Input
                id="taskTitle"
                ref={titleRef}
                value={form.title}
                onChange={(e) => {
                  clearError("title");
                  setForm((prev) => ({ ...prev, title: e.target.value }));
                }}
                placeholder="เช่น: สรุปรายงานประจำสัปดาห์"
                className={cn(
                  "h-11 text-base",
                  errors.title &&
                    "border-destructive focus-visible:ring-destructive/40",
                )}
                disabled={submitting || !canCreate}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title}</p>
              )}
            </section>

            <section className="space-y-2">
              <Label htmlFor="taskDescription" className="text-sm font-semibold">
                รายละเอียด
              </Label>
              <Textarea
                id="taskDescription"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                rows={4}
                className="text-base resize-none"
                disabled={submitting || !canCreate}
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="taskDueDate" className="text-sm font-semibold">
                  กำหนดส่ง <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      clearError("dueDate");
                      setForm((prev) => ({
                        ...prev,
                        dueDate: toYYYYMMDD(new Date()),
                      }));
                    }}
                    disabled={submitting || !canCreate}
                  >
                    วันนี้
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      clearError("dueDate");
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setForm((prev) => ({ ...prev, dueDate: toYYYYMMDD(d) }));
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
                    value={form.dueDate}
                    onChange={(e) => {
                      clearError("dueDate");
                      setForm((prev) => ({ ...prev, dueDate: e.target.value }));
                    }}
                    className={cn(
                      "h-11",
                      errors.dueDate &&
                        "border-destructive focus-visible:ring-destructive/40",
                    )}
                    disabled={submitting || !canCreate}
                  />
                  {errors.dueDate && (
                    <p className="text-xs text-destructive">{errors.dueDate}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Input
                    type="time"
                    value={form.dueTime}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, dueTime: e.target.value }))
                    }
                    className="h-11"
                    disabled={submitting || !canCreate}
                  />
                  <p className="text-xs text-muted-foreground">
                    ค่าเริ่มต้น 23:59
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <Label className="text-sm font-semibold">ความสำคัญ</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRIORITY_OPTIONS.map((opt) => {
                  const selected = form.priority === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, priority: opt.value }))
                      }
                      disabled={submitting || !canCreate}
                      className={cn(
                        "h-11 rounded-xl border px-3 text-sm font-semibold transition-colors",
                        selected
                          ? opt.className
                          : "border-border bg-background text-foreground hover:bg-accent/40",
                        !canCreate && "opacity-60",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold">
                    ผู้รับผิดชอบ <span className="text-destructive">*</span>
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssigneePanelOpen((v) => !v)}
                  disabled={submitting}
                >
                  {assigneePanelOpen ? "ซ่อนรายการ" : "เลือกรายชื่อ"}
                </Button>
              </div>

              {errors.assignees && (
                <p className="text-xs text-destructive">{errors.assignees}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {form.assigneeIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    ยังไม่ได้เลือกผู้รับผิดชอบ
                  </p>
                ) : (
                  form.assigneeIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => removeAssignee(id)}
                      disabled={submitting || !canCreate}
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

              {assigneePanelOpen && (
                <div className="rounded-2xl border bg-card overflow-hidden">
                  <div className="p-3 border-b bg-muted/30 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={memberQuery}
                        onChange={(e) => setMemberQuery(e.target.value)}
                        placeholder="ค้นหาสมาชิก..."
                        className="pl-9 h-10"
                        disabled={submitting || !canCreate}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={selectAllVisible}
                        disabled={submitting || loadingMembers || !canCreate}
                        className="flex-1"
                      >
                        เลือกทั้งหมด (ที่เห็น)
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={clearAssignees}
                        disabled={submitting || !canCreate}
                        className="flex-1"
                      >
                        ล้างทั้งหมด
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-[40vh] overflow-y-auto p-2">
                    {loadingMembers ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        กำลังโหลดรายชื่อสมาชิก...
                      </div>
                    ) : membersError ? (
                      <div className="py-6 px-3 space-y-3 text-center">
                        <p className="text-sm text-destructive">
                          {membersError}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={loadMembers}
                        >
                          โหลดใหม่
                        </Button>
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">
                        ไม่พบสมาชิกที่ตรงกับคำค้นหา
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredMembers.map((member) => {
                          const checked = form.assigneeIds.includes(member.__id);
                          return (
                            <button
                              key={member.__id}
                              type="button"
                              onClick={() => toggleAssignee(member.__id)}
                              disabled={submitting || !canCreate}
                              className={cn(
                                "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                                checked
                                  ? "bg-primary/10"
                                  : "hover:bg-accent/40",
                              )}
                            >
                              <Checkbox checked={checked} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                  {member.__name}
                                </p>
                              </div>
                              {checked && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-2">
              <Label htmlFor="taskReviewer" className="text-sm font-semibold">
                ผู้ตรวจงาน (ไม่บังคับ)
              </Label>
              <select
                id="taskReviewer"
                value={form.reviewerUserId}
                onChange={(e) =>
                  setForm((prev) => ({
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
                {members.map((member) => (
                  <option key={member.__id} value={member.__id}>
                    {member.__name}
                  </option>
                ))}
              </select>
            </section>
          </div>

          <div className="px-4 py-3 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shrink-0">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 text-base"
                onClick={closeAndReset}
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
                ) : (
                  "สร้างงาน"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
