import {
  Plus,
  Mail,
  Calendar as CalendarIcon,
  Wrench,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TaskCard from "../common/TaskCard";
import { useAuth } from "../../context/AuthContext";
import { showWarning } from "../../lib/toast";

// Draggable Task Card Component
const DraggableTaskCard = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="kanban-card"
    >
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
};

const KanbanView = ({
  tasks = [],
  onTaskUpdate,
  onTaskClick,
  onCreateTask,
}) => {
  const { canModify } = useAuth();

  const completedStatuses = new Set([
    "completed",
    "approved",
    "submitted",
    "reviewed",
    "auto_approved",
    "cancelled",
  ]);
  const inProgressStatuses = new Set([
    "in_progress",
    "in-progress",
    "processing",
    "review",
  ]);
  const pendingStatuses = new Set(["pending", "waiting", "scheduled", "new"]);

  const normalizeStatus = (status) => {
    if (!status) return "pending";
    const lowered = status.toLowerCase();
    if (lowered === "in-progress") return "in_progress";
    return lowered;
  };

  const columns = [
    {
      id: "pending",
      title: "รอดำเนินการ",
      icon: Mail,
      match: (status) => pendingStatuses.has(status),
    },
    {
      id: "in_progress",
      title: "กำลังดำเนินการ",
      icon: Wrench,
      match: (status) => inProgressStatuses.has(status),
    },
    {
      id: "overdue",
      title: "เกินกำหนด",
      icon: AlertTriangle,
      match: (status) => status === "overdue",
    },
    {
      id: "completed",
      title: "เสร็จแล้ว",
      icon: CheckCircle,
      match: (status) => completedStatuses.has(status),
    },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
  );

  const getTasksByStatus = (column) => {
    return tasks.filter((task) => column.match(normalizeStatus(task.status)));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) return;

    // Check permission before allowing drag-and-drop
    if (!canModify()) {
      showWarning("คุณไม่มีสิทธิ์แก้ไขสถานะงาน - กรุณาเข้าผ่าน LINE ส่วนตัว");
      return;
    }

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Get the column the task was dropped on
    const overColumn = columns.find(
      (col) =>
        over.id === col.id ||
        getTasksByStatus(col).some((t) => t.id === over.id),
    );

    if (!overColumn) return;

    // If the task status needs to change
    const normalizedStatus = normalizeStatus(activeTask.status);

    if (!overColumn.match(normalizeStatus(activeTask.status))) {
      let newStatus = "pending";

      if (overColumn.id === "in_progress") newStatus = "in_progress";
      if (overColumn.id === "overdue") newStatus = "overdue";
      if (overColumn.id === "completed") newStatus = "completed";

      if (onTaskUpdate) {
        onTaskUpdate(activeTask.id, { status: newStatus });
      }

      console.log(
        `Task ${activeTask.id} moved from ${normalizedStatus} to ${newStatus}`,
      );
    }
  };

  return (
    <div className="p-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column);
            const Icon = column.icon;

            return (
              <div key={column.id} className="kanban-column">
                <div className="kanban-column-header">
                  <div className="flex items-center gap-2">
                    <Icon size={16} />
                    <span>{column.title}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-white rounded-full text-xs text-gray-600">
                    {columnTasks.length} งาน
                  </span>
                </div>

                <SortableContext
                  items={columnTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                  id={column.id}
                >
                  <div className="space-y-2 min-h-[400px]">
                    {columnTasks.map((task) => (
                      <DraggableTaskCard
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick && onTaskClick(task)}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        if (!canModify()) {
                          showWarning(
                            "คุณไม่มีสิทธิ์สร้างงาน - กรุณาเข้าผ่าน LINE ส่วนตัว",
                          );
                          return;
                        }
                        onCreateTask && onCreateTask();
                      }}
                      disabled={!canModify()}
                      className="w-full py-2 text-sm text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!canModify() ? "ไม่มีสิทธิ์สร้างงาน" : "สร้างงาน"}
                    >
                      + สร้างงาน
                    </button>
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
};

export default KanbanView;
