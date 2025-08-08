/**
 * เลขาบอท Dashboard JavaScript
 * ===============================
 */

class Dashboard {
  constructor() {
    this.currentView = 'dashboard';
    this.currentGroupId = this.getGroupIdFromUrl();
    this.currentUserId = this.getUserIdFromUrl();
    this.initialAction = this.getActionFromUrl();
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

    // Bottom navigation (mobile)
    document.querySelectorAll('.bottom-nav-item')?.forEach(item => {
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
    document.getElementById('submitTaskBtn')?.addEventListener('click', () => {
      this.populateSubmitTaskSelect();
      document.getElementById('submitTaskModal').classList.add('active');
    });
    document.getElementById('reviewTaskBtn')?.addEventListener('click', () => {
      this.populateReviewTaskSelect();
      document.getElementById('reviewTaskModal').classList.add('active');
    });

    // Submit modal handlers
    document.getElementById('submitTaskModalClose')?.addEventListener('click', () => {
      this.closeModal('submitTaskModal');
    });
    document.getElementById('cancelSubmitTask')?.addEventListener('click', () => {
      this.closeModal('submitTaskModal');
    });
    document.getElementById('submitTaskForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmitTask();
    });

    // Review modal handlers
    document.getElementById('reviewTaskModalClose')?.addEventListener('click', () => {
      this.closeModal('reviewTaskModal');
    });
    document.getElementById('cancelReviewTask')?.addEventListener('click', () => {
      this.closeModal('reviewTaskModal');
    });
    document.getElementById('approveTaskBtn')?.addEventListener('click', () => {
      this.handleApproveTask();
    });
    document.getElementById('rejectTaskBtn')?.addEventListener('click', () => {
      this.handleRejectTask();
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

    // Files view search & upload
    document.getElementById('searchFiles')?.addEventListener('input', this.debounce(() => {
      const value = document.getElementById('searchFiles').value || '';
      this.loadFiles(value);
    }, 300));

    document.getElementById('uploadFileBtn')?.addEventListener('click', () => {
      this.openUploadPicker();
    });

    // Mobile menu toggle
    document.getElementById('menuToggle')?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('open');
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

  getUserIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('userId') || '';
  }

  getActionFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('action') || '';
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

  showNoGroupMessage() {
    this.hideLoading();
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
      <div class="error-container">
        <div class="error-message">
          <i class="fas fa-users" style="font-size: 64px; color: #ddd; margin-bottom: 20px;"></i>
          <h2>ไม่มีข้อมูลกลุ่ม</h2>
          <p>กรุณาเข้าใช้ Dashboard ผ่านคำสั่งบอทในกลุ่ม LINE</p>
          <div class="setup-instructions">
            <h3>วิธีใช้งาน:</h3>
            <ol>
              <li>เข้าไปในกลุ่ม LINE ที่ต้องการใช้งาน</li>
              <li>แท็กบอท พิมพ์ <strong>/setup</strong></li>
              <li>คลิกลิงก์ที่บอทส่งให้</li>
            </ol>
          </div>
        </div>
      </div>
    `;
  }

  showGroupNotFoundMessage() {
    this.hideLoading();
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
      <div class="error-container">
        <div class="error-message">
          <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: #f39c12; margin-bottom: 20px;"></i>
          <h2>ไม่พบข้อมูลกลุ่ม</h2>
          <p>กลุ่มที่ระบุไม่มีอยู่ในระบบ หรือบอทยังไม่ได้เข้าร่วมกลุ่มนี้</p>
          <div class="setup-instructions">
            <h3>แก้ไขปัญหา:</h3>
            <ol>
              <li>ตรวจสอบว่าบอทอยู่ในกลุ่ม LINE แล้ว</li>
              <li>ใช้คำสั่ง <strong>แท็กบอท /setup</strong> ในกลุ่มอีกครั้ง</li>
              <li>ติดต่อผู้ดูแลระบบหากปัญหายังไม่หาย</li>
            </ol>
          </div>
        </div>
      </div>
    `;
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
      console.log('API Request:', `${this.apiBase}/api${endpoint}`);
      
      const response = await fetch(`${this.apiBase}/api${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      console.log('API Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        // พยายามดึง error message จาก response body
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // ถ้า parse JSON ไม่ได้ ใช้ statusText
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      
      // ไม่แสดง toast สำหรับ error บางประเภท
      if (!error.message.includes('404') && !error.message.includes('Group not found')) {
        this.showToast(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
      }
      
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

  async openUploadPicker() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '*/*';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.addEventListener('change', async () => {
        const files = input.files;
        if (!files || files.length === 0) { document.body.removeChild(input); return; }

        const formData = new FormData();
        formData.append('userId', this.currentUserId || 'unknown');
        formData.append('comment', 'Uploaded from dashboard');
        for (let i = 0; i < files.length; i++) formData.append('attachments', files[i]);

        try {
          const tempTask = await this.createTask({
            title: `ไฟล์ที่อัปโหลด (${new Date().toLocaleString('th-TH')})`,
            description: 'อัปโหลดไฟล์เข้าคลัง',
            dueTime: new Date(Date.now() + 3600e3).toISOString(),
            priority: 'low',
            assigneeIds: [],
            tags: ['upload'],
            createdBy: this.currentUserId || 'unknown',
            requireAttachment: false
          });

          const resp = await fetch(`${this.apiBase}/api/groups/${this.currentGroupId}/tasks/${tempTask.id}/submit`, {
            method: 'POST',
            body: formData
          });
          const data = await resp.json();
          if (data.success) {
            this.showToast('อัปโหลดไฟล์สำเร็จ', 'success');
            this.loadFiles();
          } else {
            this.showToast(data.error || 'อัปโหลดไฟล์ไม่สำเร็จ', 'error');
          }
        } catch (err) {
          console.error('Upload error:', err);
          this.showToast('อัปโหลดไฟล์ไม่สำเร็จ', 'error');
        } finally {
          document.body.removeChild(input);
        }
      });

      input.click();
    } catch (error) {
      console.error('openUploadPicker error:', error);
      this.showToast('ไม่สามารถเปิดตัวเลือกไฟล์ได้', 'error');
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

    // Sync bottom nav (mobile)
    document.querySelectorAll('.bottom-nav-item')?.forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    this.currentView = viewName;
    this.loadViewData(viewName);

    // Auto-close sidebar on mobile after navigation
    if (window.innerWidth <= 768) {
      document.querySelector('.sidebar')?.classList.remove('open');
    }
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
      // ตรวจสอบว่ามี groupId หรือไม่
      if (this.currentGroupId === 'default' || !this.currentGroupId) {
        this.showNoGroupMessage();
        return;
      }

      console.log('Loading data for group:', this.currentGroupId);

      // Load group info
      const groupResponse = await this.apiRequest(`/groups/${this.currentGroupId}`);
      
      if (groupResponse.success && groupResponse.data) {
        const groupName = groupResponse.data.name || 'ไม่ทราบชื่อกลุ่ม';
        document.getElementById('currentGroupName').textContent = groupName;
        console.log('Group loaded:', groupName);
        
        // Load current view data
        this.loadViewData(this.currentView);

        // ถ้ามาจากการกดปุ่ม "กรอกข้อมูลงาน" ให้เปิด modal เพิ่มงานอัตโนมัติ
        if (this.initialAction === 'new-task') {
          this.openAddTaskModal();
        }
      } else {
        console.error('Invalid group response:', groupResponse);
        this.showGroupNotFoundMessage();
      }
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
      
      if (error.message.includes('404') || error.message.includes('Group not found')) {
        this.showGroupNotFoundMessage();
      } else if (error.message.includes('500')) {
        this.showToast('เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่อีกครั้ง', 'error');
      } else {
        this.showToast('ไม่สามารถโหลดข้อมูลได้: ' + error.message, 'error');
      }
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
    const reviewerSelect = document.getElementById('reviewerSelect');
    
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

    if (reviewerSelect) {
      reviewerSelect.innerHTML = '<option value="">(ไม่ระบุ)</option>' +
        members.map(member => `<option value="${member.id}">${member.displayName}</option>`).join('');
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
    // เปิด submit modal พร้อมเลือกงานเป็นค่าเริ่มต้น
    this.populateSubmitTaskSelect(taskId);
    document.getElementById('submitTaskModal').classList.add('active');
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
      createdBy: this.currentUserId || 'unknown',
      requireAttachment: document.getElementById('requireAttachment').checked,
      reviewerUserId: document.getElementById('reviewerSelect')?.value || undefined
    };
    
    await this.createTask(taskData);
    form.reset();
  }

   async handleSubmitTask() {
     try {
       const select = document.getElementById('submitTaskId');
       const taskId = select.value;
       const comment = document.getElementById('submitComment').value;
       const filesInput = document.getElementById('submitFiles');
       const files = filesInput.files;
       if (!taskId) { this.showToast('กรุณาเลือกงาน', 'error'); return; }
       if (!files || files.length === 0) { this.showToast('กรุณาเลือกไฟล์', 'error'); return; }

       const formData = new FormData();
       formData.append('userId', this.currentUserId || 'unknown');
       formData.append('comment', comment || '');
       for (let i = 0; i < files.length; i++) {
         formData.append('attachments', files[i]);
       }

       const response = await fetch(`${this.apiBase}/api/groups/${this.currentGroupId}/tasks/${taskId}/submit`, {
         method: 'POST',
         body: formData
       });
       if (!response.ok) throw new Error('Upload failed');
       const data = await response.json();
       if (data.success) {
         this.showToast('ส่งงานสำเร็จ', 'success');
         this.closeModal('submitTaskModal');
         this.refreshCurrentView();
       } else {
         this.showToast(data.error || 'ส่งงานไม่สำเร็จ', 'error');
       }
     } catch (error) {
       console.error('submitTask error:', error);
       this.showToast('ส่งงานไม่สำเร็จ', 'error');
     }
   }

   async populateSubmitTaskSelect(selectedTaskId = '') {
     try {
       const response = await this.apiRequest(`/groups/${this.currentGroupId}/tasks?status=pending`);
       const tasks = response.data || [];
       const sel = document.getElementById('submitTaskId');
       sel.innerHTML = tasks.map(t => `<option value="${t.id}" ${selectedTaskId === t.id ? 'selected' : ''}>${t.title}</option>`).join('');
     } catch (error) {
       console.error('populateSubmitTaskSelect error:', error);
     }
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

  async populateReviewTaskSelect(selectedTaskId = '') {
    try {
      // โหลดงานสถานะ pending หรือ in_progress เพื่อให้ผู้ตรวจเลือก
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/tasks?status=pending`);
      const response2 = await this.apiRequest(`/groups/${this.currentGroupId}/tasks?status=in_progress`);
      const tasks = [...(response.data || []), ...(response2.data || [])];
      const sel = document.getElementById('reviewTaskId');
      sel.innerHTML = tasks.map(t => `<option value="${t.id}" ${selectedTaskId === t.id ? 'selected' : ''}>${t.title}</option>`).join('');
    } catch (error) {
      console.error('populateReviewTaskSelect error:', error);
    }
  }

  async handleApproveTask() {
    try {
      const taskId = document.getElementById('reviewTaskId').value;
      const res = await this.apiRequest(`/tasks/${taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ userId: this.currentUserId || 'unknown' })
      });
      if (res.success) {
        this.showToast('อนุมัติงานและปิดงานสำเร็จ', 'success');
        this.closeModal('reviewTaskModal');
        this.refreshCurrentView();
      }
    } catch (error) {
      console.error('approve error:', error);
      this.showToast('อนุมัติงานไม่สำเร็จ', 'error');
    }
  }

  async handleRejectTask() {
    try {
      const taskId = document.getElementById('reviewTaskId').value;
      const comment = document.getElementById('reviewComment').value;
      const newDue = document.getElementById('reviewNewDue').value;
      if (!newDue) { this.showToast('ระบุกำหนดส่งใหม่', 'error'); return; }
      const res = await this.apiRequest(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          dueTime: newDue,
          reviewAction: 'revise',
          reviewerUserId: this.currentUserId || 'unknown',
          reviewerComment: comment || ''
        })
      });
      if (res.success) {
        this.showToast('ตีกลับงานสำเร็จ', 'success');
        this.closeModal('reviewTaskModal');
        this.refreshCurrentView();
      }
    } catch (error) {
      console.error('reject error:', error);
      this.showToast('ตีกลับงานไม่สำเร็จ', 'error');
    }
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

  showNoGroupMessage() {
    this.hideLoading();
    const container = document.getElementById('dashboardView');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: white; border-radius: 12px; margin: 2rem;">
          <h2 style="color: #666;">🤖 เลขาบอท Dashboard</h2>
          <p style="margin: 1rem 0; color: #888;">กรุณาระบุ Group ID ใน URL</p>
          <p style="font-size: 0.9rem; color: #999;">
            ตัวอย่าง: /dashboard?groupId=<strong>GROUP_ID</strong>
          </p>
          <div style="margin-top: 2rem;">
            <p style="color: #666;">วิธีหา Group ID:</p>
            <ol style="text-align: left; display: inline-block; color: #777;">
              <li>แท็กบอทในกลุ่ม LINE</li>
              <li>พิมพ์คำสั่ง "/setup"</li>
              <li>บอทจะส่งลิงก์ Dashboard พร้อม Group ID</li>
            </ol>
          </div>
        </div>
      `;
    }
  }

  showGroupNotFoundMessage() {
    this.hideLoading();
    const container = document.getElementById('dashboardView');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: white; border-radius: 12px; margin: 2rem;">
          <h2 style="color: #e74c3c;">❌ ไม่พบกลุ่ม</h2>
          <p style="margin: 1rem 0; color: #888;">ไม่พบกลุ่มที่มี ID: <code>${this.currentGroupId}</code></p>
          <div style="margin-top: 2rem;">
            <p style="color: #666;">กรุณาตรวจสอบ:</p>
            <ul style="text-align: left; display: inline-block; color: #777;">
              <li>Group ID ถูกต้องหรือไม่</li>
              <li>บอทถูกเพิ่มในกลุ่มแล้วหรือยัง</li>
              <li>ได้ใช้คำสั่ง /setup ในกลุ่มแล้วหรือยัง</li>
            </ul>
          </div>
        </div>
      `;
    }
  }

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
  // Expose after init to ensure handlers can access
  window.dashboard = dashboard;
});