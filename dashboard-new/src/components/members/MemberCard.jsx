import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { MoreVertical, Shield, User } from 'lucide-react';

export default function MemberCard({ member, onUpdate }) {
  const { userId } = useAuth();
  const { openMemberActions } = useModal();
  const isCurrentUser = member.lineUserId === userId;

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return (
        <Badge className="bg-purple-100 text-purple-800">
          <Shield className="w-3 h-3 mr-1" />
          ผู้ดูแล
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <User className="w-3 h-3 mr-1" />
        สมาชิก
      </Badge>
    );
  };

  const getStatusColor = (status) => {
    if (status === 'active') return 'bg-green-500';
    if (status === 'inactive') return 'bg-gray-400';
    return 'bg-yellow-500';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={member.pictureUrl} />
                <AvatarFallback>
                  {(member.displayName || member.name || '?').charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(member.status)}`}
                title={member.status === 'active' ? 'ออนไลน์' : 'ออฟไลน์'}
              />
            </div>
            <div>
              <h3 className="font-semibold">
                {member.displayName || member.name}
                {isCurrentUser && (
                  <span className="text-xs text-gray-500 ml-2">(คุณ)</span>
                )}
              </h3>
              {getRoleBadge(member.role)}
            </div>
          </div>
          {!isCurrentUser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openMemberActions(member)}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t text-center">
          <div>
            <p className="text-xs text-gray-500">งานที่ได้รับ</p>
            <p className="text-lg font-semibold">{member.tasksAssigned || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">เสร็จสิ้น</p>
            <p className="text-lg font-semibold text-green-600">
              {member.tasksCompleted || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">อัตราสำเร็จ</p>
            <p className="text-lg font-semibold text-blue-600">
              {member.completionRate || 0}%
            </p>
          </div>
        </div>

        {/* Join Date */}
        {member.joinedAt && (
          <div className="mt-3 pt-3 border-t text-xs text-gray-500">
            เข้าร่วมเมื่อ: {new Date(member.joinedAt).toLocaleDateString('th-TH')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
