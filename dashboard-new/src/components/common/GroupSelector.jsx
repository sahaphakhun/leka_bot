import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ChevronDown, Users, Check } from "lucide-react";
import { showError } from "../../lib/toast";

/**
 * GroupSelector - Component สำหรับเลือกกลุ่มใน Personal Mode
 * แสดงเฉพาะในโหมด Personal เท่านั้น
 */
export default function GroupSelector({ onGroupChange }) {
  const { userId, groupId, isPersonalMode, updateUrl } = useAuth();
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentGroup, setCurrentGroup] = useState(null);

  // โหลดรายการกลุ่มที่ user เป็นสมาชิก
  useEffect(() => {
    const loadUserGroups = async () => {
      if (!userId || !isPersonalMode()) return;

      try {
        setLoading(true);
        const { getUserGroups } = await import("../../services/api");
        const groups = await getUserGroups(userId);
        setUserGroups(groups || []);

        // หา current group
        const current = groups?.find(
          (g) => g.lineGroupId === groupId || g.id === groupId
        );
        setCurrentGroup(current);
      } catch (error) {
        console.error("Failed to load user groups:", error);
        showError("โหลดรายการกลุ่มไม่สำเร็จ", error);
        setUserGroups([]);
      } finally {
        setLoading(false);
      }
    };

    loadUserGroups();
  }, [userId, groupId, isPersonalMode]);

  // ไม่แสดงใน Group Mode
  if (!isPersonalMode()) {
    return null;
  }

  // กำลังโหลด
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span>กำลังโหลดกลุ่ม...</span>
      </div>
    );
  }

  // ไม่มีกลุ่ม
  if (userGroups.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4 inline mr-2" />
        ไม่พบกลุ่ม
      </div>
    );
  }

  // มีกลุ่มเดียว - แสดงแบบคงที่
  if (userGroups.length === 1) {
    const group = userGroups[0];
    return (
      <div className="px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium truncate">
            {group.groupName || group.name || "ไม่มีชื่อกลุ่ม"}
          </span>
        </div>
      </div>
    );
  }

  // มีหลายกลุ่ม - แสดง Dropdown
  const handleGroupSelect = (group) => {
    const newGroupId = group.lineGroupId || group.id;

    // อัพเดท URL และ state
    updateUrl(userId, newGroupId);
    setCurrentGroup(group);

    // Callback เพื่อ reload data
    if (onGroupChange) {
      onGroupChange(newGroupId);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between text-sm h-auto py-2 px-3"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Users className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            <span className="truncate">
              {currentGroup?.groupName || currentGroup?.name || "เลือกกลุ่ม"}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>กลุ่มของคุณ</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userGroups.map((group) => {
          const gId = group.lineGroupId || group.id;
          const isActive = gId === groupId;

          return (
            <DropdownMenuItem
              key={gId}
              onClick={() => handleGroupSelect(group)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Users className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">
                    {group.groupName || group.name || "ไม่มีชื่อกลุ่ม"}
                  </p>
                  {group.memberCount && (
                    <p className="text-xs text-muted-foreground">
                      {group.memberCount} สมาชิก
                    </p>
                  )}
                </div>
              </div>
              {isActive && (
                <Check className="w-4 h-4 flex-shrink-0 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
