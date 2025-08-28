/**
 * Dashboard Core Class
 * ====================
 */

class Dashboard {
  constructor() {
    this.currentView = 'dashboard';
    this.currentGroupId = this.getGroupIdFromUrl();
    this.currentUserId = this.getUserIdFromUrl();
    this.initialAction = this.getActionFromUrl();
    this.apiBase = window.location.origin;
    this.isLoading = false;
    
    // ตั้งค่า timezone เริ่มต้น
    this.timezone = 'Asia/Bangkok';
    
    // สร้าง API service instance
    this.api = new ApiService(this.apiBase);
    
    // Cache สำหรับข้อมูล
    this._taskCache = [];
    this._lastTaskFilters = {};
    this._isCreatingTask = false;
    this._isHandlingAddTask = false;
    
    // Mobile state
    this._isMobileSidebarOpen = false;
    
    this.init();
  }

  // ==================== 
  // Initialization
  // ==================== 

  init() {
    this.bindEvents();
    this.loadInitialData();
    this.hideLoading();
    this.initializeMobileFeatures();

    // ตรวจสอบ URL hash เมื่อโหลดหน้า
    const hash = window.location.hash.substring(1);
    if (hash && ['dashboard', 'calendar', 'tasks', 'files', 'leaderboard', 'reports', 'recurring'].includes(hash)) {
      this.switchView(hash);
    }

    // อนุญาตให้ปุ่มส่งงานทำงานได้ทุกกรณี (ไม่ต้องรอ userId)
    if (!this.currentUserId) {
      // ปิดเฉพาะปุ่มที่ต้องการ userId จริงๆ
      const needUserButtons = ['addTaskBtn', 'reviewTaskBtn'];
      needUserButtons.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.setAttribute('disabled', 'true');
          el.classList.add('disabled');
          el.title = 'โปรดเข้าผ่านลิงก์จากบอทเพื่อระบุตัวตน (userId)';
        }
      });
      
      // เปิดปุ่มส่งงานให้ใช้งานได้เสมอ
      const submitBtn = document.getElementById('submitTaskBtn');
      if (submitBtn) {
        submitBtn.removeAttribute('disabled');
        submitBtn.classList.remove('disabled');
        submitBtn.title = 'ส่งงาน (สามารถใช้งานได้ทันที)';
      }
      
      const hint = document.getElementById('actionHint');
      if (hint) hint.style.display = 'block';
    }
  }

  // ==================== 
  // Mobile Features
  // ==================== 

  initializeMobileFeatures() {
    // ตรวจสอบขนาดหน้าจอ
    this.checkScreenSize();
    
    // Bind window resize event
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
    
    // Initialize touch gestures
    this.initializeTouchGestures();
  }

  checkScreenSize() {
    const isMobile = window.innerWidth <= 768;
    document.body.classList.toggle('mobile', isMobile);
    
    // ปิด sidebar บนมือถือถ้าเปิดอยู่
    if (!isMobile && this._isMobileSidebarOpen) {
      this.closeMobileSidebar();
    }
  }

  initializeTouchGestures() {
    // Touch gestures จะถูกจัดการใน event-handlers.js
    console.log('📱 Mobile features initialized');
  }

  openMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuToggle = document.getElementById('menuToggle');
    
    if (sidebar && window.innerWidth <= 768) {
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('active');
      if (menuToggle) menuToggle.classList.add('active');
      document.body.style.overflow = 'hidden';
      this._isMobileSidebarOpen = true;
    }
  }

  closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuToggle = document.getElementById('menuToggle');
    
    if (sidebar) {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
      if (menuToggle) menuToggle.classList.remove('active');
      document.body.style.overflow = '';
      this._isMobileSidebarOpen = false;
    }
  }

  // ==================== 
  // URL Utilities
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

  getTaskIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('taskId');
  }

  // ==================== 
  // Loading Management
  // ==================== 

  showLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.classList.remove('hidden');
    }
    this.isLoading = true;
  }

  hideLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.classList.add('hidden');
    }
    this.isLoading = false;
  }

  // ==================== 
  // View Management
  // ==================== 

  switchView(viewName) {
    if (this.currentView === viewName) return;
    
    // Hide all views
    const views = document.querySelectorAll('.view');
    views.forEach(view => view.classList.remove('active'));
    
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item, .bottom-nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Show target view
    const targetView = document.getElementById(viewName + 'View');
    if (targetView) {
      targetView.classList.add('active');
    }
    
    // Update navigation
    const navItem = document.querySelector(`[data-view="${viewName}"]`);
    if (navItem) {
      navItem.classList.add('active');
    }
    
    // Update current view
    this.currentView = viewName;
    
    // Update URL hash
    window.location.hash = viewName;
    
    // Load view-specific data
    this.loadViewData(viewName);
    
    // Close mobile sidebar after navigation
    if (window.innerWidth <= 768) {
      this.closeMobileSidebar();
    }
    
    console.log(`📱 Switched to view: ${viewName}`);
  }

  loadViewData(viewName) {
    switch (viewName) {
      case 'dashboard':
        this.loadDashboardData();
        break;
      case 'calendar':
        this.loadCalendarData();
        break;
      case 'tasks':
        this.loadTasksData();
        break;
      case 'files':
        this.loadFilesData();
        break;
      case 'leaderboard':
        this.loadLeaderboardData();
        break;
      case 'reports':
        this.loadReportsData();
        break;
      case 'recurring':
        this.loadRecurringData();
        break;
    }
  }

  // ==================== 
  // Event Binding
  // ==================== 

  bindEvents() {
    // ใช้ event handlers จาก event-handlers.js
    if (typeof initializeEventHandlers === 'function') {
      initializeEventHandlers();
    } else {
      console.warn('⚠️ Event handlers not found, using fallback');
      this.bindFallbackEvents();
    }
  }

  bindFallbackEvents() {
    // Fallback event binding if event-handlers.js is not loaded
    const navItems = document.querySelectorAll('.nav-item, .bottom-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        if (view) {
          this.switchView(view);
        }
      });
    });

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        this.toggleMobileSidebar();
      });
    }
  }

  toggleMobileSidebar() {
    if (this._isMobileSidebarOpen) {
      this.closeMobileSidebar();
    } else {
      this.openMobileSidebar();
    }
  }

  // ==================== 
  // Data Loading
  // ==================== 

  loadInitialData() {
    this.showLoading();
    
    Promise.all([
      this.loadUserInfo(),
      this.loadGroupInfo(),
      this.loadStats()
    ]).then(() => {
      this.hideLoading();
      console.log('✅ Initial data loaded');
    }).catch(error => {
      console.error('❌ Failed to load initial data:', error);
      this.hideLoading();
      this.showErrorMessage('ไม่สามารถโหลดข้อมูลเริ่มต้นได้');
    });
  }

  loadDashboardData() {
    this.loadStats();
    this.loadUpcomingTasks();
    this.loadMiniLeaderboard();
  }

  loadCalendarData() {
    this.renderCalendar();
  }

  loadTasksData() {
    this.loadTasks();
  }

  loadFilesData() {
    this.loadFiles();
  }

  loadLeaderboardData() {
    this.loadLeaderboard('weekly');
  }

  loadReportsData() {
    this.loadReports();
  }

  loadRecurringData() {
    this.loadRecurringTasks();
  }

  // ==================== 
  // User & Group Management
  // ==================== 

  loadUserInfo() {
    if (!this.currentUserId) {
      console.log('⚠️ No userId provided, skipping user info load');
      return Promise.resolve();
    }

    return this.api.getUserInfo(this.currentUserId)
      .then(userInfo => {
        this.updateUserInfo(userInfo);
        return userInfo;
      })
      .catch(error => {
        console.error('❌ Failed to load user info:', error);
        throw error;
      });
  }

  loadGroupInfo() {
    return this.api.getGroupInfo(this.currentGroupId)
      .then(groupInfo => {
        this.updateGroupInfo(groupInfo);
        return groupInfo;
      })
      .catch(error => {
        console.error('❌ Failed to load group info:', error);
        throw error;
      });
  }

  updateUserInfo(userInfo) {
    const userNameElements = document.querySelectorAll('#userName, #sidebarUserName');
    const userRoleElements = document.querySelectorAll('#userRole, #sidebarUserRole');
    
    userNameElements.forEach(el => {
      if (el && userInfo.displayName) {
        el.textContent = userInfo.displayName;
      }
    });
    
    userRoleElements.forEach(el => {
      if (el && userInfo.role) {
        el.textContent = userInfo.role;
      }
    });
  }

  updateGroupInfo(groupInfo) {
    const groupNameElement = document.getElementById('currentGroupName');
    if (groupNameElement && groupInfo.name) {
      groupNameElement.textContent = groupInfo.name;
    }
  }

  // ==================== 
  // Stats & Dashboard
  // ==================== 

  loadStats() {
    return this.api.getStats(this.currentGroupId)
      .then(stats => {
        this.renderStats(stats);
        return stats;
      })
      .catch(error => {
        console.error('❌ Failed to load stats:', error);
        this.showErrorMessage('ไม่สามารถโหลดสถิติได้');
        throw error;
      });
  }

  renderStats(stats) {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    const statsHtml = `
      <div class="stat-card">
        <div class="stat-icon bg-blue">
          <i class="fas fa-tasks"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">${stats.totalTasks || 0}</div>
          <div class="stat-label">งานทั้งหมด</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon bg-green">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">${stats.completedTasks || 0}</div>
          <div class="stat-label">งานเสร็จแล้ว</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon bg-orange">
          <i class="fas fa-clock"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">${stats.pendingTasks || 0}</div>
          <div class="stat-label">งานรอดำเนินการ</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon bg-red">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">${stats.overdueTasks || 0}</div>
          <div class="stat-label">งานเกินกำหนด</div>
        </div>
      </div>
    `;

    statsGrid.innerHTML = statsHtml;
  }

  // ==================== 
  // Utility Methods
  // ==================== 

  showSuccessMessage(message) {
    this.showToast(message, 'success');
  }

  showErrorMessage(message) {
    this.showToast(message, 'error');
  }

  showInfoMessage(message) {
    this.showToast(message, 'info');
  }

  showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    // Remove toast after 5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);
  }

  // ==================== 
  // Modal Management
  // ==================== 

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  closeAllModals() {
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
      modal.classList.remove('active');
    });
    document.body.style.overflow = '';
  }

  // ==================== 
  // Placeholder Methods
  // ==================== 

  // These methods will be implemented based on specific requirements
  loadUpcomingTasks() {
    // Implementation for loading upcoming tasks
    console.log('📋 Loading upcoming tasks...');
  }

  loadMiniLeaderboard() {
    // Implementation for loading mini leaderboard
    console.log('🏆 Loading mini leaderboard...');
  }

  renderCalendar() {
    // Implementation for rendering calendar
    console.log('📅 Rendering calendar...');
  }

  loadTasks() {
    // Implementation for loading tasks
    console.log('📝 Loading tasks...');
  }

  loadFiles() {
    // Implementation for loading files
    console.log('📁 Loading files...');
  }

  loadLeaderboard(period = 'weekly') {
    // Implementation for loading leaderboard
    console.log(`🏆 Loading leaderboard for period: ${period}`);
  }

  loadReports() {
    // Implementation for loading reports
    console.log('📊 Loading reports...');
  }

  loadRecurringTasks() {
    // Implementation for loading recurring tasks
    console.log('🔄 Loading recurring tasks...');
  }

  openAddTaskModal() {
    // Implementation for opening add task modal
    console.log('➕ Opening add task modal...');
  }

  openTaskDetails(taskId) {
    // Implementation for opening task details
    console.log(`📋 Opening task details for ID: ${taskId}`);
  }

  openFileDetails(fileId) {
    // Implementation for opening file details
    console.log(`📁 Opening file details for ID: ${fileId}`);
  }

  openUploadModal() {
    // Implementation for opening upload modal
    console.log('📤 Opening upload modal...');
  }

  openAddRecurringModal() {
    // Implementation for opening add recurring modal
    console.log('🔄 Opening add recurring modal...');
  }

  selectCalendarDate(date) {
    // Implementation for selecting calendar date
    console.log(`📅 Selected date: ${date}`);
  }

  toggleNotifications() {
    // Implementation for toggling notifications
    console.log('🔔 Toggling notifications...');
  }

  openGroupSelector() {
    // Implementation for opening group selector
    console.log('👥 Opening group selector...');
  }

  toggleUserMenu() {
    // Implementation for toggling user menu
    console.log('👤 Toggling user menu...');
  }

  handleFormSubmit(form) {
    // Implementation for handling form submission
    console.log('📝 Handling form submission...');
  }

  validateField(field) {
    // Implementation for field validation
    console.log('✅ Validating field...');
  }

  generateReport() {
    // Implementation for generating report
    console.log('📊 Generating report...');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Dashboard;
}
