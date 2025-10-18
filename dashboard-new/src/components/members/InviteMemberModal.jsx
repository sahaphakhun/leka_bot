import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { UserPlus, Copy, Check, Link2, Mail, Loader2 } from "lucide-react";
import { showSuccess, showError, showWarning } from "../../lib/toast";

export default function InviteMemberModal({ onInvited }) {
  const { groupId, canModify } = useAuth();
  const { isInviteMemberOpen, closeInviteMember } = useModal();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("link");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const generateInviteLink = async () => {
    if (!canModify()) {
      showWarning("คุณไม่มีสิทธิ์เชิญสมาชิก");
      return;
    }

    setLoading(true);
    try {
      const { createInviteLink } = await import("../../services/api");
      const response = await createInviteLink(groupId);
      const link =
        response.link || response.inviteUrl || response.url || response;
      setInviteLink(link);
      showSuccess("สร้างลิงก์เชิญสำเร็จ");
      console.log("✅ Generated invite link");
    } catch (error) {
      console.error("❌ Failed to generate invite link:", error);
      showError("ไม่สามารถสร้างลิงก์เชิญได้", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) {
      showWarning("กรุณาสร้างลิงก์เชิญก่อน");
      return;
    }

    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    showSuccess("คัดลอกลิงก์แล้ว");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    if (!canModify()) {
      showWarning("คุณไม่มีสิทธิ์เชิญสมาชิก");
      return;
    }

    if (!email?.trim()) {
      showWarning("กรุณากรอกอีเมล");
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showWarning("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    setLoading(true);
    try {
      const { sendInviteEmail } = await import("../../services/api");
      await sendInviteEmail(groupId, email, message);
      showSuccess("ส่งคำเชิญทางอีเมลสำเร็จ");
      console.log("✅ Sent invite email to:", email);

      // Reset form
      setEmail("");
      setMessage("");

      if (onInvited) onInvited();
    } catch (error) {
      console.error("❌ Failed to send invite:", error);
      showError("ไม่สามารถส่งคำเชิญได้", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setInviteLink("");
    setEmail("");
    setMessage("");
    setCopied(false);
    closeInviteMember();
  };

  // Check permission
  const hasPermission = canModify();

  return (
    <Dialog open={isInviteMemberOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            เชิญสมาชิกใหม่
          </DialogTitle>
          <DialogDescription>เชิญคนอื่นเข้าร่วมกลุ่มของคุณ</DialogDescription>
        </DialogHeader>

        {!hasPermission && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-800">
              ⚠️ คุณไม่มีสิทธิ์เชิญสมาชิก กรุณาติดต่อผู้ดูแลกลุ่ม
            </p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              ลิงก์เชิญ
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              อีเมล
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-3">
              <Label>สร้างลิงก์เชิญ</Label>
              <p className="text-sm text-gray-600">
                สร้างลิงก์เพื่อแชร์กับผู้ที่ต้องการเชิญเข้ากลุ่ม
              </p>

              {inviteLink ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={inviteLink}
                      readOnly
                      className="flex-1 font-mono text-xs"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      size="icon"
                      title="คัดลอก"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      💡 <strong>หมายเหตุ:</strong> ลิงก์นี้ใช้ได้ 7 วัน
                      และสามารถใช้ได้ไม่จำกัดจำนวนครั้ง
                    </p>
                  </div>

                  <Button
                    onClick={generateInviteLink}
                    variant="outline"
                    className="w-full"
                    disabled={loading || !hasPermission}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    สร้างลิงก์ใหม่
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={generateInviteLink}
                  disabled={loading || !hasPermission}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังสร้าง...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      สร้างลิงก์เชิญ
                    </>
                  )}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!hasPermission}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">ข้อความเพิ่มเติม</Label>
                <Textarea
                  id="message"
                  placeholder="เชิญคุณเข้าร่วมกลุ่มของเรา..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  disabled={!hasPermission}
                />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  📧 ระบบจะส่งอีเมลเชิญพร้อมลิงก์สำหรับเข้าร่วมกลุ่ม
                </p>
              </div>

              <Button
                onClick={handleSendEmail}
                disabled={loading || !hasPermission}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังส่ง...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    ส่งคำเชิญ
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            ปิด
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
