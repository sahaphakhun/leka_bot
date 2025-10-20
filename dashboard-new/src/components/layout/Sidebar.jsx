import { useState, useEffect } from "react";
import {
  Home,
  Calendar,
  CheckSquare,
  Repeat,
  FileText,
  Users,
  BarChart3,
  Trophy,
  Send,
  UserCircle,
  LogOut,
  Activity,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/use-mobile";

const Sidebar = ({ activeView, onViewChange, groupInfo, userId }) => {
  const { logout } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Close drawer when view changes on mobile
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [activeView, isMobile]);

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const menuItems = [
    { id: "dashboard", icon: Home, label: "ภาพรวม" },
    { id: "calendar", icon: Calendar, label: "ปฏิทินงาน" },
    { id: "tasks", icon: CheckSquare, label: "งานทั้งหมด" },
    { id: "recurring", icon: Repeat, label: "งานประจำ" },
    { id: "files", icon: FileText, label: "คลังไฟล์" },
    { id: "team", icon: Users, label: "สมาชิกกลุ่ม" },
    { id: "leaderboard", icon: Trophy, label: "อันดับ" },
    { id: "reports", icon: BarChart3, label: "รายงาน" },
    { id: "activity", icon: Activity, label: "Activity Logs" },
    { id: "submit", icon: Send, label: "ส่งงาน" },
  ];

  const bottomItems = [
    { id: "profile", icon: UserCircle, label: "โปรไฟล์ของฉัน" },
    { id: "logout", icon: LogOut, label: "ออกจากระบบ" },
  ];

  const handleMenuClick = (id) => {
    if (id === "logout") {
      logout();
      return;
    }
    onViewChange(id);
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-50 p-3 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 lg:hidden border-2 border-white/20"
          aria-label="Toggle menu"
        >
          {isOpen ? (
            <X size={24} strokeWidth={2.5} />
          ) : (
            <Menu size={24} strokeWidth={2.5} />
          )}
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`sidebar-bordio transition-transform duration-300 ease-in-out z-40 ${
          isMobile
            ? `fixed ${isOpen ? "translate-x-0" : "-translate-x-full"}`
            : "fixed"
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-semibold text-lg">Leka Bot</span>
              {groupInfo && (
                <span
                  className="text-white/60 text-xs truncate max-w-[140px]"
                  title={groupInfo.name}
                >
                  {groupInfo.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User Badge (if userId present) */}
        {userId && (
          <div className="px-5 py-2 mb-2">
            <div className="bg-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                U
              </div>
              <span
                className="text-white/80 text-xs truncate flex-1"
                title={userId}
              >
                {userId.substring(0, 8)}...
              </span>
            </div>
          </div>
        )}

        {/* Main Menu */}
        <nav className="flex-1">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`sidebar-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => handleMenuClick(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Bottom Menu */}
        <div className="border-t border-white/10 mt-auto">
          {bottomItems.map((item) => (
            <div
              key={item.id}
              className={`sidebar-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => handleMenuClick(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
