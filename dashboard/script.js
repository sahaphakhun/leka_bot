/**
 * เลขาบอท Dashboard - Mobile First JavaScript
 */

// Global variables
let currentView = 'dashboard';
let currentUser = null;
let currentGroup = null;
let tasks = [];
let files = [];
let leaderboard = [];

// Initialize moment.js
let moment;
if (typeof window !== 'undefined' && window.moment) {
  moment = window.moment;
  if (moment && moment.tz) {
    console.log('✅ moment-timezone โหลดสำเร็จ');
    moment.tz.setDefault('Asia/Bangkok');
  } else {
    console.warn('⚠️ moment-timezone ไม่ได้โหลด');
    moment = window.moment;
  }
} else {
  console.warn('⚠️ moment ไม่ได้โหลด');
  moment = {
    format: (format) => new Date().toLocaleString('th-TH'),
    tz: (timezone) => new Date().toLocaleString('th-TH'),
    setDefault: () => {},
    utc: () => new Date(),
    unix: (timestamp) => new Date(timestamp * 1000)
  };
}

// Utility functions
const utils = {
  formatDate: (date) => {
    if (!date) return '-';
    return moment(date).format('DD/MM/YYYY HH:mm');
  },
  
  formatDateShort: (date) => {
    if (!date) return '-';
    return moment(date).format('DD/MM/YYYY');
  },
  
  timeAgo: (date) => {
    if (!date) return '-';
    return moment(date).fromNow();
  },
  
  getStatusColor: (status) => {
    const colors = {
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      overdue: 'danger'
    };
    return colors[status] || 'gray';
  },
  
  getPriorityColor: (priority) => {
    const colors = {
      low: 'info',
      medium: 'warning',
      high: 'danger'
    };
    return colors[priority] || 'gray';
  },
  
  showToast: (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="toast-icon fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation-triangle' : 'info'}-circle"></i>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    const container = document.getElementById('toastContainer');
    container.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);
  },
  
  showLoading: () => {
    document.getElementById('loadingScreen').style.display = 'flex';
  },
  
  hideLoading: () => {
    document.getElementById('loadingScreen').style.display = 'none';
  },
  
  showModal: (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },
  
  hideModal: (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
};

// API functions
const api = {
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`/api${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      utils.showToast(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
      throw error;
    }
  },
  
  async getTasks(filters = {}) {
    const params = new URLSearchParams(filters);
    return await this.request(`/tasks?${params}`);
  },
  
  async getFiles(filters = {}) {
    const params = new URLSearchParams(filters);
    return await this.request(`/files?${params}`);
  },
  
  async getLeaderboard(period = 'weekly') {
    return await this.request(`/leaderboard?period=${period}`);
  },
  
  async getStats(period = 'this_week') {
    return await this.request(`/stats?period=${period}`);
  },
  
  async getMembers() {
    return await this.request('/members');
  },
  
  async addTask(taskData) {
    return await this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }
};

// View management
const viewManager = {
  init() {
    this.bindNavigation();
    this.bindPeriodTabs();
    this.bindQuickActions();
    this.bindModals();
  },
  
  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        this.switchView(view);
      });
    });
  },
  
  switchView(view) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    
    // Update views
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
    });
    document.getElementById(`${view}View`).classList.add('active');
    
    currentView = view;
    
    // Load view data
    this.loadViewData(view);
  },
  
  async loadViewData(view) {
    try {
      switch (view) {
        case 'dashboard':
          await this.loadDashboard();
          break;
        case 'calendar':
          await this.loadCalendar();
          break;
        case 'tasks':
          await this.loadTasks();
          break;
        case 'files':
          await this.loadFiles();
          break;
        case 'leaderboard':
          await this.loadLeaderboard();
          break;
      }
    } catch (error) {
      console.error(`Error loading ${view} data:`, error);
    }
  },
  
  bindPeriodTabs() {
    document.querySelectorAll('.period-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const period = tab.getAttribute('data-period');
        this.switchPeriod(period);
      });
    });
  },
  
  switchPeriod(period) {
    document.querySelectorAll('.period-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-period="${period}"]`).classList.add('active');
    
    // Reload current view with new period
    this.loadViewData(currentView);
  },
  
  bindQuickActions() {
    document.getElementById('addTaskBtn')?.addEventListener('click', () => {
      this.showAddTaskModal();
    });
    
    document.getElementById('submitTaskBtn')?.addEventListener('click', () => {
      this.showSubmitTaskModal();
    });
    
    document.getElementById('reviewTaskBtn')?.addEventListener('click', () => {
      this.showReviewTaskModal();
    });
    
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
      this.loadViewData(currentView);
    });
  },
  
  bindModals() {
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          utils.hideModal(modal.id);
        }
      });
    });
    
    // Close modals with close button
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        utils.hideModal(modal.id);
      });
    });
    
    // Bind form submissions
    this.bindFormSubmissions();
  },
  
  bindFormSubmissions() {
    // Add task form
    document.getElementById('addTaskForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitAddTask();
    });
  },
  
  showAddTaskModal() {
    utils.showModal('addTaskModal');
  },
  
  showSubmitTaskModal() {
    utils.showModal('submitTaskModal');
  },
  
  showReviewTaskModal() {
    utils.showModal('reviewTaskModal');
  },
  
  async submitAddTask() {
    try {
      const formData = new FormData(document.getElementById('addTaskForm'));
      const taskData = {
        title: formData.get('title'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        dueDate: formData.get('dueDate')
      };
      
      await api.addTask(taskData);
      utils.showToast('เพิ่มงานสำเร็จ', 'success');
      utils.hideModal('addTaskModal');
      this.loadViewData(currentView);
      
      // Reset form
      document.getElementById('addTaskForm').reset();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  },
  
  async loadDashboard() {
    try {
      const period = document.querySelector('.period-tab.active')?.getAttribute('data-period') || 'this_week';
      const [statsResponse, tasksResponse, leaderboardResponse] = await Promise.all([
        api.getStats(period),
        api.getTasks({ limit: 5, status: 'pending' }),
        api.getLeaderboard('weekly')
      ]);
      
      this.updateStats(statsResponse);
      this.updateUpcomingTasks(tasksResponse.tasks || []);
      this.updateMiniLeaderboard(leaderboardResponse.leaderboard || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  },
  
  updateStats(stats) {
    document.getElementById('totalTasks').textContent = stats.totalTasks || 0;
    document.getElementById('pendingTasks').textContent = stats.pendingTasks || 0;
    document.getElementById('completedTasks').textContent = stats.completedTasks || 0;
    document.getElementById('overdueTasks').textContent = stats.overdueTasks || 0;
  },
  
  updateUpcomingTasks(tasks) {
    const container = document.getElementById('upcomingTasks');
    if (!container) return;
    
    if (tasks.length === 0) {
      container.innerHTML = '<p class="text-gray-500">ไม่มีงานใกล้ครบกำหนด</p>';
      return;
    }
    
    container.innerHTML = tasks.map(task => `
      <div class="task-item">
        <div class="task-header">
          <div class="task-title">${task.title}</div>
          <div class="task-priority ${task.priority}">${task.priority}</div>
        </div>
        <div class="task-meta">
          <div class="task-due">
            <i class="fas fa-clock"></i>
            ${utils.formatDate(task.dueDate)}
          </div>
        </div>
      </div>
    `).join('');
  },
  
  updateMiniLeaderboard(leaderboard) {
    const container = document.getElementById('miniLeaderboard');
    if (!container) return;
    
    if (leaderboard.length === 0) {
      container.innerHTML = '<p class="text-gray-500">ไม่มีข้อมูลอันดับ</p>';
      return;
    }
    
    container.innerHTML = leaderboard.slice(0, 5).map((item, index) => `
      <div class="leaderboard-item">
        <div class="leaderboard-rank rank-${index + 1}">${index + 1}</div>
        <div class="leaderboard-user">
          <div class="leaderboard-name">${item.displayName}</div>
          <div class="leaderboard-score">${item.completedTasks} งานเสร็จ</div>
        </div>
        <div class="leaderboard-points">${item.points}</div>
      </div>
    `).join('');
  },
  
  async loadCalendar() {
    // TODO: Implement calendar loading
    console.log('Loading calendar...');
  },
  
  async loadTasks() {
    try {
      const response = await api.getTasks();
      tasks = response.tasks || [];
      this.renderTasks();
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  },
  
  renderTasks() {
    const container = document.getElementById('tasksList');
    if (!container) return;
    
    if (tasks.length === 0) {
      container.innerHTML = '<p class="text-gray-500">ไม่มีงาน</p>';
      return;
    }
    
    container.innerHTML = tasks.map(task => `
      <div class="task-item">
        <div class="task-header">
          <div class="task-title">${task.title}</div>
          <div class="task-priority ${task.priority}">${task.priority}</div>
        </div>
        <div class="task-meta">
          <div class="task-status ${task.status}">
            <i class="fas fa-${task.status === 'pending' ? 'clock' : task.status === 'completed' ? 'check' : 'exclamation-triangle'}"></i>
            ${task.status}
          </div>
          <div class="task-due">
            <i class="fas fa-calendar"></i>
            ${utils.formatDate(task.dueDate)}
          </div>
        </div>
      </div>
    `).join('');
  },
  
  async loadFiles() {
    try {
      const response = await api.getFiles();
      files = response.files || [];
      this.renderFiles();
    } catch (error) {
      console.error('Error loading files:', error);
    }
  },
  
  renderFiles() {
    const container = document.getElementById('filesGrid');
    if (!container) return;
    
    if (files.length === 0) {
      container.innerHTML = '<p class="text-gray-500">ไม่มีไฟล์</p>';
      return;
    }
    
    container.innerHTML = files.map(file => `
      <div class="file-item">
        <div class="file-icon">
          <i class="fas fa-file"></i>
        </div>
        <div class="file-name">${file.filename}</div>
        <div class="file-meta">${file.size} bytes</div>
      </div>
    `).join('');
  },
  
  async loadLeaderboard() {
    try {
      const period = document.querySelector('.period-tab.active')?.getAttribute('data-period') || 'weekly';
      const response = await api.getLeaderboard(period);
      leaderboard = response.leaderboard || [];
      this.renderLeaderboard();
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  },
  
  renderLeaderboard() {
    const container = document.getElementById('leaderboardList');
    if (!container) return;
    
    if (leaderboard.length === 0) {
      container.innerHTML = '<p class="text-gray-500">ไม่มีข้อมูลอันดับ</p>';
      return;
    }
    
    container.innerHTML = leaderboard.map((item, index) => `
      <div class="leaderboard-item">
        <div class="leaderboard-rank rank-${index + 1}">${index + 1}</div>
        <div class="leaderboard-user">
          <div class="leaderboard-name">${item.displayName}</div>
          <div class="leaderboard-score">${item.completedTasks} งานเสร็จ</div>
        </div>
        <div class="leaderboard-points">${item.points}</div>
      </div>
    `).join('');
  }
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  try {
    utils.showLoading();
    
    // Initialize view manager
    viewManager.init();
    
    // Load initial data
    await viewManager.loadViewData('dashboard');
    
    // Hide loading screen and show app
    utils.hideLoading();
    document.getElementById('app').style.display = 'block';
    
    // Show welcome toast
    utils.showToast('ยินดีต้อนรับสู่เลขาบอท Dashboard', 'success');
    
  } catch (error) {
    console.error('Error initializing app:', error);
    utils.showToast('เกิดข้อผิดพลาดในการโหลดแอป', 'error');
    utils.hideLoading();
  }
});

// Export for global access
window.viewManager = viewManager;
window.utils = utils;
window.api = api;
