// Profile page logic
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

// เพิ่ม moment-timezone สำหรับการจัดการเวลา (CDN version)
let moment;
if (typeof require !== 'undefined') {
  // Node.js environment
  moment = require('moment-timezone');
} else if (typeof window !== 'undefined' && window.moment) {
  // Browser environment - ใช้ moment ที่โหลดจาก CDN
  moment = window.moment;
  
  // ตรวจสอบว่า moment-timezone โหลดสำเร็จหรือไม่
  if (moment && moment.tz) {
    console.log('✅ moment-timezone โหลดสำเร็จ (CDN version)');
    // ตั้งค่า timezone เริ่มต้น
    moment.tz.setDefault('Asia/Bangkok');
  } else {
    console.warn('⚠️ moment-timezone ไม่ได้โหลด กรุณาตรวจสอบ CDN');
    // ใช้ moment ปกติแทน
    moment = window.moment;
  }
} else {
  // Browser environment - ต้องโหลด moment จาก CDN
  console.warn('⚠️ moment ไม่ได้โหลด กรุณาตรวจสอบ CDN');
  // สร้าง mock moment object เพื่อป้องกัน error
  moment = {
    format: (format) => new Date().toLocaleString('th-TH'),
    tz: (timezone) => new Date().toLocaleString('th-TH'),
    setDefault: () => {},
    utc: () => new Date(),
    unix: (timestamp) => new Date(timestamp * 1000)
  };
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

    // File Viewer Modal handlers
    document.getElementById('fileViewerClose')?.addEventListener('click', () => {
      this.closeModal('fileViewerModal');
    });
    
    // ปิด File Viewer Modal เมื่อคลิกนอก content
    document.getElementById('fileViewerModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'fileViewerModal') {
        this.closeModal('fileViewerModal');
      }
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

    // Edit task modal handlers
    document.getElementById('editTaskModalClose')?.addEventListener('click', () => {
      this.closeModal('editTaskModal');
    });
    document.getElementById('editTaskCancelBtn')?.addEventListener('click', () => {
      this.closeModal('editTaskModal');
    });
    document.getElementById('editTaskForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleEditTask();
    });

    // Forms
    document.getElementById('addTaskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      
      // ป้องกันการส่งฟอร์มซ้ำ
      const submitBtn = e.target.querySelector('button[type="submit"], #addTaskSubmitBtn');
      if (submitBtn && submitBtn.disabled) {
        console.log('⚠️ Form submission already in progress, ignoring duplicate request');
        return;
      }
      
      this.handleAddTask();
    });

    // Initial files handling
    document.getElementById('initialFiles').addEventListener('change', (e) => {
      this.handleInitialFilesChange(e);
    });

    // Real-time validation for add task form
    document.getElementById('taskTitle')?.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      if (value) {
        this.showFieldSuccess('taskTitle');
      } else {
        this.showFieldError('taskTitle', 'กรุณากรอกชื่องาน');
      }
    });

    document.getElementById('taskDueDate')?.addEventListener('change', (e) => {
      const value = e.target.value;
      if (value) {
        this.showFieldSuccess('taskDueDate');
      } else {
        this.showFieldError('taskDueDate', 'กรุณาเลือกวันที่ครบกำหนด');
      }
    });

    // Files view search & upload
    document.getElementById('searchFiles')?.addEventListener('input', this.debounce(() => {
      this.filterFiles();
    }, 300));
    
    document.getElementById('taskFilter')?.addEventListener('change', () => {
      this.filterFiles();
    });
    
    document.getElementById('fileTypeFilter')?.addEventListener('change', () => {
      this.filterFiles();
    });

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

    // Event delegation for dynamically created elements
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-task-id]');
      if (target) {
        const taskId = target.dataset.taskId;
        this.openTaskModal(taskId);
        return;
      }

      const fileTarget = e.target.closest('[data-file-id]');
      if (fileTarget) {
        const fileId = fileTarget.dataset.fileId;
        this.downloadFile(fileId);
        return;
      }

      const calendarTarget = e.target.closest('[data-year]');
      if (calendarTarget) {
        const year = parseInt(calendarTarget.dataset.year);
        const month = parseInt(calendarTarget.dataset.month);
        const day = parseInt(calendarTarget.dataset.day);
        this.onCalendarDayClick(year, month, day);
        return;
      }

      const paginationTarget = e.target.closest('[data-pagination]');
      if (paginationTarget) {
        const direction = paginationTarget.dataset.pagination;
        const params = paginationTarget.dataset.params;
        if (params) {
          this.loadTasks(Object.fromEntries(new URLSearchParams(params)));
        }
        return;
      }

      const submitTarget = e.target.closest('button[data-task-id]');
      if (submitTarget && submitTarget.classList.contains('btn-primary')) {
        const taskId = submitTarget.dataset.taskId;
        this.openSubmitModal(taskId);
        return;
      }
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

  /**
   * Safely get current time with fallback to native Date
   */
  getSafeCurrentTime() {
    if (moment && typeof moment === 'function' && moment.tz && typeof moment.tz === 'function') {
      try {
        return moment().tz(this.timezone);
      } catch (error) {
        console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
        return new Date();
      }
    } else {
      return new Date();
    }
  }

  // ฟังก์ชันแปลงปี ค.ศ. เป็น พ.ศ.
  convertToThaiYear(year) {
    return year + 543;
  }

  /**
   * ตรวจสอบว่า moment.js พร้อมใช้งานหรือไม่
   */
  isMomentAvailable() {
    return moment && typeof moment === 'function' && moment.tz && typeof moment.tz === 'function';
  }

  /**
   * แปลงวันที่เป็น ISO string สำหรับ API
   */
  formatDateForAPI(date) {
    if (!date) return null;
    
    try {
      if (this.isMomentAvailable()) {
        return moment(date).tz(this.timezone).toISOString();
      } else {
        // fallback to native Date
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return null;
        
        // Adjust for Bangkok timezone
        const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
        const bangkokTime = new Date(utc + (7 * 3600000));
        return bangkokTime.toISOString();
      }
    } catch (error) {
      console.error('❌ Error formatting date for API:', error);
      return null;
    }
  }

  /**
   * แปลงวันที่จาก API เป็น Date object
   */
  parseDateFromAPI(dateString) {
    if (!dateString) return null;
    
    try {
      if (this.isMomentAvailable()) {
        return moment(dateString).tz(this.timezone).toDate();
      } else {
        // fallback to native Date
        const dateObj = new Date(dateString);
        if (isNaN(dateObj.getTime())) return null;
        return dateObj;
      }
    } catch (error) {
      console.error('❌ Error parsing date from API:', error);
      return null;
    }
  }

  /**
   * แปลงวันที่เป็นรูปแบบสำหรับ input datetime-local
   */
  formatDateForForm(date) {
    if (!date) return '';
    
    try {
      if (this.isMomentAvailable()) {
        return moment(date).tz(this.timezone).format('YYYY-MM-DD');
      } else {
        // fallback to native Date
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '';
        
        // Adjust for Bangkok timezone
        const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
        const bangkokTime = new Date(utc + (7 * 3600000));
        
        const year = bangkokTime.getFullYear();
        const month = (bangkokTime.getMonth() + 1).toString().padStart(2, '0');
        const day = bangkokTime.getDate().toString().padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      console.error('❌ Error formatting date for form:', error);
      return '';
    }
  }

  formatTimeForForm(date) {
    if (!date) return '23:59';
    
    try {
      if (this.isMomentAvailable()) {
        return moment(date).tz(this.timezone).format('HH:mm');
      } else {
        // fallback to native Date
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '23:59';
        
        // Adjust for Bangkok timezone
        const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
        const bangkokTime = new Date(utc + (7 * 3600000));
        
        const hours = bangkokTime.getHours().toString().padStart(2, '0');
        const minutes = bangkokTime.getMinutes().toString().padStart(2, '0');
        
        return `${hours}:${minutes}`;
      }
    } catch (error) {
      console.error('❌ Error formatting time for form:', error);
      return '23:59';
    }
  }

  formatDate(date) {
    if (!date) return '-';
    
    try {
      // ตรวจสอบว่า moment.js โหลดสำเร็จและทำงานได้
      if (moment && typeof moment === 'function' && moment.tz && typeof moment.tz === 'function') {
        try {
          const momentDate = moment(date).tz(this.timezone);
          const day = momentDate.format('DD');
          const month = momentDate.format('MM');
          const year = this.convertToThaiYear(momentDate.year());
          return `${day}/${month}/${year}`;
        } catch (error) {
          console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
        }
      }
      
      // fallback to native Date with Bangkok timezone adjustment
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.warn('⚠️ Invalid date input:', date);
        return '-';
      }
      
      // Adjust for Bangkok timezone (UTC+7)
      const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
      const bangkokTime = new Date(utc + (7 * 3600000));
      
      const day = bangkokTime.getDate().toString().padStart(2, '0');
      const month = (bangkokTime.getMonth() + 1).toString().padStart(2, '0');
      const year = this.convertToThaiYear(bangkokTime.getFullYear());
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('❌ Error formatting date:', error);
      // Ultimate fallback
      return new Date().toLocaleDateString('th-TH');
    }
  }

  formatDateTime(date) {
    if (!date) return '-';
    
    try {
      // ตรวจสอบว่า moment.js โหลดสำเร็จและทำงานได้
      if (moment && typeof moment === 'function' && moment.tz && typeof moment.tz === 'function') {
        try {
          const momentDate = moment(date).tz(this.timezone);
          const day = momentDate.format('DD');
          const month = momentDate.format('MM');
          const year = this.convertToThaiYear(momentDate.year());
          const time = momentDate.format('HH:mm');
          return `${day}/${month}/${year} ${time}`;
        } catch (error) {
          console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
        }
      }
      
      // fallback to native Date with Bangkok timezone adjustment
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.warn('⚠️ Invalid date input:', date);
        return '-';
      }
      
      // Adjust for Bangkok timezone (UTC+7)
      const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
      const bangkokTime = new Date(utc + (7 * 3600000));
      
      const day = bangkokTime.getDate().toString().padStart(2, '0');
      const month = (bangkokTime.getMonth() + 1).toString().padStart(2, '0');
      const year = this.convertToThaiYear(bangkokTime.getFullYear());
      const hours = bangkokTime.getHours().toString().padStart(2, '0');
      const minutes = bangkokTime.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      console.error('❌ Error formatting date:', error);
      // Ultimate fallback
      return new Date().toLocaleString('th-TH');
    }
  }

  // ==================== 
  // API Functions
  // ==================== 

  /**
   * ส่ง API request
   */
  async apiRequest(endpoint, options = {}) {
    try {
      // ตรวจสอบว่า endpoint เริ่มต้นด้วย /api หรือไม่
      const fullEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
      const url = `${this.apiBase}${fullEndpoint}`;
      console.log('API Request:', url);
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        ...options
      });

      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        // Extract error message with better fallback
        let errorMessage = errorData.error || errorData.details || errorData.message;
        
        // If no specific error message, provide HTTP status-based message
        if (!errorMessage) {
          switch (response.status) {
            case 400:
              errorMessage = 'Bad Request - ข้อมูลที่ส่งไม่ถูกต้อง';
              break;
            case 401:
              errorMessage = 'Unauthorized - ไม่มีสิทธิ์เข้าถึง';
              break;
            case 403:
              errorMessage = 'Forbidden - ถูกปฏิเสธการเข้าถึง';
              break;
            case 404:
              errorMessage = 'Not Found - ไม่พบข้อมูลที่ต้องการ';
              break;
            case 409:
              errorMessage = 'Conflict - ข้อมูลขัดแย้ง';
              break;
            case 500:
              errorMessage = 'Internal Server Error - เซิร์ฟเวอร์มีปัญหา';
              break;
            default:
              errorMessage = `HTTP ${response.status} - เกิดข้อผิดพลาด`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  async loadStats() {
    try {
      const response = await this.apiRequest(`/api/groups/${this.currentGroupId}/stats`);
      this.updateStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // แสดงข้อความ error ที่ชัดเจนขึ้น
      if (error.message.includes('500')) {
        console.error('❌ เซิร์ฟเวอร์มีปัญหาในการดึงข้อมูลสถิติ');
      } else {
        console.error(`❌ ไม่สามารถดึงข้อมูลสถิติได้: ${error.message}`);
      }
      // แสดงข้อความในหน้า dashboard
      const containers = ['totalTasks', 'pendingTasks', 'completedTasks', 'overdueTasks'];
      containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
          container.textContent = 'N/A';
        }
      });
    }
  }

  async loadTasks(filters = {}) {
    try {
      // เก็บ filters ล่าสุดไว้สำหรับ pagination
      this._lastTaskFilters = { ...(this._lastTaskFilters || {}), ...(filters || {}) };

      const queryParams = new URLSearchParams(this._lastTaskFilters).toString();
      const response = await this.apiRequest(`/api/groups/${this.currentGroupId}/tasks?${queryParams}`);
      // เก็บ cache งานไว้ใช้เปิด modal โดยไม่ต้องพึ่งพา search param ฝั่ง API
      this._taskCache = response.data || [];
      this.updateTasksList(this._taskCache, response.pagination);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      // แสดงข้อความ error ที่ชัดเจนขึ้น
      if (error.message.includes('500')) {
        console.error('❌ เซิร์ฟเวอร์มีปัญหาในการดึงข้อมูลงาน');
      } else {
        console.error(`❌ ไม่สามารถดึงข้อมูลงานได้: ${error.message}`);
      }
      // แสดงข้อความในหน้า dashboard
      const container = document.getElementById('tasksList');
      if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">ไม่สามารถโหลดข้อมูลงานได้</div>';
      }
    }
  }

  async loadCalendarEvents(month, year) {
    try {
      const response = await this.apiRequest(`/api/groups/${this.currentGroupId}/calendar?month=${month}&year=${year}`);
      this.updateCalendar(response.data, month, year);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    }
  }

  async loadFiles(search = '') {
    try {
      const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await this.apiRequest(`/api/groups/${this.currentGroupId}/files${queryParams}`);
      
      // เก็บข้อมูลไฟล์ทั้งหมดสำหรับการกรอง
      this.allFiles = response.data;
      
      // อัปเดตตัวกรองงาน (ถ้ายังไม่ได้อัปเดต)
      if (!this.taskFilterPopulated) {
        await this.loadTasksForFilter();
      }
      
      this.filterFiles();
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  }

  async loadTasksForFilter() {
    try {
      const response = await this.apiRequest(`/api/groups/${this.currentGroupId}/tasks`);
      this.populateTaskFilter(response.data);
      this.taskFilterPopulated = true;
    } catch (error) {
      console.error('Failed to load tasks for filter:', error);
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
        formData.append('userId', this.currentUserId || this.currentUser?.lineUserId || 'unknown');
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
      console.log(`🔄 กำลังโหลด Leaderboard (${period})...`);
      const response = await this.apiRequest(`/api/groups/${this.currentGroupId}/leaderboard?period=${period}`);
      console.log('📊 Leaderboard data received:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        this.updateLeaderboard(response.data);
      } else {
        console.warn('⚠️ Leaderboard data is not an array:', response.data);
        this.updateLeaderboard([]);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      
      // แสดงข้อความ error ที่ชัดเจนขึ้น
      if (error.message && error.message.includes('500')) {
        console.error('❌ เซิร์ฟเวอร์มีปัญหาในการดึงข้อมูลอันดับ');
        this.showToast('เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่ในภายหลัง', 'error');
      } else {
        console.error(`❌ ไม่สามารถดึงข้อมูลอันดับได้: ${error.message}`);
        this.showToast('ไม่สามารถโหลดข้อมูลอันดับได้', 'error');
      }
      
      // แสดงข้อความในหน้า dashboard
      const container = document.getElementById('leaderboardList');
      if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">ไม่สามารถโหลดข้อมูลอันดับได้</div>';
      }
    }
  }

  async loadGroupMembers() {
    try {
      console.log('🔄 เริ่มดึงข้อมูลสมาชิกกลุ่ม...');
      
      // ใช้ฟังก์ชัน hybrid ที่ใช้ทั้ง LINE API และฐานข้อมูล
      try {
        const lineResponse = await this.apiRequest(`/api/line/members/${this.currentGroupId}`);
        if (lineResponse && lineResponse.data && lineResponse.data.length > 0) {
          console.log(`✅ ดึงข้อมูลจาก LINE API สำเร็จ: ${lineResponse.data.length} คน`);
          
          // แปลงข้อมูลจาก LINE API ให้เข้ากับ format เดิม
          const formattedMembers = lineResponse.data.map(member => ({
            id: member.userId,
            lineUserId: member.userId,
            displayName: member.displayName,
            pictureUrl: member.pictureUrl,
            source: member.source || 'line_api',
            lastUpdated: member.lastUpdated
          }));
          
          this.updateMembersList(formattedMembers);
          
          // แสดงข้อมูล source ของข้อมูล
          const sourceInfo = document.getElementById('membersSourceInfo');
          if (sourceInfo) {
            const sourceCount = formattedMembers.filter(m => m.source === 'line_api').length;
            const dbCount = formattedMembers.filter(m => m.source === 'database').length;
            const webhookCount = formattedMembers.filter(m => m.source === 'webhook').length;
            
            let sourceText = '';
            if (sourceCount > 0) sourceText += `LINE API: ${sourceCount} คน `;
            if (dbCount > 0) sourceText += `ฐานข้อมูล: ${dbCount} คน `;
            if (webhookCount > 0) sourceText += `Webhook: ${webhookCount} คน`;
            
            sourceInfo.textContent = `แหล่งข้อมูล: ${sourceText}`;
            sourceInfo.style.display = 'block';
          }
          
          return;
        }
      } catch (lineError) {
        console.warn('⚠️ LINE API ไม่ทำงาน เปลี่ยนไปใช้ฐานข้อมูลแทน:', lineError);
        
        // แสดงข้อความแจ้งเตือน
        const sourceInfo = document.getElementById('membersSourceInfo');
        if (sourceInfo) {
          sourceInfo.textContent = '⚠️ LINE API ไม่ทำงาน ใช้ข้อมูลจากฐานข้อมูลแทน';
          sourceInfo.style.display = 'block';
        }
      }

      // Fallback: ดึงจากฐานข้อมูล
      console.log('📊 ดึงข้อมูลสมาชิกจากฐานข้อมูล...');
      const response = await this.apiRequest(`/api/groups/${this.currentGroupId}/members`);
      
      if (response && response.data) {
        // เพิ่ม source เป็น 'database'
        const formattedMembers = response.data.map(member => ({
          ...member,
          source: 'database',
          lastUpdated: new Date()
        }));
        
        this.updateMembersList(formattedMembers);
        
        // แสดงข้อมูล source
        const sourceInfo = document.getElementById('membersSourceInfo');
        if (sourceInfo) {
          sourceInfo.textContent = 'แหล่งข้อมูล: ฐานข้อมูล';
          sourceInfo.style.display = 'block';
        }
      } else {
        console.warn('⚠️ ไม่ได้รับข้อมูลสมาชิกจากฐานข้อมูล');
        const sourceInfo = document.getElementById('membersSourceInfo');
        if (sourceInfo) {
          sourceInfo.textContent = '⚠️ ไม่ได้รับข้อมูลสมาชิกจากฐานข้อมูล';
          sourceInfo.style.display = 'block';
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to load group members:', error);
      
      // แสดงข้อความ error ที่ชัดเจนขึ้น
      const sourceInfo = document.getElementById('membersSourceInfo');
      if (sourceInfo) {
        if (error.message.includes('500')) {
          sourceInfo.textContent = '❌ เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่อีกครั้ง';
        } else if (error.message.includes('403')) {
          sourceInfo.textContent = '❌ ไม่มีสิทธิ์เข้าถึงข้อมูลสมาชิก';
        } else {
          sourceInfo.textContent = `❌ ไม่สามารถดึงข้อมูลสมาชิกได้: ${error.message}`;
        }
        sourceInfo.style.display = 'block';
      }
    }
  }

  /**
   * ดึงรายชื่อสมาชิกจาก LINE API โดยตรง
   */
  async loadLineMembers() {
    try {
      const response = await this.apiRequest(`/api/line/members/${this.currentGroupId}`);
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
      } else {
        console.warn('⚠️ ไม่ได้รับข้อมูลสมาชิกจาก LINE API');
        return [];
      }
    } catch (error) {
      console.error('Failed to load LINE members:', error);
      
      // แสดงข้อความ error ที่ชัดเจนขึ้น
      if (error.message.includes('500')) {
        console.error('❌ เซิร์ฟเวอร์มีปัญหาในการดึงข้อมูลจาก LINE API');
      } else if (error.message.includes('403')) {
        console.error('❌ Bot ไม่มีสิทธิ์ดึงข้อมูลสมาชิกจาก LINE API');
      } else {
        console.error(`❌ ไม่สามารถดึงข้อมูลสมาชิกได้: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * แสดงข้อมูลสมาชิกใหม่ที่พบจากข้อความ
   */
  displayNewMemberInfo(memberInfo) {
    const newMemberInfo = document.getElementById('newMemberInfo');
    if (!newMemberInfo) return;
    
    const sourceText = {
      'message_webhook': 'ข้อความ + LINE API',
      'message_webhook_basic': 'ข้อความ + ข้อมูลพื้นฐาน',
      'webhook': 'Webhook Event',
      'line_api': 'LINE API โดยตรง',
      'database': 'ฐานข้อมูล'
    };
    
    const source = sourceText[memberInfo.source] || memberInfo.source;
    
    newMemberInfo.innerHTML = `
      <div class="new-member-alert">
        <i class="fas fa-user-plus"></i>
        <strong>สมาชิกใหม่:</strong> ${memberInfo.displayName}
        <br>
        <small>แหล่งข้อมูล: ${source} • อัปเดต: ${this.formatDateTime(memberInfo.lastUpdated)}</small>
      </div>
    `;
    newMemberInfo.style.display = 'block';
    
    // ซ่อนข้อความหลังจาก 10 วินาที
    setTimeout(() => {
      newMemberInfo.style.display = 'none';
    }, 10000);
  }

  // ==================== 
  // Initial Files Handling
  // ==================== 

  handleInitialFilesChange(event) {
    const files = Array.from(event.target.files);
    this.selectedInitialFiles = files;
    this.updateInitialFilesPreview();
  }

  updateInitialFilesPreview() {
    const preview = document.getElementById('initialFilesPreview');
    
    if (!this.selectedInitialFiles || this.selectedInitialFiles.length === 0) {
      preview.style.display = 'none';
      return;
    }

    preview.style.display = 'block';
    preview.innerHTML = `
      <div class="files-preview-header">
        <i class="fas fa-paperclip"></i>
        <span>ไฟล์ที่เลือก (${this.selectedInitialFiles.length})</span>
      </div>
      ${this.selectedInitialFiles.map((file, index) => `
        <div class="file-preview-item">
          <i class="fas ${this.getFileIcon(file.type)} file-preview-icon"></i>
          <div class="file-preview-info">
            <div class="file-preview-name">${file.name}</div>
            <div class="file-preview-size">${this.formatFileSize(file.size)}</div>
          </div>
          <button type="button" class="file-preview-remove" onclick="app.removeInitialFile(${index})">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `).join('')}
    `;
  }

  removeInitialFile(index) {
    if (this.selectedInitialFiles) {
      this.selectedInitialFiles.splice(index, 1);
      this.updateInitialFilesPreview();
      
      // อัปเดต input file
      const fileInput = document.getElementById('initialFiles');
      if (this.selectedInitialFiles.length === 0) {
        fileInput.value = '';
      }
    }
  }

  async uploadInitialFiles() {
    if (!this.selectedInitialFiles || this.selectedInitialFiles.length === 0) {
      return [];
    }

    const formData = new FormData();
    formData.append('userId', this.currentUserId || this.currentUser?.lineUserId || 'unknown');
    
    for (let i = 0; i < this.selectedInitialFiles.length; i++) {
      formData.append('attachments', this.selectedInitialFiles[i]);
    }

    try {
      const response = await fetch(`${this.apiBase}/api/groups/${this.currentGroupId}/files/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const result = await response.json();
      return result.files || [];
    } catch (error) {
      console.error('❌ Failed to upload initial files:', error);
      throw error;
    }
  }

  async createTask(taskData) {
    // ป้องกันการเรียกซ้ำ
    if (this._isCreatingTask) {
      console.log('⚠️ Task creation already in progress, ignoring duplicate request');
      return;
    }
    
    this._isCreatingTask = true;
    
    try {
      // อัปโหลดไฟล์เริ่มต้นก่อน (ถ้ามี)
      let uploadedFiles = [];
      if (this.selectedInitialFiles && this.selectedInitialFiles.length > 0) {
        try {
          uploadedFiles = await this.uploadInitialFiles();
          console.log('✅ Uploaded initial files:', uploadedFiles.length);
        } catch (error) {
          console.error('❌ Failed to upload initial files:', error);
          this.showToast('ไม่สามารถอัปโหลดไฟล์ได้ กรุณาลองใหม่', 'error');
          return;
        }
      }

      // สร้าง copy ของ taskData โดยไม่มี _tempId
      const cleanTaskData = { ...taskData };
      delete cleanTaskData._tempId;
      
      // เพิ่ม fileIds ถ้ามีไฟล์ที่อัปโหลด
      if (uploadedFiles.length > 0) {
        cleanTaskData.fileIds = uploadedFiles.map(file => file.id);
      }
      
      // ลบฟิลด์ที่ไม่มีค่า (undefined, null, empty string) ออก
      Object.keys(cleanTaskData).forEach(key => {
        if (cleanTaskData[key] === undefined || cleanTaskData[key] === null || cleanTaskData[key] === '') {
          console.log(`🗑️ Removing empty field: ${key}`);
          delete cleanTaskData[key];
        }
      });
      
      // ตรวจสอบว่าฟิลด์ที่จำเป็นมีครบหรือไม่
      if (!cleanTaskData.title || !cleanTaskData.dueTime || !cleanTaskData.assigneeIds || !cleanTaskData.createdBy) {
        console.error('❌ Missing required fields:', {
          title: !!cleanTaskData.title,
          dueTime: !!cleanTaskData.dueTime,
          assigneeIds: !!cleanTaskData.assigneeIds,
          createdBy: !!cleanTaskData.createdBy
        });
        throw new Error('Missing required fields: title, dueTime, assigneeIds, or createdBy');
      }
      
      // Debug logging
      console.log('📝 Sending task data to API:', cleanTaskData);
      
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(cleanTaskData)
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
      
      // รีเซ็ตไฟล์ที่เลือก
      this.selectedInitialFiles = [];
      this.updateInitialFilesPreview();
      document.getElementById('initialFiles').value = '';
      
      return response.data;
    } catch (error) {
      console.error('Failed to create task:', error);
      
      // แสดงข้อความ error ที่ชัดเจนขึ้น
      let errorMessage = 'ไม่สามารถเพิ่มงานได้';
      if (error.message.includes('Group not found')) {
        errorMessage = 'ไม่พบกลุ่มที่ระบุ';
      } else if (error.message.includes('Creator user not found')) {
        errorMessage = 'ไม่พบผู้สร้างงาน';
      } else if (error.message.includes('งานนี้ถูกสร้างไปแล้ว')) {
        errorMessage = error.message;
      } else if (error.message.includes('Missing required field')) {
        errorMessage = 'กรุณากรอกข้อมูลให้ครบถ้วน';
      } else if (error.message.includes('Validation failed')) {
        errorMessage = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก';
        console.error('Validation error details:', error);
      } else {
        errorMessage = error.message || 'ไม่สามารถเพิ่มงานได้';
      }
      
      this.showToast(errorMessage, 'error');
      throw error; // Re-throw เพื่อให้ finally block ทำงาน
    } finally {
      // รีเซ็ตสถานะทันทีหลังจากเสร็จสิ้น
      this._isCreatingTask = false;
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
        if (this.isMomentAvailable()) {
          try {
            const now = moment().tz(this.timezone);
            this.loadCalendarEvents(now.month() + 1, now.year());
          } catch (error) {
            console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
            const now = new Date();
            this.loadCalendarEvents(now.getMonth() + 1, now.getFullYear());
          }
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

  /**
   * โหลดข้อมูลเริ่มต้น
   */
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
      const groupResponse = await this.apiRequest(`/api/groups/${this.currentGroupId}`);
      
      if (groupResponse.success && groupResponse.data) {
        const groupName = groupResponse.data.name || 'ไม่ทราบชื่อกลุ่ม';
        document.getElementById('currentGroupName').textContent = groupName;
        console.log('Group loaded:', groupName);
        
        // ไม่ต้องตรวจสอบสถานะ Bot เพราะไม่จำเป็น
        // ผู้ใช้เข้าผ่านลิงก์จากบอทอยู่แล้ว
        
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
      } else {
        console.error('Invalid group response:', groupResponse);
        this.showGroupNotFoundMessage();
      }
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
      
      // แสดงข้อความ error ที่ชัดเจนขึ้น
      if (error.message.includes('404') || error.message.includes('Group not found')) {
        this.showGroupNotFoundMessage();
      } else if (error.message.includes('500')) {
        this.showToast('เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่อีกครั้ง', 'error');
      } else if (error.message.includes('Failed to check bot status')) {
        this.showToast('ไม่สามารถตรวจสอบสถานะ Bot ได้ กรุณาลองใหม่อีกครั้ง', 'error');
      } else {
        this.showToast('ไม่สามารถโหลดข้อมูลได้: ' + error.message, 'error');
      }
    } finally {
      this.hideLoading();
    }
  }

  async loadUpcomingTasks() {
    try {
      const response = await this.apiRequest(`/api/groups/${this.currentGroupId}/tasks?limit=5&status=pending`);
      // อัปเดต cache ด้วยรายการล่าสุดบางส่วน เพื่อให้เปิด modal ได้แม้ยังไม่กดเข้า view Tasks
      const latest = response.data || [];
      this._taskCache = Array.from(new Map([...(this._taskCache||[]), ...latest].map(t => [t.id, t])).values());
      this.updateUpcomingTasks(latest);
    } catch (error) {
      console.error('Failed to load upcoming tasks:', error);
      
      // แสดงข้อความ error ที่ชัดเจนขึ้น
      let errorMessage = 'ไม่สามารถโหลดข้อมูลงานได้';
      if (error.message.includes('500')) {
        errorMessage = 'เซิร์ฟเวอร์มีปัญหาในการดึงข้อมูลงาน';
        console.error('❌ เซิร์ฟเวอร์มีปัญหาในการดึงข้อมูลงาน');
      } else if (error.message.includes('Group not found')) {
        errorMessage = 'ไม่พบกลุ่มที่ระบุ';
        console.error('❌ ไม่พบกลุ่มที่ระบุ');
      } else if (error.message.includes('Invalid date')) {
        errorMessage = 'รูปแบบวันที่ไม่ถูกต้อง';
        console.error('❌ รูปแบบวันที่ไม่ถูกต้อง');
      } else {
        console.error(`❌ ไม่สามารถดึงข้อมูลงานได้: ${error.message}`);
      }
      
      // แสดงข้อความในหน้า dashboard
      const container = document.getElementById('upcomingTasks');
      if (container) {
        container.innerHTML = `<p class="text-muted">${errorMessage}</p>`;
      }
      
      // แสดง toast notification
      this.showToast(errorMessage, 'error');
    }
  }

  async loadMiniLeaderboard() {
    try {
      console.log('🔄 กำลังโหลด Mini Leaderboard...');
      const response = await this.apiRequest(`/api/groups/${this.currentGroupId}/leaderboard?period=weekly&limit=3`);
      
      if (response.data && Array.isArray(response.data)) {
        this.updateMiniLeaderboard(response.data);
      } else {
        console.warn('⚠️ Mini leaderboard data is not an array:', response.data);
        this.updateMiniLeaderboard([]);
      }
    } catch (error) {
      console.error('Failed to load mini leaderboard:', error);
      // แสดงข้อความ error ที่ชัดเจนขึ้น
      if (error.message && error.message.includes('500')) {
        console.error('❌ เซิร์ฟเวอร์มีปัญหาในการดึงข้อมูลอันดับ');
        this.showToast('เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่ในภายหลัง', 'error');
      } else {
        console.error(`❌ ไม่สามารถดึงข้อมูลอันดับได้: ${error.message}`);
        this.showToast('ไม่สามารถโหลดข้อมูลอันดับได้', 'error');
      }
      // แสดงข้อความในหน้า dashboard
      const container = document.getElementById('miniLeaderboard');
      if (container) {
        container.innerHTML = '<p class="text-muted">ไม่สามารถโหลดข้อมูลอันดับได้</p>';
      }
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
        if (moment && moment.tz) {
          try {
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
          } catch (error) {
            console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
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
      const groupResp = await this.apiRequest(`/api/groups/${this.currentGroupId}`);
      const membersResp = await this.apiRequest(`/api/groups/${this.currentGroupId}/members`);
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
      await this.apiRequest(`/api/groups/${this.currentGroupId}/settings/report-recipients`, {
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
      <div class="task-item" data-task-id="${task.id}">
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

    console.log('🔄 Processing mini leaderboard data for', leaderboard.length, 'users');

    container.innerHTML = leaderboard.map((user, index) => {
      // Safe handling of numeric values that might be null, undefined, or NaN
      const totalPoints = user.totalPoints || user.averagePoints || user.weeklyPoints || 0;
      const safeTotalPoints = (totalPoints !== null && totalPoints !== undefined && !isNaN(totalPoints)) ? totalPoints : 0;
      const safeTasksCompleted = (user.tasksCompleted ?? user.completedTasks) || 0;
      
      // Log any data issues for debugging
      if (totalPoints === null || totalPoints === undefined || isNaN(totalPoints)) {
        console.warn(`⚠️ User ${user.displayName} has invalid totalPoints:`, totalPoints, 'using fallback: 0');
      }
      
      return `
        <div class="leaderboard-item" style="display: flex; align-items: center; gap: 12px; padding: 12px 0;">
          <div class="rank" style="font-weight: 600; color: ${index === 0 ? '#f59e0b' : index === 1 ? '#6b7280' : '#9ca3af'};">
            ${index + 1}
          </div>
          <div class="user-info" style="flex: 1;">
            <div style="font-weight: 500;">${user.displayName}</div>
            <div style="font-size: 0.875rem; color: #6b7280;">${safeTotalPoints.toFixed(2)} คะแนน</div>
          </div>
          <div class="score" style="font-weight: 600; color: #10b981;">
            ${safeTasksCompleted} งาน
          </div>
        </div>
      `;
    }).join('');
    
    console.log('✅ Mini leaderboard updated successfully');
  }

  updateTasksList(tasks, pagination) {
    const container = document.getElementById('tasksList');
    
    if (!tasks || tasks.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">ไม่พบงานตามเงื่อนไขที่กำหนด</div>';
      return;
    }

    container.innerHTML = tasks.map(task => {
      const assignees = (task.assignedUsers || task.assignees || []).map(u => u.displayName || u.name).join(', ') || '-';
      const statusClass = this.getStatusClass(task.status);
      const priorityClass = this.getPriorityClass(task.priority);
      // ตรวจสอบไฟล์แนบอย่างถูกต้อง - ต้องมีไฟล์จริงๆ และมีขนาดมากกว่า 0
      const hasAttachments = task.attachedFiles && Array.isArray(task.attachedFiles) && task.attachedFiles.length > 0;
      
      return `
        <div class="task-item" style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer;" 
             onclick="app.openTaskModal('${task.id}')" data-task-id="${task.id}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div style="flex: 1;">
              <h3 style="margin: 0 0 8px 0; font-size: 1.125rem; font-weight: 600;">${task.title}</h3>
              <p style="margin: 0; color: #6b7280; font-size: 0.875rem; line-height: 1.4;">${task.description || 'ไม่มีรายละเอียด'}</p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              ${hasAttachments ? '<span style="color: #3b82f6; font-size: 0.875rem;">📎</span>' : ''}
              <span class="status ${statusClass}" style="padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 500;">${this.getStatusText(task.status)}</span>
              <span class="priority ${priorityClass}" style="padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 500;">${this.getPriorityText(task.priority)}</span>
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; color: #6b7280; margin-bottom: ${hasAttachments ? '12px' : '0'};">
            <div style="display: flex; gap: 16px;">
              <span>👥 ${assignees}</span>
              <span>📅 ${this.formatDate(task.dueTime)}</span>
              ${hasAttachments ? `<span style="color: #3b82f6; font-weight: 500;">📎 ${task.attachedFiles.length} ไฟล์</span>` : ''}
            </div>
            <div style="display: flex; gap: 8px;">
              ${task.status === 'pending' ? `
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); app.openSubmitTaskModal('${task.id}')">
                  <i class="fas fa-upload"></i> ส่งงาน
                </button>
              ` : ''}
              ${task.status === 'in_progress' ? `
                <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); app.handleApproveTask('${task.id}')">
                  <i class="fas fa-check"></i> อนุมัติ
                </button>
                <button class="btn btn-sm btn-warning" onclick="event.stopPropagation(); app.handleRejectTask('${task.id}')">
                  <i class="fas fa-times"></i> ตีกลับ
                </button>
              ` : ''}
            </div>
          </div>
          
          ${hasAttachments ? `
            <div class="task-attachments-preview" style="background: #f8f9fa; border-radius: 8px; padding: 12px; margin-top: 8px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                <i class="fas fa-paperclip" style="color: #3b82f6; font-size: 0.875rem;"></i>
                <span style="font-size: 0.875rem; font-weight: 500; color: #374151;">ไฟล์แนบ (${task.attachedFiles.length})</span>
              </div>
              <div style="display: grid; gap: 6px; max-height: 120px; overflow-y: auto;">
                ${task.attachedFiles.slice(0, 3).map(file => `
                  <div class="attachment-preview-item" style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: white; border-radius: 6px; cursor: pointer; transition: all 0.2s ease; border: 1px solid #e5e7eb;"
                       onclick="event.stopPropagation(); app.viewFile('${file.id}')"
                       onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#3b82f6'"
                       onmouseout="this.style.background='white'; this.style.borderColor='#e5e7eb'">
                    <i class="fas ${this.getFileIcon(file.mimeType)}" style="color: #6b7280; font-size: 0.875rem; width: 16px;"></i>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-size: 0.8125rem; font-weight: 500; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.originalName}</div>
                      <div style="font-size: 0.75rem; color: #6b7280;">${this.formatFileSize(file.size)}</div>
                    </div>
                    <div style="display: flex; gap: 4px;">
                      <button class="btn btn-xs btn-outline" onclick="event.stopPropagation(); app.viewFile('${file.id}')" 
                              style="padding: 2px 6px; font-size: 0.6875rem; border: none; background: #e0f2fe; color: #0277bd;">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button class="btn btn-xs btn-outline" onclick="event.stopPropagation(); app.downloadFile('${file.id}')" 
                              style="padding: 2px 6px; font-size: 0.6875rem; border: none; background: #f0f9ff; color: #0369a1;">
                        <i class="fas fa-download"></i>
                      </button>
                    </div>
                  </div>
                `).join('')}
                ${task.attachedFiles.length > 3 ? `
                  <div style="text-align: center; padding: 4px; font-size: 0.75rem; color: #6b7280; font-style: italic;">
                    และอีก ${task.attachedFiles.length - 3} ไฟล์... (คลิกเพื่อดูทั้งหมด)
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Update pagination if provided
    if (pagination) {
      this.updatePagination('tasksPagination', pagination);
    }
  }

  updateCalendar(events, month, year) {
    const container = document.getElementById('calendarGrid');
    const monthHeader = document.getElementById('currentMonth');
    
    console.log('🔄 Updating calendar for month:', month, 'year:', year, 'with', events?.length || 0, 'events');
    
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
    let todayAdapter;
    
    if (moment && moment.tz) {
      try {
        today = moment().tz(this.timezone);
        // Create adapter for moment object
        todayAdapter = {
          year: () => today.year(),
          month: () => today.month(),
          date: () => today.date()
        };
      } catch (error) {
        console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
        today = new Date();
        // Create adapter for Date object
        todayAdapter = {
          year: () => today.getFullYear(),
          month: () => today.getMonth(),
          date: () => today.getDate()
        };
      }
    } else {
      today = new Date();
      // Create adapter for Date object
      todayAdapter = {
        year: () => today.getFullYear(),
        month: () => today.getMonth(),
        date: () => today.getDate()
      };
    }
    
    const isCurrentMonth = todayAdapter.year() === year && todayAdapter.month() === month - 1;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && todayAdapter.date() === day;
      
      const dayEvents = events.filter(event => {
        let eventDate;
        let eventDateAdapter;
        
        if (moment && moment.tz) {
          try {
            eventDate = moment(event.end || event.dueTime || event.start).tz(this.timezone);
            eventDateAdapter = {
              year: () => eventDate.year(),
              month: () => eventDate.month(),
              date: () => eventDate.date()
            };
          } catch (error) {
            console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
            eventDate = new Date(event.end || event.dueTime || event.start);
            eventDateAdapter = {
              year: () => eventDate.getFullYear(),
              month: () => eventDate.getMonth(),
              date: () => eventDate.getDate()
            };
          }
        } else {
          eventDate = new Date(event.end || event.dueTime || event.start);
          eventDateAdapter = {
            year: () => eventDate.getFullYear(),
            month: () => eventDate.getMonth(),
            date: () => eventDate.getDate()
          };
        }
        
        return (
          eventDateAdapter.year() === year &&
          (eventDateAdapter.month() + 1) === month &&
          eventDateAdapter.date() === day
        );
      });
      
              calendarHTML += `<div class="calendar-day ${isToday ? 'today' : ''}" data-year="${year}" data-month="${month}" data-day="${day}">
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
    console.log('✅ Calendar updated successfully');
  }

  updateFilesList(files) {
    const container = document.getElementById('filesGrid');
    
    if (!files || files.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">ไม่พบไฟล์</div>';
      return;
    }

    container.innerHTML = files.map(file => {
      const isImage = file.mimeType.startsWith('image/');
      const thumbnailUrl = isImage ? `${this.apiBase}/api/groups/${this.currentGroupId}/files/${file.id}/download` : null;
      
      return `
        <div class="file-item" style="background: white; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.2s ease;"
             data-file-id="${file.id}" onclick="app.viewFile('${file.id}')">
          <div class="file-item-preview" style="position: relative; margin-bottom: 12px;">
            ${isImage ? `
              <img src="${thumbnailUrl}" alt="${file.originalName}" class="file-thumbnail" 
                   style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px;"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="file-icon" style="display: none; text-align: center; height: 120px; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 8px;">
                <i class="fas ${this.getFileIcon(file.mimeType)}" style="font-size: 2rem; color: #6b7280;"></i>
              </div>
            ` : `
              <div class="file-icon" style="text-align: center; height: 120px; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 8px;">
                <i class="fas ${this.getFileIcon(file.mimeType)}" style="font-size: 2.5rem; color: #6b7280;"></i>
              </div>
            `}
          </div>
          <div class="file-name" style="font-weight: 500; margin-bottom: 4px; word-break: break-word;">${file.originalName}</div>
          <div class="file-meta" style="font-size: 0.875rem; color: #6b7280; margin-bottom: 4px;">
            ${this.formatFileSize(file.size)} • ${this.formatDate(file.uploadedAt)}
          </div>
          ${file.taskNames && file.taskNames.length > 0 ? `
            <div class="file-task" style="background: #e0f2fe; border: 1px solid #b3e5fc; border-radius: 6px; padding: 6px 8px; margin-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <i class="fas fa-tasks" style="color: #0277bd; font-size: 0.75rem;"></i>
                <span style="font-size: 0.75rem; color: #01579b; font-weight: 500;">จากงาน:</span>
              </div>
              <div style="font-size: 0.875rem; color: #0277bd; font-weight: 500; margin-top: 2px; line-height: 1.3;">
                ${file.taskIds && file.taskIds.length > 0 ? 
                  file.taskNames.map((taskName, index) => 
                    `<span style="cursor: pointer; text-decoration: underline;" 
                           onclick="event.stopPropagation(); app.goToTaskFromFile('${file.taskIds[index]}')"
                           onmouseover="this.style.color='#01579b'" 
                           onmouseout="this.style.color='#0277bd'">${taskName}</span>`
                  ).join(', ') 
                  : file.taskNames.join(', ')
                }
              </div>
            </div>
          ` : `
            <div class="file-task" style="background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 6px; padding: 6px 8px; margin-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <i class="fas fa-file" style="color: #757575; font-size: 0.75rem;"></i>
                <span style="font-size: 0.75rem; color: #757575; font-style: italic;">ไฟล์อิสระ (ไม่ได้แนบกับงาน)</span>
              </div>
            </div>
          `}
          ${file.tags && file.tags.length > 0 ? `
            <div class="file-tags" style="margin-top: 8px;">
              ${file.tags.map(tag => `<span style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 4px;">#${tag}</span>`).join('')}
            </div>
          ` : ''}
          <div class="file-actions" style="margin-top: 8px; display: flex; gap: 8px;">
            <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); app.downloadFile('${file.id}')" 
                    style="flex: 1; padding: 4px 8px; font-size: 0.75rem;">
              <i class="fas fa-download"></i> ดาวน์โหลด
            </button>
            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); app.viewFile('${file.id}')" 
                    style="flex: 1; padding: 4px 8px; font-size: 0.75rem;">
              <i class="fas fa-eye"></i> ดู
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  updateLeaderboard(users) {
    const container = document.getElementById('leaderboardList');
    
    if (!users || users.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">ยังไม่มีข้อมูลอันดับ</div>';
      return;
    }

    console.log('🔄 Processing leaderboard data for', users.length, 'users');

    container.innerHTML = users.map((user, index) => {
      // Safe handling of numeric values that might be null, undefined, or NaN
      const totalPoints = user.totalPoints || user.averagePoints || user.weeklyPoints || 0;
      const safeTotalPoints = (totalPoints !== null && totalPoints !== undefined && !isNaN(totalPoints)) ? totalPoints : 0;
      const safeTasksCompleted = (user.tasksCompleted ?? user.completedTasks) || 0;
      const safeTasksEarly = user.tasksEarly || 0;
      const safeTasksOnTime = user.tasksOnTime || 0;
      
      // Log any data issues for debugging
      if (totalPoints === null || totalPoints === undefined || isNaN(totalPoints)) {
        console.warn(`⚠️ User ${user.displayName} has invalid totalPoints:`, totalPoints, 'using fallback: 0');
      }
      
      return `
      <div class="leaderboard-item" style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 16px;">
        <div class="rank" style="font-size: 1.5rem; font-weight: 700; color: ${index === 0 ? '#f59e0b' : index === 1 ? '#6b7280' : '#9ca3af'}; min-width: 40px;">
          ${index + 1}
        </div>
        <div class="user-info" style="flex: 1;">
          <div style="font-weight: 600; font-size: 1.125rem;">${user.displayName}</div>
          <div style="color: #6b7280; margin-top: 4px;">
            เสร็จ ${safeTasksCompleted} งาน • ค่าเฉลี่ย ${safeTotalPoints.toFixed(2)} คะแนน
          </div>
        </div>
        <div class="user-stats" style="text-align: right;">
          <div style="font-weight: 600; color: #10b981;">${safeTotalPoints.toFixed(2)} คะแนน</div>
          <div style="font-size: 0.875rem; color: #6b7280;">
            เร็ว ${safeTasksEarly} • ตรงเวลา ${safeTasksOnTime}
          </div>
        </div>
      </div>
    `;
    }).join('');
    
    console.log('✅ Leaderboard updated successfully');
  }

  updateMembersList(members) {
    const select = document.getElementById('taskAssignees');
    const filter = document.getElementById('assigneeFilter');
    const reviewerSelect = document.getElementById('reviewerSelect');
    
    if (select) {
      // แสดงเป็น checkbox list เพื่อเลือกหลายคนได้ง่าย
      select.innerHTML = members.map(member => 
        `<label class="checkbox-item"><input type="checkbox" class="assignee-checkbox" value="${member.lineUserId || member.id}"><span>${member.displayName}</span></label>`
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
    const recurrenceSummary = document.getElementById('recurrenceSummary');
    if (recurrenceType && cfg && weekSel && domInput && timeInput && !recurrenceType._bound) {
      recurrenceType.addEventListener('change', () => {
        const v = recurrenceType.value;
        if (v === 'none') {
          cfg.style.display = 'none';
          weekSel.style.display = 'none';
          domInput.style.display = 'none';
          if (recurrenceSummary) recurrenceSummary.style.display = 'none';
        } else {
          cfg.style.display = 'block';
          if (v === 'weekly') {
            weekSel.style.display = 'block';
            domInput.style.display = 'none';
          } else {
            weekSel.style.display = 'none';
            domInput.style.display = 'inline-block';
          }
          if (recurrenceSummary) {
            const summary = v === 'weekly'
              ? `ทุกสัปดาห์ วัน${weekSel.options[weekSel.selectedIndex]?.text || 'จันทร์'} เวลา ${timeInput.value}`
              : `ทุกเดือน วันที่ ${domInput.value || 1} เวลา ${timeInput.value}`;
            recurrenceSummary.textContent = summary;
            recurrenceSummary.style.display = 'block';
          }
        }
      });
      recurrenceType._bound = true;
    }

    // ตั้งค่า default dueDate = พรุ่งนี้ 17:00 ตามโซนเวลา
    try {
      const dueInput = document.getElementById('taskDueDate');
      if (dueInput && !dueInput.value) {
        if (moment && moment.tz) {
          const d = moment().tz(this.timezone).add(1, 'day').hour(17).minute(0).second(0);
          dueInput.value = d.format('YYYY-MM-DDTHH:mm');
        } else {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          d.setHours(17, 0, 0, 0);
          const pad = (n) => String(n).padStart(2, '0');
          dueInput.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
      }
    } catch {}

    // Priority segmented control
    const seg = document.getElementById('prioritySegmented');
    const hiddenPriority = document.getElementById('taskPriority');
    if (seg && hiddenPriority && !seg._bound) {
      seg.addEventListener('click', (e) => {
        const btn = e.target.closest('.seg-btn');
        if (!btn) return;
        seg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        hiddenPriority.value = btn.dataset.priority;
      });
      seg._bound = true;
    }

    // Edit task priority dropdown (ใช้ select dropdown เหมือน add task modal)
    // ไม่ต้องมี event listener เพิ่มเติม เพราะใช้ select element

    // Assignee count (นับจำนวน checkbox ที่ถูกเลือก)
    const assignees = document.getElementById('taskAssignees');
    const assigneeCount = document.getElementById('assigneeCount');
    if (assignees && assigneeCount && !assignees._boundCount) {
      const update = () => {
        const count = assignees.querySelectorAll('.assignee-checkbox:checked').length;
        assigneeCount.textContent = count > 0 ? `(${count} คน)` : '';
      };
      assignees.addEventListener('change', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('assignee-checkbox')) {
          update();
        }
      });
      update();
      assignees._boundCount = true;
    }

    // Tags chips preview
    const tagsInput = document.getElementById('taskTags');
    const chips = document.getElementById('tagsChips');
    if (tagsInput && chips && !tagsInput._boundChips) {
      const render = () => {
        const values = (tagsInput.value || '')
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);
        chips.innerHTML = values.map((t, i) => `<span class="chip">#${t}<button type="button" class="remove" data-index="${i}" aria-label="ลบแท็ก ${t}">×</button></span>`).join('');
      };
      tagsInput.addEventListener('input', render);
      chips.addEventListener('click', (e) => {
        const btn = e.target.closest('.remove');
        if (!btn) return;
        const idx = parseInt(btn.dataset.index, 10);
        const values = (tagsInput.value || '')
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);
        values.splice(idx, 1);
        tagsInput.value = values.join(', ');
        render();
      });
      render();
      tagsInput._boundChips = true;
    }

    // รีเซ็ตไฟล์เริ่มต้น
    this.selectedInitialFiles = [];
    this.updateInitialFilesPreview();
    const initialFilesInput = document.getElementById('initialFiles');
    if (initialFilesInput) {
      initialFilesInput.value = '';
    }
  }

  async openTaskModal(taskId) {
    try {
      const task = this._taskCache?.find(t => t.id === taskId) || 
                   await this.apiRequest(`/task/${taskId}`).then(r => r.data);
      
      if (!task) {
        this.showToast('ไม่พบข้อมูลงาน', 'error');
        return;
      }

      // โหลดไฟล์แนบของงาน
      let attachedFiles = [];
      try {
        const filesResponse = await this.apiRequest(`/api/groups/${this.currentGroupId}/files?taskId=${taskId}`);
        attachedFiles = filesResponse.data || [];
      } catch (error) {
        console.warn('ไม่สามารถโหลดไฟล์แนบได้:', error);
      }

      const modal = document.getElementById('taskModal');
      const content = modal.querySelector('.modal-content');
      
      const statusClass = this.getStatusClass(task.status);
      const priorityClass = this.getPriorityClass(task.priority);
      
      content.innerHTML = `
        <div class="modal-header">
          <h3>${task.title}</h3>
          <button class="modal-close" onclick="this.closest('.modal').classList.remove('active')">&times;</button>
        </div>
        <div class="modal-body">
          <div class="task-details">
            <div class="task-meta">
              <span class="status ${statusClass}">${this.getStatusText(task.status)}</span>
              <span class="priority ${priorityClass}">${this.getPriorityText(task.priority)}</span>
              <span class="due-date">📅 ${this.formatDate(task.dueTime)}</span>
            </div>
            
            <div class="task-description">
              <h4>รายละเอียด</h4>
              <p>${task.description || 'ไม่มีรายละเอียด'}</p>
            </div>

            <div class="task-assignees">
              <h4>ผู้รับผิดชอบ</h4>
              <p>${task.assignees?.map(a => a.displayName).join(', ') || 'ไม่ระบุ'}</p>
            </div>

            ${attachedFiles.length > 0 ? `
              <div class="task-attachments">
                <h4>📎 ไฟล์แนบ (${attachedFiles.length})</h4>
                <div class="attachments-list" style="display: grid; gap: 8px;">
                  ${attachedFiles.map(file => `
                    <div class="attachment-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8f9fa; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;" 
                         onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='#f8f9fa'">
                      <i class="fas ${this.getFileIcon(file.mimeType)}" style="font-size: 1.2rem; color: #6b7280; width: 20px;"></i>
                      <div style="flex: 1; min-width: 0;">
                        <div class="file-name" style="font-weight: 500; word-break: break-word;">${file.originalName}</div>
                        <div class="file-size" style="font-size: 0.875rem; color: #6b7280;">${this.formatFileSize(file.size)}</div>
                      </div>
                      <div style="display: flex; gap: 4px;">
                        <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); app.viewFile('${file.id}')" 
                                style="padding: 4px 8px; font-size: 0.75rem;">
                          <i class="fas fa-eye"></i> ดู
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); app.downloadFile('${file.id}')" 
                                style="padding: 4px 8px; font-size: 0.75rem;">
                          <i class="fas fa-download"></i>
                        </button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="task-actions">
              ${task.status === 'pending' ? `
                <button class="btn btn-primary" onclick="app.openSubmitTaskModal('${task.id}')">
                  <i class="fas fa-upload"></i> ส่งงาน
                </button>
              ` : ''}
              ${task.status === 'in_progress' ? `
                <button class="btn btn-success" onclick="app.handleApproveTask('${task.id}')">
                  <i class="fas fa-check"></i> อนุมัติ
                </button>
                <button class="btn btn-warning" onclick="app.handleRejectTask('${task.id}')">
                  <i class="fas fa-times"></i> ตีกลับ
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
      
      modal.classList.add('active');
      
    } catch (error) {
      console.error('Error opening task modal:', error);
      this.showToast('ไม่สามารถเปิดรายละเอียดงานได้', 'error');
    }
  }

  openSubmitModal(taskId) {
    this.populateSubmitTaskSelect(taskId);
    document.getElementById('submitTaskModal').classList.add('active');
  }

  openEditTaskModal() {
    // เปิด modal แก้ไขงาน
    document.getElementById('editTaskModal').classList.add('active');
    
    // โหลดสมาชิกกลุ่มสำหรับการเลือกผู้รับผิดชอบ
    this.loadGroupMembersForEdit();
    
    // โหลดข้อมูลงานที่ต้องการแก้ไข
    const taskId = this.getTaskIdFromUrl();
    if (taskId) {
      this.loadTaskForEdit(taskId);
    }
  }

  getTaskIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('taskId');
  }

  async loadGroupMembersForEdit() {
    try {
      const response = await this.apiRequest(`/api/line/members/${this.currentGroupId}`);
      if (response && response.data && response.data.length > 0) {
        const assigneesContainer = document.getElementById('editTaskAssignees');
        const assigneeCount = document.getElementById('editAssigneeCount');
        
        if (assigneesContainer) {
          assigneesContainer.innerHTML = response.data.map(member => `
            <label class="checkbox-item">
              <input type="checkbox" class="assignee-checkbox" value="${member.userId}" name="assignees">
              <span class="checkmark"></span>
              <span class="checkbox-label">${member.displayName}</span>
            </label>
          `).join('');
          
          // เพิ่ม event listener สำหรับนับจำนวน
          if (assigneeCount && !assigneesContainer._boundEditCount) {
            const updateCount = () => {
              const count = assigneesContainer.querySelectorAll('.assignee-checkbox:checked').length;
              assigneeCount.textContent = count > 0 ? `(${count} คน)` : '';
            };
            assigneesContainer.addEventListener('change', (e) => {
              if (e.target && e.target.classList && e.target.classList.contains('assignee-checkbox')) {
                updateCount();
              }
            });
            assigneesContainer._boundEditCount = true;
          }
        }
      }
    } catch (error) {
      console.error('Error loading group members for edit:', error);
    }
  }

  async loadTaskForEdit(taskId) {
    try {
      const response = await this.apiRequest(`/api/groups/${this.currentGroupId}/tasks/${taskId}`);
      if (response.success && response.data) {
        const task = response.data;
        
        // เติมข้อมูลในฟอร์มแก้ไข
        document.getElementById('editTaskTitle').value = task.title;
        document.getElementById('editTaskDueDate').value = this.formatDateForForm(task.dueTime);
        document.getElementById('editTaskDueTime').value = this.formatTimeForForm(task.dueTime);
        document.getElementById('editTaskDescription').value = task.description || '';
        
        // ตั้งค่า priority dropdown
        const prioritySelect = document.getElementById('editTaskPriority');
        if (prioritySelect) {
          prioritySelect.value = task.priority || 'medium';
        }
        
        // เลือกผู้รับผิดชอบ
        const assigneeCheckboxes = document.querySelectorAll('#editTaskAssignees .assignee-checkbox');
        assigneeCheckboxes.forEach(checkbox => {
          checkbox.checked = task.assignedUsers?.some(user => user.id === checkbox.value);
        });
        
        // อัปเดตจำนวนผู้รับผิดชอบ
        const assigneeCount = document.getElementById('editAssigneeCount');
        if (assigneeCount) {
          const count = document.querySelectorAll('#editTaskAssignees .assignee-checkbox:checked').length;
          assigneeCount.textContent = count > 0 ? `(${count} คน)` : '';
        }
        
        // เติมแท็ก
        document.getElementById('editTaskTags').value = task.tags?.join(', ') || '';
        
        this.showToast('โหลดข้อมูลงานเรียบร้อยแล้ว', 'success');
      } else {
        this.showToast('ไม่สามารถโหลดข้อมูลงานได้', 'error');
      }
    } catch (error) {
      console.error('Error loading task for edit:', error);
      this.showToast('ไม่สามารถโหลดข้อมูลงานได้', 'error');
    }
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }

  // ==================== 
  // Form Handling
  // ==================== 

  async handleAddTask() {
    // ป้องกันการเรียกซ้ำ
    if (this._isHandlingAddTask) {
      console.log('⚠️ Add task handling already in progress, ignoring duplicate request');
      return;
    }
    
    this._isHandlingAddTask = true;
    
    // แสดงสถานะการโหลด
    const submitBtn = document.querySelector('#addTaskForm button[type="submit"]');
    const originalText = submitBtn?.innerHTML || '<i class="fas fa-plus"></i> เพิ่มงาน';
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังเพิ่มงาน...';
      submitBtn.disabled = true;
      submitBtn.classList.add('btn-loading');
    }
    
    try {
      const form = document.getElementById('addTaskForm');
      const formData = new FormData(form);
      
      // ตรวจสอบข้อมูลที่จำเป็น
      const title = formData.get('title')?.trim();
      const dueDate = formData.get('dueDate');
      
      // Clear previous error states
      this.clearFormErrors();
      
      let hasErrors = false;
      
      if (!title) {
        this.showFieldError('taskTitle', 'กรุณากรอกชื่องาน');
        hasErrors = true;
      }
      
      if (!dueDate) {
        this.showFieldError('taskDueDate', 'กรุณาเลือกวันที่ครบกำหนด');
        hasErrors = true;
      }
      
      if (hasErrors) {
        this.showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
        return;
      }
      
      // ตรวจสอบ assignees
      const assigneeIds = Array.from(document.querySelectorAll('#taskAssignees .assignee-checkbox:checked'))
        .map(input => input.value);
      
      if (assigneeIds.length === 0) {
        this.showFieldError('taskAssignees', 'กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน');
        this.showToast('กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน', 'error');
        return;
      }
      
      // แสดงสถานะ success สำหรับ assignees
      this.showFieldSuccess('taskAssignees');

      // ตรวจสอบ description - ถ้าเป็นค่าว่างให้ส่งเป็น undefined แทน
      const description = formData.get('description')?.trim();
      if (description === '') {
        console.log('⚠️ Description is empty, will send as undefined');
        // แสดง hint ให้ผู้ใช้รู้ว่า description ไม่บังคับ
        this.showFieldSuccess('taskDescription');
      } else if (description) {
        // ถ้ามี description ให้แสดงสถานะ success
        this.showFieldSuccess('taskDescription');
      }
      
      // สร้าง taskData โดยไม่รวมฟิลด์ที่ไม่มีค่า
      const taskData = {};
      
      // เพิ่มฟิลด์ที่จำเป็น
      taskData.title = title;
      taskData.dueTime = this.formatDateForAPI(dueDate);
      taskData.priority = document.getElementById('taskPriority')?.value || 'medium';
      taskData.assigneeIds = assigneeIds;
      taskData.createdBy = this.currentUserId || 'unknown';
      taskData.requireAttachment = document.getElementById('requireAttachment').checked;
      
      // แสดงสถานะ success สำหรับฟิลด์ที่จำเป็น
      this.showFieldSuccess('taskTitle');
      this.showFieldSuccess('taskDueDate');
      this.showFieldSuccess('taskPriority');
      this.showFieldSuccess('requireAttachment');
      
      // เพิ่มฟิลด์ที่ไม่จำเป็นเฉพาะเมื่อมีค่า
      if (description) {
        taskData.description = description;
      }
      
      const tags = formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      if (tags.length > 0) {
        taskData.tags = tags;
        console.log('📝 Tags added:', tags);
        // แสดงสถานะ success สำหรับ tags
        this.showFieldSuccess('taskTags');
      }
      
      const reviewerUserId = document.getElementById('reviewerSelect')?.value || this.currentUserId;
      if (reviewerUserId && reviewerUserId !== this.currentUserId) {
        taskData.reviewerUserId = reviewerUserId;
        console.log('📝 Reviewer added:', reviewerUserId);
        // แสดงสถานะ success สำหรับ reviewer
        this.showFieldSuccess('reviewerSelect');
      }
      
      // Debug logging
      console.log('📝 Task data before API call:', taskData);
      
      // ถ้าเลือกเป็นงานประจำ ให้สร้าง recurring template แทน
      const recurrenceType = document.getElementById('recurrenceType')?.value || 'none';
      if (recurrenceType !== 'none') {
        try {
          // สร้าง payload สำหรับ recurring task โดยไม่รวมฟิลด์ที่ไม่มีค่า
          const payload = {
            title: taskData.title,
            assigneeLineUserIds: taskData.assigneeIds, // รองรับ LINE IDs ได้ใน backend
            requireAttachment: taskData.requireAttachment,
            priority: taskData.priority,
            recurrence: recurrenceType, // 'weekly' | 'monthly' | 'quarterly'
            weekDay: recurrenceType === 'weekly' ? parseInt(document.getElementById('weekDaySelect').value || '1', 10) : undefined,
            dayOfMonth: (recurrenceType === 'monthly' || recurrenceType === 'quarterly') ? parseInt(document.getElementById('dayOfMonthInput').value || '1', 10) : undefined,
            timeOfDay: document.getElementById('timeOfDayInput').value || '09:00',
            timezone: this.timezone, // ใช้ timezone ที่ตั้งค่าไว้ใน class
            createdBy: this.currentUserId || 'unknown'
          };
          
          // เพิ่มฟิลด์ที่ไม่จำเป็นเฉพาะเมื่อมีค่า
          if (taskData.description) {
            payload.description = taskData.description;
          }
          
          if (taskData.reviewerUserId) {
            payload.reviewerLineUserId = taskData.reviewerUserId;
          }
          
          if (taskData.tags && taskData.tags.length > 0) {
            payload.tags = taskData.tags;
          }
          console.log('📝 Creating recurring task with payload:', payload);
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
        console.log('📝 Creating regular task with data:', taskData);
        await this.createTask(taskData);
      }
      
      // รีเซ็ตฟอร์มหลังจากสร้างงานสำเร็จ
      form.reset();
      
      // แสดงข้อความสำเร็จ
      this.showToast('สร้างงานสำเร็จ', 'success');
      
      // รีเซ็ตสถานะฟอร์ม
      this.clearFormErrors();
      
      // ปิด modal
      this.closeModal('addTaskModal');
      
      // รีเฟรชข้อมูล
      this.refreshCurrentView();
      
    } catch (error) {
      console.error('handleAddTask error:', error);
      
      // แสดงข้อความ error ที่ชัดเจนขึ้น
      let errorMessage = 'เกิดข้อผิดพลาดในการสร้างงาน';
      if (error.message.includes('Validation failed')) {
        errorMessage = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก';
        console.error('❌ Validation error details:', error);
      } else if (error.message.includes('Missing required fields')) {
        errorMessage = 'ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบข้อมูลที่กรอก';
        console.error('❌ Missing fields error details:', error);
      } else if (error.message.includes('Group not found')) {
        errorMessage = 'ไม่พบกลุ่มที่ระบุ';
      } else if (error.message.includes('Creator user not found')) {
        errorMessage = 'ไม่พบผู้สร้างงาน';
      }
      
      this.showToast(errorMessage, 'error');
      
      // แสดง error ในฟอร์ม
      this.showFormErrors(error);
    } finally {
      // รีเซ็ตสถานะและปุ่ม
      this._isHandlingAddTask = false;
      if (submitBtn) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-loading');
      }
    }
  }

  async handleEditTask() {
    try {
      const taskId = this.getTaskIdFromUrl();
      if (!taskId) {
        this.showToast('ไม่พบงานที่ต้องการแก้ไข', 'error');
        return;
      }

      const form = document.getElementById('editTaskForm');
      const formData = new FormData(form);
      
      // ตรวจสอบข้อมูลที่จำเป็น
      const title = formData.get('title')?.trim();
      const dueDate = formData.get('dueDate');
      
      if (!title) {
        this.showToast('กรุณากรอกชื่องาน', 'error');
        return;
      }
      
      if (!dueDate) {
        this.showToast('กรุณาเลือกวันที่ครบกำหนด', 'error');
        return;
      }

      // ตรวจสอบ assignees
      const assigneeIds = Array.from(document.querySelectorAll('#editTaskAssignees .assignee-checkbox:checked'))
        .map(input => input.value);
      
      if (assigneeIds.length === 0) {
        this.showToast('กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน', 'error');
        return;
      }

      // สร้างข้อมูลสำหรับอัปเดต
      const updateData = {
        title: title,
        dueTime: this.formatDateForAPI(dueDate),
        priority: document.getElementById('editTaskPriority').value,
        assigneeIds: assigneeIds,
        description: formData.get('description')?.trim() || undefined,
        tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };

      // อัปเดตงาน
      await this.apiRequest(`/api/groups/${this.currentGroupId}/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      // ตรวจสอบว่าเป็นการ approve extension หรือไม่
      const isExtensionApproval = this.initialAction === 'approve_extension';
      
      if (isExtensionApproval) {
        // ส่งการแจ้งเตือนการอนุมัติเลื่อนเวลา
        try {
          await this.apiRequest(`/api/groups/${this.currentGroupId}/tasks/${taskId}/approve-extension`, {
            method: 'POST',
            body: JSON.stringify({
              newDueDate: formData.get('dueDate'),
              newDueTime: formData.get('dueTime') || '23:59'
            })
          });
          this.showToast('อนุมัติการเลื่อนเวลาและส่งแจ้งเตือนแล้ว', 'success');
        } catch (notificationError) {
          console.warn('Failed to send extension approval notification:', notificationError);
          this.showToast('อัปเดตงานสำเร็จ แต่ส่งการแจ้งเตือนไม่สำเร็จ', 'warning');
        }
      } else {
        this.showToast('อัปเดตงานเรียบร้อยแล้ว', 'success');
      }
      
      this.closeModal('editTaskModal');
      this.refreshCurrentView();

    } catch (error) {
      console.error('handleEditTask error:', error);
      this.showToast('เกิดข้อผิดพลาดในการอัปเดตงาน', 'error');
    }
  }

   async handleSubmitTask() {
     try {
       const select = document.getElementById('submitTaskId');
       const taskId = select.value;
       const comment = document.getElementById('submitComment').value;
       const filesInput = document.getElementById('submitFiles');
       const files = filesInput.files;
       if (!taskId) { this.showToast('กรุณาเลือกงาน', 'error'); return; }
       // อนุญาตให้ส่งได้แม้ไม่มีไฟล์

       const formData = new FormData();
               formData.append('userId', this.currentUserId || this.currentUser?.lineUserId || 'unknown');
       formData.append('comment', comment || '');
       if (files && files.length > 0) {
         for (let i = 0; i < files.length; i++) {
           formData.append('attachments', files[i]);
         }
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
    if (moment && moment.tz) {
      try {
        const now = moment().tz(this.timezone);
        this.loadCalendarEvents(now.month() + 1, now.year());
      } catch (error) {
        console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
        const now = new Date();
        this.loadCalendarEvents(now.getMonth() + 1, now.getFullYear());
      }
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
    let currentYear;
    if (moment && moment.tz) {
      try {
        currentYear = parseInt(parts[1]) || this.getSafeCurrentTime().getFullYear();
      } catch (error) {
        console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
        currentYear = parseInt(parts[1]) || new Date().getFullYear();
      }
    } else {
      currentYear = parseInt(parts[1]) || new Date().getFullYear();
    }
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
          let eventDateAdapter;
          
          if (moment && moment.tz) {
            try {
              eventDate = moment(ev.end || ev.dueTime || ev.start).tz(this.timezone);
              eventDateAdapter = {
                year: () => eventDate.year(),
                month: () => eventDate.month(),
                date: () => eventDate.date()
              };
            } catch (error) {
              console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
              eventDate = new Date(ev.end || ev.dueTime || ev.start);
              eventDateAdapter = {
                year: () => eventDate.getFullYear(),
                month: () => eventDate.getMonth(),
                date: () => eventDate.getDate()
              };
            }
          } else {
            eventDate = new Date(ev.end || ev.dueTime || ev.start);
            eventDateAdapter = {
              year: () => eventDate.getFullYear(),
              month: () => eventDate.getMonth(),
              date: () => eventDate.getDate()
            };
          }
          
          return (
            eventDateAdapter.year() === year &&
            (eventDateAdapter.month() + 1) === month &&
            eventDateAdapter.date() === day
          );
        });
        const body = document.getElementById('taskModalBody');
        if (!body) return;
        if (events.length === 0) { this.showToast('ไม่มีงานในวันนี้', 'info'); return; }
        body.innerHTML = events.map(ev => `
          <div class="task-item" data-task-id="${ev.id}">
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

  async viewFile(fileId) {
    try {
      // แสดง loading
      const modal = document.getElementById('fileViewerModal');
      const loading = document.getElementById('fileViewerLoading');
      const content = document.getElementById('fileViewerContent');
      const title = document.getElementById('fileViewerTitle');
      
      modal.classList.add('active');
      loading.style.display = 'flex';
      content.innerHTML = '';
      
      // ดึงข้อมูลไฟล์
      const fileResponse = await fetch(`${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}`);
      if (!fileResponse.ok) throw new Error('ไม่สามารถดึงข้อมูลไฟล์ได้');
      
      const fileData = await fileResponse.json();
      title.textContent = fileData.originalName;
      
      // ตั้งค่าปุ่มดาวน์โหลด
      const downloadBtn = document.getElementById('downloadFileBtn');
      downloadBtn.onclick = () => this.downloadFile(fileId);
      
      // สร้างเนื้อหาตามประเภทไฟล์
      const mimeType = fileData.mimeType;
      let fileContent = '';
      
      if (mimeType.startsWith('image/')) {
        // แสดงรูปภาพ
        const imageUrl = `${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/download`;
        fileContent = `<img src="${imageUrl}" alt="${fileData.originalName}" style="max-width: 100%; max-height: 70vh; object-fit: contain;">`;
      } else if (mimeType === 'application/pdf') {
        // แสดง PDF
        const pdfUrl = `${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/download`;
        fileContent = `<iframe src="${pdfUrl}" style="width: 100%; height: 70vh; border: none;"></iframe>`;
      } else if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) {
        // แสดงไฟล์ข้อความ
        const textResponse = await fetch(`${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/download`);
        const textContent = await textResponse.text();
        fileContent = `<pre style="background: #f8f9fa; padding: 20px; border-radius: 8px; overflow: auto; max-height: 60vh; white-space: pre-wrap; font-family: 'Courier New', monospace;">${this.escapeHtml(textContent)}</pre>`;
      } else if (mimeType.startsWith('video/')) {
        // แสดงวิดีโอ
        const videoUrl = `${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/download`;
        fileContent = `<video controls style="max-width: 100%; max-height: 70vh;"><source src="${videoUrl}" type="${mimeType}">ไม่สามารถแสดงวิดีโอได้</video>`;
      } else if (mimeType.startsWith('audio/')) {
        // แสดงเสียง
        const audioUrl = `${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/download`;
        fileContent = `
          <div class="file-preview-placeholder">
            <i class="fas fa-music"></i>
            <h3>${fileData.originalName}</h3>
            <audio controls style="margin-top: 20px;">
              <source src="${audioUrl}" type="${mimeType}">
              ไม่สามารถเล่นเสียงได้
            </audio>
          </div>
        `;
      } else {
        // ไฟล์ประเภทอื่นๆ ที่ไม่สามารถแสดงได้
        fileContent = `
          <div class="file-preview-placeholder">
            <i class="fas ${this.getFileIcon(mimeType)}"></i>
            <h3>${fileData.originalName}</h3>
            <p>ขนาด: ${this.formatFileSize(fileData.size)}</p>
            <p>ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้</p>
            <button class="btn btn-primary" onclick="app.downloadFile('${fileId}')">
              <i class="fas fa-download"></i> ดาวน์โหลดเพื่อดู
            </button>
          </div>
        `;
      }
      
      content.innerHTML = fileContent;
      loading.style.display = 'none';
      
    } catch (error) {
      console.error('Failed to view file:', error);
      this.showToast('ไม่สามารถแสดงไฟล์ได้', 'error');
      document.getElementById('fileViewerModal').classList.remove('active');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  goToTaskFromFile(taskId) {
    // เปลี่ยนไปหน้างานทั้งหมด
    this.switchView('tasks');
    
    // รอให้หน้าโหลดเสร็จแล้วเปิด modal งาน
    setTimeout(() => {
      this.openTaskModal(taskId);
    }, 300);
    
    this.showToast('กำลังไปยังงานที่เกี่ยวข้อง...', 'info');
  }

  filterFiles() {
    if (!this.allFiles) return;
    
    const searchTerm = document.getElementById('searchFiles')?.value.toLowerCase() || '';
    const taskFilter = document.getElementById('taskFilter')?.value || '';
    const typeFilter = document.getElementById('fileTypeFilter')?.value || '';
    
    let filtered = this.allFiles.filter(file => {
      // ค้นหาตามชื่อไฟล์หรือชื่องาน
      const matchesSearch = !searchTerm || 
        file.originalName.toLowerCase().includes(searchTerm) ||
        (file.taskNames && file.taskNames.some(name => name.toLowerCase().includes(searchTerm)));
      
      // กรองตามงาน
      const matchesTask = !taskFilter || 
        (taskFilter === 'no-task' && (!file.taskNames || file.taskNames.length === 0)) ||
        (taskFilter !== 'no-task' && file.taskIds && file.taskIds.includes(taskFilter));
      
      // กรองตามประเภทไฟล์
      const matchesType = !typeFilter || this.getFileCategory(file.mimeType) === typeFilter;
      
      return matchesSearch && matchesTask && matchesType;
    });
    
    this.updateFilesList(filtered);
  }

  getFileCategory(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('excel') || 
        mimeType.includes('powerpoint') || mimeType.includes('spreadsheet') || 
        mimeType.includes('presentation') || mimeType.startsWith('text/')) return 'document';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || 
        mimeType.includes('tar') || mimeType.includes('gz')) return 'archive';
    return 'other';
  }

  populateTaskFilter(tasks) {
    const taskFilter = document.getElementById('taskFilter');
    if (!taskFilter || !tasks || !this.allFiles) return;
    
    // หางานที่มีไฟล์แนบ
    const taskIdsWithFiles = new Set();
    this.allFiles.forEach(file => {
      if (file.taskIds && file.taskIds.length > 0) {
        file.taskIds.forEach(taskId => taskIdsWithFiles.add(taskId));
      }
    });
    
    // กรองงานที่มีไฟล์แนบเท่านั้น
    const tasksWithFiles = tasks.filter(task => taskIdsWithFiles.has(task.id));
    
    // เก็บ option เดิม (งานทั้งหมด, ไฟล์อิสระ)
    const defaultOptions = `
      <option value="">งานทั้งหมด</option>
      <option value="no-task">ไฟล์อิสระ</option>
    `;
    
    // เพิ่ม option ของงานที่มีไฟล์
    const taskOptions = tasksWithFiles.map(task => 
      `<option value="${task.id}">${task.title}</option>`
    ).join('');
    
    taskFilter.innerHTML = defaultOptions + taskOptions;
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

  getStatusClass(status) {
    const classMap = {
      pending: 'status-pending',
      in_progress: 'status-progress',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      overdue: 'status-overdue'
    };
    return classMap[status] || 'status-default';
  }

  getPriorityText(priority) {
    const priorityMap = {
      low: 'ต่ำ',
      medium: 'ปานกลาง',
      high: 'สูง',
      urgent: 'เร่งด่วน'
    };
    return priorityMap[priority] || priority;
  }

  getPriorityClass(priority) {
    const classMap = {
      low: 'priority-low',
      medium: 'priority-medium',
      high: 'priority-high',
      urgent: 'priority-urgent'
    };
    return classMap[priority] || 'priority-default';
  }

  openSubmitTaskModal(taskId = '') {
    this.populateSubmitTaskSelect(taskId);
    document.getElementById('submitTaskModal').classList.add('active');
  }

  getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return 'fa-image';
    if (mimeType.startsWith('video/')) return 'fa-video';
    if (mimeType.startsWith('audio/')) return 'fa-music';
    if (mimeType.includes('pdf')) return 'fa-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('msword') || mimeType.includes('wordprocessingml')) return 'fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return 'fa-file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('tar') || mimeType.includes('gz')) return 'fa-file-archive';
    if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('csv')) return 'fa-file-alt';
    if (mimeType.includes('javascript') || mimeType.includes('typescript')) return 'fa-file-code';
    if (mimeType.includes('html') || mimeType.includes('css')) return 'fa-file-code';
    if (mimeType.includes('python') || mimeType.includes('java') || mimeType.includes('cpp') || mimeType.includes('c++')) return 'fa-file-code';
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
      paginationHTML += `<button class="btn btn-outline" data-pagination="prev" data-params="${prev}">ก่อนหน้า</button>`;
    }
    
    // Page info
    paginationHTML += `<span style="padding: 8px 12px; color: #6b7280;">หน้า ${pagination.page} จาก ${pagination.totalPages}</span>`;
    
    // Next button
    if (pagination.page < pagination.totalPages) {
      const next = new URLSearchParams({ ...(this._lastTaskFilters || {}), page: String(pagination.page + 1) }).toString();
      paginationHTML += `<button class="btn btn-outline" data-pagination="next" data-params="${next}">ถัดไป</button>`;
    }
    
    paginationHTML += '</div>';
    container.innerHTML = paginationHTML;
  }

  // เพิ่มฟังก์ชันสำหรับการจัดการวันที่ปัจจุบัน
  getCurrentDate() {
    if (moment && moment.tz) {
      try {
        return moment().tz(this.timezone);
      } catch (error) {
        console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
        return new Date();
      }
    }
    return new Date();
  }

  // เพิ่มฟังก์ชันสำหรับการแปลงวันที่ให้เป็น timezone ที่ถูกต้อง
  formatDateForAPI(date) {
    try {
      // ตรวจสอบว่า moment.tz ทำงานได้จริงหรือไม่
      if (moment && moment.tz && typeof moment.tz === 'function') {
        try {
          return moment(date).tz(this.timezone).toISOString();
        } catch (error) {
          console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
        }
      }
      
      // Fallback: แปลงเป็น Bangkok time (UTC+7) แบบ manual
      const inputDate = new Date(date);
      const utc = inputDate.getTime() + (inputDate.getTimezoneOffset() * 60000);
      const bangkokTime = new Date(utc + (7 * 3600000));
      return bangkokTime.toISOString();
    } catch (error) {
      console.error('❌ Error formatting date:', error);
      // Ultimate fallback: return current date in ISO format
      return new Date().toISOString();
    }
  }

  // ==================== */
  // Form Validation & Error Handling */
  // ==================== */

  clearFormErrors() {
    const formGroups = document.querySelectorAll('#addTaskForm .form-group');
    formGroups.forEach(group => {
      group.classList.remove('error', 'success');
      const errorMessage = group.querySelector('.error-message');
      if (errorMessage) {
        errorMessage.remove();
      }
    });
  }

  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    
    formGroup.classList.add('error');
    formGroup.classList.remove('success');
    
    // Remove existing error message
    const existingError = formGroup.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    // Add new error message
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = message;
    formGroup.appendChild(errorMessage);
    
    // Focus on the field
    field.focus();
  }

  showFieldSuccess(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const formGroup = field.closest('.form-group');
    if (!formGroup) return;
    
    formGroup.classList.add('success');
    formGroup.classList.remove('error');
    
    // Remove error message if exists
    const errorMessage = formGroup.querySelector('.error-message');
    if (errorMessage) {
      errorMessage.remove();
    }
  }

  showFormErrors(error) {
    // ล้าง error ทั้งหมดก่อน
    this.clearFormErrors();
    
    // แสดง error สำหรับฟิลด์ที่เกี่ยวข้อง
    if (error.message.includes('Validation failed')) {
      // แสดง error สำหรับฟิลด์ที่ validation fail
      if (error.details) {
        error.details.forEach((detail) => {
          if (detail.field === 'description') {
            this.showFieldError('taskDescription', detail.message);
          } else if (detail.field === 'title') {
            this.showFieldError('taskTitle', detail.message);
          } else if (detail.field === 'dueTime') {
            this.showFieldError('taskDueDate', detail.message);
          } else if (detail.field === 'assigneeIds') {
            this.showFieldError('taskAssignees', detail.message);
          }
        });
      }
    }
  }

  // ==================== */
  // Enhanced Form Handling */
  // ==================== */

  async loadDashboardData() {
    try {
      console.log('🔄 กำลังโหลดข้อมูล Dashboard...');
      
      // โหลดข้อมูลพร้อมกัน
      const [groupResponse, membersResponse, tasksResponse, statsResponse, leaderboardResponse] = await Promise.allSettled([
        this.apiRequest(`/api/groups/${this.currentGroupId}`),
        this.apiRequest(`/api/groups/${this.currentGroupId}/members`),
        this.apiRequest(`/api/groups/${this.currentGroupId}/tasks?limit=10`),
        this.apiRequest(`/api/groups/${this.currentGroupId}/stats`),
        this.apiRequest(`/api/groups/${this.currentGroupId}/leaderboard?period=weekly&limit=3`)
      ]);

      // อัปเดตข้อมูลกลุ่ม
      if (groupResponse.status === 'fulfilled' && groupResponse.value?.data) {
        this.updateGroupInfo(groupResponse.value.data);
      }

      // อัปเดตข้อมูลสมาชิก
      if (membersResponse.status === 'fulfilled' && membersResponse.value?.data) {
        this.updateMembersList(membersResponse.value.data);
      }

      // อัปเดตรายการงานล่าสุด
      if (tasksResponse.status === 'fulfilled' && tasksResponse.value?.data) {
        this.updateRecentTasks(tasksResponse.value.data.tasks || []);
      }

      // อัปเดตสถิติ
      if (statsResponse.status === 'fulfilled' && statsResponse.value?.data) {
        this.updateDashboardStats(statsResponse.value.data);
      }

      // อัปเดต Mini Leaderboard
      if (leaderboardResponse.status === 'fulfilled' && leaderboardResponse.value?.data) {
        this.updateMiniLeaderboard(leaderboardResponse.value.data);
      } else if (leaderboardResponse.status === 'rejected') {
        console.warn('⚠️ ไม่สามารถโหลด Leaderboard ได้:', leaderboardResponse.reason);
        // แสดงข้อความในหน้า dashboard
        const container = document.getElementById('miniLeaderboard');
        if (container) {
          container.innerHTML = '<p class="text-muted">ไม่สามารถโหลดข้อมูลอันดับได้</p>';
        }
      }

      console.log('✅ Dashboard data loaded successfully');

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      this.showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
  }

  updateDashboardStats(stats) {
    try {
      console.log('🔄 Updating dashboard stats:', stats);
      
      // อัปเดตสถิติหลัก
      const totalTasksEl = document.getElementById('totalTasks');
      const completedTasksEl = document.getElementById('completedTasks');
      const pendingTasksEl = document.getElementById('pendingTasks');
      const overdueTasksEl = document.getElementById('overdueTasks');
      
      if (totalTasksEl) totalTasksEl.textContent = stats.totalTasks || 0;
      if (completedTasksEl) completedTasksEl.textContent = stats.completedTasks || 0;
      if (pendingTasksEl) pendingTasksEl.textContent = stats.pendingTasks || 0;
      if (overdueTasksEl) overdueTasksEl.textContent = stats.overdueTasks || 0;
      
      // อัปเดตสถิติ KPI
      const completionRateEl = document.getElementById('completionRate');
      const avgCompletionTimeEl = document.getElementById('avgCompletionTime');
      const topPerformerEl = document.getElementById('topPerformer');
      
      if (completionRateEl) {
        const rate = stats.completionRate || 0;
        completionRateEl.textContent = `${rate.toFixed(1)}%`;
      }
      
      if (avgCompletionTimeEl) {
        const time = stats.avgCompletionTime || 0;
        avgCompletionTimeEl.textContent = `${time.toFixed(1)} ชม.`;
      }
      
      if (topPerformerEl) {
        topPerformerEl.textContent = stats.topPerformer || 'ไม่มีข้อมูล';
      }
      
      console.log('✅ Dashboard stats updated successfully');
      
    } catch (error) {
      console.error('❌ Error updating dashboard stats:', error);
    }
  }

  updateRecentTasks(tasks) {
    try {
      console.log('🔄 Updating recent tasks:', tasks.length);
      
      const container = document.getElementById('recentTasks');
      if (!container) return;
      
      if (!tasks || tasks.length === 0) {
        container.innerHTML = '<p class="text-muted">ยังไม่มีงานในกลุ่มนี้</p>';
        return;
      }
      
      container.innerHTML = tasks.map(task => {
        const assignees = (task.assignedUsers || task.assignees || []).map(u => u.displayName || u.name).join(', ') || '-';
        const statusClass = this.getStatusClass(task.status);
        const priorityClass = this.getPriorityClass(task.priority);
        const hasAttachments = task.attachedFiles && task.attachedFiles.length > 0;
        
        return `
          <div class="task-item" style="background: white; border-radius: 8px; padding: 12px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); cursor: pointer;" 
               onclick="app.openTaskModal('${task.id}')" data-task-id="${task.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div style="flex: 1;">
                <h4 style="margin: 0 0 4px 0; font-size: 1rem; font-weight: 600;">${task.title}</h4>
                <p style="margin: 0; color: #6b7280; font-size: 0.875rem; line-height: 1.4;">${task.description || 'ไม่มีรายละเอียด'}</p>
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                ${hasAttachments ? '<span style="color: #3b82f6; font-size: 0.75rem;">📎</span>' : ''}
                <span class="status ${statusClass}" style="padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">${this.getStatusText(task.status)}</span>
                <span class="priority ${priorityClass}" style="padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">${this.getPriorityText(task.priority)}</span>
              </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #6b7280;">
              <div style="display: flex; gap: 12px;">
                <span>👥 ${assignees}</span>
                <span>📅 ${this.formatDate(task.dueTime)}</span>
                ${hasAttachments ? `<span>📎 ${task.attachedFiles.length} ไฟล์</span>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      console.log('✅ Recent tasks updated successfully');
      
    } catch (error) {
      console.error('❌ Error updating recent tasks:', error);
    }
  }

  updateGroupInfo(group) {
    try {
      console.log('🔄 Updating group info:', group);
      
      // อัปเดตชื่อกลุ่ม
      const groupNameEl = document.getElementById('currentGroupName');
      if (groupNameEl && group.name) {
        groupNameEl.textContent = group.name;
      }
      
      // อัปเดตข้อมูลกลุ่มอื่นๆ ตามต้องการ
      console.log('✅ Group info updated successfully');
      
    } catch (error) {
      console.error('❌ Error updating group info:', error);
    }
  }
}

// Initialize Dashboard
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new Dashboard();
  // Expose after init to ensure handlers can access
  window.dashboard = dashboard;
});