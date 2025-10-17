import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const TableView = ({ tasks = [], onTaskClick, onCreateTask }) => {
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
    const normalized = status?.replace('_', '-');
    const statusMap = {
      'new': { class: 'bg-purple-100 text-purple-700', label: 'งานใหม่' },
      'scheduled': { class: 'bg-blue-100 text-blue-700', label: 'รอกำหนดส่ง' },
      'in-progress': { class: 'bg-amber-100 text-amber-700', label: 'กำลังดำเนินการ' },
      'completed': { class: 'bg-green-100 text-green-700', label: 'เสร็จแล้ว' },
      'overdue': { class: 'bg-red-100 text-red-700', label: 'เกินกำหนด' },
    };
    return statusMap[normalized] || statusMap['new'];
  };

  const formatTaskType = (type) => {
    const typeMap = {
      operational: 'งานทั่วไป',
      report: 'รายงาน',
      meeting: 'การประชุม',
      project: 'โครงการ',
      maintenance: 'บำรุงรักษา',
    };
    if (!type) return 'อื่นๆ';
    return typeMap[type] || typeMap[type?.toLowerCase?.()] || type || 'อื่นๆ';
  };

  const formatDueDate = (date) => {
    if (!date) return 'ไม่กำหนด';
    try {
      return new Date(date).toLocaleDateString('th-TH', { dateStyle: 'medium' });
    } catch (error) {
      return date;
    }
  };

  const getAssigneeNames = (task) => {
    const candidates = [];
    if (Array.isArray(task.assignees)) {
      task.assignees.forEach((member) =>
        candidates.push(member.displayName || member.name || member.lineUserId)
      );
    }
    if (Array.isArray(task.assignedUsers)) {
      task.assignedUsers.forEach((member) =>
        candidates.push(member.displayName || member.name || member.lineUserId)
      );
    }
    if (task.assignee) {
      candidates.push(
        task.assignee.name || task.assignee.displayName || task.assignee.lineUserId
      );
    }
    const unique = candidates.filter(Boolean);
    if (unique.length === 0) return 'ไม่ระบุ';
    return Array.from(new Set(unique)).join(', ');
  };

  const TaskRow = ({ task, onClick }) => {
    const statusBadge = getStatusBadge(task.status);
    
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick && onClick(task)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick && onClick(task);
          }
        }}
        className="grid grid-cols-[3fr_1.5fr_1fr_1fr_0.5fr] gap-4 px-4 py-3 border-b border-border hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <div className="font-medium text-sm">{task.title}</div>
        <div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.class}`}>
            {statusBadge.label}
          </span>
        </div>
        <div className="text-sm text-gray-600">{formatTaskType(task.type)}</div>
        <div className="text-sm text-gray-600">
          {formatDueDate(task.dueDate || task.scheduledDate)}
        </div>
        <div className="flex justify-end">
          <span className="text-sm text-gray-600 truncate max-w-[120px]">
            {getAssigneeNames(task)}
          </span>
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
          <h3 className="font-semibold">งานที่ยังเปิดอยู่</h3>
          <span className="text-sm text-gray-500">{activeTasks.length}</span>
        </div>
        
        {expandedSections.active && (
          <>
            <div className="grid grid-cols-[3fr_1.5fr_1fr_1fr_0.5fr] gap-4 px-4 py-2 bg-gray-50 text-sm font-medium text-gray-600">
              <div>ชื่องาน</div>
              <div>สถานะ</div>
              <div>ประเภท</div>
              <div>กำหนดส่ง</div>
              <div className="text-right">ผู้รับผิดชอบ</div>
            </div>
            
            {activeTasks.map((task) => (
              <TaskRow key={task.id} task={task} onClick={onTaskClick} />
            ))}
            
            <div className="px-4 py-3">
              <button
                type="button"
                onClick={() => onCreateTask && onCreateTask()}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                + เพิ่มงาน
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
          <h3 className="font-semibold">งานที่เสร็จแล้ว</h3>
          <span className="text-sm text-gray-500">{completedTasks.length}</span>
        </div>
        
        {expandedSections.completed && (
          <>
            <div className="grid grid-cols-[3fr_1.5fr_1fr_1fr_0.5fr] gap-4 px-4 py-2 bg-gray-50 text-sm font-medium text-gray-600">
              <div>ชื่องาน</div>
              <div>สถานะ</div>
              <div>ประเภท</div>
              <div>กำหนดส่ง</div>
              <div className="text-right">ผู้รับผิดชอบ</div>
            </div>
            
            {completedTasks.map((task) => (
              <TaskRow key={task.id} task={task} onClick={onTaskClick} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default TableView;
