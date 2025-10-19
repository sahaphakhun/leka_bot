import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileBarChart,
} from "lucide-react";
import ReportFilters from "./ReportFilters";
import ReportChart from "./ReportChart";
import ReportExport from "./ReportExport";
import { showError } from "../../lib/toast";

export default function ReportsView() {
  const { groupId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: "month",
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
    setError(null);
    try {
      const { getReports } = await import("../../services/api");
      const reportData = await getReports(groupId, filters);
      // Data is already normalized by API service
      setReportData(reportData);
      console.log("✅ Loaded reports data");
    } catch (error) {
      console.error("❌ Failed to load reports:", error);
      setError(error.message || "ไม่สามารถโหลดรายงานได้");
      setReportData(null);
      showError("ไม่สามารถโหลดรายงานได้", error);
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
          <p className="text-gray-600">กำลังโหลดรายงาน...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ไม่สามารถโหลดรายงานได้
            </h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={loadReportData} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                ลองอีกครั้ง
              </Button>
              <p className="text-xs text-gray-500">
                หากปัญหายังคงอยู่ กรุณาตรวจสอบว่า Backend API ทำงานหรือไม่
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No Data State
  if (!reportData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">รายงานและสถิติ</h1>
            <p className="text-muted-foreground">
              วิเคราะห์ประสิทธิภาพการทำงาน
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadReportData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              รีเฟรช
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center h-96 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center max-w-md px-6">
            <FileBarChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ไม่มีข้อมูลรายงาน
            </h3>
            <p className="text-gray-600 mb-6">
              ระบบยังไม่มีข้อมูลเพียงพอสำหรับสร้างรายงาน
              กรุณาสร้างงานและทำงานให้เสร็จก่อน
            </p>
            <Button onClick={loadReportData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              ลองโหลดอีกครั้ง
            </Button>
          </div>
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
            <div className="text-2xl font-bold text-green-600">
              {summary.completedTasks}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.completionRate}% ของงานทั้งหมด
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              กำลังดำเนินการ
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary.inProgressTasks}
            </div>
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
            <div className="text-2xl font-bold text-red-600">
              {summary.overdueTasks}
            </div>
            <p className="text-xs text-muted-foreground">ต้องเร่งดำเนินการ</p>
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
                    label: "งานที่สร้าง",
                    data: trends.tasksCreated,
                    borderColor: "rgb(59, 130, 246)",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                  },
                  {
                    label: "งานที่เสร็จ",
                    data: trends.tasksCompleted,
                    borderColor: "rgb(34, 197, 94)",
                    backgroundColor: "rgba(34, 197, 94, 0.1)",
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
                labels: byCategory.map((c) => c.category),
                datasets: [
                  {
                    label: "ทั้งหมด",
                    data: byCategory.map((c) => c.count),
                    backgroundColor: "rgba(59, 130, 246, 0.5)",
                  },
                  {
                    label: "เสร็จสิ้น",
                    data: byCategory.map((c) => c.completed),
                    backgroundColor: "rgba(34, 197, 94, 0.5)",
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
                      <span
                        className={`font-medium ${member.rate >= 70 ? "text-green-600" : member.rate >= 50 ? "text-yellow-600" : "text-red-600"}`}
                      >
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
