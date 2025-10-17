import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RefreshCw, UserPlus, Search } from 'lucide-react';
import MemberCard from './MemberCard';

export default function MembersView({ refreshKey = 0 }) {
  const { groupId } = useAuth();
  const { openInviteMember } = useModal();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadMembers();
  }, [groupId, refreshKey]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const { getGroupMembers } = await import('../../services/api');
      const response = await getGroupMembers(groupId);
      setMembers(response.members || response);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const total = members.length;
    const active = members.filter((member) => member.status === 'active').length;
    const admins = members.filter((member) => member.role === 'admin').length;
    const moderators = members.filter((member) => member.role === 'moderator').length;
    return { total, active, admins, moderators };
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const name = (member.displayName || member.name || '').toLowerCase();
      const query = (searchTerm || '').toLowerCase();
      const matchesSearch = !query || name.includes(query);

      if (!matchesSearch) return false;

      if (roleFilter !== 'all' && member.role !== roleFilter) return false;
      if (statusFilter !== 'all' && member.status !== statusFilter) return false;

      return true;
    });
  }, [members, searchTerm, roleFilter, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">สมาชิก</h1>
          <p className="text-muted-foreground">จัดการสมาชิกในกลุ่ม</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadMembers}>
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          <Button onClick={() => openInviteMember()}>
            <UserPlus className="w-4 h-4 mr-2" />
            เชิญสมาชิก
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs text-blue-700">สมาชิกทั้งหมด</p>
          <p className="text-2xl font-semibold text-blue-700">{summary.total}</p>
        </div>
        <div className="rounded-lg border border-green-100 bg-green-50 p-4">
          <p className="text-xs text-green-700">ใช้งานอยู่</p>
          <p className="text-2xl font-semibold text-green-700">{summary.active}</p>
        </div>
        <div className="rounded-lg border border-purple-100 bg-purple-50 p-4">
          <p className="text-xs text-purple-700">ผู้ดูแล</p>
          <p className="text-2xl font-semibold text-purple-700">{summary.admins}</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">ผู้ควบคุม</p>
          <p className="text-2xl font-semibold text-amber-700">{summary.moderators}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="ค้นหาสมาชิก..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger>
            <SelectValue placeholder="เลือกบทบาท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">บทบาท: ทั้งหมด</SelectItem>
            <SelectItem value="admin">ผู้ดูแล</SelectItem>
            <SelectItem value="moderator">ผู้ควบคุม</SelectItem>
            <SelectItem value="member">สมาชิก</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="เลือกสถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">สถานะ: ทั้งหมด</SelectItem>
            <SelectItem value="active">ใช้งาน</SelectItem>
            <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
            <SelectItem value="banned">ถูกระงับ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <MemberCard key={member.lineUserId} member={member} onUpdate={loadMembers} />
        ))}
      </div>
    </div>
  );
}
