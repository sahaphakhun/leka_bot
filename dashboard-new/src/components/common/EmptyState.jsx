import React from "react";
import PropTypes from "prop-types";

/**
 * EmptyState Component
 *
 * Beautiful empty state illustrations with call-to-action
 * Improves UX when there's no data to display
 *
 * Features:
 * - Multiple pre-built empty states (no-tasks, no-data, no-results, etc.)
 * - Custom icons using SVG
 * - Optional action buttons
 * - Support for primary and secondary messages
 * - Responsive design
 *
 * Usage Examples:
 *
 * No tasks:
 * <EmptyState
 *   type="no-tasks"
 *   title="ยังไม่มีงาน"
 *   message="เริ่มต้นสร้างงานแรกของคุณ"
 *   actionLabel="สร้างงาน"
 *   onAction={() => openModal()}
 * />
 *
 * No search results:
 * <EmptyState
 *   type="no-results"
 *   title="ไม่พบผลลัพธ์"
 *   message="ลองค้นหาด้วยคำอื่น"
 * />
 *
 * Custom empty state:
 * <EmptyState
 *   icon={<CustomIcon />}
 *   title="Custom Title"
 *   message="Custom message"
 * />
 */

const EmptyState = ({
  type = "no-data",
  icon = null,
  title = "",
  message = "",
  actionLabel = "",
  onAction = null,
  secondaryActionLabel = "",
  onSecondaryAction = null,
  className = "",
}) => {
  // Pre-built icons for common empty states
  const icons = {
    "no-tasks": (
      <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
    "no-data": (
      <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
    ),
    "no-results": (
      <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
    "no-members": (
      <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    "no-files": (
      <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    "error": (
      <svg className="w-24 h-24 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    "no-recurring": (
      <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
    "no-calendar": (
      <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    "no-reports": (
      <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    "access-denied": (
      <svg className="w-24 h-24 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
  };

  // Default titles and messages
  const defaults = {
    "no-tasks": {
      title: "ยังไม่มีงาน",
      message: "เริ่มต้นสร้างงานแรกของคุณเพื่อติดตามความคืบหน้า",
    },
    "no-data": {
      title: "ไม่มีข้อมูล",
      message: "ยังไม่มีข้อมูลที่จะแสดงในขณะนี้",
    },
    "no-results": {
      title: "ไม่พบผลลัพธ์",
      message: "ลองค้นหาด้วยคำอื่นหรือปรับเปลี่ยนตัวกรอง",
    },
    "no-members": {
      title: "ยังไม่มีสมาชิก",
      message: "เชิญสมาชิกเข้ากลุ่มเพื่อเริ่มทำงานร่วมกัน",
    },
    "no-files": {
      title: "ยังไม่มีไฟล์",
      message: "อัปโหลดไฟล์เพื่อเริ่มแชร์กับสมาชิกในกลุ่ม",
    },
    "error": {
      title: "เกิดข้อผิดพลาด",
      message: "ขออภัย เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง",
    },
    "no-recurring": {
      title: "ยังไม่มีงานซ้ำ",
      message: "สร้างงานซ้ำเพื่อจัดการงานประจำได้ง่ายขึ้น",
    },
    "no-calendar": {
      title: "ไม่มีกิจกรรม",
      message: "ยังไม่มีงานหรือกิจกรรมที่กำหนดไว้",
    },
    "no-reports": {
      title: "ยังไม่มีรายงาน",
      message: "รายงานจะแสดงเมื่อมีข้อมูลเพียงพอ",
    },
    "access-denied": {
      title: "ไม่มีสิทธิ์เข้าถึง",
      message: "คุณไม่มีสิทธิ์ในการดูข้อมูลนี้",
    },
  };

  // Get icon, title, and message
  const displayIcon = icon || icons[type] || icons["no-data"];
  const displayTitle = title || defaults[type]?.title || defaults["no-data"].title;
  const displayMessage = message || defaults[type]?.message || defaults["no-data"].message;

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {/* Icon */}
      <div className="mb-4">{displayIcon}</div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{displayTitle}</h3>

      {/* Message */}
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">{displayMessage}</p>

      {/* Actions */}
      {(onAction || onSecondaryAction) && (
        <div className="flex flex-wrap gap-3 justify-center">
          {onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {actionLabel || "ดำเนินการ"}
            </button>
          )}
          {onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {secondaryActionLabel || "ดูเพิ่มเติม"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

EmptyState.propTypes = {
  type: PropTypes.oneOf([
    "no-tasks",
    "no-data",
    "no-results",
    "no-members",
    "no-files",
    "error",
    "no-recurring",
    "no-calendar",
    "no-reports",
    "access-denied",
  ]),
  icon: PropTypes.node,
  title: PropTypes.string,
  message: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  secondaryActionLabel: PropTypes.string,
  onSecondaryAction: PropTypes.func,
  className: PropTypes.string,
};

export default EmptyState;

/**
 * Pre-configured empty state components for common use cases
 */

export const NoTasksState = ({ onCreateTask }) => (
  <EmptyState type="no-tasks" actionLabel="สร้างงานใหม่" onAction={onCreateTask} />
);

export const NoResultsState = ({ onClearFilters }) => (
  <EmptyState
    type="no-results"
    secondaryActionLabel="ล้างตัวกรอง"
    onSecondaryAction={onClearFilters}
  />
);

export const NoMembersState = ({ onInviteMembers }) => (
  <EmptyState type="no-members" actionLabel="เชิญสมาชิก" onAction={onInviteMembers} />
);

export const NoFilesState = ({ onUploadFile }) => (
  <EmptyState type="no-files" actionLabel="อัปโหลดไฟล์" onAction={onUploadFile} />
);

export const ErrorState = ({ onRetry }) => (
  <EmptyState type="error" actionLabel="ลองใหม่อีกครั้ง" onAction={onRetry} />
);

export const NoRecurringTasksState = ({ onCreateRecurring }) => (
  <EmptyState
    type="no-recurring"
    actionLabel="สร้างงานซ้ำ"
    onAction={onCreateRecurring}
  />
);

export const NoCalendarEventsState = () => (
  <EmptyState type="no-calendar" />
);

export const NoReportsState = () => (
  <EmptyState type="no-reports" />
);

export const AccessDeniedState = ({ onGoBack }) => (
  <EmptyState
    type="access-denied"
    actionLabel="กลับไปหน้าก่อนหน้า"
    onAction={onGoBack}
  />
);
