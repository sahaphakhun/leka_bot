import { CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import TaskCard from './common/TaskCard';
import { useAuth } from '../context/AuthContext';

const DashboardView = ({ tasks = [], stats = {} }) => {
  const { viewMode, isPersonalMode, currentGroup } = useAuth();
  
  const defaultStats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
    overdueTasks: tasks.filter(t => t.status === 'overdue').length,
  };

  const statsData = { ...defaultStats, ...stats };

  const statCards = [
    {
      title: 'Total Tasks',
      value: statsData.totalTasks,
      icon: CheckCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'In Progress',
      value: statsData.inProgressTasks,
      icon: Clock,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Completed',
      value: statsData.completedTasks,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Overdue',
      value: statsData.overdueTasks,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50'
    }
  ];

  const todayTasks = tasks.filter(task => {
    const today = new Date().toDateString();
    const taskDate = task.scheduledDate ? new Date(task.scheduledDate).toDateString() : null;
    return taskDate === today;
  });

  return (
    <div className="p-6">
      {/* Header with mode indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            {isPersonalMode() ? '📋 งานของฉัน' : '👥 งานกลุ่ม'}
          </h1>
          <div className="text-sm">
            {isPersonalMode() ? (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                👤 Personal Mode
              </span>
            ) : (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                👥 Group Mode
              </span>
            )}
          </div>
        </div>
        {currentGroup && (
          <p className="text-gray-600 mt-2 text-sm">
            กลุ่ม: {currentGroup.name || 'ไม่ระบุชื่อ'}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                  <Icon size={24} />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.title}</div>
            </div>
          );
        })}
      </div>

      {/* Today's Tasks */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Today's Tasks</h2>
        {todayTasks.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => console.log('Task clicked:', task)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No tasks scheduled for today</p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="mt-6 bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {tasks.slice(0, 5).map((task) => (
            <div key={task.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-gray-500">
                  {task.assignee?.name} • {task.status}
                </p>
              </div>
              <div className="text-xs text-gray-400">
                {task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString() : 'No date'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;

