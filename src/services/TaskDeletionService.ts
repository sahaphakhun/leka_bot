// TaskDeletionService - Manage multi-step deletion workflow with approvals

import { In } from 'typeorm';
import { randomUUID } from 'crypto';
import { AppDataSource } from '@/utils/database';
import { Group, GroupMember, Task, User } from '@/models';
import { logger } from '@/utils/logger';
import { serviceContainer } from '@/utils/serviceContainer';
import { TaskService } from './TaskService';
import { LineService } from './LineService';
import { UserService } from './UserService';

type PendingDeletionRequest = NonNullable<Group['settings']['pendingDeletionRequest']>;

interface InitiateDeletionOptions {
  groupId: string;
  requesterLineUserId: string;
  taskIds: string[];
  filter?: 'all' | 'incomplete' | 'custom';
}

interface ApprovalResult {
  status: 'pending' | 'executed' | 'noop' | 'error';
  message: string;
  data?: any;
}

export class TaskDeletionService {
  private groupRepository = AppDataSource.getRepository(Group);
  private taskRepository = AppDataSource.getRepository(Task);
  private userRepository = AppDataSource.getRepository(User);
  private groupMemberRepository = AppDataSource.getRepository(GroupMember);
  private taskService = serviceContainer.get<TaskService>('TaskService');
  private lineService = serviceContainer.get<LineService>('LineService');
  private userService = serviceContainer.get<UserService>('UserService');

  /**
   * ค้นหา Group entity จาก internal UUID หรือ LINE Group ID
   */
  private async resolveGroup(groupIdOrLineId: string): Promise<Group | null> {
    if (!groupIdOrLineId) return null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      groupIdOrLineId,
    );

    const where = isUuid
      ? { id: groupIdOrLineId }
      : { lineGroupId: groupIdOrLineId };

    const group = await this.groupRepository.findOne({
      where,
    });

    return group || null;
  }

  /**
   * ดึงคำขอลบงานที่รอดำเนินการของกลุ่ม
   */
  public async getPendingRequest(
    groupIdOrLineId: string,
  ): Promise<PendingDeletionRequest | null> {
    const group = await this.resolveGroup(groupIdOrLineId);
    if (!group) return null;
    return group.settings?.pendingDeletionRequest ?? null;
  }

  /**
   * สร้างคำขอลบงานใหม่
   */
  public async initiateDeletionRequest(
    options: InitiateDeletionOptions,
  ): Promise<PendingDeletionRequest> {
    const { groupId, requesterLineUserId, taskIds, filter = 'custom' } =
      options;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new Error('กรุณาเลือกงานอย่างน้อย 1 งาน');
    }

    const group = await this.resolveGroup(groupId);
    if (!group) {
      throw new Error('ไม่พบข้อมูลกลุ่ม');
    }

    const lineGroupId = group.lineGroupId || group.id;

    // ตรวจสอบว่ามีคำขอลบงานที่ยังไม่เสร็จสิ้นหรือไม่
    const existingRequest = group.settings?.pendingDeletionRequest;
    if (existingRequest) {
      throw new Error('ขณะนี้มีกระบวนการลบงานที่รอการยืนยันอยู่แล้ว');
    }

    // ตรวจสอบสิทธิ์ (จำกัดเฉพาะ admin)
    const isAdmin = await this.userService.isGroupAdmin(
      requesterLineUserId,
      lineGroupId,
    );
    if (!isAdmin) {
      throw new Error('เฉพาะแอดมินกลุ่มเท่านั้นที่สามารถเริ่มลบงานได้');
    }

    const requester = await this.userRepository.findOne({
      where: { lineUserId: requesterLineUserId },
    });
    if (!requester) {
      throw new Error('ไม่พบข้อมูลผู้ใช้สำหรับคำขอ');
    }

    // ตรวจสอบรายการงาน
    const tasks = await this.taskRepository.find({
      where: { id: In(taskIds) },
      relations: ['assignedUsers'],
    });

    if (tasks.length !== taskIds.length) {
      const foundIds = new Set(tasks.map((task) => task.id));
      const missing = taskIds.filter((id) => !foundIds.has(id));
      throw new Error(
        `ไม่พบงานบางรายการหรือคุณไม่มีสิทธิ์ลบงานเหล่านี้: ${missing.join(
          ', ',
        )}`,
      );
    }

    // ตรวจสอบว่าทุกงานอยู่ในกลุ่มเดียวกัน
    const invalidTask = tasks.find(
      (task) =>
        task.groupId !== group.id && task.group?.id && task.group.id !== group.id,
    );
    if (invalidTask) {
      throw new Error(
        `งาน "${invalidTask.title}" ไม่ได้อยู่ในกลุ่มนี้ ไม่สามารถลบได้`,
      );
    }

    // นับจำนวนสมาชิกในกลุ่ม
    const totalMembers = await this.groupMemberRepository.count({
      where: { groupId: group.id },
    });
    const requiredApprovals = Math.max(
      1,
      Math.ceil(Math.max(totalMembers, 1) / 3),
    );

    const taskSummaries = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      assignees: Array.isArray(task.assignedUsers)
        ? task.assignedUsers.map(
            (member) => member.displayName || member.lineUserId,
          )
        : [],
    }));

    const requestData: PendingDeletionRequest = {
      id: randomUUID(),
      filter,
      requestedBy: {
        userId: requester.id,
        lineUserId: requester.lineUserId,
        displayName: requester.displayName,
      },
      createdAt: new Date().toISOString(),
      tasks: taskSummaries,
      totalMembers,
      requiredApprovals,
      approvals: [],
    };

    group.settings = {
      ...(group.settings || {}),
      pendingDeletionRequest: requestData,
    };

    await this.groupRepository.save(group);

    // ส่งข้อความแจ้งในกลุ่ม
    this.notifyNewDeletionRequest(lineGroupId, requestData).catch((error) => {
      logger.error('❌ Failed to push deletion request notification:', error);
    });

    return requestData;
  }

  /**
   * บันทึกการยืนยันของสมาชิก
   */
  public async registerApproval(
    groupIdOrLineId: string,
    approverLineUserId: string,
  ): Promise<ApprovalResult> {
    const group = await this.resolveGroup(groupIdOrLineId);
    if (!group) {
      return {
        status: 'error',
        message: 'ไม่พบข้อมูลกลุ่ม',
      };
    }

    const request = group.settings?.pendingDeletionRequest;
    if (!request) {
      return {
        status: 'noop',
        message: 'ตอนนี้ไม่มีคำขอลบงานที่รอการยืนยัน',
      };
    }

    const approver = await this.userRepository.findOne({
      where: { lineUserId: approverLineUserId },
    });
    if (!approver) {
      return {
        status: 'error',
        message: 'ไม่พบข้อมูลผู้ใช้ กรุณาพิมพ์ "ยอมรับ" อีกครั้งหลังจากบอทบันทึกข้อมูลสมาชิกเรียบร้อย',
      };
    }

    // ตรวจสอบว่าผู้ใช้อยู่ในกลุ่มและมีสถานะสมาชิก
    const membership = await this.groupMemberRepository.findOne({
      where: { userId: approver.id, groupId: group.id },
    });
    if (!membership) {
      return {
        status: 'error',
        message: 'เฉพาะสมาชิกในกลุ่มเท่านั้นที่สามารถยืนยันการลบงานได้',
      };
    }

    const alreadyApproved =
      request.approvals?.some(
        (approval) => approval.lineUserId === approver.lineUserId,
      ) ?? false;
    if (alreadyApproved) {
      return {
        status: 'noop',
        message: 'คุณยืนยันไปแล้ว ขอบคุณค่ะ',
      };
    }

    const approvals = [...(request.approvals || [])];
    approvals.push({
      userId: approver.id,
      lineUserId: approver.lineUserId,
      displayName: approver.displayName,
      approvedAt: new Date().toISOString(),
    });

    request.approvals = approvals;

    group.settings = {
      ...(group.settings || {}),
      pendingDeletionRequest: request,
    };

    await this.groupRepository.save(group);

    const approvedCount = approvals.length;
    const required = request.requiredApprovals;

    if (approvedCount >= required) {
      const deletionResult = await this.executeDeletion(group, request);
      return deletionResult;
    }

    const remaining = Math.max(required - approvedCount, 0);
    const approverName = approver.displayName || approver.lineUserId;
    const summary = `✅ ${approverName} ยืนยันแล้ว (${approvedCount}/${required})\nยังต้องการอีก ${remaining} คนเพื่อดำเนินการลบงาน`;

    return {
      status: 'pending',
      message: summary,
      data: {
        approvals: approvals.length,
        required,
      },
    };
  }

  /**
   * ดำเนินการลบงานเมื่อได้รับการยืนยันครบตามกำหนด
   */
  private async executeDeletion(
    group: Group,
    request: PendingDeletionRequest,
  ): Promise<ApprovalResult> {
    const lineGroupId = group.lineGroupId || group.id;
    const tasks = request.tasks || [];

    const deletedTasks: string[] = [];
    const failedTasks: Array<{ id: string; error: string }> = [];

    for (const task of tasks) {
      try {
        await this.taskService.deleteTask(task.id);
        deletedTasks.push(task.title || task.id);
      } catch (error: any) {
        logger.error('❌ Failed deleting task during approval', {
          taskId: task.id,
          error,
        });
        failedTasks.push({
          id: task.id,
          error: error?.message || 'Unknown error',
        });
      }
    }

    // เคลียร์คำขอที่รอดำเนินการ
    group.settings = {
      ...(group.settings || {}),
      pendingDeletionRequest: undefined,
    };
    await this.groupRepository.save(group);

    const summaryLines = deletedTasks
      .slice(0, 10)
      .map((title) => `• ${title}`);
    const truncated = deletedTasks.length > 10;
    if (truncated) {
      summaryLines.push(`…และอีก ${deletedTasks.length - 10} งาน`);
    }

    const approvalSummary = `${request.approvals.length}/${request.requiredApprovals}`;

    const finalMessage = [
      '🗑️ ลบงานสำเร็จ',
      summaryLines.join('\n'),
      '',
      `ยืนยันโดยสมาชิก ${approvalSummary} คน ขอบคุณค่ะ!`,
    ]
      .filter(Boolean)
      .join('\n');

    this.lineService
      .pushMessage(lineGroupId, finalMessage)
      .catch((error) => {
        logger.error('❌ Failed to push deletion completion message:', error);
      });

    let message = `ลบงานทั้งหมด ${deletedTasks.length} รายการเรียบร้อยแล้ว ขอบคุณทุกคนค่ะ`;
    if (failedTasks.length > 0) {
      message += `\n⚠️ มีงานบางรายการลบไม่สำเร็จ: ${failedTasks
        .map((item) => item.id)
        .join(', ')}`;
    }

    return {
      status: 'executed',
      message,
      data: {
        deleted: deletedTasks.length,
        failed: failedTasks,
      },
    };
  }

  /**
   * แจ้งเตือนในกลุ่มเมื่อมีคำขอลบงานใหม่
   */
  private async notifyNewDeletionRequest(
    lineGroupId: string,
    request: PendingDeletionRequest,
  ): Promise<void> {
    const requester =
      request.requestedBy.displayName || request.requestedBy.lineUserId;
    const taskLines = request.tasks.slice(0, 10).map((task, index) => {
      const assignees =
        Array.isArray(task.assignees) && task.assignees.length > 0
          ? ` (${task.assignees.join(', ')})`
          : '';
      return `${index + 1}. ${task.title}${assignees}`;
    });

    if (request.tasks.length > 10) {
      taskLines.push(`…และอีก ${request.tasks.length - 10} งาน`);
    }

    const summary = [
      '🗑️ มีคำขอลบงานในกลุ่ม',
      `ผู้ขอ: ${requester}`,
      '',
      `งานที่จะลบทั้งหมด ${request.tasks.length} รายการ:`,
      taskLines.join('\n'),
      '',
      `ต้องการการยืนยันอย่างน้อย ${request.requiredApprovals} คน (จากสมาชิกทั้งหมด ${request.totalMembers} คน)`,
      'พิมพ์ "ยอมรับ" ในกลุ่มนี้เพื่อยืนยันการลบงาน',
    ].join('\n');

    await this.lineService.pushMessage(lineGroupId, summary);
  }
}
