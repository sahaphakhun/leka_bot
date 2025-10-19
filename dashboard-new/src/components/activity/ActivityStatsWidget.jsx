import { TrendingUp, Activity, Users, Zap } from 'lucide-react';

export default function ActivityStatsWidget({ stats }) {
  if (!stats) return null;

  // Get top actions
  const topActions = Object.entries(stats.byAction || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Get top users
  const topUsers = Object.entries(stats.byUser || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Format action name
  const formatActionName = (action) => {
    const actionMap = {
      'task.created': 'สร้างงาน',
      'task.updated': 'แก้ไขงาน',
      'task.deleted': 'ลบงาน',
      'task.submitted': 'ส่งงาน',
      'task.approved': 'อนุมัติงาน',
      'file.uploaded': 'อัปโหลดไฟล์',
      'file.downloaded': 'ดาวน์โหลดไฟล์',
      'member.added': 'เพิ่มสมาชิก',
      'member.removed': 'ลบสมาชิก',
    };
    return actionMap[action] || action;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Logs */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <Activity className="w-8 h-8 opacity-80" />
          <span className="text-3xl font-bold">{stats.totalLogs}</span>
        </div>
        <p className="text-sm opacity-90">กิจกรรมทั้งหมด</p>
        <p className="text-xs opacity-75 mt-1">30 วันที่ผ่านมา</p>
      </div>

      {/* Recent Activity */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <Zap className="w-8 h-8 opacity-80" />
          <span className="text-3xl font-bold">{stats.recentActivity}</span>
        </div>
        <p className="text-sm opacity-90">กิจกรรมล่าสุด</p>
        <p className="text-xs opacity-75 mt-1">24 ชั่วโมงที่ผ่านมา</p>
      </div>

      {/* Top Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">การกระทำยอดนิยม</h3>
        </div>
        <div className="space-y-2">
          {topActions.length > 0 ? (
            topActions.map(([action, count]) => (
              <div key={action} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate">{formatActionName(action)}</span>
                <span className="font-semibold text-purple-600 ml-2">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">ไม่มีข้อมูล</p>
          )}
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-gray-900">ผู้ใช้ที่ Active</h3>
        </div>
        <div className="space-y-2">
          {topUsers.length > 0 ? (
            topUsers.map(([user, count]) => (
              <div key={user} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate">{user}</span>
                <span className="font-semibold text-orange-600 ml-2">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">ไม่มีข้อมูล</p>
          )}
        </div>
      </div>
    </div>
  );
}
