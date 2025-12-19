import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import {
  Medal,
  RefreshCw,
  Crown,
  TrendingUp,
  AlertCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Copy,
} from "lucide-react";
import { getLeaderboard, syncLeaderboard } from "../../services/api";
import { showError, showSuccess } from "../../lib/toast";
import ColumnVisibilityToggle, {
  useColumnVisibility,
  isColumnVisible,
} from "../common/ColumnVisibilityToggle";
import { exportLeaderboard, copyToClipboard } from "../../utils/exportUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";

const PERIOD_OPTIONS = [
  { value: "weekly", label: "รายสัปดาห์" },
  { value: "monthly", label: "รายเดือน" },
  { value: "quarterly", label: "รายไตรมาส" },
  { value: "yearly", label: "รายปี" },
];

const normalizeLeaderboard = (entries = []) => {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry, index) => {
    const name =
      entry.displayName ||
      entry.name ||
      entry.realName ||
      entry.nickName ||
      "ไม่ทราบชื่อ";
    const score = Number(
      entry.totalScore ??
        entry.weeklyPoints ??
        entry.monthlyPoints ??
        entry.points ??
        entry.score ??
        0,
    );
    const completed = Number(
      entry.completedTasks ??
        entry.tasksCompleted ??
        entry.totalCompleted ??
        entry.totalTasks ??
        0,
    );
    const onTimeRateRaw =
      entry.onTimeRate ??
      entry.onTimePercentage ??
      entry.punctuality ??
      entry.onTime ??
      0;
    const onTimeRate = Number.isFinite(onTimeRateRaw)
      ? Math.round(onTimeRateRaw)
      : 0;

    return {
      id: entry.lineUserId || entry.userId || entry.id || `rank-${index}`,
      rank: entry.rank || index + 1,
      name,
      pictureUrl: entry.pictureUrl || entry.avatar,
      score,
      completed,
      onTimeRate,
      role: entry.role || "member",
      streak: entry.streak || entry.currentStreak || 0,
      bestStreak: entry.bestStreak || 0,
    };
  });
};

const rankEmojis = ["🥇", "🥈", "🥉"];

// Define available columns
const INITIAL_COLUMNS = [
  { key: "rank", label: "อันดับ", visible: true },
  { key: "name", label: "สมาชิก", visible: true },
  { key: "score", label: "คะแนนรวม", visible: true },
  { key: "completed", label: "งานที่เสร็จ", visible: true },
  { key: "onTimeRate", label: "ตรงเวลา", visible: true },
  { key: "stats", label: "สถิติเด่น", visible: true },
];

export default function LeaderboardView() {
  const { groupId } = useAuth();
  const [period, setPeriod] = useState("weekly");
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  // Search, Sort, Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState("rank");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Column visibility
  const [columns, setColumns] = useColumnVisibility(
    INITIAL_COLUMNS,
    "leaderboard-columns",
  );

  // Export state
  const [exporting, setExporting] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);

    try {
      const response = await getLeaderboard(groupId, { period });
      const list =
        response?.items || response?.data || response?.leaderboard || response;
      setLeaderboard(normalizeLeaderboard(list));
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      setError(err.message || "ไม่สามารถโหลดข้อมูลอันดับได้");
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, [groupId, period]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handleSync = async () => {
    if (!groupId) return;
    setSyncing(true);
    try {
      await syncLeaderboard(groupId);
      await loadLeaderboard();
      showSuccess("ซิงก์ข้อมูลอันดับสำเร็จ");
    } catch (err) {
      console.error("Failed to sync leaderboard:", err);
      showError("ไม่สามารถซิงก์ข้อมูลอันดับได้", err);
    } finally {
      setSyncing(false);
    }
  };

  // Export handlers
  const handleExport = async (format) => {
    if (sortedLeaderboard.length === 0) {
      showError("ไม่มีข้อมูลให้ส่งออก");
      return;
    }

    setExporting(true);
    try {
      exportLeaderboard(sortedLeaderboard, columns, format);
      showSuccess(
        `ส่งออกข้อมูล ${sortedLeaderboard.length} รายการเป็น ${format.toUpperCase()} สำเร็จ`,
      );
    } catch (error) {
      console.error("Failed to export:", error);
      showError("ไม่สามารถส่งออกข้อมูลได้", error);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (sortedLeaderboard.length === 0) {
      showError("ไม่มีข้อมูลให้คัดลอก");
      return;
    }

    const success = await copyToClipboard(sortedLeaderboard, columns);
    if (success) {
      showSuccess("คัดลอกข้อมูลไปยังคลิปบอร์ดแล้ว");
    } else {
      showError("ไม่สามารถคัดลอกข้อมูลได้");
    }
  };

  // Search filtering
  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return leaderboard;
    const query = searchQuery.toLowerCase();
    return leaderboard.filter((entry) =>
      entry.name.toLowerCase().includes(query),
    );
  }, [leaderboard, searchQuery]);

  // Sorting
  const sortedLeaderboard = useMemo(() => {
    const sorted = [...filteredLeaderboard];
    sorted.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle string comparison
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredLeaderboard, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedLeaderboard.length / itemsPerPage);
  const paginatedLeaderboard = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedLeaderboard.slice(startIndex, endIndex);
  }, [sortedLeaderboard, currentPage, itemsPerPage]);

  // Reset to page 1 when search/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortColumn, sortDirection]);

  const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);

  // Sort handler
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Render sort icon
  const renderSortIcon = (column) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" />
    );
  };

  const renderTopCard = (entry, index) => (
    <Card
      key={entry.id}
      className={index === 0 ? "border-yellow-400 shadow-lg" : ""}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {index === 0 ? (
            <Crown className="w-5 h-5 text-yellow-500" />
          ) : (
            <Medal className="w-5 h-5 text-blue-500" />
          )}
          <CardTitle className="text-sm font-medium">
            อันดับ {entry.rank}
          </CardTitle>
        </div>
        <Badge variant="outline" className="text-xs">
          {rankEmojis[index] || `#${entry.rank}`}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={entry.pictureUrl} alt={entry.name} />
            <AvatarFallback>{entry.name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-base">{entry.name}</p>
            <p className="text-xs text-muted-foreground">
              เสร็จ {entry.completed} งาน • ตรงเวลา {entry.onTimeRate}%
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">คะแนนรวม</p>
            <p className="text-lg font-semibold text-blue-600">
              {entry.score.toFixed(1)}
            </p>
          </div>
          {entry.streak > 0 && (
            <Badge variant="secondary">🔥 ต่อเนื่อง {entry.streak} วัน</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลดข้อมูลอันดับ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">อันดับผลงาน</h1>
          <p className="text-muted-foreground">
            ดูอันดับสมาชิกในกลุ่มตามช่วงเวลาที่เลือก
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadLeaderboard}>
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={exporting || sortedLeaderboard.length === 0}
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                    กำลังส่งออก...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    ส่งออกข้อมูล
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <FileText className="w-4 h-4 mr-2" />
                ส่งออกเป็น CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                ส่งออกเป็น Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                <FileText className="w-4 h-4 mr-2" />
                ส่งออกเป็น JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCopyToClipboard}>
                <Copy className="w-4 h-4 mr-2" />
                คัดลอกไปยังคลิปบอร์ด
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                กำลังซิงก์...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                ซิงก์ข้อมูล
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={period === option.value ? "default" : "outline"}
            onClick={() => setPeriod(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-md bg-red-50 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-semibold">เกิดข้อผิดพลาด</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topThree.length === 0 ? (
          <Card className="md:col-span-3">
            <CardContent className="py-12 text-center text-muted-foreground">
              ยังไม่มีข้อมูลอันดับสำหรับช่วงเวลานี้
            </CardContent>
          </Card>
        ) : (
          topThree.map((entry, index) => renderTopCard(entry, index))
        )}
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>ตารางอันดับสมาชิก</CardTitle>
              <CardDescription>
                คลิกหัวคอลัมน์เพื่อเรียงข้อมูล • ค้นหาชื่อสมาชิก
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <ColumnVisibilityToggle
                columns={columns}
                onChange={setColumns}
                storageKey="leaderboard-columns"
              />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="ค้นหาชื่อสมาชิก..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                {isColumnVisible(columns, "rank") && (
                  <th
                    className="py-3 pr-4 w-16 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("rank")}
                  >
                    <div className="flex items-center">
                      อันดับ
                      {renderSortIcon("rank")}
                    </div>
                  </th>
                )}
                {isColumnVisible(columns, "name") && (
                  <th
                    className="py-3 pr-4 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      สมาชิก
                      {renderSortIcon("name")}
                    </div>
                  </th>
                )}
                {isColumnVisible(columns, "score") && (
                  <th
                    className="py-3 pr-4 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("score")}
                  >
                    <div className="flex items-center">
                      คะแนนรวม
                      {renderSortIcon("score")}
                    </div>
                  </th>
                )}
                {isColumnVisible(columns, "completed") && (
                  <th
                    className="py-3 pr-4 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("completed")}
                  >
                    <div className="flex items-center">
                      งานที่เสร็จ
                      {renderSortIcon("completed")}
                    </div>
                  </th>
                )}
                {isColumnVisible(columns, "onTimeRate") && (
                  <th
                    className="py-3 pr-4 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("onTimeRate")}
                  >
                    <div className="flex items-center">
                      ตรงเวลา
                      {renderSortIcon("onTimeRate")}
                    </div>
                  </th>
                )}
                {isColumnVisible(columns, "stats") && (
                  <th className="py-3 pr-4">สถิติเด่น</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedLeaderboard.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.filter((c) => c.visible).length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {searchQuery
                      ? `ไม่พบสมาชิกที่ชื่อ "${searchQuery}"`
                      : "ยังไม่มีข้อมูลอันดับสำหรับช่วงเวลานี้"}
                  </td>
                </tr>
              ) : (
                paginatedLeaderboard.map((entry, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      {isColumnVisible(columns, "rank") && (
                        <td className="py-3 pr-4 font-semibold">
                          {rankEmojis[globalIndex] || `#${entry.rank}`}
                        </td>
                      )}
                      {isColumnVisible(columns, "name") && (
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage
                                src={entry.pictureUrl}
                                alt={entry.name}
                              />
                              <AvatarFallback>
                                {entry.name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{entry.name}</p>
                              <p className="text-xs text-muted-foreground">
                                รับผิดชอบ {entry.completed} งาน • ตรงเวลา{" "}
                                {entry.onTimeRate}%
                              </p>
                            </div>
                          </div>
                        </td>
                      )}
                      {isColumnVisible(columns, "score") && (
                        <td className="py-3 pr-4 font-semibold text-blue-600">
                          {entry.score.toFixed(1)}
                        </td>
                      )}
                      {isColumnVisible(columns, "completed") && (
                        <td className="py-3 pr-4">{entry.completed}</td>
                      )}
                      {isColumnVisible(columns, "onTimeRate") && (
                        <td className="py-3 pr-4">{entry.onTimeRate}%</td>
                      )}
                      {isColumnVisible(columns, "stats") && (
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2 text-xs">
                            {entry.streak > 0 && (
                              <Badge variant="outline">
                                🔥 ต่อเนื่อง {entry.streak} วัน
                              </Badge>
                            )}
                            {entry.bestStreak > 0 && (
                              <Badge variant="outline">
                                🏅 สถิติสูงสุด {entry.bestStreak} วัน
                              </Badge>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                แสดง {(currentPage - 1) * itemsPerPage + 1} -{" "}
                {Math.min(currentPage * itemsPerPage, sortedLeaderboard.length)}{" "}
                จาก {sortedLeaderboard.length} รายการ
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  ก่อนหน้า
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  ถัดไป
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
