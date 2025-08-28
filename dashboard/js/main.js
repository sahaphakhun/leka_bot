/**
 * Dashboard Main Entry Point
 * ==========================
 */

// รอให้ DOM โหลดเสร็จ
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Dashboard starting...');
  
  // ตรวจสอบว่าเป็นหน้า profile หรือ dashboard
  const isProfilePage = document.querySelector('.profile-container');
  const isDashboardPage = document.querySelector('.dashboard-container');
  
  if (isProfilePage) {
    console.log('📱 Profile page detected');
    // Profile page จะถูก initialize โดย profile.js
    return;
  }
  
  if (isDashboardPage) {
    console.log('📊 Dashboard page detected');
    initializeDashboard();
  } else {
    console.log('⚠️ Unknown page type');
  }
});

/**
 * Initialize Dashboard
 */
function initializeDashboard() {
  try {
    // ตรวจสอบ dependencies
    if (!window.ApiService) {
      console.error('❌ ApiService not found. Loading utils first...');
      loadScript('js/utils.js', () => {
        loadScript('js/api-service.js', () => {
          loadScript('js/dashboard-core.js', () => {
            startDashboard();
          });
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
    
    // สร้าง Dashboard instance
    const dashboard = new Dashboard();
    
    // เพิ่มเข้าไปใน global scope เพื่อให้ไฟล์อื่นเข้าถึงได้
    window.dashboardInstance = dashboard;
    
    console.log('✅ Dashboard started successfully');
    
    // แสดงข้อความสำเร็จ
    showSuccessMessage('Dashboard พร้อมใช้งาน');
    
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
  script.onerror = () => {
    console.error('❌ Failed to load script:', src);
    showErrorMessage('ไม่สามารถโหลดไฟล์: ' + src);
  };
  document.head.appendChild(script);
}

/**
 * Show Error Message
 */
function showErrorMessage(message) {
  const errorContainer = document.createElement('div');
  errorContainer.className = 'error-message-container';
  errorContainer.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>เกิดข้อผิดพลาด</h3>
      <p>${message}</p>
      <button onclick="location.reload()" class="btn btn-primary">ลองใหม่</button>
    </div>
  `;
  
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.innerHTML = '';
    mainContent.appendChild(errorContainer);
  } else {
    document.body.appendChild(errorContainer);
  }
}

/**
 * Show Success Message
 */
function showSuccessMessage(message) {
  // สร้าง toast notification
  if (window.DashboardUtils && window.DashboardUtils.showToast) {
    window.DashboardUtils.showToast(message, 'success');
  } else {
    console.log('✅ ' + message);
  }
}

/**
 * Check Dependencies
 */
function checkDependencies() {
  const dependencies = [
    { name: 'ApiService', path: 'js/api-service.js' },
    { name: 'Dashboard', path: 'js/dashboard-core.js' },
    { name: 'DashboardUtils', path: 'js/utils.js' }
  ];
  
  const missing = dependencies.filter(dep => !window[dep.name]);
  
  if (missing.length > 0) {
    console.log('📦 Missing dependencies:', missing.map(d => d.name));
    return missing;
  }
  
  return [];
}

/**
 * Load Missing Dependencies
 */
function loadMissingDependencies(missingDeps, callback) {
  if (missingDeps.length === 0) {
    callback();
    return;
  }
  
  const dep = missingDeps.shift();
  console.log(`📥 Loading ${dep.name} from ${dep.path}...`);
  
  loadScript(dep.path, () => {
    console.log(`✅ ${dep.name} loaded successfully`);
    loadMissingDependencies(missingDeps, callback);
  });
}

/**
 * Fallback Error Handler
 */
window.addEventListener('error', function(e) {
  console.error('❌ Global error:', e.error);
  
  if (e.error && e.error.message && e.error.message.includes('Dashboard')) {
    showErrorMessage('Dashboard มีปัญหา กรุณารีเฟรชหน้าเว็บ');
  }
});

/**
 * Unhandled Promise Rejection Handler
 */
window.addEventListener('unhandledrejection', function(e) {
  console.error('❌ Unhandled promise rejection:', e.reason);
  
  if (e.reason && e.reason.message) {
    showErrorMessage('เกิดข้อผิดพลาดที่ไม่คาดคิด: ' + e.reason.message);
  }
});

/**
 * Performance Monitoring
 */
if ('performance' in window) {
  window.addEventListener('load', function() {
    const perfData = performance.getEntriesByType('navigation')[0];
    if (perfData) {
      console.log('📊 Page load time:', Math.round(perfData.loadEventEnd - perfData.loadEventStart), 'ms');
    }
  });
}

/**
 * Service Worker Registration (ถ้ามี)
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('✅ ServiceWorker registered:', registration.scope);
      })
      .catch(function(error) {
        console.log('❌ ServiceWorker registration failed:', error);
      });
  });
}

/**
 * Offline Detection
 */
window.addEventListener('online', function() {
  console.log('🌐 Back online');
  if (window.dashboardInstance) {
    window.dashboardInstance.showToast('เชื่อมต่ออินเทอร์เน็ตแล้ว', 'success');
  }
});

window.addEventListener('offline', function() {
  console.log('📴 Gone offline');
  if (window.dashboardInstance) {
    window.dashboardInstance.showToast('การเชื่อมต่ออินเทอร์เน็ตขาดหาย', 'warning');
  }
});

console.log('📋 Dashboard main script loaded');
