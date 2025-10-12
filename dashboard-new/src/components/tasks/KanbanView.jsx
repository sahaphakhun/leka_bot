import { Plus, Mail, Calendar as CalendarIcon, Wrench, CheckCircle } from 'lucide-react';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from '../common/TaskCard';

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

const KanbanView = ({ tasks = [], onTaskUpdate, onTaskClick, onCreateTask }) => {
  const columns = [
    { id: 'new', title: 'New task', icon: Mail, status: 'new' },
    { id: 'scheduled', title: 'Scheduled', icon: CalendarIcon, status: 'scheduled' },
    { id: 'in-progress', title: 'In progress', icon: Wrench, status: 'in-progress' },
    { id: 'completed', title: 'Completed', icon: CheckCircle, status: 'completed' }
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  const getTasksByStatus = (status) => {
    return tasks.filter(task => {
      // Normalize status (handle both 'in-progress' and 'in_progress')
      const taskStatus = task.status?.replace('_', '-');
      return taskStatus === status;
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    // Get the column the task was dropped on
    const overColumn = columns.find(col => 
      over.id === col.id || getTasksByStatus(col.status).some(t => t.id === over.id)
    );

    if (!overColumn) return;

    // If the task status needs to change
    if (activeTask.status !== overColumn.status) {
      const newStatus = overColumn.status;
      
      // Call the update callback if provided
      if (onTaskUpdate) {
        onTaskUpdate(activeTask.id, { status: newStatus });
      }

      console.log(`Task ${activeTask.id} moved from ${activeTask.status} to ${newStatus}`);
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
            const columnTasks = getTasksByStatus(column.status);
            const Icon = column.icon;
            
            return (
              <div key={column.id} className="kanban-column">
                <div className="kanban-column-header">
                  <div className="flex items-center gap-2">
                    <Icon size={16} />
                    <span>{column.title}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-white rounded-full text-xs text-gray-600">
                    {columnTasks.length}
                  </span>
                </div>
                
                <SortableContext
                  items={columnTasks.map(t => t.id)}
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
                      onClick={() => onCreateTask && onCreateTask()}
                      className="w-full py-2 text-sm text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      + Create task
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
