import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import TaskCard from '../common/TaskCard';

const CalendarView = ({ tasks = [], onTaskUpdate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get days for current week
  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Start from Monday
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { day: 'numeric', weekday: 'short' });
  };

  const formatMonth = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getTasksForDay = (date) => {
    return tasks.filter(task => {
      if (!task.scheduledDate && !task.dueDate) return false;
      const taskDate = new Date(task.scheduledDate || task.dueDate);
      return taskDate.toDateString() === date.toDateString();
    });
  };

  const getTotalTimeForDay = (date) => {
    const dayTasks = getTasksForDay(date);
    const totalMinutes = dayTasks.reduce((sum, task) => {
      const time = task.estimatedTime || task.timeEstimate || '0h';
      const hours = parseInt(time) || 0;
      return sum + (hours * 60);
    }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h 0m`;
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <button className="btn-bordio flex items-center gap-2">
            <Plus size={16} />
            Add new
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={goToToday}
            className="px-4 py-2 bg-white border border-border rounded-md text-sm font-medium hover:bg-gray-50"
          >
            Today
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={previousWeek}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-lg font-medium min-w-[200px] text-center">
              {formatMonth(currentDate)}
            </span>
            <button 
              onClick={nextWeek}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const dayTasks = getTasksForDay(day);
          const totalTime = getTotalTimeForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();
          
          return (
            <div 
              key={index}
              className={`calendar-day ${isToday ? 'border-blue-500 border-2' : ''}`}
            >
              <div className="calendar-day-header">
                <span className={isToday ? 'text-blue-500 font-bold' : ''}>
                  {formatDate(day)}
                </span>
                <span className="calendar-day-time">{totalTime}</span>
              </div>
              
              <div className="space-y-2 mt-2">
                {dayTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task}
                    onClick={() => console.log('Task clicked:', task)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Waiting List (Right Panel) */}
      <div className="fixed right-0 top-0 w-80 h-screen bg-white border-l border-border p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            ⏳ Waiting list
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
              {tasks.filter(t => !t.scheduledDate && !t.dueDate).length}
            </span>
          </h3>
          <button className="text-blue-500 hover:text-blue-600">
            <Plus size={20} />
          </button>
        </div>
        
        <div className="space-y-2">
          {tasks.filter(t => !t.scheduledDate && !t.dueDate).map((task) => (
            <TaskCard 
              key={task.id} 
              task={task}
              onClick={() => console.log('Task clicked:', task)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;

