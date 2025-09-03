// Dashboard Script - Vanilla JavaScript Version (No External Dependencies)

class DashboardApp {
  constructor() {
    this.timezone = 'Asia/Bangkok';
    this.currentUser = null;
    this.tasks = [];
    this.groups = [];
    this.currentView = 'tasks';
    this.currentGroupId = null;
    this.currentTaskId = null;
    this.currentAction = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.parseURLParams();
    this.loadUserData();
  }

  setupEventListeners() {
    // Navigation
    document.getElementById('backBtn')?.addEventListener('click', () => this.goBack());
    
    // Task form
    document.getElementById('taskForm')?.addEventListener('submit', (e) => this.handleTaskSubmit(e));
    
    // Modal events
    document.getElementById('closeModal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modalOverlay')?.addEventListener('click', () => this.closeModal());
  }

  parseURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    this.currentGroupId = urlParams.get('groupId');
    this.currentTaskId = urlParams.get('taskId');
    this.currentAction = urlParams.get('action');
  }

  async loadUserData() {
    try {
      // Mock user data for now
      this.currentUser = {
        id: 'user123',
        displayName: 'ผู้ใช้ทดสอบ',
        email: 'test@example.com'
      };
      
      this.updateUserInfo();
      await this.loadTasks();
    } catch (error) {
      console.error('Error loading user data:', error);
      this.showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
  }

  updateUserInfo() {
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    
    if (userNameEl) userNameEl.textContent = this.currentUser?.displayName || 'ไม่ระบุ';
    if (userEmailEl) userEmailEl.textContent = this.currentUser?.email || 'ไม่ระบุ';
  }

  async loadTasks() {
    try {
      // Mock tasks data
      this.tasks = [
        {
          id: 'task1',
          title: 'งานทดสอบ 1',
          description: 'รายละเอียดงานทดสอบ',
          status: 'pending',
          dueTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          group: { id: 'group1', name: 'กลุ่มทดสอบ' }
        },
        {
          id: 'task2', 
          title: 'งานทดสอบ 2',
          description: 'รายละเอียดงานทดสอบ 2',
          status: 'in_progress',
          dueTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          group: { id: 'group2', name: 'กลุ่มทดสอบ 2' }
        }
      ];
      
      this.renderTasks();
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.showToast('เกิดข้อผิดพลาดในการโหลดงาน', 'error');
    }
  }

  renderTasks() {
    const tasksContainer = document.getElementById('tasksContainer');
    if (!tasksContainer) return;

    if (this.tasks.length === 0) {
      tasksContainer.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-tasks text-6xl text-gray-300 mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">ไม่มีงานที่ต้องส่ง</h3>
          <p class="text-gray-600">คุณไม่มีงานที่ต้องส่งในขณะนี้</p>
        </div>
      `;
      return;
    }

    const taskCards = this.tasks.map(task => this.renderTaskCard(task)).join('');
    tasksContainer.innerHTML = taskCards;
  }

  renderTaskCard(task) {
    const isOverdue = task.status === 'overdue';
    const statusText = this.getStatusText(task.status);
    const statusColor = this.getStatusColor(task.status);
    const dueDate = this.formatDate(task.dueTime);
    const groupName = task.group?.name || 'ไม่ระบุกลุ่ม';

    return `
      <div class="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
        <div class="p-6">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">${task.title}</h3>
              <p class="text-gray-600 text-sm mb-3">${task.description || 'ไม่มีรายละเอียด'}</p>
              <div class="flex items-center space-x-4 text-sm">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">
                  ${statusText}
                </span>
                <span class="text-gray-500">
                  <i class="fas fa-calendar mr-1"></i>
                  ${dueDate}
                </span>
                <span class="text-gray-500">
                  <i class="fas fa-users mr-1"></i>
                  ${groupName}
                </span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <input type="checkbox" 
                     id="task-${task.id}" 
                     class="task-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                     data-task-id="${task.id}">
              <label for="task-${task.id}" class="text-sm text-gray-700">เลือกส่งงานนี้</label>
            </div>
            
            <button class="btn btn-primary btn-sm" onclick="dashboardApp.viewTask('${task.id}')">
              <i class="fas fa-eye mr-1"></i>
              ดูรายละเอียด
            </button>
          </div>
        </div>
      </div>
    `;
  }

  getStatusText(status) {
    const statusMap = {
      'pending': 'รอดำเนินการ',
      'in_progress': 'กำลังดำเนินการ', 
      'overdue': 'เกินกำหนด',
      'completed': 'เสร็จสิ้น'
    };
    return statusMap[status] || status;
  }

  getStatusColor(status) {
    const colorMap = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'overdue': 'bg-red-100 text-red-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  viewTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Show task details modal or navigate to task view
    this.showToast(`ดูรายละเอียดงาน: ${task.title}`, 'info');
  }

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/dashboard';
    }
  }

  closeModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  showToast(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardApp = new DashboardApp();
});
