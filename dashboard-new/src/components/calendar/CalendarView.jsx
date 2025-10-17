import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, ListTodo } from 'lucide-react';
import TaskCard from '../common/TaskCard';
import { useModal } from '../../context/ModalContext';

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

// onTaskUpdate รองรับการอัปเดตสถานะงานในอนาคต
const CalendarView = ({ tasks = [], onTaskUpdate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const { openTaskDetail } = useModal();

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

    // Previous month padding
    for (let i = startWeekday - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
      });
    }

    // Next month padding
    while (days.length % 7 !== 0) {
      const lastDay = days[days.length - 1].date;
      days.push({
        date: new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1),
        isCurrentMonth: false,
      });
    }

    // Convert to weeks
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [currentDate]);

  const getTasksForDate = (date) => {
    return tasks.filter((task) => {
      const taskDate = getTaskDate(task);
      if (!taskDate) return false;
      return startOfDay(taskDate).getTime() === startOfDay(date).getTime();
    });
  };

  const isCompleted = (task) => completedStatuses.includes(task.status);

  const getStatusVariant = (task) => {
    const date = getTaskDate(task);
    if (isCompleted(task)) return 'completed';
    if (date && date < today) return 'overdue';
    return 'pending';
  };

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

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const date = getTaskDate(task);
        if (!date) return false;
        if (isCompleted(task)) return false;
        return date > endOfToday && date <= upcomingLimit;
      })
      .sort((a, b) => (getTaskDate(a) || 0) - (getTaskDate(b) || 0))
      .slice(0, 8);
  }, [tasks, endOfToday, upcomingLimit]);

  const waitingTasks = useMemo(
    () =>
      tasks
        .filter((task) => !getTaskDate(task) && !isCompleted(task))
        .slice(0, 10),
    [tasks]
  );

  const selectedDayTasks = useMemo(() => getTasksForDate(selectedDate), [selectedDate, tasks]);

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

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(startOfDay(now));
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentDate(now);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ปฏิทินงาน</h1>
          <p className="text-muted-foreground">
            ดูกำหนดการงานทั้งหมดในมุมมองรายเดือน พร้อมงานที่กำลังจะถึง
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Month Navigation */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="p-2 rounded-md hover:bg-gray-100 transition"
            aria-label="เดือนก่อน"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {formatMonthTitle(currentDate)}
          </h2>
          <button
            type="button"
            onClick={goToNextMonth}
            className="p-2 rounded-md hover:bg-gray-100 transition"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            งานที่ต้องทำ
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            เสร็จแล้ว
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            เกินกำหนด
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        {/* Calendar Grid */}
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
                  key={index}
                  onClick={() => setSelectedDate(startOfDay(date))}
                  className={`min-h-[110px] rounded-lg border text-left p-2 transition ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/40'
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

                  <div className="space-y-1 mt-2">
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
                          className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded ${colorClass} truncate`}
                        >
                          <span className="truncate">{task.title}</span>
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

          {/* Selected Day Detail */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-500" />
              <div>
                <h2 className="text-lg font-semibold">งานในวันที่เลือก</h2>
                <p className="text-sm text-muted-foreground">
                  {formatLongDate(selectedDate)}
                </p>
              </div>
            </div>
            <div className="p-5">
              {selectedDayTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ไม่มีงานในวันนี้
                </p>
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

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">งานที่กำลังจะถึง</h2>
                <p className="text-xs text-muted-foreground">
                  ภายใน 7 วันข้างหน้า
                </p>
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
                    className="w-full text-left border border-gray-100 rounded-lg px-4 py-3 hover:bg-gray-50 transition"
                  >
                    <p className="font-medium text-sm line-clamp-1">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTaskDue(task)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">งานที่ยังไม่มีกำหนด</h2>
                <p className="text-xs text-muted-foreground">
                  จัดตารางเวลาให้พร้อมก่อนส่ง
                </p>
              </div>
              <ListTodo className="w-5 h-5 text-orange-500" />
            </div>
            <div className="p-5 space-y-3">
              {waitingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">
                  งานทุกชิ้นถูกจัดตารางเรียบร้อยแล้ว
                </p>
              ) : (
                waitingTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => openTaskDetail(task)}
                    className="w-full text-left border border-dashed border-gray-200 rounded-lg px-4 py-3 hover:border-blue-200 hover:bg-blue-50/30 transition"
                  >
                    <p className="font-medium text-sm line-clamp-1">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ยังไม่กำหนดวันส่ง
                    </p>
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

export default CalendarView;
