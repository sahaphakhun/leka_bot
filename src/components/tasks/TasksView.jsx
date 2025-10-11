import { useState } from 'react';
import { Plus, Table, LayoutGrid } from 'lucide-react';
import TableView from './TableView';
import KanbanView from './KanbanView';

const TasksView = ({ tasks = [], onTaskUpdate }) => {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">Tasks</h1>
            <button className="btn-bordio flex items-center gap-2">
              <Plus size={16} />
              Add new
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-border text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Table size={16} />
              Table view
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-border text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid size={16} />
              Kanban board
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'table' ? (
        <TableView tasks={tasks} onTaskUpdate={onTaskUpdate} />
      ) : (
        <KanbanView tasks={tasks} onTaskUpdate={onTaskUpdate} />
      )}
    </div>
  );
};

export default TasksView;

