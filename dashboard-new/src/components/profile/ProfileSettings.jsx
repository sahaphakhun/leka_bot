import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Save, Bell, Mail } from 'lucide-react';

export default function ProfileSettings({ profile, onUpdate }) {
  const { userId, groupId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    displayName: profile?.displayName || '',
    email: profile?.email || '',
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
      const { updateUserProfile } = await import('../../services/api');
      await updateUserProfile(userId, groupId, settings);
      if (onUpdate) onUpdate();
      alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('ไม่สามารถบันทึกการตั้งค่าได้');
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
                {(profile?.displayName || '?').charAt(0)}
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
              onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            />
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
              <Label>งานที่ได้รับมอบหมาย</Label>
              <p className="text-sm text-gray-500">แจ้งเตือนเมื่อมีงานใหม่</p>
            </div>
            <Switch
              checked={settings.notifications.taskAssigned}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, taskAssigned: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>งานใกล้ครบกำหนด</Label>
              <p className="text-sm text-gray-500">แจ้งเตือนก่อนครบกำหนด 1 วัน</p>
            </div>
            <Switch
              checked={settings.notifications.taskDue}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, taskDue: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>งานเสร็จสิ้น</Label>
              <p className="text-sm text-gray-500">แจ้งเตือนเมื่องานเสร็จ</p>
            </div>
            <Switch
              checked={settings.notifications.taskCompleted}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, taskCompleted: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label>แจ้งเตือนทางอีเมล</Label>
              <p className="text-sm text-gray-500">รับการแจ้งเตือนทางอีเมลด้วย</p>
            </div>
            <Switch
              checked={settings.notifications.emailNotifications}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, emailNotifications: checked },
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
          {loading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </Button>
      </div>
    </div>
  );
}
