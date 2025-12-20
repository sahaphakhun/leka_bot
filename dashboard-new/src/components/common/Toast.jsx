import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";

/**
 * Toast Notification System
 *
 * Beautiful toast notifications for user feedback
 * Provides better UX for actions like create, update, delete
 *
 * Features:
 * - Multiple toast types (success, error, warning, info)
 * - Auto-dismiss with configurable duration
 * - Manual dismiss
 * - Stacking multiple toasts
 * - Position options (top-right, top-center, bottom-right, bottom-center)
 * - Progress bar for auto-dismiss
 * - Icons for each type
 * - Action buttons
 *
 * Usage:
 *
 * 1. Wrap your app with ToastProvider:
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 *
 * 2. Use the toast hook in components:
 * const { showToast } = useToast();
 *
 * showToast({
 *   type: "success",
 *   title: "สำเร็จ",
 *   message: "บันทึกข้อมูลเรียบร้อยแล้ว",
 * });
 *
 * showToast({
 *   type: "error",
 *   title: "เกิดข้อผิดพลาด",
 *   message: "ไม่สามารถบันทึกข้อมูลได้",
 *   duration: 5000,
 * });
 *
 * showToast({
 *   type: "info",
 *   title: "แจ้งเตือน",
 *   message: "มีการอัปเดตใหม่",
 *   action: { label: "ดูเพิ่มเติม", onClick: () => {} },
 * });
 */

// Toast Context
const ToastContext = createContext(null);

// Toast Provider Component
export const ToastProvider = ({ children, position = "top-right", maxToasts = 5 }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(
    ({
      type = "info",
      title = "",
      message = "",
      duration = 4000,
      action = null,
    }) => {
      const id = Date.now() + Math.random();
      const newToast = { id, type, title, message, duration, action };

      setToasts((prev) => {
        const updated = [newToast, ...prev];
        return updated.slice(0, maxToasts);
      });

      // Auto dismiss
      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [maxToasts]
  );

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, dismissAll }}>
      {children}
      <ToastContainer toasts={toasts} position={position} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
  position: PropTypes.oneOf(["top-right", "top-center", "bottom-right", "bottom-center"]),
  maxToasts: PropTypes.number,
};

// Custom hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

// Toast Container Component
const ToastContainer = ({ toasts, position, onDismiss }) => {
  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-right": "bottom-4 right-4",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-2 pointer-events-none`}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
};

ToastContainer.propTypes = {
  toasts: PropTypes.array.isRequired,
  position: PropTypes.string.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

// Individual Toast Component
const Toast = ({ type, title, message, duration, action, onDismiss }) => {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration <= 0) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 50));
        return newProgress > 0 ? newProgress : 0;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for exit animation
  };

  // Icons for each type
  const icons = {
    success: (
      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  // Background colors for each type
  const bgColors = {
    success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  };

  // Progress bar colors
  const progressColors = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
    info: "bg-blue-500",
  };

  return (
    <div
      className={`
        pointer-events-auto min-w-[320px] max-w-md
        ${bgColors[type]}
        border rounded-lg shadow-lg
        transform transition-all duration-300 ease-out
        ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
      role="alert"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {title}
              </p>
            )}
            {message && (
              <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
            )}
            {action && (
              <button
                onClick={action.onClick}
                className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none"
              >
                {action.label}
              </button>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
            aria-label="ปิด"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          <div
            className={`h-full ${progressColors[type]} transition-all duration-50 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

Toast.propTypes = {
  id: PropTypes.number.isRequired,
  type: PropTypes.oneOf(["success", "error", "warning", "info"]).isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  duration: PropTypes.number,
  action: PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
  }),
  onDismiss: PropTypes.func.isRequired,
};

/**
 * Convenience functions for common toast types
 */

// Create these helper hooks
export const useToastHelpers = () => {
  const { showToast } = useToast();

  return {
    success: (message, title = "สำเร็จ") =>
      showToast({ type: "success", title, message }),

    error: (message, title = "เกิดข้อผิดพลาด") =>
      showToast({ type: "error", title, message, duration: 5000 }),

    warning: (message, title = "คำเตือน") =>
      showToast({ type: "warning", title, message }),

    info: (message, title = "แจ้งเตือน") =>
      showToast({ type: "info", title, message }),

    // Common action toasts
    taskCreated: () =>
      showToast({ type: "success", title: "สร้างงานสำเร็จ", message: "งานใหม่ถูกเพิ่มเข้าสู่ระบบแล้ว" }),

    taskUpdated: () =>
      showToast({ type: "success", title: "อัปเดตงานสำเร็จ", message: "บันทึกการเปลี่ยนแปลงแล้ว" }),

    taskDeleted: () =>
      showToast({ type: "success", title: "ลบงานสำเร็จ", message: "ลบงานออกจากระบบแล้ว" }),

    memberAdded: (name) =>
      showToast({ type: "success", title: "เพิ่มสมาชิกสำเร็จ", message: `เพิ่ม ${name} เข้ากลุ่มแล้ว` }),

    fileUploaded: () =>
      showToast({ type: "success", title: "อัปโหลดสำเร็จ", message: "ไฟล์ถูกอัปโหลดเรียบร้อยแล้ว" }),

    networkError: () =>
      showToast({
        type: "error",
        title: "เกิดข้อผิดพลาด",
        message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต",
        duration: 6000,
      }),
  };
};

export default Toast;
