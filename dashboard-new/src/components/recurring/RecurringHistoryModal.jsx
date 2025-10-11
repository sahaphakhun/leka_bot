import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, Users, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function RecurringHistoryModal() {
  const { groupId } = useAuth();
  const { isRecurringHistoryOpen, closeRecurringHistory, selectedRecurring } = useModal();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isRecurringHistoryOpen && selectedRecurring) {
      loadHistory();
    }
  }, [isRecurringHistoryOpen, selectedRecurring]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { getRecurringTaskHistory } = await import('../../services/api');
      const response = await getRecurringTaskHistory(groupId, selectedRecurring.id);
      setHistory(response.data || response);
    } catch (error) {
      console.error('Failed to load history:', error);
      // Sample data for development
      setHistory([
        {
          id: '1',
          taskId: 'T001',
          taskTitle: 'รายงานประจำสัปดาห์',
          createdAt: '2025-10-12T09:00:00',
          status: 'completed',
          assignedUsers: [
            { lineUserId: 'U001', displayName: 'John Doe' },
          ],
        },
        {
          id: '2',
          taskId: 'T002',
          taskTitle: 'รายงานประจำสัปดาห์',
          createdAt: '2025-10-05T09:00:00',
          status: 'completed',
          assignedUsers: [
            { lineUserId: 'U001', displayName: 'John Doe' },
          ],
        },
        {
          id: '3',
          taskId: 'T003',
          taskTitle: 'รายงานประจำสัปดาห์',
          createdAt: '2025-09-28T09:00:00',
          status: 'in-progress',
          assignedUsers: [
            { lineUserId: 'U001', displayName: 'John Doe' },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-purple-100 text-purple-800',
      scheduled: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      overdue: 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.new;
  };

  const getStatusLabel = (status) => {
    const labels = {
      new: 'ใหม่',
      scheduled: 'กำหนดเวลาแล้ว',
      'in-progress': 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      overdue: 'เกินกำหนด',
    };
    return labels[status] || status;
  };

  if (!selectedRecurring) return null;

  return (
    <Dialog open={isRecurringHistoryOpen} onOpenChange={closeRecurringHistory}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ประวัติการสร้างงาน</DialogTitle>
          <DialogDescription>
            งานที่สร้างจาก: {selectedRecurring.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{history.length}</p>
                <p className="text-sm text-muted-foreground">งานทั้งหมด</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {history.filter(h => h.status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">เสร็จสิ้น</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {history.filter(h => h.status === 'in-progress' || h.status === 'scheduled').length}
                </p>
                <p className="text-sm text-muted-foreground">กำลังดำเนินการ</p>
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={loadHistory} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              รีเฟรช
            </Button>
          </div>

          {/* History Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">กำลังโหลด...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันที่สร้าง
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        รหัสงาน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ชื่องาน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ผู้รับผิดชอบ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                          ยังไม่มีประวัติการสร้างงาน
                        </td>
                      </tr>
                    ) : (
                      history.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-gray-900">
                                  {format(new Date(item.createdAt), 'dd MMM yyyy', { locale: th })}
                                </div>
                                <div className="text-gray-500">
                                  {format(new Date(item.createdAt), 'HH:mm')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-mono text-gray-600">
                              {item.taskId}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium">
                              {item.taskTitle}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusColor(item.status)}>
                              {getStatusLabel(item.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">
                                {item.assignedUsers?.map(u => u.displayName).join(', ')}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

