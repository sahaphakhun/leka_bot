import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";
import { Columns3, Eye, EyeOff } from "lucide-react";

/**
 * ColumnVisibilityToggle Component
 *
 * Allows users to show/hide table columns
 * Perfect for tables with many columns
 *
 * Features:
 * - Toggle individual columns
 * - Show all / Hide all quick actions
 * - Persist preferences in localStorage
 * - Visual indicators for hidden columns
 *
 * Usage:
 *
 * const columns = [
 *   { key: "name", label: "ชื่อ", visible: true },
 *   { key: "score", label: "คะแนน", visible: true },
 *   { key: "completed", label: "งานเสร็จ", visible: true },
 * ];
 *
 * const [visibleColumns, setVisibleColumns] = useState(columns);
 *
 * <ColumnVisibilityToggle
 *   columns={visibleColumns}
 *   onChange={setVisibleColumns}
 *   storageKey="leaderboard-columns"
 * />
 *
 * // In table rendering:
 * {visibleColumns.find(c => c.key === "name")?.visible && (
 *   <th>ชื่อ</th>
 * )}
 */

const ColumnVisibilityToggle = ({
  columns = [],
  onChange,
  storageKey = null,
  className = "",
}) => {
  // Toggle individual column
  const handleToggleColumn = (columnKey) => {
    const updatedColumns = columns.map((col) =>
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    );
    onChange(updatedColumns);

    // Persist to localStorage if storageKey provided
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedColumns));
      } catch (error) {
        console.warn("Failed to save column visibility:", error);
      }
    }
  };

  // Show all columns
  const handleShowAll = () => {
    const updatedColumns = columns.map((col) => ({ ...col, visible: true }));
    onChange(updatedColumns);

    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedColumns));
      } catch (error) {
        console.warn("Failed to save column visibility:", error);
      }
    }
  };

  // Hide all columns (keep at least one visible)
  const handleHideAll = () => {
    const updatedColumns = columns.map((col, index) => ({
      ...col,
      visible: index === 0, // Keep first column visible
    }));
    onChange(updatedColumns);

    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedColumns));
      } catch (error) {
        console.warn("Failed to save column visibility:", error);
      }
    }
  };

  const visibleCount = columns.filter((col) => col.visible).length;
  const allVisible = visibleCount === columns.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Columns3 className="w-4 h-4 mr-2" />
          คอลัมน์ ({visibleCount}/{columns.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>แสดง/ซ่อนคอลัมน์</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Column toggles */}
        <div className="max-h-64 overflow-y-auto">
          {columns.map((column) => (
            <DropdownMenuItem
              key={column.key}
              onClick={(e) => {
                e.preventDefault();
                handleToggleColumn(column.key);
              }}
              className="cursor-pointer"
            >
              <div className="flex items-center w-full">
                <Checkbox
                  checked={column.visible}
                  onCheckedChange={() => handleToggleColumn(column.key)}
                  className="mr-2"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="flex-1">{column.label}</span>
                {column.visible ? (
                  <Eye className="w-4 h-4 text-green-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator />

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-1 p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowAll}
            disabled={allVisible}
            className="text-xs"
          >
            <Eye className="w-3 h-3 mr-1" />
            แสดงทั้งหมด
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHideAll}
            disabled={visibleCount <= 1}
            className="text-xs"
          >
            <EyeOff className="w-3 h-3 mr-1" />
            ซ่อนทั้งหมด
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

ColumnVisibilityToggle.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      visible: PropTypes.bool.isRequired,
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  storageKey: PropTypes.string,
  className: PropTypes.string,
};

export default ColumnVisibilityToggle;

/**
 * Hook to manage column visibility with localStorage persistence
 */
export const useColumnVisibility = (initialColumns, storageKey) => {
  const [columns, setColumns] = useState(() => {
    if (!storageKey) return initialColumns;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with initial columns to handle new columns added later
        return initialColumns.map((col) => {
          const savedCol = parsed.find((c) => c.key === col.key);
          return savedCol ? { ...col, visible: savedCol.visible } : col;
        });
      }
    } catch (error) {
      console.warn("Failed to load column visibility:", error);
    }

    return initialColumns;
  });

  return [columns, setColumns];
};

/**
 * Helper function to filter visible columns
 */
export const getVisibleColumns = (columns) => {
  return columns.filter((col) => col.visible);
};

/**
 * Helper function to check if column is visible
 */
export const isColumnVisible = (columns, columnKey) => {
  const column = columns.find((col) => col.key === columnKey);
  return column?.visible ?? false;
};
