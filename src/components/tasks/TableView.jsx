import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const TableView = ({ tasks = [] }) => {
  const [expandedSections, setExpandedSections] = useState({
    active: true,
    completed: false
  });

  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'new': { class: 'badge-new', label: 'New task' },
      'scheduled': { class: 'badge-scheduled', label: 'Scheduled' },
      'in-progress': { class: 'badge-in-progress', label: 'In progress' },
      'completed': { class: 'badge-completed', label: 'Completed' }
    };
    return statusMap[status] || statusMap['new'];
  };

  const TaskRow = ({ task }) => {
    const statusBadge = getStatusBadge(task.status);
    
    return (
      <div className="grid grid-cols-[3fr_1.5fr_1fr_1fr_0.5fr] gap-4 px-4 py-3 border-b border-border hover:bg-gray-50 transition-colors">
        <div className="font-medium text-sm">{task.title}</div>
        <div>
          <span className={`badge-bordio ${statusBadge.class}`}>
            {statusBadge.label}
          </span>
        </div>
        <div className="text-sm text-gray-600">{task.type || 'Operational'}</div>
        <div className="text-sm text-gray-600">
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
        </div>
        <div className="flex justify-end">
          {task.assignee && (
            <img 
              src={task.assignee.avatar || `https://ui-avatars.com/api/?name=${task.assignee.name}&background=4A90E2&color=fff`}
              alt={task.assignee.name}
              className="avatar-bordio avatar-sm"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Active Tasks Section */}
      <div className="bg-white rounded-lg shadow-sm mb-4">
        <div 
          className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('active')}
        >
          {expandedSections.active ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <h3 className="font-semibold">Active tasks</h3>
          <span className="text-sm text-gray-500">{activeTasks.length}</span>
        </div>
        
        {expandedSections.active && (
          <>
            <div className="grid grid-cols-[3fr_1.5fr_1fr_1fr_0.5fr] gap-4 px-4 py-2 bg-gray-50 text-sm font-medium text-gray-600">
              <div>Task name</div>
              <div>Status</div>
              <div>Type</div>
              <div>Due date</div>
              <div className="text-right">Responsible</div>
            </div>
            
            {activeTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
            
            <div className="px-4 py-3">
              <button className="text-sm text-blue-500 hover:text-blue-600">
                + Add task
              </button>
            </div>
          </>
        )}
      </div>

      {/* Completed Tasks Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div 
          className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('completed')}
        >
          {expandedSections.completed ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <h3 className="font-semibold">Completed tasks</h3>
          <span className="text-sm text-gray-500">{completedTasks.length}</span>
        </div>
        
        {expandedSections.completed && (
          <>
            <div className="grid grid-cols-[3fr_1.5fr_1fr_1fr_0.5fr] gap-4 px-4 py-2 bg-gray-50 text-sm font-medium text-gray-600">
              <div>Task name</div>
              <div>Status</div>
              <div>Type</div>
              <div>Due date</div>
              <div className="text-right">Responsible</div>
            </div>
            
            {completedTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default TableView;

