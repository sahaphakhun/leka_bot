import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { 
  Plus, 
  RefreshCw, 
  Edit, 
  Trash2, 
  History, 
  Search,
  Calendar,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function RecurringTasksView() {
  const { groupId } = useAuth();
  const { openRecurringTask, openRecurringHistory, openConfirmDialog } = useModal();
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recurrenceFilter, setRecurrenceFilter] = useState('all');

  useEffect(() => {
    loadRecurringTasks();
  }, [groupId]);

  const loadRecurringTasks = async () => {
    setLoading(true);
    try {
      const { getRecurringTasks } = await import('../../services/api');
      const response = await getRecurringTasks(groupId);
      setRecurringTasks(response.data || response);
    } catch (error) {
      console.error('Failed to load recurring tasks:', error);
      // Sample data for development
      setRecurringTasks([
        {
          id: '1',
          title: 'รายงานประจำสัปดาห์',
          recurrence: 'weekly',
          isActive: true,
          nextRun: '2025-10-19T09:00:00',
          createdCount: 12,
          assignedUsers: [
            { lineUserId: 'U001', displayName: 'John Doe' },
            { lineUserId: 'U002', displayName: 'Jane Smith' },
          ],
        },
        {
          id: '2',
          title: 'ประชุมทีมรายเดือน',
          recurrence: 'monthly',
          isActive: true,
          nextRun: '2025-11-01T14:00:00',
          createdCount: 6,
          assignedUsers: [
            { lineUserId: 'U001', displayName: 'John Doe' },
          ],
        },
        {
          id: '3',
          title: 'ตรวจสอบระบบรายวัน',
          recurrence: 'daily',
          isActive: false,
          nextRun: null,
          createdCount: 45,
          assignedUsers: [
            { lineUserId: 'U003', displayName: 'Bob Johnson' },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (task) => {
    try {
      const { toggleRecurringTask } = await import('../../services/api');
      await toggleRecurringTask(groupId, task.id, !task.isActive);
      loadRecurringTasks();
    } catch (error) {
      console.error('Failed to toggle recurring task:', error);
      alert('ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const handleEdit = (task) => {
    openRecurringTask(task);
  };

  const handleDelete = (task) => {
    openConfirmDialog({
      title: 'ลบงานประจำ',
      description: `คุณแน่ใจหรือไม่ว่าต้องการลบงานประจำ "${task.title}"? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      confirmText: 'ลบ',
      cancelText: 'ยกเลิก',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const { deleteRecurringTask } = await import('../../services/api');
          await deleteRecurringTask(groupId, task.id);
          loadRecurringTasks();
        } catch (error) {
          console.error('Failed to delete recurring task:', error);
          alert('ไม่สามารถลบงานประจำได้');
        }
      }
    });
  };

  const handleViewHistory = (task) => {
    openRecurringHistory(task);
  };

  const getRecurrenceLabel = (recurrence) => {
    const labels = {
      daily: 'รายวัน',
      weekly: 'รายสัปดาห์',
      monthly: 'รายเดือน',
      quarterly: 'รายไตรมาส',
      custom: 'กำหนดเอง',
    };
    return labels[recurrence] || recurrence;
  };

  const filteredTasks = recurringTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && task.isActive) ||
      (statusFilter === 'inactive' && !task.isActive);
    const matchesRecurrence = recurrenceFilter === 'all' || task.recurrence === recurrenceFilter;
    
    return matchesSearch && matchesStatus && matchesRecurrence;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">งานประจำ</h1>
          <p className="text-muted-foreground">จัดการงานที่ทำซ้ำอัตโนมัติ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRecurringTasks}>
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          <Button onClick={() => openRecurringTask(null)}>
            <Plus className="w-4 h-4 mr-2" />
            สร้างงานประจำ
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="ค้นหางานประจำ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะ: ทั้งหมด</SelectItem>
              <SelectItem value="active">ใช้งานอยู่</SelectItem>
              <SelectItem value="inactive">หยุดใช้งาน</SelectItem>
            </SelectContent>
          </Select>

          {/* Recurrence Filter */}
          <Select value={recurrenceFilter} onValueChange={setRecurrenceFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">รอบ: ทั้งหมด</SelectItem>
              <SelectItem value="daily">รายวัน</SelectItem>
              <SelectItem value="weekly">รายสัปดาห์</SelectItem>
              <SelectItem value="monthly">รายเดือน</SelectItem>
              <SelectItem value="quarterly">รายไตรมาส</SelectItem>
              <SelectItem value="custom">กำหนดเอง</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        แสดง {filteredTasks.length} จาก {recurringTasks.length} งานประจำ
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ชื่องาน
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  รอบการทำซ้ำ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  งานถัดไป
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  จำนวนที่สร้าง
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ผู้รับผิดชอบ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  การกระทำ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    ไม่พบงานประจำ
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{task.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">
                        {getRecurrenceLabel(task.recurrence)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={task.isActive}
                          onCheckedChange={() => handleToggleActive(task)}
                        />
                        <Badge className={task.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {task.isActive ? 'ใช้งานอยู่' : 'หยุดใช้งาน'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {task.nextRun ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-gray-900">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(task.nextRun), 'dd MMM yyyy', { locale: th })}
                          </div>
                          <div className="text-gray-500">
                            {format(new Date(task.nextRun), 'HH:mm')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{task.createdCount} งาน</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{task.assignedUsers?.length || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(task)}
                          title="ดูประวัติ"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(task)}
                          title="แก้ไข"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(task)}
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

