import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

export default function RecurringTaskModal({ onTaskCreated, onTaskUpdated }) {
  const { groupId } = useAuth();
  const { isRecurringTaskOpen, closeRecurringTask, selectedRecurring } = useModal();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    recurrence: 'weekly',
    startDate: null,
    time: '09:00',
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

  const isEditMode = !!selectedRecurring;

  useEffect(() => {
    if (isRecurringTaskOpen) {
      if (selectedRecurring) {
        // Edit mode - load existing data
        setFormData({
          title: selectedRecurring.title || '',
          description: selectedRecurring.description || '',
          recurrence: selectedRecurring.recurrence || 'weekly',
          startDate: selectedRecurring.startDate ? new Date(selectedRecurring.startDate) : null,
          time: selectedRecurring.time || '09:00',
          priority: selectedRecurring.priority || 'medium',
          category: selectedRecurring.category || 'general',
          assignedUsers: selectedRecurring.assignedUsers?.map(u => u.lineUserId || u) || [],
          reviewer: selectedRecurring.reviewer || '',
          customRecurrence: selectedRecurring.customRecurrence || {
            type: 'weekly',
            interval: 1,
            daysOfWeek: [],
            dayOfMonth: 1,
          },
        });
      } else {
        // Create mode - reset form
        resetForm();
      }
      loadMembers();
    }
  }, [isRecurringTaskOpen, selectedRecurring]);

  const loadMembers = async () => {
    try {
      const { getGroupMembers } = await import('../../services/api');
      const response = await getGroupMembers(groupId);
      setMembers(response.members || response);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { createRecurringTask, updateRecurringTask } = await import('../../services/api');

      if (isEditMode) {
        await updateRecurringTask(groupId, selectedRecurring.id, formData);
        if (onTaskUpdated) onTaskUpdated();
      } else {
        await createRecurringTask(groupId, formData);
        if (onTaskCreated) onTaskCreated();
      }

      closeRecurringTask();
      resetForm();
    } catch (error) {
      console.error('Failed to save recurring task:', error);
      alert('ไม่สามารถบันทึกงานประจำได้');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      recurrence: 'weekly',
      startDate: null,
      time: '09:00',
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
  };

  const handleAssigneeToggle = (userId) => {
    const assignedUsers = formData.assignedUsers.includes(userId)
      ? formData.assignedUsers.filter(id => id !== userId)
      : [...formData.assignedUsers, userId];

    setFormData({ ...formData, assignedUsers });
  };

  const handleSelectAll = () => {
    setFormData({ ...formData, assignedUsers: members.map(m => m.lineUserId) });
  };

  const handleClearAll = () => {
    setFormData({ ...formData, assignedUsers: [] });
  };

  return (
    <Dialog open={isRecurringTaskOpen} onOpenChange={closeRecurringTask}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'แก้ไขงานประจำ' : 'สร้างงานประจำใหม่'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'แก้ไขข้อมูลงานประจำ' : 'สร้างงานที่จะทำซ้ำอัตโนมัติ'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">ชื่องาน *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="ระบุชื่องาน"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">รายละเอียด</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="ระบุรายละเอียด"
              rows={3}
            />
          </div>

          {/* Recurrence */}
          <div className="space-y-2">
            <Label>รอบการทำซ้ำ *</Label>
            <Select
              value={formData.recurrence}
              onValueChange={(value) => setFormData({ ...formData, recurrence: value })}
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

          {/* Custom Recurrence Settings */}
          {formData.recurrence === 'custom' && (
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">ตั้งค่ารอบการทำซ้ำ</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ประเภท</Label>
                  <Select
                    value={formData.customRecurrence.type}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      customRecurrence: { ...formData.customRecurrence, type: value }
                    })}
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

                <div className="space-y-2">
                  <Label>ทุกๆ</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.customRecurrence.interval}
                    onChange={(e) => setFormData({
                      ...formData,
                      customRecurrence: { ...formData.customRecurrence, interval: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>

              {formData.customRecurrence.type === 'weekly' && (
                <div className="space-y-2">
                  <Label>วันในสัปดาห์</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((day, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant={formData.customRecurrence.daysOfWeek.includes(index) ? 'default' : 'outline'}
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const days = formData.customRecurrence.daysOfWeek.includes(index)
                            ? formData.customRecurrence.daysOfWeek.filter(d => d !== index)
                            : [...formData.customRecurrence.daysOfWeek, index];
                          setFormData({
                            ...formData,
                            customRecurrence: { ...formData.customRecurrence, daysOfWeek: days }
                          });
                        }}
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {formData.customRecurrence.type === 'monthly' && (
                <div className="space-y-2">
                  <Label>วันที่ในเดือน</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.customRecurrence.dayOfMonth}
                    onChange={(e) => setFormData({
                      ...formData,
                      customRecurrence: { ...formData.customRecurrence, dayOfMonth: parseInt(e.target.value) }
                    })}
                  />
                </div>
              )}
            </div>
          )}

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
                      !formData.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(formData.startDate, "PPP") : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => setFormData({ ...formData, startDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">เวลา</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          {/* Priority & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ความสำคัญ</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
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
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
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
                  <div key={member.lineUserId} className="flex items-center space-x-2">
                    <Checkbox
                      id={`assignee-${member.lineUserId}`}
                      checked={formData.assignedUsers.includes(member.lineUserId)}
                      onCheckedChange={() => handleAssigneeToggle(member.lineUserId)}
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
                  onClick={handleSelectAll}
                >
                  เลือกทั้งหมด
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
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
              value={formData.reviewer}
              onValueChange={(value) => setFormData({ ...formData, reviewer: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="(ไม่ระบุ)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ไม่ระบุ</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.lineUserId} value={member.lineUserId}>
                    {member.displayName || member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={closeRecurringTask}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : (isEditMode ? 'บันทึก' : 'สร้างงานประจำ')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

