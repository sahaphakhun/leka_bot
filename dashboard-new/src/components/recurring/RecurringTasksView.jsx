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
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import {
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  History,
  Search,
  Calendar,
  Users,
  AlertCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { showSuccess, showError, showWarning } from "../../lib/toast";

export default function RecurringTasksView({ refreshKey = 0 }) {
  const { groupId, canModify } = useAuth();
  const { openAddTask, openRecurringTask, openRecurringHistory, openConfirmDialog } =
    useModal();
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [recurrenceFilter, setRecurrenceFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, [groupId, refreshKey]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!groupId) {
        setRecurringTasks([]);
        setMembers([]);
        setLoading(false);
        return;
      }

      // Load recurring tasks and members in parallel
      const [tasksData, membersResponse] = await Promise.all([
        (async () => {
          const { listRecurringTasks } = await import("../../services/api");
          return await listRecurringTasks(groupId);
        })(),
        (async () => {
          try {
            const { getGroupMembers } = await import("../../services/api");
            return await getGroupMembers(groupId);
          } catch (memberError) {
            console.warn(
              "⚠️ Failed to load members (non-critical):",
              memberError,
            );
            return { data: [], members: [] }; // Return empty on error
          }
        })(),
      ]);

      // Process recurring tasks
      const items = Array.isArray(tasksData)
        ? tasksData
        : Array.isArray(tasksData?.data)
          ? tasksData.data
          : Array.isArray(tasksData?.items)
            ? tasksData.items
            : [];
      setRecurringTasks(items);

      // Process members
      const membersList = Array.isArray(membersResponse?.data)
        ? membersResponse.data
        : Array.isArray(membersResponse?.members)
          ? membersResponse.members
          : Array.isArray(membersResponse)
            ? membersResponse
            : [];
      setMembers(membersList);

      console.log("✅ Loaded recurring tasks:", items.length);
      console.log("✅ Loaded members:", membersList.length);
    } catch (error) {
      console.error("❌ Failed to load recurring tasks:", error);
      setError(error.message || "ไม่สามารถโหลดงานประจำได้");
      setRecurringTasks([]);
      setMembers([]);
      showError("ไม่สามารถโหลดงานประจำได้", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecurringTasks = async () => {
    // Kept for manual refresh - calls loadData
    await loadData();
  };

  const handleToggleActive = async (task) => {
    if (!canModify()) {
      showWarning("คุณไม่มีสิทธิ์แก้ไขงานประจำ");
      return;
    }

    try {
      const { toggleRecurringTask } = await import("../../services/api");
      await toggleRecurringTask(groupId, task.id, !task.isActive);
      showSuccess(task.isActive ? "ปิดการใช้งานแล้ว" : "เปิดการใช้งานแล้ว");
      loadRecurringTasks();
    } catch (error) {
      console.error("Failed to toggle recurring task:", error);
      showError("ไม่สามารถเปลี่ยนสถานะได้", error);
    }
  };

  const handleEdit = (task) => {
    if (!canModify()) {
      showWarning("คุณไม่มีสิทธิ์แก้ไขงานประจำ");
      return;
    }
    openRecurringTask(task.original || task);
  };

  const handleDelete = (task) => {
    openConfirmDialog({
      title: "ลบงานประจำ",
      description: `คุณแน่ใจหรือไม่ว่าต้องการลบงานประจำ "${task.title}"? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const { deleteRecurringTask } = await import("../../services/api");
          await deleteRecurringTask(groupId, task.id);
          showSuccess("ลบงานประจำสำเร็จ");
          loadRecurringTasks();
        } catch (error) {
          console.error("Failed to delete recurring task:", error);
          showError("ไม่สามารถลบงานประจำได้", error);
        }
      },
    });
  };

  const handleViewHistory = (task) => {
    openRecurringHistory(task.original || task);
  };

  const membersMap = useMemo(() => {
    const map = new Map();
    members.forEach((member) => {
      const ids = [member.lineUserId, member.id, member.userId]
        .filter(Boolean)
        .map((id) => id.toString());
      ids.forEach((id) => {
        map.set(id, member);
        map.set(id.toLowerCase(), member);
      });
    });
    return map;
  }, [members]);

  const normalizedTasks = useMemo(() => {
    const toDisplayUser = (lineId) => {
      if (!lineId) return null;
      const match =
        membersMap.get(lineId) || membersMap.get(lineId.toLowerCase());
      if (!match) {
        return {
          lineUserId: lineId,
          displayName: lineId,
        };
      }
      return match;
    };

    return recurringTasks.map((task) => {
      const assigneeIds = Array.isArray(task.assigneeLineUserIds)
        ? task.assigneeLineUserIds
        : [];

      const seen = new Set();
      const assignedUsers = assigneeIds
        .map((id) => toDisplayUser(id))
        .filter(Boolean)
        .map((member) => ({
          id: member.id || member.userId || member.lineUserId,
          lineUserId: member.lineUserId || member.id || member.userId,
          displayName:
            member.displayName ||
            member.realName ||
            member.name ||
            member.lineUserId,
        }))
        .filter((member) => {
          const key = member.lineUserId || member.id;
          if (!key) return false;
          const norm = key.toLowerCase();
          if (seen.has(norm)) return false;
          seen.add(norm);
          return true;
        });

      return {
        id: task.id,
        title: task.title || task.name || "Untitled",
        description: task.description || "",
        recurrence: (
          task.recurrence ||
          task.frequency ||
          "weekly"
        ).toLowerCase(),
        isActive: Boolean(task.active ?? task.isActive ?? true),
        active: Boolean(task.active ?? task.isActive ?? true),
        nextRunAt:
          task.nextRunAt ||
          task.nextRun ||
          task.nextSchedule ||
          task.nextDueTime ||
          null,
        lastRunAt: task.lastRunAt || task.lastRun || null,
        totalInstances:
          task.totalInstances ?? task.createdCount ?? task.count ?? 0,
        assigneeLineUserIds: assigneeIds,
        assignedUsers,
        reviewerLineUserId: task.reviewerLineUserId || task.reviewer || null,
        requireAttachment: Boolean(
          task.requireAttachment ?? task.requiresAttachment ?? false,
        ),
        priority: (task.priority || "medium").toLowerCase(),
        tags: Array.isArray(task.tags) ? task.tags : [],
        weekDay: task.weekDay ?? task.dayOfWeek ?? null,
        dayOfMonth: task.dayOfMonth ?? task.dateOfMonth ?? null,
        timeOfDay: task.timeOfDay || task.initialTime || "09:00",
        timezone: task.timezone || "Asia/Bangkok",
        createdAt: task.createdAt || null,
        updatedAt: task.updatedAt || null,
        original: task,
      };
    });
  }, [recurringTasks, membersMap]);

  const getRecurrenceLabel = (recurrence) => {
    const labels = {
      daily: "รายวัน",
      weekly: "รายสัปดาห์",
      monthly: "รายเดือน",
      quarterly: "รายไตรมาส",
      custom: "กำหนดเอง",
    };
    return labels[recurrence] || recurrence;
  };

  const filteredTasks = normalizedTasks.filter((task) => {
    const matchesSearch = (task.title || "")
      .toLowerCase()
      .includes((searchTerm || "").toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && task.isActive) ||
      (statusFilter === "inactive" && !task.isActive);
    const matchesRecurrence =
      recurrenceFilter === "all" ||
      (task.recurrence || "").toLowerCase() === recurrenceFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesRecurrence;
  });

  const summary = useMemo(() => {
    const total = normalizedTasks.length;
    const active = normalizedTasks.filter((task) => task.isActive).length;
    const paused = total - active;
    const totalInstances = normalizedTasks.reduce(
      (sum, task) => sum + (task.totalInstances || 0),
      0,
    );
    const nextTask = normalizedTasks
      .map((task) => task.nextRunAt)
      .filter(Boolean)
      .map((date) => new Date(date))
      .sort((a, b) => a - b)[0];

    return {
      total,
      active,
      paused,
      totalInstances,
      nextTask,
    };
  }, [recurringTasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ไม่สามารถโหลดงานประจำได้
            </h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={loadRecurringTasks} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                ลองอีกครั้ง
              </Button>
              <p className="text-xs text-gray-500">
                หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty State (when no error but also no tasks)
  if (!loading && !error && normalizedTasks.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">งานประจำ</h1>
            <p className="text-muted-foreground">จัดการงานที่ทำซ้ำอัตโนมัติ</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadRecurringTasks}>
              <RefreshCw className="w-4 h-4 mr-2" />
              รีเฟรช
            </Button>
            {canModify() ? (
              <Button onClick={() => openAddTask("recurring")}>
                <Plus className="w-4 h-4 mr-2" />
                สร้างงานประจำ
              </Button>
            ) : (
              <Button disabled variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                สร้างงานประจำ (ไม่มีสิทธิ์)
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center h-96 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center max-w-md px-6">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ยังไม่มีงานประจำ
            </h3>
            <p className="text-gray-600 mb-6">
              สร้างงานที่ทำซ้ำอัตโนมัติตามรอบเวลาที่กำหนด เช่น รายวัน รายสัปดาห์
              หรือรายเดือน
            </p>
            {canModify() ? (
              <Button onClick={() => openAddTask("recurring")}>
                <Plus className="w-4 h-4 mr-2" />
                สร้างงานประจำแรก
              </Button>
            ) : (
              <p className="text-sm text-amber-600">
                ⚠️ คุณไม่มีสิทธิ์สร้างงานประจำ
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">งานประจำ</h1>
          <p className="text-muted-foreground">จัดการงานที่ทำซ้ำอัตโนมัติ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRecurringTasks}>
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          <Button onClick={() => openAddTask("recurring")}>
            <Plus className="w-4 h-4 mr-2" />
            สร้างงานประจำ
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs text-blue-700">งานประจำทั้งหมด</p>
          <p className="text-3xl font-semibold text-blue-700">
            {summary.total}
          </p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-5">
          <p className="text-xs text-green-700">ใช้งานอยู่</p>
          <p className="text-3xl font-semibold text-green-700">
            {summary.active}
          </p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs text-amber-700">หยุดชั่วคราว</p>
          <p className="text-3xl font-semibold text-amber-700">
            {summary.paused}
          </p>
        </div>
        <div className="rounded-xl border border-purple-100 bg-purple-50 p-5">
          <p className="text-xs text-purple-700">งานที่สร้างสะสม</p>
          <p className="text-3xl font-semibold text-purple-700">
            {summary.totalInstances}
          </p>
          {summary.nextTask && (
            <p className="text-xs text-purple-600 mt-2">
              งานครั้งถัดไป:{" "}
              {format(summary.nextTask, "dd MMM yyyy HH:mm", { locale: th })}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="ค้นหางานประจำ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะ: ทั้งหมด</SelectItem>
              <SelectItem value="active">ใช้งานอยู่</SelectItem>
              <SelectItem value="inactive">หยุดใช้งาน</SelectItem>
            </SelectContent>
          </Select>

          {/* Recurrence Filter */}
          <Select value={recurrenceFilter} onValueChange={setRecurrenceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกรอบเวลา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">รอบ: ทั้งหมด</SelectItem>
              <SelectItem value="daily">รายวัน</SelectItem>
              <SelectItem value="weekly">รายสัปดาห์</SelectItem>
              <SelectItem value="monthly">รายเดือน</SelectItem>
              <SelectItem value="quarterly">รายไตรมาส</SelectItem>
              <SelectItem value="custom">กำหนดเอง</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        แสดง {filteredTasks.length} จาก {normalizedTasks.length} งานประจำ
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ชื่องาน
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  รอบการทำซ้ำ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  งานถัดไป
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  จำนวนที่สร้าง
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ผู้รับผิดชอบ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  การกระทำ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    ไม่พบงานประจำ
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{task.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">
                        {getRecurrenceLabel(task.recurrence)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={task.isActive}
                          onCheckedChange={() => handleToggleActive(task)}
                          disabled={!canModify()}
                        />
                        <Badge
                          className={
                            task.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {task.isActive ? "ใช้งานอยู่" : "หยุดใช้งาน"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {task.nextRunAt ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-gray-900">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(task.nextRunAt), "dd MMM yyyy", {
                              locale: th,
                            })}
                          </div>
                          <div className="text-gray-500">
                            {format(new Date(task.nextRunAt), "HH:mm")}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{task.totalInstances} งาน</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="truncate">
                          {task.assignedUsers && task.assignedUsers.length > 0
                            ? task.assignedUsers
                                .map(
                                  (user) =>
                                    user.displayName ||
                                    user.name ||
                                    user.lineUserId,
                                )
                                .join(", ")
                            : "ไม่ระบุ"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(task)}
                          title="ดูประวัติ"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(task)}
                          title="แก้ไข"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(task)}
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
