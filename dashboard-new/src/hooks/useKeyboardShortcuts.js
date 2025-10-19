import { useEffect, useCallback, useRef, useState } from "react";

/**
 * Keyboard Shortcuts Hook
 *
 * Easy-to-use keyboard shortcuts system for better UX
 * Supports key combinations and prevents conflicts
 *
 * Features:
 * - Single key and combination shortcuts (Ctrl/Cmd + key)
 * - Automatic Mac/Windows detection
 * - Prevent shortcuts in input fields (configurable)
 * - Multiple shortcuts per component
 * - Global and scoped shortcuts
 * - Help modal integration
 *
 * Usage Examples:
 *
 * Single key shortcut:
 * useKeyboardShortcut('n', () => openNewTaskModal());
 *
 * With modifier keys:
 * useKeyboardShortcut('s', () => saveTask(), { ctrl: true });
 *
 * Multiple shortcuts:
 * useKeyboardShortcuts({
 *   'n': () => openNewTaskModal(),
 *   's': { action: () => saveTask(), ctrl: true },
 *   'Escape': () => closeModal(),
 * });
 *
 * Allow in input fields:
 * useKeyboardShortcut('Escape', () => closeModal(), { allowInInput: true });
 */

// Detect if Mac
const isMac =
  typeof window !== "undefined" &&
  navigator.platform.toUpperCase().indexOf("MAC") >= 0;

/**
 * Single keyboard shortcut hook
 */
export const useKeyboardShortcut = (key, callback, options = {}) => {
  const {
    ctrl = false,
    shift = false,
    alt = false,
    meta = false,
    allowInInput = false,
    enabled = true,
  } = options;

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      // Check if we're in an input field
      const isInInput = ["INPUT", "TEXTAREA", "SELECT"].includes(
        event.target.tagName,
      );
      if (isInInput && !allowInInput) return;

      // Check if the key matches
      const keyMatch = event.key.toLowerCase() === key.toLowerCase();
      if (!keyMatch) return;

      // Check modifiers
      const ctrlMatch = ctrl ? (isMac ? event.metaKey : event.ctrlKey) : true;
      const shiftMatch = shift ? event.shiftKey : !event.shiftKey;
      const altMatch = alt ? event.altKey : !event.altKey;
      const metaMatch = meta ? event.metaKey : !event.metaKey;

      // If all conditions match, execute callback
      if (ctrlMatch && shiftMatch && altMatch && metaMatch) {
        event.preventDefault();
        callbackRef.current(event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, ctrl, shift, alt, meta, allowInInput, enabled]);
};

/**
 * Multiple keyboard shortcuts hook
 */
export const useKeyboardShortcuts = (shortcuts, globalOptions = {}) => {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isInInput = ["INPUT", "TEXTAREA", "SELECT"].includes(
        event.target.tagName,
      );

      Object.entries(shortcutsRef.current).forEach(([key, config]) => {
        // Handle both function and config object
        const action = typeof config === "function" ? config : config.action;
        const options = typeof config === "function" ? {} : config;

        const {
          ctrl = false,
          shift = false,
          alt = false,
          meta = false,
          allowInInput = false,
          enabled = true,
        } = { ...globalOptions, ...options };

        if (!enabled) return;
        if (isInInput && !allowInInput) return;

        const keyMatch = event.key.toLowerCase() === key.toLowerCase();
        if (!keyMatch) return;

        const ctrlMatch = ctrl
          ? isMac
            ? event.metaKey
            : event.ctrlKey
          : !event.ctrlKey;
        const shiftMatch = shift ? event.shiftKey : !event.shiftKey;
        const altMatch = alt ? event.altKey : !event.altKey;
        const metaMatch = meta ? event.metaKey : !event.metaKey;

        if (ctrlMatch && shiftMatch && altMatch && metaMatch) {
          event.preventDefault();
          action(event);
        }
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [globalOptions]);
};

/**
 * Hook for displaying keyboard shortcut help
 */
export const useKeyboardShortcutHelp = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Toggle help with ? key
  useKeyboardShortcut("?", () => setIsHelpOpen(true), { shift: true });

  return {
    isHelpOpen,
    openHelp: () => setIsHelpOpen(true),
    closeHelp: () => setIsHelpOpen(false),
  };
};

/**
 * Format shortcut for display
 */
export const formatShortcut = (key, options = {}) => {
  const { ctrl = false, shift = false, alt = false, meta = false } = options;
  const parts = [];

  if (ctrl || meta) parts.push(isMac ? "⌘" : "Ctrl");
  if (shift) parts.push(isMac ? "⇧" : "Shift");
  if (alt) parts.push(isMac ? "⌥" : "Alt");
  parts.push(key.toUpperCase());

  return parts.join(isMac ? "" : "+");
};

/**
 * Pre-defined keyboard shortcuts for common actions
 * Import and use in your components
 */
export const KEYBOARD_SHORTCUTS = {
  // Task management
  NEW_TASK: { key: "n", description: "สร้างงานใหม่" },
  SAVE_TASK: { key: "s", ctrl: true, description: "บันทึกงาน" },
  DELETE_TASK: { key: "Delete", description: "ลบงาน" },
  EDIT_TASK: { key: "e", description: "แก้ไขงาน" },
  COMPLETE_TASK: {
    key: "Enter",
    ctrl: true,
    description: "ทำเครื่องหมายว่าเสร็จสิ้น",
  },

  // Navigation
  NEXT_ITEM: { key: "j", description: "รายการถัดไป" },
  PREV_ITEM: { key: "k", description: "รายการก่อนหน้า" },
  GO_DASHBOARD: { key: "h", description: "ไปที่แดชบอร์ด" },
  GO_TASKS: { key: "t", description: "ไปที่รายการงาน" },
  GO_CALENDAR: { key: "c", description: "ไปที่ปฏิทิน" },
  GO_MEMBERS: { key: "m", description: "ไปที่สมาชิก" },
  GO_FILES: { key: "f", description: "ไปที่ไฟล์" },

  // Search and filter
  FOCUS_SEARCH: { key: "/", description: "ค้นหา" },
  CLEAR_FILTER: { key: "x", description: "ล้างตัวกรอง" },

  // Modal and UI
  CLOSE_MODAL: {
    key: "Escape",
    description: "ปิดหน้าต่าง",
    allowInInput: true,
  },
  SUBMIT_FORM: { key: "Enter", ctrl: true, description: "ส่งฟอร์ม" },
  HELP: { key: "?", shift: true, description: "แสดงความช่วยเหลือ" },
  TOGGLE_SIDEBAR: { key: "b", ctrl: true, description: "สลับแถบด้านข้าง" },

  // Selection
  SELECT_ALL: { key: "a", ctrl: true, description: "เลือกทั้งหมด" },
  DESELECT_ALL: { key: "d", ctrl: true, description: "ยกเลิกการเลือก" },

  // Copy/Paste
  COPY: { key: "c", ctrl: true, description: "คัดลอก" },
  PASTE: { key: "v", ctrl: true, description: "วาง" },

  // Undo/Redo
  UNDO: { key: "z", ctrl: true, description: "ย้อนกลับ" },
  REDO: { key: "y", ctrl: true, description: "ทำซ้ำ" },
};

export default useKeyboardShortcut;
