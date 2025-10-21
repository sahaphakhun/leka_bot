import { memo } from "react";
import { Clock } from "lucide-react";

const normalizeStatus = (status) => {
  if (!status) return "pending";
  const normalized = status.toLowerCase();
  if (normalized === "in-progress") return "in-progress";
  if (normalized === "in_progress") return "in-progress";
  if (
    ["approved", "submitted", "reviewed", "auto_approved"].includes(normalized)
  ) {
    return "completed";
  }
  if (normalized === "waiting") return "pending";
  if (normalized === "scheduled") return "scheduled";
  return normalized;
};

const TaskCard = memo(({ task, onClick }) => {
  const getStatusClass = (status) => {
    const statusMap = {
      pending: "task-card-new",
      scheduled: "task-card-scheduled",
      "in-progress": "task-card-in-progress",
      completed: "task-card-completed",
      overdue: "task-card-overdue",
      cancelled: "task-card-new",
    };
    return statusMap[status] || statusMap.pending;
  };

  return (
    <div
      className={`task-card ${getStatusClass(normalizeStatus(task.status))}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-foreground line-clamp-2">
          {task.title}
        </h4>
        {task.priority && (
          <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600">
            !
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
              {task.assignee.avatar ? (
                <img
                  src={task.assignee.avatar}
                  alt={task.assignee.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>
                  {(task.assignee.name || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          )}
        </div>

        {task.estimatedTime && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={12} />
            <span>{task.estimatedTime}</span>
          </div>
        )}
      </div>
    </div>
  );
});

TaskCard.displayName = "TaskCard";

export default TaskCard;
