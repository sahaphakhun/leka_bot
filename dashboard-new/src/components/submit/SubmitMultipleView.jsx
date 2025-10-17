import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Plus, Send } from 'lucide-react';
import SubmitTaskRow from './SubmitTaskRow';

export default function SubmitMultipleView() {
  const { groupId, userId, currentUser } = useAuth();
  const readOnly = !userId;
  const [tasks, setTasks] = useState([
    { id: 1, title: '', assignee: '', dueDate: '', priority: 'medium', category: 'general' },
  ]);
  const [loading, setLoading] = useState(false);

  const addTask = () => {
    const newId = Math.max(...tasks.map((t) => t.id)) + 1;
    setTasks([
      ...tasks,
      { id: newId, title: '', assignee: '', dueDate: '', priority: 'medium', category: 'general' },
    ]);
  };

  const removeTask = (id) => {
    if (tasks.length === 1) {
      alert('ต้องมีอย่างน้อย 1 งาน');
      return;
    }
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const updateTask = (id, field, value) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, [field]: value } : task)));
  };

  const handleSubmitAll = async () => {
    if (readOnly) {
      alert('โหมดดูอย่างเดียวไม่สามารถส่งงานได้');
      return;
    }

    const emptyTasks = tasks.filter((task) => !task.title.trim());
    if (emptyTasks.length > 0) {
      alert('กรุณากรอกชื่องานให้ครบทุกรายการ');
      return;
    }

    setLoading(true);
    try {
      const { createMultipleTasks } = await import('../../services/api');
      await createMultipleTasks(groupId, tasks);
      alert(`สร้างงานสำเร็จ ${tasks.length} รายการ`);
      setTasks([
        { id: 1, title: '', assignee: '', dueDate: '', priority: 'medium', category: 'general' },
      ]);
    } catch (error) {
      console.error('Failed to create tasks:', error);
      alert('ไม่สามารถสร้างงานได้');
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter((task) => task.title.trim()).length,
  }), [tasks]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ส่งงานหลายรายการ</h1>
          <p className="text-muted-foreground">สร้างหลายงานพร้อมกันในขั้นตอนเดียว</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addTask}>
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มแถว
          </Button>
          <Button onClick={handleSubmitAll} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'กำลังส่ง...' : `ส่งทั้งหมด (${summary.total})`}
          </Button>
        </div>
      </div>

      {readOnly && (
        <Alert variant="warning">
          <AlertTitle>โหมดดูอย่างเดียว</AlertTitle>
          <AlertDescription>
            กรุณาเข้าสู่ระบบผ่านลิงก์ใน LINE ส่วนตัวเพื่อส่งงานและแนบไฟล์ได้ครบถ้วน
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลผู้ใช้งาน</CardTitle>
          <CardDescription>
            ผู้ส่งงาน: {currentUser?.displayName || currentUser?.name || userId || 'ไม่ทราบชื่อ'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>
            <p>จำนวนงานที่ต้องกรอก: {summary.total} รายการ</p>
            <p>งานที่กรอกข้อมูลครบ: {summary.completed} รายการ</p>
          </div>
          <div className="text-right">
            <p>กลุ่ม: {groupId || 'ไม่ระบุ'}</p>
            <p>สถานะ: {readOnly ? 'ดูอย่างเดียว' : 'พร้อมส่งงาน'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>รายการงาน</CardTitle>
          <CardDescription>
            กรอกข้อมูลงานทีละรายการ สามารถเพิ่มแถวเพื่อสร้างงานใหม่ได้ไม่จำกัด
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

      <Alert>
        <AlertTitle>ขั้นตอนแนะนำ</AlertTitle>
        <AlertDescription>
          1) กรอกชื่องานและผู้รับผิดชอบ 2) ระบุวันกำหนดส่ง (หากมี) 3) ตรวจสอบก่อนกด "ส่งทั้งหมด"
        </AlertDescription>
      </Alert>
    </div>
  );
}
