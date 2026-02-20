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
import { Alert, AlertDescription } from "../ui/alert";
import { Shield, UserX, Save, Loader2, AlertTriangle } from "lucide-react";
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

  useEffect(() => {
    if (selectedMember) {
      setRole(selectedMember.role || "member");
    }
  }, [selectedMember]);

  if (!selectedMember) return null;

  const isSelf = userId === selectedMember.lineUserId;
  const hasPermission = canModify();
  const memberIdentifier =
    selectedMember.lineUserId || selectedMember.id || selectedMember.userId;
  const memberStatus = selectedMember.status || "active";

  const handleUpdateRole = async () => {
    if (!hasPermission) {
      showWarning("คุณไม่มีสิทธิ์เปลี่ยนบทบาทสมาชิก");
      return;
    }

    if (isSelf) {
      showWarning("คุณไม่สามารถเปลี่ยนบทบาทของตัวเองได้");
      return;
    }

    const currentRole = selectedMember.role || "member";
    if (role === currentRole) {
      showWarning("บทบาทไม่มีการเปลี่ยนแปลง");
      return;
    }

    setLoading(true);
    try {
      const { updateMemberRole } = await import("../../services/api");
      await updateMemberRole(groupId, memberIdentifier, role);
      showSuccess(
        `เปลี่ยนบทบาทเป็น ${role === "admin" ? "ผู้ดูแล" : "สมาชิก"} สำเร็จ`,
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
          await removeMember(groupId, memberIdentifier);
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

  const handleOpenChange = (open) => {
    if (!open) {
      closeMemberActions();
    }
  };

  return (
    <Dialog open={isMemberActionsOpen} onOpenChange={handleOpenChange}>
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
            <Alert variant="destructive">
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
                    memberStatus === "banned"
                      ? "bg-red-100 text-red-800"
                      : memberStatus === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {memberStatus === "banned"
                    ? "ถูกระงับ"
                    : memberStatus === "active"
                      ? "ใช้งานอยู่"
                      : "ไม่ใช้งาน"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {selectedMember.role === "admin"
                    ? "ผู้ดูแล"
                    : "สมาชิก"}
                </span>
              </div>
            </div>
          </div>

          {/* Change Role */}
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
                <SelectItem value="admin">ผู้ดูแล</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              • <strong>ผู้ดูแล</strong>: จัดการทุกอย่างได้
              <br />• <strong>สมาชิก</strong>: ดูและทำงานที่ได้รับมอบหมาย
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Button
              onClick={handleUpdateRole}
              disabled={
                loading ||
                !hasPermission ||
                isSelf ||
                (selectedMember.role || "member") === role
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
