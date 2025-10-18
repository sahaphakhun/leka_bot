import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
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
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../../lib/utils";

export default function AddTaskModal({ onTaskCreated }) {
  const { groupId } = useAuth();
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
    category: "general",
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
    category: "general",
    assignedUsers: [],
    reviewer: "",
    customRecurrence: {
      type: "weekly",
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: 1,
    },
  });

  // Members list (should be loaded from API)
  const [members, setMembers] = useState([
    { id: "1", name: "John Doe", lineUserId: "U001" },
    { id: "2", name: "Jane Smith", lineUserId: "U002" },
    { id: "3", name: "Bob Johnson", lineUserId: "U003" },
  ]);

  // Set default tab
  useEffect(() => {
    if (isAddTaskOpen) {
      setActiveTab(addTaskDefaultTab || "normal");
    }
  }, [isAddTaskOpen, addTaskDefaultTab]);

  // Load members from API
  const loadMembers = useCallback(async () => {
    if (!groupId) return;
    try {
      const { getGroupMembers } = await import("../../services/api");
      const response = await getGroupMembers(groupId);
      setMembers(response.members || response);
    } catch (error) {
      console.error("Failed to load members:", error);
    }
  }, [groupId]);

  useEffect(() => {
    if (isAddTaskOpen) {
      loadMembers();
    }
  }, [isAddTaskOpen, loadMembers]);

  const resetForms = useCallback(() => {
    setNormalTask({
      title: "",
      description: "",
      dueDate: null,
      dueTime: "",
      priority: "medium",
      category: "general",
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
      category: "general",
      assignedUsers: [],
      reviewer: "",
      customRecurrence: {
        type: "weekly",
        interval: 1,
        daysOfWeek: [],
        dayOfMonth: 1,
      },
    });
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);

      try {
        const taskData = activeTab === "normal" ? normalTask : recurringTask;
        const { createTask, createRecurringTask } = await import(
          "../../services/api"
        );

        if (activeTab === "normal") {
          await createTask(groupId, taskData);
        } else {
          await createRecurringTask(groupId, taskData);
        }

        // Success
        if (onTaskCreated) onTaskCreated();
        closeAddTask();
        resetForms();
      } catch (error) {
        console.error("Failed to create task:", error);
        alert("Failed to create task. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [
      activeTab,
      normalTask,
      recurringTask,
      groupId,
      onTaskCreated,
      closeAddTask,
      resetForms,
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
    }
  };

  return (
    <Dialog open={isAddTaskOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <Label>วันที่ครบกำหนด *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !normalTask.dueDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {normalTask.dueDate
                          ? format(normalTask.dueDate, "PPP")
                          : "เลือกวันที่"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={normalTask.dueDate}
                        onSelect={(date) =>
                          setNormalTask({ ...normalTask, dueDate: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueTime">เวลา</Label>
                  <Input
                    id="dueTime"
                    type="time"
                    value={normalTask.dueTime}
                    onChange={(e) =>
                      setNormalTask({ ...normalTask, dueTime: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  <Label>หมวดหมู่</Label>
                  <Select
                    value={normalTask.category}
                    onValueChange={(value) =>
                      setNormalTask({ ...normalTask, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">ทั่วไป</SelectItem>
                      <SelectItem value="meeting">การประชุม</SelectItem>
                      <SelectItem value="report">รายงาน</SelectItem>
                      <SelectItem value="project">โครงการ</SelectItem>
                      <SelectItem value="maintenance">บำรุงรักษา</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assigned Users */}
              <div className="space-y-2">
                <Label>ผู้รับผิดชอบ *</Label>
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {members.map((member) => (
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
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {member.displayName || member.name}
                        </label>
                      </div>
                    ))}
                  </div>
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
                </div>
              </div>

              {/* Reviewer */}
              <div className="space-y-2">
                <Label>ผู้ตรวจงาน</Label>
                <Select
                  value={normalTask.reviewer}
                  onValueChange={(value) =>
                    setNormalTask({ ...normalTask, reviewer: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="(ไม่ระบุ)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ไม่ระบุ</SelectItem>
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

              {/* Start Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>วันที่เริ่ม *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !recurringTask.startDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {recurringTask.startDate
                          ? format(recurringTask.startDate, "PPP")
                          : "เลือกวันที่"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={recurringTask.startDate}
                        onSelect={(date) =>
                          setRecurringTask({
                            ...recurringTask,
                            startDate: date,
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurring-time">เวลา</Label>
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
                  />
                </div>
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  <Label>หมวดหมู่</Label>
                  <Select
                    value={recurringTask.category}
                    onValueChange={(value) =>
                      setRecurringTask({ ...recurringTask, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">ทั่วไป</SelectItem>
                      <SelectItem value="meeting">การประชุม</SelectItem>
                      <SelectItem value="report">รายงาน</SelectItem>
                      <SelectItem value="project">โครงการ</SelectItem>
                      <SelectItem value="maintenance">บำรุงรักษา</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assigned Users */}
              <div className="space-y-2">
                <Label>ผู้รับผิดชอบ *</Label>
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {members.map((member) => (
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
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {member.displayName || member.name}
                        </label>
                      </div>
                    ))}
                  </div>
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
                </div>
              </div>

              {/* Reviewer */}
              <div className="space-y-2">
                <Label>ผู้ตรวจงาน</Label>
                <Select
                  value={recurringTask.reviewer}
                  onValueChange={(value) =>
                    setRecurringTask({ ...recurringTask, reviewer: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="(ไม่ระบุ)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ไม่ระบุ</SelectItem>
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
