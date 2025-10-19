/**
 * Export Utilities
 *
 * Utility functions for exporting data to various formats
 * Supports CSV, Excel, and JSON exports
 */

/**
 * Convert data array to CSV format
 */
export const convertToCSV = (data, columns) => {
  if (!data || data.length === 0) return "";

  // Get column keys and labels
  const headers = columns.map((col) => col.label).join(",");
  const keys = columns.map((col) => col.key);

  // Convert rows
  const rows = data.map((item) => {
    return keys
      .map((key) => {
        let value = item[key];

        // Handle special formatting
        if (value === null || value === undefined) {
          value = "";
        } else if (typeof value === "object") {
          value = JSON.stringify(value);
        } else {
          value = String(value);
        }

        // Escape quotes and wrap in quotes if contains comma or quote
        if (
          value.includes(",") ||
          value.includes('"') ||
          value.includes("\n")
        ) {
          value = `"${value.replace(/"/g, '""')}"`;
        }

        return value;
      })
      .join(",");
  });

  return [headers, ...rows].join("\n");
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent, filename = "export.csv") => {
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Download JSON file
 */
export const downloadJSON = (data, filename = "export.json") => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], {
    type: "application/json;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Convert data to Excel format (using CSV as base)
 * For true Excel support, use a library like xlsx
 */
export const downloadExcel = (data, columns, filename = "export.xlsx") => {
  // For now, download as CSV with .xlsx extension
  // This will open in Excel but is actually CSV format
  // For true .xlsx format, integrate xlsx library
  const csvContent = convertToCSV(data, columns);
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Format filename with timestamp
 */
export const getTimestampedFilename = (basename, extension) => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, "-");
  return `${basename}_${timestamp}.${extension}`;
};

/**
 * Export leaderboard data
 */
export const exportLeaderboard = (data, columns, format = "csv") => {
  const visibleColumns = columns.filter((col) => col.visible);
  const filename = getTimestampedFilename("leaderboard", format);

  switch (format) {
    case "csv":
      const csvContent = convertToCSV(data, visibleColumns);
      downloadCSV(csvContent, filename);
      break;

    case "excel":
      downloadExcel(data, visibleColumns, filename);
      break;

    case "json":
      // Export only visible column data
      const exportData = data.map((item) => {
        const filtered = {};
        visibleColumns.forEach((col) => {
          filtered[col.key] = item[col.key];
        });
        return filtered;
      });
      downloadJSON(exportData, filename);
      break;

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};

/**
 * Copy to clipboard (for quick copy)
 */
export const copyToClipboard = async (data, columns) => {
  const visibleColumns = columns.filter((col) => col.visible);
  const csvContent = convertToCSV(data, visibleColumns);

  try {
    await navigator.clipboard.writeText(csvContent);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
};
