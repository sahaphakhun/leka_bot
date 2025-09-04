// Dashboard Script - Vanilla JavaScript Version (No External Dependencies)

class DashboardApp {
  constructor() {
    this.timezone = 'Asia/Bangkok';
    this.currentUser = null;
    this.tasks = [];
    this.groups = [];
    this.files = [];
    this.organizedFiles = null;
    this.currentView = 'dashboard';
    this.currentFileViewMode = 'folder';
    this.currentGroupId = null;
    this.currentTaskId = null;
    this.currentAction = null;
    this.isLoading = false;
    
    // Initialize with some default mock tasks for statistics
    this.initializeMockData();
    
    this.init();
  }

  initializeMockData() {
    // Default mock tasks to ensure statistics display properly
    this.tasks = [
      {
        id: 'task1',
        title: 'งานทดสอบ 1',
        description: 'รายละเอียดงานทดสอบ',
        status: 'pending',
        priority: 'medium',
        dueTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        group: { id: 'group1', name: 'กลุ่มทดสอบ' }
      },
      {
        id: 'task2', 
        title: 'งานทดสอบ 2',
        description: 'รายละเอียดงานทดสอบ 2',
        status: 'completed',
        priority: 'high',
        dueTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        group: { id: 'group2', name: 'กลุ่มทดสอบ 2' }
      },
      {
        id: 'task3', 
        title: 'งานทดสอบ 3',
        description: 'รายละเอียดงานทดสอบ 3',
        status: 'overdue',
        priority: 'low',
        dueTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        group: { id: 'group1', name: 'กลุ่มทดสอบ' }
      }
    ];
  }

  init() {
    this.setupEventListeners();
    this.parseURLParams();
    this.loadUserData();
    this.hideLoadingScreen();
    this.setupNavigation();
    this.setupFileUpload();
    
    // Initialize calendar to show current month immediately when page loads
    this.initializeCalendar();
  }

  setupEventListeners() {
    // Navigation
    document.getElementById('backBtn')?.addEventListener('click', () => this.goBack());
    
    // Task form
    document.getElementById('addTaskForm')?.addEventListener('submit', (e) => this.handleAddTask(e));
    document.getElementById('editTaskForm')?.addEventListener('submit', (e) => this.handleEditTask(e));
    
    // Modal events
    document.getElementById('addTaskModalClose')?.addEventListener('click', () => this.closeModal('addTaskModal'));
    document.getElementById('editTaskModalClose')?.addEventListener('click', () => this.closeModal('editTaskModal'));
    document.getElementById('cancelAddTask')?.addEventListener('click', () => this.closeModal('addTaskModal'));
    document.getElementById('editTaskCancelBtn')?.addEventListener('click', () => this.closeModal('editTaskModal'));
    
    // ปุ่มหลักในหน้า Dashboard
    document.getElementById('addTaskBtn')?.addEventListener('click', () => this.openAddTaskModal());
    document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshData());
    document.getElementById('openSubmitFromDashboardBtn')?.addEventListener('click', () => this.openSubmitTasks());
    document.getElementById('exportBtn')?.addEventListener('click', () => this.exportData());
    
    // ปุ่มจัดการผู้รับผิดชอบ
    document.getElementById('selectAllAssigned')?.addEventListener('click', () => this.selectAllAssigned());
    document.getElementById('clearAllAssigned')?.addEventListener('click', () => this.clearAllAssigned());
    
    // การกรองและค้นหางาน
    document.getElementById('statusFilter')?.addEventListener('change', () => this.renderTasks());
    document.getElementById('priorityFilter')?.addEventListener('change', () => this.renderTasks());
    document.getElementById('assigneeFilter')?.addEventListener('change', () => this.renderTasks());
    document.getElementById('dueDateFilter')?.addEventListener('change', () => this.renderTasks());
    document.getElementById('searchTasks')?.addEventListener('input', () => this.renderTasks());
    
    // ปุ่มรีเซ็ตตัวกรอง
    document.getElementById('resetFiltersBtn')?.addEventListener('click', () => this.resetFilters());
    
    // ปุ่มส่งงานที่เลือก
    document.getElementById('submitSelectedTasksBtn')?.addEventListener('click', () => this.submitSelectedTasks());
    
    // Submit Task Modal Events
    document.getElementById('submitTaskModalClose')?.addEventListener('click', () => this.closeModal('submitTaskModal'));
    document.getElementById('submitTaskForm')?.addEventListener('submit', (e) => this.handleSubmitTaskForm(e));
    
    // Task Detail Modal Events
    document.getElementById('taskDetailModalClose')?.addEventListener('click', () => this.closeModal('taskDetailModal'));
    document.getElementById('editTaskBtn')?.addEventListener('click', () => {
      const taskId = document.getElementById('taskDetailId')?.textContent?.replace('#', '');
      if (taskId) {
        this.closeModal('taskDetailModal');
        this.openEditTaskModal(taskId);
      }
    });
    document.getElementById('deleteTaskBtn')?.addEventListener('click', () => {
      const taskId = document.getElementById('taskDetailId')?.textContent?.replace('#', '');
      if (taskId) {
        this.closeModal('taskDetailModal');
        this.deleteTask(taskId);
      }
    });
    
    // File Upload for Submit Modal
    this.setupSubmitFileUpload();
    
    // ปุ่มเลือกช่วงเวลาสถิติ
    document.querySelectorAll('[data-stats-period]').forEach(btn => {
      btn.addEventListener('click', (e) => this.changeStatsPeriod(e.target.dataset.statsPeriod));
    });
    
    // ปุ่มปฏิทิน
    document.getElementById('prevMonth')?.addEventListener('click', () => this.prevMonth());
    document.getElementById('nextMonth')?.addEventListener('click', () => this.nextMonth());
    
    // Calendar quick navigation
    document.getElementById('todayBtn')?.addEventListener('click', () => this.goToToday());
    document.getElementById('thisMonthBtn')?.addEventListener('click', () => this.goToThisMonth());
    
    // Close calendar detail view
    document.getElementById('closeCalendarDetail')?.addEventListener('click', () => {
      const detailContainer = document.getElementById('calendarTaskDetail');
      if (detailContainer) {
        detailContainer.classList.add('hidden');
      }
    });
    
    // ปุ่ม Leaderboard
    document.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', (e) => this.changeLeaderboardPeriod(e.target.dataset.period));
    });
    
    // ปุ่ม Files
    document.getElementById('uploadFileBtn')?.addEventListener('click', () => this.uploadFile());
    document.getElementById('searchFiles')?.addEventListener('input', (e) => this.filterFiles(e.target.value));
    document.getElementById('refreshFilesBtn')?.addEventListener('click', () => this.loadFiles());
    
    // File view toggles
    document.getElementById('folderViewBtn')?.addEventListener('click', () => this.switchFileView('folder'));
    document.getElementById('listViewBtn')?.addEventListener('click', () => this.switchFileView('list'));
    document.getElementById('gridViewBtn')?.addEventListener('click', () => this.switchFileView('grid'));
    
    // File filters
    document.getElementById('taskFilterSelect')?.addEventListener('change', () => this.renderFiles());
    document.getElementById('fileTypeFilter')?.addEventListener('change', () => this.renderFiles());
    
    // ปุ่ม Tasks
    document.getElementById('searchTasks')?.addEventListener('input', (e) => this.filterTasks(e.target.value));
    document.getElementById('statusFilter')?.addEventListener('change', (e) => this.filterTasksByStatus(e.target.value));
    
    // ปุ่ม Reports
    document.getElementById('runReportBtn')?.addEventListener('click', () => this.runReport());
    document.getElementById('exportExcelBtn')?.addEventListener('click', () => this.exportExcel());
    document.getElementById('saveRecipientsBtn')?.addEventListener('click', () => this.saveRecipients());
    
    // ปุ่ม Debug (ถ้ามี)
    document.getElementById('debugLeaderboardBtn')?.addEventListener('click', () => this.debugLeaderboard());
    
    // ปิด modal เมื่อคลิกพื้นหลัง (แต่ไม่ปิดเมื่อคลิกที่ modal content)
    document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closeAllModals();
      }
    });
    
    // ปิด modal เมื่อกด ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  setupNavigation() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav-item').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleNavigation(e, link);
      });
    });
    
    // Bottom navigation (mobile)
    document.querySelectorAll('.bottom-nav-item').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleNavigation(e, link);
      });
    });
    
    // Section links
    document.querySelectorAll('.section-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          const viewName = href.substring(1);
          this.switchView(viewName);
          window.location.hash = href;
        }
      });
    });
  }

  parseURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    this.currentGroupId = urlParams.get('groupId') || 'default';
    this.currentTaskId = urlParams.get('taskId');
    this.currentAction = urlParams.get('action');
    this.currentUserId = urlParams.get('userId'); // เพิ่มการตรวจสอบ userId
    
    // ตรวจสอบ URL hash
    const hash = window.location.hash.substring(1);
    if (hash && ['dashboard', 'calendar', 'tasks', 'files', 'leaderboard', 'reports'].includes(hash)) {
      this.currentView = hash;
    }
  }

  async loadUserData() {
    try {
      console.log('loadUserData started');
      this.showLoading();
      
      // Mock user data for now
      // ควรโหลดผู้ใช้จริงจาก backend เพื่อให้ได้ lineUserId
      this.currentUser = {
        id: 'user123',
        lineUserId: 'Uc92411a226e4d4c9866adef05068bdf1', // ใช้ LINE User ID ที่มีอยู่จริง
        displayName: 'ผู้ใช้ทดสอบ',
        email: 'test@example.com'
      };
      
      console.log('Loading user info and data...');
      
      // ตรวจสอบและจัดการแสดง banner โหมดดูอย่างเดียว
      if (!this.currentUserId) {
        this.showReadOnlyBanner();
      } else {
        this.hideReadOnlyBanner();
      }
      
      this.updateUserInfo();
      await this.loadTasks();
      // await this.loadGroups(); // Removed - groups section no longer displayed
      await this.loadStats();
      await this.loadLeaderboard();
      await this.loadFiles();
      await this.loadAssigneeFilter(); // โหลดตัวกรองผู้รับผิดชอบ
      
      // แสดงข้อมูลตาม view ปัจจุบัน
      console.log('Switching to current view:', this.currentView);
      this.switchView(this.currentView);
      
      // ตรวจสอบ action parameter และเปิด modal ที่เหมาะสม
      if (this.currentAction === 'new-task') {
        this.openAddTaskModal();
      } else if (this.currentAction === 'edit' && this.currentTaskId) {
        // เปิด modal แก้ไขงาน
        this.openEditTaskModal(this.currentTaskId);
      } else if (this.currentAction === 'view' && this.currentTaskId) {
        // เปิด modal รายละเอียดงานอัตโนมัติ
        setTimeout(() => {
          this.openTaskDetail(this.currentTaskId);
        }, 1000); // รอให้โหลดข้อมูลงานเสร็จก่อน
      }
      
      // อัปเดตข้อมูลเริ่มต้น
      this.renderRecentTasks();
      
      console.log('loadUserData completed successfully');
      
    } catch (error) {
      console.error('Error loading user data:', error);
      this.showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
      this.hideLoading();
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
      if (!this.currentGroupId) {
        console.warn('No group ID available for loading tasks, using mock data');
        // Use the mock data from initializeMockData if no tasks exist
        if (!this.tasks || this.tasks.length === 0) {
          this.initializeMockData();
        }
        this.renderTasks();
        this.updateUpcomingTasks();
        return;
      }

      const response = await fetch(`/api/groups/${this.currentGroupId}/tasks?limit=100`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        this.tasks = result.data || [];
      } else {
        throw new Error(result.error || 'Failed to load tasks');
      }
      
      this.renderTasks();
      this.updateUpcomingTasks();
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.showToast('เกิดข้อผิดพลาดในการโหลดงาน', 'error');
      
      // Fallback to mock data for development
      this.tasks = [
        {
          id: 'task1',
          title: 'งานทดสอบ 1',
          description: 'รายละเอียดงานทดสอบ',
          status: 'pending',
          priority: 'medium',
          dueTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          group: { id: 'group1', name: 'กลุ่มทดสอบ' }
        },
        {
          id: 'task2', 
          title: 'งานทดสอบ 2',
          description: 'รายละเอียดงานทดสอบ 2',
          status: 'completed',
          priority: 'high',
          dueTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          group: { id: 'group2', name: 'กลุ่มทดสอบ 2' }
        },
        {
          id: 'task3', 
          title: 'งานทดสอบ 3',
          description: 'รายละเอียดงานทดสอบ 3',
          status: 'overdue',
          priority: 'low',
          dueTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          group: { id: 'group1', name: 'กลุ่มทดสอบ' }
        }
      ];
      this.renderTasks();
      this.updateUpcomingTasks();
    }
  }

  // async loadGroups() {
  //   try {
  //     // Mock groups data
  //     this.groups = [
  //       { id: 'group1', name: 'กลุ่มทดสอบ', description: 'กลุ่มสำหรับทดสอบระบบ' },
  //       { id: 'group2', name: 'กลุ่มทดสอบ 2', description: 'กลุ่มทดสอบที่สอง' }
  //     ];
  //     
  //     this.renderGroups();
  //   } catch (error) {
  //     console.error('Error loading groups:', error);
  //   }
  // }

  async loadStats(period = 'this_week') {
    try {
      console.log('loadStats called with period:', period);
      console.log('Current tasks:', this.tasks);
      console.log('Current groupId:', this.currentGroupId);
      
      if (!this.currentGroupId) {
        // Fallback to mock data - calculate from current tasks
        const stats = {
          totalTasks: this.tasks.length,
          pendingTasks: this.tasks.filter(t => t.status === 'pending').length,
          completedTasks: this.tasks.filter(t => t.status === 'completed').length,
          overdueTasks: this.tasks.filter(t => t.status === 'overdue').length
        };
        console.log('Calculated stats from tasks:', stats);
        this.updateStats(stats, period);
        return;
      }

      const response = await fetch(`/api/groups/${this.currentGroupId}/stats?period=${period}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        // แยกข้อมูลสถิติออกจาก API response
        const statsData = result.data.stats || result.data;
        console.log('API stats received:', statsData);
        this.updateStats(statsData, period);
      } else {
        throw new Error(result.error || 'Failed to load stats');
      }
      
    } catch (error) {
      console.error('Error loading stats:', error);
      // Fallback to mock data - calculate from current tasks
      const stats = {
        totalTasks: this.tasks.length,
        pendingTasks: this.tasks.filter(t => t.status === 'pending').length,
        completedTasks: this.tasks.filter(t => t.status === 'completed').length,
        overdueTasks: this.tasks.filter(t => t.status === 'overdue').length
      };
      console.log('Fallback stats calculated:', stats);
      this.updateStats(stats, period);
    }
  }

  async loadLeaderboard(period = 'weekly') {
    try {
      if (!this.currentGroupId) {
        // Fallback to mock data
        const leaderboard = [
          { displayName: 'ผู้ใช้ 1', weeklyPoints: 85.5, tasksCompleted: 12 },
          { displayName: 'ผู้ใช้ 2', weeklyPoints: 72.3, tasksCompleted: 10 },
          { displayName: 'ผู้ใช้ 3', weeklyPoints: 68.1, tasksCompleted: 8 }
        ];
        this.updateLeaderboard(leaderboard);
        this.updateMiniLeaderboard(leaderboard.slice(0, 3));
        return;
      }

      const response = await fetch(`/api/groups/${this.currentGroupId}/leaderboard?period=${period}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        this.updateLeaderboard(result.data);
        this.updateMiniLeaderboard(result.data.slice(0, 3));
      } else {
        throw new Error(result.error || 'Failed to load leaderboard');
      }
      
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      // Fallback to mock data
      const leaderboard = [
        { displayName: 'ผู้ใช้ 1', weeklyPoints: 85.5, tasksCompleted: 12 },
        { displayName: 'ผู้ใช้ 2', weeklyPoints: 72.3, tasksCompleted: 10 },
        { displayName: 'ผู้ใช้ 3', weeklyPoints: 68.1, tasksCompleted: 8 }
      ];
      this.updateLeaderboard(leaderboard);
      this.updateMiniLeaderboard(leaderboard.slice(0, 3));
    }
  }

  updateStats(stats, period = 'this_week') {
    console.log('Updating stats:', stats);
    
    const totalTasksEl = document.getElementById('totalTasks');
    const pendingTasksEl = document.getElementById('pendingTasks');
    const completedTasksEl = document.getElementById('completedTasks');
    const overdueTasksEl = document.getElementById('overdueTasks');
    
    console.log('Found elements:', {
      totalTasks: !!totalTasksEl,
      pendingTasks: !!pendingTasksEl,
      completedTasks: !!completedTasksEl,
      overdueTasks: !!overdueTasksEl
    });
    
    if (totalTasksEl) totalTasksEl.textContent = stats.totalTasks || 0;
    if (pendingTasksEl) pendingTasksEl.textContent = stats.pendingTasks || 0;
    if (completedTasksEl) completedTasksEl.textContent = stats.completedTasks || 0;
    if (overdueTasksEl) overdueTasksEl.textContent = stats.overdueTasks || 0;
    
    // อัปเดตปุ่มเลือกช่วงเวลา
    this.updateStatsPeriodButtons(period);
  }

  updateStatsPeriodButtons(selectedPeriod) {
    const buttons = document.querySelectorAll('[data-stats-period]');
    buttons.forEach(btn => {
      const period = btn.getAttribute('data-stats-period');
      if (period === selectedPeriod) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  updateLeaderboard(users) {
    const container = document.getElementById('leaderboardList');
    if (!container) return;

    if (!users || users.length === 0) {
      container.innerHTML = '<div class="text-center py-8 text-gray-500">ยังไม่มีข้อมูลอันดับ</div>';
      return;
    }

    const html = users.map((user, index) => {
      const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : String(index + 1);
      const rankClass = index < 3 ? ['gold', 'silver', 'bronze'][index] : '';
      
      return `
        <div class="leaderboard-item">
          <div class="rank ${rankClass}">${rankIcon}</div>
          <div class="user-info">
            <div class="user-name">${user.displayName}</div>
            <div class="user-score-text">เสร็จ ${user.tasksCompleted} งาน • คะแนนเฉลี่ย ${user.weeklyPoints?.toFixed(1) || 0}</div>
          </div>
          <div class="user-stats">
            <div class="user-score">${user.weeklyPoints?.toFixed(1) || 0}</div>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
  }

  updateMiniLeaderboard(users) {
    const container = document.getElementById('miniLeaderboard');
    if (!container) return;

    if (!users || users.length === 0) {
      container.innerHTML = '<p class="text-muted">ยังไม่มีข้อมูลอันดับ</p>';
      return;
    }

    const html = users.map((user, index) => {
      const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : String(index + 1);
      const rankClass = index < 3 ? ['gold', 'silver', 'bronze'][index] : '';
      
      return `
        <div class="leaderboard-item mini">
          <div class="rank ${rankClass}">${rankIcon}</div>
          <div class="user-info">
            <div class="user-name">${user.displayName}</div>
            <div class="user-score-text">${user.weeklyPoints?.toFixed(1) || 0} คะแนนเฉลี่ย</div>
          </div>
          <div class="user-stats">
            <div class="user-score">${user.tasksCompleted || 0} งาน</div>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
  }

  updateUpcomingTasks() {
    const container = document.getElementById('upcomingTasks');
    if (!container) return;

    const upcomingTasks = this.tasks
      .filter(task => ['pending', 'overdue', 'in_progress'].includes(task.status))
      .sort((a, b) => new Date(a.dueTime) - new Date(b.dueTime))
      .slice(0, 5);

    if (upcomingTasks.length === 0) {
      container.innerHTML = '<p class="text-muted">ไม่มีงานใกล้ครบกำหนด</p>';
      return;
    }

    const html = upcomingTasks.map(task => `
      <div class="task-item" data-task-id="${task.id}">
        <div class="task-priority ${task.priority}"></div>
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            <span><i class="fas fa-clock"></i> ครบกำหนด ${this.formatDateTime(task.dueTime)}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-sm btn-primary" onclick="dashboardApp.openSubmitTaskModal('${task.id}')">
            <i class="fas fa-upload"></i> ส่งงาน
          </button>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = html;
  }

  renderTasks() {
    const tasksContainer = document.getElementById('tasksContainer');
    if (!tasksContainer) return;

    // กรองงานตามเงื่อนไข
    const filteredTasks = this.getFilteredTasks();

    if (filteredTasks.length === 0) {
      tasksContainer.innerHTML = `
        <div class="px-6 py-8 text-center text-gray-500">
          <i class="fas fa-tasks text-4xl mb-4 text-gray-300"></i>
          <p class="text-lg font-medium">ไม่มีงาน</p>
          <p>ไม่พบงานที่ตรงกับเงื่อนไขการค้นหา</p>
        </div>
      `;
      return;
    }

    const taskCards = filteredTasks.map(task => this.renderTaskCard(task)).join('');
    tasksContainer.innerHTML = taskCards;
    
    // อัปเดตสถิติ
    this.updateTaskStats(filteredTasks);
  }

  renderTaskCard(task) {
    const statusInfo = this.getStatusInfo(task.status);
    const priorityInfo = this.getPriorityInfo(task.priority);
    const assignees = this.getTaskAssignees(task);
    const dueInfo = this.getDueInfo(task.dueTime);
    const canSubmit = this.canSubmitTask(task);

    return `
      <!-- Task Card -->
      <div class="task-card hover:bg-gray-50 cursor-pointer" onclick="window.dashboardApp.openTaskDetail('${task.id}')">
        <!-- Desktop Grid Layout (hidden on mobile) -->
        <div class="hidden md:grid grid-cols-6 gap-4 px-6 py-4 items-center">
          <div class="col-span-1">
            <div class="text-sm font-medium text-gray-900">${this.escapeHtml(task.title)}</div>
            <div class="text-xs text-gray-500 mt-1 line-clamp-2">${this.escapeHtml(task.description || 'ไม่มีรายละเอียด')}</div>
            ${task.tags && task.tags.length > 0 ? `
              <div class="flex flex-wrap gap-1 mt-2">
                ${task.tags.slice(0, 2).map(tag => 
                  `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">${this.escapeHtml(tag)}</span>`
                ).join('')}
                ${task.tags.length > 2 ? `<span class="text-xs text-gray-500">+${task.tags.length - 2}</span>` : ''}
              </div>
            ` : ''}
          </div>
          <div class="col-span-1">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.class}">
              <i class="${statusInfo.icon} mr-1"></i>
              ${statusInfo.text}
            </span>
          </div>
          <div class="col-span-1">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityInfo.class}">
              <i class="${priorityInfo.icon} mr-1"></i>
              ${priorityInfo.text}
            </span>
          </div>
          <div class="col-span-1">
            <div class="text-sm text-gray-900">${assignees}</div>
          </div>
          <div class="col-span-1">
            <div class="text-sm text-gray-900">${dueInfo.date}</div>
            <div class="text-xs ${dueInfo.class}">${dueInfo.remaining}</div>
          </div>
          <div class="col-span-1" onclick="event.stopPropagation()">
            <div class="flex items-center gap-2">
              ${canSubmit ? `
                <button 
                  class="btn btn-sm btn-primary" 
                  onclick="window.dashboardApp.openSubmitTaskModal('${task.id}')"
                  title="ส่งงาน"
                >
                  <i class="fas fa-upload"></i>
                  ส่ง
                </button>
              ` : ''}
              ${this.canEditTask(task) ? `
                <button 
                  class="btn btn-sm btn-outline" 
                  onclick="window.dashboardApp.openEditTaskModal('${task.id}')"
                  title="แก้ไขงาน"
                >
                  <i class="fas fa-edit"></i>
                </button>
              ` : ''}
              ${this.canDeleteTask(task) ? `
                <button 
                  class="btn btn-sm" 
                  style="background-color: #dc2626; color: white;" 
                  onclick="window.dashboardApp.deleteTask('${task.id}')"
                  title="ลบงาน"
                >
                  <i class="fas fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
        
        <!-- Mobile Multi-Row Layout (visible only on mobile) -->
        <div class="md:hidden px-4 py-4 space-y-2">
          <!-- Row 1: Task Name -->
          <div class="mb-2">
            <div class="font-medium text-gray-900 text-base leading-tight">${this.escapeHtml(task.title)}</div>
            ${task.description ? `<div class="text-sm text-gray-600 mt-1 line-clamp-2">${this.escapeHtml(task.description)}</div>` : ''}
            ${task.tags && task.tags.length > 0 ? `
              <div class="flex flex-wrap gap-1 mt-2">
                ${task.tags.slice(0, 3).map(tag => 
                  `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">${this.escapeHtml(tag)}</span>`
                ).join('')}
                ${task.tags.length > 3 ? `<span class="text-xs text-gray-500">+${task.tags.length - 3}</span>` : ''}
              </div>
            ` : ''}
          </div>
          
          <!-- Row 2: Status and Priority (small) -->
          <div class="flex items-center gap-3">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.class}">
              <i class="${statusInfo.icon} mr-1 text-xs"></i>
              ${statusInfo.text}
            </span>
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.class}">
              <i class="${priorityInfo.icon} mr-1 text-xs"></i>
              ${priorityInfo.text}
            </span>
          </div>
          
          <!-- Row 3: Assignee (small) -->
          <div class="text-sm text-gray-700">
            <i class="fas fa-user mr-2 text-xs text-gray-400"></i>${assignees}
          </div>
          
          <!-- Row 4: Due Date (small) -->
          <div class="text-sm">
            <i class="fas fa-calendar mr-2 text-xs text-gray-400"></i>
            <span class="text-gray-700">${dueInfo.date}</span>
            ${dueInfo.remaining ? `<span class="ml-2 text-xs ${dueInfo.class}">${dueInfo.remaining}</span>` : ''}
          </div>
          
          <!-- Row 5: Action Buttons (small) -->
          <div class="pt-2" onclick="event.stopPropagation()">
            <div class="flex items-center gap-2">
              ${canSubmit ? `
                <button 
                  class="btn btn-xs btn-primary" 
                  onclick="window.dashboardApp.openSubmitTaskModal('${task.id}')"
                  title="ส่งงาน"
                >
                  <i class="fas fa-upload mr-1"></i>
                  ส่งงาน
                </button>
              ` : ''}
              ${this.canEditTask(task) ? `
                <button 
                  class="btn btn-xs btn-outline" 
                  onclick="window.dashboardApp.openEditTaskModal('${task.id}')"
                  title="แก้ไข"
                >
                  <i class="fas fa-edit mr-1"></i>
                  แก้ไข
                </button>
              ` : ''}
              ${this.canDeleteTask(task) ? `
                <button 
                  class="btn btn-xs text-white" 
                  style="background-color: #dc2626;" 
                  onclick="window.dashboardApp.deleteTask('${task.id}')"
                  title="ลบ"
                >
                  <i class="fas fa-trash mr-1"></i>
                  ลบ
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Helper functions for rendering
  getStatusInfo(status) {
    const statusMap = {
      'pending': { 
        text: 'รอดำเนินการ', 
        class: 'bg-yellow-100 text-yellow-800', 
        icon: 'fas fa-clock' 
      },
      'in_progress': { 
        text: 'กำลังดำเนินการ', 
        class: 'bg-blue-100 text-blue-800', 
        icon: 'fas fa-play' 
      },
      'completed': { 
        text: 'เสร็จแล้ว', 
        class: 'bg-green-100 text-green-800', 
        icon: 'fas fa-check' 
      },
      'overdue': { 
        text: 'เกินกำหนด', 
        class: 'bg-red-100 text-red-800', 
        icon: 'fas fa-exclamation-triangle' 
      },
      'submitted': { 
        text: 'ส่งแล้ว', 
        class: 'bg-purple-100 text-purple-800', 
        icon: 'fas fa-upload' 
      }
    };
    return statusMap[status] || statusMap['pending'];
  }

  getPriorityInfo(priority) {
    const priorityMap = {
      'low': { 
        text: 'ต่ำ', 
        class: 'bg-gray-100 text-gray-800', 
        icon: 'fas fa-chevron-down' 
      },
      'medium': { 
        text: 'ปานกลาง', 
        class: 'bg-yellow-100 text-yellow-800', 
        icon: 'fas fa-minus' 
      },
      'high': { 
        text: 'สูง', 
        class: 'bg-orange-100 text-orange-800', 
        icon: 'fas fa-chevron-up' 
      },
      'urgent': { 
        text: 'ด่วน', 
        class: 'bg-red-100 text-red-800', 
        icon: 'fas fa-exclamation' 
      }
    };
    return priorityMap[priority] || priorityMap['medium'];
  }

  getTaskAssignees(task) {
    if (!task.assignedUsers || task.assignedUsers.length === 0) {
      return 'ไม่มีผู้รับผิดชอบ';
    }
    
    const names = task.assignedUsers.map(user => user.displayName || user.name || 'ไม่ระบุชื่อ');
    if (names.length > 2) {
      return `${names.slice(0, 2).join(', ')} และอีก ${names.length - 2} คน`;
    }
    return names.join(', ');
  }

  getDueInfo(dueTime) {
    if (!dueTime) {
      return { 
        date: 'ไม่กำหนด', 
        remaining: '',
        class: 'text-gray-500' 
      };
    }

    const due = new Date(dueTime);
    const now = new Date();
    const diff = due - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    const dateStr = due.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const timeStr = due.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });

    let remaining = '';
    let className = 'text-gray-500';

    if (diff < 0) {
      remaining = `เกิน ${Math.abs(days)} วัน`;
      className = 'text-red-600';
    } else if (days === 0) {
      remaining = 'วันนี้';
      className = 'text-orange-600';
    } else if (days === 1) {
      remaining = 'พรุ่งนี้';
      className = 'text-yellow-600';
    } else if (days <= 3) {
      remaining = `อีก ${days} วัน`;
      className = 'text-yellow-600';
    } else {
      remaining = `อีก ${days} วัน`;
      className = 'text-gray-500';
    }

    return {
      date: `${dateStr} ${timeStr}`,
      remaining,
      class: className
    };
  }
  
  goToToday() {
    try {
      // Get current date in Thailand timezone
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const thaiTime = new Date(utc + (7 * 3600000));
      
      this.currentCalendarMonth = thaiTime.getMonth();
      this.currentCalendarYear = thaiTime.getFullYear();
      
      this.updateCalendarHeader();
      this.renderCalendarGrid();
      
      this.showToast('กลับไปยังวันนี้', 'success');
      
    } catch (error) {
      console.error('❌ Error going to today:', error);
      this.showToast('เกิดข้อผิดพลาดในการไปยังวันนี้', 'error');
    }
  }
  
  goToThisMonth() {
    try {
      // Get current month in Thailand timezone
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const thaiTime = new Date(utc + (7 * 3600000));
      
      this.currentCalendarMonth = thaiTime.getMonth();
      this.currentCalendarYear = thaiTime.getFullYear();
      
      this.updateCalendarHeader();
      this.renderCalendarGrid();
      
      // Reload upcoming and overdue tasks for current timeframe
      this.loadUpcomingTasks();
      this.loadOverdueTasks();
      
      this.showToast('กลับไปยังเดือนนี้', 'success');
      
    } catch (error) {
      console.error('❌ Error going to this month:', error);
      this.showToast('เกิดข้อผิดพลาดในการไปยังเดือนนี้', 'error');
    }
  }

  // ====================
  // Permission Checking
  // ====================

  /**
   * ตรวจสอบว่าผู้ใช้สามารถส่งงานได้หรือไม่
   */
  canSubmitTask(task) {
    // ตรวจสอบสถานะงานก่อน
    const validStatus = task.status === 'pending' || task.status === 'in_progress' || task.status === 'overdue';
    if (!validStatus) return false;
    
    // ตรวจสอบว่าผู้ใช้เป็นผู้รับผิดชอบงานหรือไม่
    if (!this.currentUserId) return false;
    
    // ตรวจสอบว่าผู้ใช้เป็นหนึ่งในผู้รับผิดชอบงาน
    const isAssignee = task.assignedUsers && task.assignedUsers.some(user => 
      user.id === this.currentUserId || 
      user.lineUserId === this.currentUserId
    );
    
    return isAssignee;
  }

  /**
   * ตรวจสอบว่าผู้ใช้สามารถแก้ไขงานได้หรือไม่
   */
  canEditTask(task) {
    // ตรวจสอบว่าผู้ใช้เป็นผู้สร้างงานหรือไม่
    if (!this.currentUserId) return false;
    
    return task.createdBy === this.currentUserId || 
           task.createdByUser?.id === this.currentUserId || 
           task.createdByUser?.lineUserId === this.currentUserId;
  }

  /**
   * ตรวจสอบว่าผู้ใช้สามารถลบงานได้หรือไม่
   */
  canDeleteTask(task) {
    // ใช้กฎเดียวกับการแก้ไขงาน
    return this.canEditTask(task);
  }

  /**
   * ตรวจสอบว่าผู้ใช้สามารถตรวจงานได้หรือไม่
   */
  canReviewTask(task) {
    // ตรวจสอบว่าผู้ใช้เป็นผู้ตรวจงานหรือผู้สร้างงาน
    if (!this.currentUserId) return false;
    
    const reviewerUserId = task.workflow?.review?.reviewerUserId;
    const isReviewer = reviewerUserId === this.currentUserId;
    const isCreator = this.canEditTask(task);
    
    return isReviewer || isCreator;
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ฟังก์ชันกรองงาน
  getFilteredTasks() {
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const priorityFilter = document.getElementById('priorityFilter')?.value || '';
    const assigneeFilter = document.getElementById('assigneeFilter')?.value || '';
    const dueDateFilter = document.getElementById('dueDateFilter')?.value || '';
    const searchQuery = document.getElementById('searchTasks')?.value || '';

    return this.tasks.filter(task => {
      // กรองตามสถานะ
      if (statusFilter && task.status !== statusFilter) return false;
      
      // กรองตามความสำคัญ
      if (priorityFilter && task.priority !== priorityFilter) return false;
      
      // กรองตามผู้รับผิดชอบ
      if (assigneeFilter && !this.isTaskAssignedTo(task, assigneeFilter)) return false;
      
      // กรองตามวันที่กำหนดส่ง
      if (dueDateFilter && !this.matchesDueDateFilter(task, dueDateFilter)) return false;
      
      // กรองตามคำค้นหา
      if (searchQuery && !this.matchesSearchQuery(task, searchQuery)) return false;
      
      return true;
    });
  }

  // ตรวจสอบว่างานถูกมอบหมายให้ผู้ใช้หรือไม่
  isTaskAssignedTo(task, assigneeId) {
    if (!task.assigneeIds || !Array.isArray(task.assigneeIds)) return false;
    return task.assigneeIds.includes(assigneeId);
  }

  // ตรวจสอบว่างานตรงกับเงื่อนไขวันที่หรือไม่
  matchesDueDateFilter(task, filter) {
    const dueDate = new Date(task.dueTime);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    switch (filter) {
      case 'today':
        return dueDate.toDateString() === today.toDateString();
      case 'tomorrow':
        return dueDate.toDateString() === tomorrow.toDateString();
      case 'week':
        return dueDate >= today && dueDate <= weekEnd;
      case 'overdue':
        return dueDate < today && task.status !== 'completed';
      default:
        return true;
    }
  }

  // ตรวจสอบว่างานตรงกับคำค้นหาหรือไม่
  matchesSearchQuery(task, query) {
    const searchText = query.toLowerCase();
    return (
      task.title.toLowerCase().includes(searchText) ||
      (task.description && task.description.toLowerCase().includes(searchText)) ||
      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchText)))
    );
  }

  // อัปเดตสถิติงาน
  updateTaskStats(filteredTasks) {
    const stats = {
      filtered: filteredTasks.length,
      pending: filteredTasks.filter(t => t.status === 'pending').length,
      completed: filteredTasks.filter(t => t.status === 'completed').length,
      overdue: filteredTasks.filter(t => t.status === 'overdue').length
    };

    const filteredTasksElement = document.getElementById('filteredTasksCount');
    if (filteredTasksElement) filteredTasksElement.textContent = stats.filtered;
    
    const pendingTasksElement = document.getElementById('pendingTasksCount');
    if (pendingTasksElement) pendingTasksElement.textContent = stats.pending;
    
    const completedTasksElement = document.getElementById('completedTasksCount');
    if (completedTasksElement) completedTasksElement.textContent = stats.completed;
    
    const overdueTasksElement = document.getElementById('overdueTasksCount');
    if (overdueTasksElement) overdueTasksElement.textContent = stats.overdue;
  }

  // โหลดรายชื่อผู้รับผิดชอบสำหรับตัวกรอง
  async loadAssigneeFilter() {
    try {
      if (!this.currentGroupId) return;

      const response = await fetch(`/api/groups/${this.currentGroupId}/members`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const assigneeSelect = document.getElementById('assigneeFilter');
          if (assigneeSelect) {
            // เพิ่มตัวเลือกผู้รับผิดชอบ
            const members = result.data || [];
            members.forEach(member => {
              const option = document.createElement('option');
              option.value = member.lineUserId || member.id;
              option.textContent = member.displayName || member.name || member.userId;
              assigneeSelect.appendChild(option);
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading assignee filter:', error);
    }
  }

  // รีเซ็ตตัวกรองทั้งหมด
  resetFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('priorityFilter').value = '';
    document.getElementById('assigneeFilter').value = '';
    document.getElementById('dueDateFilter').value = '';
    document.getElementById('searchTasks').value = '';
    this.renderTasks();
  }

  // ส่งงานที่เลือกหลายงาน
  async submitSelectedTasks() {
    const selectedTasks = this.getSelectedTasks();
    if (selectedTasks.length === 0) {
      this.showToast('กรุณาเลือกงานที่ต้องการส่ง', 'error');
      return;
    }

    try {
      this.showToast('กำลังส่งงาน...', 'info');
      
      for (const taskId of selectedTasks) {
        await this.submitTask(taskId);
      }
      
      this.showToast(`ส่งงาน ${selectedTasks.length} รายการเรียบร้อย`, 'success');
      this.clearSelectedTasks();
      this.renderTasks();
      
    } catch (error) {
      console.error('Error submitting selected tasks:', error);
      this.showToast('เกิดข้อผิดพลาดในการส่งงาน', 'error');
    }
  }

  // ดึงรายการงานที่เลือก
  getSelectedTasks() {
    const checkboxes = document.querySelectorAll('input[name="taskCheckbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
  }

  // ล้างการเลือกงานทั้งหมด
  clearSelectedTasks() {
    const checkboxes = document.querySelectorAll('input[name="taskCheckbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    this.updateSubmitButton();
  }

  // อัปเดตปุ่มส่งงาน
  updateSubmitButton() {
    const selectedCount = this.getSelectedTasks().length;
    const submitBtn = document.getElementById('submitSelectedTasksBtn');
    
    if (submitBtn) {
      if (selectedCount > 0) {
        submitBtn.style.display = 'inline-flex';
        submitBtn.innerHTML = `<i class="fas fa-upload mr-2"></i>ส่งงานที่เลือก (${selectedCount})`;
      } else {
        submitBtn.style.display = 'none';
      }
    }
  }

  renderRecentTasks() {
    const container = document.getElementById('recentTasks');
    if (!container) return;

    if (this.tasks.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-center py-8">ไม่มีงานในขณะนี้</p>';
      return;
    }

    const recentTasks = this.tasks.slice(0, 5); // แสดงแค่ 5 งานล่าสุด
    const tasksHTML = recentTasks.map(task => `
      <div class="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900">${task.title}</h3>
            <p class="text-gray-600 text-sm mt-1">${task.description}</p>
            <div class="flex items-center mt-2 space-x-4 text-sm text-gray-500">
              <span>📅 ${this.formatDate(task.dueTime)}</span>
              <span class="px-2 py-1 rounded-full text-xs ${
                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }">${task.priority}</span>
            </div>
          </div>
          <div class="flex space-x-2">
            <button onclick="window.dashboardApp.editTask('${task.id}')" class="text-blue-600 hover:text-blue-800">✏️</button>
            <button onclick="window.dashboardApp.deleteTask('${task.id}')" class="text-red-600 hover:text-red-800">🗑️</button>
          </div>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = tasksHTML;
  }

  // renderGroups() {
  //   const groupsContainer = document.getElementById('groupsContainer');
  //   if (!groupsContainer) return;

  //   if (this.groups.length === 0) {
  //     groupsContainer.innerHTML = `
  //       <div class="text-center py-12">
  //         <i class="fas fa-users text-6xl text-gray-300 mb-4"></i>
  //         <h3 class="text-lg font-medium text-gray-900 mb-2">ไม่มีกลุ่ม</h3>
  //         <p class="text-gray-600">คุณยังไม่ได้เข้าร่วมกลุ่มใด</p>
  //       </div>
  //     `;
  //     return;
  //   }

  //   const groupCards = this.groups.map(group => this.renderGroupCard(group)).join('');
  //   groupsContainer.innerHTML = groupCards;
  // }

  renderTaskCard(task) {
    const isOverdue = task.status === 'overdue';
    const statusText = this.getStatusText(task.status);
    const statusColor = this.getStatusColor(task.status);
    const dueDate = this.formatDate(task.dueTime || task.dueDate);
    const groupName = task.group?.name || 'ไม่ระบุกลุ่ม';
    const priorityText = this.getPriorityText(task.priority);
    const priorityClass = this.getPriorityClass(task.priority);
    const assignedTo = this.getAssignedToDisplay(task);
    const filesCount = task.files ? task.files.length : 0;
    const tags = task.tags || [];
    const canSubmit = task.status === 'pending' || task.status === 'in_progress';
    const isSubmitted = task.status === 'submitted' || task.status === 'completed';

    return `
      <div class="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
        <div class="p-6">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-start space-x-3">
              <!-- Checkbox สำหรับเลือกงาน -->
              ${canSubmit ? `
                <input type="checkbox" name="taskCheckbox" value="${task.id}" 
                       class="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                       onchange="dashboardApp.updateSubmitButton()">
              ` : ''}
              
              <div class="flex-1">
                <div class="flex items-start justify-between mb-2">
                  <h3 class="text-lg font-semibold text-gray-900">${task.title}</h3>
                  <span class="priority-badge ${priorityClass}">${priorityText}</span>
                </div>
                <p class="text-gray-600 text-sm mb-3">${task.description || 'ไม่มีรายละเอียด'}</p>
                
                <div class="flex items-center space-x-4 text-sm mb-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">
                    ${statusText}
                  </span>
                  <span class="text-gray-500">
                    <i class="fas fa-calendar mr-1"></i>
                    ${dueDate}
                  </span>
                  <span class="text-gray-500">
                    <i class="fas fa-user mr-1"></i>
                    ${assignedTo}
                  </span>
                  ${filesCount > 0 ? `
                    <span class="text-gray-500">
                      <i class="fas fa-paperclip mr-1"></i>
                      ${filesCount} ไฟล์
                    </span>
                  ` : ''}
                </div>
                
                ${tags.length > 0 ? `
                  <div class="flex flex-wrap gap-1 mb-3">
                    ${tags.map(tag => `
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        #${tag}
                      </span>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <button class="btn btn-primary btn-sm" onclick="dashboardApp.viewTask('${task.id}')">
                <i class="fas fa-eye mr-1"></i>
                ดูรายละเอียด
              </button>
              <button class="btn btn-outline btn-sm" onclick="dashboardApp.editTask('${task.id}')">
                <i class="fas fa-edit mr-1"></i>
                แก้ไข
              </button>
              ${canSubmit ? `
                <button class="btn btn-success btn-sm" onclick="dashboardApp.openSubmitTaskModal('${task.id}')">
                  <i class="fas fa-upload mr-1"></i>
                  ส่งงาน
                </button>
              ` : ''}
              ${isSubmitted ? `
                <span class="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  <i class="fas fa-check mr-1"></i>
                  ${task.status === 'completed' ? 'เสร็จแล้ว' : 'ส่งแล้ว'}
                </span>
              ` : ''}
            </div>
            <div class="text-xs text-gray-500">
              สร้างโดย ${this.getCreatorDisplayName(task)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // renderGroupCard(group) {
  //   return `
  //     <div class="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
  //       <div class="p-6">
  //         <div class="flex items-start justify-between mb-4">
  //           <div class="flex-1">
  //             <h3 class="text-lg font-semibold text-gray-900 mb-2">${group.name}</h3>
  //             <p class="text-gray-600 text-sm mb-3">${group.description || 'ไม่มีรายละเอียด'}</p>
  //           </div>
  //         </div>
  //         
  //         <div class="flex items-center justify-between">
  //           <button class="btn btn-primary btn-sm" onclick="dashboardApp.viewGroup('${group.id}')">
  //             <i class="fas fa-eye mr-1"></i>
  //             ดูรายละเอียด
  //           </button>
  //         </div>
  //       </div>
  //     </div>
  //   `;
  // }

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

  formatDateTime(dateString) {
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

  // viewGroup(groupId) {
  //   const group = this.groups.find(g => g.id === groupId);
  //   if (!group) return;

  //   // Show group details modal or navigate to group view
  //   this.showToast(`ดูรายละเอียดกลุ่ม: ${group.name}`, 'info');
  // }

  handleNavigation(e, link) {
    e.preventDefault();
    
    // Update current view
    const view = link.getAttribute('data-view') || 'dashboard';
    
    // Use switchView for consistent navigation
    this.switchView(view);
    
    // Update URL hash
    window.location.hash = `#${view}`;
  }

  switchView(viewName) {
    // Update navigation
    document.querySelectorAll('.sidebar-nav-item, .bottom-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update content
    document.querySelectorAll('.content-section').forEach(view => {
      view.classList.toggle('active', view.id === `${viewName}Section`);
    });

    this.currentView = viewName;
    this.loadViewData(viewName);
  }

  loadViewData(viewName) {
    switch (viewName) {
      case 'dashboard':
        // Load tasks first so statistics can be calculated properly
        this.loadTasks().then(() => {
          this.loadStats();
          this.updateUpcomingTasks();
          this.renderRecentTasks();
          this.loadLeaderboard(); // Add mini leaderboard for dashboard
        });
        break;
      case 'calendar':
        this.loadCalendarEvents();
        break;
      case 'tasks':
        this.loadTasks();
        break;
      case 'files':
        // Call the actual file loading function (defined later in the file)
        this.loadFilesData();
        break;
      case 'leaderboard':
        this.loadLeaderboard();
        break;
      case 'reports':
        this.loadReports();
        break;
    }
  }

  async loadCalendarEvents() {
    try {
      // Initialize calendar with current month and year
      this.initializeCalendar();
      
      // Load tasks for current month
      await this.renderCalendarGrid();
      
      // Load upcoming and overdue tasks
      await this.loadUpcomingTasks();
      await this.loadOverdueTasks();
      
      this.showToast('โหลดปฏิทินเรียบร้อย', 'success');
    } catch (error) {
      console.error('❌ Error loading calendar events:', error);
      this.showToast('เกิดข้อผิดพลาดในการโหลดปฏิทิน', 'error');
    }
  }

  async renderCalendarGrid() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;

    try {
      // Get current month's tasks
      const tasksResponse = await this.getTasksForMonth(this.currentCalendarYear, this.currentCalendarMonth + 1);
      const monthTasks = tasksResponse || [];
      
      // Generate calendar HTML
      const calendarHTML = this.generateCalendarHTML(this.currentCalendarYear, this.currentCalendarMonth, monthTasks);
      calendarGrid.innerHTML = calendarHTML;
      
      // Add event listeners for calendar interactions
      this.attachCalendarEventListeners();
      
    } catch (error) {
      console.error('❌ Error rendering calendar grid:', error);
      calendarGrid.innerHTML = `
        <div class="col-span-7 text-center py-8 text-gray-500">
          <i class="fas fa-exclamation-triangle text-2xl mb-2 text-red-400"></i>
          <p>เกิดข้อผิดพลาดในการแสดงปฏิทิน</p>
        </div>
      `;
    }
  }

  async getTasksForMonth(year, month) {
    try {
      if (!this.currentGroupId) {
        console.warn('⚠️ No current group ID for calendar');
        return [];
      }

      const response = await fetch(`/api/groups/${this.currentGroupId}/tasks`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load tasks');
      }
      
      const allTasks = result.data || [];
      
      // Filter tasks for the specific month
      return allTasks.filter(task => {
        if (!task.dueTime) return false;
        
        const dueDate = new Date(task.dueTime);
        return dueDate.getFullYear() === year && dueDate.getMonth() === (month - 1);
      });
      
    } catch (error) {
      console.error('❌ Error fetching tasks for month:', error);
      return [];
    }
  }

  generateCalendarHTML(year, month, tasks) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDate = isCurrentMonth ? today.getDate() : -1;
    
    let html = '';
    
    // Previous month padding days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      html += `
        <div class="calendar-day other-month border-r border-b border-gray-200 p-2 h-20 md:h-24 text-gray-400">
          <div class="text-sm">${day}</div>
        </div>
      `;
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTasks = tasks.filter(task => {
        const dueDate = new Date(task.dueTime);
        return dueDate.getDate() === day;
      });
      
      const pendingTasks = dayTasks.filter(task => task.status === 'pending' || task.status === 'in_progress');
      const overdueTasks = dayTasks.filter(task => {
        const dueDate = new Date(task.dueTime);
        const now = new Date();
        return (task.status === 'pending' || task.status === 'in_progress') && dueDate < now;
      });
      const completedTasks = dayTasks.filter(task => task.status === 'completed' || task.status === 'submitted');
      
      const isToday = day === todayDate;
      const isPast = new Date(year, month, day) < new Date().setHours(0, 0, 0, 0);
      
      let dayClass = 'calendar-day border-r border-b border-gray-200 p-2 h-20 md:h-24 cursor-pointer hover:bg-gray-50';
      if (isToday) dayClass += ' today bg-yellow-50 border-yellow-300';
      if (isPast) dayClass += ' past';
      
      html += `
        <div class="${dayClass}" data-year="${year}" data-month="${month + 1}" data-day="${day}">
          <div class="flex justify-between items-start mb-1">
            <span class="text-sm font-medium ${isToday ? 'text-yellow-800' : 'text-gray-900'}">${day}</span>
            ${isToday ? '<i class="fas fa-circle text-yellow-500 text-xs"></i>' : ''}
          </div>
          
          <div class="space-y-1">
            ${pendingTasks.length > 0 ? `
              <div class="flex items-center text-xs">
                <div class="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                <span class="text-blue-700">${pendingTasks.length}</span>
              </div>
            ` : ''}
            
            ${overdueTasks.length > 0 ? `
              <div class="flex items-center text-xs">
                <div class="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                <span class="text-red-700">${overdueTasks.length}</span>
              </div>
            ` : ''}
            
            ${completedTasks.length > 0 ? `
              <div class="flex items-center text-xs">
                <div class="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                <span class="text-green-700">${completedTasks.length}</span>
              </div>
            ` : ''}
          </div>
          
          ${dayTasks.length > 0 ? `
            <div class="mt-1">
              ${dayTasks.slice(0, 2).map(task => `
                <div class="text-xs truncate ${this.getTaskDisplayClass(task)}" title="${this.escapeHtml(task.title)}">
                  ${this.escapeHtml(task.title.substring(0, 15))}${task.title.length > 15 ? '...' : ''}
                </div>
              `).join('')}
              ${dayTasks.length > 2 ? `<div class="text-xs text-gray-500">+${dayTasks.length - 2} อีก</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }
    
    // Next month padding days
    const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
    const nextMonthDays = totalCells - (startingDayOfWeek + daysInMonth);
    
    for (let day = 1; day <= nextMonthDays; day++) {
      html += `
        <div class="calendar-day other-month border-r border-b border-gray-200 p-2 h-20 md:h-24 text-gray-400">
          <div class="text-sm">${day}</div>
        </div>
      `;
    }
    
    return html;
  }
  
  getTaskDisplayClass(task) {
    const isPast = new Date(task.dueTime) < new Date();
    const isOverdue = (task.status === 'pending' || task.status === 'in_progress') && isPast;
    
    if (isOverdue) return 'text-red-700';
    if (task.status === 'completed' || task.status === 'submitted') return 'text-green-700';
    return 'text-blue-700';
  }

  attachCalendarEventListeners() {
    // Calendar day click events
    document.querySelectorAll('.calendar-day[data-year]').forEach(dayElement => {
      dayElement.addEventListener('click', (e) => {
        const year = parseInt(e.currentTarget.dataset.year);
        const month = parseInt(e.currentTarget.dataset.month);
        const day = parseInt(e.currentTarget.dataset.day);
        this.showDayTasks(year, month, day);
      });
    });
  }

  async showDayTasks(year, month, day) {
    try {
      const tasks = await this.getTasksForMonth(year, month);
      const dayTasks = tasks.filter(task => {
        const dueDate = new Date(task.dueTime);
        return dueDate.getDate() === day;
      });
      
      const detailContainer = document.getElementById('calendarTaskDetail');
      const contentContainer = document.getElementById('calendarTaskDetailContent');
      
      if (!detailContainer || !contentContainer) return;
      
      if (dayTasks.length === 0) {
        this.showToast(`ไม่มีงานในวันที่ ${day}/${month}/${year}`, 'info');
        return;
      }
      
      const dateStr = `${day}/${month}/${year + 543}`;
      contentContainer.innerHTML = `
        <h5 class="font-semibold text-gray-800 mb-3">งานวันที่ ${dateStr} (รวม ${dayTasks.length} งาน)</h5>
        <div class="space-y-2 max-h-60 overflow-y-auto">
          ${dayTasks.map(task => this.renderCalendarTaskItem(task)).join('')}
        </div>
      `;
      
      detailContainer.classList.remove('hidden');
      detailContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
    } catch (error) {
      console.error('❌ Error showing day tasks:', error);
      this.showToast('เกิดข้อผิดพลาดในการแสดงงาน', 'error');
    }
  }
  
  renderCalendarTaskItem(task) {
    const statusInfo = this.getStatusInfo(task.status);
    const priorityInfo = this.getPriorityInfo(task.priority);
    const dueTime = new Date(task.dueTime).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const isOverdue = new Date(task.dueTime) < new Date() && (task.status === 'pending' || task.status === 'in_progress');
    
    return `
      <div class="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'}" 
           onclick="window.dashboardApp.openTaskDetail('${task.id}')">
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <h6 class="font-medium text-gray-900 truncate">${this.escapeHtml(task.title)}</h6>
            <p class="text-sm text-gray-600 mt-1">เวลา: ${dueTime}</p>
            <div class="flex items-center gap-2 mt-2">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.class}">
                <i class="${statusInfo.icon} mr-1"></i>
                ${statusInfo.text}
              </span>
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.class}">
                <i class="${priorityInfo.icon} mr-1"></i>
                ${priorityInfo.text}
              </span>
            </div>
          </div>
          ${isOverdue ? '<i class="fas fa-exclamation-triangle text-red-500 text-lg"></i>' : ''}
        </div>
      </div>
    `;
  }

  async loadUpcomingTasks() {
    try {
      if (!this.currentGroupId) {
        console.warn('⚠️ No current group ID for upcoming tasks');
        return;
      }
      
      const response = await fetch(`/api/groups/${this.currentGroupId}/tasks`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load tasks');
      }
      
      const allTasks = result.data || [];
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      
      // Filter upcoming tasks (due within 7 days, not completed)
      const upcomingTasks = allTasks.filter(task => {
        if (!task.dueTime) return false;
        if (task.status === 'completed' || task.status === 'submitted') return false;
        
        const dueDate = new Date(task.dueTime);
        return dueDate >= now && dueDate <= sevenDaysLater;
      });
      
      // Sort by due date
      upcomingTasks.sort((a, b) => new Date(a.dueTime) - new Date(b.dueTime));
      
      this.renderUpcomingTasks(upcomingTasks);
      
    } catch (error) {
      console.error('❌ Error loading upcoming tasks:', error);
      const container = document.getElementById('upcomingTasksList');
      if (container) {
        container.innerHTML = `
          <div class="text-center py-4 text-red-500">
            <i class="fas fa-exclamation-triangle mb-2"></i>
            <p class="text-sm">เกิดข้อผิดพลาดในการโหลดงาน</p>
          </div>
        `;
      }
    }
  }
  
  renderUpcomingTasks(tasks) {
    const container = document.getElementById('upcomingTasksList');
    if (!container) return;
    
    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-calendar-check text-3xl mb-3 text-green-400"></i>
          <p class="font-medium">ไม่มีงานที่จะมาถึงใน 7 วันข้างหน้า</p>
          <p class="text-sm text-gray-400 mt-1">งานทั้งหมดอยู่ในสถานะดี</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="space-y-3 max-h-80 overflow-y-auto">
        ${tasks.map(task => this.renderUpcomingTaskItem(task)).join('')}
      </div>
    `;
  }
  
  renderUpcomingTaskItem(task) {
    const statusInfo = this.getStatusInfo(task.status);
    const priorityInfo = this.getPriorityInfo(task.priority);
    const dueInfo = this.getDueInfo(task.dueTime);
    const assignees = this.getTaskAssignees(task);
    
    return `
      <div class="border border-blue-200 rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-colors" 
           onclick="window.dashboardApp.openTaskDetail('${task.id}')">
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <h6 class="font-medium text-gray-900 truncate">${this.escapeHtml(task.title)}</h6>
            <p class="text-sm text-gray-600 mt-1 line-clamp-2">${this.escapeHtml(task.description || 'ไม่มีรายละเอียด')}</p>
            
            <div class="flex items-center gap-2 mt-2">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.class}">
                <i class="${statusInfo.icon} mr-1"></i>
                ${statusInfo.text}
              </span>
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.class}">
                <i class="${priorityInfo.icon} mr-1"></i>
                ${priorityInfo.text}
              </span>
            </div>
            
            <div class="flex items-center justify-between mt-2 text-sm">
              <span class="text-gray-600">
                <i class="fas fa-user mr-1"></i>
                ${assignees}
              </span>
              <span class="${dueInfo.class} font-medium">
                <i class="fas fa-clock mr-1"></i>
                ${dueInfo.remaining}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  async loadOverdueTasks() {
    try {
      if (!this.currentGroupId) {
        console.warn('⚠️ No current group ID for overdue tasks');
        return;
      }
      
      const response = await fetch(`/api/groups/${this.currentGroupId}/tasks`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load tasks');
      }
      
      const allTasks = result.data || [];
      const now = new Date();
      
      // Filter overdue tasks (past due date, not completed/submitted)
      const overdueTasks = allTasks.filter(task => {
        if (!task.dueTime) return false;
        if (task.status === 'completed' || task.status === 'submitted') return false;
        
        const dueDate = new Date(task.dueTime);
        return dueDate < now;
      });
      
      // Sort by due date (oldest first)
      overdueTasks.sort((a, b) => new Date(a.dueTime) - new Date(b.dueTime));
      
      this.renderOverdueTasks(overdueTasks);
      
    } catch (error) {
      console.error('❌ Error loading overdue tasks:', error);
      const container = document.getElementById('overdueTasksList');
      if (container) {
        container.innerHTML = `
          <div class="text-center py-4 text-red-500">
            <i class="fas fa-exclamation-triangle mb-2"></i>
            <p class="text-sm">เกิดข้อผิดพลาดในการโหลดงาน</p>
          </div>
        `;
      }
    }
  }
  
  renderOverdueTasks(tasks) {
    const container = document.getElementById('overdueTasksList');
    if (!container) return;
    
    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-thumbs-up text-3xl mb-3 text-green-400"></i>
          <p class="font-medium">ไม่มีงานเกินกำหนด</p>
          <p class="text-sm text-gray-400 mt-1">งานทั้งหมดอยู่ในเกณฑ์ดี</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="space-y-3 max-h-80 overflow-y-auto">
        ${tasks.map(task => this.renderOverdueTaskItem(task)).join('')}
      </div>
    `;
  }
  
  renderOverdueTaskItem(task) {
    const statusInfo = this.getStatusInfo(task.status);
    const priorityInfo = this.getPriorityInfo(task.priority);
    const dueInfo = this.getDueInfo(task.dueTime);
    const assignees = this.getTaskAssignees(task);
    
    // Calculate overdue days
    const now = new Date();
    const dueDate = new Date(task.dueTime);
    const overdueDays = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
    
    return `
      <div class="border border-red-200 rounded-lg p-3 hover:bg-red-50 cursor-pointer transition-colors bg-red-25" 
           onclick="window.dashboardApp.openTaskDetail('${task.id}')">
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h6 class="font-medium text-gray-900 truncate flex-1">${this.escapeHtml(task.title)}</h6>
              <span class="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                เกิน ${overdueDays} วัน
              </span>
            </div>
            <p class="text-sm text-gray-600 mt-1 line-clamp-2">${this.escapeHtml(task.description || 'ไม่มีรายละเอียด')}</p>
            
            <div class="flex items-center gap-2 mt-2">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.class}">
                <i class="${statusInfo.icon} mr-1"></i>
                ${statusInfo.text}
              </span>
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.class}">
                <i class="${priorityInfo.icon} mr-1"></i>
                ${priorityInfo.text}
              </span>
            </div>
            
            <div class="flex items-center justify-between mt-2 text-sm">
              <span class="text-gray-600">
                <i class="fas fa-user mr-1"></i>
                ${assignees}
              </span>
              <span class="text-red-600 font-medium">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                ${dueInfo.date}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  initializeCalendar() {
    // Set current month and year in the header with Thailand timezone
    const currentMonth = document.getElementById('currentMonth');
    if (currentMonth) {
      try {
        // Always use Thailand timezone for calendar
        const now = new Date();
        // Adjust to Thailand timezone (UTC+7)
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const thaiTime = new Date(utc + (7 * 3600000));
        
        const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 
                       'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const currentMonthName = months[thaiTime.getMonth()];
        const currentYear = thaiTime.getFullYear() + 543; // Convert to Thai Buddhist year
        
        currentMonth.textContent = `${currentMonthName} ${currentYear}`;
        
        // Store current month and year for navigation (in Gregorian calendar for calculation)
        this.currentCalendarMonth = thaiTime.getMonth();
        this.currentCalendarYear = thaiTime.getFullYear();
        
        console.log(`✅ Calendar initialized to Thailand timezone: ${currentMonthName} ${currentYear}`);
      } catch (error) {
        console.error('❌ Error initializing calendar with Thailand timezone:', error);
        // Fallback to basic initialization
        const now = new Date();
        const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 
                       'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const currentMonthName = months[now.getMonth()];
        const currentYear = now.getFullYear() + 543;
        
        currentMonth.textContent = `${currentMonthName} ${currentYear}`;
        this.currentCalendarMonth = now.getMonth();
        this.currentCalendarYear = now.getFullYear();
      }
    }
  }

  async loadReports() {
    // Mock reports data
    this.showToast('โหลดรายงานเรียบร้อย', 'success');
  }

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/dashboard';
    }
  }

  openAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    const overlay = document.getElementById('modalOverlay');
    if (modal && overlay) {
      // โหลดรายชื่อสมาชิกก่อนเปิด modal
      this.loadGroupMembers().then(() => {
        // ย้าย modal ไปยัง overlay
        overlay.innerHTML = '';
        overlay.appendChild(modal);
        modal.classList.remove('hidden');
        overlay.classList.remove('hidden');
        
        // เรียกใช้ setupFileUpload เมื่อเปิด modal
        this.setupFileUpload();
      });
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modalOverlay');
    if (modal) {
      modal.classList.add('hidden');
      // ย้าย modal กลับไปยัง body
      document.body.appendChild(modal);
    }
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  closeAllModals() {
    const overlay = document.getElementById('modalOverlay');
    
    // ปิด modal ทั้งหมด
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
      // ย้าย modal กลับไปยัง body
      document.body.appendChild(modal);
    });
    
    // ปิด overlay
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
  }

  showLoading() {
    this.isLoading = true;
    const loadingScreen = document.getElementById('loading');
    if (loadingScreen) {
      loadingScreen.style.display = 'flex';
    }
  }

  hideLoading() {
    this.isLoading = false;
    const loadingScreen = document.getElementById('loading');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
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

  // Main action functions
  async refreshData() {
    this.showToast('กำลังรีเฟรชข้อมูล...', 'info');
    try {
      await this.loadTasks();
      await this.loadStats();
      await this.loadLeaderboard();
      await this.loadFilesData(); // Use the correct function name
      this.renderRecentTasks();
      this.updateUpcomingTasks();
      this.showToast('รีเฟรชข้อมูลเรียบร้อย', 'success');
    } catch (error) {
      console.error('Error refreshing data:', error);
      this.showToast('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล', 'error');
    }
  }

  openSubmitTasks() {
    this.showToast('เปิดหน้าส่งงาน', 'info');
    // เปลี่ยนไปหน้าส่งงาน
    this.switchView('tasks');
  }

  exportData() {
    this.showToast('กำลังส่งออกข้อมูล...', 'info');
    // สร้างข้อมูลตัวอย่างสำหรับ export
    const data = {
      tasks: this.tasks,
      groups: this.groups,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showToast('ส่งออกข้อมูลเรียบร้อย', 'success');
  }

  changeStatsPeriod(period) {
    this.showToast(`เปลี่ยนเป็น: ${period}`, 'info');
    this.loadStats(period);
  }

  changeLeaderboardPeriod(period) {
    this.showToast(`เปลี่ยนเป็น: ${period}`, 'info');
    this.loadLeaderboard(period);
  }

  prevMonth() {
    this.showToast('เดือนก่อน', 'info');
    
    try {
      // Initialize if not set using Thailand timezone
      if (this.currentCalendarMonth === undefined || this.currentCalendarYear === undefined) {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const thaiTime = new Date(utc + (7 * 3600000));
        this.currentCalendarMonth = thaiTime.getMonth();
        this.currentCalendarYear = thaiTime.getFullYear();
      }
      
      // Navigate to previous month
      this.currentCalendarMonth--;
      if (this.currentCalendarMonth < 0) {
        this.currentCalendarMonth = 11;
        this.currentCalendarYear--;
      }
      
      this.updateCalendarHeader();
      this.renderCalendarGrid();
      
    } catch (error) {
      console.error('❌ Error navigating to previous month:', error);
      this.showToast('เกิดข้อผิดพลาดในการเปลี่ยนเดือน', 'error');
    }
  }

  nextMonth() {
    this.showToast('เดือนถัดไป', 'info');
    
    try {
      // Initialize if not set using Thailand timezone
      if (this.currentCalendarMonth === undefined || this.currentCalendarYear === undefined) {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const thaiTime = new Date(utc + (7 * 3600000));
        this.currentCalendarMonth = thaiTime.getMonth();
        this.currentCalendarYear = thaiTime.getFullYear();
      }
      
      // Navigate to next month
      this.currentCalendarMonth++;
      if (this.currentCalendarMonth > 11) {
        this.currentCalendarMonth = 0;
        this.currentCalendarYear++;
      }
      
      this.updateCalendarHeader();
      this.renderCalendarGrid();
      
    } catch (error) {
      console.error('❌ Error navigating to next month:', error);
      this.showToast('เกิดข้อผิดพลาดในการเปลี่ยนเดือน', 'error');
    }
  }

  updateCalendarHeader() {
    const currentMonth = document.getElementById('currentMonth');
    const currentMonthEng = document.getElementById('currentMonthEng');
    
    if (currentMonth && this.currentCalendarMonth !== undefined && this.currentCalendarYear !== undefined) {
      try {
        const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 
                       'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const monthsEng = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        
        // Validate month index
        if (this.currentCalendarMonth < 0 || this.currentCalendarMonth > 11) {
          console.warn('⚠️ Invalid month index:', this.currentCalendarMonth);
          this.currentCalendarMonth = Math.max(0, Math.min(11, this.currentCalendarMonth));
        }
        
        // Validate year
        if (this.currentCalendarYear < 1900 || this.currentCalendarYear > 3000) {
          console.warn('⚠️ Invalid year:', this.currentCalendarYear);
          this.currentCalendarYear = new Date().getFullYear();
        }
        
        const monthName = months[this.currentCalendarMonth];
        const monthNameEng = monthsEng[this.currentCalendarMonth];
        const thaiYear = this.currentCalendarYear + 543; // Convert to Thai Buddhist year
        
        currentMonth.textContent = `${monthName} ${thaiYear}`;
        
        if (currentMonthEng) {
          currentMonthEng.textContent = `${monthNameEng} ${this.currentCalendarYear}`;
        }
        
        console.log(`📅 Calendar header updated: ${monthName} ${thaiYear} (Thailand timezone)`);
      } catch (error) {
        console.error('❌ Error updating calendar header:', error);
        // Fallback to safe display
        currentMonth.textContent = 'ปฏิทิน - เกิดข้อผิดพลาด';
        if (currentMonthEng) {
          currentMonthEng.textContent = 'Calendar - Error';
        }
      }
    }
  }

  async handleAddTask(e) {
    e.preventDefault();
    this.showToast('กำลังเพิ่มงาน...', 'info');
    
    const form = e.target;
    const formData = new FormData(form);
    
    // ตรวจสอบข้อมูลที่จำเป็น
    const requiredFields = ['taskTitle', 'taskDescription', 'dueDate', 'priority'];
    for (const field of requiredFields) {
      if (!formData.get(field)) {
        this.showToast(`กรุณากรอกข้อมูลในฟิลด์ที่จำเป็น: ${this.getFieldLabel(field)}`, 'error');
        return false;
      }
    }
    
    // ตรวจสอบผู้รับผิดชอบแยกต่างหาก
    if (!this.validateAssignedTo()) {
      return false;
    }
    
    try {
      if (!this.currentGroupId) {
        throw new Error('ไม่พบข้อมูลกลุ่ม กรุณาเลือกกลุ่มก่อน');
      }
      
      // สร้าง dueTime จาก dueDate และ dueTime
      const dueDateTime = new Date(`${formData.get('dueDate')}T${formData.get('dueTime') || '23:59'}`);
      
      // แปลง tags เป็น array
      const tags = this.parseTags(formData.get('taskTags'));

      // กำหนดผู้สร้างงาน - ใช้ userId จาก URL parameter หรือ fallback เป็นผู้ใช้ปัจจุบัน
      const urlParams = new URLSearchParams(window.location.search);
      const userIdFromUrl = urlParams.get('userId'); // LINE User ID จาก URL
      
      const selectedAssignees = this.getSelectedAssignees();
      
      // ลำดับความสำคัญ: URL userId > current user > ผู้รับผิดชอบคนแรก
      const createdByLineUserId = userIdFromUrl 
        ? userIdFromUrl
        : (this.currentUser && /^U[0-9A-Za-z]+$/.test(this.currentUser.lineUserId || ''))
          ? this.currentUser.lineUserId
          : (selectedAssignees.find(id => /^U[0-9A-Za-z]+$/.test(id)) || undefined);
      
      // ตรวจสอบว่ามี createdBy
      if (!createdByLineUserId) {
        throw new Error('ไม่สามารถระบุผู้สร้างงานได้ กรุณาเข้าใช้จากลิงก์ LINE ที่ถูกต้อง');
      }
      
      const requestData = {
        title: formData.get('taskTitle'),
        description: formData.get('taskDescription'),
        dueTime: dueDateTime.toISOString(),
        priority: this.mapPriority(formData.get('priority')),
        tags: tags,
        assigneeIds: selectedAssignees.filter(id => /^U[0-9A-Za-z]+$/.test(id)), // กรองเฉพาะ LINE User ID
        createdBy: createdByLineUserId, // ใช้ LINE userId ของผู้ใช้ หรือ fallback เป็นคนแรกที่รับผิดชอบ
        requireAttachment: false,
        _tempId: `temp_${Date.now()}` // ป้องกันการสร้างซ้ำ
      };
      
      const response = await fetch(`/api/groups/${this.currentGroupId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        // เพิ่มงานใหม่ลงในรายการ
        this.tasks.unshift(result.data);
        this.showToast('เพิ่มงานเรียบร้อย', 'success');
        this.closeModal('addTaskModal');
        this.renderTasks();
        this.renderRecentTasks();
        this.updateUpcomingTasks();
        
        // รีเซ็ตฟอร์ม
        this.resetAddTaskForm();
        this.clearAllAssigned(); // ล้างการเลือกผู้รับผิดชอบ
        
        // Log ข้อมูลงานที่สร้าง
        console.log('งานใหม่ที่สร้าง:', result.data);
      } else {
        throw new Error(result.error || 'Failed to create task');
      }
      
    } catch (error) {
      console.error('Error adding task:', error);
      this.showToast(`เกิดข้อผิดพลาดในการเพิ่มงาน: ${error.message}`, 'error');
    }
  }

  async handleEditTask(e) {
    e.preventDefault();
    this.showToast('กำลังแก้ไขงาน...', 'info');
    
    const form = e.target;
    const formData = new FormData(form);
    const taskId = formData.get('taskId');
    
    try {
      // ดึงรายการผู้รับผิดชอบที่เลือก
      const selectedAssignees = Array.from(document.querySelectorAll('input[name="editAssignedTo"]:checked'))
        .map(checkbox => checkbox.value);
        
      if (selectedAssignees.length === 0) {
        this.showToast('กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน', 'error');
        return;
      }
      
      // สร้าง dueTime จาก dueDate
      const dueDateTime = new Date(`${formData.get('dueDate')}T23:59`);
      
      const requestData = {
        title: formData.get('taskTitle'),
        description: formData.get('taskDescription'),
        dueTime: dueDateTime.toISOString(),
        priority: formData.get('priority'),
        assigneeIds: selectedAssignees
      };
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        // อัปเดตงานในรายการ
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...result.data };
        }
        
        this.showToast('แก้ไขงานเรียบร้อย', 'success');
        this.closeModal('editTaskModal');
        this.renderTasks();
        this.renderRecentTasks();
        this.updateUpcomingTasks();
      } else {
        throw new Error(result.error || 'Failed to update task');
      }
      
    } catch (error) {
      console.error('Error editing task:', error);
      this.showToast(`เกิดข้อผิดพลาดในการแก้ไขงาน: ${error.message}`, 'error');
    }
  }

  openSubmitTaskModal(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      this.showToast('ไม่พบงานที่ระบุ', 'error');
      return;
    }

    // Store task data for validation
    this.currentTaskToSubmit = task;
    this.currentTaskId = taskId;

    // Populate modal with task info
    document.getElementById('submitTaskId').value = taskId;
    document.getElementById('submitTaskTitle').textContent = task.title;
    
    const dueInfo = this.getDueInfo(task.dueTime);
    document.getElementById('submitTaskDue').textContent = `กำหนดส่ง: ${dueInfo.date}`;

    // Check if file attachment is required and show warning
    const fileUploadArea = document.getElementById('submitFileUploadArea');
    const fileLabel = fileUploadArea.parentElement.querySelector('label');
    
    if (task.requireAttachment) {
      // Update label to show required status
      fileLabel.innerHTML = 'ไฟล์แนบ <span class="text-red-500">*บังคับ</span>';
      
      // Add warning message
      let warningEl = document.getElementById('fileRequiredWarning');
      if (!warningEl) {
        warningEl = document.createElement('div');
        warningEl.id = 'fileRequiredWarning';
        warningEl.className = 'bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2';
        fileUploadArea.parentElement.insertBefore(warningEl, fileUploadArea);
      }
      warningEl.innerHTML = `
        <div class="flex items-center">
          <i class="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
          <span class="text-sm text-yellow-700 font-medium">งานนี้ต้องแนบไฟล์เพื่อส่งงาน กรุณาเลือกไฟล์ก่อนกดส่ง</span>
        </div>
      `;
      
      // Style the upload area to indicate required
      fileUploadArea.classList.add('border-yellow-300', 'bg-yellow-50');
      fileUploadArea.classList.remove('border-gray-300');
    } else {
      // Reset to optional status
      fileLabel.innerHTML = 'ไฟล์แนบ (ไม่บังคับ)';
      
      // Remove warning if exists
      const warningEl = document.getElementById('fileRequiredWarning');
      if (warningEl) {
        warningEl.remove();
      }
      
      // Reset upload area style
      fileUploadArea.classList.remove('border-yellow-300', 'bg-yellow-50');
      fileUploadArea.classList.add('border-gray-300');
    }

    // Reset form
    document.getElementById('submitComment').value = '';
    document.getElementById('submitTaskFiles').value = '';
    document.getElementById('submitFileList').innerHTML = '';
    document.getElementById('submitFileList').classList.add('hidden');
    
    // Reset submitFiles array
    this.submitFiles = [];

    this.openModal('submitTaskModal');
    
    // Setup file upload functionality after modal is opened
    setTimeout(() => {
      this.setupSubmitFileUpload();
    }, 100);
  }

  // Task Detail Modal Functions
  async openTaskDetail(taskId) {
    try {
      const task = this.tasks.find(t => t.id === taskId);
      if (!task) {
        this.showToast('ไม่พบงานที่ระบุ', 'error');
        return;
      }

      // โหลดข้อมูลเพิ่มเติมจาก API
      let detailedTask = task;
      console.log('Original task data:', task);
      
      try {
        // Try the group-specific endpoint first
        let response = await fetch(`/api/groups/${this.currentGroupId}/tasks/${taskId}`);
        if (!response.ok) {
          // Fallback to general task endpoint
          response = await fetch(`/api/task/${taskId}`);
        }
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            detailedTask = result.data;
            console.log('Detailed task data from API:', detailedTask);
          }
        }
      } catch (error) {
        console.warn('Could not load detailed task info, using cached data:', error);
      }

      this.populateTaskDetailModal(detailedTask);
      this.openModal('taskDetailModal');
    } catch (error) {
      console.error('Error opening task detail:', error);
      this.showToast('เกิดข้อผิดพลาดในการโหลดรายละเอียดงาน', 'error');
    }
  }

  populateTaskDetailModal(task) {
    // Header Information
    document.getElementById('taskDetailTitle').textContent = `รายละเอียดงาน: ${task.title}`;
    document.getElementById('taskDetailName').textContent = task.title;
    document.getElementById('taskDetailId').textContent = `#${task.id}`;
    
    // Dates
    const createdDate = task.createdAt ? new Date(task.createdAt).toLocaleDateString('th-TH') : '-';
    const updatedDate = task.updatedAt ? new Date(task.updatedAt).toLocaleDateString('th-TH') : '-';
    document.getElementById('taskDetailCreated').textContent = `สร้างเมื่อ: ${createdDate}`;
    document.getElementById('taskDetailUpdated').textContent = `แก้ไขล่าสุด: ${updatedDate}`;

    // Status and Priority
    const statusInfo = this.getStatusInfo(task.status);
    const priorityInfo = this.getPriorityInfo(task.priority);
    
    const statusEl = document.getElementById('taskDetailStatus');
    statusEl.textContent = statusInfo.text;
    statusEl.className = `px-3 py-1 rounded-full text-sm font-medium ${statusInfo.class}`;
    
    const priorityEl = document.getElementById('taskDetailPriority');
    priorityEl.textContent = priorityInfo.text;
    priorityEl.className = `px-3 py-1 rounded-full text-sm font-medium ${priorityInfo.class}`;

    // Category
    const categoryEl = document.getElementById('taskDetailCategory');
    categoryEl.textContent = task.category || 'ทั่วไป';

    // Description
    const descEl = document.getElementById('taskDetailDescription');
    descEl.textContent = task.description || 'ไม่มีรายละเอียด';

    // Assignees
    const assigneesEl = document.getElementById('taskDetailAssignees');
    if (task.assignedUsers && task.assignedUsers.length > 0) {
      assigneesEl.innerHTML = task.assignedUsers.map(user => `
        <div class="flex items-center p-2 bg-gray-100 rounded-lg">
          <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
            ${(user.displayName || user.realName || user.name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div class="font-medium">${user.displayName || user.realName || user.name || 'ไม่ระบุชื่อ'}</div>
            <div class="text-sm text-gray-600">${user.email || ''}</div>
          </div>
        </div>
      `).join('');
    } else {
      assigneesEl.innerHTML = '<div class="text-gray-500">ไม่มีผู้รับผิดชอบ</div>';
    }

    // Reviewer
    const reviewerEl = document.getElementById('taskDetailReviewer');
    if (task.reviewerUserId || task.reviewerUser) {
      // ถ้ามีข้อมูล reviewer user object จาก API
      if (task.reviewerUser) {
        reviewerEl.innerHTML = `
          <div class="flex items-center">
            <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
              ${(task.reviewerUser.displayName || task.reviewerUser.realName || task.reviewerUser.name || 'R')[0].toUpperCase()}
            </div>
            <div>
              <div class="font-medium">${task.reviewerUser.displayName || task.reviewerUser.realName || task.reviewerUser.name || 'ไม่ระบุชื่อ'}</div>
              <div class="text-sm text-gray-600">${task.reviewerUser.email || ''}</div>
            </div>
          </div>
        `;
      } else {
        // ถ้ามีแค่ ID ให้หาจาก group members
        const reviewer = this.groupMembers?.find(m => 
          m.lineUserId === task.reviewerUserId || 
          m.id === task.reviewerUserId ||
          m.userId === task.reviewerUserId
        );
        
        if (reviewer) {
          reviewerEl.innerHTML = `
            <div class="flex items-center">
              <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
                ${(reviewer.displayName || reviewer.realName || reviewer.name || 'R')[0].toUpperCase()}
              </div>
              <div>
                <div class="font-medium">${reviewer.displayName || reviewer.realName || reviewer.name || 'ไม่ระบุชื่อ'}</div>
                <div class="text-sm text-gray-600">${reviewer.email || ''}</div>
              </div>
            </div>
          `;
        } else {
          reviewerEl.innerHTML = `<div class="text-gray-500">ผู้ตรวจ: ${task.reviewerUserId}</div>`;
        }
      }
    } else {
      reviewerEl.innerHTML = '<div class="text-gray-500">ไม่ระบุผู้ตรวจ</div>';
    }

    // Tags
    const tagsEl = document.getElementById('taskDetailTags');
    if (task.tags && task.tags.length > 0) {
      tagsEl.innerHTML = task.tags.map(tag => 
        `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${this.escapeHtml(tag)}</span>`
      ).join('');
    } else {
      tagsEl.innerHTML = '<span class="text-gray-500">ไม่มีแท็ก</span>';
    }

    // Due Date
    const dueInfo = this.getDueInfo(task.dueTime);
    document.getElementById('taskDetailDueDate').textContent = dueInfo.date;
    document.getElementById('taskDetailDueTime').textContent = dueInfo.remaining;
    document.getElementById('taskDetailTimeRemaining').className = `text-sm mt-1 ${dueInfo.class}`;
    document.getElementById('taskDetailTimeRemaining').textContent = dueInfo.remaining;

    // Progress
    const progress = task.progress || 0;
    document.getElementById('taskDetailProgress').textContent = `${progress}%`;
    document.getElementById('taskDetailProgressBar').style.width = `${progress}%`;

    // Submission info - check workflow for submissions
    let submissionCount = 0;
    let lastSubmissionDate = 'ไม่มี';
    
    if (task.workflow && task.workflow.submissions && Array.isArray(task.workflow.submissions)) {
      submissionCount = task.workflow.submissions.length;
      if (submissionCount > 0) {
        const lastSubmission = task.workflow.submissions[task.workflow.submissions.length - 1];
        if (lastSubmission.submittedAt) {
          lastSubmissionDate = new Date(lastSubmission.submittedAt).toLocaleDateString('th-TH');
        }
      }
    }
    
    document.getElementById('taskDetailSubmissions').textContent = submissionCount;
    document.getElementById('taskDetailLastSubmission').textContent = lastSubmissionDate;

    // Files - check both API and task.attachedFiles
    this.loadTaskFilesComprehensive(task);

    // Notes - show both task notes and submission comments
    const notesEl = document.getElementById('taskDetailNotes');
    let notesHTML = '';
    
    // Add task notes if they exist
    if (task.notes) {
      notesHTML += `
        <div class="mb-4">
          <h5 class="font-medium text-gray-900 mb-2">หมายเหตุงาน:</h5>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p class="text-gray-700">${this.escapeHtml(task.notes)}</p>
          </div>
        </div>
      `;
    }
    
    // Add submission comments if they exist
    if (task.workflow && task.workflow.submissions && Array.isArray(task.workflow.submissions)) {
      const submissionsWithComments = task.workflow.submissions.filter(submission => submission.comment && submission.comment.trim());
      
      if (submissionsWithComments.length > 0) {
        notesHTML += `
          <div class="mb-4">
            <h5 class="font-medium text-gray-900 mb-2">หมายเหตุจากผู้ส่งงาน:</h5>
            <div class="space-y-3">
        `;
        
        submissionsWithComments.forEach((submission, index) => {
          const submissionDate = submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : 'ไม่ระบุวันที่';
          
          const lateIndicator = submission.lateSubmission ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">ส่งช้า</span>' : '';
          
          notesHTML += `
            <div class="bg-green-50 border border-green-200 rounded-lg p-3">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-medium text-green-800">การส่งครั้งที่ ${submissionsWithComments.length - index}</div>
                <div class="text-xs text-green-600">${submissionDate}${lateIndicator}</div>
              </div>
              <p class="text-gray-700">${this.escapeHtml(submission.comment)}</p>
            </div>
          `;
        });
        
        notesHTML += `
            </div>
          </div>
        `;
      }
    }
    
    // If no notes or comments exist, show default message
    if (!notesHTML) {
      notesHTML = '<div class="text-gray-500 text-center py-4">ไม่มีหมายเหตุหรือคำอธิบายเพิ่มเติม</div>';
    }
    
    notesEl.innerHTML = notesHTML;

    // Action buttons
    this.updateTaskDetailButtons(task);
  }

  async loadTaskFilesComprehensive(task) {
    const filesEl = document.getElementById('taskDetailFiles');
    let allFiles = [];
    
    try {
      // Try to load files from API first
      const response = await fetch(`/api/groups/${this.currentGroupId}/tasks/${task.id}/files`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          allFiles = result.data;
          console.log('Loaded files from API:', allFiles.length);
        }
      }
    } catch (error) {
      console.warn('Could not load files from API:', error);
    }
    
    // Also check task.attachedFiles property
    if (task.attachedFiles && Array.isArray(task.attachedFiles) && task.attachedFiles.length > 0) {
      console.log('Found attached files in task:', task.attachedFiles.length);
      // Merge with API files, avoiding duplicates by ID
      const existingIds = allFiles.map(f => f.id);
      const additionalFiles = task.attachedFiles.filter(f => !existingIds.includes(f.id));
      allFiles = [...allFiles, ...additionalFiles];
    }
    
    // Check workflow submissions for files
    if (task.workflow && task.workflow.submissions && Array.isArray(task.workflow.submissions)) {
      task.workflow.submissions.forEach(submission => {
        if (submission.fileIds && Array.isArray(submission.fileIds)) {
          console.log('Found submission files:', submission.fileIds.length);
          // Note: We have file IDs but not file objects, so we'll note this in the display
        }
      });
    }
    
    // Render files
    if (allFiles.length > 0) {
      filesEl.innerHTML = allFiles.map(file => `
        <div class="flex items-center justify-between p-3 bg-white border rounded-lg">
          <div class="flex items-center">
            <i class="fas fa-file text-gray-400 mr-3"></i>
            <div>
              <div class="font-medium">${this.escapeHtml(file.originalName || file.filename || file.name || 'Unnamed file')}</div>
              <div class="text-sm text-gray-500">${this.formatFileSize(file.size || 0)} • ${this.formatDate(file.uploadedAt || file.createdAt)}</div>
            </div>
          </div>
          <button class="btn btn-sm btn-outline" onclick="window.dashboardApp.downloadFile('${file.id}')">
            <i class="fas fa-download"></i>
          </button>
        </div>
      `).join('');
    } else {
      filesEl.innerHTML = '<div class="text-gray-500 text-center py-4">ไม่มีไฟล์แนบ</div>';
    }
  }

  updateTaskDetailButtons(task) {
    const submitBtn = document.getElementById('taskDetailSubmitBtn');
    const completeBtn = document.getElementById('taskDetailCompleteBtn');
    const reopenBtn = document.getElementById('taskDetailReopenBtn');
    const editBtn = document.getElementById('editTaskBtn');
    const deleteBtn = document.getElementById('deleteTaskBtn');

    // Hide all buttons first
    [submitBtn, completeBtn, reopenBtn, editBtn, deleteBtn].forEach(btn => {
      if (btn) btn.style.display = 'none';
    });

    // Show appropriate buttons based on status and permissions
    if (this.canSubmitTask(task) && submitBtn) {
      submitBtn.style.display = 'inline-flex';
      submitBtn.onclick = () => {
        this.closeModal('taskDetailModal');
        this.openSubmitTaskModal(task.id);
      };
    }

    if (task.status === 'submitted' && completeBtn) {
      completeBtn.style.display = 'inline-flex';
      completeBtn.onclick = () => this.completeTask(task.id);
    }

    if (task.status === 'completed' && reopenBtn) {
      reopenBtn.style.display = 'inline-flex';
      reopenBtn.onclick = () => this.reopenTask(task.id);
    }

    // Show edit and delete buttons only if user has permission
    if (this.canEditTask(task) && editBtn) {
      editBtn.style.display = 'inline-flex';
    }

    if (this.canDeleteTask(task) && deleteBtn) {
      deleteBtn.style.display = 'inline-flex';
    }
  }

  openSubmitModal(task) {
    const modal = document.getElementById('submitTaskModal');
    const overlay = document.getElementById('modalOverlay');
    
    if (!modal) {
      // สร้าง modal ส่งงานถ้าไม่มี
      this.createSubmitModal();
    }
    
    // เติมข้อมูลงาน
    document.getElementById('submitTaskTitle').textContent = task.title;
    document.getElementById('submitTaskDescription').textContent = task.description || 'ไม่มีรายละเอียด';
    document.getElementById('submitTaskDueDate').textContent = this.formatDate(task.dueTime);
    
    // แสดง modal ใน overlay
    if (modal && overlay) {
      overlay.innerHTML = '';
      overlay.appendChild(modal);
      modal.classList.remove('hidden');
      overlay.classList.remove('hidden');
    }
  }

  createSubmitModal() {
    const modalHTML = `
      <div id="submitTaskModal" class="modal hidden">
        <div class="modal-content max-w-2xl">
          <div class="modal-header">
            <h3>ส่งงาน</h3>
            <button class="modal-close" id="closeSubmitTaskModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="mb-6">
              <h4 class="font-semibold text-gray-900 mb-2">รายละเอียดงาน</h4>
              <div class="bg-gray-50 p-4 rounded-lg">
                <h5 id="submitTaskTitle" class="font-medium text-gray-900"></h5>
                <p id="submitTaskDescription" class="text-gray-600 text-sm mt-1"></p>
                <p class="text-gray-500 text-xs mt-2">
                  <i class="fas fa-calendar mr-1"></i>
                  ครบกำหนด: <span id="submitTaskDueDate"></span>
                </p>
              </div>
            </div>
            
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">ไฟล์แนบ</label>
              <div class="file-upload-area border-2 border-dashed border-gray-300 rounded-lg p-6 text-center" id="submitFileUploadArea">
                <div class="file-upload-content">
                  <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                  <p class="text-gray-600 mb-2">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                  <p class="text-sm text-gray-500">รองรับไฟล์ทุกประเภท ไม่จำกัดขนาด</p>
                </div>
                <input type="file" id="submitTaskFiles" name="submitTaskFiles" multiple style="display: none;">
              </div>
              <div id="submitFileList" class="file-list hidden mt-4">
                <!-- ไฟล์ที่เลือกจะแสดงที่นี่ -->
              </div>
            </div>
            
            <div class="mb-6">
              <label for="submitTaskNotes" class="block text-sm font-medium text-gray-700 mb-2">หมายเหตุเพิ่มเติม</label>
              <textarea id="submitTaskNotes" name="submitTaskNotes" rows="3" class="form-group" placeholder="หมายเหตุหรือข้อมูลเพิ่มเติม..."></textarea>
            </div>
            
            <div class="flex gap-2">
              <button type="button" class="btn btn-outline flex-1" id="cancelSubmitTask">ยกเลิก</button>
              <button type="button" class="btn btn-primary flex-1" id="confirmSubmitTask">
                <i class="fas fa-upload mr-2"></i>
                ส่งงาน
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // เพิ่ม event listeners
    document.getElementById('closeSubmitTaskModal').addEventListener('click', () => this.closeModal('submitTaskModal'));
    document.getElementById('cancelSubmitTask').addEventListener('click', () => this.closeModal('submitTaskModal'));
    document.getElementById('confirmSubmitTask').addEventListener('click', () => this.confirmSubmitTask());
    
    // เพิ่ม file upload functionality
    this.setupSubmitFileUpload();
  }

  // File Upload Setup - Works for both dynamic and static modals
  setupSubmitFileUpload() {
    const fileInput = document.getElementById('submitTaskFiles');
    const uploadArea = document.getElementById('submitFileUploadArea');
    const fileList = document.getElementById('submitFileList');
    
    if (!fileInput || !uploadArea) {
      console.warn('Submit file upload elements not found');
      return;
    }
    
    // Remove existing event listeners to prevent duplicates
    const newUploadArea = uploadArea.cloneNode(true);
    uploadArea.parentNode.replaceChild(newUploadArea, uploadArea);
    
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    
    // Click to upload
    newUploadArea.addEventListener('click', () => newFileInput.click());
    
    // Drag and drop
    newUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      newUploadArea.classList.add('bg-blue-50', 'border-blue-300');
    });
    
    newUploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (!newUploadArea.contains(e.relatedTarget)) {
        newUploadArea.classList.remove('bg-blue-50', 'border-blue-300');
      }
    });
    
    newUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      newUploadArea.classList.remove('bg-blue-50', 'border-blue-300');
      
      const files = Array.from(e.dataTransfer.files);
      this.displaySelectedFiles(files, newFileInput);
    });
    
    // File input change
    newFileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      this.displaySelectedFiles(files, newFileInput);
    });
  }

  async confirmSubmitTask() {
    if (!this.currentTaskId) {
      this.showToast('ไม่พบงานที่ต้องการส่ง', 'error');
      return;
    }

    // Check if file attachment is required and validate
    if (this.currentTaskToSubmit && this.currentTaskToSubmit.requireAttachment) {
      const hasFiles = this.submitFiles && this.submitFiles.length > 0;
      if (!hasFiles) {
        this.showToast('งานนี้ต้องแนบไฟล์เพื่อส่งงาน กรุณาเลือกไฟล์ก่อนกดส่ง', 'error');
        
        // Highlight the upload area to draw attention
        const uploadArea = document.getElementById('submitFileUploadArea');
        if (uploadArea) {
          uploadArea.classList.remove('border-yellow-300', 'bg-yellow-50');
          uploadArea.classList.add('border-red-300', 'bg-red-50');
          
          // Reset to warning style after 3 seconds
          setTimeout(() => {
            uploadArea.classList.remove('border-red-300', 'bg-red-50');
            uploadArea.classList.add('border-yellow-300', 'bg-yellow-50');
          }, 3000);
        }
        
        return;
      }
    }
    
    try {
      await this.submitTask(this.currentTaskId, this.submitFiles || []);
      this.closeModal('submitTaskModal');
      this.submitFiles = [];
      this.currentTaskToSubmit = null; // Clear stored task data
    } catch (error) {
      console.error('Error submitting task:', error);
    }
  }

  async submitTask(taskId, files = []) {
    try {
      this.showToast('กำลังส่งงาน...', 'info');
      
      const formData = new FormData();
      
      // เพิ่มไฟล์ลงใน FormData
      files.forEach((file, index) => {
        formData.append(`files`, file);
      });
      
      const response = await fetch(`/api/tasks/${taskId}/submit`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        // อัปเดตสถานะงาน
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          this.tasks[taskIndex].status = 'submitted';
          this.tasks[taskIndex].submittedAt = new Date().toISOString();
        }
        
        this.showToast('ส่งงานเรียบร้อย', 'success');
        this.renderTasks();
        this.renderRecentTasks();
        this.updateUpcomingTasks();
      } else {
        throw new Error(result.error || 'Failed to submit task');
      }
      
    } catch (error) {
      console.error('Error submitting task:', error);
      this.showToast(`เกิดข้อผิดพลาดในการส่งงาน: ${error.message}`, 'error');
    }
  }

  // Submit Task Form Handling
  async handleSubmitTaskForm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const taskId = formData.get('taskId');
    const comment = formData.get('comment');
    const files = formData.getAll('files');
    
    if (!taskId) {
      this.showToast('ไม่พบงานที่ต้องการส่ง', 'error');
      return;
    }

    // Check if file attachment is required and validate
    if (this.currentTaskToSubmit && this.currentTaskToSubmit.requireAttachment) {
      const hasValidFiles = files.some(file => file.size > 0);
      if (!hasValidFiles) {
        this.showToast('งานนี้ต้องแนบไฟล์เพื่อส่งงาน กรุณาเลือกไฟล์ก่อนกดส่ง', 'error');
        
        // Highlight the upload area to draw attention
        const uploadArea = document.getElementById('submitFileUploadArea');
        if (uploadArea) {
          uploadArea.classList.remove('border-yellow-300', 'bg-yellow-50');
          uploadArea.classList.add('border-red-300', 'bg-red-50');
          
          // Reset to warning style after 3 seconds
          setTimeout(() => {
            uploadArea.classList.remove('border-red-300', 'bg-red-50');
            uploadArea.classList.add('border-yellow-300', 'bg-yellow-50');
          }, 3000);
        }
        
        return;
      }
    }
    
    try {
      this.showToast('กำลังส่งงาน...', 'info');
      
      const submitFormData = new FormData();
      if (comment) submitFormData.append('comment', comment);
      
      // เพิ่มไฟล์แนบ
      files.forEach(file => {
        if (file.size > 0) {
          submitFormData.append('files', file);
        }
      });
      
      const response = await fetch(`/api/tasks/${taskId}/submit`, {
        method: 'POST',
        body: submitFormData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        // อัปเดตสถานะงาน
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          this.tasks[taskIndex].status = 'submitted';
          this.tasks[taskIndex].submittedAt = new Date().toISOString();
        }
        
        this.showToast('ส่งงานเรียบร้อย', 'success');
        this.closeModal('submitTaskModal');
        this.renderTasks();
        this.renderRecentTasks();
        this.updateUpcomingTasks();
        
        // Clear stored task data
        this.currentTaskToSubmit = null;
      } else {
        throw new Error(result.error || 'Failed to submit task');
      }
      
    } catch (error) {
      console.error('Error submitting task:', error);
      this.showToast(`เกิดข้อผิดพลาดในการส่งงาน: ${error.message}`, 'error');
    }
  }

  // Task Action Functions
  async completeTask(taskId) {
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const taskIndex = this.tasks.findIndex(t => t.id === taskId);
          if (taskIndex !== -1) {
            this.tasks[taskIndex].status = 'completed';
          }
          this.showToast('ทำเสร็จงานเรียบร้อย', 'success');
          this.renderTasks();
          this.closeModal('taskDetailModal');
        }
      }
    } catch (error) {
      console.error('Error completing task:', error);
      this.showToast('เกิดข้อผิดพลาดในการทำเสร็จงาน', 'error');
    }
  }

  async reopenTask(taskId) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const taskIndex = this.tasks.findIndex(t => t.id === taskId);
          if (taskIndex !== -1) {
            this.tasks[taskIndex].status = 'in_progress';
          }
          this.showToast('เปิดงานใหม่เรียบร้อย', 'success');
          this.renderTasks();
          this.closeModal('taskDetailModal');
        }
      }
    } catch (error) {
      console.error('Error reopening task:', error);
      this.showToast('เกิดข้อผิดพลาดในการเปิดงานใหม่', 'error');
    }
  }

  async downloadFile(fileId) {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      this.showToast('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์', 'error');
    }
  }

  // Helper function for file size formatting
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  uploadFile() {
    this.showToast('เปิดหน้าต่างอัปโหลดไฟล์', 'info');
    // สร้าง input file element
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.txt,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip,.rar';
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        this.handleFileUpload(files);
      }
    };
    input.click();
  }

  async handleFileUpload(files) {
    try {
      this.showToast(`กำลังอัปโหลด ${files.length} ไฟล์...`, 'info');
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        this.showToast(`อัปโหลดไฟล์สำเร็จ: ${files.map(f => f.name).join(', ')}`, 'success');
        // รีเฟรชรายการไฟล์
        this.loadFiles();
      } else {
        throw new Error(result.error || 'Failed to upload files');
      }
      
    } catch (error) {
      console.error('Error uploading files:', error);
      this.showToast(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${error.message}`, 'error');
    }
  }

  async loadFilesData() {
    try {
      console.log('loadFilesData called');
      console.log('Current groupId:', this.currentGroupId);
      
      if (!this.currentGroupId) {
        // Fallback to mock data
        console.log('No groupId, using mock files');
        this.files = this.getMockFiles();
        console.log('Mock files loaded:', this.files);
        this.renderFiles();
        return;
      }

      // First, try to get group-level files
      const response = await fetch(`/api/groups/${this.currentGroupId}/files?limit=100`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        this.files = result.data || [];
        console.log('API group files loaded:', this.files);
        
        // If no group-level files found, check task-level files
        if (this.files.length === 0) {
          console.log('No group files found, checking task files...');
          await this.loadTaskFiles();
        }
        
        // If still no files, use mock data
        if (this.files.length === 0) {
          console.log('No files found in group or tasks, using mock data instead');
          this.files = this.getMockFiles();
          console.log('Using mock files:', this.files);
        }
        
        this.organizedFiles = this.organizeFilesByTask(this.files);
        this.renderFiles();
        this.populateTaskFilter();
      } else {
        throw new Error(result.error || 'Failed to load files');
      }
      
    } catch (error) {
      console.error('Error loading files:', error);
      this.showToast('เกิดข้อผิดพลาดในการโหลดไฟล์', 'error');
      // Fallback to checking task files, then mock data
      console.log('Error fallback, checking task files...');
      try {
        await this.loadTaskFiles();
        if (this.files.length === 0) {
          console.log('No task files found, using mock files');
          this.files = this.getMockFiles();
          console.log('Fallback files loaded:', this.files);
        }
      } catch (taskError) {
        console.log('Task files also failed, using mock files');
        this.files = this.getMockFiles();
        console.log('Final fallback files loaded:', this.files);
      }
      this.organizedFiles = this.organizeFilesByTask(this.files);
      this.renderFiles();
      this.populateTaskFilter();
    }
  }

  // Keep loadFiles as an alias for backward compatibility
  async loadFiles() {
    return this.loadFilesData();
  }

  // Load files from all tasks in the group
  async loadTaskFiles() {
    try {
      if (!this.tasks || this.tasks.length === 0) {
        console.log('No tasks available to check for files');
        return;
      }

      console.log('Checking files from', this.tasks.length, 'tasks in group');
      const allTaskFiles = [];
      
      // Check each task for files
      for (const task of this.tasks) {
        try {
          const response = await fetch(`/api/groups/${this.currentGroupId}/tasks/${task.id}/files`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
              console.log(`Found ${result.data.length} files in task: ${task.title}`);
              // Add task info to each file for better organization
              const taskFiles = result.data.map(file => ({
                ...file,
                linkedTasks: file.linkedTasks || [task.id],
                taskTitle: task.title
              }));
              allTaskFiles.push(...taskFiles);
            }
          }
        } catch (taskError) {
          console.log('Error checking files for task:', task.id, taskError.message);
          // Continue with other tasks even if one fails
        }
      }
      
      if (allTaskFiles.length > 0) {
        this.files = allTaskFiles;
        console.log('Total task files found:', allTaskFiles.length);
      } else {
        console.log('No files found in any tasks');
      }
      
    } catch (error) {
      console.error('Error loading task files:', error);
      throw error;
    }
  }

  filterFiles(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
      this.renderFiles();
      return;
    }
    
    const filteredFiles = this.files.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // แสดงผลไฟล์ที่กรองแล้ว
    const filesContainer = document.getElementById('filesContainer');
    if (!filesContainer) return;

    if (filteredFiles.length === 0) {
      filesContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-search text-4xl mb-4"></i>
          <p>ไม่พบไฟล์ที่ตรงกับคำค้นหา: "${searchTerm}"</p>
        </div>
      `;
      return;
    }

    const filesHTML = filteredFiles.map(file => `
      <div class="file-item bg-white rounded-lg shadow-sm border p-4 mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div class="file-icon mr-4">
              ${this.getFileIcon(file.type || file.name)}
            </div>
            <div>
              <h4 class="font-medium text-gray-900">${file.name}</h4>
              <p class="text-sm text-gray-600">
                ${this.formatFileSize(file.size)} • 
                ${this.formatDate(file.createdAt)}
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button class="btn btn-sm btn-outline" onclick="dashboardApp.downloadFile('${file.id}')">
              <i class="fas fa-download mr-1"></i>
              ดาวน์โหลด
            </button>
            <button class="btn btn-sm btn-outline" onclick="dashboardApp.deleteFile('${file.id}')">
              <i class="fas fa-trash mr-1"></i>
              ลบ
            </button>
          </div>
        </div>
      </div>
    `).join('');

    filesContainer.innerHTML = filesHTML;
  }

  renderFiles() {
    const filesContainer = document.getElementById('filesContainer');
    console.log('renderFiles called - filesContainer found:', !!filesContainer);
    console.log('Files array:', this.files);
    console.log('Files length:', this.files?.length || 0);
    
    if (!filesContainer) {
      console.error('filesContainer element not found!');
      return;
    }

    // Get current filters
    const searchTerm = document.getElementById('searchFiles')?.value.toLowerCase() || '';
    const taskFilter = document.getElementById('taskFilterSelect')?.value || '';
    const typeFilter = document.getElementById('fileTypeFilter')?.value || '';
    const viewMode = this.currentFileViewMode || 'folder';

    console.log('Filters:', { searchTerm, taskFilter, typeFilter, viewMode });

    // Filter files
    const filteredFiles = this.filterFilesByControls(searchTerm, taskFilter, typeFilter);
    console.log('Filtered files:', filteredFiles);
    console.log('Filtered files length:', filteredFiles.length);

    if (filteredFiles.length === 0) {
      console.log('No files to display, showing empty state');
      filesContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-folder text-4xl mb-4"></i>
          <p>${searchTerm || taskFilter || typeFilter ? 'ไม่พบไฟล์ที่ตรงกับเงื่อนไข' : 'ยังไม่มีไฟล์'}</p>
          ${!searchTerm && !taskFilter && !typeFilter ? `
            <button class="btn btn-primary mt-4" onclick="dashboardApp.uploadFile()">
              <i class="fas fa-upload mr-2"></i>
              อัปโหลดไฟล์แรก
            </button>
          ` : ''}
        </div>
      `;
      return;
    }

    let html = '';
    if (viewMode === 'folder') {
      html = this.renderFolderView(filteredFiles);
    } else if (viewMode === 'grid') {
      html = this.renderGridView(filteredFiles);
    } else {
      html = this.renderListView(filteredFiles);
    }

    console.log('Generated HTML length:', html.length);
    console.log('Setting innerHTML to filesContainer');
    filesContainer.innerHTML = html;
  }

  // Organize files by task
  organizeFilesByTask(files) {
    const organized = {
      unassigned: [],
      tasks: {}
    };

    files.forEach(file => {
      if (!file.linkedTasks || file.linkedTasks.length === 0) {
        organized.unassigned.push(file);
      } else {
        file.linkedTasks.forEach(taskId => {
          if (!organized.tasks[taskId]) {
            const task = this.tasks.find(t => t.id === taskId);
            organized.tasks[taskId] = {
              task: task || { id: taskId, title: 'งานที่ไม่พบ', status: 'unknown' },
              files: []
            };
          }
          organized.tasks[taskId].files.push(file);
        });
      }
    });

    return organized;
  }

  // Filter files by controls
  filterFilesByControls(searchTerm, taskFilter, typeFilter) {
    let filtered = [...this.files];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(file => 
        (file.originalName || file.name || '').toLowerCase().includes(searchTerm) ||
        (file.tags && file.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    }

    // Task filter
    if (taskFilter) {
      if (taskFilter === 'no-task') {
        filtered = filtered.filter(file => !file.linkedTasks || file.linkedTasks.length === 0);
      } else {
        filtered = filtered.filter(file => file.linkedTasks && file.linkedTasks.includes(taskFilter));
      }
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter(file => this.getFileCategory(file) === typeFilter);
    }

    return filtered;
  }

  // Render folder view (organized by tasks)
  renderFolderView(files) {
    const organized = this.organizeFilesByTask(files);
    let html = '';

    // Render task folders
    Object.values(organized.tasks).forEach(taskGroup => {
      const { task, files: taskFiles } = taskGroup;
      const statusBadge = this.getTaskStatusBadge(task.status);
      
      html += `
        <div class="bg-white rounded-lg shadow-sm border mb-6">
          <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <i class="fas fa-folder text-blue-500 mr-3"></i>
                <div>
                  <h3 class="font-medium text-gray-900">${this.escapeHtml(task.title)}</h3>
                  <p class="text-sm text-gray-500">${taskFiles.length} ไฟล์</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                ${statusBadge}
                <button class="btn btn-sm btn-outline" onclick="dashboardApp.viewTaskFromFile('${task.id}')">
                  <i class="fas fa-eye mr-1"></i>
                  ดูงาน
                </button>
              </div>
            </div>
          </div>
          <div class="p-4">
            <div class="grid grid-cols-3 gap-3">
              ${taskFiles.map(file => this.renderFileCard(file)).join('')}
            </div>
          </div>
        </div>
      `;
    });

    // Render unassigned files
    if (organized.unassigned.length > 0) {
      html += `
        <div class="bg-white rounded-lg shadow-sm border mb-6">
          <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
            <div class="flex items-center">
              <i class="fas fa-folder-open text-gray-400 mr-3"></i>
              <div>
                <h3 class="font-medium text-gray-900">ไฟล์ทั่วไป</h3>
                <p class="text-sm text-gray-500">${organized.unassigned.length} ไฟล์</p>
              </div>
            </div>
          </div>
          <div class="p-4">
            <div class="grid grid-cols-3 gap-3">
              ${organized.unassigned.map(file => this.renderFileCard(file)).join('')}
            </div>
          </div>
        </div>
      `;
    }

    return html;
  }

  // Render grid view
  renderGridView(files) {
    return `
      <div class="grid grid-cols-3 gap-3">
        ${files.map(file => this.renderFileCard(file)).join('')}
      </div>
    `;
  }

  // Render list view
  renderListView(files) {
    return `
      <div class="space-y-2">
        ${files.map(file => this.renderFileRow(file)).join('')}
      </div>
    `;
  }

  // Render individual file card with image preview
  renderFileCard(file) {
    const fileCategory = this.getFileCategory(file);
    const isImage = fileCategory === 'image';
    const fileName = file.originalName || file.name || 'Unnamed file';
    const fileSize = this.formatFileSize(file.size || 0);
    const uploadDate = this.formatDate(file.uploadedAt || file.createdAt);
    
    return `
      <div class="bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition-shadow cursor-pointer" 
           onclick="dashboardApp.previewFile('${file.id}')">
        <div class="w-full h-16 mb-2 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
          ${isImage ? `
            <img src="${this.getFilePreviewUrl(file)}" 
                 alt="${this.escapeHtml(fileName)}"
                 class="w-full h-full object-cover"
                 onerror="this.parentElement.innerHTML='${this.getFileIcon(fileName)}';">
          ` : `
            <div class="text-2xl text-gray-400">
              ${this.getFileIcon(fileName)}
            </div>
          `}
        </div>
        <div class="space-y-1">
          <h4 class="font-medium text-gray-900 text-xs truncate" title="${this.escapeHtml(fileName)}">
            ${this.escapeHtml(fileName)}
          </h4>
          <p class="text-xs text-gray-500">${fileSize}</p>
          ${file.tags && file.tags.length > 0 ? `
            <div class="flex flex-wrap gap-1">
              ${file.tags.slice(0, 1).map(tag => 
                `<span class="inline-flex items-center px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-800">${this.escapeHtml(tag)}</span>`
              ).join('')}
              ${file.tags.length > 1 ? `<span class="text-xs text-gray-500">+${file.tags.length - 1}</span>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="flex gap-1 mt-2" onclick="event.stopPropagation()">
          <button class="btn btn-xs bg-blue-500 text-white hover:bg-blue-600 flex-[2] px-2 py-1 rounded text-xs font-medium" 
                  onclick="dashboardApp.previewFile('${file.id}')" 
                  title="ดูไฟล์">
            ดู
          </button>
          <button class="btn btn-xs bg-green-500 text-white hover:bg-green-600 flex-[1] px-1 py-1 rounded text-xs" 
                  onclick="dashboardApp.downloadFile('${file.id}')" 
                  title="ดาวน์โหลด">
            โหลด
          </button>
        </div>
      </div>
    `;
  }

  // Render file row for list view
  renderFileRow(file) {
    const fileCategory = this.getFileCategory(file);
    const isImage = fileCategory === 'image';
    const fileName = file.originalName || file.name || 'Unnamed file';
    const fileSize = this.formatFileSize(file.size || 0);
    const uploadDate = this.formatDate(file.uploadedAt || file.createdAt);
    
    return `
      <div class="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
        <div class="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
          ${isImage ? `
            <img src="${this.getFilePreviewUrl(file)}" 
                 alt="${this.escapeHtml(fileName)}"
                 class="w-full h-full object-cover"
                 onerror="this.parentElement.innerHTML='${this.getFileIcon(fileName)}';">
          ` : `
            <div class="text-xl text-gray-400">
              ${this.getFileIcon(fileName)}
            </div>
          `}
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-medium text-gray-900 truncate">${this.escapeHtml(fileName)}</h4>
          <p class="text-sm text-gray-500">${fileSize} • ${uploadDate}</p>
          ${file.tags && file.tags.length > 0 ? `
            <div class="flex flex-wrap gap-1 mt-1">
              ${file.tags.slice(0, 3).map(tag => 
                `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">${this.escapeHtml(tag)}</span>`
              ).join('')}
              ${file.tags.length > 3 ? `<span class="text-xs text-gray-500">+${file.tags.length - 3}</span>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button class="btn btn-sm btn-outline" onclick="dashboardApp.previewFile('${file.id}')">
            <i class="fas fa-eye mr-1"></i>
            ดู
          </button>
          <button class="btn btn-sm btn-outline" onclick="dashboardApp.downloadFile('${file.id}')">
            <i class="fas fa-download mr-1"></i>
            ดาวน์โหลด
          </button>
        </div>
      </div>
    `;
  }

  getFileIcon(fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const iconMap = {
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝',
      'xls': '📊',
      'xlsx': '📊',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'zip': '📦',
      'rar': '📦',
      'txt': '📄'
    };
    return iconMap[extension] || '📄';
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString) {
    if (!dateString) return 'ไม่ระบุ';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async downloadFile(fileId) {
    try {
      this.showToast('กำลังดาวน์โหลดไฟล์...', 'info');
      
      const response = await fetch(`/api/files/${fileId}/download`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'file';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      this.showToast('ดาวน์โหลดไฟล์สำเร็จ', 'success');
      
    } catch (error) {
      console.error('Error downloading file:', error);
      this.showToast(`เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์: ${error.message}`, 'error');
    }
  }

  async deleteFile(fileId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบไฟล์นี้?')) {
      return;
    }
    
    try {
      this.showToast('กำลังลบไฟล์...', 'info');
      
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        // ลบไฟล์ออกจากรายการ
        this.files = this.files.filter(f => f.id !== fileId);
        this.renderFiles();
        this.showToast('ลบไฟล์สำเร็จ', 'success');
      } else {
        throw new Error(result.error || 'Failed to delete file');
      }
      
    } catch (error) {
      console.error('Error deleting file:', error);
      this.showToast(`เกิดข้อผิดพลาดในการลบไฟล์: ${error.message}`, 'error');
    }
  }

  // Get file category based on mime type or extension
  getFileCategory(file) {
    const mimeType = file.mimeType || file.type || '';
    const fileName = file.originalName || file.name || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    // Image files
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
      return 'image';
    }
    
    // Video files
    if (mimeType.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
      return 'video';
    }
    
    // Audio files
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(extension)) {
      return 'audio';
    }
    
    // Document files
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp'].includes(extension) ||
        mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('pdf')) {
      return 'document';
    }
    
    return 'other';
  }

  // Get file preview URL for images
  getFilePreviewUrl(file) {
    // In a real implementation, this would return the actual file URL
    // For now, return a placeholder or construct URL based on file path
    if (file.path) {
      return file.path;
    }
    
    // Fallback to a placeholder image service
    const fileName = file.originalName || file.name || 'file';
    const cleanName = encodeURIComponent(fileName.split('.')[0]);
    return `https://via.placeholder.com/200x200/e5e7eb/6b7280?text=${cleanName}`;
  }

  // Get task status badge
  getTaskStatusBadge(status) {
    const statusInfo = this.getStatusInfo(status);
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.class}">
      <i class="${statusInfo.icon} mr-1"></i>
      ${statusInfo.text}
    </span>`;
  }

  // Populate task filter dropdown
  populateTaskFilter() {
    const taskFilter = document.getElementById('taskFilterSelect');
    if (!taskFilter || !this.tasks) return;

    // Keep existing options
    const existingOptions = taskFilter.innerHTML;
    
    // Add task options
    const taskOptions = this.tasks.map(task => 
      `<option value="${task.id}">${this.escapeHtml(task.title)}</option>`
    ).join('');

    taskFilter.innerHTML = existingOptions + taskOptions;
  }

  // Setup file view event listeners
  setupFileViewListeners() {
    // View mode buttons
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const viewMode = e.target.dataset.view;
        this.switchFileView(viewMode);
      });
    });

    // Filter listeners
    document.getElementById('searchFiles')?.addEventListener('input', () => this.renderFiles());
    document.getElementById('taskFilterSelect')?.addEventListener('change', () => this.renderFiles());
    document.getElementById('fileTypeFilter')?.addEventListener('change', () => this.renderFiles());
  }

  // Switch file view mode
  switchFileView(viewMode) {
    this.currentFileViewMode = viewMode;
    
    // Update button states
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewMode);
    });

    // Re-render files
    this.renderFiles();
  }

  // Mock files data for development
  getMockFiles() {
    return [
      {
        id: 'file1',
        originalName: 'project-mockup.jpg',
        name: 'project-mockup.jpg',
        mimeType: 'image/jpeg',
        size: 2048576,
        path: 'data:image/svg+xml;base64,' + btoa('<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#3b82f6"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dy=".3em">Project Mockup</text></svg>'),
        linkedTasks: ['task1'],
        tags: ['design', 'mockup'],
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'file2',
        originalName: 'requirements.pdf',
        name: 'requirements.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        linkedTasks: ['task1'],
        tags: ['documentation'],
        uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'file3',
        originalName: 'screenshot.png',
        name: 'screenshot.png',
        mimeType: 'image/png',
        size: 512000,
        path: 'data:image/svg+xml;base64,' + btoa('<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#10b981"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dy=".3em">Screenshot</text></svg>'),
        linkedTasks: ['task2'],
        tags: ['screenshot', 'testing'],
        uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'file4',
        originalName: 'notes.txt',
        name: 'notes.txt',
        mimeType: 'text/plain',
        size: 8192,
        linkedTasks: [],
        tags: ['notes'],
        uploadedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'file5',
        originalName: 'presentation.pptx',
        name: 'presentation.pptx',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        size: 5242880,
        linkedTasks: ['task1'],
        tags: ['presentation', 'meeting'],
        uploadedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  // File action functions
  previewFile(fileId) {
    const file = this.files.find(f => f.id === fileId);
    if (!file) return;

    this.showToast(`กำลังเปิดไฟล์: ${file.originalName || file.name}`, 'info');
    // In a real implementation, this would open a file preview modal
  }

  uploadFile() {
    this.showToast('กำลังเปิดหน้าต่างอัปโหลดไฟล์...', 'info');
    // In a real implementation, this would open file upload modal
  }

  viewTaskFromFile(taskId) {
    // Switch to tasks view and open task detail
    this.switchView('tasks');
    setTimeout(() => {
      this.openTaskDetail(taskId);
    }, 300);
  }

  filterTasks(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
      this.renderTasks();
      return;
    }
    
    const filteredTasks = this.tasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    // แสดงผลงานที่กรองแล้ว
    const tasksContainer = document.getElementById('tasksContainer');
    if (!tasksContainer) return;

    if (filteredTasks.length === 0) {
      tasksContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-search text-4xl mb-4"></i>
          <p>ไม่พบงานที่ตรงกับคำค้นหา: "${searchTerm}"</p>
        </div>
      `;
      return;
    }

    const taskCards = filteredTasks.map(task => this.renderTaskCard(task)).join('');
    tasksContainer.innerHTML = taskCards;
  }

  filterTasksByStatus(status) {
    if (!status || status === '') {
      this.renderTasks();
      return;
    }
    
    const filteredTasks = this.tasks.filter(task => task.status === status);
    
    // แสดงผลงานที่กรองแล้ว
    const tasksContainer = document.getElementById('tasksContainer');
    if (!tasksContainer) return;

    if (filteredTasks.length === 0) {
      tasksContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-filter text-4xl mb-4"></i>
          <p>ไม่พบงานที่มีสถานะ: ${this.getStatusText(status)}</p>
        </div>
      `;
      return;
    }

    const taskCards = filteredTasks.map(task => this.renderTaskCard(task)).join('');
    tasksContainer.innerHTML = taskCards;
  }

  runReport() {
    this.showToast('กำลังสร้างรายงาน...', 'info');
    // สร้างรายงานตัวอย่าง
    setTimeout(() => {
      const reportData = {
        totalTasks: this.tasks.length,
        completedTasks: this.tasks.filter(t => t.status === 'completed').length,
        pendingTasks: this.tasks.filter(t => t.status === 'pending').length,
        reportDate: new Date().toLocaleString('th-TH')
      };
      
      this.showToast(`รายงาน: งานทั้งหมด ${reportData.totalTasks} รายการ`, 'success');
    }, 2000);
  }

  exportExcel() {
    this.showToast('กำลังส่งออก Excel...', 'info');
    // สร้าง CSV สำหรับ Excel
    const headers = ['ID', 'ชื่องาน', 'คำอธิบาย', 'วันที่กำหนด', 'ความสำคัญ', 'สถานะ'];
    const csvContent = [
      headers.join(','),
      ...this.tasks.map(task => [
        task.id,
        task.title,
        task.description,
        task.dueTime,
        task.priority,
        task.status || 'pending'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showToast('ส่งออก Excel เรียบร้อย', 'success');
  }

  saveRecipients() {
    this.showToast('บันทึกผู้รับรายงานเรียบร้อย', 'success');
    // บันทึกข้อมูลผู้รับรายงาน
    const recipients = document.querySelectorAll('input[name="recipient"]:checked');
    const recipientList = Array.from(recipients).map(r => r.value);
    localStorage.setItem('reportRecipients', JSON.stringify(recipientList));
  }

  debugLeaderboard() {
    this.showToast('เปิดโหมด Debug', 'info');
    // แสดงข้อมูล debug
    console.log('Debug Info:', {
      tasks: this.tasks,
      groups: this.groups,
      currentUser: this.currentUser,
      currentView: this.currentView
    });
    
    // แสดงข้อมูลในหน้าเว็บ
    const debugInfo = document.createElement('div');
    debugInfo.className = 'fixed top-4 right-4 bg-black text-white p-4 rounded z-50 max-w-md';
    debugInfo.innerHTML = `
      <h3>Debug Info</h3>
      <p>Tasks: ${this.tasks.length}</p>
      <p>Groups: ${this.groups.length}</p>
      <p>Current View: ${this.currentView}</p>
      <button onclick="this.parentElement.remove()" class="mt-2 px-2 py-1 bg-red-500 rounded">ปิด</button>
    `;
    document.body.appendChild(debugInfo);
  }

  editTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      // เติมข้อมูลในฟอร์มแก้ไข
      const form = document.getElementById('editTaskForm');
      if (form) {
        form.querySelector('[name="taskId"]').value = task.id;
        form.querySelector('[name="taskTitle"]').value = task.title;
        form.querySelector('[name="taskDescription"]').value = task.description;
        form.querySelector('[name="dueDate"]').value = task.dueTime.split('T')[0];
        form.querySelector('[name="priority"]').value = task.priority;
        
        // แสดง modal ใน overlay
        const modal = document.getElementById('editTaskModal');
        const overlay = document.getElementById('modalOverlay');
        if (modal && overlay) {
          overlay.innerHTML = '';
          overlay.appendChild(modal);
          modal.classList.remove('hidden');
          overlay.classList.remove('hidden');
        }
      }
    }
  }

  openEditTaskModal(taskId) {
    if (!taskId) {
      this.showToast('ไม่พบงานที่ต้องการแก้ไข', 'error');
      return;
    }

    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      this.showToast('ไม่พบงานที่ระบุ', 'error');
      return;
    }

    // เติมข้อมูลในฟอร์มแก้ไข
    this.populateEditTaskForm(task);

    // เปิด modal
    this.openModal('editTaskModal');
  }

  populateEditTaskForm(task) {
    const form = document.getElementById('editTaskForm');
    if (!form) return;

    // เติมข้อมูลในฟอร์ม
    const taskIdInput = form.querySelector('[name="taskId"]');
    const titleInput = form.querySelector('[name="taskTitle"]');
    const descriptionInput = form.querySelector('[name="taskDescription"]');
    const dueDateInput = form.querySelector('[name="dueDate"]');
    const prioritySelect = form.querySelector('[name="priority"]');

    if (taskIdInput) taskIdInput.value = task.id;
    if (titleInput) titleInput.value = task.title || '';
    if (descriptionInput) descriptionInput.value = task.description || '';
    if (dueDateInput && task.dueTime) {
      // แปลง ISO date เป็นรูปแบบ YYYY-MM-DD สำหรับ input type="date"
      dueDateInput.value = task.dueTime.split('T')[0];
    }
    if (prioritySelect) prioritySelect.value = task.priority || 'medium';

    // โหลดผู้รับผิดชอบและเลือกผู้ที่ถูกมอบหมาย
    this.loadAssigneesForEdit(task);
  }

  async loadAssigneesForEdit(task) {
    try {
      if (!this.currentGroupId) return;

      const response = await fetch(`/api/groups/${this.currentGroupId}/members`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          this.populateEditAssigneesList(result.data, task.assignedUsers || task.assignees || []);
        }
      }
    } catch (error) {
      console.error('Error loading assignees for edit:', error);
    }
  }

  populateEditAssigneesList(members, currentAssignees) {
    const assigneesList = document.getElementById('editAssigneesList');
    if (!assigneesList) return;

    // เคลียร์รายการเดิม
    assigneesList.innerHTML = '';

    // สร้าง checkbox สำหรับแต่ละสมาชิก
    members.forEach(member => {
      const isAssigned = currentAssignees.some(assignee => 
        assignee.id === member.id || assignee.lineUserId === member.lineUserId || assignee.userId === member.userId
      );

      const checkboxHTML = `
        <label class="checkbox-item">
          <input type="checkbox" name="editAssignedTo" value="${member.id || member.userId || member.lineUserId}" ${isAssigned ? 'checked' : ''}>
          <span class="checkmark"></span>
          <span class="label-text">${member.displayName || member.name || member.userId}</span>
        </label>
      `;
      assigneesList.insertAdjacentHTML('beforeend', checkboxHTML);
    });

    // เพิ่ม event listeners สำหรับปุ่ม select all และ clear all
    this.setupEditAssigneeButtons();
  }

  setupEditAssigneeButtons() {
    const selectAllBtn = document.getElementById('editSelectAllAssigned');
    const clearAllBtn = document.getElementById('editClearAllAssigned');
    const assigneesList = document.getElementById('editAssigneesList');

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        const checkboxes = assigneesList.querySelectorAll('input[name="editAssignedTo"]');
        checkboxes.forEach(cb => cb.checked = true);
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        const checkboxes = assigneesList.querySelectorAll('input[name="editAssignedTo"]');
        checkboxes.forEach(cb => cb.checked = false);
      });
    }
  }

  selectAllAssigned() {
    const checkboxes = document.querySelectorAll('input[name="assignedTo"]');
    checkboxes.forEach(cb => cb.checked = true);
  }

  clearAllAssigned() {
    const checkboxes = document.querySelectorAll('input[name="assignedTo"]');
    checkboxes.forEach(cb => cb.checked = false);
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modalOverlay');
    
    if (!modal || !overlay) {
      console.error(`Modal ${modalId} or overlay not found`);
      return;
    }

    // แสดง modal ใน overlay
    overlay.innerHTML = '';
    overlay.appendChild(modal);
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }

  deleteTask(taskId) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบงานนี้?')) {
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      this.renderTasks();
      this.renderRecentTasks();
      this.updateUpcomingTasks();
      this.showToast('ลบงานเรียบร้อย', 'success');
    }
  }

  // ฟังก์ชันดูรายละเอียดงาน
  viewTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      this.showToast('ไม่พบงานที่ต้องการดู', 'error');
      return;
    }

    this.showTaskDetailsModal(task);
  }

  // ฟังก์ชันแสดง modal รายละเอียดงาน
  showTaskDetailsModal(task) {
    const modal = document.getElementById('taskDetailsModal');
    const overlay = document.getElementById('modalOverlay');
    
    if (!modal) {
      this.createTaskDetailsModal();
    }
    
    this.populateTaskDetailsModal(task);
    
    if (modal && overlay) {
      overlay.innerHTML = '';
      overlay.appendChild(modal);
      modal.classList.remove('hidden');
      overlay.classList.remove('hidden');
    }
  }

  // ฟังก์ชันสร้าง modal รายละเอียดงาน
  createTaskDetailsModal() {
    const modalHTML = `
      <div id="taskDetailsModal" class="modal hidden">
        <div class="modal-content max-w-4xl">
          <div class="modal-header">
            <h3 id="taskDetailsTitle">รายละเอียดงาน</h3>
            <button class="modal-close" id="closeTaskDetailsModal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div id="taskDetailsContent">
              <!-- เนื้อหาจะถูกเติมด้วย JavaScript -->
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // เพิ่ม event listeners
    document.getElementById('closeTaskDetailsModal').addEventListener('click', () => {
      this.closeModal('taskDetailsModal');
    });
  }

  // ฟังก์ชันเติมข้อมูลใน modal รายละเอียดงาน
  populateTaskDetailsModal(task) {
    const titleElement = document.getElementById('taskDetailsTitle');
    const contentElement = document.getElementById('taskDetailsContent');
    
    if (!titleElement || !contentElement) return;
    
    titleElement.textContent = task.title;
    
    const statusText = this.getStatusText(task.status);
    const statusColor = this.getStatusColor(task.status);
    const priorityText = this.getPriorityText(task.priority);
    const priorityClass = this.getPriorityClass(task.priority);
    
    // Fix assignee display to show proper names
    let assignedTo = 'ไม่ระบุ';
    if (task.assignedUsers && task.assignedUsers.length > 0) {
      assignedTo = task.assignedUsers.map(user => user.displayName || user.name || 'ไม่ระบุชื่อ').join(', ');
    } else if (task.assigneeIds && task.assigneeIds.length > 0) {
      // Fallback to use getAssignedToDisplay if assignedUsers is not available
      assignedTo = this.getAssignedToDisplay(task);
    }
    
    const dueDate = this.formatDateTime(task.dueTime || task.dueDate);
    const createdDate = this.formatDateTime(task.createdAt);
    
    // Get creator display name
    let createdByDisplay = 'ไม่ระบุ';
    if (task.createdByUser) {
      // ใช้ข้อมูลผู้สร้างที่ส่งมาจาก API โดยตรง
      createdByDisplay = task.createdByUser.displayName || task.createdByUser.realName || task.createdByUser.name || task.createdBy;
    } else if (task.createdBy) {
      // Try to find the creator in group members to get display name
      if (this.groupMembers && this.groupMembers.length > 0) {
        const creator = this.groupMembers.find(m => 
          m.lineUserId === task.createdBy || 
          m.id === task.createdBy ||
          m.userId === task.createdBy
        );
        if (creator) {
          createdByDisplay = creator.displayName || creator.realName || creator.name || task.createdBy;
        } else {
          createdByDisplay = task.createdBy;
        }
      } else {
        createdByDisplay = task.createdBy;
      }
    }
    
    const files = task.files || [];
    const submissions = task.submissions || [];
    const tags = task.tags || [];
    
    contentElement.innerHTML = `
      <div class="space-y-6">
        <!-- ข้อมูลพื้นฐาน -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="text-lg font-semibold text-gray-900 mb-4">ข้อมูลงาน</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">ผู้รับผิดชอบ</label>
              <p class="mt-1 text-sm text-gray-900">${assignedTo}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">ผู้สร้างงาน</label>
              <p class="mt-1 text-sm text-gray-900">${createdByDisplay}</p>
            </div>
            <div class="flex items-center justify-end gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">
                ${statusText}
              </span>
              <span class="priority-badge ${priorityClass}">${priorityText}</span>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">วันที่ครบกำหนด</label>
              <p class="mt-1 text-sm text-gray-900">${dueDate}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">วันที่สร้าง</label>
              <p class="mt-1 text-sm text-gray-900">${createdDate}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">กลุ่ม</label>
              <p class="mt-1 text-sm text-gray-900">${task.group?.name || 'ไม่ระบุกลุ่ม'}</p>
            </div>
          </div>
        </div>

        <!-- รายละเอียดงาน -->
        <div>
          <h4 class="text-lg font-semibold text-gray-900 mb-3">รายละเอียดงาน</h4>
          <div class="bg-white border rounded-lg p-4">
            <p class="text-gray-700 whitespace-pre-wrap">${task.description || 'ไม่มีรายละเอียด'}</p>
          </div>
        </div>

        <!-- แท็ก -->
        ${tags.length > 0 ? `
          <div>
            <h4 class="text-lg font-semibold text-gray-900 mb-3">แท็ก</h4>
            <div class="flex flex-wrap gap-2">
              ${tags.map(tag => `
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  #${tag}
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- ไฟล์แนบจากตอนสร้างงาน -->
        ${files.length > 0 ? `
          <div>
            <h4 class="text-lg font-semibold text-gray-900 mb-3">ไฟล์แนบ (${files.length} ไฟล์)</h4>
            <div class="space-y-2">
              ${files.map(file => `
                <div class="flex items-center justify-between bg-white border rounded-lg p-3">
                  <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                      <i class="fas fa-file text-gray-400"></i>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900">${file.originalName || file.name}</p>
                      <p class="text-xs text-gray-500">${this.formatFileSize(file.size)} • ${this.formatDate(file.createdAt)}</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button class="btn btn-sm btn-outline" onclick="dashboardApp.downloadFile('${file.id}')">
                      <i class="fas fa-download mr-1"></i>
                      ดาวน์โหลด
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- งานที่ส่ง -->
        ${submissions.length > 0 ? `
          <div>
            <h4 class="text-lg font-semibold text-gray-900 mb-3">งานที่ส่ง (${submissions.length} ครั้ง)</h4>
            <div class="space-y-4">
              ${submissions.map((submission, index) => `
                <div class="bg-white border rounded-lg p-4">
                  <div class="flex items-center justify-between mb-3">
                    <h5 class="font-medium text-gray-900">การส่งครั้งที่ ${index + 1}</h5>
                    <span class="text-sm text-gray-500">${this.formatDateTime(submission.submittedAt)}</span>
                  </div>
                  
                  ${submission.comment ? `
                    <div class="mb-3">
                      <label class="text-sm font-medium text-gray-500">ความคิดเห็น</label>
                      <p class="mt-1 text-sm text-gray-700">${submission.comment}</p>
                    </div>
                  ` : ''}
                  
                  ${submission.files && submission.files.length > 0 ? `
                    <div>
                      <label class="text-sm font-medium text-gray-500">ไฟล์ที่ส่ง (${submission.files.length} ไฟล์)</label>
                      <div class="mt-2 space-y-2">
                        ${submission.files.map(file => `
                          <div class="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                            <div class="flex items-center space-x-2">
                              <i class="fas fa-file text-gray-400"></i>
                              <span class="text-sm text-gray-900">${file.originalName || file.name}</span>
                              <span class="text-xs text-gray-500">(${this.formatFileSize(file.size)})</span>
                            </div>
                            <button class="btn btn-xs btn-outline" onclick="dashboardApp.downloadFile('${file.id}')">
                              <i class="fas fa-download mr-1"></i>
                              ดาวน์โหลด
                            </button>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- ปุ่มดำเนินการ -->
        <div class="flex justify-end space-x-3 pt-4 border-t">
          <button class="btn btn-outline" onclick="dashboardApp.closeModal('taskDetailsModal')">
            ปิด
          </button>
          ${task.status === 'pending' || task.status === 'in_progress' ? `
            <button class="btn btn-success" onclick="dashboardApp.openSubmitTaskModal('${task.id}')">
              <i class="fas fa-upload mr-1"></i>
              ส่งงาน
            </button>
          ` : ''}
          <button class="btn btn-primary" onclick="dashboardApp.editTask('${task.id}')">
            <i class="fas fa-edit mr-1"></i>
            แก้ไขงาน
          </button>
        </div>
        
        <!-- ข้อมูลผู้สร้าง -->
        <div class="text-center pt-3 border-t border-gray-200">
          <p class="text-sm text-gray-500">สร้างโดย: <span class="font-medium text-gray-700">${createdByDisplay}</span></p>
        </div>
      </div>
    `;
  }

  // ฟังก์ชันดาวน์โหลดไฟล์
  async downloadFile(fileId) {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'file'; // ชื่อไฟล์จะถูกกำหนดโดย server
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.showToast('เริ่มดาวน์โหลดไฟล์', 'success');
      } else {
        throw new Error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      this.showToast('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์', 'error');
    }
  }

  inviteMember(email = '', role = 'member', message = '') {
    if (!email) {
      // เปิด modal เชิญสมาชิก
      this.openModal('inviteMemberModal');
      return;
    }
    
    // ส่งคำเชิญ
    this.showToast(`ส่งคำเชิญไปยัง ${email} สำเร็จ`, 'success');
    
    // เพิ่มสมาชิกใหม่ (จำลอง)
    const newMember = {
      id: `member${Date.now()}`,
      lineUserId: `line${Date.now()}`,
      displayName: email.split('@')[0],
      pictureUrl: null,
      role: role,
      joinDate: new Date().toISOString(),
      status: 'pending'
    };
    
    this.groupMembers.push(newMember);
    this.renderGroupMembers();
    this.updateMembersCount();
  }

  exportMembersList() {
    if (!this.groupMembers || this.groupMembers.length === 0) {
      this.showToast('ไม่มีข้อมูลสมาชิกให้ส่งออก', 'warning');
      return;
    }
    
    // สร้างข้อมูล CSV
    const csvContent = [
      ['ชื่อ', 'บทบาท', 'วันที่เข้าร่วม', 'สถานะ'],
      ...this.groupMembers.map(member => [
        member.displayName,
        this.getRoleText(member.role),
        this.formatDate(member.joinDate),
        member.status || 'ใช้งานอยู่'
      ])
    ].map(row => row.join(',')).join('\n');
    
    // ดาวน์โหลดไฟล์ CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `สมาชิกกลุ่ม_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showToast('ส่งออกรายชื่อสมาชิกสำเร็จ', 'success');
  }

  sortMembers() {
    if (!this.groupMembers || this.groupMembers.length === 0) {
      this.showToast('ไม่มีข้อมูลสมาชิกให้เรียงลำดับ', 'warning');
      return;
    }
    
    // เรียงลำดับตามบทบาทและชื่อ
    this.groupMembers.sort((a, b) => {
      const roleOrder = { 'admin': 1, 'moderator': 2, 'member': 3 };
      const roleDiff = (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4);
      if (roleDiff !== 0) return roleDiff;
      return a.displayName.localeCompare(b.displayName);
    });
    
    this.renderGroupMembers();
    this.showToast('เรียงลำดับสมาชิกสำเร็จ', 'success');
  }

  filterMembers(searchTerm = '', roleFilter = '', statusFilter = '') {
    if (!this.groupMembers) return;
    
    let filteredMembers = this.groupMembers;
    
    // กรองตามคำค้นหา
    if (searchTerm) {
      filteredMembers = filteredMembers.filter(member => 
        member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.lineUserId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // กรองตามบทบาท
    if (roleFilter) {
      filteredMembers = filteredMembers.filter(member => member.role === roleFilter);
    }
    
    // กรองตามสถานะ
    if (statusFilter) {
      filteredMembers = filteredMembers.filter(member => 
        (member.status || 'active') === statusFilter
      );
    }
    
    // แสดงผลลัพธ์
    this.renderFilteredMembers(filteredMembers);
    
    // อัปเดตจำนวน
    this.updateFilteredCount(filteredMembers.length);
  }

  renderFilteredMembers(members) {
    const container = document.getElementById('groupMembersContainer');
    if (!container) return;

    if (members.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-center py-8">ไม่พบสมาชิกที่ตรงกับเงื่อนไข</p>';
      return;
    }

    const membersHTML = members.map(member => `
      <div class="member-item bg-white rounded-lg shadow-sm border p-4 mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <span class="text-sm font-medium text-gray-700">${member.displayName.charAt(0)}</span>
            </div>
            <div>
              <div class="font-medium text-gray-900">${member.displayName}</div>
              <div class="text-sm text-gray-500">${this.getRoleText(member.role)}</div>
              <div class="text-xs text-gray-400">เข้าร่วมเมื่อ ${this.formatDate(member.joinDate)}</div>
            </div>
          </div>
          <div class="flex space-x-2">
            <button onclick="window.dashboardApp.viewMemberProfile('${member.id}')" 
                    class="text-blue-600 hover:text-blue-800 text-sm">
              👁️ ดูโปรไฟล์
            </button>
            ${member.role === 'member' ? `
              <button onclick="window.dashboardApp.promoteMember('${member.id}')" 
                      class="text-green-600 hover:text-green-800 text-sm">
                ⬆️ เลื่อนขั้น
              </button>
            ` : ''}
            <button onclick="window.dashboardApp.manageMember('${member.id}')" 
                    class="text-purple-600 hover:text-purple-800 text-sm">
              ⚙️ จัดการ
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = membersHTML;
  }

  updateFilteredCount(count) {
    const showingElement = document.getElementById('showingCount');
    const totalElement = document.getElementById('totalCount');
    
    if (showingElement) showingElement.textContent = count;
    if (totalElement && this.groupMembers) totalElement.textContent = this.groupMembers.length;
  }

  manageMember(memberId) {
    const member = this.groupMembers.find(m => m.id === memberId);
    if (member) {
      this.openMemberManagementModal(member);
    }
  }

  openMemberManagementModal(member) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>จัดการสมาชิก: ${member.displayName}</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="space-y-4">
            <div>
              <label class="text-sm font-medium text-gray-700">เปลี่ยนบทบาท:</label>
              <select id="changeRole" class="form-group mt-2">
                <option value="member" ${member.role === 'member' ? 'selected' : ''}>สมาชิก</option>
                <option value="moderator" ${member.role === 'moderator' ? 'selected' : ''}>ผู้ควบคุม</option>
                <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>ผู้ดูแล</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700">เปลี่ยนสถานะ:</label>
              <select id="changeStatus" class="form-group mt-2">
                <option value="active" ${(member.status || 'active') === 'active' ? 'selected' : ''}>ใช้งานอยู่</option>
                <option value="inactive" ${member.status === 'inactive' ? 'selected' : ''}>ไม่ใช้งาน</option>
                <option value="banned" ${member.status === 'banned' ? 'selected' : ''}>ถูกแบน</option>
              </select>
            </div>
            <div class="flex space-x-3 mt-6">
              <button onclick="window.dashboardApp.applyMemberChanges('${member.id}')" 
                      class="btn btn-primary flex-1">
                บันทึกการเปลี่ยนแปลง
              </button>
              <button onclick="window.dashboardApp.removeMember('${member.id}')" 
                      class="btn btn-outline flex-1">
                ลบสมาชิก
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.classList.remove('hidden');
  }

  applyMemberChanges(memberId) {
    const member = this.groupMembers.find(m => m.id === memberId);
    if (member) {
      const newRole = document.getElementById('changeRole')?.value;
      const newStatus = document.getElementById('changeStatus')?.value;
      
      if (newRole && newRole !== member.role) {
        member.role = newRole;
        this.showToast(`เปลี่ยนบทบาท ${member.displayName} เป็น ${this.getRoleText(newRole)}`, 'success');
      }
      
      if (newStatus && newStatus !== (member.status || 'active')) {
        member.status = newStatus;
        this.showToast(`เปลี่ยนสถานะ ${member.displayName} เป็น ${newStatus}`, 'success');
      }
      
      this.renderGroupMembers();
      this.updateMembersCount();
      
      // ปิด modal
      const modal = document.querySelector('.modal');
      if (modal) modal.remove();
    }
  }

  removeMember(memberId) {
    const member = this.groupMembers.find(m => m.id === memberId);
    if (member) {
      if (confirm(`คุณแน่ใจหรือไม่ที่จะลบสมาชิก "${member.displayName}" ออกจากกลุ่ม?`)) {
        this.groupMembers = this.groupMembers.filter(m => m.id !== memberId);
        this.renderGroupMembers();
        this.updateMembersCount();
        this.showToast(`ลบสมาชิก ${member.displayName} สำเร็จ`, 'success');
        
        // ปิด modal
        const modal = document.querySelector('.modal');
        if (modal) modal.remove();
      }
    }
  }

  updateMembersStats() {
    if (!this.groupMembers) return;
    
    const totalMembers = this.groupMembers.length;
    const activeMembers = this.groupMembers.filter(m => (m.status || 'active') === 'active').length;
    const adminMembers = this.groupMembers.filter(m => m.role === 'admin').length;
    const moderatorMembers = this.groupMembers.filter(m => m.role === 'moderator').length;
    
    // อัปเดตสถิติในหน้า members.html
    const totalElement = document.getElementById('totalMembers');
    const activeElement = document.getElementById('activeMembers');
    const adminElement = document.getElementById('adminMembers');
    const moderatorElement = document.getElementById('moderatorMembers');
    
    if (totalElement) totalElement.textContent = totalMembers;
    if (activeElement) activeElement.textContent = activeMembers;
    if (adminElement) adminElement.textContent = adminMembers;
    if (moderatorElement) moderatorElement.textContent = moderatorMembers;
  }

  // ฟังก์ชันช่วยเหลือสำหรับฟอร์มเพิ่มงาน
  getFieldLabel(fieldName) {
    const labels = {
      'taskTitle': 'ชื่องาน',
      'taskDescription': 'รายละเอียดงาน',
      'dueDate': 'วันที่ครบกำหนด',
      'priority': 'ความสำคัญ',
      'assignedTo': 'ผู้รับผิดชอบ'
    };
    return labels[fieldName] || fieldName;
  }

  getAssignedToName(assignedTo) {
    // ถ้าเป็น team ให้แสดง "ทีมทั้งหมด"
    if (assignedTo === 'team') {
      return 'ทีมทั้งหมด';
    }
    
    // หาชื่อสมาชิกจากรายชื่อสมาชิกจริง
    if (this.groupMembers && this.groupMembers.length > 0) {
      const member = this.groupMembers.find(m => (m.id === assignedTo) || (m.lineUserId === assignedTo));
      if (member) {
        return member.displayName || member.name || member.userId;
      }
    }
    
    // Fallback สำหรับข้อมูลเก่า
    const fallbackNames = {
      'self': 'ตนเอง',
      'member1': 'สมาชิก 1',
      'member2': 'สมาชิก 2',
      'member3': 'สมาชิก 3'
    };
    
    return fallbackNames[assignedTo] || assignedTo;
  }

  // ฟังก์ชันแสดงรายชื่อผู้รับผิดชอบหลายคน
  getAssignedToDisplay(task) {
    // ใช้ assignedUsers ที่มาจาก API ก่อน
    if (task.assignedUsers && Array.isArray(task.assignedUsers) && task.assignedUsers.length > 0) {
      const names = task.assignedUsers.map(user => user.displayName || user.realName || user.name || 'ไม่ระบุชื่อ');
      return names.join(', ');
    }
    
    // Fallback ใช้ assigneeIds
    if (task.assigneeIds && Array.isArray(task.assigneeIds)) {
      if (task.assigneeIds.length === 0) {
        return 'ไม่ระบุ';
      } else if (task.assigneeIds.length === 1) {
        return this.getAssignedToName(task.assigneeIds[0]);
      } else {
        const names = task.assigneeIds.map(id => this.getAssignedToName(id));
        return names.join(', ');
      }
    }
    
    // Fallback สำหรับข้อมูลเก่า
    return task.assignedToName || task.assignedTo || 'ไม่ระบุ';
  }

  // ฟังก์ชันเพื่อแสดงชื่อผู้สร้างงาน
  getCreatorDisplayName(task) {
    // ใช้ข้อมูลผู้สร้างที่ส่งมาจาก API ก่อน
    if (task.createdByUser) {
      return task.createdByUser.displayName || task.createdByUser.realName || task.createdByUser.name || task.createdBy;
    }
    
    if (!task.createdBy) {
      return 'ไม่ระบุ';
    }
    
    // หาชื่อผู้สร้างจากรายชื่อสมาชิกกลุ่ม
    if (this.groupMembers && this.groupMembers.length > 0) {
      const creator = this.groupMembers.find(m => 
        m.lineUserId === task.createdBy || 
        m.id === task.createdBy ||
        m.userId === task.createdBy
      );
      if (creator) {
        return creator.displayName || creator.realName || creator.name || task.createdBy;
      }
    }
    
    return task.createdBy;
  }

  // ฟังก์ชันจัดการการเลือกผู้รับผิดชอบ
  selectAllAssigned() {
    const checkboxes = document.querySelectorAll('input[name="assignedTo"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
  }

  clearAllAssigned() {
    const checkboxes = document.querySelectorAll('input[name="assignedTo"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
  }

  // ฟังก์ชันดึงรายชื่อผู้รับผิดชอบที่เลือก
  getSelectedAssignees() {
    const checkboxes = document.querySelectorAll('input[name="assignedTo"]:checked');
    // ส่ง lineUserId (ขึ้นต้นด้วย U) ตรงตาม schema ของ backend
    return Array.from(checkboxes)
      .map(checkbox => checkbox.value)
      .filter(v => v === 'team' || /^U[0-9A-Za-z]+$/.test(v)); // อนุญาต 'team' และ LINE User ID
  }

  // ฟังก์ชันตรวจสอบว่ามีการเลือกผู้รับผิดชอบหรือไม่
  validateAssignedTo() {
    const selectedAssignees = this.getSelectedAssignees();
    if (selectedAssignees.length === 0) {
      this.showToast('กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน', 'error');
      return false;
    }
    return true;
  }

  // ฟังก์ชันโหลดรายชื่อสมาชิกในกลุ่ม
  async loadGroupMembers() {
    try {
      if (!this.currentGroupId) {
        console.warn('ไม่มี currentGroupId');
        return;
      }

      const response = await fetch(`/api/groups/${this.currentGroupId}/members`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.groupMembers = result.data || [];
          this.renderGroupMembers();
        } else {
          console.error('Error loading group members:', result.error);
          this.groupMembers = [];
        }
      } else {
        console.error('Failed to load group members:', response.status);
        this.groupMembers = [];
      }
    } catch (error) {
      console.error('Error loading group members:', error);
      this.groupMembers = [];
    }
  }

  // ฟังก์ชันแสดงรายชื่อสมาชิกในฟอร์ม
  renderGroupMembers() {
    const checkboxGroup = document.querySelector('.checkbox-group');
    if (!checkboxGroup) return;

    // ล้างรายชื่อเก่า
    checkboxGroup.innerHTML = '';

    // เพิ่มรายชื่อสมาชิกจริง
    this.groupMembers.forEach(member => {
      const checkboxItem = document.createElement('label');
      checkboxItem.className = 'checkbox-item';
      checkboxItem.innerHTML = `
        <input type="checkbox" name="assignedTo" value="${member.lineUserId || member.id}" id="assignedTo_${member.id}">
        <span class="checkmark"></span>
        <span class="label-text">${member.displayName || member.name || member.userId}</span>
      `;
      checkboxGroup.appendChild(checkboxItem);
    });

    // เพิ่มตัวเลือก "ทีมทั้งหมด" ถ้ามีสมาชิกมากกว่า 1 คน
    if (this.groupMembers.length > 1) {
      const teamItem = document.createElement('label');
      teamItem.className = 'checkbox-item';
      teamItem.innerHTML = `
        <input type="checkbox" name="assignedTo" value="team" id="assignedTo_team">
        <span class="checkmark"></span>
        <span class="label-text">ทีมทั้งหมด</span>
      `;
      checkboxGroup.appendChild(teamItem);
    }
  }

  parseTags(tagsString) {
    if (!tagsString) return [];
    return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  }

  getSelectedFiles() {
    const fileInput = document.getElementById('taskFiles');
    if (!fileInput || !fileInput.files) return [];
    
    const files = [];
    for (let i = 0; i < fileInput.files.length; i++) {
      const file = fileInput.files[i];
      files.push({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
    }
    return files;
  }

  resetAddTaskForm() {
    const form = document.getElementById('addTaskForm');
    if (form) {
      form.reset();
      this.clearFileList();
    }
  }

  clearFileList() {
    const fileList = document.getElementById('fileList');
    if (fileList) {
      fileList.innerHTML = '';
      fileList.classList.add('hidden');
    }
  }

  // ฟังก์ชันสำหรับการจัดการไฟล์
  setupFileUpload() {
    const fileInput = document.getElementById('taskFiles');
    const fileUploadArea = document.querySelector('.file-upload-area');
    const fileList = document.getElementById('fileList');

    if (!fileInput || !fileUploadArea || !fileList) {
      console.warn('Add task file upload elements not found');
      return;
    }
    
    // Remove existing event listeners to prevent duplicates
    const newFileUploadArea = fileUploadArea.cloneNode(true);
    fileUploadArea.parentNode.replaceChild(newFileUploadArea, fileUploadArea);
    
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);

    // คลิกเพื่อเลือกไฟล์
    newFileUploadArea.addEventListener('click', () => {
      newFileInput.click();
    });

    // จัดการการเลือกไฟล์
    newFileInput.addEventListener('change', (e) => {
      this.handleFileSelection(e.target.files);
    });

    // Drag and drop
    newFileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      newFileUploadArea.classList.add('dragover');
    });

    newFileUploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!newFileUploadArea.contains(e.relatedTarget)) {
        newFileUploadArea.classList.remove('dragover');
      }
    });

    newFileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      newFileUploadArea.classList.remove('dragover');
      this.handleFileSelection(e.dataTransfer.files);
    });
  }

  handleFileSelection(files) {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;

    // ล้างรายการไฟล์เก่า
    fileList.innerHTML = '';

    if (files.length === 0) {
      fileList.classList.add('hidden');
      return;
    }

    fileList.classList.remove('hidden');

    Array.from(files).forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.innerHTML = `
        <div class="file-info">
          <div class="file-icon">
            <i class="fas ${this.getFileIcon(file.type)}"></i>
          </div>
          <div class="file-details">
            <div class="file-name">${file.name}</div>
            <div class="file-size">${this.formatFileSize(file.size)}</div>
          </div>
        </div>
        <button type="button" class="file-remove" onclick="window.dashboardApp.removeFile(${index})">
          <i class="fas fa-times"></i>
        </button>
      `;
      fileList.appendChild(fileItem);
    });
  }

  removeFile(index) {
    const fileInput = document.getElementById('taskFiles');
    if (!fileInput) return;

    // สร้าง FileList ใหม่โดยไม่มีไฟล์ที่เลือก
    const dt = new DataTransfer();
    for (let i = 0; i < fileInput.files.length; i++) {
      if (i !== index) {
        dt.items.add(fileInput.files[i]);
      }
    }
    fileInput.files = dt.files;

    // อัปเดต UI
    this.handleFileSelection(fileInput.files);
  }

  // ฟังก์ชันช่วยเหลือสำหรับ priority และ category
  getPriorityText(priority) {
    const priorities = {
      'low': 'ต่ำ',
      'medium': 'ปานกลาง',
      'high': 'สูง',
      'urgent': 'ด่วน'
    };
    return priorities[priority] || priority;
  }

  getPriorityClass(priority) {
    const classes = {
      'low': 'priority-low',
      'medium': 'priority-medium',
      'high': 'priority-high',
      'urgent': 'priority-urgent'
    };
    return classes[priority] || 'priority-medium';
  }

  // map ค่า priority UI → API (API รองรับ low|medium|high)
  mapPriority(priority) {
    if (priority === 'urgent') return 'high';
    return priority || 'medium';
  }

  getCategoryText(category) {
    const categories = {
      'general': 'ทั่วไป',
      'meeting': 'การประชุม',
      'report': 'รายงาน',
      'project': 'โครงการ',
      'maintenance': 'บำรุงรักษา',
      'other': 'อื่นๆ'
    };
    return categories[category] || category;
  }

  // ====================
  // Read-Only Mode Banner
  // ====================

  /**
   * แสดง banner แจ้งเตือนโหมดดูอย่างเดียว
   */
  showReadOnlyBanner() {
    const banner = document.getElementById('readOnlyBanner');
    if (banner) {
      banner.classList.remove('hidden');
      console.log('🔒 แสดง banner โหมดดูอย่างเดียว');
    }
  }

  /**
   * ซ่อน banner โหมดดูอย่างเดียว
   */
  hideReadOnlyBanner() {
    const banner = document.getElementById('readOnlyBanner');
    if (banner) {
      banner.classList.add('hidden');
      console.log('🔓 ซ่อน banner โหมดดูอย่างเดียว');
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardApp = new DashboardApp();
});
