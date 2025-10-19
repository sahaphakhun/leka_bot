import { useState, useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

/**
 * LazyImage Component
 * Lazy loads images using Intersection Observer API
 * Features: Blur-up effect, Error fallback, Loading skeleton
 */
export const LazyImage = ({
  src,
  alt = "",
  className = "",
  width,
  height,
  fallback = null,
  blurDataURL = null,
  onLoad,
  onError,
  threshold = 0.1,
  rootMargin = "50px",
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Intersection Observer to detect when image enters viewport
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setHasError(true);
    setIsLoaded(false);
    onError?.(e);
  };

  // Error fallback
  if (hasError) {
    return (
      fallback || (
        <div
          ref={imgRef}
          className={cn(
            "flex items-center justify-center bg-gray-100 text-gray-400",
            className
          )}
          style={{ width, height }}
        >
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )
    );
  }

  return (
    <div
      ref={imgRef}
      className={cn("relative overflow-hidden", className)}
      style={{ width, height }}
    >
      {/* Blur placeholder */}
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
          aria-hidden="true"
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !blurDataURL && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}

      {/* Loading indicator */}
      {isInView && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}
    </div>
  );
};

/**
 * Progressive Image Loading
 * Loads low-quality placeholder first, then full image
 */
export const ProgressiveImage = ({
  lowQualitySrc,
  highQualitySrc,
  alt = "",
  className = "",
  ...props
}) => {
  const [src, setSrc] = useState(lowQualitySrc);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Preload high quality image
    const img = new Image();
    img.src = highQualitySrc;
    img.onload = () => {
      setSrc(highQualitySrc);
      setIsLoaded(true);
    };
  }, [highQualitySrc]);

  return (
    <LazyImage
      src={src}
      alt={alt}
      className={cn(className, !isLoaded && "blur-sm")}
      {...props}
    />
  );
};

/**
 * Avatar with lazy loading
 */
export const LazyAvatar = ({ src, alt, size = 40, fallbackText = "?" }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className="flex items-center justify-center bg-blue-500 text-white font-semibold rounded-full"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {fallbackText.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <LazyImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-full"
      onError={() => setHasError(true)}
      fallback={
        <div
          className="flex items-center justify-center bg-blue-500 text-white font-semibold rounded-full"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          {fallbackText.charAt(0).toUpperCase()}
        </div>
      }
    />
  );
};

export default LazyImage;
