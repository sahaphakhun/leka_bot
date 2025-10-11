import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Plus, Send, Trash2 } from 'lucide-react';
import SubmitTaskRow from './SubmitTaskRow';

export default function SubmitMultipleView() {
  const { groupId } = useAuth();
  const [tasks, setTasks] = useState([{ id: 1, title: '', assignee: '', dueDate: '', priority: 'medium', category: 'general' }]);
  const [loading, setLoading] = useState(false);

  const addTask = () => {
    const newId = Math.max(...tasks.map(t => t.id)) + 1;
    setTasks([...tasks, { id: newId, title: '', assignee: '', dueDate: '', priority: 'medium', category: 'general' }]);
  };

  const removeTask = (id) => {
    if (tasks.length === 1) {
      alert('ต้องมีอย่างน้อย 1 งาน');
      return;
    }
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateTask = (id, field, value) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSubmitAll = async () => {
    // Validate
    const emptyTasks = tasks.filter(t => !t.title.trim());
    if (emptyTasks.length > 0) {
      alert('กรุณากรอกชื่องานให้ครบทุกรายการ');
      return;
    }

    setLoading(true);
    try {
      const { createMultipleTasks } = await import('../../services/api');
      await createMultipleTasks(groupId, tasks);
      alert(`สร้างงานสำเร็จ ${tasks.length} รายการ`);
      // Reset
      setTasks([{ id: 1, title: '', assignee: '', dueDate: '', priority: 'medium', category: 'general' }]);
    } catch (error) {
      console.error('Failed to create tasks:', error);
      alert('ไม่สามารถสร้างงานได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ส่งงานหลายรายการ</h1>
          <p className="text-muted-foreground">สร้างหลายงานพร้อมกันในคราวเดียว</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addTask}>
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มงาน
          </Button>
          <Button onClick={handleSubmitAll} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'กำลังส่ง...' : `ส่งทั้งหมด (${tasks.length})`}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการงาน</CardTitle>
          <CardDescription>
            กรอกข้อมูลงานทีละรายการ คลิก "เพิ่มงาน" เพื่อเพิ่มงานใหม่
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.map((task, index) => (
              <SubmitTaskRow
                key={task.id}
                task={task}
                index={index}
                onUpdate={updateTask}
                onRemove={removeTask}
                canRemove={tasks.length > 1}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
        <div>
          <p className="font-medium">จำนวนงานทั้งหมด: {tasks.length} รายการ</p>
          <p className="text-sm text-gray-600">
            งานที่กรอกข้อมูลครบ: {tasks.filter(t => t.title.trim()).length} รายการ
          </p>
        </div>
        <Button onClick={handleSubmitAll} disabled={loading} size="lg">
          <Send className="w-4 h-4 mr-2" />
          ส่งทั้งหมด
        </Button>
      </div>
    </div>
  );
}
