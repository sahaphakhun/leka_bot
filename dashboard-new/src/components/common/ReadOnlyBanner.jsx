import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ReadOnlyBanner() {
  const { isReadOnly, isGroupMode, userId, groupId, getAuthError } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // ไม่แสดงถ้าไม่ใช่ read-only หรือถูก dismiss แล้ว
  if (!isReadOnly || dismissed) {
    return null;
  }

  // ไม่แสดงถ้าอยู่ใน Group Mode ปกติ
  if (isGroupMode() && groupId) {
    return null;
  }

  const authError = getAuthError();
  if (!authError) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-yellow-900">
                {authError.title}
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                {authError.message}
              </p>
              {authError.details && (
                <p className="text-xs text-yellow-600 mt-1">
                  💡 {authError.details}
                </p>
              )}

              {/* แสดงข้อมูล Debug */}
              <div className="mt-2 text-xs text-yellow-600 font-mono">
                <span className="font-semibold">Debug Info:</span>{' '}
                userId: {userId || 'ไม่มี'} | groupId: {groupId || 'ไม่มี'}
              </div>

              {/* คำแนะนำ */}
              <div className="mt-2 text-xs text-yellow-700">
                <p className="font-semibold mb-1">คุณสามารถ:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>✅ ดูข้อมูลงาน, ปฏิทิน, ไฟล์, สมาชิก</li>
                  <li>✅ ส่งงาน (Submit Task)</li>
                  <li>❌ สร้าง/แก้ไข/ลบงาน</li>
                  <li>❌ จัดการสมาชิก</li>
                  <li>❌ อัปโหลด/ลบไฟล์</li>
                </ul>
              </div>

              {/* ปุ่มติดต่อ Bot */}
              <div className="mt-3">
                <a
                  href="https://line.me/R/ti/p/@leka-bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded hover:bg-yellow-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                  เปิดใน LINE เพื่อใช้งานเต็มรูปแบบ
                </a>
              </div>
            </div>
          </div>

          {/* ปุ่มปิด */}
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 text-yellow-600 hover:text-yellow-800 transition-colors"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
