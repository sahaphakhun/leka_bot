// Toast Helper Functions
// ใช้งาน react-hot-toast ให้ง่ายขึ้น

import toast from 'react-hot-toast';

/**
 * แสดง Toast สำเร็จ
 * @param {string} message - ข้อความที่ต้องการแสดง
 * @param {object} options - ตัวเลือกเพิ่มเติม
 */
export const showSuccess = (message, options = {}) => {
  return toast.success(message, {
    duration: 2000,
    position: 'top-right',
    style: {
      background: '#10b981',
      color: '#fff',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10b981',
    },
    ...options,
  });
};

/**
 * แสดง Toast ข้อผิดพลาด
 * @param {string} message - ข้อความหลัก
 * @param {Error|string} error - ข้อผิดพลาด (ถ้ามี)
 * @param {object} options - ตัวเลือกเพิ่มเติม
 */
export const showError = (message, error = null, options = {}) => {
  let errorMsg = message;

  if (error) {
    const errorDetail = typeof error === 'string'
      ? error
      : (error?.message || error?.error || 'ไม่ทราบสาเหตุ');
    errorMsg = `${message}: ${errorDetail}`;
  }

  return toast.error(errorMsg, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#ef4444',
      color: '#fff',
      fontWeight: '500',
      maxWidth: '500px',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#ef4444',
    },
    ...options,
  });
};

/**
 * แสดง Toast คำเตือน
 * @param {string} message - ข้อความที่ต้องการแสดง
 * @param {object} options - ตัวเลือกเพิ่มเติม
 */
export const showWarning = (message, options = {}) => {
  return toast.error(message, {
    duration: 3000,
    position: 'top-right',
    icon: '⚠️',
    style: {
      background: '#f59e0b',
      color: '#fff',
      fontWeight: '500',
    },
    ...options,
  });
};

/**
 * แสดง Toast ข้อมูล
 * @param {string} message - ข้อความที่ต้องการแสดง
 * @param {object} options - ตัวเลือกเพิ่มเติม
 */
export const showInfo = (message, options = {}) => {
  return toast(message, {
    duration: 3000,
    position: 'top-right',
    icon: 'ℹ️',
    style: {
      background: '#3b82f6',
      color: '#fff',
      fontWeight: '500',
    },
    ...options,
  });
};

/**
 * แสดง Toast กำลังโหลด
 * @param {string} message - ข้อความที่ต้องการแสดง
 * @param {object} options - ตัวเลือกเพิ่มเติม
 * @returns {string} toastId - ใช้สำหรับ update ทีหลัง
 */
export const showLoading = (message = 'กำลังโหลด...', options = {}) => {
  return toast.loading(message, {
    position: 'top-right',
    style: {
      background: '#fff',
      color: '#374151',
      fontWeight: '500',
    },
    ...options,
  });
};

/**
 * อัพเดท Toast ที่มีอยู่แล้ว
 * @param {string} toastId - ID ของ toast ที่ต้องการอัพเดท
 * @param {string} message - ข้อความใหม่
 * @param {string} type - ประเภท ('success' | 'error' | 'loading')
 * @param {object} options - ตัวเลือกเพิ่มเติม
 */
export const updateToast = (toastId, message, type = 'success', options = {}) => {
  const baseOptions = { id: toastId, ...options };

  if (type === 'success') {
    toast.success(message, baseOptions);
  } else if (type === 'error') {
    toast.error(message, baseOptions);
  } else if (type === 'loading') {
    toast.loading(message, baseOptions);
  } else {
    toast(message, baseOptions);
  }
};

/**
 * ปิด Toast
 * @param {string} toastId - ID ของ toast ที่ต้องการปิด (ถ้าไม่ระบุจะปิดทั้งหมด)
 */
export const dismissToast = (toastId = null) => {
  if (toastId) {
    toast.dismiss(toastId);
  } else {
    toast.dismiss();
  }
};

/**
 * แสดง Toast พร้อม Promise
 * ใช้สำหรับ async operations
 * @param {Promise} promise - Promise ที่ต้องการรอ
 * @param {object} messages - ข้อความสำหรับแต่ละสถานะ
 * @param {object} options - ตัวเลือกเพิ่มเติม
 */
export const showPromise = (
  promise,
  messages = {
    loading: 'กำลังดำเนินการ...',
    success: 'สำเร็จ!',
    error: 'เกิดข้อผิดพลาด',
  },
  options = {}
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: (err) => {
        const errorMsg = err?.message || err?.error || messages.error;
        return `${messages.error}: ${errorMsg}`;
      },
    },
    {
      position: 'top-right',
      ...options,
    }
  );
};

/**
 * แสดง Toast สำหรับการบันทึก
 * @param {Promise} savePromise - Promise การบันทึก
 * @param {string} itemName - ชื่อของสิ่งที่บันทึก
 */
export const showSaveToast = (savePromise, itemName = 'ข้อมูล') => {
  return showPromise(savePromise, {
    loading: `กำลังบันทึก${itemName}...`,
    success: `บันทึก${itemName}สำเร็จ`,
    error: `บันทึก${itemName}ไม่สำเร็จ`,
  });
};

/**
 * แสดง Toast สำหรับการลบ
 * @param {Promise} deletePromise - Promise การลบ
 * @param {string} itemName - ชื่อของสิ่งที่ลบ
 */
export const showDeleteToast = (deletePromise, itemName = 'ข้อมูล') => {
  return showPromise(deletePromise, {
    loading: `กำลังลบ${itemName}...`,
    success: `ลบ${itemName}สำเร็จ`,
    error: `ลบ${itemName}ไม่สำเร็จ`,
  });
};

/**
 * แสดง Toast สำหรับการอัปโหลด
 * @param {Promise} uploadPromise - Promise การอัปโหลด
 * @param {string} itemName - ชื่อของสิ่งที่อัปโหลด
 */
export const showUploadToast = (uploadPromise, itemName = 'ไฟล์') => {
  return showPromise(uploadPromise, {
    loading: `กำลังอัปโหลด${itemName}...`,
    success: `อัปโหลด${itemName}สำเร็จ`,
    error: `อัปโหลด${itemName}ไม่สำเร็จ`,
  });
};

/**
 * แสดง Toast แบบ Custom
 * @param {function} render - Function ที่ return JSX
 * @param {object} options - ตัวเลือกเพิ่มเติม
 */
export const showCustom = (render, options = {}) => {
  return toast.custom(render, {
    position: 'top-right',
    duration: 3000,
    ...options,
  });
};

// Export toast object สำหรับการใช้งานขั้นสูง
export { toast };

// Default export
export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  update: updateToast,
  dismiss: dismissToast,
  promise: showPromise,
  save: showSaveToast,
  delete: showDeleteToast,
  upload: showUploadToast,
  custom: showCustom,
};
