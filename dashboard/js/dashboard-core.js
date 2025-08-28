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
    
    this.init();
  }

  // ==================== 
  // Initialization
  // ==================== 

  init() {
    this.bindEvents();
    this.loadInitialData();
    this.hideLoading();

    // ตรวจสอบ URL hash เมื่อโหลดหน้า
    const hash = window.location.hash.substring(1);
    if (hash && ['dashboard', 'calendar', 'tasks', 'files', 'leaderboard', 'reports'].includes(hash)) {
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

    // อัปเดต URL hash
    if (window.DashboardUtils && window.DashboardUtils.updateUrlHash) {
      window.DashboardUtils.updateUrlHash(viewName);
    } else {
      window.location.hash = `#${viewName}`;
    }

    // Auto-close sidebar on mobile after navigation
    if (window.DashboardUtils && window.DashboardUtils.isMobileDevice()) {
      this.closeMobileSidebar();
    }
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
    }
  }

  async loadDashboardData() {
    try {
      await Promise.all([
        this.loadStats(),
        this.loadUpcomingTasks(),
        this.loadMiniLeaderboard()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }

  async loadCalendarData() {
    try {
      if (window.DashboardUtils && window.DashboardUtils.isMomentAvailable()) {
        const now = window.moment().tz(this.timezone);
        await this.loadCalendarEvents(now.month() + 1, now.year());
      } else {
        const now = new Date();
        await this.loadCalendarEvents(now.getMonth() + 1, now.getFullYear());
      }
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    }
  }

  async loadTasksData() {
    try {
      await Promise.all([
        this.loadTasks(),
        this.loadGroupMembers()
      ]);
    } catch (error) {
      console.error('Failed to load tasks data:', error);
    }
  }

  async loadFilesData() {
    try {
      await this.loadFiles();
    } catch (error) {
      console.error('Failed to load files data:', error);
    }
  }

  async loadLeaderboardData() {
    try {
      await this.loadLeaderboard();
    } catch (error) {
      console.error('Failed to load leaderboard data:', error);
    }
  }

  async loadReportsData() {
    try {
      await this.loadGroupMembers();
      this.initReportsUI();
    } catch (error) {
      console.error('Failed to load reports data:', error);
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
    try {
      this.showLoading();
      
      // ตรวจสอบว่ามี groupId หรือไม่
      if (this.currentGroupId === 'default' || !this.currentGroupId) {
        this.showNoGroupMessage();
        return;
      }

      console.log('Loading data for group:', this.currentGroupId);

      // Load group info
      const groupInfo = await this.api.loadGroupInfo(this.currentGroupId);
      
      if (groupInfo) {
        const groupName = groupInfo.name || 'ไม่ทราบชื่อกลุ่ม';
        const groupNameEl = document.getElementById('currentGroupName');
        if (groupNameEl) {
          groupNameEl.textContent = groupName;
        }
        console.log('Group loaded:', groupName);
        
        // Load current view data
        this.loadViewData(this.currentView);

        // ถ้ามาจากการกดปุ่ม "กรอกข้อมูลงาน" ให้เปิด modal เพิ่มงานอัตโนมัติ
        if (this.initialAction === 'new-task') {
          this.openAddTaskModal();
        }
        
        // ถ้ามาจากการกดปุ่ม "อนุมัติและเลือกวันใหม่" ให้เปิด modal แก้ไขงาน
        if (this.initialAction === 'approve_extension') {
          this.openEditTaskModal();
        }
        
        // ถ้ามี taskId parameter ให้เปิด task modal โดยอัตโนมัติ
        const taskId = this.getTaskIdFromUrl();
        if (taskId) {
          // เปลี่ยนไปหน้า tasks ก่อน แล้วค่อยเปิด modal
          this.switchView('tasks');
          // รอให้โหลดข้อมูลเสร็จแล้วค่อยเปิด modal
          setTimeout(() => {
            this.openTaskModal(taskId);
          }, 500);
        }
      } else {
        console.error('Invalid group response');
        this.showGroupNotFoundMessage();
      }
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
      
      // แสดงข้อความ error ที่ชัดเจนขึ้น
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

  // ==================== 
  // Error Messages
  // ==================== 

  showNoGroupMessage() {
    this.hideLoading();
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
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
    if (!mainContent) return;
    
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

  // ==================== 
  // Toast Notifications
  // ==================== 

  showToast(message, type = 'info') {
    if (window.DashboardUtils && window.DashboardUtils.showToast) {
      window.DashboardUtils.showToast(message, type);
    } else {
      // Fallback toast implementation
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  // ==================== 
  // Mobile Sidebar
  // ==================== 

  closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuToggle = document.getElementById('menuToggle');
    
    if (sidebar && overlay && menuToggle) {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
      menuToggle.classList.remove('active');
    }
  }

  // ==================== 
  // Placeholder Methods
  // ==================== 

  // ฟังก์ชันเหล่านี้จะถูก implement ในไฟล์อื่น
  bindEvents() {
    // ใช้ event handlers จากไฟล์ event-handlers.js
    if (window.DashboardEventHandlers && window.DashboardEventHandlers.bindAllEvents) {
      window.DashboardEventHandlers.bindAllEvents();
    } else {
      console.warn('⚠️ DashboardEventHandlers not found, events may not work properly');
    }
  }

  loadStats() {
    // ใช้ view renderer จากไฟล์ view-renderer.js
    if (window.DashboardViewRenderer && window.DashboardViewRenderer.renderDashboardStats) {
      // โหลดข้อมูล stats จาก API และ render
      this.api.loadStats(this.currentGroupId)
        .then(stats => {
          window.DashboardViewRenderer.renderDashboardStats(stats);
        })
        .catch(error => {
          console.error('Failed to load stats:', error);
          this.showToast('ไม่สามารถโหลดสถิติได้', 'error');
        });
    }
  }

  loadUpcomingTasks() {
    // ใช้ view renderer จากไฟล์ view-renderer.js
    if (window.DashboardViewRenderer && window.DashboardViewRenderer.renderUpcomingTasks) {
      // โหลดข้อมูล upcoming tasks จาก API และ render
      this.api.loadTasks(this.currentGroupId, { status: 'pending', limit: 5 })
        .then(tasks => {
          window.DashboardViewRenderer.renderUpcomingTasks(tasks);
        })
        .catch(error => {
          console.error('Failed to load upcoming tasks:', error);
        });
    }
  }

  loadMiniLeaderboard() {
    // ใช้ view renderer จากไฟล์ view-renderer.js
    if (window.DashboardViewRenderer && window.DashboardViewRenderer.renderMiniLeaderboard) {
      // โหลดข้อมูล leaderboard จาก API และ render
      this.api.loadLeaderboard(this.currentGroupId, 'weekly')
        .then(leaderboard => {
          window.DashboardViewRenderer.renderMiniLeaderboard(leaderboard);
        })
        .catch(error => {
          console.error('Failed to load leaderboard:', error);
        });
    }
  }

  loadCalendarEvents() {
    // ใช้ view renderer จากไฟล์ view-renderer.js
    if (window.DashboardViewRenderer && window.DashboardViewRenderer.renderCalendar) {
      // โหลดข้อมูล calendar events จาก API และ render
      this.api.loadTasks(this.currentGroupId)
        .then(tasks => {
          window.DashboardViewRenderer.renderCalendar(tasks);
        })
        .catch(error => {
          console.error('Failed to load calendar events:', error);
        });
    }
  }

  loadTasks() {
    // ใช้ view renderer จากไฟล์ view-renderer.js
    if (window.DashboardViewRenderer && window.DashboardViewRenderer.renderTasksList) {
      // โหลดข้อมูล tasks จาก API และ render
      this.api.loadTasks(this.currentGroupId)
        .then(tasks => {
          window.DashboardViewRenderer.renderTasksList(tasks);
        })
        .catch(error => {
          console.error('Failed to load tasks:', error);
          this.showToast('ไม่สามารถโหลดงานได้', 'error');
        });
    }
  }

  loadGroupMembers() {
    // โหลดข้อมูล group members จาก API
    this.api.loadGroupMembers(this.currentGroupId)
      .then(members => {
        // อัปเดต group selector
        this.updateGroupSelector(members);
      })
      .catch(error => {
        console.error('Failed to load group members:', error);
      });
  }

  loadFiles() {
    // ใช้ view renderer จากไฟล์ view-renderer.js
    if (window.DashboardViewRenderer && window.DashboardViewRenderer.renderFilesGrid) {
      // โหลดข้อมูล files จาก API และ render
      this.api.loadFiles(this.currentGroupId)
        .then(files => {
          window.DashboardViewRenderer.renderFilesGrid(files);
        })
        .catch(error => {
          console.error('Failed to load files:', error);
          this.showToast('ไม่สามารถโหลดไฟล์ได้', 'error');
        });
    }
  }

  loadLeaderboard() {
    // ใช้ view renderer จากไฟล์ view-renderer.js
    if (window.DashboardViewRenderer && window.DashboardViewRenderer.renderLeaderboard) {
      // โหลดข้อมูล leaderboard จาก API และ render
      this.api.loadLeaderboard(this.currentGroupId, 'weekly')
        .then(leaderboard => {
          window.DashboardViewRenderer.renderLeaderboard(leaderboard);
        })
        .catch(error => {
          console.error('Failed to load leaderboard:', error);
          this.showToast('ไม่สามารถโหลดอันดับได้', 'error');
        });
    }
  }

  initReportsUI() {
    // ใช้ view renderer จากไฟล์ view-renderer.js
    if (window.DashboardViewRenderer && window.DashboardViewRenderer.renderReports) {
      // โหลดข้อมูล reports จาก API และ render
      this.api.loadReports(this.currentGroupId)
        .then(reports => {
          window.DashboardViewRenderer.renderReports(reports);
        })
        .catch(error => {
          console.error('Failed to load reports:', error);
        });
    }
  }

  openAddTaskModal() {
    // จะถูก implement ใน modal-manager.js
  }

  openEditTaskModal() {
    // จะถูก implement ใน modal-manager.js
  }

  openTaskModal() {
    // จะถูก implement ใน modal-manager.js
  }
}

// Export สำหรับใช้ในไฟล์อื่น
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = Dashboard;
} else {
  // Browser environment - เพิ่มเข้าไปใน global scope
  window.Dashboard = Dashboard;
}
