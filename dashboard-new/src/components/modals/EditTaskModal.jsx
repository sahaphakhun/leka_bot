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

export default function EditTaskModal({ onTaskUpdated }) {
  const { groupId } = useAuth();
  const { isEditTaskOpen, closeEditTask, selectedTask } = useModal();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: null,
    dueTime: '',
    priority: 'medium',
    category: 'general',
    assignedUsers: [],
    reviewer: '',
  });

  // Load task data when modal opens
  useEffect(() => {
    if (isEditTaskOpen && selectedTask) {
      setFormData({
        title: selectedTask.title || '',
        description: selectedTask.description || '',
        dueDate: selectedTask.dueDate ? new Date(selectedTask.dueDate) : null,
        dueTime: selectedTask.dueTime || '',
        priority: selectedTask.priority || 'medium',
        category: selectedTask.category || 'general',
        assignedUsers: selectedTask.assignedUsers?.map(u => u.lineUserId || u) || [],
        reviewer: selectedTask.reviewer || '',
      });
    }
  }, [isEditTaskOpen, selectedTask]);

  // Load members
  useEffect(() => {
    if (isEditTaskOpen && groupId) {
      loadMembers();
    }
  }, [isEditTaskOpen, groupId]);

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
      const { updateTask } = await import('../../services/api');
      await updateTask(groupId, selectedTask.id, formData);

      // Success
      if (onTaskUpdated) onTaskUpdated();
      closeEditTask();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task. Please try again.');
    } finally {
      setLoading(false);
    }
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
    <Dialog open={isEditTaskOpen} onOpenChange={closeEditTask}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขงาน</DialogTitle>
          <DialogDescription>
            แก้ไขข้อมูลงาน
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
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, "PPP") : "เลือกวันที่"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={(date) => setFormData({ ...formData, dueDate: date })}
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
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
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
            <Button type="button" variant="outline" onClick={closeEditTask}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

