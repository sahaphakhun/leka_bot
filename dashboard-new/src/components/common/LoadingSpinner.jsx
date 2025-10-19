import React from "react";
import PropTypes from "prop-types";

/**
 * LoadingSpinner Component
 *
 * Unified loading indicator with multiple variants and sizes
 * Ensures consistent loading states across the entire application
 *
 * Features:
 * - 5 spinner variants (spinner, dots, pulse, bars, ring)
 * - 4 size options (sm, md, lg, xl)
 * - Optional label text
 * - Fullscreen and overlay modes
 * - Customizable colors
 *
 * Usage Examples:
 *
 * Basic spinner:
 * <LoadingSpinner />
 *
 * With label:
 * <LoadingSpinner label="กำลังโหลด..." />
 *
 * Different variant:
 * <LoadingSpinner variant="dots" size="lg" />
 *
 * Fullscreen loading:
 * <LoadingSpinner fullscreen label="กำลังโหลดข้อมูล..." />
 *
 * Overlay mode:
 * <div className="relative">
 *   <LoadingSpinner overlay />
 *   <YourContent />
 * </div>
 */

const LoadingSpinner = ({
  variant = "spinner",
  size = "md",
  color = "blue",
  label = "",
  fullscreen = false,
  overlay = false,
  className = "",
}) => {
  // Size mappings
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const dotSizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2.5 h-2.5",
    lg: "w-3.5 h-3.5",
    xl: "w-4 h-4",
  };

  const barSizeClasses = {
    sm: "w-1 h-3",
    md: "w-1.5 h-5",
    lg: "w-2 h-7",
    xl: "w-2.5 h-9",
  };

  // Color mappings
  const colorClasses = {
    blue: "border-blue-500",
    green: "border-green-500",
    red: "border-red-500",
    yellow: "border-yellow-500",
    purple: "border-purple-500",
    gray: "border-gray-500",
  };

  const bgColorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    gray: "bg-gray-500",
  };

  // Spinner Variant - Classic rotating spinner
  const SpinnerVariant = () => (
    <div
      className={`${sizeClasses[size]} ${colorClasses[color]} border-4 border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label={label || "กำลังโหลด"}
    />
  );

  // Dots Variant - Three bouncing dots
  const DotsVariant = () => (
    <div className={`flex gap-1.5 ${className}`} role="status" aria-label={label || "กำลังโหลด"}>
      <div
        className={`${dotSizeClasses[size]} ${bgColorClasses[color]} rounded-full animate-bounce`}
        style={{ animationDelay: "0ms" }}
      />
      <div
        className={`${dotSizeClasses[size]} ${bgColorClasses[color]} rounded-full animate-bounce`}
        style={{ animationDelay: "150ms" }}
      />
      <div
        className={`${dotSizeClasses[size]} ${bgColorClasses[color]} rounded-full animate-bounce`}
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );

  // Pulse Variant - Growing/shrinking circle
  const PulseVariant = () => (
    <div
      className={`${sizeClasses[size]} ${bgColorClasses[color]} rounded-full animate-pulse ${className}`}
      role="status"
      aria-label={label || "กำลังโหลด"}
    />
  );

  // Bars Variant - Three bars with wave animation
  const BarsVariant = () => (
    <div className={`flex items-center gap-1 ${className}`} role="status" aria-label={label || "กำลังโหลด"}>
      <div
        className={`${barSizeClasses[size]} ${bgColorClasses[color]} rounded animate-pulse`}
        style={{ animationDelay: "0ms" }}
      />
      <div
        className={`${barSizeClasses[size]} ${bgColorClasses[color]} rounded animate-pulse`}
        style={{ animationDelay: "150ms" }}
      />
      <div
        className={`${barSizeClasses[size]} ${bgColorClasses[color]} rounded animate-pulse`}
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );

  // Ring Variant - Double ring spinner
  const RingVariant = () => (
    <div className={`relative ${sizeClasses[size]} ${className}`} role="status" aria-label={label || "กำลังโหลด"}>
      <div className={`absolute inset-0 ${colorClasses[color]} border-4 rounded-full opacity-25`} />
      <div
        className={`absolute inset-0 ${colorClasses[color]} border-4 border-t-transparent rounded-full animate-spin`}
      />
    </div>
  );

  // Variant renderer
  const renderVariant = () => {
    switch (variant) {
      case "dots":
        return <DotsVariant />;
      case "pulse":
        return <PulseVariant />;
      case "bars":
        return <BarsVariant />;
      case "ring":
        return <RingVariant />;
      case "spinner":
      default:
        return <SpinnerVariant />;
    }
  };

  // Container classes
  const containerClasses = fullscreen
    ? "fixed inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50"
    : overlay
    ? "absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10"
    : "flex flex-col items-center justify-center";

  const labelSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  return (
    <div className={containerClasses}>
      {renderVariant()}
      {label && (
        <p className={`mt-3 ${labelSizeClasses[size]} text-gray-600 dark:text-gray-400 font-medium`}>
          {label}
        </p>
      )}
    </div>
  );
};

LoadingSpinner.propTypes = {
  variant: PropTypes.oneOf(["spinner", "dots", "pulse", "bars", "ring"]),
  size: PropTypes.oneOf(["sm", "md", "lg", "xl"]),
  color: PropTypes.oneOf(["blue", "green", "red", "yellow", "purple", "gray"]),
  label: PropTypes.string,
  fullscreen: PropTypes.bool,
  overlay: PropTypes.bool,
  className: PropTypes.string,
};

export default LoadingSpinner;

/**
 * Pre-configured loading spinner components for common use cases
 */

// Page-level loading (fullscreen)
export const PageLoader = ({ label = "กำลังโหลดข้อมูล..." }) => (
  <LoadingSpinner variant="ring" size="xl" fullscreen label={label} />
);

// Component-level loading (overlay on component)
export const ComponentLoader = ({ label = "" }) => (
  <LoadingSpinner variant="spinner" size="lg" overlay label={label} />
);

// Button loading (small inline spinner)
export const ButtonLoader = () => (
  <LoadingSpinner variant="spinner" size="sm" color="white" />
);

// Table/List loading
export const TableLoader = ({ label = "กำลังโหลดข้อมูล..." }) => (
  <div className="py-12">
    <LoadingSpinner variant="dots" size="md" label={label} />
  </div>
);

// Card loading
export const CardLoader = () => (
  <div className="py-8">
    <LoadingSpinner variant="pulse" size="md" />
  </div>
);
