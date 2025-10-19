import React from "react";
import PropTypes from "prop-types";
import { formatShortcut } from "../../hooks/useKeyboardShortcuts";

/**
 * Keyboard Shortcuts Help Modal
 *
 * Displays all available keyboard shortcuts in a beautiful modal
 * Helps users discover and learn shortcuts
 *
 * Usage:
 * <KeyboardShortcutsHelp
 *   isOpen={isHelpOpen}
 *   onClose={() => setIsHelpOpen(false)}
 *   shortcuts={customShortcuts} // optional
 * />
 */

const KeyboardShortcutsHelp = ({ isOpen, onClose, shortcuts = null }) => {
  if (!isOpen) return null;

  // Default shortcuts grouped by category
  const defaultShortcuts = [
    {
      category: "การจัดการงาน",
      items: [
        { key: "n", description: "สร้างงานใหม่" },
        { key: "s", ctrl: true, description: "บันทึกงาน" },
        { key: "e", description: "แก้ไขงานที่เลือก" },
        { key: "Delete", description: "ลบงานที่เลือก" },
        { key: "Enter", ctrl: true, description: "ทำเครื่องหมายว่าเสร็จสิ้น" },
      ],
    },
    {
      category: "การนำทาง",
      items: [
        { key: "h", description: "ไปที่แดชบอร์ด" },
        { key: "t", description: "ไปที่รายการงาน" },
        { key: "c", description: "ไปที่ปฏิทิน" },
        { key: "m", description: "ไปที่สมาชิก" },
        { key: "f", description: "ไปที่ไฟล์" },
        { key: "r", description: "ไปที่รายงาน" },
      ],
    },
    {
      category: "การเลื่อนดู",
      items: [
        { key: "j", description: "รายการถัดไป" },
        { key: "k", description: "รายการก่อนหน้า" },
        { key: "↓", description: "เลื่อนลง" },
        { key: "↑", description: "เลื่อนขึ้น" },
      ],
    },
    {
      category: "การค้นหาและกรอง",
      items: [
        { key: "/", description: "โฟกัสช่องค้นหา" },
        { key: "x", description: "ล้างตัวกรอง" },
        { key: "Escape", description: "ยกเลิกการค้นหา" },
      ],
    },
    {
      category: "ส่วนติดต่อผู้ใช้",
      items: [
        { key: "Escape", description: "ปิดหน้าต่าง/โมดอล" },
        { key: "?", shift: true, description: "แสดงความช่วยเหลือนี้" },
        { key: "b", ctrl: true, description: "สลับแถบด้านข้าง" },
      ],
    },
    {
      category: "การเลือก",
      items: [
        { key: "a", ctrl: true, description: "เลือกทั้งหมด" },
        { key: "d", ctrl: true, description: "ยกเลิกการเลือก" },
      ],
    },
  ];

  const displayShortcuts = shortcuts || defaultShortcuts;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2
                id="shortcuts-title"
                className="text-xl font-bold text-gray-900 dark:text-gray-100"
              >
                ⌨️ แป้นพิมพ์ลัด
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
                aria-label="ปิด"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayShortcuts.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {group.category}
                  </h3>
                  <div className="space-y-2">
                    {group.items.map((item, itemIndex) => (
                      <ShortcutItem key={itemIndex} {...item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer tip */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                กด{" "}
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                  ?
                </kbd>{" "}
                เพื่อเปิดความช่วยเหลือนี้อีกครั้ง
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

KeyboardShortcutsHelp.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  shortcuts: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string.isRequired,
      items: PropTypes.arrayOf(
        PropTypes.shape({
          key: PropTypes.string.isRequired,
          description: PropTypes.string.isRequired,
          ctrl: PropTypes.bool,
          shift: PropTypes.bool,
          alt: PropTypes.bool,
          meta: PropTypes.bool,
        })
      ).isRequired,
    })
  ),
};

// Individual shortcut item component
const ShortcutItem = ({ key, description, ctrl, shift, alt, meta }) => {
  const shortcutDisplay = formatShortcut(key, { ctrl, shift, alt, meta });

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <span className="text-sm text-gray-700 dark:text-gray-300">{description}</span>
      <kbd className="px-2.5 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
        {shortcutDisplay}
      </kbd>
    </div>
  );
};

ShortcutItem.propTypes = {
  key: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  ctrl: PropTypes.bool,
  shift: PropTypes.bool,
  alt: PropTypes.bool,
  meta: PropTypes.bool,
};

export default KeyboardShortcutsHelp;

/**
 * Hook to use keyboard shortcuts help modal
 * Handles ? key press to open help
 */
export const useKeyboardShortcutsHelp = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    isOpen,
    openHelp: () => setIsOpen(true),
    closeHelp: () => setIsOpen(false),
  };
};
