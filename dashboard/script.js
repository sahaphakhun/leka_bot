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
const THAILAND_TIMEZONE = 'Asia/Bangkok';
const THAILAND_UTC_OFFSET = 7; // เขตเวลาประเทศไทย UTC+7

if (typeof require !== 'undefined') {
  // Node.js environment
  moment = require('moment-timezone');
  moment.tz.setDefault(THAILAND_TIMEZONE);
} else if (typeof window !== 'undefined' && window.moment) {
  // Browser environment - ใช้ moment ที่โหลดจาก CDN
  moment = window.moment;
  
  // ตรวจสอบว่า moment-timezone โหลดสำเร็จหรือไม่
  if (moment && moment.tz) {
    console.log('✅ moment-timezone โหลดสำเร็จ (CDN version)');
    // ตั้งค่า timezone เริ่มต้นเป็นเขตเวลาประเทศไทย
    moment.tz.setDefault(THAILAND_TIMEZONE);
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
    
    // ตั้งค่า timezone เริ่มต้นเป็นเขตเวลาประเทศไทย
    this.timezone = THAILAND_TIMEZONE;
    
    this.init();
  }

  // ==================== 
  // Initialization
  // ==================== 

  init() {
    // ปิด modal ทั้งหมดเมื่อเริ่มต้นเพื่อป้องกันการแสดงผลที่ไม่ต้องการ
    this.closeAllModals();
    
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
      // แสดง banner แจ้งเตือนโหมดดูอย่างเดียว
      this.showReadOnlyBanner();
      
      // ปิดเฉพาะปุ่มที่ต้องการ userId จริงๆ
      const needUserButtons = ['addTaskBtn'];
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
    } else {
      // ซ่อน banner เมื่อมี userId
      this.hideReadOnlyBanner();
    }
  }

  // เพิ่มฟังก์ชันใหม่สำหรับปิด modal ทั้งหมด
  closeAllModals() {
    console.log('🔒 ปิด modal ทั้งหมดเมื่อเริ่มต้น');
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => {
      modal.classList.remove('active');
      // เพิ่มการตรวจสอบเพิ่มเติม
      modal.style.display = 'none';
      modal.style.opacity = '0';
      modal.style.visibility = 'hidden';
      modal.style.pointerEvents = 'none';
    });
  }

  // เพิ่มฟังก์ชันใหม่สำหรับเปิด modal ที่ปลอดภัย
  openModal(modalId) {
    // ปิด modal อื่นๆ ก่อน
    this.closeAllModals();
    
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      // เพิ่มการจัดการ CSS เพิ่มเติมเพื่อให้แน่ใจว่า modal จะแสดง
      modal.style.display = 'flex';
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      modal.style.pointerEvents = 'auto';
      console.log(`🔓 เปิด modal: ${modalId}`);
    }
  }

  bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
        
        // ปิด sidebar บน mobile
        if (window.innerWidth <= 768) {
          const sidebar = document.querySelector('.sidebar');
          const overlay = document.getElementById('sidebarOverlay');
          const menuToggle = document.getElementById('menuToggle');
          
          if (sidebar && overlay && menuToggle) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            menuToggle.classList.remove('active');
          }
        }
      });
    });

    // Bottom navigation (mobile)
    document.querySelectorAll('.bottom-nav-item')?.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
        
        // ปิด sidebar บน mobile
        if (window.innerWidth <= 768) {
          const sidebar = document.querySelector('.sidebar');
          const overlay = document.getElementById('sidebarOverlay');
          const menuToggle = document.getElementById('menuToggle');
          
          if (sidebar && overlay && menuToggle) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            menuToggle.classList.remove('active');
          }
        }
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

    // Section links (ดูทั้งหมด)
    document.querySelectorAll('.section-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = e.currentTarget.getAttribute('href');
        if (href && href.startsWith('#')) {
          const viewName = href.substring(1); // เอา # ออก
          this.switchView(viewName);
          // อัปเดต URL hash
          window.location.hash = href;
          
                     // ปิด sidebar บน mobile
           if (window.innerWidth <= 768) {
             const sidebar = document.querySelector('.sidebar');
             const overlay = document.getElementById('sidebarOverlay');
             const menuToggle = document.getElementById('menuToggle');
             
             if (sidebar && overlay && menuToggle) {
               sidebar.classList.remove('open');
               overlay.classList.remove('active');
               menuToggle.classList.remove('active');
             }
           }
        }
      });
    });

    // Handle URL hash changes
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.substring(1); // เอา # ออก
      if (hash && ['dashboard', 'calendar', 'tasks', 'files', 'leaderboard', 'reports'].includes(hash)) {
        this.switchView(hash);
      }
    });
    
    // ปิด sidebar เมื่อ resize หน้าจอ
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const menuToggle = document.getElementById('menuToggle');
        
        if (sidebar && overlay && menuToggle) {
          sidebar.classList.remove('open');
          overlay.classList.remove('active');
          menuToggle.classList.remove('active');
        }
      }
    });
    
    // ปิด sidebar เมื่อกด ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const menuToggle = document.getElementById('menuToggle');
        
        if (sidebar && overlay && menuToggle && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
          overlay.classList.remove('active');
          menuToggle.classList.remove('active');
        }

        // Close any active modal on ESC
        this.closeAllModals();
      }
    });

    // Modals
    document.getElementById('addTaskBtn').addEventListener('click', () => {
      this.openAddTaskModal();
    });
    document.getElementById('submitTaskBtn')?.addEventListener('click', () => {
      this.populateSubmitTaskSelect();
      this.openModal('submitTaskModal');
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

    // เพิ่มการจัดการ modal ทั้งหมดเมื่อคลิกนอก modal
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    });
    document.getElementById('cancelReviewTask')?.addEventListener('click', () => {
      this.closeModal('reviewTaskModal');
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
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      const menuToggle = document.getElementById('menuToggle');
      
      if (sidebar && overlay && menuToggle) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        menuToggle.classList.toggle('active');
      }
    });
    
    // Close sidebar when clicking overlay
    document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      const menuToggle = document.getElementById('menuToggle');
      
      if (sidebar && overlay && menuToggle) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        menuToggle.classList.remove('active');
      }
    });

    // Filters
    document.getElementById('statusFilter')?.addEventListener('change', () => {
      this.filterTasks();
    });

    // ไม่ใช้ assignee filter เพื่อให้แสดงงานทั้งหมดในกลุ่ม
    // document.getElementById('assigneeFilter')?.addEventListener('change', () => {
    //   this.filterTasks();
    // });

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

    // Period toggles for stats
    document.querySelectorAll('[data-stats-period]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget || e.target;
        const period = target && target.dataset ? target.dataset.statsPeriod : undefined;
        this.switchStatsPeriod(period);
      });
    });

    // Debug leaderboard button
    const debugLeaderboardBtn = document.getElementById('debugLeaderboardBtn');
    if (debugLeaderboardBtn && !debugLeaderboardBtn._bound) {
              // Debug button removed - no longer needed
      debugLeaderboardBtn._bound = true;
    }

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

  // ==================== 
  // Upload Overlay Helpers
  // ==================== 

  showUploadOverlay({ title = 'กำลังอัปโหลดไฟล์...', subtitle = 'โปรดรอสักครู่' } = {}) {
    const overlay = document.getElementById('uploadOverlay');
    const subtitleEl = document.getElementById('uploadSubtitle');
    const percentEl = document.getElementById('uploadPercent');
    const bar = document.getElementById('uploadProgressBar');
    const detailEl = document.getElementById('uploadDetail');
    if (!overlay) return;
    subtitleEl.textContent = subtitle;
    percentEl.textContent = '0%';
    bar.style.width = '0%';
    bar.classList.add('indeterminate');
    detailEl.textContent = 'กำลังเตรียมไฟล์...';
    overlay.classList.remove('hidden');
  }

  updateUploadOverlay({ loaded = 0, total = 0, lengthComputable = false, detail = '' } = {}) {
    const percentEl = document.getElementById('uploadPercent');
    const bar = document.getElementById('uploadProgressBar');
    const detailEl = document.getElementById('uploadDetail');
    if (!percentEl || !bar) return;
    if (lengthComputable && total > 0) {
      const pct = Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
      percentEl.textContent = `${pct}%`;
      bar.classList.remove('indeterminate');
      bar.style.width = `${pct}%`;
    } else {
      // Unknown total; keep indeterminate animation
      percentEl.textContent = '...';
      bar.classList.add('indeterminate');
      bar.style.width = '40%';
    }
    if (detail) detailEl.textContent = detail;
  }

  hideUploadOverlay() {
    const overlay = document.getElementById('uploadOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  // Low-level uploader with progress (XHR)
  uploadWithProgress(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.responseType = 'json';
      xhr.upload.onprogress = (e) => {
        if (typeof onProgress === 'function') {
          onProgress(e.loaded, e.total, e.lengthComputable);
        }
      };
      xhr.onload = () => {
        const status = xhr.status;
        const resp = xhr.response || {};
        if (status >= 200 && status < 300) {
          resolve(resp);
        } else {
          const err = new Error(resp?.error || `HTTP ${status}`);
          reject(err);
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
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
   * ตรวจสอบว่า moment.js พร้อมใช้งานหรือไม่ (พร้อม timezone support)
   */
  isMomentAvailable() {
    return moment && typeof moment === 'function' && moment.tz && typeof moment.tz === 'function';
  }

  /**
   * ได้เวลาปัจจุบันในเขตเวลาประเทศไทยอย่างปลอดภัย
   */
  getSafeCurrentTime() {
    if (this.isMomentAvailable()) {
      try {
        return moment().tz(this.timezone);
      } catch (error) {
        console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
        return this.adjustToThailandTimezone(new Date());
      }
    } else {
      return this.adjustToThailandTimezone(new Date());
    }
  }

  /**
   * ปรับเวลาให้เป็นเขตเวลาประเทศไทย (UTC+7) แบบ manual
   */
  adjustToThailandTimezone(date) {
    const inputDate = new Date(date);
    if (isNaN(inputDate.getTime())) {
      console.warn('⚠️ Invalid date input:', date);
      return new Date();
    }
    
    const utc = inputDate.getTime() + (inputDate.getTimezoneOffset() * 60000);
    return new Date(utc + (THAILAND_UTC_OFFSET * 3600000));
  }

  /**
   * สร้าง Date object ใหม่ในเขตเวลาประเทศไทย
   */
  createThaiDate(year, month, day, hour = 0, minute = 0) {
    if (this.isMomentAvailable()) {
      try {
        return moment.tz({
          year: year || moment().tz(this.timezone).year(),
          month: (month || moment().tz(this.timezone).month() + 1) - 1, // moment uses 0-based months
          day: day || moment().tz(this.timezone).date(),
          hour: hour,
          minute: minute,
          second: 0,
          millisecond: 0
        }, this.timezone).toDate();
      } catch (error) {
        console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ fallback method:', error);
      }
    }
    
    // Fallback: สร้างแบบ manual
    const now = this.adjustToThailandTimezone(new Date());
    return new Date(
      year || now.getFullYear(),
      (month || now.getMonth() + 1) - 1,
      day || now.getDate(),
      hour,
      minute,
      0,
      0
    );
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
  // Timezone Utility Functions
  // ==================== 

  /**
   * แปลงปี ค.ศ. เป็น พ.ศ. (พร้อม validation)
   */
  convertToThaiYear(year) {
    if (typeof year !== 'number' || isNaN(year)) {
      console.warn('⚠️ Invalid year input:', year);
      return new Date().getFullYear() + 543;
    }
    return year + 543;
  }

  /**
   * แปลงปี พ.ศ. กลับเป็น ค.ศ.
   */
  convertFromThaiYear(thaiYear) {
    if (typeof thaiYear !== 'number' || isNaN(thaiYear)) {
      console.warn('⚠️ Invalid Thai year input:', thaiYear);
      return new Date().getFullYear();
    }
    return thaiYear - 543;
  }

  /**
   * ตรวจสอบว่าวันที่อยู่ในช่วงเวลาทำงานหรือไม่
   */
  isWorkingHours(date = null) {
    const checkDate = date ? new Date(date) : this.getSafeCurrentTime();
    const hour = this.isMomentAvailable() 
      ? moment(checkDate).tz(this.timezone).hour()
      : this.adjustToThailandTimezone(checkDate).getHours();
    
    return hour >= 9 && hour < 18; // 09:00 - 18:00
  }

  /**
   * ได้วันทำงานถัดไป (ข้ามวันหยุดเสาร์อาทิตย์)
   */
  getNextWorkingDay(date = null) {
    let nextDay = date ? new Date(date) : this.getSafeCurrentTime();
    nextDay = new Date(nextDay.getTime() + (24 * 60 * 60 * 1000)); // เพิ่ม 1 วัน
    
    // ข้ามวันเสาร์ (6) และวันอาทิตย์ (0)
    while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
      nextDay = new Date(nextDay.getTime() + (24 * 60 * 60 * 1000));
    }
    
    return nextDay;
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

  async loadStats(period = 'this_week') {
    try {
      const response = await this.apiRequest(`/api/groups/${this.currentGroupId}/stats?period=${period}`);
      this.updateStats(response.data, period);
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

      // ไม่ส่ง assignee filter เพื่อให้แสดงงานทั้งหมดในกลุ่ม
      const { assignee, ...otherFilters } = this._lastTaskFilters;
      const queryParams = new URLSearchParams(otherFilters).toString();
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
      const container = document.getElementById('tasksList') || document.getElementById('tasksContainer');
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
          // แสดง overlay และคำนวณขนาดรวม (เพื่อแสดงรายละเอียด)
          const fileArr = Array.from(files);
          const totalSize = fileArr.reduce((s, f) => s + (f.size || 0), 0);
          this.showUploadOverlay({ subtitle: `${fileArr.length} ไฟล์ • รวม ${this.formatFileSize(totalSize)}` });

          const url = `${this.apiBase}/api/groups/${this.currentGroupId}/files/upload`;
          const data = await this.uploadWithProgress(url, formData, (loaded, total, lengthComputable) => {
            this.updateUploadOverlay({ loaded, total, lengthComputable, detail: `${this.formatFileSize(loaded)} / ${lengthComputable ? this.formatFileSize(total) : 'ไม่ทราบขนาด'}` });
          });

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
          this.hideUploadOverlay();
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
          <button type="button" class="file-preview-remove" onclick="dashboard.removeInitialFile(${index})">
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

  async uploadInitialFiles(uploaderId) {
    if (!this.selectedInitialFiles || this.selectedInitialFiles.length === 0) {
      return [];
    }

    const formData = new FormData();
    let userId = uploaderId || this.currentUserId || this.currentUser?.lineUserId;
    if (!userId) {
      userId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    formData.append('userId', userId);
    // explicitly mark as initial attachments
    formData.append('attachmentType', 'initial');
    
    for (let i = 0; i < this.selectedInitialFiles.length; i++) {
      formData.append('attachments', this.selectedInitialFiles[i]);
    }

    try {
      // แสดง Overlay และอัปโหลดแบบมี progress
      const files = this.selectedInitialFiles || [];
      const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);
      this.showUploadOverlay({ subtitle: `${files.length} ไฟล์ • รวม ${this.formatFileSize(totalSize)}` });

      const url = `${this.apiBase}/api/groups/${this.currentGroupId}/files/upload`;
      const result = await this.uploadWithProgress(url, formData, (loaded, total, lengthComputable) => {
        this.updateUploadOverlay({ loaded, total, lengthComputable, detail: `${this.formatFileSize(loaded)} / ${lengthComputable ? this.formatFileSize(total) : 'ไม่ทราบขนาด'}` });
      });
      // รองรับทั้งรูปแบบ { success, data: File[] } และ { files: File[] }
      if (result && Array.isArray(result.data)) return result.data;
      if (result && Array.isArray(result.files)) return result.files;
      return [];
    } catch (error) {
      console.error('❌ Failed to upload initial files:', error);
      throw error;
    } finally {
      this.hideUploadOverlay();
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
          const fallbackUploader = (taskData.createdBy && taskData.createdBy !== 'unknown')
            ? taskData.createdBy
            : (Array.isArray(taskData.assigneeIds) && taskData.assigneeIds.length > 0
                ? taskData.assigneeIds[0]
                : (this.currentUserId || this.currentUser?.lineUserId || null));
          uploadedFiles = await this.uploadInitialFiles(fallbackUploader);
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
      this.openModal('successModal');
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

    // อัปเดต URL hash
    window.location.hash = `#${viewName}`;

    // Auto-close sidebar on mobile after navigation
    if (window.innerWidth <= 768) {
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      const menuToggle = document.getElementById('menuToggle');
      
      if (sidebar && overlay && menuToggle) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        menuToggle.classList.remove('active');
      }
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
        // เพิ่ม event listener สำหรับปุ่มซิงค์ leaderboard
        {
          // Sync leaderboard button removed - no longer needed
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
      // ดึงงานทั้งหมดในกลุ่มที่ยังไม่เสร็จ (pending, overdue, in_progress) โดยไม่กรองตามผู้ใช้
      // ใช้ API call เดียวเพื่อประสิทธิภาพที่ดีกว่า
      const response = await this.apiRequest(`/api/groups/${this.currentGroupId}/tasks?limit=10`);
      const allTasks = response.data || [];
      
      // กรองเฉพาะงานที่ยังไม่เสร็จและเรียงตามวันที่ครบกำหนด
      const incompleteTasks = allTasks.filter(task => 
        ['pending', 'overdue', 'in_progress'].includes(task.status)
      );
      const sortedTasks = incompleteTasks.sort((a, b) => new Date(a.dueTime) - new Date(b.dueTime)).slice(0, 5);
      
      // อัปเดต cache ด้วยรายการล่าสุดบางส่วน เพื่อให้เปิด modal ได้แม้ยังไม่กดเข้า view Tasks
      this._taskCache = Array.from(new Map([...(this._taskCache||[]), ...sortedTasks].map(t => [t.id, t])).values());
      this.updateUpcomingTasks(sortedTasks);
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
        this.updateMiniLeaderboard([]);
      }
    } catch (error) {
      console.error('Failed to load mini leaderboard:', error);
      if (error.message && error.message.includes('500')) {
        this.showToast('เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่ในภายหลัง', 'error');
      } else {
        this.showToast('ไม่สามารถโหลดข้อมูลอันดับได้', 'error');
      }
      const container = document.getElementById('miniLeaderboard');
      if (container) {
        container.innerHTML = '<p class="text-muted">ไม่สามารถโหลดข้อมูลอันดับได้</p>';
      }
    }
  }

  updateMiniLeaderboard(leaderboard) {
    const container = document.getElementById('miniLeaderboard');
    if (!container) {
      console.error('❌ Container miniLeaderboard not found');
      return;
    }
    
    if (!leaderboard || leaderboard.length === 0) {
      container.innerHTML = '<p class="text-muted">ยังไม่มีข้อมูลอันดับ</p>';
      console.log('⚠️ No leaderboard data provided');
      return;
    }

    console.log('🔄 Rendering mini leaderboard with', leaderboard.length, 'users');
    console.log('📊 Full leaderboard data:', JSON.stringify(leaderboard, null, 2));

    // สร้าง HTML ใหม่ทั้งหมด
    let html = '';
    
    leaderboard.forEach((user, index) => {
      console.log(`👤 Processing user ${index + 1}:`, user);
      
      // ดึงข้อมูลผู้ใช้
      const name = user.displayName || user.name || user.realName || 'ไม่ทราบชื่อ';
      const score = Number(user.totalScore || user.weeklyPoints || user.monthlyPoints || user.totalPoints || 0);
      const tasks = Number(user.tasksCompleted || user.weeklyTasksCompleted || user.completedTasks || 0);
      const onTimeRate = Math.round(user.onTimeRate || 0);
      
      console.log(`📝 User ${index + 1} data:`, {
        originalName: user.displayName,
        fallbackName: user.name,
        realName: user.realName,
        finalName: name,
        score: score,
        tasks: tasks
      });
      
      // กำหนดอันดับ
      let rankIcon, rankClass;
      if (index === 0) {
        rankIcon = '🥇';
        rankClass = 'gold';
      } else if (index === 1) {
        rankIcon = '🥈';
        rankClass = 'silver';
      } else if (index === 2) {
        rankIcon = '🥉';
        rankClass = 'bronze';
      } else {
        rankIcon = String(index + 1);
        rankClass = '';
      }
      
      // สร้าง HTML สำหรับแต่ละรายการ
      html += `
        <div class="leaderboard-item mini">
          <div class="rank ${rankClass}">${rankIcon}</div>
          <div class="user-info">
            <div class="user-name">${name}</div>
            <div class="user-score-text">${score.toFixed(1)} คะแนนรวม • ตรงเวลา ${onTimeRate}%</div>
          </div>
          <div class="user-stats">
            <div class="user-score">${tasks} งาน</div>
          </div>
        </div>
      `;
    });
    
    console.log('🎨 Generated HTML:', html);
    container.innerHTML = html;
    console.log('✅ Mini leaderboard rendered successfully');
  }

  updateLeaderboard(users) {
    const container = document.getElementById('leaderboardList');
    if (!container) {
      console.error('❌ Container leaderboardList not found');
      return;
    }

    if (!users || users.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">ยังไม่มีข้อมูลอันดับ</div>';
      console.log('⚠️ No users data provided');
      return;
    }

    console.log('🔄 Rendering main leaderboard with', users.length, 'users');
    console.log('📊 Full users data:', JSON.stringify(users, null, 2));

    // สร้าง HTML ใหม่ทั้งหมด
    let html = '';
    
    users.forEach((user, index) => {
      console.log(`👤 Processing user ${index + 1}:`, user);
      
      // ดึงข้อมูลผู้ใช้
      const name = user.displayName || user.name || user.realName || 'ไม่ทราบชื่อ';
      const score = Number(user.totalScore || user.weeklyPoints || user.monthlyPoints || user.totalPoints || 0);
      const tasks = Number(user.tasksCompleted || user.weeklyTasksCompleted || user.completedTasks || 0);
      const onTimeRate = Math.round(user.onTimeRate || 0);
      const createdRate = Math.round(user.createdCompletedRate || 0);
      const bonus = Math.round(user.consistencyScore || 0);
      const penalty = Math.abs(Math.round(user.penaltyPoints || 0));
      
      console.log(`📝 User ${index + 1} data:`, {
        originalName: user.displayName,
        fallbackName: user.name,
        realName: user.realName,
        finalName: name,
        score: score,
        tasks: tasks,
        early: early,
        onTime: onTime
      });
      
      // กำหนดอันดับ
      let rankIcon, rankClass;
      if (index === 0) {
        rankIcon = '🥇';
        rankClass = 'gold';
      } else if (index === 1) {
        rankIcon = '🥈';
        rankClass = 'silver';
      } else if (index === 2) {
        rankIcon = '🥉';
        rankClass = 'bronze';
            } else {
        rankIcon = String(index + 1);
        rankClass = '';
      }
      
      // สร้าง HTML สำหรับแต่ละรายการ
      html += `
        <div class="leaderboard-item">
          <div class="rank ${rankClass}">${rankIcon}</div>
          <div class="user-info">
            <div class="user-name">${name}</div>
            <div class="user-score-text">เสร็จ ${tasks} งาน • ตรงเวลา ${onTimeRate}% • งานที่สั่งสำเร็จ ${createdRate}%</div>
          </div>
          <div class="user-stats">
            <div class="user-score">${score.toFixed(1)}</div>
            <div class="user-substats">โบนัส ${bonus} pts • โทษ ${penalty} pts</div>
          </div>
        </div>
      `;
    });
    
    console.log('🎨 Generated HTML:', html);
    container.innerHTML = html;
    console.log('✅ Main leaderboard rendered successfully');
  }

  updateStats(stats, period = 'this_week') {
    const statsData = (stats && stats.stats) || {};
    document.getElementById('totalTasks').textContent = statsData.totalTasks || 0;
    document.getElementById('pendingTasks').textContent = statsData.pendingTasks || 0;
    document.getElementById('completedTasks').textContent = statsData.completedTasks || 0;
    document.getElementById('overdueTasks').textContent = statsData.overdueTasks || 0;
    
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
        <div class="task-actions">
          ${task.status === 'pending' ? `
            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); app.openSubmitTaskModal('${task.id}')">
              <i class="fas fa-upload"></i> ส่งงาน
            </button>
          ` : ''}
          ${task.status === 'overdue' ? `
            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); app.openSubmitTaskModal('${task.id}')">
              <i class="fas fa-upload"></i> ส่งงาน
            </button>
          ` : ''}
          ${task.status === 'in_progress' ? `
            <button class="btn btn-sm btn-info" onclick="event.stopPropagation(); app.openSubmitTaskModal('${task.id}')">
              <i class="fas fa-upload"></i> ส่งงาน
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  updateTasksList(tasks, pagination) {
    const container = document.getElementById('tasksList') || document.getElementById('tasksContainer');
    if (!container) {
      console.warn('Tasks container not found: #tasksList or #tasksContainer');
      return;
    }
    
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
      const attachedFilesObjs = hasAttachments && typeof task.attachedFiles[0] === 'object' ? task.attachedFiles : [];
      
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
              ${task.status === 'overdue' ? `
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); app.openSubmitTaskModal('${task.id}')">
                  <i class="fas fa-upload"></i> ส่งงาน
                </button>
              ` : ''}
              ${task.status === 'in_progress' ? `
                <button class="btn btn-sm btn-info" onclick="event.stopPropagation(); app.openSubmitTaskModal('${task.id}')">
                  <i class="fas fa-upload"></i> ส่งงาน
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
                ${attachedFilesObjs.slice(0, 3).map(file => `
                  <div class="attachment-preview-item" style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: white; border-radius: 6px; cursor: pointer; transition: all 0.2s ease; border: 1px solid #e5e7eb;"
                       onclick="event.stopPropagation(); dashboard.viewFile('${file.id}')"
                       onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#3b82f6'"
                       onmouseout="this.style.background='white'; this.style.borderColor='#e5e7eb'">
                    <i class="fas ${this.getFileIcon(file.mimeType)}" style="color: #6b7280; font-size: 0.875rem; width: 16px;"></i>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-size: 0.8125rem; font-weight: 500; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.originalName}</div>
                      <div style="font-size: 0.75rem; color: #6b7280;">${this.formatFileSize(file.size)}</div>
                    </div>
                    <div style="display: flex; gap: 4px;">
                      <button class="btn btn-xs btn-outline" onclick="event.stopPropagation(); dashboard.viewFile('${file.id}')" 
                              style="padding: 2px 6px; font-size: 0.6875rem; border: none; background: #e0f2fe; color: #0277bd;">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button class="btn btn-xs btn-outline" onclick="event.stopPropagation(); dashboard.downloadFile('${file.id}')" 
                              style="padding: 2px 6px; font-size: 0.6875rem; border: none; background: #f0f9ff; color: #0369a1;">
                        <i class="fas fa-download"></i>
                      </button>
                    </div>
                  </div>
                `).join('')}
                ${attachedFilesObjs.length > 3 ? `
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
             data-file-id="${file.id}" onclick="dashboard.viewFile('${file.id}')">
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
            <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); dashboard.downloadFile('${file.id}')" 
                    style="flex: 1; padding: 4px 8px; font-size: 0.75rem;">
              <i class="fas fa-download"></i> ดาวน์โหลด
            </button>
            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); dashboard.viewFile('${file.id}')" 
                    style="flex: 1; padding: 4px 8px; font-size: 0.75rem;">
              <i class="fas fa-eye"></i> ดู
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  updateMembersList(members) {
    const select = document.getElementById('taskAssignees');
    const filter = document.getElementById('assigneeFilter');
    const reviewerSelect = document.getElementById('reviewerSelect');
    const reportUserSelect = document.getElementById('reportUserSelect');
    
    if (select) {
      // แสดงเป็น checkbox list เพื่อเลือกหลายคนได้ง่าย
      select.innerHTML = members.map(member => 
        `<label class="checkbox-item"><input type="checkbox" class="assignee-checkbox" value="${member.lineUserId || member.id}"><span>${member.displayName || member.realName || member.name || 'ไม่ระบุชื่อ'}</span></label>`
      ).join('');
    }
    
    // ไม่ใช้ assignee filter เพื่อให้แสดงงานทั้งหมดในกลุ่ม
    // if (filter) {
    //   // ส่งค่าเป็น lineUserId ให้ backend แปลงเป็น internal id ถูกต้อง
    //   filter.innerHTML = '<option value="">ผู้รับผิดชอบทั้งหมด</option>' + 
    //     members.map(member => 
    //       `<option value="${member.lineUserId || member.id}">${member.displayName}</option>`
    //     ).join('');
    // }

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

    // เติม dropdown ผู้ใช้ในหน้า Reports
    if (reportUserSelect) {
      const currentValue = reportUserSelect.value;
      reportUserSelect.innerHTML = '<option value="">ทุกคนในกลุ่ม</option>' +
        members.map(member => `<option value="${member.lineUserId || member.id}">${member.displayName}</option>`).join('');
      // คงค่าที่เลือกไว้ถ้ามีอยู่เดิม
      if (currentValue && Array.from(reportUserSelect.options).some(opt => opt.value === currentValue)) {
        reportUserSelect.value = currentValue;
      }
    }
  }

  // ==================== 
  // Modal Management
  // ==================== 

  // Helper function to get creator display name
  getCreatorDisplayName(task) {
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
        return creator.displayName || creator.name || task.createdBy;
      }
    }
    
    return task.createdBy;
  }

  // Helper function to get reviewer display HTML
  getReviewerDisplayHTML(task) {
    if (!task.reviewerUserId && !task.reviewerUser && !task.workflow?.review?.reviewerUserId) {
      return `
        <div class="task-reviewer">
          <h4>ผู้ตรวจงาน</h4>
          <p>ไม่ระบุผู้ตรวจ</p>
        </div>
      `;
    }

    // Get reviewer ID from multiple possible sources
    const reviewerUserId = task.reviewerUserId || task.workflow?.review?.reviewerUserId;
    
    // If we have reviewer user object from API
    if (task.reviewerUser) {
      return `
        <div class="task-reviewer">
          <h4>ผู้ตรวจงาน</h4>
          <p>${task.reviewerUser.displayName || task.reviewerUser.realName || task.reviewerUser.name || 'ไม่ระบุชื่อ'}</p>
        </div>
      `;
    }
    
    // Find reviewer in group members
    if (reviewerUserId && this.groupMembers && this.groupMembers.length > 0) {
      const reviewer = this.groupMembers.find(m => 
        m.lineUserId === reviewerUserId || 
        m.id === reviewerUserId ||
        m.userId === reviewerUserId
      );
      
      if (reviewer) {
        return `
          <div class="task-reviewer">
            <h4>ผู้ตรวจงาน</h4>
            <p>${reviewer.displayName || reviewer.realName || reviewer.name || 'ไม่ระบุชื่อ'}</p>
          </div>
        `;
      }
    }
    
    // Fallback to showing the ID
    return `
      <div class="task-reviewer">
        <h4>ผู้ตรวจงาน</h4>
        <p>ผู้ตรวจ: ${reviewerUserId}</p>
      </div>
    `;
  }

  // Setup file upload functionality for create task modal
  setupTaskFileUpload() {
    const fileInput = document.getElementById('taskFiles');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileList = document.getElementById('fileList');

    if (!fileInput || !fileUploadArea || !fileList) return;

    // Remove existing event listeners to prevent duplicates
    fileUploadArea.replaceWith(fileUploadArea.cloneNode(true));
    const newUploadArea = document.getElementById('fileUploadArea');

    // Click to upload
    newUploadArea.addEventListener('click', () => {
      fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      this.handleTaskFileSelection(e.target.files);
    });

    // Drag and drop
    newUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      newUploadArea.classList.add('dragover');
    });

    newUploadArea.addEventListener('dragleave', () => {
      newUploadArea.classList.remove('dragover');
    });

    newUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      newUploadArea.classList.remove('dragover');
      this.handleTaskFileSelection(e.dataTransfer.files);
    });
  }

  // Handle file selection for create task modal
  handleTaskFileSelection(files) {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;

    // Clear previous files
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
            <i class="fas fa-file"></i>
          </div>
          <div class="file-details">
            <div class="file-name">${this.escapeHtml(file.name)}</div>
            <div class="file-size">${this.formatFileSize(file.size)}</div>
          </div>
        </div>
        <button type="button" class="file-remove" onclick="dashboard.removeTaskFile(${index})">
          <i class="fas fa-times"></i>
        </button>
      `;
      fileList.appendChild(fileItem);
    });
  }

  // Remove file from task files
  removeTaskFile(index) {
    const fileInput = document.getElementById('taskFiles');
    if (!fileInput) return;

    // Create new FileList without the selected file
    const dt = new DataTransfer();
    for (let i = 0; i < fileInput.files.length; i++) {
      if (i !== index) {
        dt.items.add(fileInput.files[i]);
      }
    }
    fileInput.files = dt.files;

    // Update UI
    this.handleTaskFileSelection(fileInput.files);
  }

  openAddTaskModal() {
    this.openModal('addTaskModal');
    this.loadGroupMembers(); // Load members for assignee selection
    
    // Setup file upload functionality
    this.setupTaskFileUpload();

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
        const filesResponse = await this.apiRequest(`/api/groups/${this.currentGroupId}/tasks/${taskId}/files`);
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
              <p>${(task.assignedUsers || task.assignees || []).map(u => u.displayName || u.name).join(', ') || 'ไม่ระบุ'}</p>
            </div>

            ${this.getReviewerDisplayHTML(task)}

            ${attachedFiles.length > 0 ? `
              <div class="task-attachments">
                <h4>📎 ไฟล์แนบ (${attachedFiles.length})</h4>
                
                <!-- แยกไฟล์ตามประเภท -->
                ${(() => {
                  const initialFiles = attachedFiles.filter(f => f.attachmentType === 'initial');
                  const submissionFiles = attachedFiles.filter(f => f.attachmentType === 'submission');
                  const otherFiles = attachedFiles.filter(f => !f.attachmentType);
                  
                  let sections = [];
                  
                  if (initialFiles.length > 0) {
                    sections.push(`
                      <div style="margin-bottom: 20px;">
                        <h5 style="color: #059669; font-size: 0.9rem; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                          <i class="fas fa-file-alt"></i> ไฟล์ต้นฉบับ (${initialFiles.length})
                        </h5>
                        <div class="attachments-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
                          ${initialFiles.map(file => this.renderFileCard(file)).join('')}
                        </div>
                      </div>
                    `);
                  }
                  
                  if (submissionFiles.length > 0) {
                    sections.push(`
                      <div style="margin-bottom: 20px;">
                        <h5 style="color: #3b82f6; font-size: 0.9rem; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                          <i class="fas fa-upload"></i> ไฟล์ที่ส่ง (${submissionFiles.length})
                        </h5>
                        <div class="attachments-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
                          ${submissionFiles.map(file => this.renderFileCard(file)).join('')}
                        </div>
                      </div>
                    `);
                  }
                  
                  if (otherFiles.length > 0) {
                    sections.push(`
                      <div style="margin-bottom: 20px;">
                        <h5 style="color: #6b7280; font-size: 0.9rem; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                          <i class="fas fa-file"></i> ไฟล์อื่นๆ (${otherFiles.length})
                        </h5>
                        <div class="attachments-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
                          ${otherFiles.map(file => this.renderFileCard(file)).join('')}
                        </div>
                      </div>
                    `);
                  }
                  
                  return sections.join('');
                })()}
              </div>
            ` : ''}

            <div class="task-actions">
              ${task.status === 'pending' ? `
                <button class="btn btn-primary" onclick="app.openSubmitTaskModal('${task.id}')">
                  <i class="fas fa-upload"></i> ส่งงาน
                </button>
              ` : ''}
              ${task.status === 'overdue' ? `
                <button class="btn btn-primary" onclick="app.openSubmitTaskModal('${task.id}')">
                  <i class="fas fa-upload"></i> ส่งงาน
                </button>
              ` : ''}
              ${task.status === 'in_progress' ? `
                <button class="btn btn-info" onclick="app.openSubmitTaskModal('${task.id}')">
                  <i class="fas fa-upload"></i> ส่งงาน
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
      
      this.openModal(modal.id);
      
    } catch (error) {
      console.error('Error opening task modal:', error);
      this.showToast('ไม่สามารถเปิดรายละเอียดงานได้', 'error');
    }
  }

  openSubmitModal(taskId) {
    this.populateSubmitTaskSelect(taskId);
    this.openModal('submitTaskModal');
  }

  openEditTaskModal() {
    // เปิด modal แก้ไขงาน
    this.openModal('editTaskModal');
    
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
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      // เพิ่มการจัดการ CSS เพิ่มเติมเพื่อให้แน่ใจว่า modal จะถูกปิด
      modal.style.display = 'none';
      modal.style.opacity = '0';
      modal.style.visibility = 'hidden';
      modal.style.pointerEvents = 'none';
      console.log(`🔒 ปิด modal: ${modalId}`);
    }
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
      
      // กำหนดผู้สร้างงาน - ใช้ userId จาก URL parameter หรือ fallback เป็น currentUserId
      const urlParams = new URLSearchParams(window.location.search);
      const userIdFromUrl = urlParams.get('userId'); // LINE User ID จาก URL
      
      // ลำดับความสำคัญ: URL userId > current user ID > fallback
      const createdBy = userIdFromUrl 
        ? userIdFromUrl
        : this.currentUserId 
          ? this.currentUserId
          : 'unknown';
      
      taskData.createdBy = createdBy;
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
            createdBy: userIdFromUrl || this.currentUserId || 'unknown' // ใช้ userId จาก URL หรือ fallback
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
          this.openModal('successModal');
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

      this.showToast('อัปเดตงานเรียบร้อยแล้ว', 'success');
      
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
       
       if (!taskId) { 
         this.showToast('กรุณาเลือกงาน', 'error'); 
         return; 
       }

       // อนุญาตให้ส่งได้แม้ไม่มีไฟล์
       const formData = new FormData();
       
       // ใช้ userId ที่มี หรือสร้าง fallback value ที่เหมาะสม
       let userId = this.currentUserId || this.currentUser?.lineUserId;
       if (!userId) {
         // สร้าง temporary userId สำหรับการส่งงาน
         userId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
         console.log('สร้าง temporary userId สำหรับการส่งงาน:', userId);
       }
       
       formData.append('userId', userId);
       formData.append('comment', comment || '');
       
       if (files && files.length > 0) {
         for (let i = 0; i < files.length; i++) {
           formData.append('attachments', files[i]);
         }
       }

       console.log('Submitting task:', { taskId, userId, filesCount: files?.length || 0 });

      // แสดง Overlay และอัปโหลดแบบมี progress
      const selectedFiles = files ? Array.from(files) : [];
      const totalSize = selectedFiles.reduce((s, f) => s + (f.size || 0), 0);
      this.showUploadOverlay({ subtitle: `${selectedFiles.length} ไฟล์ • รวม ${this.formatFileSize(totalSize)}` });

      const url = `/api/dashboard/tasks/${taskId}/submit`;
      const data = await this.uploadWithProgress(url, formData, (loaded, total, lengthComputable) => {
        this.updateUploadOverlay({ loaded, total, lengthComputable, detail: `${this.formatFileSize(loaded)} / ${lengthComputable ? this.formatFileSize(total) : 'ไม่ทราบขนาด'}` });
      });
       if (data.success) {
         this.showToast('ส่งงานสำเร็จ', 'success');
         this.closeModal('submitTaskModal');
         this.refreshCurrentView();
         
         // รีเซ็ตฟอร์ม
         document.getElementById('submitComment').value = '';
         document.getElementById('submitFiles').value = '';
       } else {
         this.showToast(data.error || 'ส่งงานไม่สำเร็จ', 'error');
       }
    } catch (error) {
      console.error('submitTask error:', error);
      this.showToast(`ส่งงานไม่สำเร็จ: ${error.message}`, 'error');
    } finally {
      this.hideUploadOverlay();
    }
   }

     async populateSubmitTaskSelect(selectedTaskId = '') {
    try {
      // ดึงงานทั้งหมดในกลุ่มที่ยังไม่เสร็จ (pending, overdue, in_progress) โดยไม่กรองตามผู้ใช้
      // ใช้ API call เดียวเพื่อประสิทธิภาพที่ดีกว่า
      const response = await this.apiRequest(`/api/groups/${this.currentGroupId}/tasks`);
      const allTasks = response.data || [];
      
      // กรองเฉพาะงานที่ยังไม่เสร็จ
      const incompleteTasks = allTasks.filter(task => 
        ['pending', 'overdue', 'in_progress'].includes(task.status)
      );
      
      const sel = document.getElementById('submitTaskId');
      
      if (incompleteTasks.length === 0) {
        sel.innerHTML = '<option value="">ไม่มีงานที่รอการส่ง</option>';
        // แสดงข้อความแนะนำ
        this.showToast('ไม่มีงานที่รอการส่งในขณะนี้', 'info');
      } else {
        sel.innerHTML = incompleteTasks.map(t => `<option value="${t.id}" ${selectedTaskId === t.id ? 'selected' : ''}>${t.title} (${this.getStatusText(t.status)})</option>`).join('');
      }
    } catch (error) {
       console.error('populateSubmitTaskSelect error:', error);
       const sel = document.getElementById('submitTaskId');
       sel.innerHTML = '<option value="">เกิดข้อผิดพลาดในการโหลดข้อมูล</option>';
       this.showToast('ไม่สามารถโหลดรายการงานได้', 'error');
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
    try {
      if (moment && moment.tz) {
        try {
          const now = moment().tz(THAILAND_TIMEZONE);
          this.loadCalendarEvents(now.month() + 1, now.year());
        } catch (error) {
          console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
          const now = this.adjustToThailandTimezone(new Date());
          this.loadCalendarEvents(now.getMonth() + 1, now.getFullYear());
        }
      } else {
        const now = this.adjustToThailandTimezone(new Date());
        this.loadCalendarEvents(now.getMonth() + 1, now.getFullYear());
      }
    } catch (error) {
      console.error('❌ Error switching calendar mode:', error);
      this.showToast('เกิดข้อผิดพลาดในการเปลี่ยนโหมดปฏิทิน', 'error');
    }
  }

  async populateReviewTaskSelect(selectedTaskId = '') {
    try {
      // โหลดงานสถานะ pending หรือ in_progress เพื่อให้ผู้ตรวจเลือก
      const response = await this.apiRequest(`/groups/${this.currentGroupId}/tasks?status=pending`);
      const response2 = await this.apiRequest(`/groups/${this.currentGroupId}/tasks?status=in_progress`);
      const tasks = [...(response.data || []), ...(response2.data || [])];
      
      console.log('📋 Found tasks for review:', tasks.length, 'tasks');
      
      // อัปเดต cache รวมนอกเหนือจาก list หลัก เพื่อให้ openTaskModal ใช้ได้กว้างขึ้น
      this._taskCache = Array.from(new Map([...(this._taskCache||[]), ...tasks].map(t => [t.id, t])).values());
      const sel = document.getElementById('reviewTaskId');
      
      if (tasks.length === 0) {
        sel.innerHTML = '<option value="">ไม่มีงานที่รอการตรวจสอบ</option>';
      } else {
        sel.innerHTML = tasks.map(t => `<option value="${t.id}" ${selectedTaskId === t.id ? 'selected' : ''}>${t.title}</option>`).join('');
      }
    } catch (error) {
      console.error('populateReviewTaskSelect error:', error);
      const sel = document.getElementById('reviewTaskId');
      sel.innerHTML = '<option value="">เกิดข้อผิดพลาดในการโหลดข้อมูล</option>';

    }
  }





  switchLeaderboardPeriod(period) {
    document.querySelectorAll('[data-period]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
    
    this.loadLeaderboard(period);
  }

  switchStatsPeriod(period) {
    if (!period) return;
    
    // อัปเดตปุ่มที่เลือก
    document.querySelectorAll('[data-stats-period]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.statsPeriod === period);
    });
    
    // โหลดข้อมูลใหม่
    this.loadStats(period);
  }

  navigateCalendar(direction) {
    try {
      const header = document.getElementById('currentMonth').textContent || '';
      const parts = header.split(' ');
      const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
      const currentMonthIdx = months.indexOf(parts[0]);
      
      let currentYear;
      if (this.isMomentAvailable()) {
        try {
          currentYear = parseInt(parts[1]) || this.getSafeCurrentTime().year();
        } catch (error) {
          console.warn('⚠️ moment.tz ไม่ทำงาน ใช้ Date ปกติแทน:', error);
          currentYear = parseInt(parts[1]) || this.adjustToThailandTimezone(new Date()).getFullYear();
        }
      } else {
        currentYear = parseInt(parts[1]) || this.adjustToThailandTimezone(new Date()).getFullYear();
      }
      
      // Convert Thai Buddhist year back to Gregorian for calculation
      if (currentYear > 2500) {
        currentYear = currentYear - 543;
      }
      
      let m = currentMonthIdx + 1 + direction;
      let y = currentYear;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      
      this.loadCalendarEvents(m, y);
    } catch (error) {
      console.error('❌ Error navigating calendar:', error);
      this.showToast('เกิดข้อผิดพลาดในการเปลี่ยนเดือน', 'error');
    }
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
    // ไม่ใช้ assignee filter เพื่อให้แสดงงานทั้งหมดในกลุ่ม
    // const assignee = document.getElementById('assigneeFilter')?.value;
    const search = document.getElementById('searchTasks')?.value;
    
    const filters = {};
    if (status) filters.status = status;
    // ไม่กรองตาม assignee เพื่อให้แสดงงานทั้งหมดในกลุ่มสำหรับการส่ง
    // if (assignee) filters.assignee = assignee; // ส่ง lineUserId
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

  async downloadFile(fileId, retryAttempt = 0) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    try {
      // Show loading indicator for retries
      if (retryAttempt > 0) {
        this.showToast(`กำลังลองดาวน์โหลดอีกครั้ง... (ครั้งที่ ${retryAttempt + 1})`, 'info');
      }
      
      const response = await fetch(`${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // ปรับปรุงการดึงชื่อไฟล์จาก Content-Disposition header
        let filename = 'download';
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
          // ลองดึงจาก filename*=UTF-8'' ก่อน (RFC 5987)
          const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
          if (utf8Match) {
            filename = decodeURIComponent(utf8Match[1]);
          } else {
            // ลองดึงจาก filename= ปกติ
            const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
            if (filenameMatch) {
              filename = filenameMatch[1];
            }
          }
        }

        // หากไม่มี Content-Disposition หรือไม่สามารถดึงชื่อไฟล์ได้
        if (filename === 'download') {
          try {
            // พยายามดึงข้อมูลไฟล์จาก API เพื่อเอา originalName
            const infoRes = await fetch(`${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}`);
            if (infoRes.ok) {
              let fileData = await infoRes.json();
              if (fileData && typeof fileData === 'object' && 'data' in fileData) {
                fileData = fileData.data;
              }
              if (fileData && fileData.originalName) {
                filename = fileData.originalName;
              }
            }
          } catch (err) {
            console.warn('Failed to fetch file info for filename:', err);
          }

          // หากยังไม่ได้ชื่อไฟล์ ให้ลองใช้ข้อมูลจาก UI
          if (filename === 'download') {
            const nameFromUI = document.querySelector(`[data-file-id="${fileId}"] .file-name`)?.textContent?.trim();
            if (nameFromUI) filename = nameFromUI;
          }
        }

        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        this.showToast('เริ่มดาวน์โหลดไฟล์เรียบร้อย', 'success');
        
      } else {
        // Handle different error types with specific messages
        let errorMessage = `HTTP ${response.status}`;
        let shouldRetry = false;
        
        switch (response.status) {
          case 502:
          case 503:
          case 504:
            errorMessage = 'เซิร์ฟเวอร์ไม่พร้อมใช้งานชั่วคราว';
            shouldRetry = true;
            break;
          case 404:
            errorMessage = 'ไม่พบไฟล์ที่ต้องการดาวน์โหลด';
            break;
          case 403:
            errorMessage = 'ไม่มีสิทธิ์เข้าถึงไฟล์นี้';
            break;
          case 500:
            errorMessage = 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';
            shouldRetry = true;
            break;
          default:
            errorMessage = `เกิดข้อผิดพลาด: ${response.status} ${response.statusText}`;
            shouldRetry = response.status >= 500;
        }
        
        // Retry logic for server errors
        if (shouldRetry && retryAttempt < maxRetries) {
          console.warn(`Download failed with ${response.status}, retrying... (attempt ${retryAttempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * (retryAttempt + 1)));
          return this.downloadFile(fileId, retryAttempt + 1);
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      
      // Check if this is a network error that should be retried
      const isNetworkError = error.name === 'TypeError' || error.message.includes('Failed to fetch');
      const isServerError = error.message.includes('502') || error.message.includes('503') || error.message.includes('504');
      
      if ((isNetworkError || isServerError) && retryAttempt < maxRetries) {
        console.warn(`Network error, retrying... (attempt ${retryAttempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retryAttempt + 1)));
        return this.downloadFile(fileId, retryAttempt + 1);
      }
      
      // Final error message
      let userMessage = 'ไม่สามารถดาวน์โหลดไฟล์ได้';
      if (retryAttempt >= maxRetries) {
        userMessage = `ไม่สามารถดาวน์โหลดไฟล์ได้หลังจากลองแล้ว ${maxRetries + 1} ครั้ง กรุณาลองใหม่อีกครั้งภายหลัง`;
      } else if (error.message && !error.message.includes('HTTP')) {
        userMessage = error.message;
      }
      
      this.showToast(userMessage, 'error');
    }
  }

  async viewFile(fileId) {
    try {
      // แสดง loading
      const modal = document.getElementById('fileViewerModal');
      const loading = document.getElementById('fileViewerLoading');
      const content = document.getElementById('fileViewerContent');
      const title = document.getElementById('fileViewerTitle');
      
      this.openModal('fileViewerModal');
      loading.style.display = 'flex';
      content.innerHTML = '';
      
      // ดึงข้อมูลไฟล์
      const fileResponse = await fetch(`${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}`);
      if (!fileResponse.ok) throw new Error('ไม่สามารถดึงข้อมูลไฟล์ได้');
      
      let fileData = await fileResponse.json();
      // รองรับทั้งรูปแบบ { success, data } และ object ตรง ๆ
      if (fileData && typeof fileData === 'object' && 'data' in fileData) {
        fileData = fileData.data;
      }
      title.textContent = fileData.originalName || 'ดูไฟล์';
      
      // ตั้งค่าปุ่มดาวน์โหลด
      const downloadBtn = document.getElementById('downloadFileBtn');
      downloadBtn.onclick = () => this.downloadFile(fileId);

      // ตรวจสอบขนาดไฟล์ก่อนพรีวิว
      const previewUrl = `${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/preview`;
      const MAX_PREVIEW_SIZE = 1 * 1024 * 1024; // 1MB
      let fileSize = fileData.size;

      if (!fileSize) {
        try {
          const headRes = await fetch(previewUrl, { method: 'HEAD' });
          const len = headRes.headers.get('Content-Length') || headRes.headers.get('content-length');
          if (len) fileSize = parseInt(len, 10);
        } catch (e) {
          console.warn('Failed to fetch file size:', e);
        }
      }

      if (fileSize && fileSize > MAX_PREVIEW_SIZE) {
        const sizeStr = this.formatFileSize(fileSize);
        const limitStr = this.formatFileSize(MAX_PREVIEW_SIZE);
        content.innerHTML = `
          <div class="file-preview-placeholder">
            <i class="fas ${this.getFileIcon(fileData.mimeType)}"></i>
            <h3>${fileData.originalName}</h3>
            <p>ไฟล์นี้มีขนาด ${sizeStr} ซึ่งเกินขีดจำกัดการพรีวิว (${limitStr})</p>
            <button class="btn btn-primary" onclick="dashboard.downloadFile('${fileId}')">
              <i class="fas fa-download"></i> ดาวน์โหลดไฟล์
            </button>
          </div>`;
        loading.style.display = 'none';
        return;
      }

      // สร้างเนื้อหาตามประเภทไฟล์
      const mimeType = fileData.mimeType;
      let fileContent = '';
      
      if (mimeType.startsWith('image/')) {
        // แสดงรูปภาพ
        const imageUrl = `${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/preview`;
        fileContent = `<img src="${imageUrl}" alt="${fileData.originalName}" style="max-width: 100%; max-height: 70vh; object-fit: contain;">`;
      } else if (mimeType === 'application/pdf') {
        // แสดง PDF
        const pdfUrl = `${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/preview`;
        fileContent = `<iframe src="${pdfUrl}" style="width: 100%; height: 70vh; border: none;"></iframe>`;
      } else if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) {
        // แสดงไฟล์ข้อความ (อ่านเฉพาะช่วงแรก)
        const textResponse = await fetch(previewUrl, {
          headers: { Range: `bytes=0-${MAX_PREVIEW_SIZE}` }
        });
        const textContent = await textResponse.text();
        fileContent = `<pre style="background: #f8f9fa; padding: 20px; border-radius: 8px; overflow: auto; max-height: 60vh; white-space: pre-wrap; font-family: 'Courier New', monospace;">${this.escapeHtml(textContent)}</pre>`;
      } else if (mimeType.startsWith('video/')) {
        // แสดงวิดีโอ
        const videoUrl = `${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/preview`;
        fileContent = `<video controls style="max-width: 100%; max-height: 70vh;"><source src="${videoUrl}" type="${mimeType}">ไม่สามารถแสดงวิดีโอได้</video>`;
      } else if (mimeType.startsWith('audio/')) {
        // แสดงเสียง
        const audioUrl = `${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/preview`;
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
            <button class="btn btn-primary" onclick="dashboard.downloadFile('${fileId}')">
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

  viewPdfFile(fileId) {
    const url = `${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/preview`;
    this.openPdfViewer(url);
  }

  viewImageFile(fileId) {
    const url = `${this.apiBase}/api/groups/${this.currentGroupId}/files/${fileId}/preview`;
    this.openImageViewer(url);
  }

  openPdfViewer(pdfUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    modal.innerHTML = `
      <div style="background: white; border-radius: 12px; width: 90%; height: 90%; max-width: 1200px; position: relative; overflow: hidden;">
        <div style="position: absolute; top: 0; left: 0; right: 0; background: #f8f9fa; padding: 12px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; z-index: 10;">
          <h3 style="margin: 0; font-size: 1.1rem; color: #374151;">📄 ดูไฟล์ PDF</h3>
          <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; padding: 4px;">&times;</button>
        </div>
        <iframe src="${pdfUrl}" style="width: 100%; height: 100%; border: none; margin-top: 60px;"></iframe>
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

  openImageViewer(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    modal.innerHTML = `
      <div style="position: relative; max-width: 90%; max-height: 90%;">
        <div style="position: absolute; top: -50px; left: 0; right: 0; text-align: center; z-index: 10;">
          <button onclick="this.closest('.modal').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 1rem;">ปิด</button>
        </div>
        <img src="${imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px;" alt="รูปภาพ">
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

  renderFileCard(file) {
    return `
      <div class="attachment-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" 
           onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" 
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)'">
        
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 48px; height: 48px; background: ${this.getFileColor(file.mimeType)}; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <i class="fas ${this.getFileIcon(file.mimeType)}" style="font-size: 1.5rem; color: white;"></i>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div class="file-name" style="font-weight: 600; font-size: 0.95rem; color: #1f2937; word-break: break-word; line-height: 1.3;">${file.originalName}</div>
            <div class="file-meta" style="font-size: 0.8rem; color: #6b7280; margin-top: 2px;">
              ${this.formatFileSize(file.size)} • ${this.formatDate(file.uploadedAt)}
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 8px;">
          ${file.mimeType === 'application/pdf' ? `
            <button class="btn btn-primary" onclick="event.stopPropagation(); dashboard.viewPdfFile('${file.id}')" 
                    style="flex: 2; padding: 8px 12px; font-size: 0.85rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; transition: background 0.2s ease;"
                    onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
              ดู PDF
            </button>
          ` : file.mimeType.startsWith('image/') ? `
            <button class="btn btn-primary" onclick="event.stopPropagation(); dashboard.viewImageFile('${file.id}')" 
                    style="flex: 2; padding: 8px 12px; font-size: 0.85rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; transition: background 0.2s ease;"
                    onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
              ดูรูป
            </button>
          ` : `
            <button class="btn btn-outline" onclick="event.stopPropagation(); dashboard.viewFile('${file.id}')" 
                    style="flex: 2; padding: 8px 12px; font-size: 0.85rem; background: white; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;"
                    onmouseover="this.style.background='#f9fafb'; this.style.borderColor='#9ca3af'" onmouseout="this.style.background='white'; this.style.borderColor='#d1d5db'">
              ดู
            </button>
          `}
          <button class="btn btn-success" onclick="event.stopPropagation(); dashboard.downloadFile('${file.id}')" 
                  style="flex: 1; padding: 8px 12px; font-size: 0.85rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; transition: background 0.2s ease;"
                  onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
            โหลด
          </button>
        </div>
      </div>
    `;
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
    // Images
    if (mimeType.startsWith('image/')) return 'image';
    
    // Videos
    if (mimeType.startsWith('video/')) return 'video';
    
    // Audio
    if (mimeType.startsWith('audio/')) return 'audio';
    
    // Documents (including PDFs and Office files)
    if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('excel') || 
        mimeType.includes('powerpoint') || mimeType.includes('spreadsheet') || 
        mimeType.includes('presentation') || mimeType.startsWith('text/') ||
        mimeType.includes('opendocument') || mimeType.includes('msword') ||
        mimeType.includes('wordprocessingml')) return 'document';
    
    // Archives
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || 
        mimeType.includes('tar') || mimeType.includes('gz') || mimeType.includes('bzip2')) return 'archive';
    
    // Development files
    if (mimeType.includes('javascript') || mimeType.includes('typescript') || 
        mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('css') ||
        mimeType.includes('html') || mimeType.includes('python') || mimeType.includes('java') ||
        mimeType.includes('cpp') || mimeType.includes('c++') || mimeType.includes('x-sh')) return 'code';
    
    // Design files
    if (mimeType.includes('photoshop') || mimeType.includes('illustrator') || 
        mimeType.includes('indesign') || mimeType.includes('figma') || 
        mimeType.includes('sketch') || mimeType.includes('postscript')) return 'design';
    
    // CAD files
    if (mimeType.includes('dwg') || mimeType.includes('dwf') || 
        mimeType.includes('autocad')) return 'cad';
    
    // 3D files
    if (mimeType.startsWith('model/') || mimeType.includes('blender') || 
        mimeType.includes('obj') || mimeType.includes('fbx') || mimeType.includes('3mf')) return '3d';
    
    // Fonts
    if (mimeType.startsWith('font/') || mimeType.includes('font')) return 'font';
    
    // E-books
    if (mimeType.includes('epub') || mimeType.includes('mobi')) return 'ebook';
    
    // Database
    if (mimeType.includes('sqlite') || mimeType.includes('access')) return 'database';
    
    // Custom formats
    if (mimeType.includes('dvg')) return 'custom';
    
    // Default
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
    this.openModal('submitTaskModal');
  }

  getFileIcon(mimeType) {
    // Images
    if (mimeType.startsWith('image/')) {
      if (mimeType.includes('svg')) return 'fa-file-image';
      return 'fa-image';
    }
    
    // Videos
    if (mimeType.startsWith('video/')) return 'fa-video';
    
    // Audio
    if (mimeType.startsWith('audio/')) return 'fa-music';
    
    // Documents
    if (mimeType.includes('pdf')) return 'fa-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('msword') || mimeType.includes('wordprocessingml')) return 'fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return 'fa-file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
    
    // OpenOffice/LibreOffice
    if (mimeType.includes('opendocument')) {
      if (mimeType.includes('text')) return 'fa-file-word';
      if (mimeType.includes('spreadsheet')) return 'fa-file-excel';
      if (mimeType.includes('presentation')) return 'fa-file-powerpoint';
    }
    
    // Archives
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || 
        mimeType.includes('tar') || mimeType.includes('gz') || mimeType.includes('bzip2')) return 'fa-file-archive';
    
    // Text and Development
    if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('csv')) return 'fa-file-alt';
    if (mimeType.includes('javascript') || mimeType.includes('typescript')) return 'fa-file-code';
    if (mimeType.includes('html') || mimeType.includes('css')) return 'fa-file-code';
    if (mimeType.includes('python') || mimeType.includes('java') || mimeType.includes('cpp') || mimeType.includes('c++')) return 'fa-file-code';
    
    // Design Files
    if (mimeType.includes('photoshop') || mimeType.includes('psd')) return 'fa-file-image';
    if (mimeType.includes('illustrator') || mimeType.includes('postscript')) return 'fa-file-image';
    if (mimeType.includes('indesign') || mimeType.includes('figma') || mimeType.includes('sketch')) return 'fa-palette';
    
    // CAD Files
    if (mimeType.includes('dwg') || mimeType.includes('dwf') || mimeType.includes('autocad')) return 'fa-drafting-compass';
    
    // 3D Files
    if (mimeType.startsWith('model/') || mimeType.includes('blender') || mimeType.includes('obj') || mimeType.includes('fbx')) return 'fa-cube';
    
    // Fonts
    if (mimeType.startsWith('font/') || mimeType.includes('font')) return 'fa-font';
    
    // E-books
    if (mimeType.includes('epub') || mimeType.includes('mobi')) return 'fa-book';
    
    // Database
    if (mimeType.includes('sqlite') || mimeType.includes('access')) return 'fa-database';
    
    // Custom formats like DVG
    if (mimeType.includes('dvg')) return 'fa-file-alt';
    
    // Default
    return 'fa-file';
  }

  getFileColor(mimeType) {
    // Images
    if (mimeType.startsWith('image/')) return '#3b82f6';
    
    // Videos
    if (mimeType.startsWith('video/')) return '#ef4444';
    
    // Audio
    if (mimeType.startsWith('audio/')) return '#8b5cf6';
    
    // Documents
    if (mimeType.includes('pdf')) return '#dc2626';
    if (mimeType.includes('word') || mimeType.includes('msword') || mimeType.includes('wordprocessingml')) return '#2563eb';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return '#059669';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '#ea580c';
    
    // OpenOffice/LibreOffice
    if (mimeType.includes('opendocument')) {
      if (mimeType.includes('text')) return '#2563eb';
      if (mimeType.includes('spreadsheet')) return '#059669';
      if (mimeType.includes('presentation')) return '#ea580c';
    }
    
    // Text and Development
    if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('csv')) return '#6b7280';
    if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('html') || 
        mimeType.includes('css') || mimeType.includes('python') || mimeType.includes('java') || 
        mimeType.includes('cpp') || mimeType.includes('c++')) return '#7c3aed';
    
    // Archives
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || 
        mimeType.includes('tar') || mimeType.includes('gz') || mimeType.includes('bzip2')) return '#f59e0b';
    
    // Design Files
    if (mimeType.includes('photoshop') || mimeType.includes('psd')) return '#31c48d';
    if (mimeType.includes('illustrator') || mimeType.includes('postscript')) return '#ff6a00';
    if (mimeType.includes('indesign') || mimeType.includes('figma') || mimeType.includes('sketch')) return '#a855f7';
    
    // CAD Files
    if (mimeType.includes('dwg') || mimeType.includes('dwf') || mimeType.includes('autocad')) return '#0ea5e9';
    
    // 3D Files
    if (mimeType.startsWith('model/') || mimeType.includes('blender') || mimeType.includes('obj') || mimeType.includes('fbx')) return '#f97316';
    
    // Fonts
    if (mimeType.startsWith('font/') || mimeType.includes('font')) return '#84cc16';
    
    // E-books
    if (mimeType.includes('epub') || mimeType.includes('mobi')) return '#8b5a2b';
    
    // Database
    if (mimeType.includes('sqlite') || mimeType.includes('access')) return '#0891b2';
    
    // Custom formats
    if (mimeType.includes('dvg')) return '#ec4899'; // Pink for custom DVG files
    
    // Default
    return '#9ca3af';
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
        console.log('📊 Leaderboard response fulfilled:', leaderboardResponse.value);
        console.log('📊 Leaderboard data:', leaderboardResponse.value.data);
        this.updateMiniLeaderboard(leaderboardResponse.value.data);
      } else if (leaderboardResponse.status === 'rejected') {
        console.warn('⚠️ ไม่สามารถโหลด Leaderboard ได้:', leaderboardResponse.reason);
        // แสดงข้อความในหน้า dashboard
        const container = document.getElementById('miniLeaderboard');
        if (container) {
          container.innerHTML = '<p class="text-muted">ไม่สามารถโหลดข้อมูลอันดับได้</p>';
        }
      } else {
        console.warn('⚠️ Leaderboard response status:', leaderboardResponse.status);
        console.warn('⚠️ Leaderboard response value:', leaderboardResponse.value);
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

  // syncLeaderboard function removed - no longer needed

  // debugKPIData function removed - no longer needed

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

// Initialize Dashboard
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new Dashboard();
  // Expose after init to ensure handlers can access
  window.dashboard = dashboard;
  // Backward-compat alias for inline handlers referencing `app.*`
  window.app = dashboard;
  // Global submit button (dashboard header)
  document.getElementById('openSubmitFromDashboardBtn')?.addEventListener('click', () => {
    dashboard.openSubmitTaskModal('');
  });
});
