import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  UserPlus,
  UserMinus,
  Shield,
  CheckCircle,
  XCircle,
  Edit,
  Plus,
  RefreshCw,
  Activity,
} from 'lucide-react';

export default function ActivityLogList({ logs, loading }) {
  // Get icon for action
  const getActionIcon = (action) => {
    const iconMap = {
      // Task actions
      'task.created': <Plus className="w-4 h-4" />,
      'task.updated': <Edit className="w-4 h-4" />,
      'task.deleted': <Trash2 className="w-4 h-4" />,
      'task.submitted': <CheckCircle className="w-4 h-4" />,
      'task.approved': <CheckCircle className="w-4 h-4" />,
      'task.rejected': <XCircle className="w-4 h-4" />,

      // File actions
      'file.uploaded': <Upload className="w-4 h-4" />,
      'file.downloaded': <Download className="w-4 h-4" />,
      'file.deleted': <Trash2 className="w-4 h-4" />,

      // Member actions
      'member.added': <UserPlus className="w-4 h-4" />,
      'member.removed': <UserMinus className="w-4 h-4" />,
      'member.role_changed': <Shield className="w-4 h-4" />,
      'members.bulk_deleted': <UserMinus className="w-4 h-4" />,
      'members.bulk_role_updated': <Shield className="w-4 h-4" />,

      // Recurring task actions
      'recurring_task.created': <RefreshCw className="w-4 h-4" />,
      'recurring_task.updated': <Edit className="w-4 h-4" />,
      'recurring_task.deleted': <Trash2 className="w-4 h-4" />,

      // Default
      'default': <Activity className="w-4 h-4" />,
    };

    return iconMap[action] || iconMap['default'];
  };

  // Get color for action
  const getActionColor = (action) => {
    if (action.includes('created') || action.includes('added')) return 'text-green-600 bg-green-50';
    if (action.includes('deleted') || action.includes('removed')) return 'text-red-600 bg-red-50';
    if (action.includes('updated') || action.includes('changed')) return 'text-blue-600 bg-blue-50';
    if (action.includes('uploaded')) return 'text-purple-600 bg-purple-50';
    if (action.includes('approved')) return 'text-green-600 bg-green-50';
    if (action.includes('rejected')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  // Format action text in Thai
  const formatActionText = (log) => {
    const actionMap = {
      'task.created': 'สร้างงาน',
      'task.updated': 'แก้ไขงาน',
      'task.deleted': 'ลบงาน',
      'task.assigned': 'มอบหมายงาน',
      'task.submitted': 'ส่งงาน',
      'task.approved': 'อนุมัติงาน',
      'task.rejected': 'ปฏิเสธงาน',
      'task.status_changed': 'เปลี่ยนสถานะงาน',

      'file.uploaded': 'อัปโหลดไฟล์',
      'file.downloaded': 'ดาวน์โหลดไฟล์',
      'file.deleted': 'ลบไฟล์',
      'file.previewed': 'แสดงตัวอย่างไฟล์',

      'member.added': 'เพิ่มสมาชิก',
      'member.removed': 'ลบสมาชิก',
      'member.role_changed': 'เปลี่ยนบทบาทสมาชิก',
      'members.bulk_deleted': 'ลบสมาชิกหลายคน',
      'members.bulk_role_updated': 'เปลี่ยนบทบาทหลายคน',

      'recurring_task.created': 'สร้างงานซ้ำ',
      'recurring_task.updated': 'แก้ไขงานซ้ำ',
      'recurring_task.deleted': 'ลบงานซ้ำ',

      'user.login': 'เข้าสู่ระบบ',
      'user.logout': 'ออกจากระบบ',
      'user.profile_updated': 'แก้ไขโปรไฟล์',
      'user.email_verified': 'ยืนยันอีเมล',

      'group.settings_changed': 'เปลี่ยนการตั้งค่ากลุ่ม',

      'report.generated': 'สร้างรายงาน',
      'report.exported': 'ส่งออกรายงาน',
    };

    const actionText = actionMap[log.action] || log.action;
    const userName = log.user?.displayName || log.user?.realName || 'ผู้ใช้';

    // Add details if available
    let detailText = '';
    if (log.details) {
      if (log.details.title) {
        detailText = ` "${log.details.title}"`;
      } else if (log.details.fileName) {
        detailText = ` "${log.details.fileName}"`;
      } else if (log.details.newValue && log.details.oldValue) {
        detailText = ` จาก "${log.details.oldValue}" เป็น "${log.details.newValue}"`;
      }
    }

    return `${userName} ${actionText}${detailText}`;
  };

  // Format resource type in Thai
  const formatResourceType = (type) => {
    const typeMap = {
      task: 'งาน',
      file: 'ไฟล์',
      member: 'สมาชิก',
      user: 'ผู้ใช้',
      group: 'กลุ่ม',
      recurring_task: 'งานซ้ำ',
      report: 'รายงาน',
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังโหลด...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <Activity className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 text-lg mb-2">ไม่พบ Activity Logs</p>
        <p className="text-gray-500 text-sm">ยังไม่มีกิจกรรมในช่วงเวลาที่เลือก</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="divide-y divide-gray-200">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`p-2 rounded-full ${getActionColor(log.action)}`}>
                {getActionIcon(log.action)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">
                    {formatActionText(log)}
                  </p>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {formatDistanceToNow(new Date(log.createdAt), {
                      addSuffix: true,
                      locale: th,
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                    {formatResourceType(log.resourceType)}
                  </span>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <span className="text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                {/* Details (expandable) */}
                {log.details && Object.keys(log.details).length > 1 && (
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                      ดูรายละเอียดเพิ่มเติม
                    </summary>
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <pre className="whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
