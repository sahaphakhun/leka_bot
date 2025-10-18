import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';

export default function AddTaskModal({ onTaskCreated }) {
  const { groupId, userId, canModify, hasPermission } = useAuth();
  const { isAddTaskOpen, closeAddTask, selectedTask } = useModal();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [errors, setErrors] = useState({});

  // Normal task form
  const [normalTask, setNormalTask] = useState({
    title: '',
    description: '',
    dueDate: null,
    dueTime: '',
    priority: 'medium',
    category: 'general',
    assignedUsers: [],
    reviewer: '',
  });

  // Recurring task form
  const [recurringTask, setRecurringTask] = useState({
    title: '',
    description: '',
    recurrence: 'weekly',
    startDate: null,
    time: '',
    priority: 'medium',
    category: 'general',
    assignedUsers: [],
    reviewer: '',
    customRecurrence: {
      type: 'weekly',
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: 1,
    },
  });

  // Set default tab
  useEffect(() => {
    if (selectedTask?.defaultTab) {
      setActiveTab(selectedTask.defaultTab);
    }
  }, [selectedTask]);

  // Load members from API when modal opens
  useEffect(() => {
    if (isAddTaskOpen && groupId) {
      loadMembers();
    }
  }, [isAddTaskOpen, groupId]);

  // Reset forms when modal closes
  useEffect(() => {
    if (!isAddTaskOpen) {
      resetForms();
      setErrors({});
    }
  }, [isAddTaskOpen]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const { getGroupMembers } = await import('../../services/api');
      const response = await getGroupMembers(groupId);
      const membersList = response.members || response.data || response || [];
      setMembers(membersList);
      console.log('✅ Loaded members:', membersList.length);
    } catch (error) {
      console.error('❌ Failed to load members:', error);
      toast({
        title: 'ไม่สามารถโหลดรายชื่อสมาชิก',
        description: error.message || 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const validateForm = (taskData, isRecurring = false) => {
    const newErrors = {};

    // Validate title
    if (!taskData.title || taskData.title.trim().length === 0) {
      newErrors.title = 'กรุณาระบุชื่องาน';
    } else if (taskData.title.length > 200) {
      newErrors.title = 'ชื่องานต้องไม่เกิน 200 ตัวอักษร';
    }

    // Validate description
    if (taskData.description && taskData.description.length > 2000) {
      newErrors.description = 'รายละเอียดต้องไม่เกิน 2000 ตัวอักษร';
    }

    // Validate due date for normal tasks
    if (!isRecurring) {
      if (!taskData.dueDate) {
        newErrors.dueDate = 'กรุณาเลือกวันที่ครบกำหนด';
      } else {
        const selectedDate = new Date(taskData.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          newErrors.dueDate = 'ไม่สามารถเลือกวันที่ในอดีตได้';
        }
      }
    }

    // Validate start date for recurring tasks
    if (isRecurring) {
      if (!taskData.startDate) {
        newErrors.startDate = 'กรุณาเลือกวันที่เริ่มต้น';
      }

      // Validate custom recurrence
      if (taskData.recurrence === 'custom') {
        if (taskData.customRecurrence.type === 'weekly' &&
            taskData.customRecurrence.daysOfWeek.length === 0) {
          newErrors.customRecurrence = 'กรุณาเลือกวันในสัปดาห์อย่างน้อย 1 วัน';
        }
      }
    }

    // Validate assigned users
    if (!taskData.assignedUsers || taskData.assignedUsers.length === 0) {
      newErrors.assignedUsers = 'กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check permissions
    const requiredPermission = activeTab === 'normal' ? 'create_task' : 'create_recurring';
    if (!hasPermission(requiredPermission)) {
      toast({
        title: 'ไม่มีสิทธิ์',
        description: 'คุณไม่มีสิทธิ์สร้างงาน กรุณาเข้าผ่าน LINE ส่วนตัว',
        variant: 'destructive',
      });
      return;
    }

    const taskData = activeTab === 'normal' ? normalTask : recurringTask;
    const isRecurring = activeTab === 'recurring';

    // Validate form
    const validationErrors = validateForm(taskData, isRecurring);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณาตรวจสอบข้อมูลที่กรอกให้ครบถ้วน',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const { createTask, createRecurringTask } = await import('../../services/api');

      if (activeTab === 'normal') {
        // Prepare normal task data
        const taskPayload = {
          title: taskData.title.trim(),
          description: taskData.description?.trim() || '',
          dueDate: taskData.dueDate,
          dueTime: taskData.dueTime || null,
          priority: taskData.priority || 'medium',
          category: taskData.category || 'general',
          assignedUsers: taskData.assignedUsers,
          reviewer: taskData.reviewer || null,
          createdBy: userId, // Include creator's userId
        };

        console.log('📤 Creating normal task:', taskPayload);
        await createTask(groupId, taskPayload);

        toast({
          title: '✅ สร้างงานสำเร็จ',
          description: `งาน "${taskData.title}" ถูกสร้างแล้ว`,
        });
      } else {
        // Prepare recurring task data
        const recurringPayload = {
          title: taskData.title.trim(),
          description: taskData.description?.trim() || '',
          recurrence: taskData.recurrence,
          startDate: taskData.startDate,
          time: taskData.time || null,
          priority: taskData.priority || 'medium',
          category: taskData.category || 'general',
          assignedUsers: taskData.assignedUsers,
          reviewer: taskData.reviewer || null,
          createdBy: userId,
        };

        // Add custom recurrence settings if needed
        if (taskData.recurrence === 'custom') {
          recurringPayload.customRecurrence = taskData.customRecurrence;
        }

        console.log('📤 Creating recurring task:', recurringPayload);
        await createRecurringTask(groupId, recurringPayload);

        toast({
          title: '✅ สร้างงานประจำสำเร็จ',
          description: `งานประจำ "${taskData.title}" ถูกสร้างแล้ว`,
        });
      }

      // Success - close modal and refresh
      if (onTaskCreated) {
        onTaskCreated();
      }
      closeAddTask();
      resetForms();
    } catch (error) {
      console.error('❌ Failed to create task:', error);

      let errorMessage = 'ไม่สามารถสร้างงานได้ กรุณาลองใหม่อีกครั้ง';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'เกิดข้อผิดพลาด',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setNormalTask({
      title: '',
      description: '',
      dueDate: null,
      dueTime: '',
      priority: 'medium',
      category: 'general',
      assignedUsers: [],
      reviewer: '',
    });
    setRecurringTask({
      title: '',
      description: '',
      recurrence: 'weekly',
      startDate: null,
      time: '',
      priority: 'medium',
      category: 'general',
      assignedUsers: [],
      reviewer: '',
      customRecurrence: {
        type: 'weekly',
        interval: 1,
        daysOfWeek: [],
        dayOfMonth: 1,
      },
    });
    setErrors({});
  };

  const handleAssigneeToggle = (userId, isNormal = true) => {
    const task = isNormal ? normalTask : recurringTask;
    const setTask = isNormal ? setNormalTask : setRecurringTask;

    const assignedUsers = task.assignedUsers.includes(userId)
      ? task.assignedUsers.filter(id => id !== userId)
      : [...task.assignedUsers, userId];

    setTask({ ...task, assignedUsers });

    // Clear error when user selects assignees
    if (assignedUsers.length > 0) {
      setErrors(prev => ({ ...prev, assignedUsers: undefined }));
    }
  };

  const handleSelectAll = (isNormal = true) => {
    const task = isNormal ? normalTask : recurringTask;
    const setTask = isNormal ? setNormalTask : setRecurringTask;

    setTask({ ...task, assignedUsers: members.map(m => m.lineUserId) });
    setErrors(prev => ({ ...prev, assignedUsers: undefined }));
  };

  const handleClearAll = (isNormal = true) => {
    const task = isNormal ? normalTask : recurringTask;
    const setTask = isNormal ? setNormalTask : setRecurringTask;

    setTask({ ...task, assignedUsers: [] });
  };

  const handleDayOfWeekToggle = (day) => {
    const daysOfWeek = recurringTask.customRecurrence.daysOfWeek.includes(day)
      ? recurringTask.customRecurrence.daysOfWeek.filter(d => d !== day)
      : [...recurringTask.customRecurrence.daysOfWeek, day];

    setRecurringTask({
      ...recurringTask,
      customRecurrence: {
        ...recurringTask.customRecurrence,
        daysOfWeek,
      },
    });
  };

  // Check if user has permission to create tasks
  const canCreate = canModify();

  return (
    <Dialog open={isAddTaskOpen} onOpenChange={closeAddTask}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มงานใหม่</DialogTitle>
          <DialogDescription>
            สร้างงานใหม่หรืองานประจำ
          </DialogDescription>
        </DialogHeader>

        {!canCreate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  ไม่สามารถสร้างงานได้
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  คุณไม่มีสิทธิ์สร้างงาน กรุณาเข้าผ่าน LINE ส่วนตัว
                </p>
              </div>
            </div>
          </div>
        )}

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
                <Label htmlFor="title">
                  ชื่องาน <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={normalTask.title}
                  onChange={(e) => {
                    setNormalTask({ ...normalTask, title: e.target.value });
                    setErrors(prev => ({ ...prev, title: undefined }));
                  }}
                  placeholder="ระบุชื่องาน"
                  maxLength={200}
                  disabled={!canCreate}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title}</p>
                )}
                <p className="text-xs text-gray-500">{normalTask.title.length}/200</p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea
                  id="description"
                  value={normalTask.description}
                  onChange={(e) => {
                    setNormalTask({ ...normalTask, description: e.target.value });
                    setErrors(prev => ({ ...prev, description: undefined }));
                  }}
                  placeholder="ระบุรายละเอียด"
                  rows={3}
                  maxLength={2000}
                  disabled={!canCreate}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description}</p>
                )}
                <p className="text-xs text-gray-500">{normalTask.description.length}/2000</p>
              </div>

              {/* Due Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    วันที่ครบกำหนด <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={!canCreate}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !normalTask.dueDate && "text-muted-foreground",
                          errors.dueDate && "border-red-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {normalTask.dueDate ? format(normalTask.dueDate, "PPP", { locale: th }) : "เลือกวันที่"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={normalTask.dueDate}
                        onSelect={(date) => {
                          setNormalTask({ ...normalTask, dueDate: date });
                          setErrors(prev => ({ ...prev, dueDate: undefined }));
                        }}
                        initialFocus
                        locale={th}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.dueDate && (
                    <p className="text-sm text-red-500">{errors.dueDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueTime">เวลา</Label>
                  <Input
                    id="dueTime"
                    type="time"
                    value={normalTask.dueTime}
                    onChange={(e) => setNormalTask({ ...normalTask, dueTime: e.target.value })}
                    disabled={!canCreate}
                  />
                </div>
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ความสำคัญ</Label>
                  <Select
                    value={normalTask.priority}
                    onValueChange={(value) => setNormalTask({ ...normalTask, priority: value })}
                    disabled={!canCreate}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🟢 ต่ำ</SelectItem>
                      <SelectItem value="medium">🟡 ปานกลาง</SelectItem>
                      <SelectItem value="high">🟠 สูง</SelectItem>
                      <SelectItem value="urgent">🔴 ด่วน</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>หมวดหมู่</Label>
                  <Select
                    value={normalTask.category}
                    onValueChange={(value) => setNormalTask({ ...normalTask, category: value })}
                    disabled={!canCreate}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">📋 ทั่วไป</SelectItem>
                      <SelectItem value="meeting">🤝 การประชุม</SelectItem>
                      <SelectItem value="report">📊 รายงาน</SelectItem>
                      <SelectItem value="project">🎯 โครงการ</SelectItem>
                      <SelectItem value="maintenance">🔧 บำรุงรักษา</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assigned Users */}
              <div className="space-y-2">
                <Label>
                  ผู้รับผิดชอบ <span className="text-red-500">*</span>
                </Label>
                <div className={cn(
                  "border rounded-lg p-4 space-y-3",
                  errors.assignedUsers && "border-red-500"
                )}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      เลือก {normalTask.assignedUsers.length} คน
                    </span>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAll(true)}
                        disabled={loadingMembers || !canCreate}
                      >
                        เลือกทั้งหมด
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleClearAll(true)}
                        disabled={loadingMembers || !canCreate}
                      >
                        ล้าง
                      </Button>
                    </div>
                  </div>

                  {loadingMembers ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      <span className="ml-2 text-sm text-gray-600">กำลังโหลดรายชื่อ...</span>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">
                      ไม่พบสมาชิกในกลุ่ม
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {members.map((member) => (
                        <div key={member.lineUserId} className="flex items-center space-x-2">
                          <Checkbox
                            id={`assignee-${member.lineUserId}`}
                            checked={normalTask.assignedUsers.includes(member.lineUserId)}
                            onCheckedChange={() => handleAssigneeToggle(member.lineUserId, true)}
                            disabled={!canCreate}
                          />
                          <label
                            htmlFor={`assignee-${member.lineUserId}`}
                            className="text-sm flex-1 cursor-pointer"
                          >
                            {member.displayName || member.name || member.lineUserId}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {errors.assignedUsers && (
                  <p className="text-sm text-red-500">{errors.assignedUsers}</p>
                )}
              </div>

              {/* Reviewer (Optional) */}
              <div className="space-y-2">
                <Label>ผู้ตรวจสอบ (ถ้ามี)</Label>
                <Select
                  value={normalTask.reviewer}
                  onValueChange={(value) => setNormalTask({ ...normalTask, reviewer: value })}
                  disabled={!canCreate || loadingMembers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ตรวจสอบ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ไม่มี</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.lineUserId} value={member.lineUserId}>
                        {member.displayName || member.name || member.lineUserId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeAddTask}
                  disabled={loading}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !canCreate}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังสร้าง...
                    </>
                  ) : (
                    '✅ สร้างงาน'
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Recurring Task Form */}
          <TabsContent value="recurring">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="recurring-title">
                  ชื่องาน <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="recurring-title"
                  value={recurringTask.title}
                  onChange={(e) => {
                    setRecurringTask({ ...recurringTask, title: e.target.value });
                    setErrors(prev => ({ ...prev, title: undefined }));
                  }}
                  placeholder="ระบุชื่องาน"
                  maxLength={200}
                  disabled={!canCreate}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title}</p>
                )}
                <p className="text-xs text-gray-500">{recurringTask.title.length}/200</p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="recurring-description">รายละเอียด</Label>
                <Textarea
                  id="recurring-description"
                  value={recurringTask.description}
                  onChange={(e) => {
                    setRecurringTask({ ...recurringTask, description: e.target.value });
                    setErrors(prev => ({ ...prev, description: undefined }));
                  }}
                  placeholder="ระบุรายละเอียด"
                  rows={3}
                  maxLength={2000}
                  disabled={!canCreate}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description}</p>
                )}
                <p className="text-xs text-gray-500">{recurringTask.description.length}/2000</p>
              </div>

              {/* Recurrence Pattern */}
              <div className="space-y-2">
                <Label>รูปแบบการทำซ้ำ</Label>
                <Select
                  value={recurringTask.recurrence}
                  onValueChange={(value) => setRecurringTask({ ...recurringTask, recurrence: value })}
                  disabled={!canCreate}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">📅 ทุกวัน</SelectItem>
                    <SelectItem value="weekly">📆 ทุกสัปดาห์</SelectItem>
                    <SelectItem value="biweekly">📆 ทุก 2 สัปดาห์</SelectItem>
                    <SelectItem value="monthly">🗓️ ทุกเดือน</SelectItem>
                    <SelectItem value="custom">⚙️ กำหนดเอง</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Recurrence Settings */}
              {recurringTask.recurrence === 'custom' && (
                <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                  <Label className="text-sm font-medium">การตั้งค่าแบบกำหนดเอง</Label>

                  <div className="space-y-2">
                    <Label className="text-sm">ประเภท</Label>
                    <Select
                      value={recurringTask.customRecurrence.type}
                      onValueChange={(value) => setRecurringTask({
                        ...recurringTask,
                        customRecurrence: { ...recurringTask.customRecurrence, type: value }
                      })}
                      disabled={!canCreate}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">รายวัน</SelectItem>
                        <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                        <SelectItem value="monthly">รายเดือน</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {recurringTask.customRecurrence.type === 'weekly' && (
                    <div className="space-y-2">
                      <Label className="text-sm">
                        เลือกวันในสัปดาห์ <span className="text-red-500">*</span>
                      </Label>
                      <div className="grid grid-cols-7 gap-2">
                        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, index) => (
                          <Button
                            key={index}
                            type="button"
                            variant={recurringTask.customRecurrence.daysOfWeek.includes(index) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleDayOfWeekToggle(index)}
                            disabled={!canCreate}
                            className="h-10"
