/**
 * Utility Functions for Dashboard
 * ===============================
 */

// ==================== 
// Date & Time Utilities
// ==================== 

/**
 * แปลงปี ค.ศ. เป็น พ.ศ.
 */
function convertToThaiYear(year) {
  return year + 543;
}

/**
 * ตรวจสอบว่า moment.js พร้อมใช้งานหรือไม่
 */
function isMomentAvailable() {
  return window.moment && typeof window.moment === 'function' && window.moment.tz && typeof window.moment.tz === 'function';
}

/**
 * แปลงวันที่เป็น ISO string สำหรับ API
 */
function formatDateForAPI(date, timezone = 'Asia/Bangkok') {
  if (!date) return null;
  
  try {
    if (isMomentAvailable()) {
      return window.moment(date).tz(timezone).toISOString();
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
function parseDateFromAPI(dateString, timezone = 'Asia/Bangkok') {
  if (!dateString) return null;
  
  try {
    if (isMomentAvailable()) {
      return window.moment(dateString).tz(timezone).toDate();
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
function formatDateForForm(date, timezone = 'Asia/Bangkok') {
  if (!date) return '';
  
  try {
    if (isMomentAvailable()) {
      return window.moment(date).tz(timezone).format('YYYY-MM-DD');
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

/**
 * แปลงเวลาเป็นรูปแบบสำหรับ input time
 */
function formatTimeForForm(date, timezone = 'Asia/Bangkok') {
  if (!date) return '23:59';
  
  try {
    if (isMomentAvailable()) {
      return window.moment(date).tz(timezone).format('HH:mm');
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

/**
 * แปลงวันที่เป็นรูปแบบไทย (DD/MM/YYYY)
 */
function formatDate(date, timezone = 'Asia/Bangkok') {
  if (!date) return '-';
  
  try {
    if (isMomentAvailable()) {
      try {
        const momentDate = window.moment(date).tz(timezone);
        const day = momentDate.format('DD');
        const month = momentDate.format('MM');
        const year = convertToThaiYear(momentDate.year());
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
    const year = convertToThaiYear(bangkokTime.getFullYear());
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('❌ Error formatting date:', error);
    // Ultimate fallback
    return new Date().toLocaleDateString('th-TH');
  }
}

/**
 * แปลงวันที่และเวลาเป็นรูปแบบไทย (DD/MM/YYYY HH:mm)
 */
function formatDateTime(date, timezone = 'Asia/Bangkok') {
  if (!date) return '-';
  
  try {
    if (isMomentAvailable()) {
      try {
        const momentDate = window.moment(date).tz(timezone);
        const day = momentDate.format('DD');
        const month = momentDate.format('MM');
        const year = convertToThaiYear(momentDate.year());
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
    const year = convertToThaiYear(bangkkokTime.getFullYear());
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
// File Utilities
// ==================== 

/**
 * รับ icon สำหรับไฟล์ตาม MIME type
 */
function getFileIcon(mimeType) {
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

/**
 * รับสีสำหรับไฟล์ตาม MIME type
 */
function getFileColor(mimeType) {
  if (mimeType.startsWith('image/')) return '#3b82f6';
  if (mimeType.startsWith('video/')) return '#ef4444';
  if (mimeType.startsWith('audio/')) return '#8b5cf6';
  if (mimeType.includes('pdf')) return '#dc2626';
  if (mimeType.includes('word') || mimeType.includes('msword') || mimeType.includes('wordprocessingml')) return '#2563eb';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return '#059669';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '#ea580c';
  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('csv')) return '#6b7280';
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('html') || mimeType.includes('css') || mimeType.includes('python') || mimeType.includes('java') || mimeType.includes('cpp') || mimeType.includes('c++')) return '#7c3aed';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('tar') || mimeType.includes('gz')) return '#f59e0b';
  return '#9ca3af';
}

/**
 * แปลงขนาดไฟล์เป็นรูปแบบที่อ่านได้
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * รับหมวดหมู่ไฟล์ตาม MIME type
 */
function getFileCategory(mimeType) {
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

// ==================== 
// Helper Functions
// ==================== 

/**
 * Debounce function สำหรับลดการเรียกฟังก์ชันบ่อยเกินไป
 */
function debounce(func, wait) {
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

/**
 * แสดง toast notification
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
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
 * Escape HTML เพื่อป้องกัน XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * รับค่าจาก URL parameters
 */
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

/**
 * อัปเดต URL hash โดยไม่ reload หน้า
 */
function updateUrlHash(hash) {
  if (history.pushState) {
    history.pushState(null, null, '#' + hash);
  } else {
    location.hash = '#' + hash;
  }
}

/**
 * ตรวจสอบว่าเป็น mobile device หรือไม่
 */
function isMobileDevice() {
  return window.innerWidth <= 768;
}

/**
 * ตรวจสอบว่าเป็น touch device หรือไม่
 */
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// ==================== 
// Export Functions
// ==================== 

// Export สำหรับใช้ในไฟล์อื่น
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    convertToThaiYear,
    isMomentAvailable,
    formatDateForAPI,
    parseDateFromAPI,
    formatDateForForm,
    formatTimeForForm,
    formatDate,
    formatDateTime,
    getFileIcon,
    getFileColor,
    formatFileSize,
    getFileCategory,
    debounce,
    showToast,
    escapeHtml,
    getUrlParameter,
    updateUrlHash,
    isMobileDevice,
    isTouchDevice
  };
} else {
  // Browser environment - เพิ่มเข้าไปใน global scope
  window.DashboardUtils = {
    convertToThaiYear,
    isMomentAvailable,
    formatDateForAPI,
    parseDateFromAPI,
    formatDateForForm,
    formatTimeForForm,
    formatDate,
    formatDateTime,
    getFileIcon,
    getFileColor,
    formatFileSize,
    getFileCategory,
    debounce,
    showToast,
    escapeHtml,
    getUrlParameter,
    updateUrlHash,
    isMobileDevice,
    isTouchDevice
  };
}
