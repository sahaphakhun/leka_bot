import { useAuth } from "../../context/AuthContext";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { User, Users, Eye, Edit } from "lucide-react";

/**
 * ViewModeBadge - แสดง badge บอกโหมดการใช้งานปัจจุบัน
 */
export default function ViewModeBadge({ showTooltip = true, variant = "default" }) {
  const { viewMode, isPersonalMode, isGroupMode, canModify } = useAuth();

  if (!viewMode) return null;

  const isPersonal = isPersonalMode();
  const isGroup = isGroupMode();
  const canEdit = canModify();

  // กำหนด badge style ตาม mode
  const badgeConfig = {
    personal: {
      icon: User,
      text: "ส่วนตัว",
      variant: "default",
      className: "bg-blue-100 text-blue-800 hover:bg-blue-200",
      tooltip: "โหมดส่วนตัว - คุณสามารถแก้ไข/ลบงานที่สร้าง และส่งงานที่รับผิดชอบได้",
    },
    group: {
      icon: Users,
      text: "กลุ่ม",
      variant: "secondary",
      className: "bg-gray-100 text-gray-800 hover:bg-gray-200",
      tooltip: "โหมดกลุ่ม - คุณสามารถดูข้อมูลได้เท่านั้น ไม่สามารถแก้ไขหรือส่งงานได้",
    },
  };

  const config = isPersonal ? badgeConfig.personal : badgeConfig.group;
  const Icon = config.icon;
  const ActionIcon = canEdit ? Edit : Eye;

  const badge = (
    <Badge variant={variant === "default" ? config.variant : variant} className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
      {!canEdit && <Eye className="w-3 h-3 ml-1 opacity-60" />}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{config.text}</p>
            <p className="text-xs">{config.tooltip}</p>
            {isPersonal && (
              <div className="text-xs space-y-1 mt-2 pt-2 border-t">
                <p className="font-medium">สิทธิ์ที่มี:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>ดูงานทั้งหมดในกลุ่ม</li>
                  <li>แก้ไข/ลบงานที่ตัวเองสร้าง</li>
                  <li>ส่งงานที่ตัวเองรับผิดชอบ</li>
                  <li>ตรวจงานที่ตัวเองเป็นผู้ตรวจ</li>
                </ul>
              </div>
            )}
            {isGroup && (
              <div className="text-xs space-y-1 mt-2 pt-2 border-t">
                <p className="font-medium">สิทธิ์ที่มี:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>ดูงานทั้งหมดในกลุ่ม</li>
                  <li>ดูรายละเอียดงาน</li>
                  <li>สลับดูกลุ่มอื่นได้</li>
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
