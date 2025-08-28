/**
 * Dashboard Core Class
 * ====================
 */

// ตรวจสอบว่า Dashboard class ถูกประกาศแล้วหรือไม่
if (typeof Dashboard === 'undefined') {
  class Dashboard {
    constructor() {
      this.currentView = 'dashboard';
      this.currentGroupId = this.getGroupIdFromUrl();
      this.currentUserId = this.getUserIdFromUrl();
      this.initialAction = this.getActionFromUrl();
      this.apiBase = window.location.origin;
      this.isLoading = false;
      this._currentCalendarDate = new Date();
      
      // ตั้งค่า timezone เริ่มต้น
      this.timezone = 'Asia/Bangkok';
      
      // สร้าง API service instance (เพิ่ม error handling)
      try {
        this.api = new ApiService(this.apiBase);
      } catch (error) {
        console.error('❌ Failed to create ApiService:', error);
        // สร้าง fallback API service
        this.api = {
          getUserInfo: () => Promise.resolve({ displayName: 'ผู้ใช้', role: 'สมาชิก' }),
          getGroupInfo: () => Promise.resolve({ name: 'กลุ่มเริ่มต้น', id: 'default' }),
          getStats: () => Promise.resolve({ totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0 }),
          loadStats: () => Promise.resolve({ totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0 })
        };
      }
      
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
      try {
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
        
        console.log('✅ Dashboard initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize dashboard:', error);
        this.showErrorMessage('ไม่สามารถเริ่มต้น Dashboard ได้: ' + error.message);
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
      // ตรวจสอบว่า API method มีอยู่หรือไม่
      if (typeof this.api.getGroupInfo === 'function') {
        return this.api.getGroupInfo(this.currentGroupId)
          .then(groupInfo => {
            this.updateGroupInfo(groupInfo);
            return groupInfo;
          })
          .catch(error => {
            console.error('❌ Failed to load group info:', error);
            throw error;
          });
      } else {
        // Fallback: ใช้ข้อมูลจาก URL หรือค่าเริ่มต้น
        console.log('⚠️ getGroupInfo method not available, using fallback');
        const groupInfo = {
          name: this.currentGroupId === 'default' ? 'กลุ่มเริ่มต้น' : `กลุ่ม ${this.currentGroupId}`,
          id: this.currentGroupId
        };
        this.updateGroupInfo(groupInfo);
        return Promise.resolve(groupInfo);
      }
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
      // ตรวจสอบว่า API method มีอยู่หรือไม่
      if (typeof this.api.getStats === 'function') {
        return this.api.getStats(this.currentGroupId)
          .then(stats => {
            // ใช้ ViewRenderer ถ้ามี (รองรับทั้งรูปแบบ stats เดิมและแบบ nested)
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderDashboardStats === 'function') {
              window.DashboardViewRenderer.renderDashboardStats(stats);
            } else {
              // รองรับ data ที่เป็น { members, stats, files }
              const plain = stats && stats.stats ? stats.stats : stats;
              this.renderStats(plain || {});
            }
            return stats;
          })
          .catch(error => {
            console.error('❌ Failed to load stats:', error);
            this.showErrorMessage('ไม่สามารถโหลดสถิติได้');
            throw error;
          });
      } else {
        // Fallback: แสดงข้อมูลตัวอย่าง
        console.log('⚠️ getStats method not available, showing sample data');
        const sampleStats = {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0
        };
        this.renderStats(sampleStats);
        return Promise.resolve(sampleStats);
      }
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

    // These methods load data from API and render via ViewRenderer
    loadUpcomingTasks() {
      try {
        if (!this.api || typeof this.api.loadUpcomingTasks !== 'function') return;
        this.api.loadUpcomingTasks(this.currentGroupId)
          .then((tasks) => {
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderUpcomingTasks === 'function') {
              window.DashboardViewRenderer.renderUpcomingTasks(tasks || []);
            } else if (typeof renderUpcomingTasks === 'function') {
              renderUpcomingTasks(tasks || []);
            }
          })
          .catch((err) => {
            console.warn('⚠️ loadUpcomingTasks failed:', err);
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderUpcomingTasks === 'function') {
              window.DashboardViewRenderer.renderUpcomingTasks([]);
            }
          });
      } catch (e) {
        console.warn('⚠️ loadUpcomingTasks error:', e);
      }
    }

    loadMiniLeaderboard() {
      try {
        if (!this.api || typeof this.api.loadLeaderboard !== 'function') return;
        this.api.loadLeaderboard(this.currentGroupId, 'weekly', 5)
          .then((board) => {
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderMiniLeaderboard === 'function') {
              window.DashboardViewRenderer.renderMiniLeaderboard(board || []);
            } else if (typeof renderMiniLeaderboard === 'function') {
              renderMiniLeaderboard(board || []);
            }
          })
          .catch((err) => {
            console.warn('⚠️ loadMiniLeaderboard failed:', err);
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderMiniLeaderboard === 'function') {
              window.DashboardViewRenderer.renderMiniLeaderboard([]);
            }
          });
      } catch (e) {
        console.warn('⚠️ loadMiniLeaderboard error:', e);
      }
    }

    renderCalendar() {
      try {
        const date = this._currentCalendarDate || new Date();
        const month = date.getMonth() + 1; // 1-12
        const year = date.getFullYear();
        if (!this.api || typeof this.api.loadCalendarEvents !== 'function') return;
        this.api.loadCalendarEvents(this.currentGroupId, month, year)
          .then((events) => {
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderCalendar === 'function') {
              window.DashboardViewRenderer.renderCalendar(events || [], date);
            } else if (typeof renderCalendar === 'function') {
              renderCalendar(events || [], date);
            }
            const label = document.getElementById('currentMonthYear');
            if (label) {
              label.textContent = date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
            }
          })
          .catch((err) => {
            console.warn('⚠️ renderCalendar failed:', err);
          });
      } catch (e) {
        console.warn('⚠️ renderCalendar error:', e);
      }
    }

    previousMonth() {
      const d = this._currentCalendarDate || new Date();
      d.setMonth(d.getMonth() - 1);
      this._currentCalendarDate = d;
      this.renderCalendar();
    }

    nextMonth() {
      const d = this._currentCalendarDate || new Date();
      d.setMonth(d.getMonth() + 1);
      this._currentCalendarDate = d;
      this.renderCalendar();
    }

    goToToday() {
      this._currentCalendarDate = new Date();
      this.renderCalendar();
    }

    loadTasks(filters = {}) {
      try {
        if (!this.api || typeof this.api.loadTasks !== 'function') return;
        this.api.loadTasks(this.currentGroupId, filters)
          .then(({ data }) => {
            // Cache
            this._taskCache = data || [];
            this._lastTaskFilters = filters || {};
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderTasksList === 'function') {
              window.DashboardViewRenderer.renderTasksList(this._taskCache, this._lastTaskFilters);
            } else if (typeof renderTasksList === 'function') {
              renderTasksList(this._taskCache, this._lastTaskFilters);
            }
          })
          .catch((err) => {
            console.warn('⚠️ loadTasks failed:', err);
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderTasksList === 'function') {
              window.DashboardViewRenderer.renderTasksList([], filters || {});
            }
          });
      } catch (e) {
        console.warn('⚠️ loadTasks error:', e);
      }
    }

    loadFiles(search = '') {
      try {
        if (!this.api || typeof this.api.loadFiles !== 'function') return;
        this.api.loadFiles(this.currentGroupId, search)
          .then((files) => {
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderFilesGrid === 'function') {
              window.DashboardViewRenderer.renderFilesGrid(files || []);
            } else if (typeof renderFilesGrid === 'function') {
              renderFilesGrid(files || []);
            }
          })
          .catch((err) => {
            console.warn('⚠️ loadFiles failed:', err);
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderFilesGrid === 'function') {
              window.DashboardViewRenderer.renderFilesGrid([]);
            }
          });
      } catch (e) {
        console.warn('⚠️ loadFiles error:', e);
      }
    }

    loadLeaderboard(period = 'weekly') {
      try {
        if (!this.api || typeof this.api.loadLeaderboard !== 'function') return;
        this.api.loadLeaderboard(this.currentGroupId, period)
          .then((board) => {
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderLeaderboard === 'function') {
              window.DashboardViewRenderer.renderLeaderboard(board || []);
            } else if (typeof renderLeaderboard === 'function') {
              renderLeaderboard(board || []);
            }
          })
          .catch((err) => {
            console.warn('⚠️ loadLeaderboard failed:', err);
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderLeaderboard === 'function') {
              window.DashboardViewRenderer.renderLeaderboard([]);
            }
          });
      } catch (e) {
        console.warn('⚠️ loadLeaderboard error:', e);
      }
    }

    loadReports(period = 'weekly') {
      try {
        if (!this.api || typeof this.api.loadReports !== 'function') return;
        this.api.loadReports(this.currentGroupId, period)
          .then((reports) => {
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderReports === 'function') {
              window.DashboardViewRenderer.renderReports(reports || []);
            } else if (typeof renderReports === 'function') {
              renderReports(reports || []);
            }
          })
          .catch((err) => {
            console.warn('⚠️ loadReports failed:', err);
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderReports === 'function') {
              window.DashboardViewRenderer.renderReports([]);
            }
          });
      } catch (e) {
        console.warn('⚠️ loadReports error:', e);
      }
    }

    loadRecurringTasks() {
      try {
        if (!this.api || typeof this.api.listRecurringTasks !== 'function') return;
        this.api.listRecurringTasks(this.currentGroupId)
          .then((items) => {
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderRecurringList === 'function') {
              window.DashboardViewRenderer.renderRecurringList(items || []);
            } else if (typeof renderRecurringList === 'function') {
              renderRecurringList(items || []);
            }
          })
          .catch((err) => {
            console.warn('⚠️ loadRecurringTasks failed:', err);
            if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.renderRecurringList === 'function') {
              window.DashboardViewRenderer.renderRecurringList([]);
            }
          });
      } catch (e) {
        console.warn('⚠️ loadRecurringTasks error:', e);
      }
    }

    // Minimal stubs for actions referenced by renderer
    openTaskModal(taskId) { console.log('openTaskModal', taskId); }
    openEditTaskModal(taskId) { console.log('openEditTaskModal', taskId); }
    viewFile(fileId) { console.log('viewFile', fileId); }
    downloadFile(fileId) { console.log('downloadFile', fileId); }
    addTagsToFile(fileId) { console.log('addTagsToFile', fileId); }

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
  } else {
    // Browser environment - เพิ่มเข้าไปใน global scope
    window.Dashboard = Dashboard;
  }
}
