import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { showError, showSuccess, showWarning } from "../../lib/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
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
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  CalendarIcon,
  Clock,
  User,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  X
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "../../lib/utils";
import CustomRecurrenceUI from "./CustomRecurrenceUI";

export default function AddTaskModal({ onTaskCreated }) {
  const { groupId, userId } = useAuth();
  const { isAddTaskOpen, closeAddTask, addTaskDefaultTab } = useModal();
  const [activeTab, setActiveTab] = useState("normal");
  const [loading, setLoading] = useState(false);

  // Normal task form
  const [normalTask, setNormalTask] = useState({
    title: "",
    description: "",
    dueDate: null,
    dueTime: "",
    priority: "medium",
    assignedUsers: [],
    reviewer: "",
  });

  // Recurring task form
  const [recurringTask, setRecurringTask] = useState({
    title: "",
    description: "",
    recurrence: "weekly",
    startDate: null,
    time: "",
    priority: "medium",
    assignedUsers: [],
    reviewer: "",
    customRecurrence: {
      type: "weekly",
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: 1,
    },
  });

  // Members list
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Set default tab
  useEffect(() => {
    if (isAddTaskOpen) {
      setActiveTab(addTaskDefaultTab || "normal");
    }
  }, [isAddTaskOpen, addTaskDefaultTab]);

  // Load members from API
  const loadMembers = useCallback(async () => {
    if (!groupId) return;

    setLoadingMembers(true);
    setMembersError(null);

    try {
      const { getGroupMembers } = await import("../../services/api");
      const response = await getGroupMembers(groupId);
      const membersList = response.members || response || [];
      setMembers(Array.isArray(membersList) ? membersList : []);
    } catch (error) {
      console.error("Failed to load members:", error);
      setMembersError(error.message || "ไม่สามารถโหลดรายชื่อสมาชิกได้");
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (isAddTaskOpen) {
      loadMembers();
    }
  }, [isAddTaskOpen, loadMembers]);

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return members;
    const query = memberSearchQuery.toLowerCase();
    return members.filter((member) => {
      const name = member.displayName || member.name || "";
      return name.toLowerCase().includes(query);
    });
  }, [members, memberSearchQuery]);

  const resetForms = useCallback(() => {
    setNormalTask({
      title: "",
      description: "",
      dueDate: null,
      dueTime: "",
      priority: "medium",
      assignedUsers: [],
      reviewer: "",
    });
    setRecurringTask({
      title: "",
      description: "",
      recurrence: "weekly",
      startDate: null,
      time: "",
      priority: "medium",
      assignedUsers: [],
      reviewer: "",
      customRecurrence: {
        type: "weekly",
        interval: 1,
        daysOfWeek: [],
        dayOfMonth: 1,
      },
    });
    setMemberSearchQuery("");
  }, []);

  const formatDateForApi = useCallback((date) => {
    if (!date) return null;
    try {
      return format(date, "yyyy-MM-dd");
    } catch (err) {
      console.warn("Failed to format date", err);
      return null;
    }
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      const currentTask = activeTab === "normal" ? normalTask : recurringTask;

      if (!currentTask.title?.trim()) {
        showWarning("กรุณาระบุชื่องาน");
        return;
      }

      if (currentTask.assignedUsers.length === 0) {
        showWarning("กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน");
        return;
      }

      if (activeTab === "normal" && !normalTask.dueDate) {
        showWarning("กรุณาเลือกวันที่ครบกำหนด");
        return;
      }

      if (activeTab === "recurring" && !recurringTask.startDate) {
        showWarning("กรุณาเลือกวันที่เริ่มต้น");
        return;
      }

      if (!userId) {
        showError("ไม่พบข้อมูลผู้ใช้สำหรับสร้างงาน");
        return;
      }

      setLoading(true);

      try {
        const { createTask, createRecurringTask } = await import(
          "../../services/api"
        );

        if (activeTab === "normal") {
          const dueDate = formatDateForApi(normalTask.dueDate);
          const dueTimeStr = normalTask.dueTime || "23:59";
          const combinedDueTime = `${dueDate}T${dueTimeStr}:00.000+07:00`;

          const payload = {
            title: normalTask.title,
            description: normalTask.description || "",
            dueTime: combinedDueTime,
            priority: normalTask.priority,
            assigneeIds: [...new Set(normalTask.assignedUsers)],
            requireAttachment: false,
            createdBy: userId,
          };
          if (normalTask.reviewer) {
            payload.reviewerUserId = normalTask.reviewer;
          }
          await createTask(groupId, payload);
        } else {
          const payload = {
            ...recurringTask,
            startDate: formatDateForApi(recurringTask.startDate),
            time: recurringTask.time || null,
            reviewer: recurringTask.reviewer || null,
            assignedUsers: [...new Set(recurringTask.assignedUsers)],
            customRecurrence: {
              ...recurringTask.customRecurrence,
              daysOfWeek:
                recurringTask.customRecurrence?.daysOfWeek?.slice() || [],
            },
          };
          delete payload.category;
          await createRecurringTask(groupId, payload);
        }

        showSuccess(
          activeTab === "normal" ? "สร้างงานสำเร็จ" : "สร้างงานประจำสำเร็จ"
        );
        if (onTaskCreated) onTaskCreated();
        closeAddTask();
        resetForms();
      } catch (error) {
        console.error("Failed to create task:", error);
        showError(error?.message || "ไม่สามารถสร้างงานได้", error);
      } finally {
        setLoading(false);
      }
    },
    [
      activeTab,
      normalTask,
      recurringTask,
      groupId,
      userId,
      onTaskCreated,
      closeAddTask,
      resetForms,
      formatDateForApi,
    ]
  );

  const handleAssigneeToggle = (userId, isNormal = true) => {
    const task = isNormal ? normalTask : recurringTask;
    const setTask = isNormal ? setNormalTask : setRecurringTask;

    const assignedUsers = task.assignedUsers.includes(userId)
      ? task.assignedUsers.filter((id) => id !== userId)
      : [...task.assignedUsers, userId];

    setTask({ ...task, assignedUsers });
  };

  const handleSelectAll = (isNormal = true) => {
    const setTask = isNormal ? setNormalTask : setRecurringTask;
    const task = isNormal ? normalTask : recurringTask;
    setTask({ ...task, assignedUsers: members.map((m) => m.lineUserId) });
  };

  const handleClearAll = (isNormal = true) => {
    const setTask = isNormal ? setNormalTask : setRecurringTask;
    const task = isNormal ? normalTask : recurringTask;
    setTask({ ...task, assignedUsers: [] });
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-red-500",
      "bg-orange-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "urgent":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "high":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case "medium":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      urgent: "ด่วนมาก",
      high: "สูง",
      medium: "ปานกลาง",
      low: "ต่ำ",
    };
    return labels[priority] || priority;
  };

  const renderMemberSelector = (isNormal = true) => {
    const task = isNormal ? normalTask : recurringTask;
    const selectedCount = task.assignedUsers.length;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            ผู้รับผิดชอบ
            <span className="text-destructive">*</span>
          </Label>
          {selectedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              เลือกแล้ว {selectedCount} คน
            </Badge>
          )}
        </div>

        <div className="border-2 border-border rounded-xl overflow-hidden bg-card">
          {loadingMembers ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
              </div>
            </div>
          ) : membersError ? (
            <div className="py-8 text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto opacity-50" />
              <p className="text-sm text-destructive">{membersError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMembers}
              >
                ลองอีกครั้ง
              </Button>
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto opacity-20 mb-2" />
              <p className="text-sm text-muted-foreground">
                ไม่พบสมาชิกในกลุ่ม
              </p>
            </div>
          ) : (
            <>
              {/* Header with search and actions */}
              <div className="p-4 bg-muted/30 border-b space-y-3">
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="ค้นหาสมาชิก..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-background"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectAll(isNormal)}
                    className="flex-1 h-8 text-xs"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    เลือกทั้งหมด
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClearAll(isNormal)}
                    className="flex-1 h-8 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    ล้างทั้งหมด
                  </Button>
                </div>
              </div>

              {/* Members list */}
              <ScrollArea className="h-[280px]">
                <div className="p-2">
                  {filteredMembers.length === 0 ? (
                    <div className="py-12 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto opacity-20 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        ไม่พบสมาชิก "{memberSearchQuery}"
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredMembers.map((member) => {
                        const isSelected = task.assignedUsers.includes(
                          member.lineUserId
                        );
                        return (
                          <button
                            key={member.lineUserId}
                            type="button"
                            onClick={() =>
                              handleAssigneeToggle(member.lineUserId, isNormal)
                            }
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
                              "hover:bg-accent/50 active:scale-[0.98]",
                              isSelected
                                ? "bg-primary/10 border-2 border-primary/30"
                                : "border-2 border-transparent"
                            )}
                          >
                            <div className="relative">
                              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                <AvatarImage src={member.pictureUrl} />
                                <AvatarFallback
                                  className={cn(
                                    "text-xs font-bold text-white",
                                    getAvatarColor(
                                      member.displayName || member.name
                                    )
                                  )}
                                >
                                  {getInitials(
                                    member.displayName || member.name
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              {isSelected && (
                                <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md border-2 border-background">
                                  <CheckCircle2 className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p
                                className={cn(
                                  "text-sm font-medium truncate",
                                  isSelected
                                    ? "text-primary"
                                    : "text-foreground"
                                )}
                              >
                                {member.displayName || member.name}
                              </p>
                            </div>
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground/30"
                              )}
                            >
                              {isSelected && (
                                <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderTaskForm = (isNormal = true) => {
    const task = isNormal ? normalTask : recurringTask;
    const setTask = isNormal ? setNormalTask : setRecurringTask;

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            ชื่องาน
            <span className="text-destructive">*</span>
          </Label>
          <Input
            value={task.title}
            onChange={(e) => setTask({ ...task, title: e.target.value })}
            placeholder="ระบุชื่องาน..."
            className="h-11 text-base"
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            รายละเอียด
          </Label>
          <Textarea
            value={task.description}
            onChange={(e) => setTask({ ...task, description: e.target.value })}
            placeholder="ระบุรายละเอียดงาน..."
            rows={3}
            className="text-base resize-none"
          />
        </div>

        {/* Date & Time */}
        {isNormal ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                วันที่ครบกำหนด
                <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left h-11 font-normal",
                      !task.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {task.dueDate
                      ? format(task.dueDate, "d MMMM yyyy", { locale: th })
                      : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={task.dueDate}
                    onSelect={(date) => setTask({ ...task, dueDate: date })}
                    initialFocus
                    fromDate={new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                เวลา
                <span className="text-xs text-muted-foreground font-normal">
                  (ค่าเริ่มต้น 23:59)
                </span>
              </Label>
              <Input
                type="time"
                value={task.dueTime}
                onChange={(e) => setTask({ ...task, dueTime: e.target.value })}
                className="h-11"
              />
            </div>
          </div>
        ) : (
          <>
            {/* Recurrence Type */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">รอบการทำซ้ำ *</Label>
              <Select
                value={task.recurrence}
                onValueChange={(value) =>
                  setTask({ ...task, recurrence: value })
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">รายวัน</SelectItem>
                  <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                  <SelectItem value="monthly">รายเดือน</SelectItem>
                  <SelectItem value="quarterly">รายไตรมาส</SelectItem>
                  <SelectItem value="custom">กำหนดเอง</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Recurrence */}
            {task.recurrence === "custom" && (
              <CustomRecurrenceUI
                value={task.customRecurrence}
                onChange={(value) =>
                  setTask({ ...task, customRecurrence: value })
                }
              />
            )}

            {/* Start Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  วันที่เริ่มต้น
                  <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left h-11 font-normal",
                        !task.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {task.startDate
                        ? format(task.startDate, "d MMMM yyyy", { locale: th })
                        : "เลือกวันที่"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={task.startDate}
                      onSelect={(date) => setTask({ ...task, startDate: date })}
                      initialFocus
                      fromDate={new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  เวลา
                  <span className="text-xs text-muted-foreground font-normal">
                    (ค่าเริ่มต้น 09:00)
                  </span>
                </Label>
                <Input
                  type="time"
                  value={task.time}
                  onChange={(e) => setTask({ ...task, time: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
          </>
        )}

        {/* Priority */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            {getPriorityIcon(task.priority)}
            ความสำคัญ
          </Label>
          <Select
            value={task.priority}
            onValueChange={(value) => setTask({ ...task, priority: value })}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  ต่ำ
                </div>
              </SelectItem>
              <SelectItem value="medium">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  ปานกลาง
                </div>
              </SelectItem>
              <SelectItem value="high">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  สูง
                </div>
              </SelectItem>
              <SelectItem value="urgent">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  ด่วนมาก
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Assigned Users */}
        {renderMemberSelector(isNormal)}

        {/* Reviewer */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            ผู้ตรวจงาน
          </Label>
          <Select
            value={task.reviewer || "__none"}
            onValueChange={(value) =>
              setTask({ ...task, reviewer: value === "__none" ? "" : value })
            }
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="(ไม่ระบุ)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">(ไม่ระบุ)</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.lineUserId} value={member.lineUserId}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={member.pictureUrl} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(member.displayName || member.name)}
                      </AvatarFallback>
                    </Avatar>
                    {member.displayName || member.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-2 -mx-6 px-6 border-t mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={closeAddTask}
            className="flex-1 h-12 text-base"
            disabled={loading}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 h-12 text-base font-semibold shadow-lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                กำลังสร้าง...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isNormal ? "สร้างงาน" : "สร้างงานประจำ"}
              </>
            )}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <Dialog open={isAddTaskOpen} onOpenChange={closeAddTask}>
      <DialogContent className="max-w-2xl max-h-[95vh] w-[95vw] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-5 border-b bg-gradient-to-r from-primary/5 to-primary/10 shrink-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            เพิ่มงานใหม่
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 h-12 mb-6">
                <TabsTrigger value="normal" className="text-base font-medium">
                  <FileText className="w-4 h-4 mr-2" />
                  งานทั่วไป
                </TabsTrigger>
                <TabsTrigger value="recurring" className="text-base font-medium">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  งานประจำ
                </TabsTrigger>
              </TabsList>

              <TabsContent value="normal" className="mt-0">
                {renderTaskForm(true)}
              </TabsContent>

              <TabsContent value="recurring" className="mt-0">
                {renderTaskForm(false)}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
