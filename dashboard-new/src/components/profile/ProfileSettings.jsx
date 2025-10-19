import { useState } from "react";
import { showError, showSuccess } from "../../lib/toast";
import { useAuth } from "../../context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { Save } from "lucide-react";

export default function ProfileSettings({ profile, onUpdate }) {
  const { userId, groupId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    displayName: profile?.displayName || "",
    email: profile?.email || "",
    timezone: profile?.timezone || "Asia/Bangkok",
    notifications: {
      taskAssigned: profile?.notifications?.taskAssigned ?? true,
      taskDue: profile?.notifications?.taskDue ?? true,
      taskCompleted: profile?.notifications?.taskCompleted ?? true,
      emailNotifications: profile?.notifications?.emailNotifications ?? false,
    },
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const { updateUserProfile } = await import("../../services/api");
      await updateUserProfile(userId, groupId, settings);
      if (onUpdate) onUpdate();
      showSuccess("บันทึกการตั้งค่าเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Failed to update profile:", error);
      showError("ไม่สามารถบันทึกการตั้งค่าได้", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลส่วนตัว</CardTitle>
          <CardDescription>แก้ไขข้อมูลโปรไฟล์ของคุณ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile?.pictureUrl} />
              <AvatarFallback>
                {(profile?.displayName || "?").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-gray-500">รูปโปรไฟล์จาก LINE</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">ชื่อแสดง</Label>
            <Input
              id="displayName"
              value={settings.displayName}
              onChange={(e) =>
                setSettings({ ...settings, displayName: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">อีเมล (ไม่บังคับ)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={settings.email}
              onChange={(e) =>
                setSettings({ ...settings, email: e.target.value })
              }
            />
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {settings.email ? (
                <>
                  <Badge variant="default" className="bg-green-500">
                    ✓ เชื่อมต่อแล้ว
                  </Badge>
                  <span>สามารถรับอีเมลแจ้งเตือนได้</span>
                </>
              ) : (
                <>
                  <Badge variant="outline">ยังไม่เชื่อมต่อ</Badge>
                  <span>กรุณาใส่อีเมลสำหรับรับการแจ้งเตือน</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">เขตเวลา</Label>
            <p className="text-xs text-gray-500">
              ใช้สำหรับแสดงเวลาในปฏิทินและการแจ้งเตือน
            </p>
            <Select
              value={settings.timezone}
              onValueChange={(value) =>
                setSettings({ ...settings, timezone: value })
              }
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder="เลือกเขตเวลา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Bangkok">
                  🇹🇭 ประเทศไทย (UTC+7)
                </SelectItem>
                <SelectItem value="Asia/Ho_Chi_Minh">
                  🇻🇳 เวียดนาม (UTC+7)
                </SelectItem>
                <SelectItem value="Asia/Jakarta">
                  🇮🇩 อินโดนีเซีย (UTC+7)
                </SelectItem>
                <SelectItem value="Asia/Singapore">
                  🇸🇬 สิงคโปร์ (UTC+8)
                </SelectItem>
                <SelectItem value="Asia/Kuala_Lumpur">
                  🇲🇾 มาเลเซีย (UTC+8)
                </SelectItem>
                <SelectItem value="Asia/Manila">
                  🇵🇭 ฟิลิปปินส์ (UTC+8)
                </SelectItem>
                <SelectItem value="Asia/Hong_Kong">
                  🇭🇰 ฮ่องกง (UTC+8)
                </SelectItem>
                <SelectItem value="Asia/Shanghai">🇨🇳 จีน (UTC+8)</SelectItem>
                <SelectItem value="Asia/Taipei">🇹🇼 ไต้หวัน (UTC+8)</SelectItem>
                <SelectItem value="Asia/Tokyo">🇯🇵 ญี่ปุ่น (UTC+9)</SelectItem>
                <SelectItem value="Asia/Seoul">🇰🇷 เกาหลีใต้ (UTC+9)</SelectItem>
                <SelectItem value="Australia/Sydney">
                  🇦🇺 ออสเตรเลีย (UTC+10/+11)
                </SelectItem>
                <SelectItem value="Pacific/Auckland">
                  🇳🇿 นิวซีแลนด์ (UTC+12/+13)
                </SelectItem>
                <SelectItem value="Europe/London">
                  🇬🇧 ลอนดอน (UTC+0/+1)
                </SelectItem>
                <SelectItem value="Europe/Paris">
                  🇫🇷 ปารีส (UTC+1/+2)
                </SelectItem>
                <SelectItem value="America/New_York">
                  🇺🇸 นิวยอร์ก (UTC-5/-4)
                </SelectItem>
                <SelectItem value="America/Los_Angeles">
                  🇺🇸 ลอสแอนเจลิส (UTC-8/-7)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>การแจ้งเตือน</CardTitle>
          <CardDescription>จัดการการแจ้งเตือนของคุณ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>📋 งานที่ได้รับมอบหมาย</Label>
              <p className="text-sm text-gray-500">
                แจ้งเตือนทันทีเมื่อมีงานใหม่
              </p>
            </div>
            <Switch
              checked={settings.notifications.taskAssigned}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: {
                    ...settings.notifications,
                    taskAssigned: checked,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>⏰ งานใกล้ครบกำหนด</Label>
              <p className="text-sm text-gray-500">แจ้งเตือนล่วงหน้า 1 วัน</p>
            </div>
            <Switch
              checked={settings.notifications.taskDue}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: {
                    ...settings.notifications,
                    taskDue: checked,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>✅ งานเสร็จสิ้น</Label>
              <p className="text-sm text-gray-500">
                แจ้งเตือนเมื่องานที่มอบหมายเสร็จแล้ว
              </p>
            </div>
            <Switch
              checked={settings.notifications.taskCompleted}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: {
                    ...settings.notifications,
                    taskCompleted: checked,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label>📧 แจ้งเตือนทางอีเมล</Label>
              <p className="text-sm text-gray-500">
                รับการแจ้งเตือนทางอีเมลพร้อม LINE
                {!settings.email && (
                  <span className="text-amber-600"> (ต้องใส่อีเมลก่อน)</span>
                )}
              </p>
            </div>
            <Switch
              checked={settings.notifications.emailNotifications}
              disabled={!settings.email}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: {
                    ...settings.notifications,
                    emailNotifications: checked,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </Button>
      </div>
    </div>
  );
}
