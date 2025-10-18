import { useState, useEffect } from "react";
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
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Shield,
  UserX,
  Save,
  Ban,
  UserCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { showSuccess, showError, showWarning } from "../../lib/toast";

export default function MemberActionsModal({ onUpdated }) {
  const { groupId, canModify, userId } = useAuth();
  const {
    isMemberActionsOpen,
    closeMemberActions,
    selectedMember,
    openConfirmDialog,
  } = useModal();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("member");
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    if (selectedMember) {
      setRole(selectedMember.role || "member");
      setBanReason("");
    }
  }, [selectedMember]);

  if (!selectedMember) return null;

  const isSelf = userId === selectedMember.lineUserId;
  const hasPermission = canModify();
  const isBanned = selectedMember.status === "banned";

  const handleUpdateRole = async () => {
    if (!hasPermission) {
      showWarning("คุณไม่มีสิทธิ์เปลี่ยนบทบาทสมาชิก");
      return;
    }

    if (isSelf) {
      showWarning("คุณไม่สามารถเปลี่ยนบทบาทของตัวเองได้");
      return;
    }

    if (role === selectedMember.role) {
      showWarning("บทบาทไม่มีการเปลี่ยนแปลง");
      return;
    }

    setLoading(true);
    try {
      const { updateMemberRole } = await import("../../services/api");
      await updateMemberRole(groupId, selectedMember.lineUserId, role);
      showSuccess(
        `เปลี่ยนบทบาทเป็น ${role === "admin" ? "ผู้ดูแล" : role === "moderator" ? "ผู้ควบคุม" : "สมาชิก"} สำเร็จ`,
      );
      console.log("✅ Updated member role:", selectedMember.lineUserId, role);
      if (onUpdated) onUpdated();
      closeMemberActions();
    } catch (error) {
      console.error("❌ Failed to update role:", error);
      showError("ไม่สามารถอัปเดตบทบาทได้", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = () => {
    if (!hasPermission) {
      showWarning("คุณไม่มีสิทธิ์ลบสมาชิก");
      return;
    }

    if (isSelf) {
      showWarning("คุณไม่สามารถลบตัวเองออกจากกลุ่มได้");
      return;
    }

    openConfirmDialog({
      title: "ลบสมาชิก",
      description: `คุณแน่ใจหรือไม่ว่าต้องการลบ "${selectedMember.displayName || selectedMember.name}" ออกจากกลุ่ม? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      variant: "destructive",
      onConfirm: async () => {
        try {
          setLoading(true);
          const { removeMember } = await import("../../services/api");
          await removeMember(groupId, selectedMember.lineUserId);
          showSuccess("ลบสมาชิกสำเร็จ");
          console.log("✅ Removed member:", selectedMember.lineUserId);
          if (onUpdated) onUpdated();
          closeMemberActions();
        } catch (error) {
          console.error("❌ Failed to remove member:", error);
          showError("ไม่สามารถลบสมาชิกได้", error);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleBanMember = () => {
    if (!hasPermission) {
      showWarning("คุณไม่มีสิทธิ์ระงับสมาชิก");
      return;
    }

    if (isSelf) {
      showWarning("คุณไม่สามารถระงับตัวเองได้");
      return;
    }

    openConfirmDialog({
      title: "ระงับสมาชิก",
      description: `คุณแน่ใจหรือไม่ว่าต้องการระงับ "${selectedMember.displayName || selectedMember.name}"? สมาชิกจะไม่สามารถเข้าถึงกลุ่มได้จนกว่าจะถูกปลดระงับ`,
      confirmText: "ระงับ",
      cancelText: "ยกเลิก",
      variant: "destructive",
      onConfirm: async () => {
        try {
          setLoading(true);
          const { banMember } = await import("../../services/api");
          await banMember(groupId, selectedMember.lineUserId, banReason);
          showSuccess("ระงับสมาชิกสำเร็จ");
          console.log("✅ Banned member:", selectedMember.lineUserId);
          if (onUpdated) onUpdated();
          closeMemberActions();
        } catch (error) {
          console.error("❌ Failed to ban member:", error);
          showError("ไม่สามารถระงับสมาชิกได้", error);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleUnbanMember = async () => {
    if (!hasPermission) {
      showWarning("คุณไม่มีสิทธิ์ปลดระงับสมาชิก");
      return;
    }

    setLoading(true);
    try {
      const { unbanMember } = await import("../../services/api");
      await unbanMember(groupId, selectedMember.lineUserId);
      showSuccess("ปลดระงับสมาชิกสำเร็จ");
      console.log("✅ Unbanned member:", selectedMember.lineUserId);
      if (onUpdated) onUpdated();
      closeMemberActions();
    } catch (error) {
      console.error("❌ Failed to unban member:", error);
      showError("ไม่สามารถปลดระงับสมาชิกได้", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isMemberActionsOpen} onOpenChange={closeMemberActions}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            จัดการสมาชิก
          </DialogTitle>
          <DialogDescription>
            จัดการบทบาทและสิทธิ์ของสมาชิกในกลุ่ม
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Permission Warning */}
          {!hasPermission && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                คุณไม่มีสิทธิ์จัดการสมาชิก กรุณาติดต่อผู้ดูแลกลุ่ม
              </AlertDescription>
            </Alert>
          )}

          {/* Self Warning */}
          {isSelf && (
            <Alert>
              <AlertDescription>
                ⚠️ คุณกำลังดูข้อมูลของตัวเอง
                คุณไม่สามารถเปลี่ยนบทบาทหรือลบตัวเองได้
              </AlertDescription>
            </Alert>
          )}

          {/* Member Info */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                {selectedMember.displayName || selectedMember.name}
              </p>
              <p className="text-sm text-gray-600">
                {selectedMember.email || "ไม่มีอีเมล"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    isBanned
                      ? "bg-red-100 text-red-800"
                      : selectedMember.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {isBanned
                    ? "ถูกระงับ"
                    : selectedMember.status === "active"
                      ? "ใช้งานอยู่"
                      : "ไม่ใช้งาน"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {selectedMember.role === "admin"
                    ? "ผู้ดูแล"
                    : selectedMember.role === "moderator"
                      ? "ผู้ควบคุม"
                      : "สมาชิก"}
                </span>
              </div>
            </div>
          </div>

          {/* Change Role */}
          {!isBanned && (
            <div className="space-y-2">
              <Label htmlFor="role">เปลี่ยนบทบาท</Label>
              <Select
                value={role}
                onValueChange={setRole}
                disabled={!hasPermission || isSelf}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">สมาชิก</SelectItem>
                  <SelectItem value="moderator">ผู้ควบคุม</SelectItem>
                  <SelectItem value="admin">ผู้ดูแล</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                • <strong>ผู้ดูแล</strong>: จัดการทุกอย่างได้
                <br />• <strong>ผู้ควบคุม</strong>: จัดการงานและอนุมัติได้
                <br />• <strong>สมาชิก</strong>: ดูและทำงานที่ได้รับมอบหมาย
              </p>
            </div>
          )}

          {/* Ban Reason */}
          {!isBanned && (
            <div className="space-y-2">
              <Label htmlFor="banReason">เหตุผลในการระงับ (ถ้ามี)</Label>
              <Textarea
                id="banReason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="ระบุเหตุผล..."
                rows={2}
                disabled={!hasPermission || isSelf}
              />
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t">
            {!isBanned && (
              <>
                <Button
                  onClick={handleUpdateRole}
                  disabled={
                    loading ||
                    !hasPermission ||
                    isSelf ||
                    role === selectedMember.role
                  }
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      บันทึกการเปลี่ยนแปลง
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleBanMember}
                  disabled={loading || !hasPermission || isSelf}
                  className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  ระงับสมาชิก
                </Button>
              </>
            )}

            {isBanned && (
              <Button
                variant="outline"
                onClick={handleUnbanMember}
                disabled={loading || !hasPermission}
                className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังปลดระงับ...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    ปลดระงับสมาชิก
                  </>
                )}
              </Button>
            )}

            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={loading || !hasPermission || isSelf}
              className="w-full"
            >
              <UserX className="w-4 h-4 mr-2" />
              ลบสมาชิกออกจากกลุ่ม
            </Button>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={closeMemberActions}>
              ปิด
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
