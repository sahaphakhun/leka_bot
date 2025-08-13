// Profile page logic (non-LIFF)
(function() {
  const app = document.getElementById('app');
  if (!app) return;

  const userId = app.getAttribute('data-user-id') || '';
  const displayName = app.getAttribute('data-display-name') || '';
  const realName = app.getAttribute('data-real-name') || '';
  const email = app.getAttribute('data-email') || '';
  const timezone = app.getAttribute('data-timezone') || 'Asia/Bangkok';
  const postUrl = app.getAttribute('data-post-url') || '/dashboard/profile';

  document.getElementById('displayName').textContent = displayName || '-';
  document.getElementById('realName').value = realName || '';
  document.getElementById('email').value = email || '';
  document.getElementById('timezone').value = timezone || 'Asia/Bangkok';
  document.getElementById('emailStatus').innerHTML = email ? `อีเมล: ${email} ✅` : 'อีเมล: ยังไม่ได้ลิงก์ ❌';

  const successEl = document.getElementById('success');
  const errorEl = document.getElementById('error');

  document.getElementById('profileForm').addEventListener('submit', function(e) {
    e.preventDefault();
    successEl.style.display = 'none';
    errorEl.style.display = 'none';

    const saveButton = document.getElementById('saveButton');
    saveButton.disabled = true;
    saveButton.textContent = 'กำลังบันทึก...';

    const payload = {
      userId: userId,
      realName: document.getElementById('realName').value,
      email: document.getElementById('email').value,
      timezone: document.getElementById('timezone').value
    };

    fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
      if (data && data.success) {
        successEl.style.display = 'block';
        document.getElementById('emailStatus').innerHTML = payload.email ? `อีเมล: ${payload.email} ✅` : 'อีเมล: ยังไม่ได้ลิงก์ ❌';
      } else {
        errorEl.textContent = 'เกิดข้อผิดพลาด: ' + (data && data.error ? data.error : 'ไม่ทราบสาเหตุ');
        errorEl.style.display = 'block';
      }
    })
    .catch(err => {
      console.error(err);
      errorEl.textContent = 'เกิดข้อผิดพลาดในการบันทึก';
      errorEl.style.display = 'block';
    })
    .finally(() => {
      saveButton.disabled = false;
      saveButton.textContent = 'บันทึกข้อมูล';
    });
  });
})();

/**
 * เลขาบอท Dashboard JavaScript
 * ===============================
 */

// เพิ่ม moment-timezone สำหรับการจัดการเวลา
let moment;
if (typeof require !== 'undefined') {
  // Node.js environment
  moment = require('moment-timezone');
} else if (typeof window !== 'undefined' && window.moment) {
  // Browser environment - ใช้ moment ที่โหลดจาก CDN
  moment = window.moment;
} else {
  // Browser environment - ต้องโหลด moment-timezone จาก CDN
  console.warn('⚠️ moment-timezone ไม่ได้โหลด กรุณาเพิ่ม script tag ใน HTML');
}

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
    
    this.init();
  }

  // ==================== 
  // Initialization
  // ==================== 

  init() {
    this.bindEvents();
    this.loadInitialData();
    this.hideLoading();

    // เมื่อไม่มี userId ให้ปิดปุ่ม action ที่ต้องการตัวตน
    if (!this.currentUserId) {
      const needUserButtons = ['addTaskBtn', 'submitTaskBtn', 'reviewTaskBtn'];
      needUserButtons.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.setAttribute('disabled', 'true');
          el.classList.add('disabled');
          el.title = 'โปรดเข้าผ่านลิงก์จากบอทเพื่อระบุตัวตน (userId)';
        }
      });
      const hint = document.getElementById('actionHint');
      if (hint) hint.style.display = 'block';
    }
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

    // View mode toggles (เหลือเฉพาะเดือน)
    document.querySelectorAll('[data-view-mode]')?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget || e.target;
        const mode = target && target.dataset ? target.dataset.viewMode : undefined;
        // รองรับเฉพาะ month ณ ตอนนี้
        if (mode === 'month') this.switchCalendarMode(mode);
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

    // Success modal buttons
    document.getElementById('successModalClose')?.addEventListener('click', () => this.closeModal('successModal'));
    document.getElementById('stayHereBtn')?.addEventListener('click', () => this.closeModal('successModal'));

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
        const target = e.currentTarget || e.target;
        const period = target && target.dataset ? target.dataset.period : undefined;
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

  // (คงไว้ฟังก์ชัน showNoGroupMessage เวอร์ชันเดียวด้านล่าง เพื่อหลีกเลี่ยงโค้ดซ้ำ)

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
    if (moment) {
      return moment(date).tz(this.timezone).format('DD MMMM YYYY');
    }
    // fallback to native Date if moment is not available
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(date) {
    if (moment) {
      return moment(date).tz(this.timezone).format('DD MMM YYYY HH:mm');
    }
    // fallback to native Date if moment is not available
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
      // เก็บ filters ล่าสุดไว้สำหรับ pagination
      this._lastTaskFilters = { ...(this._lastTaskFilters || {}), ...(filters || {}) };

      const queryParams = new URLSearchParams(this._lastTaskFilters).toString();
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/tasks?${queryParams}`);
      // เก็บ cache งานไว้ใช้เปิด modal โดยไม่ต้องพึ่งพา search param ฝั่ง API
      this._taskCache = response.data || [];
      this.updateTasksList(this._taskCache, response.pagination);
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
        for (let i = 0; i < files.length; i++) formData.append('attachments', files[i]);

        try {
          const resp = await fetch(`${this.apiBase}/api/groups/${this.currentGroupId}/files/upload`, {
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
      // ลองดึงจาก LINE API ก่อน (ข้อมูลอัปเดต)
      try {
        const lineResponse = await this.apiRequest(`/line/members/${this.currentGroupId}`);
        if (lineResponse && lineResponse.data && lineResponse.data.length > 0) {
          // แปลงข้อมูลจาก LINE API ให้เข้ากับ format เดิม
          const formattedMembers = lineResponse.data.map(member => ({
            id: member.userId,
            lineUserId: member.userId,
            displayName: member.displayName,
            pictureUrl: member.pictureUrl
          }));
          this.updateMembersList(formattedMembers);
          return;
        }
      } catch (lineError) {
        console.warn('Failed to load LINE members, falling back to database:', lineError);
      }

      // Fallback: ดึงจากฐานข้อมูล
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/members`);
      this.updateMembersList(response.data);
    } catch (error) {
      console.error('Failed to load group members:', error);
    }
  }

  /**
   * ดึงรายชื่อสมาชิกจาก LINE API โดยตรง
   */
  async loadLineMembers() {
    try {
      const response = await this.apiRequest(`/line/members/${this.currentGroupId}`);
      if (response && response.data) {
        // แปลงข้อมูลจาก LINE API ให้เข้ากับ format เดิม
        const formattedMembers = response.data.map(member => ({
          id: member.userId,
          lineUserId: member.userId,
          displayName: member.displayName,
          pictureUrl: member.pictureUrl
        }));
        this.updateMembersList(formattedMembers);
        return formattedMembers;
      }
    } catch (error) {
      console.error('Failed to load LINE members:', error);
      throw error;
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
      // เปิด success modal เพื่อให้ผู้ใช้กดกลับไป LINE ได้
      document.getElementById('successMessage').textContent = 'บอทจะแจ้งในกลุ่ม LINE เพื่อยืนยันการสร้างงาน';
      document.getElementById('successModal').classList.add('active');
      this.refreshCurrentView();
      // อัปเดต cache
      try {
        this._taskCache = Array.from(new Map([...(this._taskCache||[]), response.data].map(t => [t.id, t])).values());
      } catch {}
      
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
        {
          const exportBtn = document.getElementById('exportBtn');
          if (exportBtn && !exportBtn._bound) {
            exportBtn.addEventListener('click', () => this.exportReports('csv'));
            exportBtn._bound = true;
          }
        }
        // ปุ่มแจ้งเตือนถูกลบออกจาก UI แล้ว
        break;
      case 'calendar':
        if (moment) {
          const now = moment().tz(this.timezone);
          this.loadCalendarEvents(now.month() + 1, now.year());
        } else {
          const now = new Date();
          this.loadCalendarEvents(now.getMonth() + 1, now.getFullYear());
        }
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
      case 'reports':
        this.loadGroupMembers().then(() => this.initReportsUI());
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
      // อัปเดต cache ด้วยรายการล่าสุดบางส่วน เพื่อให้เปิด modal ได้แม้ยังไม่กดเข้า view Tasks
      const latest = response.data || [];
      this._taskCache = Array.from(new Map([...(this._taskCache||[]), ...latest].map(t => [t.id, t])).values());
      this.updateUpcomingTasks(latest);
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
  // ==================== 
  // Reports (Executive)
  // ==================== 

  initReportsUI() {
    const periodSel = document.getElementById('reportPeriodSelect');
    const sd = document.getElementById('reportStartDate');
    const ed = document.getElementById('reportEndDate');
    const runBtn = document.getElementById('runReportBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    // toggle custom period inputs
    const toggleCustom = () => {
      const isCustom = periodSel.value === 'custom';
      sd.style.display = isCustom ? 'inline-block' : 'none';
      ed.style.display = isCustom ? 'inline-block' : 'none';
    };
    periodSel.addEventListener('change', toggleCustom);
    toggleCustom();

    runBtn.addEventListener('click', () => this.runReports());
    exportExcelBtn.addEventListener('click', () => this.exportReports('csv'));
    if (exportPdfBtn) {
      exportPdfBtn.style.display = 'none';
    }

    // load recipients UI
    this.renderReportRecipients();
    document.getElementById('saveRecipientsBtn')?.addEventListener('click', () => this.saveReportRecipients());
  }

  getReportQuery() {
    const period = document.getElementById('reportPeriodSelect').value;
    const userId = document.getElementById('reportUserSelect').value;
    const sd = document.getElementById('reportStartDate').value;
    const ed = document.getElementById('reportEndDate').value;
    const q = new URLSearchParams();
    if (period !== 'custom') q.set('period', period);
    if (period === 'custom' && sd && ed) {
      q.set('startDate', sd);
      q.set('endDate', ed);
    }
    if (userId) q.set('userId', userId);
    return q.toString();
  }

  async runReports() {
    try {
      const q = this.getReportQuery();
      const summary = await this.apiRequest(`/groups/${this.currentGroupId}/reports/summary?${q}`);
      const byUsers = await this.apiRequest(`/groups/${this.currentGroupId}/reports/by-users?${q}`);
      this.updateReportsSummary(summary.data);
      this.updateReportsUsers(byUsers.data);
      this.renderReportCharts(summary.data, byUsers.data);
      this.showToast('แสดงรายงานสำเร็จ', 'success');
    } catch (err) {
      console.error('runReports error:', err);
    }
  }

  updateReportsSummary(data) {
    const t = data?.totals || {};
    document.getElementById('repCompleted').textContent = t.completed || 0;
    document.getElementById('repEarly').textContent = t.early || 0;
    document.getElementById('repOntime').textContent = t.ontime || 0;
    document.getElementById('repLate').textContent = t.late || 0;
    document.getElementById('repOvertime').textContent = t.overtime || 0;
    document.getElementById('repCompletionRate').textContent = (t.completionRate || 0) + '%';
  }

  updateReportsUsers(rows) {
    const tb = document.getElementById('repUsersTable');
    if (!rows || rows.length === 0) { tb.innerHTML = '<tr><td colspan="6" style="padding:8px; color:#6b7280;">ไม่มีข้อมูล</td></tr>'; return; }
    tb.innerHTML = rows.map(r => `
      <tr style="border-bottom: 1px solid #f0f0f0;">
        <td style="padding:8px;">${r.displayName}</td>
        <td style="padding:8px;">${r.completed}</td>
        <td style="padding:8px;">${r.early}</td>
        <td style="padding:8px;">${r.ontime}</td>
        <td style="padding:8px;">${r.late}</td>
        <td style="padding:8px;">${r.overtime}</td>
      </tr>
    `).join('');
  }

  renderReportCharts(summary, rows) {
    const distEl = document.getElementById('repDistChart');
    const barEl = document.getElementById('repUserBarChart');
    if (!distEl || !barEl) return;
    const totals = summary?.totals || {};
    // สร้างกราฟอย่างง่ายด้วย Canvas 2D (placeholder minimal)
    const drawPie = (el, values, colors) => {
      const ctx = el.getContext('2d');
      const sum = values.reduce((a,b)=>a+b,0) || 1;
      let start = 0;
      const cx = el.width/2, cy = el.height/2, r = Math.min(cx, cy) - 10;
      ctx.clearRect(0,0,el.width, el.height);
      values.forEach((v, i) => {
        const angle = (v/sum)*Math.PI*2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, start+angle);
        ctx.closePath();
        ctx.fillStyle = colors[i] || '#ccc';
        ctx.fill();
        start += angle;
      });
    };
    const drawBars = (el, labels, data) => {
      const ctx = el.getContext('2d');
      ctx.clearRect(0,0,el.width, el.height);
      const w = el.width, h = el.height, pad = 24, bw = Math.max(10, (w - pad*2)/Math.max(1, data.length) - 8);
      const maxV = Math.max(1, Math.max(...data));
      data.forEach((v, i) => {
        const x = pad + i*(bw+8);
        const bh = (v/maxV)*(h - pad*2);
        const y = h - pad - bh;
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(x, y, bw, bh);
      });
    };

    drawPie(distEl, [totals.early||0, totals.ontime||0, totals.late||0, totals.overtime||0], ['#10b981','#3b82f6','#f59e0b','#ef4444']);
    const labels = rows.map(r=>r.displayName);
    const data = rows.map(r=>r.completed);
    drawBars(barEl, labels, data);
  }

  async exportReports(format='csv') {
    try {
      const period = document.getElementById('reportPeriodSelect').value;
      let startDate = document.getElementById('reportStartDate').value;
      let endDate = document.getElementById('reportEndDate').value;
      if (period !== 'custom') {
        if (moment) {
          // ใช้ moment-timezone สำหรับการจัดการเวลา
          const now = moment().tz(this.timezone);
          if (period === 'weekly') {
            const startOfWeek = now.clone().startOf('week');
            const endOfWeek = now.clone().endOf('week');
            startDate = startOfWeek.toISOString();
            endDate = endOfWeek.toISOString();
          } else {
            const startOfMonth = now.clone().startOf('month');
            const endOfMonth = now.clone().endOf('month');
            startDate = startOfMonth.toISOString();
            endDate = endOfMonth.toISOString();
          }
        } else {
          // fallback to native Date
          const d = new Date();
          if (period === 'weekly') {
            const day = d.getDay();
            const diffToMonday = (day === 0 ? 6 : day - 1);
            const s = new Date(d); s.setDate(d.getDate()-diffToMonday); s.setHours(0,0,0,0);
            const e = new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999);
            startDate = s.toISOString(); endDate = e.toISOString();
          } else {
            const s = new Date(d.getFullYear(), d.getMonth(), 1);
            const e = new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999);
            startDate = s.toISOString(); endDate = e.toISOString();
          }
        }
      }
      const url = `${this.apiBase}/api/groups/${this.currentGroupId}/reports/export?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&format=${format}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('exportReports error:', error);
      this.showToast('ส่งออกไม่สำเร็จ', 'error');
    }
  }

  async renderReportRecipients() {
    try {
      const groupResp = await this.apiRequest(`/groups/${this.currentGroupId}`);
      const membersResp = await this.apiRequest(`/groups/${this.currentGroupId}/members`);
      const current = groupResp?.data?.settings?.reportRecipients || [];
      const members = membersResp?.data || [];
      const wrap = document.getElementById('reportRecipientsList');
      wrap.innerHTML = members.map(m => {
        const checked = current.includes(m.lineUserId) ? 'checked' : '';
        return `<label style="display:flex; gap:8px; align-items:center; background:#fff; border:1px solid #eee; border-radius:8px; padding:8px;">
          <input type="checkbox" value="${m.lineUserId}" ${checked} />
          <span>${m.displayName}</span>
        </label>`;
      }).join('');
    } catch (err) {
      console.error('renderReportRecipients error:', err);
    }
  }

  async saveReportRecipients() {
    try {
      const wrap = document.getElementById('reportRecipientsList');
      const selected = Array.from(wrap.querySelectorAll('input[type="checkbox"]:checked')).map((el)=>el.value);
      await this.apiRequest(`/groups/${this.currentGroupId}/settings/report-recipients`, {
        method: 'POST',
        body: JSON.stringify({ recipients: selected })
      });
      this.showToast('บันทึกผู้รับรายงานสำเร็จ', 'success');
    } catch (err) {
      console.error('saveReportRecipients error:', err);
      this.showToast('บันทึกผู้รับรายงานไม่สำเร็จ', 'error');
    }
  }

  updateStats(stats) {
    const weekly = (stats && stats.weekly) || {};
    document.getElementById('totalTasks').textContent = weekly.totalTasks || 0;
    document.getElementById('pendingTasks').textContent = weekly.pendingTasks || 0;
    document.getElementById('completedTasks').textContent = weekly.completedTasks || 0;
    document.getElementById('overdueTasks').textContent = weekly.overdueTasks || 0;
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
            ${task.assignedUsers && task.assignedUsers.length > 0 ? 
              `<span><i class=\"fas fa-user\"></i> ${task.assignedUsers.length} คน</span>` : ''
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
          ${(user.tasksCompleted ?? user.completedTasks) || 0} งาน
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
            ${task.assignedUsers && task.assignedUsers.length > 0 ? 
              `<span><i class=\"fas fa-user\"></i> ${task.assignedUsers.length} คน</span>` : ''
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
    let today;
    if (moment) {
      today = moment().tz(this.timezone);
    } else {
      today = new Date();
    }
    const isCurrentMonth = today.year() === year && today.month() === month - 1;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && today.date() === day;
      const dayEvents = events.filter(event => {
        let eventDate;
        if (moment) {
          eventDate = moment(event.end || event.dueTime || event.start).tz(this.timezone);
        } else {
          eventDate = new Date(event.end || event.dueTime || event.start);
        }
        return (
          eventDate.year() === year &&
          (eventDate.month() + 1) === month &&
          eventDate.date() === day
        );
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
            เสร็จ ${(user.tasksCompleted ?? user.completedTasks) || 0} งาน • คะแนน ${user.totalPoints}
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
      // ใช้ lineUserId สำหรับการสร้างงานแบบ recurring และความเข้ากันได้กับ backend
      select.innerHTML = members.map(member => 
        `<option value="${member.lineUserId || member.id}">${member.displayName}</option>`
      ).join('');
    }
    
    if (filter) {
      // ส่งค่าเป็น lineUserId ให้ backend แปลงเป็น internal id ถูกต้อง
      filter.innerHTML = '<option value="">ผู้รับผิดชอบทั้งหมด</option>' + 
        members.map(member => 
          `<option value="${member.lineUserId || member.id}">${member.displayName}</option>`
        ).join('');
    }

    if (reviewerSelect) {
      reviewerSelect.innerHTML = '<option value="">(ไม่ระบุ)</option>' +
        members.map(member => `<option value="${member.lineUserId || member.id}">${member.displayName}</option>`).join('');

      // ตั้งค่า default ผู้ตรวจงาน = ผู้สร้างงาน (current user)
      if (this.currentUserId) {
        const hasCurrent = Array.from(reviewerSelect.options).some(opt => opt.value === this.currentUserId);
        if (hasCurrent) {
          reviewerSelect.value = this.currentUserId;
        }
      }
    }
  }

  // ==================== 
  // Modal Management
  // ==================== 

  openAddTaskModal() {
    document.getElementById('addTaskModal').classList.add('active');
    this.loadGroupMembers(); // Load members for assignee selection

    // ตั้งค่า UI Recurrence
    const recurrenceType = document.getElementById('recurrenceType');
    const cfg = document.getElementById('recurrenceConfig');
    const weekSel = document.getElementById('weekDaySelect');
    const domInput = document.getElementById('dayOfMonthInput');
    const timeInput = document.getElementById('timeOfDayInput');
    if (recurrenceType && cfg && weekSel && domInput && timeInput && !recurrenceType._bound) {
      recurrenceType.addEventListener('change', () => {
        const v = recurrenceType.value;
        if (v === 'none') {
          cfg.style.display = 'none';
          weekSel.style.display = 'none';
          domInput.style.display = 'none';
        } else {
          cfg.style.display = 'block';
          if (v === 'weekly') {
            weekSel.style.display = 'block';
            domInput.style.display = 'none';
          } else {
            weekSel.style.display = 'none';
            domInput.style.display = 'inline-block';
          }
        }
      });
      recurrenceType._bound = true;
    }
  }

  openTaskModal(taskId) {
    // ใช้ cache จาก loadTasks ล่าสุด เพื่อไม่ต้องพึ่ง API search ที่ฝั่ง backend ยังไม่รองรับ
    const findInCache = () => (this._taskCache || []).find(t => t.id === taskId);
    const task = findInCache();
    const body = document.getElementById('taskModalBody');
    if (!task) { this.showToast('ไม่พบข้อมูลงาน', 'error'); return; }
    if (!body) { return; }
    const assignees = (task.assignedUsers || task.assignees || []).map(u => u.displayName || u.name).join(', ') || '-';
    const tags = (task.tags || []).map(t => `#${t}`).join(' ');
    body.innerHTML = `
      <div style="display:grid; gap:8px;">
        <div><strong>ชื่องาน:</strong> ${task.title}</div>
        <div><strong>รายละเอียด:</strong> ${task.description || '-'}</div>
        <div><strong>กำหนดส่ง:</strong> ${this.formatDateTime(task.dueTime)}</div>
        <div><strong>ผู้รับผิดชอบ:</strong> ${assignees}</div>
        ${tags ? `<div><strong>แท็ก:</strong> ${tags}</div>` : ''}
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn btn-primary" onclick="dashboard.openSubmitModal('${task.id}')"><i class='fas fa-paperclip'></i> ส่งงาน</button>
        </div>
      </div>`;
    document.getElementById('taskModalTitle').textContent = 'รายละเอียดงาน';
    document.getElementById('taskModal').classList.add('active');
  }

  openSubmitModal(taskId) {
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
      dueTime: this.formatDateForAPI(formData.get('dueDate')),
      priority: formData.get('priority'),
      assigneeIds: Array.from(document.getElementById('taskAssignees').selectedOptions)
        .map(option => option.value),
      tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : [],
      createdBy: this.currentUserId || 'unknown',
      requireAttachment: document.getElementById('requireAttachment').checked,
      reviewerUserId: document.getElementById('reviewerSelect')?.value || this.currentUserId || undefined
    };
    
    // ถ้าเลือกเป็นงานประจำ ให้สร้าง recurring template แทน
    const recurrenceType = document.getElementById('recurrenceType')?.value || 'none';
    if (recurrenceType !== 'none') {
      try {
        const payload = {
          title: taskData.title,
          description: taskData.description,
          assigneeLineUserIds: taskData.assigneeIds, // รองรับ LINE IDs ได้ใน backend
          reviewerLineUserId: taskData.reviewerUserId,
          requireAttachment: taskData.requireAttachment,
          priority: taskData.priority,
          tags: taskData.tags,
          recurrence: recurrenceType, // 'weekly' | 'monthly' | 'quarterly'
          weekDay: recurrenceType === 'weekly' ? parseInt(document.getElementById('weekDaySelect').value || '1', 10) : undefined,
          dayOfMonth: (recurrenceType === 'monthly' || recurrenceType === 'quarterly') ? parseInt(document.getElementById('dayOfMonthInput').value || '1', 10) : undefined,
          timeOfDay: document.getElementById('timeOfDayInput').value || '09:00',
          timezone: this.timezone, // ใช้ timezone ที่ตั้งค่าไว้ใน class
          createdBy: this.currentUserId || 'unknown'
        };
        await this.apiRequest(`/groups/${this.currentGroupId}/recurring`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        this.showToast('สร้างงานประจำสำเร็จ', 'success');
        this.closeModal('addTaskModal');
        document.getElementById('successMessage').textContent = 'ตั้งค่างานประจำสำเร็จ บอทจะสร้างงานตามรอบเวลาในกลุ่ม LINE';
        document.getElementById('successModal').classList.add('active');
      } catch (err) {
        console.error('Failed to create recurring:', err);
        this.showToast('สร้างงานประจำไม่สำเร็จ', 'error');
      }
    } else {
      await this.createTask(taskData);
    }
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
    
    // โหมดยังเป็น placeholder แสดงผลเดือนเป็นหลัก (พร้อมไว้ต่อยอด)
    if (moment) {
      const now = moment().tz(this.timezone);
      this.loadCalendarEvents(now.month() + 1, now.year());
    } else {
      const now = new Date();
      this.loadCalendarEvents(now.getMonth() + 1, now.getFullYear());
    }
  }

  async populateReviewTaskSelect(selectedTaskId = '') {
    try {
      // โหลดงานสถานะ pending หรือ in_progress เพื่อให้ผู้ตรวจเลือก
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/tasks?status=pending`);
      const response2 = await this.apiRequest(`/groups/${this.currentGroupId}/tasks?status=in_progress`);
      const tasks = [...(response.data || []), ...(response2.data || [])];
      // อัปเดต cache รวมนอกเหนือจาก list หลัก เพื่อให้ openTaskModal ใช้ได้กว้างขึ้น
      this._taskCache = Array.from(new Map([...(this._taskCache||[]), ...tasks].map(t => [t.id, t])).values());
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
      // ส่ง ISO string เพื่อลด edge case timezone และใช้ moment-timezone
      const isoDue = this.formatDateForAPI(newDue);
      const res = await this.apiRequest(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({
          dueTime: isoDue,
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
    const header = document.getElementById('currentMonth').textContent || '';
    const parts = header.split(' ');
    const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const currentMonthIdx = months.indexOf(parts[0]);
    const currentYear = parseInt(parts[1]) || new Date().getFullYear();
    let m = currentMonthIdx + 1 + direction;
    let y = currentYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    this.loadCalendarEvents(m, y);
  }

  onCalendarDayClick(year, month, day) {
    // กรองงานของวันนั้น แล้วเปิด modal รายการย่อ
    this.apiRequest(`/groups/${this.currentGroupId}/calendar?month=${month}&year=${year}`)
      .then(resp => {
        const events = (resp.data || []).filter(ev => {
          let eventDate;
          if (moment) {
            eventDate = moment(ev.end || ev.dueTime || ev.start).tz(this.timezone);
          } else {
            eventDate = new Date(ev.end || ev.dueTime || ev.start);
          }
          return (
            eventDate.year() === year &&
            (eventDate.month() + 1) === month &&
            eventDate.date() === day
          );
        });
        const body = document.getElementById('taskModalBody');
        if (!body) return;
        if (events.length === 0) { this.showToast('ไม่มีงานในวันนี้', 'info'); return; }
        body.innerHTML = events.map(ev => `
          <div class="task-item" onclick="dashboard.openTaskModal('${ev.id}')">
            <div class="task-priority ${ev.priority}"></div>
            <div class="task-content">
              <div class="task-title">${ev.title}</div>
              <div class="task-meta"><span><i class='fas fa-clock'></i> ${this.formatDateTime(ev.end || ev.dueTime)}</span></div>
            </div>
            <div class="task-status ${ev.status}">${this.getStatusText(ev.status)}</div>
          </div>`).join('');
        document.getElementById('taskModalTitle').textContent = `งานวันที่ ${day}/${month}/${year}`;
        document.getElementById('taskModal').classList.add('active');
      })
      .catch(() => this.showToast('โหลดข้อมูลวันไม่สำเร็จ', 'error'));
  }

  filterTasks() {
    const status = document.getElementById('statusFilter')?.value;
    const assignee = document.getElementById('assigneeFilter')?.value;
    const search = document.getElementById('searchTasks')?.value;
    
    const filters = {};
    if (status) filters.status = status;
    if (assignee) filters.assignee = assignee; // ส่ง lineUserId
    // UI จะกรองภายหลังด้วย cache ถ้า backend ไม่รองรับ search; ส่งไปเพื่ออนาคตแต่ไม่พึ่งพา
    if (search) filters.search = search;
    
    this.loadTasks(filters).then(() => {
      // ถ้ามี search และ backend ไม่รองรับ ให้กรองในฝั่ง UI จาก cache
      if (search && Array.isArray(this._taskCache)) {
        const lowered = (search || '').toLowerCase();
        const filtered = this._taskCache.filter(t => {
          return (
            (t.title || '').toLowerCase().includes(lowered) ||
            (t.description || '').toLowerCase().includes(lowered) ||
            (t.tags || []).some(tag => String(tag).toLowerCase().includes(lowered)) ||
            String(t.id || '').toLowerCase().startsWith(lowered)
          );
        });
        this.updateTasksList(filtered);
      }
    });
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
    const main = document.querySelector('.main-content');
    if (!main) return;
    main.innerHTML = `
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
    const main = document.querySelector('.main-content');
    if (!main) return;
    main.innerHTML = `
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
      const prev = new URLSearchParams({ ...(this._lastTaskFilters || {}), page: String(pagination.page - 1) }).toString();
      paginationHTML += `<button class="btn btn-outline" onclick="dashboard.loadTasks(Object.fromEntries(new URLSearchParams('${prev}')))">ก่อนหน้า</button>`;
    }
    
    // Page info
    paginationHTML += `<span style="padding: 8px 12px; color: #6b7280;">หน้า ${pagination.page} จาก ${pagination.totalPages}</span>`;
    
    // Next button
    if (pagination.page < pagination.totalPages) {
      const next = new URLSearchParams({ ...(this._lastTaskFilters || {}), page: String(pagination.page + 1) }).toString();
      paginationHTML += `<button class="btn btn-outline" onclick="dashboard.loadTasks(Object.fromEntries(new URLSearchParams('${next}')))">ถัดไป</button>`;
    }
    
    paginationHTML += '</div>';
    container.innerHTML = paginationHTML;
  }

  // เพิ่มฟังก์ชันสำหรับการจัดการวันที่ปัจจุบัน
  getCurrentDate() {
    if (moment) {
      return moment().tz(this.timezone);
    }
    return new Date();
  }

  // เพิ่มฟังก์ชันสำหรับการแปลงวันที่ให้เป็น timezone ที่ถูกต้อง
  formatDateForAPI(date) {
    if (moment) {
      return moment(date).tz(this.timezone).toISOString();
    }
    return new Date(date).toISOString();
  }
}

// Initialize Dashboard
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new Dashboard();
  // Expose after init to ensure handlers can access
  window.dashboard = dashboard;
});
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new Dashboard();
  // Expose after init to ensure handlers can access
  window.dashboard = dashboard;
});