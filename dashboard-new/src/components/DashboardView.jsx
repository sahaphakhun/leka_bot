import { useMemo, useState } from "react";
import {
  ClipboardList,
  Timer,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  CalendarDays,
  Users,
  Clock,
  AlertCircle,
  Send,
  FileDown,
  User as UserIcon,
  ArrowRightLeft,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import TaskCard from "./common/TaskCard";
import { useAuth } from "../context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

const statusLabels = {
  new: "งานใหม่",
  scheduled: "รอกำหนดส่ง",
  "in-progress": "กำลังดำเนินการ",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จแล้ว",
  approved: "อนุมัติแล้ว",
  submitted: "ส่งแล้ว",
  overdue: "เกินกำหนด",
};

const completedStatuses = new Set([
  "completed",
  "approved",
  "submitted",
  "reviewed",
  "auto_approved",
  "done",
  "cancelled",
]);
const inProgressStatuses = new Set([
  "in-progress",
  "in_progress",
  "processing",
  "review",
]);
const pendingStatuses = new Set(["pending", "waiting", "scheduled", "new"]);

const rankEmojis = ["🥇", "🥈", "🥉"];

const periods = [
  { value: "this_week", label: "สัปดาห์นี้", icon: CalendarDays },
  { value: "last_week", label: "สัปดาห์ก่อน", icon: ArrowRightLeft },
  { value: "all", label: "ทั้งหมด", icon: ClipboardList },
];

const safeNumber = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const DashboardView = ({
  tasks = [],
  stats = {},
  leaderboard = [],
  groupStats = null,
  onTaskSelect = () => {},
  onRefresh,
  onNavigate,
  onStatsPeriodChange,
  statsPeriod = "this_week",
}) => {
  const { isPersonalMode, currentGroup, userId, currentUser } = useAuth();
  const readOnly = !userId;
  const [exporting, setExporting] = useState(false);

  const handleExportDashboard = async (format) => {
    setExporting(true);
    try {
      const { exportDashboardData } = await import("../services/exportService");
      await exportDashboardData(tasks, statsData, format);
    } catch (error) {
      console.error("Failed to export dashboard:", error);
      alert("ไม่สามารถส่งออกข้อมูลได้");
    } finally {
      setExporting(false);
    }
  };

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const endOfToday = useMemo(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  }, []);

  const upcomingLimit = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(23, 59, 59, 999);
    return date;
  }, []);

  const getTaskDate = (task) => {
    if (task.dueDate) return new Date(task.dueDate);
    if (task.dueTime) return new Date(task.dueTime);
    if (task.scheduledDate) return new Date(task.scheduledDate);
    if (task.startTime) return new Date(task.startTime);
    return null;
  };

  const isCompleted = (status) =>
    status ? completedStatuses.has(status.toLowerCase()) : false;

  const statsData = useMemo(() => {
    const defaultStats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => isCompleted(t.status)).length,
      pendingTasks: tasks.filter((t) =>
        pendingStatuses.has((t.status || "").toLowerCase()),
      ).length,
      inProgressTasks: tasks.filter((t) =>
        inProgressStatuses.has((t.status || "").toLowerCase()),
      ).length,
      overdueTasks: tasks.filter((t) => {
        const date = getTaskDate(t);
        if (!date) return false;
        return date < today && !isCompleted(t.status);
      }).length,
      newTasks: tasks.filter((t) => (t.status || "").toLowerCase() === "new")
        .length,
      scheduledTasks: tasks.filter(
        (t) => (t.status || "").toLowerCase() === "scheduled",
      ).length,
    };
    return { ...defaultStats, ...stats };
  }, [tasks, stats, today]);

  const totalInProgress =
    (statsData.inProgressTasks || 0) +
    (statsData.scheduledTasks || 0) +
    (statsData.newTasks || 0);
  const pendingTasksCount =
    statsData.pendingTasks !== undefined
      ? statsData.pendingTasks
      : Math.max(totalInProgress, 0);

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const date = getTaskDate(task);
        if (!date) return false;
        if (isCompleted(task.status)) return false;
        return date > endOfToday && date <= upcomingLimit;
      })
      .sort((a, b) => (getTaskDate(a) || 0) - (getTaskDate(b) || 0))
      .slice(0, 5);
  }, [tasks, endOfToday, upcomingLimit]);

  const todayTasks = useMemo(() => {
    return tasks.filter((task) => {
      const date = getTaskDate(task);
      if (!date) return false;
      return date >= today && date <= endOfToday;
    });
  }, [tasks, today, endOfToday]);

  const overdueTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const date = getTaskDate(task);
        if (!date) return false;
        return date < today && !isCompleted(task.status);
      })
      .sort((a, b) => (getTaskDate(a) || 0) - (getTaskDate(b) || 0))
      .slice(0, 5);
  }, [tasks, today]);

  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => {
        const dateA = new Date(
          a.updatedAt || a.createdAt || a.dueDate || a.scheduledDate || 0,
        );
        const dateB = new Date(
          b.updatedAt || b.createdAt || b.dueDate || b.scheduledDate || 0,
        );
        return dateB - dateA;
      })
      .slice(0, 6);
  }, [tasks]);

  const miniLeaderboard = useMemo(() => {
    if (!Array.isArray(leaderboard)) return [];
    return leaderboard.slice(0, 3).map((entry, index) => {
      const score = Number(
        entry.score ??
          entry.totalScore ??
          entry.weeklyPoints ??
          entry.monthlyPoints ??
          entry.points ??
          0,
      );
      const completed = Number(
        entry.completed ?? entry.tasksCompleted ?? entry.totalTasks ?? 0,
      );
      const onTime = Math.round(
        entry.onTimeRate ?? entry.onTimePercentage ?? entry.punctuality ?? 0,
      );
      return {
        id: entry.id || entry.lineUserId || entry.userId || `leader-${index}`,
        rank: entry.rank || index + 1,
        name:
          entry.name || entry.displayName || entry.realName || "ไม่ทราบชื่อ",
        score: score.toFixed(1),
        completed,
        onTime,
      };
    });
  }, [leaderboard]);

  const formatDateTime = (task) => {
    const date = getTaskDate(task);
    if (!date) return "ไม่มีกำหนด";
    const dateString = date.toLocaleDateString("th-TH", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeString =
      task.dueTime || task.time ? ` เวลา ${task.dueTime || task.time}` : "";
    return `${dateString}${timeString}`;
  };

  const getAssigneeNames = (task) => {
    const names = [];
    if (Array.isArray(task.assignedUsers)) {
      task.assignedUsers.forEach((member) => {
        names.push(
          member.displayName ||
            member.name ||
            member.realName ||
            member.lineUserId,
        );
      });
    }
    if (Array.isArray(task.assignees)) {
      task.assignees.forEach((assignee) => {
        if (typeof assignee === "string") {
          names.push(assignee);
        }
      });
    }
    if (task.assignee) {
      names.push(
        task.assignee.name ||
          task.assignee.displayName ||
          task.assignee.lineUserId,
      );
    }
    const unique = names.filter(Boolean);
    if (unique.length === 0) return "ไม่ระบุ";
    return Array.from(new Set(unique)).join(", ");
  };

  const memberSummaryItems = useMemo(() => {
    if (!groupStats) return [];

    const memberStats = groupStats.members ?? {};
    const statsSummary = groupStats.stats ?? {};

    const totalMembers =
      safeNumber(memberStats.totalMembers) ??
      safeNumber(memberStats.memberCount) ??
      safeNumber(memberStats.total_member) ??
      safeNumber(groupStats.totalMembers) ??
      safeNumber(groupStats.memberCount) ??
      safeNumber(groupStats.total_member) ??
      null;

    const verifiedMembers =
      safeNumber(memberStats.verifiedMembers) ??
      safeNumber(groupStats.verifiedMembers) ??
      null;

    const adminCount =
      safeNumber(memberStats.adminCount) ??
      safeNumber(groupStats.adminCount) ??
      null;

    const joinedThisMonth =
      safeNumber(memberStats.joinedThisMonth) ??
      safeNumber(groupStats.joinedThisMonth) ??
      null;

    const activeMembers =
      safeNumber(memberStats.activeMembers) ??
      safeNumber(memberStats.active) ??
      safeNumber(groupStats.activeMembers) ??
      safeNumber(groupStats.active) ??
      null;

    const completedThisPeriod =
      safeNumber(statsSummary.completedTasks) ??
      safeNumber(statsSummary.completedThisWeek) ??
      safeNumber(statsSummary.weeklyCompleted) ??
      safeNumber(groupStats.completedThisWeek) ??
      safeNumber(groupStats.weeklyCompleted) ??
      safeNumber(groupStats.tasksCompletedThisWeek) ??
      safeNumber(statsData.completedTasks) ??
      null;

    return [
      totalMembers !== null && {
        label: "สมาชิกทั้งหมด",
        value: totalMembers,
        icon: Users,
      },
      verifiedMembers !== null && {
        label: "สมาชิกยืนยันแล้ว",
        value: verifiedMembers,
        icon: CheckCircle2,
      },
      adminCount !== null && {
        label: "ผู้ดูแลระบบ",
        value: adminCount,
        icon: UserIcon,
      },
      activeMembers !== null && {
        label: "สมาชิกที่ใช้งาน",
        value: activeMembers,
        icon: Users,
      },
      joinedThisMonth !== null && {
        label: "สมาชิกใหม่เดือนนี้",
        value: joinedThisMonth,
        icon: CalendarDays,
      },
      completedThisPeriod !== null && {
        label: "งานที่เสร็จ",
        value: completedThisPeriod,
        icon: CheckCircle2,
      },
    ].filter(Boolean);
  }, [groupStats, statsData.completedTasks]);

  const statCards = [
    {
      title: "งานทั้งหมด",
      value: statsData.totalTasks,
      icon: ClipboardList,
      color: "text-blue-600",
      bgColor: "bg-blue-100/80",
    },
    {
      title: "รอดำเนินการ",
      value: pendingTasksCount,
      icon: Timer,
      color: "text-orange-600",
      bgColor: "bg-orange-100/80",
    },
    {
      title: "เสร็จสิ้นแล้ว",
      value: statsData.completedTasks,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100/80",
    },
    {
      title: "เกินกำหนด",
      value: statsData.overdueTasks,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100/80",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">แดชบอร์ดหลัก</h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isPersonalMode()
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {isPersonalMode() ? "โหมดส่วนตัว" : "โหมดกลุ่ม"}
            </span>
            {readOnly && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                โหมดดูอย่างเดียว
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            {isPersonalMode()
              ? "ภาพรวมงานของฉันในกลุ่ม LINE"
              : "ติดตามสถานะงานและผลงานของกลุ่มแบบเรียลไทม์"}
          </p>
          {currentGroup && (
            <p className="text-sm text-muted-foreground">
              กลุ่ม: {currentGroup.name || "ไม่ระบุชื่อ"}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-full bg-white shadow-sm">
              <UserIcon className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">
                {currentUser.displayName ||
                  currentUser.realName ||
                  currentUser.lineUserId ||
                  "ผู้ใช้งาน"}
              </span>
            </div>
          )}
          {typeof onRefresh === "function" && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm hover:bg-gray-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
              รีเฟรชข้อมูล
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={exporting || tasks.length === 0}
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
              <DropdownMenuItem onClick={() => handleExportDashboard("csv")}>
                <FileText className="w-4 h-4 mr-2" />
                ส่งออกเป็น CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportDashboard("excel")}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                ส่งออกเป็น Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {typeof onNavigate === "function" && (
            <>
              <button
                type="button"
                onClick={() => onNavigate("submit")}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-500 text-white text-sm hover:bg-blue-600 transition"
              >
                <Send className="w-4 h-4" />
                ส่งงาน
              </button>
              <button
                type="button"
                onClick={() => onNavigate("reports")}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-blue-500 text-blue-600 text-sm hover:bg-blue-50 transition"
              >
                <FileDown className="w-4 h-4" />
                รายงานเต็ม
              </button>
            </>
          )}
        </div>
      </div>

      {/* Read-only banner */}
      {readOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">คุณกำลังดูในโหมดตัวอย่าง</p>
          <p>
            โปรดเข้าจากลิงก์ใน LINE
            ส่วนตัวเพื่อยืนยันตัวตนและใช้งานคำสั่งเต็มรูปแบบ
          </p>
        </div>
      )}

      {/* Stats period selector */}
      <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="text-sm text-muted-foreground">
          ปรับช่วงข้อมูลสถิติเพื่อดูแนวโน้มล่าสุดของทีม
        </div>
        <div className="flex flex-wrap gap-2">
          {periods.map((period) => {
            const Icon = period.icon;
            const isActive = statsPeriod === period.value;
            return (
              <button
                key={period.value}
                type="button"
                onClick={() =>
                  onStatsPeriodChange && onStatsPeriodChange(period.value)
                }
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? "bg-blue-500 text-white shadow"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Icon className="w-3 h-3" />
                {period.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-semibold mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} ${stat.color} p-3 rounded-full`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary summary */}
      {memberSummaryItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {memberSummaryItems.map((item, index) => {
            const SummaryIcon = item.icon || Users;
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
              >
                <SummaryIcon className="w-8 h-8 text-blue-500 bg-blue-100/80 rounded-full p-1.5" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-semibold">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Upcoming tasks */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  งานใกล้ครบกำหนด (7 วัน)
                </h2>
                <p className="text-sm text-muted-foreground">
                  จัดลำดับความสำคัญของงานที่ต้องดำเนินการต่อ
                </p>
              </div>
              <CalendarDays className="w-6 h-6 text-blue-500" />
            </div>
            <div className="p-5">
              {upcomingTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-6 text-sm">
                  ไม่มีงานที่กำหนดส่งใน 7 วันข้างหน้า
                </div>
              ) : (
                <ul className="space-y-3">
                  {upcomingTasks.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => onTaskSelect(task)}
                        className="w-full text-left bg-gray-50 hover:bg-gray-100 transition rounded-lg px-4 py-3 border border-gray-100"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-medium text-sm md:text-base line-clamp-1">
                            {task.title}
                          </p>
                          <span className="text-xs text-blue-600 whitespace-nowrap">
                            {formatDateTime(task)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>ผู้รับผิดชอบ: {getAssigneeNames(task)}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {statusLabels[task.status] || task.status}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Today's tasks and overdue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">งานของวันนี้</h2>
                <Clock className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="p-5">
                {todayTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    วันนี้ยังไม่มีงานที่ต้องทำ
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {todayTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => onTaskSelect(task)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-red-600">
                  งานที่เกินกำหนด
                </h2>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="p-5">
                {overdueTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    เยี่ยมมาก! ไม่มีงานที่ค้างเกินกำหนด
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {overdueTasks.map((task) => (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => onTaskSelect(task)}
                          className="w-full text-left bg-red-50 hover:bg-red-100 transition rounded-lg px-4 py-3 border border-red-100 text-red-700"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-medium line-clamp-1">
                              {task.title}
                            </p>
                            <span className="text-xs whitespace-nowrap">
                              {formatDateTime(task)}
                            </span>
                          </div>
                          <p className="text-xs mt-1">
                            ผู้รับผิดชอบ: {getAssigneeNames(task)}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Mini leaderboard */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b">
              <h2 className="text-lg font-semibold">อันดับยอดเยี่ยม</h2>
              <p className="text-sm text-muted-foreground">
                Top 3 สมาชิกที่ทำผลงานโดดเด่นช่วงนี้
              </p>
            </div>
            <div className="p-5">
              {miniLeaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ยังไม่มีข้อมูลอันดับ กรุณาซิงก์จากเมนู "อันดับ"
                </p>
              ) : (
                <div className="space-y-3">
                  {miniLeaderboard.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 border border-gray-100 rounded-lg px-4 py-3 bg-gray-50"
                    >
                      <span className="text-2xl">
                        {rankEmojis[index] || `#${entry.rank}`}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">
                          คะแนน {entry.score} • เสร็จ {entry.completed} งาน •
                          ตรงเวลา {entry.onTime}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b">
              <h2 className="text-lg font-semibold">กิจกรรมล่าสุด</h2>
              <p className="text-sm text-muted-foreground">
                งานที่มีการอัปเดตหรือสร้างล่าสุด
              </p>
            </div>
            <div className="p-5 space-y-3">
              {recentTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ยังไม่มีกิจกรรมล่าสุด
                </p>
              ) : (
                recentTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onTaskSelect(task)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-1 rounded transition">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getAssigneeNames(task)} •{" "}
                          {statusLabels[task.status] || task.status}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(task)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
