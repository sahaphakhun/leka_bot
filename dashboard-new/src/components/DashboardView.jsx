import { useMemo } from 'react';
import { ClipboardList, Timer, CheckCircle2, AlertTriangle, RefreshCw, CalendarDays, Users, Clock, AlertCircle } from 'lucide-react';
import TaskCard from './common/TaskCard';
import { useAuth } from '../context/AuthContext';

const statusLabels = {
  new: 'งานใหม่',
  scheduled: 'รอกำหนดส่ง',
  'in-progress': 'กำลังดำเนินการ',
  in_progress: 'กำลังดำเนินการ',
  completed: 'เสร็จแล้ว',
  approved: 'อนุมัติแล้ว',
  submitted: 'ส่งแล้ว',
  overdue: 'เกินกำหนด',
};

const completedStatuses = ['completed', 'approved', 'done', 'submitted'];

const rankEmojis = ['🥇', '🥈', '🥉'];

const DashboardView = ({
  tasks = [],
  stats = {},
  leaderboard = [],
  groupStats = null,
  onTaskSelect = () => {},
  onRefresh,
}) => {
  const { isPersonalMode, currentGroup } = useAuth();

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
    if (task.scheduledDate) return new Date(task.scheduledDate);
    return null;
  };

  const isCompleted = (status) => completedStatuses.includes(status);

  const statsData = useMemo(() => {
    const defaultStats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => isCompleted(t.status)).length,
      inProgressTasks: tasks.filter((t) => ['in-progress', 'in_progress'].includes(t.status)).length,
      overdueTasks: tasks.filter((t) => {
        const date = getTaskDate(t);
        if (!date) return false;
        return date < today && !isCompleted(t.status);
      }).length,
      newTasks: tasks.filter((t) => t.status === 'new').length,
      scheduledTasks: tasks.filter((t) => t.status === 'scheduled').length,
    };
    return { ...defaultStats, ...stats };
  }, [tasks, stats, today]);

  const processingTasksCount = statsData.inProgressTasks + statsData.scheduledTasks + statsData.newTasks;

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
        const dateA = new Date(a.updatedAt || a.createdAt || a.dueDate || a.scheduledDate || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || b.dueDate || b.scheduledDate || 0);
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
          0
      );
      const completed = Number(entry.completed ?? entry.tasksCompleted ?? entry.totalTasks ?? 0);
      const onTime = Math.round(entry.onTimeRate ?? entry.onTimePercentage ?? entry.punctuality ?? 0);
      return {
        id: entry.id || entry.lineUserId || entry.userId || `leader-${index}`,
        rank: entry.rank || index + 1,
        name: entry.name || entry.displayName || entry.realName || 'ไม่ทราบชื่อ',
        score: score.toFixed(1),
        completed,
        onTime,
      };
    });
  }, [leaderboard]);

  const formatDateTime = (task) => {
    const date = getTaskDate(task);
    if (!date) return 'ไม่มีกำหนด';
    const dateString = date.toLocaleDateString('th-TH', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timeString = task.dueTime || task.time ? ` เวลา ${task.dueTime || task.time}` : '';
    return `${dateString}${timeString}`;
  };

  const getAssigneeNames = (task) => {
    const candidates = task.assignees || task.assignedUsers;
    if (Array.isArray(candidates) && candidates.length > 0) {
      return candidates
        .map((member) => member.displayName || member.name || member.realName || member.lineUserId)
        .join(', ');
    }
    if (task.assignee) {
      return task.assignee.name || task.assignee.displayName || task.assignee.lineUserId || 'ไม่ระบุ';
    }
    return 'ไม่ระบุ';
  };

  const memberSummaryItems = useMemo(() => {
    if (!groupStats) return [];
    const totalMembers =
      groupStats.totalMembers ??
      groupStats.memberCount ??
      groupStats.members ??
      groupStats.total_member ??
      null;
    const activeMembers = groupStats.activeMembers ?? groupStats.active ?? null;
    const completedThisWeek =
      groupStats.completedThisWeek ??
      groupStats.weeklyCompleted ??
      groupStats.tasksCompletedThisWeek ??
      null;

    return [
      totalMembers !== null && {
        label: 'สมาชิกทั้งหมด',
        value: totalMembers,
        icon: Users,
      },
      activeMembers !== null && {
        label: 'สมาชิกที่ใช้งาน',
        value: activeMembers,
        icon: Users,
      },
      completedThisWeek !== null && {
        label: 'งานที่เสร็จสัปดาห์นี้',
        value: completedThisWeek,
        icon: CheckCircle2,
      },
    ].filter(Boolean);
  }, [groupStats]);

  const statCards = [
    {
      title: 'งานทั้งหมด',
      value: statsData.totalTasks,
      icon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100/80',
    },
    {
      title: 'อยู่ระหว่างดำเนินการ',
      value: processingTasksCount,
      icon: Timer,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100/80',
    },
    {
      title: 'เสร็จสิ้นแล้ว',
      value: statsData.completedTasks,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100/80',
    },
    {
      title: 'เกินกำหนด',
      value: statsData.overdueTasks,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100/80',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">แดชบอร์ดหลัก</h1>
          <p className="text-muted-foreground">
            {isPersonalMode() ? 'ภาพรวมงานของฉันในกลุ่ม LINE' : 'ติดตามสถานะงานและผลงานของกลุ่มแบบเรียลไทม์'}
          </p>
          {currentGroup && (
            <p className="text-sm text-muted-foreground mt-2">
              กลุ่ม: {currentGroup.name || 'ไม่ระบุชื่อ'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isPersonalMode()
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {isPersonalMode() ? 'โหมดส่วนตัว' : 'โหมดกลุ่ม'}
          </span>
          {typeof onRefresh === 'function' && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm hover:bg-gray-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
              รีเฟรชข้อมูล
            </button>
          )}
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
                <h2 className="text-lg font-semibold">งานใกล้ครบกำหนด (7 วัน)</h2>
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
                      <TaskCard key={task.id} task={task} onClick={() => onTaskSelect(task)} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-red-600">งานที่เกินกำหนด</h2>
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
                            <p className="font-medium line-clamp-1">{task.title}</p>
                            <span className="text-xs whitespace-nowrap">{formatDateTime(task)}</span>
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
                      <span className="text-2xl">{rankEmojis[index] || `#${entry.rank}`}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">
                          คะแนน {entry.score} • เสร็จ {entry.completed} งาน • ตรงเวลา {entry.onTime}%
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
                        <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {getAssigneeNames(task)} • {statusLabels[task.status] || task.status}
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
