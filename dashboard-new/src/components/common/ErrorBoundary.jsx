import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the whole app
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Update state with error details
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Send to error tracking service (e.g., Sentry)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production
    if (import.meta.env.PROD) {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // TODO: Integrate with Sentry or similar service
    try {
      // Example: Sentry.captureException(error, { extra: errorInfo });
      console.log("Logging error to external service:", {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Failed to log error to service:", logError);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetError: this.handleReset,
        });
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <CardTitle className="text-2xl">เกิดข้อผิดพลาด</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-gray-700">
                  {this.props.errorMessage ||
                    "ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง"}
                </p>
                {this.state.errorCount > 1 && (
                  <p className="text-sm text-amber-600">
                    ⚠️ ข้อผิดพลาดเกิดขึ้นซ้ำ {this.state.errorCount} ครั้ง
                  </p>
                )}
              </div>

              {/* Error Details (Development Only) */}
              {import.meta.env.DEV && this.state.error && (
                <details className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <summary className="cursor-pointer font-semibold text-red-800 mb-2">
                    รายละเอียดข้อผิดพลาด (Development Mode)
                  </summary>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold text-red-700 mb-1">Error:</p>
                      <pre className="bg-white p-2 rounded overflow-x-auto text-xs">
                        {this.state.error.toString()}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <p className="font-semibold text-red-700 mb-1">
                          Stack Trace:
                        </p>
                        <pre className="bg-white p-2 rounded overflow-x-auto text-xs max-h-48">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo && (
                      <div>
                        <p className="font-semibold text-red-700 mb-1">
                          Component Stack:
                        </p>
                        <pre className="bg-white p-2 rounded overflow-x-auto text-xs max-h-48">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={this.handleReset} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  ลองอีกครั้ง
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  กลับหน้าหลัก
                </Button>
                {this.props.showReportButton && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const subject = encodeURIComponent("Error Report");
                      const body = encodeURIComponent(
                        `Error: ${this.state.error?.toString()}\n\nTimestamp: ${new Date().toISOString()}`
                      );
                      window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`;
                    }}
                  >
                    แจ้งปัญหา
                  </Button>
                )}
              </div>

              {/* Additional Help */}
              {this.props.helpText && (
                <div className="text-sm text-gray-600 border-t pt-4">
                  <p className="font-semibold mb-1">💡 คำแนะนำ:</p>
                  <p>{this.props.helpText}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 * Usage: wrap components that might throw errors
 */
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || "Component"})`;

  return WrappedComponent;
};

export default ErrorBoundary;
