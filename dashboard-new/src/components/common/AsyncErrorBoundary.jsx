import React, { useState, useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

/**
 * AsyncErrorBoundary
 * Handles async errors that occur in promises/async functions
 * which are not caught by regular Error Boundaries
 */
export const AsyncErrorBoundary = ({ children, fallback }) => {
  const [error, setError] = useState(null);

  useEffect(() => {
    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      console.error("Unhandled Promise Rejection:", event.reason);
      setError(event.reason);
      event.preventDefault();
    };

    // Global error handler for errors
    const handleError = (event) => {
      console.error("Global Error:", event.error);
      setError(event.error);
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleError);
    };
  }, []);

  const handleReset = () => {
    setError(null);
  };

  if (error) {
    if (fallback) {
      return fallback({ error, resetError: handleReset });
    }

    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>{error?.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด"}</p>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            ลองอีกครั้ง
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return children;
};

/**
 * useAsyncError hook
 * Allows functional components to throw errors to the nearest error boundary
 */
export const useAsyncError = () => {
  const [, setError] = useState();

  return (error) => {
    setError(() => {
      throw error;
    });
  };
};

/**
 * withAsyncErrorHandler HOC
 * Wraps async functions to catch errors and display them properly
 */
export const withAsyncErrorHandler = (asyncFn, onError) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      console.error("Async error caught:", error);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  };
};

export default AsyncErrorBoundary;
