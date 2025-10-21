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
import { CalendarIcon, X, Search } from "lucide-react";
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
            reviewerUserId: normalTask.reviewer || null,
            requireAttachment: false,
            createdBy: userId, // Required by backend
          };
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

  return (
    <Dialog open={isAddTaskOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>เพิ่มงานใหม่</DialogTitle>
          <DialogDescription>สร้างงานใหม่หรืองานประจำ</DialogDescription>
        </DialogHeader>

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
                      {/* Search Input */}
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="ค้นหาชื่อสมาชิก..."
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* Members List */}
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {filteredMembers.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            ไม่พบสมาชิกที่ชื่อ "{memberSearchQuery}"
                          </p>
                        ) : (
                          filteredMembers.map((member) => (
                            <div
                              key={member.lineUserId}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`assignee-${member.lineUserId}`}
                                checked={normalTask.assignedUsers.includes(
                                  member.lineUserId,
                                )}
                                onCheckedChange={() =>
                                  handleAssigneeToggle(member.lineUserId, true)
                                }
                              />
                              <label
                                htmlFor={`assignee-${member.lineUserId}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {member.displayName || member.name}
                              </label>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectAll(true)}
                        >
                          เลือกทั้งหมด
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleClearAll(true)}
                        >
                          ล้างทั้งหมด
                        </Button>
                      </div>
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
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeAddTask}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={loading}>
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
                      {/* Search Input */}
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="ค้นหาชื่อสมาชิก..."
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* Members List */}
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {filteredMembers.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            ไม่พบสมาชิกที่ชื่อ "{memberSearchQuery}"
                          </p>
                        ) : (
                          filteredMembers.map((member) => (
                            <div
                              key={member.lineUserId}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`recurring-assignee-${member.lineUserId}`}
                                checked={recurringTask.assignedUsers.includes(
                                  member.lineUserId,
                                )}
                                onCheckedChange={() =>
                                  handleAssigneeToggle(member.lineUserId, false)
                                }
                              />
                              <label
                                htmlFor={`recurring-assignee-${member.lineUserId}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {member.displayName || member.name}
                              </label>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectAll(false)}
                        >
                          เลือกทั้งหมด
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleClearAll(false)}
                        >
                          ล้างทั้งหมด
                        </Button>
                      </div>
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
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeAddTask}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "กำลังสร้าง..." : "สร้างงานประจำ"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
