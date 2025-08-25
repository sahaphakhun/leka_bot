/**
 * เลขาบอท Dashboard - Mobile First JavaScript
 */

// Global variables
let currentView = 'dashboard';
let tasks = [];
let files = [];
let leaderboard = [];

// Mock data
const mockData = {
  stats: { totalTasks: 25, pendingTasks: 8, completedTasks: 15, overdueTasks: 2 },
  tasks: [
    { id: 1, title: 'ออกแบบ UI/UX ใหม่', status: 'pending', priority: 'high', dueDate: '2024-01-15T10:00:00', assignee: 'สมชาย' },
    { id: 2, title: 'เขียนโค้ด Backend', status: 'in_progress', priority: 'medium', dueDate: '2024-01-20T14:00:00', assignee: 'สมหญิง' },
    { id: 3, title: 'ทดสอบระบบ', status: 'completed', priority: 'low', dueDate: '2024-01-10T16:00:00', assignee: 'สมศักดิ์' }
  ],
  files: [
    { id: 1, filename: 'design-mockup.png', size: 2048576, type: 'image' },
    { id: 2, filename: 'requirements.pdf', size: 1048576, type: 'document' }
  ],
  leaderboard: [
    { displayName: 'สมชาย', completedTasks: 12, points: 150 },
    { displayName: 'สมหญิง', completedTasks: 10, points: 120 },
    { displayName: 'สมศักดิ์', completedTasks: 8, points: 95 }
  ]
};

// Utility functions
const utils = {
  formatDate: (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH');
  },
  
  showToast: (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="toast-icon fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    const container = document.getElementById('toastContainer');
    container.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
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

// View management
const viewManager = {
  init() {
    this.bindNavigation();
    this.bindQuickActions();
    this.bindModals();
  },
  
  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
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
    this.loadViewData(view);
  },
  
  loadViewData(view) {
    switch (view) {
      case 'dashboard':
        this.loadDashboard();
        break;
      case 'tasks':
        this.loadTasks();
        break;
      case 'files':
        this.loadFiles();
        break;
      case 'leaderboard':
        this.loadLeaderboard();
        break;
    }
  },
  
  bindQuickActions() {
    document.getElementById('addTaskBtn')?.addEventListener('click', () => {
      utils.showModal('addTaskModal');
    });
    
    document.getElementById('submitTaskBtn')?.addEventListener('click', () => {
      utils.showModal('submitTaskModal');
    });
    
    document.getElementById('reviewTaskBtn')?.addEventListener('click', () => {
      utils.showModal('reviewTaskModal');
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
    document.getElementById('addTaskForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      utils.showToast('เพิ่มงานสำเร็จ', 'success');
      utils.hideModal('addTaskModal');
      document.getElementById('addTaskForm').reset();
    });
  },
  
  loadDashboard() {
    // Update stats
    document.getElementById('totalTasks').textContent = mockData.stats.totalTasks;
    document.getElementById('pendingTasks').textContent = mockData.stats.pendingTasks;
    document.getElementById('completedTasks').textContent = mockData.stats.completedTasks;
    document.getElementById('overdueTasks').textContent = mockData.stats.overdueTasks;
    
    // Update upcoming tasks
    const upcomingContainer = document.getElementById('upcomingTasks');
    if (upcomingContainer) {
      upcomingContainer.innerHTML = mockData.tasks.slice(0, 3).map(task => `
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
    }
    
    // Update mini leaderboard
    const leaderboardContainer = document.getElementById('miniLeaderboard');
    if (leaderboardContainer) {
      leaderboardContainer.innerHTML = mockData.leaderboard.slice(0, 3).map((item, index) => `
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
  },
  
  loadTasks() {
    const container = document.getElementById('tasksList');
    if (!container) return;
    
    container.innerHTML = mockData.tasks.map(task => `
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
  
  loadFiles() {
    const container = document.getElementById('filesGrid');
    if (!container) return;
    
    container.innerHTML = mockData.files.map(file => `
      <div class="file-item">
        <div class="file-icon">
          <i class="fas fa-${file.type === 'image' ? 'image' : 'file'}"></i>
        </div>
        <div class="file-name">${file.filename}</div>
        <div class="file-meta">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
      </div>
    `).join('');
  },
  
  loadLeaderboard() {
    const container = document.getElementById('leaderboardList');
    if (!container) return;
    
    container.innerHTML = mockData.leaderboard.map((item, index) => `
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
document.addEventListener('DOMContentLoaded', () => {
  utils.showLoading();
  
  // Initialize view manager
  viewManager.init();
  
  // Load initial data
  viewManager.loadViewData('dashboard');
  
  // Hide loading screen and show app
  setTimeout(() => {
    utils.hideLoading();
    document.getElementById('app').style.display = 'block';
    utils.showToast('ยินดีต้อนรับสู่เลขาบอท Dashboard (เวอร์ชันใหม่)', 'success');
  }, 1000);
});

// Export for global access
window.viewManager = viewManager;
window.utils = utils;
