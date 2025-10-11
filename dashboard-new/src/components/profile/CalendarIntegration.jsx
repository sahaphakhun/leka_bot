import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar, Link2, Unlink, CheckCircle2 } from 'lucide-react';

export default function CalendarIntegration({ profile }) {
  const [connected, setConnected] = useState(profile?.calendarConnected || false);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConnected(true);
      alert('เชื่อมต่อปฏิทินสำเร็จ');
    } catch (error) {
      console.error('Failed to connect calendar:', error);
      alert('ไม่สามารถเชื่อมต่อปฏิทินได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConnected(false);
      alert('ยกเลิกการเชื่อมต่อปฏิทินแล้ว');
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
      alert('ไม่สามารถยกเลิกการเชื่อมต่อได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>เชื่อมต่อปฏิทิน</CardTitle>
          <CardDescription>
            เชื่อมต่อกับ Google Calendar เพื่อซิงค์งานอัตโนมัติ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connected ? (
            <>
              <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">เชื่อมต่อแล้ว</p>
                  <p className="text-sm text-green-700">
                    งานของคุณจะถูกซิงค์ไปยัง Google Calendar อัตโนมัติ
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-800">ใช้งานอยู่</Badge>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">การตั้งค่าการซิงค์</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• งานใหม่จะถูกเพิ่มในปฏิทินอัตโนมัติ</li>
                  <li>• การเปลี่ยนแปลงงานจะอัปเดตในปฏิทิน</li>
                  <li>• งานที่เสร็จจะถูกทำเครื่องหมายในปฏิทิน</li>
                </ul>
              </div>

              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={loading}
                className="w-full"
              >
                <Unlink className="w-4 h-4 mr-2" />
                ยกเลิกการเชื่อมต่อ
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <Calendar className="w-12 h-12 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium">Google Calendar</p>
                  <p className="text-sm text-gray-500">
                    ซิงค์งานไปยัง Google Calendar ของคุณ
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">ประโยชน์ของการเชื่อมต่อ</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• ดูงานทั้งหมดในปฏิทินเดียว</li>
                  <li>• รับการแจ้งเตือนจากปฏิทิน</li>
                  <li>• จัดการเวลาได้ง่ายขึ้น</li>
                  <li>• ซิงค์อัตโนมัติแบบ real-time</li>
                </ul>
              </div>

              <Button
                onClick={handleConnect}
                disabled={loading}
                className="w-full"
              >
                <Link2 className="w-4 h-4 mr-2" />
                {loading ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อกับ Google Calendar'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
