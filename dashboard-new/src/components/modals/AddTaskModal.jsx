import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { showError, showSuccess, showWarning } from "../../lib/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Checkbox } from "../ui/checkbox";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { CalendarIcon, X, Search, Check, Users } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "../../lib/utils";
import CustomRecurrenceUI from "./CustomRecurrenceUI";

export default function AddTaskModal({ onTaskCreated }) {
  const { groupId, userId } = useAuth();
  const { isAddTaskOpen, closeAddTask, addTaskDefaultTab } = useModal();
  const [activeTab, setActiveTab] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [isNormalDateOpen, setIsNormalDateOpen] = useState(false);
  const [isRecurringDateOpen, setIsRecurringDateOpen] = useState(false);

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

  // Members list - loaded from API
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState(null);

  // Search for members
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Set default tab
  useEffect(() => {
    if (isAddTaskOpen) {
      setActiveTab(addTaskDefaultTab || "normal");
    }
  }, [isAddTaskOpen, addTaskDefaultTab]);

  useEffect(() => {
    setIsNormalDateOpen(false);
    setIsRecurringDateOpen(false);
  }, [activeTab]);

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
    setIsNormalDateOpen(false);
    setIsRecurringDateOpen(false);
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
          // Combine date and time into a single DateTime string
          const dueDate = formatDateForApi(normalTask.dueDate);
          const dueTimeStr = normalTask.dueTime || "23:59";
          const combinedDueTime = `${dueDate}T${dueTimeStr}:00.000+07:00`;

          const payload = {
            title: normalTask.title,
            description: normalTask.description || "",
            dueTime: combinedDueTime,
            priority: normalTask.priority,
            // category: normalTask.category, // ❌ Backend ไม่รองรับ field นี้
            assigneeIds: [...new Set(normalTask.assignedUsers)], // Backend expects assigneeIds
            requireAttachment: false,
            createdBy: userId, // Required by backend
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
          // ลบ category ออกเพราะ backend ไม่รองรับ
          delete payload.category;
          await createRecurringTask(groupId, payload);
        }

        showSuccess(
          activeTab === "normal" ? "สร้างงานสำเร็จ" : "สร้างงานประจำสำเร็จ",
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
    ],
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
    const task = isNormal ? normalTask : recurringTask;
    const setTask = isNormal ? setNormalTask : setRecurringTask;

    setTask({ ...task, assignedUsers: members.map((m) => m.lineUserId) });
  };

  const handleClearAll = (isNormal = true) => {
    const task = isNormal ? normalTask : recurringTask;
    const setTask = isNormal ? setNormalTask : setRecurringTask;

    setTask({ ...task, assignedUsers: [] });
  };

  const handleOpenChange = (open) => {
    if (!open) {
      closeAddTask();
      setIsNormalDateOpen(false);
      setIsRecurringDateOpen(false);
    }
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
      "bg-red-100 text-red-600",
      "bg-blue-100 text-blue-600",
      "bg-green-100 text-green-600",
      "bg-yellow-100 text-yellow-600",
      "bg-purple-100 text-purple-600",
      "bg-pink-100 text-pink-600",
      "bg-indigo-100 text-indigo-600",
      "bg-orange-100 text-orange-600",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <Dialog open={isAddTaskOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[95vh] w-[95vw] sm:w-full p-0 gap-0 overflow-hidden flex flex-col rounded-xl sm:rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b shrink-0 bg-background/95 backdrop-blur z-10 sticky top-0">
          <DialogTitle className="text-xl font-bold text-foreground">เพิ่มงานใหม่</DialogTitle>
          <DialogDescription className="text-muted-foreground/80">สร้างงานใหม่หรืองานประจำ</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6">

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="normal">📄 งานทั่วไป</TabsTrigger>
                <TabsTrigger value="recurring">🔄 งานประจำ</TabsTrigger>
              </TabsList>

              {/* Normal Task Form */}
              <TabsContent value="normal">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">ชื่องาน *</Label>
                    <Input
                      id="title"
                      value={normalTask.title}
                      onChange={(e) =>
                        setNormalTask({ ...normalTask, title: e.target.value })
                      }
                      placeholder="ระบุชื่องาน"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">รายละเอียด</Label>
                    <Textarea
                      id="description"
                      value={normalTask.description}
                      onChange={(e) =>
                        setNormalTask({
                          ...normalTask,
                          description: e.target.value,
                        })
                      }
                      placeholder="ระบุรายละเอียด"
                      rows={3}
                    />
                  </div>

                  {/* Due Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        วันที่ครบกำหนด <span className="text-red-500">*</span>
                      </Label>
                      <Popover
                        modal={false}
                        open={isNormalDateOpen}
                        onOpenChange={setIsNormalDateOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-10 hover:bg-accent transition-colors",
                              !normalTask.dueDate && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                            {normalTask.dueDate
                              ? format(normalTask.dueDate, "d MMMM yyyy", {
                                locale: th,
                              })
                              : "เลือกวันที่"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          sideOffset={12}
                          side="bottom"
                          className="w-auto p-0 shadow-xl border-2"
                        >
                          <Calendar
                            mode="single"
                            selected={normalTask.dueDate}
                            onSelect={(date) => {
                              if (!date) {
                                setNormalTask((prev) => ({
                                  ...prev,
                                  dueDate: null,
                                }));
                                return;
                              }
                              setNormalTask((prev) => ({ ...prev, dueDate: date }));
                              setIsNormalDateOpen(false);
                            }}
                            initialFocus
                            fromDate={new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dueTime" className="flex items-center gap-1">
                        เวลา{" "}
                        <span className="text-muted-foreground text-xs">
                          (เริ่มต้น 23:59)
                        </span>
                      </Label>
                      <Input
                        id="dueTime"
                        type="time"
                        value={normalTask.dueTime}
                        onChange={(e) =>
                          setNormalTask({ ...normalTask, dueTime: e.target.value })
                        }
                        className="h-10"
                      />
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <Label>ความสำคัญ</Label>
                    <Select
                      value={normalTask.priority}
                      onValueChange={(value) =>
                        setNormalTask({ ...normalTask, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">ต่ำ</SelectItem>
                        <SelectItem value="medium">ปานกลาง</SelectItem>
                        <SelectItem value="high">สูง</SelectItem>
                        <SelectItem value="urgent">ด่วน</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assigned Users */}
                  <div className="space-y-2">
                    <Label>ผู้รับผิดชอบ *</Label>
                    <div className="border rounded-lg p-4 space-y-3">
                      {loadingMembers ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                            <span className="text-sm">
                              กำลังโหลดรายชื่อสมาชิก...
                            </span>
                          </div>
                        </div>
                      ) : membersError ? (
                        <div className="py-4 text-center space-y-2">
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
                        <p className="text-sm text-muted-foreground text-center py-4">
                          ไม่พบสมาชิกในกลุ่ม
                        </p>
                      ) : (
                        <>
                          <>
                            {/* Search & Actions Header */}
                            <div className="p-3 border-b bg-muted/20 space-y-3">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                  type="text"
                                  placeholder="ค้นหาชื่อสมาชิก..."
                                  value={memberSearchQuery}
                                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                                  className="pl-9 h-10 bg-background border-muted-foreground/20 focus-visible:ring-offset-0 focus-visible:ring-1"
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => handleSelectAll(true)}
                                  className="text-xs h-7 px-2 text-primary hover:text-primary/80 hover:bg-primary/10"
                                >
                                  เลือกทั้งหมด
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => handleClearAll(true)}
                                  className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                  ล้างทั้งหมด
                                </Button>
                              </div>
                            </div>

                            {/* Members List */}
                            <ScrollArea className="h-[240px]">
                              <div className="p-2 space-y-1">
                                {filteredMembers.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                                    <Search className="w-8 h-8 mb-2 opacity-20" />
                                    <p>ไม่พบสมาชิกที่ชื่อ "{memberSearchQuery}"</p>
                                  </div>
                                ) : (
                                  filteredMembers.map((member) => {
                                    const isSelected = normalTask.assignedUsers.includes(member.lineUserId);
                                    return (
                                      <div
                                        key={member.lineUserId}
                                        onClick={() => handleAssigneeToggle(member.lineUserId, true)}
                                        className={cn(
                                          "flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-all duration-200 border border-transparent",
                                          isSelected
                                            ? "bg-primary/5 border-primary/20 shadow-sm"
                                            : "hover:bg-accent hover:border-accent"
                                        )}
                                      >
                                        <div className="relative">
                                          <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                                            <AvatarImage src={member.pictureUrl} />
                                            <AvatarFallback className={cn("text-xs font-semibold", getAvatarColor(member.displayName || member.name))}>
                                              {getInitials(member.displayName || member.name)}
                                            </AvatarFallback>
                                          </Avatar>
                                          {isSelected && (
                                            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-[2px] shadow-sm ring-2 ring-background">
                                              <Check className="w-2.5 h-2.5" />
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <p className={cn("text-sm font-medium truncate", isSelected ? "text-primary" : "text-foreground")}>
                                            {member.displayName || member.name}
                                          </p>
                                        </div>

                                        <Checkbox
                                          id={`assignee-${member.lineUserId}`}
                                          checked={isSelected}
                                          onCheckedChange={() => handleAssigneeToggle(member.lineUserId, true)}
                                          className={cn("data-[state=checked]:bg-primary data-[state=checked]:border-primary", !isSelected && "border-muted-foreground/30")}
                                        />
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                            </ScrollArea>
                          </>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Reviewer */}
                  <div className="space-y-2">
                    <Label>ผู้ตรวจงาน</Label>
                    <Select
                      value={normalTask.reviewer || "__none"}
                      onValueChange={(value) =>
                        setNormalTask({
                          ...normalTask,
                          reviewer: value === "__none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="(ไม่ระบุ)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">(ไม่ระบุ)</SelectItem>
                        {members.map((member) => (
                          <SelectItem
                            key={member.lineUserId}
                            value={member.lineUserId}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={member.pictureUrl} />
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(member.displayName || member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{member.displayName || member.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-background pb-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeAddTask}
                      className="h-11 px-6 rounded-lg hover:bg-muted/50"
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-11 px-8 rounded-lg shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {loading ? "กำลังสร้าง..." : "สร้างงาน"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* Recurring Task Form */}
              <TabsContent value="recurring">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="recurring-title">ชื่องาน *</Label>
                    <Input
                      id="recurring-title"
                      value={recurringTask.title}
                      onChange={(e) =>
                        setRecurringTask({
                          ...recurringTask,
                          title: e.target.value,
                        })
                      }
                      placeholder="ระบุชื่องาน"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="recurring-description">รายละเอียด</Label>
                    <Textarea
                      id="recurring-description"
                      value={recurringTask.description}
                      onChange={(e) =>
                        setRecurringTask({
                          ...recurringTask,
                          description: e.target.value,
                        })
                      }
                      placeholder="ระบุรายละเอียด"
                      rows={3}
                    />
                  </div>

                  {/* Recurrence */}
                  <div className="space-y-2">
                    <Label>รอบการทำซ้ำ *</Label>
                    <Select
                      value={recurringTask.recurrence}
                      onValueChange={(value) =>
                        setRecurringTask({ ...recurringTask, recurrence: value })
                      }
                    >
                      <SelectTrigger>
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

                  {/* Custom Recurrence UI */}
                  {recurringTask.recurrence === "custom" && (
                    <CustomRecurrenceUI
                      value={recurringTask.customRecurrence}
                      onChange={(value) =>
                        setRecurringTask({
                          ...recurringTask,
                          customRecurrence: value,
                        })
                      }
                    />
                  )}

                  {/* Start Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        วันที่เริ่ม <span className="text-red-500">*</span>
                      </Label>
                      <Popover
                        modal={false}
                        open={isRecurringDateOpen}
                        onOpenChange={setIsRecurringDateOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-10 hover:bg-accent transition-colors",
                              !recurringTask.startDate && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                            {recurringTask.startDate
                              ? format(recurringTask.startDate, "d MMMM yyyy", {
                                locale: th,
                              })
                              : "เลือกวันที่"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          sideOffset={12}
                          side="bottom"
                          className="w-auto p-0 shadow-xl border-2"
                        >
                          <Calendar
                            mode="single"
                            selected={recurringTask.startDate}
                            onSelect={(date) => {
                              if (!date) {
                                setRecurringTask((prev) => ({
                                  ...prev,
                                  startDate: null,
                                }));
                                return;
                              }
                              setRecurringTask((prev) => ({
                                ...prev,
                                startDate: date,
                              }));
                              setIsRecurringDateOpen(false);
                            }}
                            initialFocus
                            fromDate={new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="recurring-time"
                        className="flex items-center gap-1"
                      >
                        เวลา{" "}
                        <span className="text-muted-foreground text-xs">
                          (เริ่มต้น 09:00)
                        </span>
                      </Label>
                      <Input
                        id="recurring-time"
                        type="time"
                        value={recurringTask.time}
                        onChange={(e) =>
                          setRecurringTask({
                            ...recurringTask,
                            time: e.target.value,
                          })
                        }
                        className="h-10"
                      />
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <Label>ความสำคัญ</Label>
                    <Select
                      value={recurringTask.priority}
                      onValueChange={(value) =>
                        setRecurringTask({ ...recurringTask, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">ต่ำ</SelectItem>
                        <SelectItem value="medium">ปานกลาง</SelectItem>
                        <SelectItem value="high">สูง</SelectItem>
                        <SelectItem value="urgent">ด่วน</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assigned Users */}
                  <div className="space-y-2">
                    <Label>ผู้รับผิดชอบ *</Label>
                    <div className="border rounded-lg p-4 space-y-3">
                      {loadingMembers ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                            <span className="text-sm">
                              กำลังโหลดรายชื่อสมาชิก...
                            </span>
                          </div>
                        </div>
                      ) : membersError ? (
                        <div className="py-4 text-center space-y-2">
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
                        <p className="text-sm text-muted-foreground text-center py-4">
                          ไม่พบสมาชิกในกลุ่ม
                        </p>
                      ) : (
                        <>
                          {/* Search & Actions Header */}
                          <div className="p-3 border-b bg-muted/20 space-y-3">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="text"
                                placeholder="ค้นหาชื่อสมาชิก..."
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                className="pl-9 h-10 bg-background border-muted-foreground/20 focus-visible:ring-offset-0 focus-visible:ring-1"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={() => handleSelectAll(false)}
                                className="text-xs h-7 px-2 text-primary hover:text-primary/80 hover:bg-primary/10"
                              >
                                เลือกทั้งหมด
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={() => handleClearAll(false)}
                                className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                ล้างทั้งหมด
                              </Button>
                            </div>
                          </div>

                          {/* Members List */}
                          <ScrollArea className="h-[240px]">
                            <div className="p-2 space-y-1">
                              {filteredMembers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                                  <Search className="w-8 h-8 mb-2 opacity-20" />
                                  <p>ไม่พบสมาชิกที่ชื่อ "{memberSearchQuery}"</p>
                                </div>
                              ) : (
                                filteredMembers.map((member) => {
                                  const isSelected = recurringTask.assignedUsers.includes(member.lineUserId);
                                  return (
                                    <div
                                      key={member.lineUserId}
                                      onClick={() => handleAssigneeToggle(member.lineUserId, false)}
                                      className={cn(
                                        "flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-all duration-200 border border-transparent",
                                        isSelected
                                          ? "bg-primary/5 border-primary/20 shadow-sm"
                                          : "hover:bg-accent hover:border-accent"
                                      )}
                                    >
                                      <div className="relative">
                                        <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                                          <AvatarImage src={member.pictureUrl} />
                                          <AvatarFallback className={cn("text-xs font-semibold", getAvatarColor(member.displayName || member.name))}>
                                            {getInitials(member.displayName || member.name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        {isSelected && (
                                          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-[2px] shadow-sm ring-2 ring-background">
                                            <Check className="w-2.5 h-2.5" />
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <p className={cn("text-sm font-medium truncate", isSelected ? "text-primary" : "text-foreground")}>
                                          {member.displayName || member.name}
                                        </p>
                                      </div>

                                      <Checkbox
                                        id={`recurring-assignee-${member.lineUserId}`}
                                        checked={isSelected}
                                        onCheckedChange={() => handleAssigneeToggle(member.lineUserId, false)}
                                        className={cn("data-[state=checked]:bg-primary data-[state=checked]:border-primary", !isSelected && "border-muted-foreground/30")}
                                      />
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </ScrollArea>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Reviewer */}
                  <div className="space-y-2">
                    <Label>ผู้ตรวจงาน</Label>
                    <Select
                      value={recurringTask.reviewer || "__none"}
                      onValueChange={(value) =>
                        setRecurringTask({
                          ...recurringTask,
                          reviewer: value === "__none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="(ไม่ระบุ)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">(ไม่ระบุ)</SelectItem>
                        {members.map((member) => (
                          <SelectItem
                            key={member.lineUserId}
                            value={member.lineUserId}
                          >
                            {member.displayName || member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-background pb-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeAddTask}
                      className="h-11 px-6 rounded-lg hover:bg-muted/50"
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-11 px-8 rounded-lg shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {loading ? "กำลังสร้าง..." : "สร้างงานประจำ"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
