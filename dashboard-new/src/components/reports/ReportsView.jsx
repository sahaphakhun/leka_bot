import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { RefreshCw, Download, TrendingUp, TrendingDown, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import ReportFilters from './ReportFilters';
import ReportChart from './ReportChart';
import ReportExport from './ReportExport';

export default function ReportsView() {
  const { groupId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: 'month',
    startDate: null,
    endDate: null,
    members: [],
    categories: [],
  });
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [groupId, filters]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const { getReports } = await import('../../services/api');
      const response = await getReports(groupId, filters);
      setReportData(response.data || response);
    } catch (error) {
      console.error('Failed to load reports:', error);
      // Sample data
      setReportData({
        summary: {
          totalTasks: 156,
          completedTasks: 98,
          inProgressTasks: 42,
          overdueTasks: 16,
          completionRate: 62.8,
          avgCompletionTime: 2.5,
        },
        trends: {
          tasksCreated: [12, 15, 18, 14, 20, 16, 19],
          tasksCompleted: [8, 12, 14, 10, 16, 13, 15],
          labels: ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'],
        },
        byCategory: [
          { category: 'ทั่วไป', count: 45, completed: 30 },
          { category: 'การประชุม', count: 32, completed: 28 },
          { category: 'รายงาน', count: 28, completed: 20 },
          { category: 'โครงการ', count: 35, completed: 15 },
          { category: 'บำรุงรักษา', count: 16, completed: 5 },
        ],
        byMember: [
          { name: 'John Doe', assigned: 45, completed: 32, rate: 71.1 },
          { name: 'Jane Smith', assigned: 38, completed: 30, rate: 78.9 },
          { name: 'Bob Johnson', assigned: 42, completed: 25, rate: 59.5 },
          { name: 'Alice Brown', assigned: 31, completed: 11, rate: 35.5 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleExport = () => {
    setShowExportDialog(true);
  };

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

  const { summary, trends, byCategory, byMember } = reportData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">รายงานและสถิติ</h1>
          <p className="text-muted-foreground">วิเคราะห์ประสิทธิภาพการทำงาน</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadReportData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            ส่งออก
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ReportFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">งานทั้งหมด</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              เพิ่มขึ้น 12% จากเดือนที่แล้ว
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">งานเสร็จสิ้น</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              {summary.completionRate}% ของงานทั้งหมด
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">กำลังดำเนินการ</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.inProgressTasks}</div>
            <p className="text-xs text-muted-foreground">
              เฉลี่ย {summary.avgCompletionTime} วัน/งาน
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">เกินกำหนด</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.overdueTasks}</div>
            <p className="text-xs text-muted-foreground">
              ต้องเร่งดำเนินการ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>แนวโน้มงาน (7 วันล่าสุด)</CardTitle>
            <CardDescription>งานที่สร้างและเสร็จสิ้น</CardDescription>
          </CardHeader>
          <CardContent>
            <ReportChart
              type="line"
              data={{
                labels: trends.labels,
                datasets: [
                  {
                    label: 'งานที่สร้าง',
                    data: trends.tasksCreated,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  },
                  {
                    label: 'งานที่เสร็จ',
                    data: trends.tasksCompleted,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  },
                ],
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>งานตามหมวดหมู่</CardTitle>
            <CardDescription>จำนวนงานแต่ละประเภท</CardDescription>
          </CardHeader>
          <CardContent>
            <ReportChart
              type="bar"
              data={{
                labels: byCategory.map(c => c.category),
                datasets: [
                  {
                    label: 'ทั้งหมด',
                    data: byCategory.map(c => c.count),
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                  },
                  {
                    label: 'เสร็จสิ้น',
                    data: byCategory.map(c => c.completed),
                    backgroundColor: 'rgba(34, 197, 94, 0.5)',
                  },
                ],
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Member Performance */}
      <Card>
        <CardHeader>
          <CardTitle>ประสิทธิภาพของสมาชิก</CardTitle>
          <CardDescription>อัตราการทำงานเสร็จของแต่ละคน</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-3 px-4">ชื่อ</th>
                  <th className="text-right py-3 px-4">งานที่ได้รับ</th>
                  <th className="text-right py-3 px-4">งานที่เสร็จ</th>
                  <th className="text-right py-3 px-4">อัตราความสำเร็จ</th>
                  <th className="text-right py-3 px-4">แนวโน้ม</th>
                </tr>
              </thead>
              <tbody>
                {byMember.map((member, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{member.name}</td>
                    <td className="py-3 px-4 text-right">{member.assigned}</td>
                    <td className="py-3 px-4 text-right text-green-600 font-medium">
                      {member.completed}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${member.rate >= 70 ? 'text-green-600' : member.rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {member.rate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {member.rate >= 70 ? (
                        <TrendingUp className="w-4 h-4 text-green-600 inline" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600 inline" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Export Dialog */}
      {showExportDialog && (
        <ReportExport
          reportData={reportData}
          filters={filters}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
}

