import { useState } from "react";
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
import { showWarning, showSuccess, showError } from "../../lib/toast";

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
  const { canModify, groupId } = useAuth();
  const [updating, setUpdating] = useState(false);

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
    if (lowered === "waiting" || lowered === "scheduled") return "pending";
    if (
      [
        "approved",
        "submitted",
        "reviewed",
        "auto_approved",
        "done",
        "cancelled",
      ].includes(lowered)
    ) {
      return "completed";
    }
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

  const handleDragEnd = async (event) => {
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

      // Optimistic update - call parent callback immediately
      if (onTaskUpdate) {
        onTaskUpdate(activeTask.id, { status: newStatus });
      }

      // Persist to backend with loading overlay
      setUpdating(true);
      try {
        const { updateTask } = await import("../../services/api");
        await updateTask(groupId, activeTask.id, { status: newStatus });

        showSuccess(`อัปเดตสถานะเป็น "${overColumn.title}" สำเร็จ`);
        console.log(
          `✅ Task ${activeTask.id} moved from ${normalizedStatus} to ${newStatus}`,
        );
      } catch (error) {
        console.error("❌ Failed to update task status:", error);
        showError("ไม่สามารถอัปเดตสถานะงานได้", error);

        // Rollback on error - revert to original status
        if (onTaskUpdate) {
          onTaskUpdate(activeTask.id, { status: activeTask.status });
        }
      } finally {
        setUpdating(false);
      }
    }
  };

  return (
    <div className="p-3 md:p-6 relative">
      {/* Loading overlay during update */}
      {updating && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
          <div className="bg-white rounded-lg shadow-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            <span className="text-gray-700 font-medium">
              กำลังอัปเดตสถานะงาน...
            </span>
          </div>
        </div>
      )}

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
