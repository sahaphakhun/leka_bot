import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { User, Settings, Calendar } from 'lucide-react';
import ProfileSettings from './ProfileSettings';
import CalendarIntegration from './CalendarIntegration';

export default function ProfileView() {
  const { userId, groupId } = useAuth();
  const readOnly = !userId;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [userId, groupId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { getUserProfile } = await import('../../services/api');
      const response = await getUserProfile(userId, groupId);
      setProfile(response.data || response);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">โปรไฟล์และการตั้งค่า</h1>
        <p className="text-muted-foreground">จัดการข้อมูลส่วนตัวและการตั้งค่า</p>
      </div>

      {readOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">โหมดดูอย่างเดียว</p>
          <p>กรุณาเข้าสู่ระบบผ่านลิงก์ใน LINE ส่วนตัวเพื่อแก้ไขข้อมูลโปรไฟล์และการแจ้งเตือน</p>
        </div>
      )}

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            การตั้งค่า
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="w-4 h-4 mr-2" />
            ปฏิทิน
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <ProfileSettings profile={profile} onUpdate={loadProfile} />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarIntegration profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
