import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { RefreshCw, UserPlus, Search, Download } from "lucide-react";
import MemberCard from "./MemberCard";
import { SmartPagination } from "../ui/pagination";
import { exportMembers } from "../../services/exportService";

const ITEMS_PER_PAGE = 20;

const normaliseMember = (member) => {
  const lineUserId = member.lineUserId || member.userId || member.id || "";
  return {
    id: member.id || lineUserId,
    lineUserId,
    displayName:
      member.displayName ||
      member.realName ||
      member.name ||
      lineUserId ||
      "ไม่ระบุชื่อ",
    role: member.role === "admin" ? "admin" : "member",
    avatar: member.pictureUrl || member.avatarUrl || null,
    joinedAt: member.joinedAt || member.createdAt || null,
    completedTasks: member.completedTasks || member.tasksCompleted || 0,
    totalTasks: member.totalTasks || member.tasksAssigned || 0,
  };
};

export default function MembersView({ refreshKey = 0 }) {
  const { groupId, canModify } = useAuth();
  const { openInviteMember, openMemberActions } = useModal();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadMembers = async () => {
      if (!groupId) {
        setMembers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { getGroupMembers, getLineMembers } = await import(
          "../../services/api"
        );

        // Try to sync with LINE first
        try {
          await getLineMembers(groupId);
        } catch (lineSyncError) {
          console.warn("LINE sync failed (non-critical):", lineSyncError);
        }

        // Load members from database
        const response = await getGroupMembers(groupId);
        const rawMembers =
          response?.data || response?.members || response || [];
        setMembers(rawMembers.map(normaliseMember));
      } catch (err) {
        console.error("Failed to load members:", err);
        setError(err.message || "ไม่สามารถโหลดรายชื่อสมาชิกได้");
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [groupId, refreshKey, reloadKey]);

  const summary = useMemo(() => {
    const total = members.length;
    const admins = members.filter((member) => member.role === "admin").length;
    const regular = total - admins;
    return { total, admins, regular };
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const name = member.displayName.toLowerCase();
      const query = (searchTerm || "").toLowerCase();
      const matchesSearch = !query || name.includes(query);
      if (!matchesSearch) return false;
      if (roleFilter !== "all" && member.role !== roleFilter) return false;
      return true;
    });
  }, [members, searchTerm, roleFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / ITEMS_PER_PAGE),
  );

  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredMembers.slice(startIndex, endIndex);
  }, [filteredMembers, currentPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  const handleExportMembers = async () => {
    if (members.length === 0) {
      return;
    }
    try {
      await exportMembers(members, "csv");
    } catch (err) {
      console.error("Failed to export members:", err);
    }
  };

  if (error) {
    return (
      <div className="p-3 md:p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ไม่สามารถโหลดรายชื่อสมาชิกได้
            </h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={() => setReloadKey((prev) => prev + 1)}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              ลองอีกครั้ง
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">สมาชิก</h1>
          <p className="text-muted-foreground">ภาพรวมสมาชิกในกลุ่มของคุณ</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setReloadKey((prev) => prev + 1)}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          <Button
            variant="outline"
            onClick={handleExportMembers}
            disabled={members.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            ส่งออก CSV
          </Button>
          {canModify() && (
            <Button onClick={openInviteMember}>
              <UserPlus className="w-4 h-4 mr-2" />
              เชิญสมาชิก
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">สมาชิกทั้งหมด</p>
          <p className="text-2xl font-semibold">{summary.total}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">ผู้ดูแล</p>
          <p className="text-2xl font-semibold">{summary.admins}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">สมาชิกทั่วไป</p>
          <p className="text-2xl font-semibold">{summary.regular}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-600 block mb-1">
              ค้นหาสมาชิก
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="พิมพ์ชื่อสมาชิก..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-full md:w-48">
            <label className="text-sm font-medium text-gray-600 block mb-1">
              บทบาท
            </label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกบทบาท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="admin">ผู้ดูแล</SelectItem>
                <SelectItem value="member">สมาชิก</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-sm text-gray-500 self-start md:self-auto">
          แสดง {filteredMembers.length} จาก {members.length} คน
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-white border rounded-lg">
          <p className="text-gray-500">ไม่พบสมาชิกตามเงื่อนไขที่เลือก</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedMembers.map((member) => (
            <MemberCard
              key={member.lineUserId || member.id}
              member={member}
              canManage={canModify()}
              onManage={() => openMemberActions(member)}
            />
          ))}
        </div>
      )}

      {filteredMembers.length > ITEMS_PER_PAGE && (
        <SmartPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
