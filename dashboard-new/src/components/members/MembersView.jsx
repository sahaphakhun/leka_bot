import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { RefreshCw, UserPlus, Search } from 'lucide-react';
import MemberCard from './MemberCard';

export default function MembersView({ refreshKey = 0 }) {
  const { groupId } = useAuth();
  const { openInviteMember } = useModal();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredMembers = members.filter(member =>
    (member.displayName || member.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="ค้นหาสมาชิก..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <MemberCard key={member.lineUserId} member={member} onUpdate={loadMembers} />
        ))}
      </div>
    </div>
  );
}
