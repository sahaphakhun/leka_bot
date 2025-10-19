import { useMemo, useState } from "react";
import { Plus, Table, LayoutGrid, RotateCcw, Filter } from "lucide-react";
import TableView from "./TableView";
import KanbanView from "./KanbanView";
import { useModal } from "../../context/ModalContext";

const TasksView = ({ tasks = [], onTaskUpdate }) => {
  const completedStatuses = useMemo(
    () =>
      new Set([
        "completed",
        "approved",
        "submitted",
        "reviewed",
        "auto_approved",
      ]),
    [],
  );
  const inProgressStatuses = useMemo(
    () => new Set(["in_progress", "in-progress", "processing", "review"]),
    [],
  );
  const pendingStatuses = useMemo(
    () => new Set(["pending", "waiting", "scheduled", "new"]),
    [],
  );

  const [viewMode, setViewMode] = useState("table"); // 'table' | 'kanban'
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    assignee: "",
    due: "",
    search: "",
  });
  const { openAddTask, openTaskDetail } = useModal();

  const handleAddTask = () => {
    openAddTask("normal");
  };

  const handleTaskClick = (task) => {
    if (task) {
      openTaskDetail(task);
    }
  };

  const assigneeOptions = useMemo(() => {
    const names = new Set();
    tasks.forEach((task) => {
      if (Array.isArray(task.assignedUsers)) {
        task.assignedUsers.forEach((member) =>
          names.add(member.displayName || member.name || member.lineUserId),
        );
      }
      if (task.assignee) {
        names.add(
          task.assignee.name ||
            task.assignee.displayName ||
            task.assignee.lineUserId,
        );
      }
    });
    return Array.from(names);
  }, [tasks]);

  const getTaskDate = (task) => {
    if (task.dueDate) return new Date(task.dueDate);
    if (task.dueTime) return new Date(task.dueTime);
    if (task.scheduledDate) return new Date(task.scheduledDate);
    if (task.startTime) return new Date(task.startTime);
    return null;
  };

  const startOfToday = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const endOfToday = useMemo(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        !filters.search ||
        (task.title || "")
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        (task.description || "")
          .toLowerCase()
          .includes(filters.search.toLowerCase());

      if (!matchesSearch) return false;

      if (filters.status) {
        const status = task.status;
        if (filters.status === "pending" && !pendingStatuses.has(status)) {
          return false;
        }
        if (
          filters.status === "in_progress" &&
          !inProgressStatuses.has(status)
        ) {
          return false;
        }
        if (filters.status === "completed" && !completedStatuses.has(status)) {
          return false;
        }
        if (filters.status === "overdue") {
          const date = getTaskDate(task);
          const isOverdueStatus = status === "overdue";
          if (!isOverdueStatus) {
            if (
              !date ||
              date >= startOfToday ||
              completedStatuses.has(status)
            ) {
              return false;
            }
          }
        }
      }

      if (filters.priority) {
        if ((task.priority || "").toLowerCase() !== filters.priority)
          return false;
      }

      if (filters.assignee) {
        const assignedNames = new Set();
        if (Array.isArray(task.assignedUsers)) {
          task.assignedUsers.forEach((member) =>
            assignedNames.add(
              member.displayName || member.name || member.lineUserId,
            ),
          );
        }
        if (task.assignee) {
          assignedNames.add(
            task.assignee.name ||
              task.assignee.displayName ||
              task.assignee.lineUserId,
          );
        }
        if (!assignedNames.has(filters.assignee)) return false;
      }

      if (filters.due) {
        const date = getTaskDate(task);
        if (!date) {
          if (filters.due !== "unscheduled") return false;
        } else {
          const dateValue = date.getTime();
          const todayValue = startOfToday.getTime();
          if (filters.due === "today") {
            if (!(date >= startOfToday && date <= endOfToday)) return false;
          } else if (filters.due === "tomorrow") {
            const tomorrow = new Date(startOfToday);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const endTomorrow = new Date(tomorrow);
            endTomorrow.setHours(23, 59, 59, 999);
            if (!(date >= tomorrow && date <= endTomorrow)) return false;
          } else if (filters.due === "week") {
            const nextWeek = new Date(startOfToday);
            nextWeek.setDate(nextWeek.getDate() + 7);
            if (!(date >= startOfToday && date <= nextWeek)) return false;
          } else if (filters.due === "overdue") {
            if (dateValue >= todayValue || completedStatuses.has(task.status))
              return false;
          }
        }
      }

      return true;
    });
  }, [tasks, filters, startOfToday, endOfToday]);

  const resetFilters = () => {
    setFilters({
      status: "",
      priority: "",
      assignee: "",
      due: "",
      search: "",
    });
  };

  const summaryCounts = useMemo(() => {
    const total = filteredTasks.length;
    const pending = filteredTasks.filter((task) =>
      pendingStatuses.has(task.status),
    ).length;
    const inProgress = filteredTasks.filter((task) =>
      inProgressStatuses.has(task.status),
    ).length;
    const completed = filteredTasks.filter((task) =>
      completedStatuses.has(task.status),
    ).length;
    const overdue = filteredTasks.filter((task) => {
      if (task.status === "overdue") return true;
      const date = getTaskDate(task);
      return date && date < startOfToday && !completedStatuses.has(task.status);
    }).length;
    return { total, pending, inProgress, completed, overdue };
  }, [
    filteredTasks,
    startOfToday,
    completedStatuses,
    inProgressStatuses,
    pendingStatuses,
  ]);

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">จัดการงานทั้งหมด</h1>
            <button
              type="button"
              onClick={handleAddTask}
              className="btn-bordio flex items-center gap-2"
            >
              <Plus size={16} />
              เพิ่มงาน
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("table")}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                viewMode === "table"
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-border text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Table size={16} />
              มุมมองตาราง
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                viewMode === "kanban"
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-border text-gray-700 hover:bg-gray-50"
              }`}
            >
              <LayoutGrid size={16} />
              กระดานคัมบัน
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-border bg-white">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-600">
          <Filter className="w-4 h-4" />
          ตัวกรองงาน
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">
              สถานะ
            </label>
            <select
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="">ทั้งหมด</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="completed">เสร็จแล้ว</option>
              <option value="overdue">เกินกำหนด</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">
              ความสำคัญ
            </label>
            <select
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
              value={filters.priority}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, priority: e.target.value }))
              }
            >
              <option value="">ทั้งหมด</option>
              <option value="low">ต่ำ</option>
              <option value="medium">ปานกลาง</option>
              <option value="high">สูง</option>
              <option value="urgent">เร่งด่วน</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">
              ผู้รับผิดชอบ
            </label>
            <select
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
              value={filters.assignee}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, assignee: e.target.value }))
              }
            >
              <option value="">ทั้งหมด</option>
              {assigneeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">
              กำหนดส่ง
            </label>
            <select
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
              value={filters.due}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, due: e.target.value }))
              }
            >
              <option value="">ทั้งหมด</option>
              <option value="today">วันนี้</option>
              <option value="tomorrow">พรุ่งนี้</option>
              <option value="week">7 วันข้างหน้า</option>
              <option value="overdue">เกินกำหนด</option>
              <option value="unscheduled">ยังไม่กำหนด</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-4">
          <input
            type="text"
            placeholder="ค้นหาชื่องานหรือรายละเอียด..."
            className="flex-1 border border-border rounded-md px-3 py-2 text-sm"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-md text-sm hover:bg-gray-50 transition"
          >
            <RotateCcw className="w-4 h-4" />
            รีเซ็ตตัวกรอง
          </button>
        </div>
      </div>

      <div className="px-6 py-4 bg-white border-b border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs text-blue-700">งานที่แสดง</p>
            <p className="text-2xl font-semibold text-blue-700">
              {summaryCounts.total}
            </p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs text-amber-700">รอดำเนินการ</p>
            <p className="text-2xl font-semibold text-amber-700">
              {summaryCounts.pending + summaryCounts.inProgress}
            </p>
          </div>
          <div className="rounded-lg border border-green-100 bg-green-50 p-4">
            <p className="text-xs text-green-700">เสร็จแล้ว</p>
            <p className="text-2xl font-semibold text-green-700">
              {summaryCounts.completed}
            </p>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50 p-4">
            <p className="text-xs text-red-700">เกินกำหนด</p>
            <p className="text-2xl font-semibold text-red-700">
              {summaryCounts.overdue}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === "table" ? (
        <TableView
          tasks={filteredTasks}
          onTaskUpdate={onTaskUpdate}
          onTaskClick={handleTaskClick}
          onCreateTask={handleAddTask}
        />
      ) : (
        <KanbanView
          tasks={filteredTasks}
          onTaskUpdate={onTaskUpdate}
          onTaskClick={handleTaskClick}
          onCreateTask={handleAddTask}
        />
      )}
    </div>
  );
};

export default TasksView;
