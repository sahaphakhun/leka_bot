import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary";
import AsyncErrorBoundary from "./components/common/AsyncErrorBoundary";
import { useIsMobile } from "./hooks/use-mobile";

function ResponsiveToaster() {
  const isMobile = useIsMobile();
  const maxWidth = isMobile ? "calc(100vw - 2rem)" : "500px";

  return (
    <Toaster
      position={isMobile ? "top-center" : "top-right"}
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Default options
        className: "",
        duration: 3000,
        style: {
          background: "#fff",
          color: "#374151",
          fontSize: "14px",
          fontWeight: "500",
          borderRadius: "10px",
          boxShadow:
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          padding: "12px 16px",
          maxWidth,
        },
        // Success
        success: {
          duration: 2000,
          style: {
            background: "#10b981",
            color: "#fff",
          },
          iconTheme: {
            primary: "#fff",
            secondary: "#10b981",
          },
        },
        // Error
        error: {
          duration: 4000,
          style: {
            background: "#ef4444",
            color: "#fff",
          },
          iconTheme: {
            primary: "#fff",
            secondary: "#ef4444",
          },
        },
        // Loading
        loading: {
          duration: Infinity,
          style: {
            background: "#fff",
            color: "#374151",
          },
        },
      }}
    />
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary
      errorMessage="ขออภัย แดชบอร์ดเกิดข้อผิดพลาด กรุณารีเฟรชหน้าเว็บ"
      helpText="หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบหรือลองเข้าผ่าน LINE อีกครั้ง"
      showReportButton={true}
      onError={(error, errorInfo) => {
        // Log to console in development
        if (import.meta.env.DEV) {
          console.error("App Error:", error, errorInfo);
        }
        // TODO: Send to error tracking service (Sentry)
      }}
    >
      <AsyncErrorBoundary>
        <App />
      </AsyncErrorBoundary>
    </ErrorBoundary>
    <ResponsiveToaster />
  </StrictMode>,
);
