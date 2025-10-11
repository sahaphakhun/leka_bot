import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { UserPlus, Copy, Check } from 'lucide-react';

export default function InviteMemberModal({ onInvited }) {
  const { groupId } = useAuth();
  const { isInviteMemberOpen, closeInviteMember } = useModal();
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const generateInviteLink = async () => {
    setLoading(true);
    try {
      const { createInviteLink } = await import('../../services/api');
      const response = await createInviteLink(groupId);
      setInviteLink(response.link || response);
    } catch (error) {
      console.error('Failed to generate invite link:', error);
      alert('ไม่สามารถสร้างลิงก์เชิญได้');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    if (!email) {
      alert('กรุณาระบุอีเมล');
      return;
    }

    setLoading(true);
    try {
      const { sendInviteEmail } = await import('../../services/api');
      await sendInviteEmail(groupId, email, message);
      alert('ส่งคำเชิญทางอีเมลเรียบร้อยแล้ว');
      setEmail('');
      setMessage('');
      if (onInvited) onInvited();
    } catch (error) {
      console.error('Failed to send invite:', error);
      alert('ไม่สามารถส่งคำเชิญได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isInviteMemberOpen} onOpenChange={closeInviteMember}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เชิญสมาชิกใหม่</DialogTitle>
          <DialogDescription>
            เชิญคนอื่นเข้าร่วมกลุ่มของคุณ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite Link */}
          <div className="space-y-3">
            <Label>ลิงก์เชิญ</Label>
            {inviteLink ? (
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="flex-1" />
                <Button onClick={handleCopyLink} variant="outline">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            ) : (
              <Button onClick={generateInviteLink} disabled={loading} className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                สร้างลิงก์เชิญ
              </Button>
            )}
            <p className="text-xs text-gray-500">
              ลิงก์นี้สามารถใช้ได้ 7 วัน และสามารถใช้ได้ไม่จำกัดจำนวนครั้ง
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">หรือ</span>
            </div>
          </div>

          {/* Email Invite */}
          <div className="space-y-3">
            <Label htmlFor="email">ส่งคำเชิญทางอีเมล</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Textarea
              placeholder="ข้อความเพิ่มเติม (ถ้ามี)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
            <Button onClick={handleSendEmail} disabled={loading} className="w-full">
              ส่งคำเชิญ
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
