import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "../../lib/utils";

/**
 * VirtualList Component
 * Renders only visible items for optimal performance with large lists
 * Uses window scrolling (no fixed height container)
 */
export const VirtualList = ({
  items = [],
  renderItem,
  itemHeight = 80,
  overscan = 3,
  className = "",
  emptyMessage = "ไม่มีรายการ",
  LoadingComponent = null,
  loading = false,
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const containerRef = useRef(null);
  const scrollThrottleRef = useRef(null);

  // Calculate visible range based on scroll position
  const calculateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;

    // Calculate container's position relative to viewport
    const containerTop = rect.top + scrollTop;
    const relativeScrollTop = Math.max(0, scrollTop - containerTop);

    // Calculate which items are visible
    const startIndex = Math.max(
      0,
      Math.floor(relativeScrollTop / itemHeight) - overscan
    );
    const endIndex = Math.min(
      items.length,
      Math.ceil((relativeScrollTop + viewportHeight) / itemHeight) + overscan
    );

    setVisibleRange({ start: startIndex, end: endIndex });
  }, [items.length, itemHeight, overscan]);

  // Setup scroll listener
  useEffect(() => {
    const handleScroll = () => {
      // Throttle scroll events
      if (scrollThrottleRef.current) return;

      scrollThrottleRef.current = setTimeout(() => {
        calculateVisibleRange();
        scrollThrottleRef.current = null;
      }, 16); // ~60fps
    };

    calculateVisibleRange();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", calculateVisibleRange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", calculateVisibleRange);
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current);
      }
    };
  }, [calculateVisibleRange]);

  // Recalculate when items change
  useEffect(() => {
    calculateVisibleRange();
  }, [items, calculateVisibleRange]);

  if (loading && LoadingComponent) {
    return <LoadingComponent />;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const totalHeight = items.length * itemHeight;
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ height: totalHeight }}
    >
      <div
        className="absolute w-full"
        style={{ transform: `translateY(${offsetY}px)` }}
      >
        {visibleItems.map((item, index) => {
          const actualIndex = visibleRange.start + index;
          return (
            <div
              key={item.id || actualIndex}
              style={{ height: itemHeight }}
              data-index={actualIndex}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * VirtualGrid Component
 * Virtual scrolling for grid layouts
 */
export const VirtualGrid = ({
  items = [],
  renderItem,
  columns = 3,
  itemHeight = 200,
  gap = 16,
  overscan = 2,
  className = "",
  emptyMessage = "ไม่มีรายการ",
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 6 });
  const containerRef = useRef(null);

  const rowHeight = itemHeight + gap;
  const totalRows = Math.ceil(items.length / columns);

  const calculateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const containerTop = rect.top + scrollTop;
    const relativeScrollTop = Math.max(0, scrollTop - containerTop);

    const startRow = Math.max(
      0,
      Math.floor(relativeScrollTop / rowHeight) - overscan
    );
    const endRow = Math.min(
      totalRows,
      Math.ceil((relativeScrollTop + viewportHeight) / rowHeight) + overscan
    );

    const startIndex = startRow * columns;
    const endIndex = Math.min(items.length, endRow * columns);

    setVisibleRange({ start: startIndex, end: endIndex });
  }, [items.length, columns, rowHeight, totalRows, overscan]);

  useEffect(() => {
    const handleScroll = () => {
      calculateVisibleRange();
    };

    calculateVisibleRange();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", calculateVisibleRange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", calculateVisibleRange);
    };
  }, [calculateVisibleRange]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const totalHeight = totalRows * rowHeight;
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const startRow = Math.floor(visibleRange.start / columns);
  const offsetY = startRow * rowHeight;

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ height: totalHeight }}
    >
      <div
        className="absolute w-full"
        style={{ transform: `translateY(${offsetY}px)` }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: `${gap}px`,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.start + index;
            return (
              <div key={item.id || actualIndex} style={{ height: itemHeight }}>
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * VirtualTable Component
 * Virtual scrolling for table rows
 */
export const VirtualTable = ({
  items = [],
  columns = [],
  rowHeight = 60,
  overscan = 5,
  className = "",
  emptyMessage = "ไม่มีข้อมูล",
  onRowClick,
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const containerRef = useRef(null);
  const tableRef = useRef(null);

  const calculateVisibleRange = useCallback(() => {
    if (!tableRef.current) return;

    const rect = tableRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const containerTop = rect.top + scrollTop;
    const relativeScrollTop = Math.max(0, scrollTop - containerTop);

    const startIndex = Math.max(
      0,
      Math.floor(relativeScrollTop / rowHeight) - overscan
    );
    const endIndex = Math.min(
      items.length,
      Math.ceil((relativeScrollTop + viewportHeight) / rowHeight) + overscan
    );

    setVisibleRange({ start: startIndex, end: endIndex });
  }, [items.length, rowHeight, overscan]);

  useEffect(() => {
    const handleScroll = () => {
      calculateVisibleRange();
    };

    calculateVisibleRange();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", calculateVisibleRange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", calculateVisibleRange);
    };
  }, [calculateVisibleRange]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const totalHeight = items.length * rowHeight;
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const offsetY = visibleRange.start * rowHeight;

  return (
    <div ref={containerRef} className={cn("overflow-x-auto", className)}>
      <table className="w-full" ref={tableRef}>
        <thead className="sticky top-0 bg-white z-10 shadow-sm">
          <tr className="border-b">
            {columns.map((column, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ height: totalHeight }} className="relative">
          <tr style={{ height: offsetY }}>
            <td colSpan={columns.length} />
          </tr>
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.start + index;
            return (
              <tr
                key={item.id || actualIndex}
                className={cn(
                  "border-b hover:bg-gray-50 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
                style={{ height: rowHeight }}
                onClick={() => onRowClick?.(item, actualIndex)}
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    {column.render
                      ? column.render(item, actualIndex)
                      : item[column.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default VirtualList;
