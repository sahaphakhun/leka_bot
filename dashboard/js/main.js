/**
 * Dashboard Main Entry Point
 * ==========================
 */

// รอให้ DOM โหลดเสร็จ
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Dashboard starting...');
  
  // ตรวจสอบว่าเป็นหน้า profile หรือ dashboard
  const isProfilePage = document.querySelector('.profile-container');
<<<<<<< HEAD
  const isDashboardPage = document.querySelector('.main-layout') || document.querySelector('#dashboardView');
=======
  // Broaden detection to support current markup
  const isDashboardPage = document.querySelector('.dashboard-container')
    || document.querySelector('#dashboardView')
    || document.querySelector('.main-layout');
>>>>>>> revert-to-d1698c8
  
  if (isProfilePage) {
    console.log('📱 Profile page detected');
    // Profile page จะถูก initialize โดย profile.js
    return;
  }
  
  if (isDashboardPage) {
    console.log('📊 Dashboard page detected');
    initializeDashboard();
  } else {
    console.log('⚠️ Unknown page type - checking for dashboard elements...');
    // ลองตรวจสอบ elements อื่นๆ ที่อาจบ่งบอกว่าเป็น dashboard
    const hasDashboardElements = document.querySelector('.header') || 
                                document.querySelector('.main-content');
    if (hasDashboardElements) {
      console.log('📊 Dashboard elements found, initializing...');
      initializeDashboard();
    } else {
      console.log('❌ No dashboard elements found');
    }
  }
});

/**
 * Initialize Dashboard
 */
function initializeDashboard() {
  try {
    // ตรวจสอบ dependencies ตามลำดับที่ถูกต้อง
    if (!window.ApiService) {
      console.error('❌ ApiService not found. Loading api-service.js...');
      loadScript('js/api-service.js', () => {
        loadScript('js/dashboard-core.js', () => {
          startDashboard();
        });
      });
      return;
    }
    
    if (!window.Dashboard) {
      console.error('❌ Dashboard class not found. Loading dashboard-core.js...');
      loadScript('js/dashboard-core.js', () => {
        startDashboard();
      });
      return;
    }
    
    startDashboard();
    
  } catch (error) {
    console.error('❌ Failed to initialize dashboard:', error);
    showErrorMessage('ไม่สามารถเริ่มต้น Dashboard ได้: ' + error.message);
  }
}

/**
 * Start Dashboard
 */
function startDashboard() {
  try {
    console.log('🎯 Starting Dashboard...');
    
    // ตรวจสอบว่า Dashboard class มีอยู่จริงหรือไม่
    if (typeof Dashboard === 'undefined') {
      throw new Error('Dashboard class not found');
    }
    
    // สร้าง Dashboard instance
    const dashboard = new Dashboard();
    
    // เพิ่มเข้าไปใน global scope เพื่อให้ไฟล์อื่นเข้าถึงได้
    window.dashboardInstance = dashboard;
    
    console.log('✅ Dashboard started successfully');
    
    // แสดงข้อความสำเร็จ
    if (typeof dashboard.showSuccessMessage === 'function') {
      dashboard.showSuccessMessage('Dashboard พร้อมใช้งาน');
    }
    
  } catch (error) {
    console.error('❌ Failed to start dashboard:', error);
    showErrorMessage('ไม่สามารถเริ่มต้น Dashboard ได้: ' + error.message);
  }
}

/**
 * Load Script Dynamically
 */
function loadScript(src, callback) {
  const script = document.createElement('script');
  script.src = src;
  script.onload = callback;
  script.onerror = function() {
    console.error('❌ Failed to load script:', src);
    if (callback) callback();
  };
  document.head.appendChild(script);
}

/**
 * Show Error Message
 */
function showErrorMessage(message) {
  console.error('❌ Error:', message);
  
  // สร้าง toast notification ถ้ามี
  const toastContainer = document.getElementById('toastContainer');
  if (toastContainer) {
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
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
}

/**
 * Show Success Message
 */
function showSuccessMessage(message) {
  console.log('✅ Success:', message);
  
  // สร้าง toast notification ถ้ามี
  const toastContainer = document.getElementById('toastContainer');
  if (toastContainer) {
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.innerHTML = `
      <i class="fas fa-check-circle"></i>
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
}

// ==================== 
// Global Error Handling
// ==================== 

window.addEventListener('error', function(event) {
  console.error('❌ Global error:', event.error);
  
  // ตรวจสอบว่าเป็น error ที่เกี่ยวกับ Dashboard หรือไม่
  if (event.error && event.error.message && event.error.message.includes('Dashboard')) {
    console.error('❌ Dashboard-related error detected');
  }
});

window.addEventListener('unhandledrejection', function(event) {
  console.error('❌ Unhandled promise rejection:', event.reason);
});

<<<<<<< HEAD
// ==================== 
// Performance Monitoring
// ==================== 

// วัดเวลาการโหลดหน้า
window.addEventListener('load', function() {
  const loadTime = performance.now();
  console.log(`📊 Page load time: ${loadTime.toFixed(0)} ms`);
  
  // ตรวจสอบ Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('✅ ServiceWorker registration successful');
=======
/**
 * Performance Monitoring
 */
if ('performance' in window) {
  window.addEventListener('load', function() {
    const nav = performance.getEntriesByType('navigation')[0];
    let loadMs = 0;
    if (nav && typeof nav.duration === 'number' && nav.duration > 0) {
      loadMs = Math.round(nav.duration);
    } else if (nav) {
      const start = (nav as any).loadEventStart || 0;
      const end = (nav as any).loadEventEnd || 0;
      loadMs = Math.max(0, Math.round(end - start));
    } else if (typeof performance.now === 'function') {
      loadMs = Math.round(performance.now());
    }
    console.log('📊 Page load time:', loadMs, 'ms');
  });
}

/**
 * Service Worker Registration (ถ้ามี)
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    // Prefer dashboard-scoped service worker if available
    const swUrl = '/dashboard/sw.js';
    fetch(swUrl, { method: 'HEAD' })
      .then((resp) => {
        if (!resp || !resp.ok) {
          console.log('ℹ️ ServiceWorker file not found, skipping registration');
          return null;
        }
        return navigator.serviceWorker.register(swUrl, { scope: '/dashboard/' });
      })
      .then((registration) => {
        if (registration) {
          console.log('✅ ServiceWorker registered:', registration.scope);
        }
>>>>>>> revert-to-d1698c8
      })
      .catch(function(err) {
        console.log('ℹ️ ServiceWorker file not found, skipping registration');
      });
  }
});

// ==================== 
// Development Helpers
// ==================== 

// เพิ่ม global helpers สำหรับ development
window.DashboardHelpers = {
  showLoading: function() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.classList.remove('hidden');
    }
  },
  
  hideLoading: function() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.classList.add('hidden');
    }
  },
  
  showToast: function(message, type = 'info') {
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
};

console.log('📋 Dashboard main script loaded');
