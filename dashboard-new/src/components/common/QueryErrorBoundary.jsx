import React from "react";
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

/**
 * QueryErrorBoundary
 * Specialized error boundary for handling API/Query errors
 * Provides retry functionality and network error detection
 */
export const QueryErrorBoundary = ({
  children,
  onRetry,
  fallback,
  error,
  resetError,
}) => {
  if (!error) {
    return children;
  }

  // Detect network errors
  const isNetworkError =
    error?.message?.includes("network") ||
    error?.message?.includes("fetch") ||
    error?.message?.includes("timeout") ||
    error?.status === 0;

  // Detect authentication errors
  const isAuthError = error?.status === 401 || error?.status === 403;

  // Detect server errors
  const isServerError = error?.status >= 500;

  // Custom fallback
  if (fallback) {
    return fallback({
      error,
      resetError,
      onRetry,
      isNetworkError,
      isAuthError,
      isServerError,
    });
  }

  // Default error UI
  const getErrorIcon = () => {
    if (isNetworkError) return <WifiOff className="h-5 w-5" />;
    return <AlertCircle className="h-5 w-5" />;
  };

  const getErrorTitle = () => {
    if (isNetworkError) return "ไม่สามารถเชื่อมต่อได้";
    if (isAuthError) return "ไม่มีสิทธิ์เข้าถึง";
    if (isServerError) return "เซิร์ฟเวอร์ขัดข้อง";
    return "เกิดข้อผิดพลาด";
  };

  const getErrorMessage = () => {
    if (isNetworkError)
      return "กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ";
    if (isAuthError)
      return "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ กรุณาเข้าสู่ระบบใหม่";
    if (isServerError)
      return "ระบบเซิร์ฟเวอร์กำลังมีปัญหา กรุณาลองใหม่ในภายหลัง";
    return error?.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด";
  };

  return (
    <Alert variant="destructive" className="my-4">
      {getErrorIcon()}
      <AlertTitle className="ml-2">{getErrorTitle()}</AlertTitle>
      <AlertDescription className="mt-2 ml-7 space-y-3">
        <p className="text-sm">{getErrorMessage()}</p>

        {/* Error details in dev mode */}
        {import.meta.env.DEV && error?.data && (
          <details className="text-xs">
            <summary className="cursor-pointer font-medium">
              รายละเอียดเพิ่มเติม
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
              {JSON.stringify(error.data, null, 2)}
            </pre>
          </details>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {onRetry && !isAuthError && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              ลองอีกครั้ง
            </Button>
          )}
          {resetError && (
            <Button size="sm" variant="ghost" onClick={resetError}>
              ปิด
            </Button>
          )}
          {isAuthError && (
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                window.location.href = "/?auth_required=true";
              }}
            >
              เข้าสู่ระบบใหม่
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

/**
 * useQueryError hook
 * Manages query error state
 */
export const useQueryError = () => {
  const [error, setError] = React.useState(null);

  const handleError = React.useCallback((err) => {
    console.error("Query error:", err);
    setError(err);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, resetError };
};

/**
 * withQueryErrorBoundary HOC
 * Wraps a component with QueryErrorBoundary
 */
export const withQueryErrorBoundary = (Component, options = {}) => {
  const WrappedComponent = (props) => {
    const { error, handleError, resetError } = useQueryError();

    return (
      <QueryErrorBoundary
        error={error}
        resetError={resetError}
        onRetry={options.onRetry}
        fallback={options.fallback}
      >
        <Component {...props} onError={handleError} />
      </QueryErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withQueryErrorBoundary(${Component.displayName || Component.name || "Component"})`;

  return WrappedComponent;
};

export default QueryErrorBoundary;
