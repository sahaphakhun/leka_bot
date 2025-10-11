import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Shield, UserX, Save } from 'lucide-react';

export default function MemberActionsModal({ onUpdated }) {
  const { groupId } = useAuth();
  const { isMemberActionsOpen, closeMemberActions, selectedMember, openConfirmDialog } = useModal();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(selectedMember?.role || 'member');

  if (!selectedMember) return null;

  const handleUpdateRole = async () => {
    setLoading(true);
    try {
      const { updateMemberRole } = await import('../../services/api');
      await updateMemberRole(groupId, selectedMember.lineUserId, role);
      if (onUpdated) onUpdated();
      closeMemberActions();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('ไม่สามารถอัปเดตบทบาทได้');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = () => {
    openConfirmDialog({
      title: 'ลบสมาชิก',
      description: `คุณแน่ใจหรือไม่ว่าต้องการลบ "${selectedMember.displayName}" ออกจากกลุ่ม?`,
      confirmText: 'ลบ',
      cancelText: 'ยกเลิก',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const { removeMember } = await import('../../services/api');
          await removeMember(groupId, selectedMember.lineUserId);
          if (onUpdated) onUpdated();
          closeMemberActions();
        } catch (error) {
          console.error('Failed to remove member:', error);
          alert('ไม่สามารถลบสมาชิกได้');
        }
      }
    });
  };

  return (
    <Dialog open={isMemberActionsOpen} onOpenChange={closeMemberActions}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>จัดการสมาชิก</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Member Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
            <div>
              <p className="font-medium">{selectedMember.displayName || selectedMember.name}</p>
              <p className="text-sm text-gray-500">{selectedMember.email || 'ไม่มีอีเมล'}</p>
            </div>
          </div>

          {/* Change Role */}
          <div className="space-y-2">
            <Label>บทบาท</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">สมาชิก</SelectItem>
                <SelectItem value="admin">ผู้ดูแล</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              ผู้ดูแลสามารถจัดการงาน สมาชิก และตั้งค่าต่างๆ ได้
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-4 border-t">
            <Button onClick={handleUpdateRole} disabled={loading || role === selectedMember.role}>
              <Save className="w-4 h-4 mr-2" />
              บันทึกการเปลี่ยนแปลง
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={loading}
            >
              <UserX className="w-4 h-4 mr-2" />
              ลบสมาชิกออกจากกลุ่ม
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
