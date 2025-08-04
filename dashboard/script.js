/**
 * เลขาบอท Dashboard JavaScript
 * ===============================
 */

class Dashboard {
  constructor() {
    this.currentView = 'dashboard';
    this.currentGroupId = this.getGroupIdFromUrl();
    this.apiBase = window.location.origin;
    this.isLoading = false;
    
    this.init();
  }

  // ==================== 
  // Initialization
  // ==================== 

  init() {
    this.bindEvents();
    this.loadInitialData();
    this.hideLoading();
  }

  bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
      });
    });

    // View mode toggles
    document.querySelectorAll('[data-view-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.target.dataset.viewMode;
        this.switchCalendarMode(mode);
      });
    });

    // Modals
    document.getElementById('addTaskBtn').addEventListener('click', () => {
      this.openAddTaskModal();
    });

    document.getElementById('taskModalClose').addEventListener('click', () => {
      this.closeModal('taskModal');
    });

    document.getElementById('addTaskModalClose').addEventListener('click', () => {
      this.closeModal('addTaskModal');
    });

    document.getElementById('cancelAddTask').addEventListener('click', () => {
      this.closeModal('addTaskModal');
    });

    // Forms
    document.getElementById('addTaskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddTask();
    });

    // Filters
    document.getElementById('statusFilter')?.addEventListener('change', () => {
      this.filterTasks();
    });

    document.getElementById('assigneeFilter')?.addEventListener('change', () => {
      this.filterTasks();
    });

    document.getElementById('searchTasks')?.addEventListener('input', (e) => {
      this.debounce(() => this.filterTasks(), 300)();
    });

    // Refresh
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
      this.refreshCurrentView();
    });

    // Calendar navigation
    document.getElementById('prevMonth')?.addEventListener('click', () => {
      this.navigateCalendar(-1);
    });

    document.getElementById('nextMonth')?.addEventListener('click', () => {
      this.navigateCalendar(1);
    });

    // Period toggles for leaderboard
    document.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const period = e.target.dataset.period;
        this.switchLeaderboardPeriod(period);
      });
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    });
  }

  // ==================== 
  // Utility Functions
  // ==================== 

  getGroupIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('groupId') || 'default';
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    this.isLoading = true;
  }

  hideLoading() {
    document.getElementById('loading').classList.add('hidden');
    this.isLoading = false;
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Show animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => container.removeChild(toast), 300);
    }, 5000);
  }

  formatDate(date) {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(date) {
    return new Date(date).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ==================== 
  // API Functions
  // ==================== 

  async apiRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.apiBase}/api${endpoint}`, {
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
      console.error('API Request Error:', error);
      this.showToast(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
      throw error;
    }
  }

  async loadStats() {
    try {
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/stats`);
      this.updateStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async loadTasks(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/tasks?${queryParams}`);
      this.updateTasksList(response.data, response.pagination);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  async loadCalendarEvents(month, year) {
    try {
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/calendar?month=${month}&year=${year}`);
      this.updateCalendar(response.data, month, year);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    }
  }

  async loadFiles(search = '') {
    try {
      const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/files${queryParams}`);
      this.updateFilesList(response.data);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  }

  async loadLeaderboard(period = 'weekly') {
    try {
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/leaderboard?period=${period}`);
      this.updateLeaderboard(response.data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  }

  async loadGroupMembers() {
    try {
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/members`);
      this.updateMembersList(response.data);
    } catch (error) {
      console.error('Failed to load group members:', error);
    }
  }

  async createTask(taskData) {
    try {
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
      
      this.showToast('เพิ่มงานใหม่สำเร็จ', 'success');
      this.closeModal('addTaskModal');
      this.refreshCurrentView();
      
      return response.data;
    } catch (error) {
      console.error('Failed to create task:', error);
      this.showToast('ไม่สามารถเพิ่มงานได้', 'error');
    }
  }

  // ==================== 
  // View Management
  // ==================== 

  switchView(viewName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update content
    document.querySelectorAll('.view').forEach(view => {
      view.classList.toggle('active', view.id === `${viewName}View`);
    });

    this.currentView = viewName;
    this.loadViewData(viewName);
  }

  loadViewData(viewName) {
    switch (viewName) {
      case 'dashboard':
        this.loadStats();
        this.loadUpcomingTasks();
        this.loadMiniLeaderboard();
        break;
      case 'calendar':
        const now = new Date();
        this.loadCalendarEvents(now.getMonth() + 1, now.getFullYear());
        break;
      case 'tasks':
        this.loadTasks();
        this.loadGroupMembers(); // For assignee filter
        break;
      case 'files':
        this.loadFiles();
        break;
      case 'leaderboard':
        this.loadLeaderboard();
        break;
    }
  }

  refreshCurrentView() {
    this.showLoading();
    this.loadViewData(this.currentView);
    setTimeout(() => this.hideLoading(), 500);
  }

  // ==================== 
  // Data Loading
  // ==================== 

  async loadInitialData() {
    this.showLoading();
    
    try {
      // Load group info
      const groupResponse = await this.apiRequest(`/groups/${this.currentGroupId}`);
      document.getElementById('currentGroupName').textContent = groupResponse.data.name;
      
      // Load current view data
      this.loadViewData(this.currentView);
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.showToast('ไม่สามารถโหลดข้อมูลได้', 'error');
    } finally {
      this.hideLoading();
    }
  }

  async loadUpcomingTasks() {
    try {
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/tasks?limit=5&status=pending`);
      this.updateUpcomingTasks(response.data);
    } catch (error) {
      console.error('Failed to load upcoming tasks:', error);
    }
  }

  async loadMiniLeaderboard() {
    try {
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/leaderboard?period=weekly&limit=3`);
      this.updateMiniLeaderboard(response.data);
    } catch (error) {
      console.error('Failed to load mini leaderboard:', error);
    }
  }

  // ==================== 
  // UI Updates
  // ==================== 

  updateStats(stats) {
    document.getElementById('totalTasks').textContent = stats.totalTasks || 0;
    document.getElementById('pendingTasks').textContent = stats.pendingTasks || 0;
    document.getElementById('completedTasks').textContent = stats.completedTasks || 0;
    document.getElementById('overdueTasks').textContent = stats.overdueTasks || 0;
  }

  updateUpcomingTasks(tasks) {
    const container = document.getElementById('upcomingTasks');
    
    if (!tasks || tasks.length === 0) {
      container.innerHTML = '<p class="text-muted">ไม่มีงานใกล้ครบกำหนด</p>';
      return;
    }

    container.innerHTML = tasks.map(task => `
      <div class="task-item" onclick="dashboard.openTaskModal('${task.id}')">
        <div class="task-priority ${task.priority}"></div>
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            <span><i class="fas fa-clock"></i> ครบกำหนด ${this.formatDateTime(task.dueTime)}</span>
            ${task.assignees && task.assignees.length > 0 ? 
              `<span><i class="fas fa-user"></i> ${task.assignees.length} คน</span>` : ''
            }
          </div>
        </div>
        <div class="task-status ${task.status}">${this.getStatusText(task.status)}</div>
      </div>
    `).join('');
  }

  updateMiniLeaderboard(leaderboard) {
    const container = document.getElementById('miniLeaderboard');
    
    if (!leaderboard || leaderboard.length === 0) {
      container.innerHTML = '<p class="text-muted">ยังไม่มีข้อมูลอันดับ</p>';
      return;
    }

    container.innerHTML = leaderboard.map((user, index) => `
      <div class="leaderboard-item" style="display: flex; align-items: center; gap: 12px; padding: 12px 0;">
        <div class="rank" style="font-weight: 600; color: ${index === 0 ? '#f59e0b' : index === 1 ? '#6b7280' : '#9ca3af'};">
          ${index + 1}
        </div>
        <div class="user-info" style="flex: 1;">
          <div style="font-weight: 500;">${user.displayName}</div>
          <div style="font-size: 0.875rem; color: #6b7280;">${user.totalPoints} คะแนน</div>
        </div>
        <div class="score" style="font-weight: 600; color: #10b981;">
          ${user.completedTasks} งาน
        </div>
      </div>
    `).join('');
  }

  updateTasksList(tasks, pagination) {
    const container = document.getElementById('tasksList');
    
    if (!tasks || tasks.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">ไม่พบงานตามเงื่อนไขที่กำหนด</div>';
      return;
    }

    container.innerHTML = tasks.map(task => `
      <div class="task-item" onclick="dashboard.openTaskModal('${task.id}')">
        <div class="task-priority ${task.priority}"></div>
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            <span><i class="fas fa-clock"></i> ${this.formatDateTime(task.dueTime)}</span>
            ${task.assignees && task.assignees.length > 0 ? 
              `<span><i class="fas fa-user"></i> ${task.assignees.length} คน</span>` : ''
            }
            ${task.tags && task.tags.length > 0 ? 
              `<span><i class="fas fa-tag"></i> ${task.tags.join(', ')}</span>` : ''
            }
          </div>
        </div>
        <div class="task-status ${task.status}">${this.getStatusText(task.status)}</div>
      </div>
    `).join('');

    // Update pagination if provided
    if (pagination) {
      this.updatePagination('tasksPagination', pagination);
    }
  }

  updateCalendar(events, month, year) {
    const container = document.getElementById('calendarGrid');
    const monthHeader = document.getElementById('currentMonth');
    
    // Update month header
    const monthNames = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    monthHeader.textContent = `${monthNames[month - 1]} ${year}`;
    
    // Generate calendar grid
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    let calendarHTML = '';
    
    // Day headers
    const dayHeaders = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    dayHeaders.forEach(day => {
      calendarHTML += `<div class="calendar-day-header" style="text-align: center; font-weight: 600; padding: 8px; background: #f3f4f6;">${day}</div>`;
    });
    
    // Previous month days
    const prevMonthDays = new Date(year, month - 1, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      calendarHTML += `<div class="calendar-day other-month">
        <div class="calendar-day-number">${prevMonthDays - i}</div>
      </div>`;
    }
    
    // Current month days
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && today.getDate() === day;
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.dueTime);
        return eventDate.getDate() === day;
      });
      
      calendarHTML += `<div class="calendar-day ${isToday ? 'today' : ''}" onclick="dashboard.onCalendarDayClick(${year}, ${month}, ${day})">
        <div class="calendar-day-number">${day}</div>
        <div class="calendar-events">
          ${dayEvents.slice(0, 3).map(event => `
            <div class="calendar-event ${event.priority}" title="${event.title}">
              ${event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title}
            </div>
          `).join('')}
          ${dayEvents.length > 3 ? `<div class="calendar-event-more">+${dayEvents.length - 3} อีก</div>` : ''}
        </div>
      </div>`;
    }
    
    // Next month days
    const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (startingDayOfWeek + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
      calendarHTML += `<div class="calendar-day other-month">
        <div class="calendar-day-number">${day}</div>
      </div>`;
    }
    
    container.innerHTML = calendarHTML;
  }

  updateFilesList(files) {
    const container = document.getElementById('filesGrid');
    
    if (!files || files.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">ไม่พบไฟล์</div>';
      return;
    }

    container.innerHTML = files.map(file => `
      <div class="file-item" style="background: white; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer;"
           onclick="dashboard.downloadFile('${file.id}')">
        <div class="file-icon" style="text-align: center; margin-bottom: 12px;">
          <i class="fas ${this.getFileIcon(file.mimeType)}" style="font-size: 2rem; color: #6b7280;"></i>
        </div>
        <div class="file-name" style="font-weight: 500; margin-bottom: 4px;">${file.originalName}</div>
        <div class="file-meta" style="font-size: 0.875rem; color: #6b7280;">
          ${this.formatFileSize(file.size)} • ${this.formatDate(file.uploadedAt)}
        </div>
        ${file.tags && file.tags.length > 0 ? `
          <div class="file-tags" style="margin-top: 8px;">
            ${file.tags.map(tag => `<span style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 4px;">#${tag}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  updateLeaderboard(users) {
    const container = document.getElementById('leaderboardList');
    
    if (!users || users.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">ยังไม่มีข้อมูลอันดับ</div>';
      return;
    }

    container.innerHTML = users.map((user, index) => `
      <div class="leaderboard-item" style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 16px;">
        <div class="rank" style="font-size: 1.5rem; font-weight: 700; color: ${index === 0 ? '#f59e0b' : index === 1 ? '#6b7280' : '#9ca3af'}; min-width: 40px;">
          ${index + 1}
        </div>
        <div class="user-info" style="flex: 1;">
          <div style="font-weight: 600; font-size: 1.125rem;">${user.displayName}</div>
          <div style="color: #6b7280; margin-top: 4px;">
            เสร็จ ${user.completedTasks} งาน • คะแนน ${user.totalPoints}
          </div>
        </div>
        <div class="user-stats" style="text-align: right;">
          <div style="font-weight: 600; color: #10b981;">${user.totalPoints} คะแนน</div>
          <div style="font-size: 0.875rem; color: #6b7280;">
            เร็ว ${user.earlyTasks} • ตรงเวลา ${user.ontimeTasks}
          </div>
        </div>
      </div>
    `).join('');
  }

  updateMembersList(members) {
    const select = document.getElementById('taskAssignees');
    const filter = document.getElementById('assigneeFilter');
    
    if (select) {
      select.innerHTML = members.map(member => 
        `<option value="${member.id}">${member.displayName}</option>`
      ).join('');
    }
    
    if (filter) {
      filter.innerHTML = '<option value="">ผู้รับผิดชอบทั้งหมด</option>' + 
        members.map(member => 
          `<option value="${member.id}">${member.displayName}</option>`
        ).join('');
    }
  }

  // ==================== 
  // Modal Management
  // ==================== 

  openAddTaskModal() {
    document.getElementById('addTaskModal').classList.add('active');
    this.loadGroupMembers(); // Load members for assignee selection
  }

  openTaskModal(taskId) {
    // TODO: Load task details and show in modal
    console.log('Opening task modal for:', taskId);
    this.showToast('ฟีเจอร์นี้จะเปิดใช้งานเร็วๆ นี้', 'info');
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }

  // ==================== 
  // Form Handling
  // ==================== 

  async handleAddTask() {
    const form = document.getElementById('addTaskForm');
    const formData = new FormData(form);
    
    const taskData = {
      title: formData.get('title'),
      description: formData.get('description'),
      dueTime: formData.get('dueDate'),
      priority: formData.get('priority'),
      assigneeIds: Array.from(document.getElementById('taskAssignees').selectedOptions)
        .map(option => option.value),
      tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : [],
      createdBy: 'current-user-id' // TODO: Get from auth
    };
    
    await this.createTask(taskData);
    form.reset();
  }

  // ==================== 
  // Event Handlers
  // ==================== 

  switchCalendarMode(mode) {
    document.querySelectorAll('[data-view-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.viewMode === mode);
    });
    
    // TODO: Implement different calendar view modes
    console.log('Switching to calendar mode:', mode);
  }

  switchLeaderboardPeriod(period) {
    document.querySelectorAll('[data-period]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
    
    this.loadLeaderboard(period);
  }

  navigateCalendar(direction) {
    // TODO: Implement calendar navigation
    console.log('Navigate calendar:', direction);
  }

  onCalendarDayClick(year, month, day) {
    console.log('Calendar day clicked:', year, month, day);
    // TODO: Show day details or create task
  }

  filterTasks() {
    const status = document.getElementById('statusFilter')?.value;
    const assignee = document.getElementById('assigneeFilter')?.value;
    const search = document.getElementById('searchTasks')?.value;
    
    const filters = {};
    if (status) filters.status = status;
    if (assignee) filters.assignee = assignee;
    if (search) filters.search = search;
    
    this.loadTasks(filters);
  }

  async downloadFile(fileId) {
    try {
      const response = await fetch(`${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'download';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      this.showToast('ไม่สามารถดาวน์โหลดไฟล์ได้', 'error');
    }
  }

  // ==================== 
  // Helper Functions
  // ==================== 

  getStatusText(status) {
    const statusMap = {
      pending: 'รอดำเนินการ',
      in_progress: 'กำลังดำเนินการ',
      completed: 'เสร็จแล้ว',
      cancelled: 'ยกเลิก',
      overdue: 'เกินกำหนด'
    };
    return statusMap[status] || status;
  }

  getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return 'fa-image';
    if (mimeType.startsWith('video/')) return 'fa-video';
    if (mimeType.startsWith('audio/')) return 'fa-music';
    if (mimeType.includes('pdf')) return 'fa-file-pdf';
    if (mimeType.includes('word')) return 'fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'fa-file-archive';
    return 'fa-file';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  updatePagination(containerId, pagination) {
    const container = document.getElementById(containerId);
    if (!container || !pagination) return;

    let paginationHTML = '<div style="display: flex; justify-content: center; gap: 8px; margin-top: 20px;">';
    
    // Previous button
    if (pagination.page > 1) {
      paginationHTML += `<button class="btn btn-outline" onclick="dashboard.loadTasks({page: ${pagination.page - 1}})">ก่อนหน้า</button>`;
    }
    
    // Page info
    paginationHTML += `<span style="padding: 8px 12px; color: #6b7280;">หน้า ${pagination.page} จาก ${pagination.totalPages}</span>`;
    
    // Next button
    if (pagination.page < pagination.totalPages) {
      paginationHTML += `<button class="btn btn-outline" onclick="dashboard.loadTasks({page: ${pagination.page + 1}})">ถัดไป</button>`;
    }
    
    paginationHTML += '</div>';
    container.innerHTML = paginationHTML;
  }
}

// Initialize Dashboard
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new Dashboard();
});

// Make dashboard available globally for onclick handlers
window.dashboard = dashboard;