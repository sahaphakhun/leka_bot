import { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListTodo,
  Filter,
  Search,
  AlertCircle,
} from 'lucide-react';
import TaskCard from '../common/TaskCard';
import { useModal } from '../../context/ModalContext';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const DAY_HEADERS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const completedStatuses = ['completed', 'approved', 'done', 'submitted'];

const startOfDay = (date) => {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
};

const getTaskDate = (task) => {
  if (task.dueDate) return new Date(task.dueDate);
  if (task.scheduledDate) return new Date(task.scheduledDate);
  return null;
};

const statusLabels = {
  new: 'งานใหม่',
  scheduled: 'รอกำหนดส่ง',
  'in-progress': 'กำลังดำเนินการ',
  completed: 'เสร็จแล้ว',
  overdue: 'เกินกำหนด',
};

const CalendarView = ({ tasks = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    assignee: 'all',
    due: 'all',
  });
  const { openTaskDetail, openAddTask } = useModal();

  const today = useMemo(() => startOfDay(new Date()), []);
  const endOfToday = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end;
  }, []);

  const upcomingLimit = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 7);
    limit.setHours(23, 59, 59, 999);
    return limit;
  }, []);

  const calendarMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startWeekday = firstDayOfMonth.getDay();

    const days = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }

    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }

    while (days.length % 7 !== 0) {
      const lastDay = days[days.length - 1].date;
      days.push({
        date: new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1),
        isCurrentMonth: false,
      });
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [currentDate]);

  const isCompleted = (task) => completedStatuses.includes(task.status);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const title = (task.title || '').toLowerCase();
      const description = (task.description || '').toLowerCase();
      const query = filters.search.toLowerCase();
      const matchesSearch = !filters.search || title.includes(query) || description.includes(query);

      if (!matchesSearch) return false;

      if (filters.status !== 'all') {
        const normalizedStatus = (task.status || '').replace('_', '-');
        if (filters.status === 'overdue') {
          const date = getTaskDate(task);
          if (!date || date >= today || isCompleted(task)) return false;
        } else if (filters.status === 'in-progress') {
          if (!['in-progress', 'in-progress', 'in_progress'].includes(normalizedStatus)) {
            return false;
          }
        } else if (filters.status === 'completed') {
          if (!isCompleted(task)) return false;
        } else if (normalizedStatus !== filters.status) {
          return false;
        }
      }

      if (filters.priority !== 'all') {
        const taskPriority = (task.priority || '').toLowerCase();
        if (taskPriority !== filters.priority) return false;
      }

      if (filters.assignee !== 'all') {
        const assignees = new Set();
        if (Array.isArray(task.assignees)) {
          task.assignees.forEach((member) =>
            assignees.add(member.displayName || member.name || member.lineUserId)
          );
        }
        if (Array.isArray(task.assignedUsers)) {
          task.assignedUsers.forEach((member) =>
            assignees.add(member.displayName || member.name || member.lineUserId)
          );
        }
        if (task.assignee) {
          assignees.add(
            task.assignee.name || task.assignee.displayName || task.assignee.lineUserId
          );
        }
        if (!assignees.has(filters.assignee)) return false;
      }

      if (filters.due !== 'all') {
        const date = getTaskDate(task);
        if (!date) {
          if (filters.due !== 'unscheduled') return false;
        } else {
          if (filters.due === 'today') {
            if (!(date >= today && date <= endOfToday)) return false;
          } else if (filters.due === 'tomorrow') {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const endTomorrow = new Date(tomorrow);
            endTomorrow.setHours(23, 59, 59, 999);
            if (!(date >= tomorrow && date <= endTomorrow)) return false;
          } else if (filters.due === 'week') {
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            if (!(date >= today && date <= nextWeek)) return false;
          } else if (filters.due === 'past') {
            if (!(date < today && !isCompleted(task))) return false;
          }
        }
      }

      return true;
    });
  }, [tasks, filters, today, endOfToday]);

  const assigneeOptions = useMemo(() => {
    const names = new Set();
    tasks.forEach((task) => {
      if (Array.isArray(task.assignees)) {
        task.assignees.forEach((member) =>
          names.add(member.displayName || member.name || member.lineUserId)
        );
      }
      if (Array.isArray(task.assignedUsers)) {
        task.assignedUsers.forEach((member) =>
          names.add(member.displayName || member.name || member.lineUserId)
        );
      }
      if (task.assignee) {
        names.add(task.assignee.name || task.assignee.displayName || task.assignee.lineUserId);
      }
    });
    return Array.from(names);
  }, [tasks]);

  const getTasksForDate = (date) => {
    return filteredTasks.filter((task) => {
      const taskDate = getTaskDate(task);
      if (!taskDate) return false;
      return startOfDay(taskDate).getTime() === startOfDay(date).getTime();
    });
  };

  const getStatusVariant = (task) => {
    const date = getTaskDate(task);
    if (isCompleted(task)) return 'completed';
    if (date && date < today) return 'overdue';
    return 'pending';
  };

  const upcomingTasks = useMemo(() => {
    return filteredTasks
      .filter((task) => {
        const date = getTaskDate(task);
        if (!date) return false;
        if (isCompleted(task)) return false;
        return date > endOfToday && date <= upcomingLimit;
      })
      .sort((a, b) => (getTaskDate(a) || 0) - (getTaskDate(b) || 0))
      .slice(0, 8);
  }, [filteredTasks, endOfToday, upcomingLimit]);

  const waitingTasks = useMemo(
    () =>
      filteredTasks
        .filter((task) => !getTaskDate(task) && !isCompleted(task))
        .slice(0, 10),
    [filteredTasks]
  );

  const selectedDayTasks = useMemo(
    () => getTasksForDate(selectedDate),
    [selectedDate, filteredTasks]
  );

  const formatMonthTitle = (date) => {
    return date.toLocaleDateString('th-TH', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatLongDate = (date) => {
    return date.toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTaskDue = (task) => {
    const date = getTaskDate(task);
    if (!date) return 'ไม่มีกำหนด';
    const dateStr = date.toLocaleDateString('th-TH', {
      month: 'short',
      day: 'numeric',
    });
    if (task.dueTime) {
      return `${dateStr} • ${task.dueTime}`;
    }
    return dateStr;
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(startOfDay(now));
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentDate(now);
  };

  const goToPreviousMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentDate(prev);
  };

  const goToNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const summaryCounts = useMemo(() => {
    const total = filteredTasks.length;
    const inProgress = filteredTasks.filter((task) => !isCompleted(task) && getTaskDate(task) && getTaskDate(task) >= today).length;
    const completed = filteredTasks.filter((task) => isCompleted(task)).length;
    const overdue = filteredTasks.filter((task) => {
      const date = getTaskDate(task);
      return date && date < today && !isCompleted(task);
    }).length;
    return { total, inProgress, completed, overdue };
  }, [filteredTasks, today]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ปฏิทินงาน</h1>
          <p className="text-muted-foreground">
            ดูกำหนดการและสถานะงานทั้งหมดในรูปแบบรายเดือน
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-2 rounded-md border border-border text-sm hover:bg-gray-50 transition"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={goToCurrentMonth}
            className="px-3 py-2 rounded-md border border-border text-sm hover:bg-gray-50 transition"
          >
            เดือนนี้
          </button>
          <button
            type="button"
            onClick={() => openAddTask && openAddTask('normal')}
            className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 transition"
          >
            <CalendarDays className="w-4 h-4" />
            เพิ่มงาน
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded-md border border-border p-2 hover:bg-gray-100 transition"
            aria-label="เดือนก่อน"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold min-w-[190px] text-center">
            {formatMonthTitle(currentDate)}
          </h2>
          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded-md border border-border p-2 hover:bg-gray-100 transition"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            งานที่ต้องทำ
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            เสร็จแล้ว
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            เกินกำหนด
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            วันนี้
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
          <Filter className="w-4 h-4" />
          ตัวกรองงานในปฏิทิน
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="ค้นหาชื่องานหรือคำอธิบาย..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะ: ทั้งหมด</SelectItem>
              <SelectItem value="new">งานใหม่</SelectItem>
              <SelectItem value="scheduled">รอกำหนดส่ง</SelectItem>
              <SelectItem value="in-progress">กำลังดำเนินการ</SelectItem>
              <SelectItem value="completed">เสร็จแล้ว</SelectItem>
              <SelectItem value="overdue">เกินกำหนด</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.priority}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, priority: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกความสำคัญ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ความสำคัญ: ทั้งหมด</SelectItem>
              <SelectItem value="low">ต่ำ</SelectItem>
              <SelectItem value="medium">ปานกลาง</SelectItem>
              <SelectItem value="high">สูง</SelectItem>
              <SelectItem value="urgent">เร่งด่วน</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.assignee}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, assignee: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกผู้รับผิดชอบ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ผู้รับผิดชอบ: ทั้งหมด</SelectItem>
              {assigneeOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.due}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, due: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกกำหนดส่ง" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">กำหนดส่ง: ทั้งหมด</SelectItem>
              <SelectItem value="today">วันนี้</SelectItem>
              <SelectItem value="tomorrow">พรุ่งนี้</SelectItem>
              <SelectItem value="week">7 วันข้างหน้า</SelectItem>
              <SelectItem value="past">เกินกำหนด</SelectItem>
              <SelectItem value="unscheduled">ยังไม่กำหนด</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs text-blue-700">งานที่แสดง</p>
            <p className="text-2xl font-semibold text-blue-700">{summaryCounts.total}</p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs text-amber-700">กำลังดำเนินการ</p>
            <p className="text-2xl font-semibold text-amber-700">{summaryCounts.inProgress}</p>
          </div>
          <div className="rounded-lg border border-green-100 bg-green-50 p-4">
            <p className="text-xs text-green-700">เสร็จสิ้นแล้ว</p>
            <p className="text-2xl font-semibold text-green-700">{summaryCounts.completed}</p>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50 p-4">
            <p className="text-xs text-red-700">เกินกำหนด</p>
            <p className="text-2xl font-semibold text-red-700">{summaryCounts.overdue}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground uppercase">
            {DAY_HEADERS.map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarMatrix.flat().map(({ date, isCurrentMonth }, index) => {
              const dayTasks = getTasksForDate(date);
              const isToday = startOfDay(date).getTime() === today.getTime();
              const isSelected = startOfDay(date).getTime() === selectedDate.getTime();

              return (
                <button
                  type="button"
                  key={`${date.toISOString()}-${index}`}
                  onClick={() => setSelectedDate(startOfDay(date))}
                  className={`min-h-[120px] rounded-lg border p-2 text-left transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-100'
                      : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/30'
                  } ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-semibold ${
                        isToday ? 'text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        {dayTasks.length} งาน
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1">
                    {dayTasks.slice(0, 3).map((task) => {
                      const variant = getStatusVariant(task);
                      const colorClass =
                        variant === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : variant === 'overdue'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700';
                      return (
                        <span
                          key={task.id}
                          className={`flex items-center gap-1 truncate rounded px-2 py-1 text-[11px] font-medium ${colorClass}`}
                        >
                          {task.title}
                        </span>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <span className="text-[11px] text-muted-foreground">
                        +{dayTasks.length - 3} งาน
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 border-b px-5 py-4">
              <CalendarDays className="w-5 h-5 text-blue-500" />
              <div>
                <h2 className="text-lg font-semibold">งานในวันที่เลือก</h2>
                <p className="text-sm text-muted-foreground">{formatLongDate(selectedDate)}</p>
              </div>
            </div>
            <div className="p-5">
              {selectedDayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-muted-foreground">
                  <AlertCircle className="h-5 w-5" />
                  ยังไม่มีงานสำหรับวันนี้
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedDayTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onClick={() => openTaskDetail(task)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">งานที่กำลังจะถึง</h2>
                <p className="text-xs text-muted-foreground">ภายใน 7 วันข้างหน้า</p>
              </div>
              <Clock className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="p-5 space-y-3">
              {upcomingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">
                  ไม่มีงานในช่วง 7 วันข้างหน้า
                </p>
              ) : (
                upcomingTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => openTaskDetail(task)}
                    className="w-full rounded-lg border border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50"
                  >
                    <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTaskDue(task)}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">งานที่ยังไม่มีกำหนด</h2>
                <p className="text-xs text-muted-foreground">จัดตารางเวลาให้พร้อมก่อนส่ง</p>
              </div>
              <ListTodo className="w-5 h-5 text-amber-500" />
            </div>
            <div className="p-5 space-y-3">
              {waitingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">
                  งานทั้งหมดถูกกำหนดวันที่เรียบร้อยแล้ว
                </p>
              ) : (
                waitingTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => openTaskDetail(task)}
                    className="w-full rounded-lg border border-dashed border-gray-200 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/30"
                  >
                    <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">ยังไม่กำหนดวันส่ง</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">รายการงานตามตัวกรอง</h2>
            <p className="text-sm text-muted-foreground">
              แสดง {filteredTasks.length} งาน | คลิกแถวเพื่อเปิดรายละเอียด
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4">ชื่องาน</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4">ความสำคัญ</th>
                <th className="py-3 px-4">กำหนดส่ง</th>
                <th className="py-3 px-4">ผู้รับผิดชอบ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    ไม่พบงานตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const status = (task.status || '').replace('_', '-');
                  const date = getTaskDate(task);
                  const assignees = [];
                  if (Array.isArray(task.assignees)) {
                    assignees.push(
                      ...task.assignees.map(
                        (member) => member.displayName || member.name || member.lineUserId
                      )
                    );
                  }
                  if (Array.isArray(task.assignedUsers)) {
                    assignees.push(
                      ...task.assignedUsers.map(
                        (member) => member.displayName || member.name || member.lineUserId
                      )
                    );
                  }
                  if (task.assignee) {
                    assignees.push(
                      task.assignee.name ||
                        task.assignee.displayName ||
                        task.assignee.lineUserId ||
                        ''
                    );
                  }

                  return (
                    <tr
                      key={task.id}
                      className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => openTaskDetail(task)}
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">{task.title}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {statusLabels[status] || status}
                        </span>
                      </td>
                      <td className="py-3 px-4 capitalize text-gray-600">{task.priority || '-'}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {date ? formatTaskDue(task) : 'ไม่กำหนด'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {assignees.length > 0 ? Array.from(new Set(assignees)).join(', ') : 'ไม่ระบุ'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
