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
        // Provide backward-compatible alias for renderer/helpers expecting `apiService`
        this.apiService = this.api;
      } catch (error) {
        console.error('❌ Failed to create ApiService:', error);
        // สร้าง fallback API service
        this.api = {
          getUserInfo: () => Promise.resolve({ displayName: 'ผู้ใช้', role: 'สมาชิก' }),
          getGroupInfo: () => Promise.resolve({ name: 'กลุ่มเริ่มต้น', id: 'default' }),
          getStats: () => Promise.resolve({ totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0 }),
          loadStats: () => Promise.resolve({ totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0 })
        };
        this.apiService = this.api;
      }
      
      // Cache สำหรับข้อมูล
      this._taskCache = [];
      this._lastTaskFilters = {};
      this._isCreatingTask = false;
      this._isHandlingAddTask = false;
      
      
      
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

        // ตรวจสอบ URL parameters สำหรับ taskId และ action
        this.handleUrlParameters();

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
    }

    initializeTouchGestures() {
      // Touch gestures จะถูกจัดการใน event-handlers.js
      console.log('📱 Mobile features initialized');
    }



    // ==================== 
    // URL Utilities
    // ==================== 

    getGroupIdFromUrl() {
      // 1) Query string
      const urlParams = new URLSearchParams(window.location.search);
      const q = urlParams.get('groupId');
      if (q) return q;

      // 2) Path patterns e.g. /dashboard/group/:groupId or /group/:groupId
      try {
        const path = window.location.pathname || '';
        const match = path.match(/(?:^|\/)group\/([^\/?#]+)/i);
        if (match && match[1]) return decodeURIComponent(match[1]);
      } catch (_) {}

      // 3) Fallback
      return 'default';
    }

    getUserIdFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      // support multiple param names just in case
      return (
        urlParams.get('userId') ||
        urlParams.get('uid') ||
        ''
      );
    }

    getActionFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('action') || '';
    }

    getTaskIdFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      const fromQuery = urlParams.get('taskId');
      if (fromQuery) return fromQuery;
      // Also support /dashboard/task/:taskId
      try {
        const path = window.location.pathname || '';
        const match = path.match(/(?:^|\/)task\/([^\/?#]+)/i);
        if (match && match[1]) return decodeURIComponent(match[1]);
      } catch (_) {}
      return null;
    }

    handleUrlParameters() {
      const taskId = this.getTaskIdFromUrl();
      const action = this.getActionFromUrl();
      
      if (taskId && action === 'view') {
        console.log(`🔍 Found taskId: ${taskId} with action: ${action}`);
        
        // รอให้ข้อมูลแดชบอร์ดโหลดเสร็จก่อน แล้วค่อยเปิด task details
        this.waitForDashboardData().then(() => {
          this.openTaskDetailsFromUrl(taskId);
        }).catch(error => {
          console.error('❌ Failed to wait for dashboard data:', error);
          // Fallback: ลองเปิด task details โดยตรง
          this.openTaskDetailsFromUrl(taskId);
        });
      }
    }

    waitForDashboardData() {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 15; // เพิ่มจำนวนครั้ง
        
        const checkData = () => {
          attempts++;
          
          // ตรวจสอบว่าข้อมูลแดชบอร์ดโหลดเสร็จแล้วหรือไม่
          const statsLoaded = document.getElementById('totalTasks') && 
                             document.getElementById('totalTasks').textContent !== '' &&
                             document.getElementById('totalTasks').textContent !== '0';
          const tasksLoaded = document.getElementById('upcomingTasks') && 
                             document.getElementById('upcomingTasks').children.length > 0;
          const leaderboardLoaded = document.getElementById('miniLeaderboard') && 
                                   document.getElementById('miniLeaderboard').children.length > 0;
          
          console.log(`🔍 Check attempt ${attempts}:`, {
            statsLoaded,
            tasksLoaded,
            leaderboardLoaded,
            totalTasks: document.getElementById('totalTasks')?.textContent,
            upcomingTasksCount: document.getElementById('upcomingTasks')?.children.length,
            leaderboardCount: document.getElementById('miniLeaderboard')?.children.length
          });
          
          if (statsLoaded && tasksLoaded && leaderboardLoaded) {
            console.log('✅ Dashboard data fully loaded, proceeding with task details');
            resolve();
          } else if (attempts >= maxAttempts) {
            console.warn('⚠️ Max attempts reached, proceeding anyway');
            resolve();
          } else {
            console.log(`⏳ Waiting for dashboard data... (attempt ${attempts}/${maxAttempts})`);
            setTimeout(checkData, 300); // ลดเวลาเป็น 300ms
          }
        };
        
        checkData();
      });
    }

    openTaskDetailsFromUrl(taskId) {
      console.log(`🎯 Opening task details for taskId: ${taskId}`);
      
      try {
        // ตรวจสอบว่ามีฟังก์ชัน showTaskDetails หรือไม่
        if (typeof window.showTaskDetails === 'function') {
          console.log('✅ Using window.showTaskDetails');
          window.showTaskDetails(taskId);
        } else if (window.DashboardViewRenderer && typeof window.DashboardViewRenderer.showTaskDetails === 'function') {
          console.log('✅ Using DashboardViewRenderer.showTaskDetails');
          window.DashboardViewRenderer.showTaskDetails(taskId);
        } else {
          console.warn('⚠️ showTaskDetails function not found, trying fallback');
          // Fallback: เปลี่ยนไปหน้า tasks และเปิด task modal
          this.switchView('tasks');
          setTimeout(() => {
            if (this.openTaskModal) {
              this.openTaskModal(taskId);
            } else {
              console.error('❌ openTaskModal also not found');
              // แสดงข้อความให้ผู้ใช้ทราบ
              this.showErrorMessage(`ไม่สามารถเปิดรายละเอียดงาน ${taskId} ได้`);
            }
          }, 300);
        }
      } catch (error) {
        console.error('❌ Error opening task details:', error);
        this.showErrorMessage(`เกิดข้อผิดพลาดในการเปิดรายละเอียดงาน: ${error.message}`);
      }
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
      if (this.currentView === viewName) {
        // If already on the same view, still ensure its data is loaded
        this.loadViewData(viewName);
        console.log(`🔄 Refreshing current view data: ${viewName}`);
        return;
      }
      
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


    }



    // ==================== 
    // Data Loading
    // ==================== 

    async loadInitialData() {
      this.showLoading();

      // If no explicit groupId but we have a taskId from URL, try resolving groupId from task
      try {
        if ((!this.currentGroupId || this.currentGroupId === 'default') && this.getTaskIdFromUrl()) {
          const tId = this.getTaskIdFromUrl();
          if (this.api && typeof this.api.getTask === 'function' && tId) {
            console.log('🔎 Resolving groupId from taskId:', tId);
            try {
              const task = await this.api.getTask(tId);
              if (task && task.groupId) {
                this.currentGroupId = task.groupId;
                // Refresh group label if possible
                try { await this.loadGroupInfo(); } catch (e) { console.warn('loadGroupInfo after resolve failed:', e); }
              }
            } catch (e) {
              console.warn('⚠️ Could not resolve groupId from taskId:', e?.message || e);
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ groupId resolution step failed:', e);
      }

      try {
        const results = await Promise.allSettled([
          this.loadUserInfo(),
          this.loadGroupInfo(),
          this.loadStats()
        ]);

        const rejected = results.filter(r => r.status === 'rejected');
        if (rejected.length > 0) {
          console.warn('⚠️ Some initial data failed:', rejected.map(r => r.reason?.message || r.reason));
        }
        console.log('✅ Initial data loaded (with allSettled)');
      } catch (error) {
        console.error('❌ Unexpected error during initial load:', error);
      } finally {
        this.hideLoading();
      }
    }

    loadDashboardData() {
      console.log('🔄 Loading dashboard data...');
      
      // โหลดข้อมูลแบบ parallel เพื่อความเร็ว
      Promise.all([
        this.loadStats(),
        this.loadUpcomingTasks(),
        this.loadMiniLeaderboard()
      ]).then(() => {
        console.log('✅ Dashboard data loaded successfully');
        
        // ตรวจสอบว่ามี URL parameters ที่ต้องจัดการหรือไม่
        const taskId = this.getTaskIdFromUrl();
        const action = this.getActionFromUrl();
        
        if (taskId && action === 'view') {
          console.log('🎯 Dashboard loaded, now opening task details');
          this.openTaskDetailsFromUrl(taskId);
        }
      }).catch(error => {
        console.error('❌ Failed to load dashboard data:', error);
      });
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
      const userNameElements = document.querySelectorAll('#userName');
      const userRoleElements = document.querySelectorAll('#userRole');
      
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
    
    /**
     * ดูไฟล์
     */
    async viewFile(fileId) {
      try {
        console.log('🔍 Viewing file:', fileId);
        
        if (!this.currentGroupId) {
          this.showErrorMessage('ไม่สามารถดูไฟล์ได้: ไม่พบข้อมูลกลุ่ม');
          return;
        }
        
        // ดึงข้อมูลไฟล์
        const fileInfo = await this.api.getFileInfo(this.currentGroupId, fileId);
        if (!fileInfo) {
          this.showErrorMessage('ไม่พบไฟล์ที่ระบุ');
          return;
        }
        
        // แสดง modal ข้อมูลไฟล์
        this.showFileViewModal(fileInfo);
        
      } catch (error) {
        console.error('❌ Error viewing file:', error);
        this.showErrorMessage('ไม่สามารถดูไฟล์ได้: ' + error.message);
      }
    }
    
    /**
     * ดาวน์โหลดไฟล์
     */
    async downloadFile(fileId) {
      try {
        console.log('📥 Downloading file:', fileId);
        
        if (!this.currentGroupId) {
          this.showErrorMessage('ไม่สามารถดาวน์โหลดไฟล์ได้: ไม่พบข้อมูลกลุ่ม');
          return;
        }
        
        // แสดง loading
        this.showLoading('กำลังดาวน์โหลดไฟล์...');
        
        // ดาวน์โหลดไฟล์ผ่าน API service (จะจัดการ download อัตโนมัติ)
        await this.api.downloadFile(this.currentGroupId, fileId);
        
        this.hideLoading();
        this.showSuccessMessage('ดาวน์โหลดไฟล์สำเร็จ');
        
      } catch (error) {
        console.error('❌ Error downloading file:', error);
        this.hideLoading();
        this.showErrorMessage('ไม่สามารถดาวน์โหลดไฟล์ได้: ' + error.message);
      }
    }
    
    /**
     * เพิ่มแท็กให้ไฟล์
     */
    addTagsToFile(fileId) { 
      console.log('🏷️ Adding tags to file:', fileId);
      this.showErrorMessage('ฟีเจอร์เพิ่มแท็กยังไม่พร้อมใช้งาน');
    }
    
    /**
     * ส่งงาน
     */
    async submitTask(taskId) {
      try {
        console.log('📤 Submitting task:', taskId);
        
        if (!this.currentGroupId) {
          this.showErrorMessage('ไม่สามารถส่งงานได้: ไม่พบข้อมูลกลุ่ม');
          return;
        }
        
        // แสดง modal ส่งงาน
        this.showSubmitTaskModal(taskId);
        
      } catch (error) {
        console.error('❌ Error submitting task:', error);
        this.showErrorMessage('ไม่สามารถส่งงานได้: ' + error.message);
      }
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
    
    /**
     * แสดง modal ดูไฟล์
     */
    showFileViewModal(fileInfo) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>รายละเอียดไฟล์</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="file-info-grid">
              <div class="file-info-item">
                <label>ชื่อไฟล์:</label>
                <span>${fileInfo.originalName || 'ไม่ระบุ'}</span>
              </div>
              <div class="file-info-item">
                <label>ประเภท:</label>
                <span>${fileInfo.mimeType || 'ไม่ระบุ'}</span>
              </div>
              <div class="file-info-item">
                <label>ขนาด:</label>
                <span>${this.formatFileSize(fileInfo.size) || 'ไม่ระบุ'}</span>
              </div>
              <div class="file-info-item">
                <label>อัปโหลดเมื่อ:</label>
                <span>${this.formatDate(fileInfo.uploadedAt) || 'ไม่ระบุ'}</span>
              </div>
              <div class="file-info-item">
                <label>อัปโหลดโดย:</label>
                <span>${fileInfo.uploadedByUser?.displayName || fileInfo.uploaderName || 'ไม่ระบุ'}</span>
              </div>
            </div>
            <div class="file-actions">
              <button class="btn btn-primary" onclick="window.dashboardInstance.downloadFile('${fileInfo.id}')">
                <i class="fas fa-download"></i>
                ดาวน์โหลด
              </button>
              <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                ปิด
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // ปิด modal เมื่อคลิกพื้นหลัง
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
    }
    
    /**
     * แสดงข้อความสำเร็จ
     */
    showSuccessMessage(message) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-success';
      toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
      `;
      
      document.body.appendChild(toast);
      
      // แสดง toast
      setTimeout(() => toast.classList.add('show'), 100);
      
      // ซ่อน toast หลังจาก 3 วินาที
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
    
    /**
     * แสดงข้อความผิดพลาด
     */
    showErrorMessage(message) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error';
      toast.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
      `;
      
      document.body.appendChild(toast);
      
      // แสดง toast
      setTimeout(() => toast.classList.add('show'), 100);
      
      // ซ่อน toast หลังจาก 5 วินาที
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 5000);
    }
    
    /**
     * แสดง loading
     */
    showLoading(message = 'กำลังโหลด...') {
      const loading = document.getElementById('loading');
      if (loading) {
        const loadingText = loading.querySelector('.loading-text');
        if (loadingText) {
          loadingText.textContent = message;
        }
        loading.style.display = 'flex';
      }
    }
    
    /**
     * ซ่อน loading
     */
    hideLoading() {
      const loading = document.getElementById('loading');
      if (loading) {
        loading.style.display = 'none';
      }
    }
    
    /**
     * จัดรูปแบบขนาดไฟล์
     */
    formatFileSize(bytes) {
      if (!bytes) return '0 B';
      
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    /**
     * จัดรูปแบบวันที่
     */
    formatDate(dateString) {
      if (!dateString) return 'ไม่ระบุ';
      
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'ไม่ระบุ';
        
        return date.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return 'ไม่ระบุ';
      }
    }
    
    /**
     * แสดง modal ส่งงาน
     */
    showSubmitTaskModal(taskId) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>ส่งงาน</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="submitTaskForm" class="submit-task-form">
              <div class="form-group">
                <label for="submitComment">ความคิดเห็น (ไม่บังคับ):</label>
                <textarea id="submitComment" name="comment" rows="3" placeholder="เพิ่มความคิดเห็นหรือคำอธิบายเกี่ยวกับงานที่ส่ง..."></textarea>
              </div>
              <div class="form-group">
                <label for="submitFiles">ไฟล์แนบ (ไม่บังคับ):</label>
                <input type="file" id="submitFiles" name="files" multiple>
                <div class="file-upload-hint">สามารถเลือกไฟล์ได้หลายไฟล์</div>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                  ยกเลิก
                </button>
                <button type="submit" class="btn btn-warning">
                  <i class="fas fa-paper-plane"></i>
                  ส่งงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // จัดการการส่งฟอร์ม
      const form = modal.querySelector('#submitTaskForm');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const comment = form.querySelector('#submitComment').value;
        const files = form.querySelector('#submitFiles').files;
        
        try {
          this.showLoading('กำลังส่งงาน...');
          
          // ส่งข้อมูลไปยัง API
          await this.submitTaskToAPI(taskId, comment, files);
          
          this.hideLoading();
          this.showSuccessMessage('ส่งงานสำเร็จ');
          modal.remove();
          
          // รีเฟรชข้อมูลงาน
          this.loadTasks();
          
        } catch (error) {
          this.hideLoading();
          this.showErrorMessage('ไม่สามารถส่งงานได้: ' + error.message);
        }
      });
      
      // ปิด modal เมื่อคลิกพื้นหลัง
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
    }
    
    /**
     * ส่งงานไปยัง API
     */
    async submitTaskToAPI(taskId, comment, files) {
      try {
        const formData = new FormData();
        formData.append('comment', comment || '');
        
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
          }
        }
        
        const response = await fetch(`${this.apiBase}/api/groups/${this.currentGroupId}/tasks/${taskId}/submit`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'ไม่สามารถส่งงานได้');
        }
        
        return await response.json();
        
      } catch (error) {
        console.error('❌ Error submitting task to API:', error);
        throw error;
      }
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
