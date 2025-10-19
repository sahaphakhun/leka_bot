import React from "react";
import PropTypes from "prop-types";

/**
 * LoadingSkeleton Component
 *
 * Skeleton loading placeholders for content that is being fetched
 * Provides better UX than spinners by showing layout structure
 *
 * Features:
 * - Multiple pre-built skeleton types (text, card, table, avatar, image)
 * - Customizable shapes (rectangle, circle, rounded)
 * - Animation options (pulse, wave, none)
 * - Responsive and dark mode support
 * - Composable skeleton builder
 *
 * Usage Examples:
 *
 * Text skeleton:
 * <LoadingSkeleton type="text" lines={3} />
 *
 * Card skeleton:
 * <LoadingSkeleton type="card" />
 *
 * Table skeleton:
 * <LoadingSkeleton type="table" rows={5} columns={4} />
 *
 * Custom skeleton:
 * <LoadingSkeleton width="200px" height="100px" shape="rounded" />
 *
 * Avatar with text:
 * <LoadingSkeleton type="avatar-text" />
 */

const LoadingSkeleton = ({
  type = "rectangle",
  width = "100%",
  height = "1rem",
  shape = "rectangle",
  animation = "pulse",
  className = "",
  lines = 1,
  rows = 3,
  columns = 3,
  count = 1,
}) => {
  // Base skeleton classes
  const baseClasses = "bg-gray-200 dark:bg-gray-700";

  // Animation classes
  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]",
    none: "",
  };

  // Shape classes
  const shapeClasses = {
    rectangle: "rounded-none",
    rounded: "rounded-md",
    circle: "rounded-full",
  };

  // Basic rectangle skeleton
  const RectangleSkeleton = ({ w = width, h = height, s = shape, customClass = "" }) => (
    <div
      className={`${baseClasses} ${shapeClasses[s]} ${animationClasses[animation]} ${customClass}`}
      style={{ width: w, height: h }}
      aria-hidden="true"
    />
  );

  // Text skeleton - Multiple lines
  const TextSkeleton = () => (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <RectangleSkeleton
          key={index}
          w={index === lines - 1 ? "75%" : "100%"}
          h="0.875rem"
          s="rounded"
        />
      ))}
    </div>
  );

  // Card skeleton - Avatar + Title + Description
  const CardSkeleton = () => (
    <div className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <RectangleSkeleton w="3rem" h="3rem" s="circle" />
        <div className="flex-1 space-y-2">
          <RectangleSkeleton w="60%" h="1rem" s="rounded" />
          <RectangleSkeleton w="40%" h="0.75rem" s="rounded" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <RectangleSkeleton w="100%" h="0.875rem" s="rounded" />
        <RectangleSkeleton w="90%" h="0.875rem" s="rounded" />
        <RectangleSkeleton w="70%" h="0.875rem" s="rounded" />
      </div>
    </div>
  );

  // Table skeleton - Headers + Rows
  const TableSkeleton = () => (
    <div className={`overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      {/* Table Header */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <RectangleSkeleton key={index} w="80%" h="1rem" s="rounded" />
          ))}
        </div>
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <RectangleSkeleton key={colIndex} w="70%" h="0.875rem" s="rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Avatar skeleton
  const AvatarSkeleton = () => (
    <RectangleSkeleton w="2.5rem" h="2.5rem" s="circle" customClass={className} />
  );

  // Avatar + Text skeleton (for member cards, etc.)
  const AvatarTextSkeleton = () => (
    <div className={`flex items-center gap-3 ${className}`}>
      <RectangleSkeleton w="2.5rem" h="2.5rem" s="circle" />
      <div className="flex-1 space-y-2">
        <RectangleSkeleton w="50%" h="1rem" s="rounded" />
        <RectangleSkeleton w="30%" h="0.75rem" s="rounded" />
      </div>
    </div>
  );

  // Image skeleton
  const ImageSkeleton = () => (
    <RectangleSkeleton w={width} h={height} s="rounded" customClass={className} />
  );

  // Button skeleton
  const ButtonSkeleton = () => (
    <RectangleSkeleton w="120px" h="2.5rem" s="rounded" customClass={className} />
  );

  // List item skeleton (for task lists, etc.)
  const ListItemSkeleton = () => (
    <div className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      <div className="flex items-center gap-3">
        <RectangleSkeleton w="1.25rem" h="1.25rem" s="rounded" />
        <div className="flex-1 space-y-2">
          <RectangleSkeleton w="70%" h="1rem" s="rounded" />
          <RectangleSkeleton w="40%" h="0.75rem" s="rounded" />
        </div>
        <RectangleSkeleton w="5rem" h="1.75rem" s="rounded" />
      </div>
    </div>
  );

  // Form skeleton
  const FormSkeleton = () => (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: rows || 3 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <RectangleSkeleton w="30%" h="0.875rem" s="rounded" />
          <RectangleSkeleton w="100%" h="2.5rem" s="rounded" />
        </div>
      ))}
    </div>
  );

  // Stat card skeleton (for dashboard stats)
  const StatCardSkeleton = () => (
    <div className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      <RectangleSkeleton w="50%" h="0.875rem" s="rounded" />
      <div className="mt-3">
        <RectangleSkeleton w="60%" h="2rem" s="rounded" />
      </div>
      <div className="mt-2">
        <RectangleSkeleton w="40%" h="0.75rem" s="rounded" />
      </div>
    </div>
  );

  // Render based on type
  const renderSkeleton = () => {
    switch (type) {
      case "text":
        return <TextSkeleton />;
      case "card":
        return <CardSkeleton />;
      case "table":
        return <TableSkeleton />;
      case "avatar":
        return <AvatarSkeleton />;
      case "avatar-text":
        return <AvatarTextSkeleton />;
      case "image":
        return <ImageSkeleton />;
      case "button":
        return <ButtonSkeleton />;
      case "list-item":
        return <ListItemSkeleton />;
      case "form":
        return <FormSkeleton />;
      case "stat-card":
        return <StatCardSkeleton />;
      case "rectangle":
      default:
        return <RectangleSkeleton />;
    }
  };

  // If count > 1, render multiple skeletons
  if (count > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index}>{renderSkeleton()}</div>
        ))}
      </div>
    );
  }

  return renderSkeleton();
};

LoadingSkeleton.propTypes = {
  type: PropTypes.oneOf([
    "rectangle",
    "text",
    "card",
    "table",
    "avatar",
    "avatar-text",
    "image",
    "button",
    "list-item",
    "form",
    "stat-card",
  ]),
  width: PropTypes.string,
  height: PropTypes.string,
  shape: PropTypes.oneOf(["rectangle", "rounded", "circle"]),
  animation: PropTypes.oneOf(["pulse", "wave", "none"]),
  className: PropTypes.string,
  lines: PropTypes.number,
  rows: PropTypes.number,
  columns: PropTypes.number,
  count: PropTypes.number,
};

export default LoadingSkeleton;

/**
 * Pre-configured skeleton components for common layouts
 */

// Dashboard skeleton - Stats + Cards
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <LoadingSkeleton type="stat-card" />
      <LoadingSkeleton type="stat-card" />
      <LoadingSkeleton type="stat-card" />
      <LoadingSkeleton type="stat-card" />
    </div>
    <LoadingSkeleton type="card" count={3} />
  </div>
);

// Task list skeleton
export const TaskListSkeleton = ({ count = 5 }) => (
  <div className="space-y-2">
    <LoadingSkeleton type="list-item" count={count} />
  </div>
);

// Member list skeleton
export const MemberListSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, index) => (
      <LoadingSkeleton key={index} type="card" />
    ))}
  </div>
);

// Leaderboard skeleton
export const LeaderboardSkeleton = () => (
  <LoadingSkeleton type="table" rows={10} columns={5} />
);

// Profile skeleton
export const ProfileSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <LoadingSkeleton type="avatar" width="5rem" height="5rem" />
      <div className="flex-1">
        <LoadingSkeleton type="text" lines={2} />
      </div>
    </div>
    <LoadingSkeleton type="form" rows={5} />
  </div>
);
