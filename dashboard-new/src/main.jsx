import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary";
import AsyncErrorBoundary from "./components/common/AsyncErrorBoundary";

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
    <Toaster
      position="top-right"
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
          borderRadius: "8px",
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          padding: "12px 16px",
          maxWidth: "500px",
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
  </StrictMode>,
);
