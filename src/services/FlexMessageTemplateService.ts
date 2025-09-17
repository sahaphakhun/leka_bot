// Flex Message Template Service - บริการสร้างการ์ดมาตรฐาน
// ใช้ Design System เพื่อสร้างการ์ดที่สม่ำเสมอ

import { FlexMessageDesignSystem, TaskCardData } from './FlexMessageDesignSystem';
import { FlexMessage } from '@line/bot-sdk';
import moment from 'moment';
import { config } from '@/utils/config';
import { serviceContainer } from '@/utils/serviceContainer';
import { FileService } from './FileService';

export class FlexMessageTemplateService {
  /**
   * สร้างการ์ดงานใหม่ (เวอร์ชันเรียบง่าย)
   */
  static createNewTaskCard(task: any, group: any, creator: any, dueDate: string): FlexMessage {
    const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ') || 'ไม่ระบุ';
    const priorityColor = FlexMessageDesignSystem.getPriorityColor(task.priority);
    const priorityText = FlexMessageDesignSystem.getPriorityText(task.priority);

    // สร้างเนื้อหาที่เรียบง่ายเพื่อลดขนาด
    const content = [
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueDate}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`👤 ผู้สร้าง: ${creator?.displayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      ...(priorityText ? [FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
      
      // แสดงคำอธิบายงาน (จำกัดความยาวให้สั้น)
      ...(task.description ? [
        FlexMessageDesignSystem.createText(`📝 ${task.description.length > 50 ? task.description.substring(0, 50) + '...' : task.description}`, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true)
      ] : [])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดูรายละเอียด',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${(task.assignedUsers && task.assignedUsers[0]?.lineUserId) ? `&userId=${task.assignedUsers[0].lineUserId}` : ''}`,
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      FlexMessageDesignSystem.emojis.newTask,
      FlexMessageDesignSystem.colors.primary,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดงานเกินกำหนด
   */
  static createOverdueTaskCard(task: any, group: any, overdueHours: number): FlexMessage {
    const overdueText = overdueHours < 24 
      ? `เกินกำหนด ${overdueHours} ชั่วโมง`
      : `เกินกำหนด ${Math.floor(overdueHours / 24)} วัน ${overdueHours % 24} ชั่วโมง`;

    const content = [
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`⏰ เวลาที่เกิน: ${overdueText}`, 'sm', FlexMessageDesignSystem.colors.danger, 'bold'),
      FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${(task.assignedUsers || []).map((u: any) => u.displayName).join(', ') || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`🎯 ${FlexMessageDesignSystem.getPriorityText(task.priority)}`, 'sm', FlexMessageDesignSystem.getPriorityColor(task.priority), 'bold'),
      ...(task.description ? [FlexMessageDesignSystem.createText(`📝 ${task.description}`, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดูงาน',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${(task.assignedUsers && task.assignedUsers[0]?.lineUserId) ? `&userId=${task.assignedUsers[0].lineUserId}` : ''}`,
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      FlexMessageDesignSystem.emojis.overdue,
      FlexMessageDesignSystem.colors.danger,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดงานสำเร็จ
   */
  static createCompletedTaskCard(task: any, group: any, completedBy: any): FlexMessage {
    const completionSummary = this.getCompletionSummary(task);

    // ตรวจสอบไฟล์แนบ
    const attachedFiles = task.attachedFiles || [];
    const fileCount = attachedFiles.length;

    const content = [
      FlexMessageDesignSystem.createText(`👤 ปิดงานโดย: ${completedBy.displayName}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`🎯 เสร็จเมื่อ: ${moment(task.completedAt).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      
      // แสดงข้อมูลไฟล์แนบถ้ามี
      ...(fileCount > 0 ? [
        FlexMessageDesignSystem.createText(`📎 ไฟล์แนบ: ${fileCount} ไฟล์`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold')
      ] : []),
      FlexMessageDesignSystem.createText(`${completionSummary.emoji} ${completionSummary.text}`, 'sm', FlexMessageDesignSystem.colors.textSecondary, 'bold'),
      FlexMessageDesignSystem.createText(`🎯 ผู้รับงานได้ +${completionSummary.points} คะแนน`, 'sm', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดูรายละเอียด',
        'uri',
        `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${(task.assignedUsers && task.assignedUsers[0]?.lineUserId) ? `&userId=${task.assignedUsers[0].lineUserId}` : ''}`,
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      FlexMessageDesignSystem.emojis.completed,
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดงานที่อัปเดต
   */
  static createUpdatedTaskCard(task: any, group: any, changes: Record<string, any>, changedFields: string[], viewerLineUserId?: string): FlexMessage {
    const dueText = task.dueTime ? moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm') : '-';
    const tagsText = (task.tags && task.tags.length > 0) ? `🏷️ ${task.tags.map((t: string) => `#${t}`).join(' ')}` : '';
    const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ');
    const headerEmoji = changes.status ? (changes.status === 'cancelled' ? '🚫' : '🔄') : '✏️';
    const headerColor = changes.status === 'cancelled' ? FlexMessageDesignSystem.colors.neutral : FlexMessageDesignSystem.colors.primary;
    const priorityColor = FlexMessageDesignSystem.getPriorityColor(task.priority);
    const priorityText = FlexMessageDesignSystem.getPriorityText(task.priority);

    // ตรวจสอบไฟล์แนบ
    const attachedFiles = task.attachedFiles || [];
    const fileCount = attachedFiles.length;

    const content = [
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueText}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      ...(priorityText ? [FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
      
      // แสดงข้อมูลไฟล์แนบถ้ามี
      ...(fileCount > 0 ? [
        FlexMessageDesignSystem.createText(`📎 ไฟล์แนบ: ${fileCount} ไฟล์`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold')
      ] : []),
      
      ...(tagsText ? [FlexMessageDesignSystem.createText(tagsText, 'sm', FlexMessageDesignSystem.colors.textSecondary)] : []),
      ...(changedFields.length > 0 ? [FlexMessageDesignSystem.createText(`🔧 เปลี่ยนแปลง: ${changedFields.join(', ')}`, 'sm', FlexMessageDesignSystem.colors.warning, 'bold')] : [])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      headerEmoji,
      headerColor,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดงานที่ถูกลบ
   */
  static createDeletedTaskCard(task: any, group: any, viewerLineUserId?: string): FlexMessage {
    const dueText = task.dueTime ? moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm') : '-';
    const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ');
    const priorityColor = FlexMessageDesignSystem.getPriorityColor(task.priority);
    const priorityText = FlexMessageDesignSystem.getPriorityText(task.priority);

    const content = [
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueText}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      ...(priorityText ? [FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
      FlexMessageDesignSystem.createText('⚠️ งานนี้ถูกลบออกจากระบบแล้ว', 'sm', FlexMessageDesignSystem.colors.danger, 'bold')
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      FlexMessageDesignSystem.emojis.deleted,
      FlexMessageDesignSystem.colors.neutral,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดงานที่ถูกส่ง
   */
  static createSubmittedTaskCard(task: any, group: any, submitterDisplayName: string, fileCount: number, links: string[], viewerLineUserId?: string): FlexMessage {
    const dueText = task.dueTime ? moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm') : '-';
    const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ');
    const priorityColor = FlexMessageDesignSystem.getPriorityColor(task.priority);
    const priorityText = FlexMessageDesignSystem.getPriorityText(task.priority);

    const content = [
      FlexMessageDesignSystem.createText(`👤 ผู้ส่ง: ${submitterDisplayName}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`📎 ไฟล์/รายการ: ${fileCount}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueText}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      ...(priorityText ? [FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
      ...(links && links.length > 0 ? [FlexMessageDesignSystem.createText(`🔗 ลิงก์: ${links.join(' ')}`, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูงาน', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      FlexMessageDesignSystem.emojis.submitted,
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดขอตรวจงาน
   */
  static createReviewRequestCard(task: any, group: any, details: any, dueText: string, viewerLineUserId?: string): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('📝 มีงานรอการตรวจ', 'md', FlexMessageDesignSystem.colors.warning, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`👤 ผู้ส่ง: ${details.submitterDisplayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      ...(details.comment ? [
        FlexMessageDesignSystem.createText(
          `📝 ข้อความ: ${details.comment.length > 200 ? details.comment.substring(0, 200) + '...' : details.comment}`,
          'sm',
          FlexMessageDesignSystem.colors.textSecondary,
          undefined,
          true
        )
      ] : []),
      ...(details.fileCount > 0 ? [
        FlexMessageDesignSystem.createText(`📎 ไฟล์แนบ: ${details.fileCount} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary)
      ] : []),
      ...(details.links && details.links.length > 0 ? [
        FlexMessageDesignSystem.createText(`🔗 ลิงก์: ${details.links.length} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary)
      ] : []),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`📅 กำหนดตรวจภายใน: ${dueText}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 ✅ อนุมัติการตรวจ | ❌ ตีกลับงาน | 📋 ดูรายละเอียด', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('✅', 'postback', `action=approve_review&taskId=${task.id}`, 'primary'),
      FlexMessageDesignSystem.createButton('❌', 'postback', `action=reject_task&taskId=${task.id}`, 'secondary'),
      FlexMessageDesignSystem.createButton('📋', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📝 งานรอการตรวจ',
      '📝',
      FlexMessageDesignSystem.colors.warning,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดขออนุมัติการปิดงาน (มาตรฐานใหม่)
   */
  static createApprovalRequestCard(task: any, group: any, reviewer: any, viewerLineUserId?: string): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('🔍 งานผ่านการตรวจแล้ว', 'md', FlexMessageDesignSystem.colors.success, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`👤 ผู้ตรวจ: ${reviewer.displayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`✅ ตรวจเมื่อ: ${moment().tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('📝 ขั้นตอนต่อไป: กรุณาอนุมัติการปิดงานเพื่อให้งานเสร็จสิ้น', 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText('💡 หมายเหตุ: งานผ่านการตรวจแล้ว แต่ยังต้องรอการอนุมัติการปิดงานจากผู้สั่งงาน', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 ✅ อนุมัติการปิดงาน | 📋 ดูรายละเอียด', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('✅', 'postback', `action=approve_completion&taskId=${task.id}`, 'primary'),
      FlexMessageDesignSystem.createButton('📋', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '🔍 งานผ่านการตรวจแล้ว',
      '🔍',
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดงานที่ถูกตีกลับ (มาตรฐานใหม่)
   */
  static createRejectedTaskCard(task: any, group: any, newDueTime: Date, reviewerDisplayName?: string, viewerLineUserId?: string): FlexMessage {
    const newDueText = moment(newDueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
    
    const content = [
      FlexMessageDesignSystem.createText('❌ งานถูกตีกลับ', 'md', FlexMessageDesignSystem.colors.danger, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`👤 ผู้ตรวจ: ${reviewerDisplayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`📅 กำหนดส่งใหม่: ${newDueText}`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('กรุณาตรวจสอบข้อผิดพลาดและส่งงานใหม่ตามกำหนด', 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 📋 ดูรายละเอียด | 📤 ส่งงานใหม่', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('📋', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary'),
      FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config.baseUrl}/dashboard/submit-tasks?taskId=${task.id}${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '❌ งานถูกตีกลับ',
      '❌',
      FlexMessageDesignSystem.colors.danger,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดการอนุมัติเลื่อนเวลา (มาตรฐานใหม่)
   */
  static createExtensionApprovedCard(task: any, group: any, newDueTime: Date, requesterDisplayName?: string, viewerLineUserId?: string): FlexMessage {
    const newDueText = moment(newDueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
    
    const content = [
      FlexMessageDesignSystem.createText('✅ อนุมัติการเลื่อนเวลา', 'md', FlexMessageDesignSystem.colors.success, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`👤 ผู้ขอเลื่อน: ${requesterDisplayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`📅 กำหนดส่งใหม่: ${newDueText}`, 'sm', FlexMessageDesignSystem.colors.success, 'bold'),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('คำขอเลื่อนเวลาได้รับการอนุมัติแล้ว กรุณาส่งงานตามกำหนดใหม่', 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 📋 ดูรายละเอียด | 📤 ส่งงาน', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('📋', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary'),
      FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config.baseUrl}/dashboard/submit-tasks?taskId=${task.id}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '✅ อนุมัติการเลื่อนเวลา',
      '✅',
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดการปฏิเสธเลื่อนเวลา (มาตรฐานใหม่)
   */
  static createExtensionRejectedCard(task: any, group: any, requesterDisplayName?: string, viewerLineUserId?: string): FlexMessage {
    const dueText = moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
    
    const content = [
      FlexMessageDesignSystem.createText('❌ ปฏิเสธการเลื่อนเวลา', 'md', FlexMessageDesignSystem.colors.danger, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`👤 ผู้ขอเลื่อน: ${requesterDisplayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`📅 กำหนดส่งเดิม: ${dueText}`, 'sm', FlexMessageDesignSystem.colors.danger, 'bold'),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('คำขอเลื่อนเวลาถูกปฏิเสธ กรุณาส่งงานตามกำหนดเวลาเดิม', 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 📋 ดูรายละเอียด | 📤 ส่งงาน', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('📋', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary'),
      FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config.baseUrl}/dashboard/submit-tasks?taskId=${task.id}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '❌ ปฏิเสธการเลื่อนเวลา',
      '❌',
      FlexMessageDesignSystem.colors.danger,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดรายงานรายวัน
   */
  static createDailySummaryCard(group: any, tasks: any[], timezone: string, viewerLineUserId?: string): FlexMessage {
    const now = moment().tz(timezone);
    const today = now.clone().startOf('day');
    const tomorrow = now.clone().add(1, 'day').startOf('day');
    
    // งานที่กำลังดำเนินการ = ทุกงานที่ยังไม่เสร็จและยังไม่ถูกยกเลิก
    // กรองงานที่ส่งแล้วออก (มี workflow.submissions)
    const inProgressTasks = tasks.filter(t => {
      // ตรวจสอบสถานะพื้นฐาน
      const hasValidStatus = t.status === 'in_progress' || 
                            t.status === 'pending' || 
                            t.status === 'submitted' ||
                            t.status === 'overdue';
      
      if (!hasValidStatus) return false;
      
      // ตรวจสอบว่ามีการส่งงานแล้วหรือไม่
      const workflow = t.workflow as any;
      if (!workflow || !workflow.submissions) return true;
      
      // ถ้ามี submissions แสดงว่าส่งแล้ว ให้กรองออก
      return !Array.isArray(workflow.submissions) || workflow.submissions.length === 0;
    });
    
    // งานที่เสร็จแล้ววันนี้ = งานที่มี status เป็น completed และ completedAt อยู่ในวันนี้
    const completedTodayTasks = tasks.filter(t => {
      if (t.status !== 'completed' || !t.completedAt) return false;
      const completedAt = moment(t.completedAt).tz(timezone);
      return completedAt.isBetween(today, tomorrow, null, '[)');
    });
    
    // งานที่เสร็จแล้วทั้งหมด (รวมวันก่อนหน้า)
    const allCompletedTasks = tasks.filter(t => t.status === 'completed');
    
    const date = moment().tz(timezone).format('DD/MM/YYYY');

    // สร้างรายการงานย่อสำหรับงานที่กำลังดำเนินการ
    const createInProgressTaskList = (taskList: any[], maxItems: number = 6) => {
      if (taskList.length === 0) return [];
      
      const displayTasks = taskList.slice(0, maxItems);
      const remainingCount = taskList.length - maxItems;
      
      const taskItems: any[] = [];
      
      // เพิ่มงานที่แสดง
      for (const task of displayTasks) {
        const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ') || 'ไม่ระบุ';
        const dueDate = moment(task.dueTime).tz(timezone).format('DD/MM HH:mm');
        const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
        
        taskItems.push(
          FlexMessageDesignSystem.createBox('vertical', [
            FlexMessageDesignSystem.createText(`• ${priorityEmoji} ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold', true),
            FlexMessageDesignSystem.createText(`  👥 ${assigneeNames} | 📅 ${dueDate}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
          ], 'small', 'small', '#F8F9FA', 'xs')
        );
      }
      
      // เพิ่มข้อความแสดงงานที่เหลือ
      if (remainingCount > 0) {
        taskItems.push(
          FlexMessageDesignSystem.createText(`... และอีก ${remainingCount} งาน`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        );
      }
      
      return taskItems;
    };

    // สร้าง content array ที่ถูกต้อง
    const contentItems: any[] = [
      // Header
      FlexMessageDesignSystem.createText(`📅 สรุปรายวัน - งานทั้งหมด`, 'lg', FlexMessageDesignSystem.colors.textPrimary, 'bold', undefined, 'large'),
      FlexMessageDesignSystem.createText(`📋 กลุ่ม: ${group.name}`, 'md', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText(`🗓️ วันที่ ${date}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('medium'),
      
      // สถิติ
      FlexMessageDesignSystem.createText('📊 สถิติ', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createBox('horizontal', [
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('📊 รวม', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(tasks.length.toString(), 'lg', FlexMessageDesignSystem.colors.textPrimary, 'bold')
        ]), flex: 1 },
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('⏳ กำลังดำเนินการ', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(inProgressTasks.length.toString(), 'md', FlexMessageDesignSystem.colors.warning, 'bold')
        ]), flex: 1 },
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('✅ เสร็จวันนี้', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(completedTodayTasks.length.toString(), 'md', FlexMessageDesignSystem.colors.success, 'bold')
        ]), flex: 1 }
      ], 'medium'),
      
      // เพิ่มแถวสองสำหรับสถิติเพิ่มเติม
      FlexMessageDesignSystem.createBox('horizontal', [
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('🏁 เสร็จทั้งหมด', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(allCompletedTasks.length.toString(), 'sm', FlexMessageDesignSystem.colors.success)
        ]), flex: 1 },
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('⚠️ เกินกำหนด', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(tasks.filter(t => t.status === 'overdue').length.toString(), 'sm', FlexMessageDesignSystem.colors.danger)
        ]), flex: 1 },
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('📝 รอตรวจ', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(tasks.filter(t => t.status === 'in_progress').length.toString(), 'sm', FlexMessageDesignSystem.colors.info)
        ]), flex: 1 }
      ], 'medium'),
      
      FlexMessageDesignSystem.createSeparator('medium')
    ];

    // เพิ่มงานที่กำลังดำเนินการ
    if (inProgressTasks.length > 0) {
      contentItems.push(
        FlexMessageDesignSystem.createText('⏳ งานที่กำลังดำเนินการ', 'md', FlexMessageDesignSystem.colors.warning, 'bold'),
        ...createInProgressTaskList(inProgressTasks, 6)
      );
    } else {
      contentItems.push(
        FlexMessageDesignSystem.createText('🎉 ไม่มีงานที่กำลังดำเนินการ', 'md', FlexMessageDesignSystem.colors.success, 'bold')
      );
    }
    
    // เพิ่ม Footer
    contentItems.push(
      FlexMessageDesignSystem.createSeparator('medium'),
      FlexMessageDesignSystem.createText(`�� งานที่กำลังดำเนินการ ${inProgressTasks.length} งาน`, 'sm', FlexMessageDesignSystem.colors.textSecondary, 'bold'),
      FlexMessageDesignSystem.createText('💡 คลิกปุ่มด้านล่างเพื่อดูรายละเอียดเพิ่มเติม', 'sm', FlexMessageDesignSystem.colors.textSecondary)
    );

      const buttons = [
        FlexMessageDesignSystem.createButton('📊 ดู Dashboard', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}`, 'primary'),
        FlexMessageDesignSystem.createButton('📋 ดูงานทั้งหมด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}#tasks`, 'secondary')
      ];

      return FlexMessageDesignSystem.createStandardTaskCard(
        '📅 สรุปรายวัน - งานทั้งหมด',
        '📅',
        FlexMessageDesignSystem.colors.info,
        contentItems,
        buttons,
        'extraLarge'
      );
    }

  /**
   * สร้างการ์ดรายงานส่วนบุคคล
   */
  static createPersonalReportCard(assignee: any, tasks: any[], timezone: string, group?: any): FlexMessage {
    // กรองงานที่ส่งแล้วออก (มี workflow.submissions)
    const filterSubmittedTasks = (taskList: any[]) => {
      return taskList.filter(t => {
        const workflow = t.workflow as any;
        if (!workflow || !workflow.submissions) return true;
        return !Array.isArray(workflow.submissions) || workflow.submissions.length === 0;
      });
    };
    
    const overdueTasks = filterSubmittedTasks(tasks.filter(t => t.status === 'overdue'));
    const inProgressTasks = filterSubmittedTasks(tasks.filter(t => t.status === 'in_progress'));
    const pendingTasks = filterSubmittedTasks(tasks.filter(t => t.status === 'pending'));
    const date = moment().tz(timezone).format('DD/MM/YYYY');
    
    // สร้างรายการงานย่อ
    const createPersonalTaskList = (taskList: any[], maxItems: number = 5) => {
      if (taskList.length === 0) return [];
      
      const displayTasks = taskList.slice(0, maxItems);
      const remainingCount = taskList.length - maxItems;
      
      const taskItems: any[] = [];
      
      // เพิ่มงานที่แสดง
      for (const task of displayTasks) {
        const dueDate = moment(task.dueTime).tz(timezone).format('DD/MM HH:mm');
        const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
        
        taskItems.push(
          FlexMessageDesignSystem.createBox('vertical', [
            FlexMessageDesignSystem.createText(`• ${priorityEmoji} ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold', true),
            FlexMessageDesignSystem.createText(`  📅 ${dueDate} | 🎯 ${FlexMessageDesignSystem.getPriorityText(task.priority)}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
          ], 'small', 'small', '#F8F9FA', 'xs')
        );
      }
      
      // เพิ่มข้อความแสดงงานที่เหลือ
      if (remainingCount > 0) {
        taskItems.push(
          FlexMessageDesignSystem.createText(`... และอีก ${remainingCount} งาน`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        );
      }
      
      return taskItems;
    };

    // สร้าง content array ที่ถูกต้อง
    const contentItems: any[] = [
      // Header
      FlexMessageDesignSystem.createText(`👤 การ์ดงานส่วนบุคคล`, 'lg', FlexMessageDesignSystem.colors.textPrimary, 'bold', undefined, 'large'),
      FlexMessageDesignSystem.createText(`👨‍💼 ${assignee.displayName}`, 'md', FlexMessageDesignSystem.colors.textSecondary),
      ...(group && group.name ? [
        FlexMessageDesignSystem.createText(`👥 กลุ่ม: ${group.name}`, 'md', FlexMessageDesignSystem.colors.textSecondary)
      ] : []),
      FlexMessageDesignSystem.createText(`🗓️ วันที่ ${date}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('medium'),
      
      // สถิติส่วนบุคคล
      FlexMessageDesignSystem.createBox('horizontal', [
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('📊 รวม', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(tasks.length.toString(), 'lg', FlexMessageDesignSystem.colors.textPrimary, 'bold')
        ]), flex: 1 },
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('🚨 เกินกำหนด', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(overdueTasks.length.toString(), 'md', FlexMessageDesignSystem.colors.danger, 'bold')
        ]), flex: 1 },
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('⏳ กำลังทำ', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(inProgressTasks.length.toString(), 'md', FlexMessageDesignSystem.colors.warning, 'bold')
        ]), flex: 1 },
        { ...FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('📝 รอดำเนินการ', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(pendingTasks.length.toString(), 'md', FlexMessageDesignSystem.colors.primary, 'bold')
        ]), flex: 1 }
      ], 'medium')
    ];

    // เพิ่มงานเกินกำหนด (แสดงเต็ม)
    if (overdueTasks.length > 0) {
      contentItems.push(
        FlexMessageDesignSystem.createSeparator('small'),
        FlexMessageDesignSystem.createText('🚨 งานเกินกำหนด (ต้องทำด่วน!)', 'md', FlexMessageDesignSystem.colors.danger, 'bold')
      );
      const overdueTaskItems = createPersonalTaskList(overdueTasks, 5);
      for (const item of overdueTaskItems) {
        contentItems.push(item);
      }
    }
    
    // เพิ่มงานกำลังดำเนินการ
    if (inProgressTasks.length > 0) {
      contentItems.push(
        FlexMessageDesignSystem.createSeparator('small'),
        FlexMessageDesignSystem.createText('⏳ งานกำลังดำเนินการ', 'md', FlexMessageDesignSystem.colors.warning, 'bold')
      );
      const inProgressTaskItems = createPersonalTaskList(inProgressTasks, 4);
      for (const item of inProgressTaskItems) {
        contentItems.push(item);
      }
    }
    
    // เพิ่มงานรอดำเนินการ
    if (pendingTasks.length > 0) {
      contentItems.push(
        FlexMessageDesignSystem.createSeparator('small'),
        FlexMessageDesignSystem.createText('📝 งานรอดำเนินการ', 'md', FlexMessageDesignSystem.colors.primary, 'bold')
      );
      const pendingTaskItems = createPersonalTaskList(pendingTasks, 4);
      for (const item of pendingTaskItems) {
        contentItems.push(item);
      }
    }
    
    // เพิ่มคำแนะนำ
    contentItems.push(
      FlexMessageDesignSystem.createSeparator('medium'),
      FlexMessageDesignSystem.createText('💡 เริ่มจากงานที่เกินกำหนดก่อน แล้วค่อยทำงานอื่นๆ', 'sm', FlexMessageDesignSystem.colors.textSecondary)
    );

    const buttons = [
      FlexMessageDesignSystem.createButton('📊 ดู Dashboard', 'uri', `${config.baseUrl}/dashboard?groupId=${group?.id || assignee.groupId}${assignee.lineUserId ? `&userId=${assignee.lineUserId}` : ''}`, 'primary'),
      FlexMessageDesignSystem.createButton('📋 ดูงานทั้งหมดของฉัน', 'uri', `${config.baseUrl}/dashboard/submit-tasks?userId=${assignee.lineUserId}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      `📋 การ์ดงานส่วนบุคคล - ${assignee.displayName}`,
      '👤',
      FlexMessageDesignSystem.colors.success,
      contentItems,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดแสดงไฟล์แนบในแชท
   */
  static createFileAttachmentCard(task: any, group: any, assignee: any): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('📎 การแนบไฟล์สำหรับงาน', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 ส่งไฟล์หลายไฟล์ได้เลย ระบบจะแสดงรายการไฟล์ทั้งหมด', 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true),
      FlexMessageDesignSystem.createText('📤 เมื่อส่งไฟล์แล้ว กดปุ่ม "ดูรายการไฟล์" เพื่อตรวจสอบ', 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('⚠️ ต้องมีไฟล์อย่างน้อย 1 ไฟล์', 'xs', FlexMessageDesignSystem.colors.warning, 'bold'),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('📤 ไฟล์ที่ส่งจะถูกแนบกับงานโดยอัตโนมัติ', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 📎 ดูรายการไฟล์ | 📋 ดูงานที่ต้องส่ง | ❌ ยกเลิก', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('📎', 'postback', `action=show_task_files&taskId=${task.id}&groupId=${group.id}`, 'primary'),
      FlexMessageDesignSystem.createButton('📋', 'postback', `action=show_personal_tasks`, 'secondary'),
      FlexMessageDesignSystem.createButton('❌', 'postback', `action=submit_cancel&taskId=${task.id}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📎 แนบไฟล์และส่งงาน',
      '📎',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดแสดงไฟล์แนบในแชท
   */
  static createFileDisplayCard(file: any, group: any): FlexMessage {
    const fileIcon = this.getFileIcon(file.mimeType);
    const fileSize = this.formatFileSize(file.size);
    const uploadDate = moment(file.uploadedAt).format('DD/MM HH:mm');
    
    const content = [
      FlexMessageDesignSystem.createText('📎 ไฟล์แนบ', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`${fileIcon} ${file.originalName}`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText(`📦 ${fileSize} • 📅 ${uploadDate}`, 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText(`👤 ${file.uploadedByUser?.displayName || 'ไม่ทราบ'}`, 'xs', FlexMessageDesignSystem.colors.textSecondary),
      ...(file.tags && file.tags.length > 0 ? [
        FlexMessageDesignSystem.createSeparator('small'),
        FlexMessageDesignSystem.createText(`🏷️ ${file.tags.map((tag: string) => `#${tag}`).join(' ')}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
      ] : [])
    ];

    const fileService = serviceContainer.get<FileService>('FileService');
    const buttons = [
      FlexMessageDesignSystem.createButton('📥', 'uri', fileService.generateDownloadUrl(file.groupId, file.id), 'primary'),
      ...(this.isPreviewable(file.mimeType) ? [
        FlexMessageDesignSystem.createButton('👁️', 'uri', fileService.generatePreviewUrl(file.groupId, file.id), 'secondary')
      ] : [])
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📎 ไฟล์แนบ',
      '📎',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดแสดงรายการไฟล์แนบของงานแยกตามประเภท
   */
  static createTaskFilesCategorizedCard(task: any, filesByType: {
    initialFiles: any[];
    submissionFiles: any[];
    allFiles: any[];
  }, group: any, viewerLineUserId?: string): FlexMessage {
    const { initialFiles, submissionFiles, allFiles } = filesByType;
    const totalFiles = allFiles.length;

    if (totalFiles === 0) {
      return FlexMessageDesignSystem.createStandardTaskCard(
        '📎 ไฟล์แนบ',
        '📎',
        FlexMessageDesignSystem.colors.info,
        [
          FlexMessageDesignSystem.createText('📎 ไฟล์แนบของงาน', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
          FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
          FlexMessageDesignSystem.createSeparator('small'),
          FlexMessageDesignSystem.createText('ไม่มีไฟล์แนบ', 'sm', FlexMessageDesignSystem.colors.textSecondary)
        ],
        [
          FlexMessageDesignSystem.createButton('📋', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}#files`, 'secondary')
        ],
        'extraLarge'
      );
    }

    const content = [
      FlexMessageDesignSystem.createText('📎 ไฟล์แนบของงาน', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
    ];

    // แสดงไฟล์เริ่มต้น
    if (initialFiles.length > 0) {
      content.push(
        FlexMessageDesignSystem.createText(`📋 ไฟล์เริ่มต้น: ${initialFiles.length} ไฟล์`, 'sm', FlexMessageDesignSystem.colors.primary, 'bold'),
        ...initialFiles.slice(0, 2).map(file => [
          FlexMessageDesignSystem.createText(`${this.getFileIcon(file.mimeType)} ${file.originalName}`, 'xs', FlexMessageDesignSystem.colors.textPrimary),
          FlexMessageDesignSystem.createText(`📦 ${this.formatFileSize(file.size)} • 👤 ${file.uploadedByUser?.displayName || 'ไม่ทราบ'}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ]).flat(),
        ...(initialFiles.length > 2 ? [
          FlexMessageDesignSystem.createText(`และอีก ${initialFiles.length - 2} ไฟล์...`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ] : [])
      );
      
      if (submissionFiles.length > 0) {
        content.push(FlexMessageDesignSystem.createSeparator('small'));
      }
    }

    // แสดงไฟล์ส่งงาน
    if (submissionFiles.length > 0) {
      content.push(
        FlexMessageDesignSystem.createText(`📤 ไฟล์ส่งงาน: ${submissionFiles.length} ไฟล์`, 'sm', FlexMessageDesignSystem.colors.success, 'bold'),
        ...submissionFiles.slice(0, 2).map(file => [
          FlexMessageDesignSystem.createText(`${this.getFileIcon(file.mimeType)} ${file.originalName}`, 'xs', FlexMessageDesignSystem.colors.textPrimary),
          FlexMessageDesignSystem.createText(`📦 ${this.formatFileSize(file.size)} • 👤 ${file.uploadedByUser?.displayName || 'ไม่ทราบ'}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ]).flat(),
        ...(submissionFiles.length > 2 ? [
          FlexMessageDesignSystem.createText(`และอีก ${submissionFiles.length - 2} ไฟล์...`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ] : [])
      );
    }

    content.push(
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`📎 รวมทั้งหมด: ${totalFiles} ไฟล์`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText('💡 กดปุ่มด้านล่างเพื่อดาวน์โหลดหรือดูไฟล์', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    );

    // สร้างปุ่มสำหรับไฟล์แต่ละไฟล์ (สูงสุด 3 ไฟล์แรก)
    const fileService = serviceContainer.get<FileService>('FileService');
    const fileButtons = allFiles.slice(0, 3).map(file =>
      FlexMessageDesignSystem.createButton(
        `📥 ${file.originalName.substring(0, 8)}...`,
        'uri',
        fileService.generateDownloadUrl(file.groupId, file.id),
        'secondary'
      )
    );

    const buttons = [
      ...fileButtons,
      FlexMessageDesignSystem.createButton('📋', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}#files`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📎 ไฟล์แนบ',
      '📎',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดแสดงรายการไฟล์แนบของงาน (เดิม - สำหรับ backward compatibility)
   */
  static createTaskFilesCard(task: any, files: any[], group: any, viewerLineUserId?: string): FlexMessage {
    if (!files || files.length === 0) {
      return FlexMessageDesignSystem.createStandardTaskCard(
        '📎 ไฟล์แนบ',
        '📎',
        FlexMessageDesignSystem.colors.info,
        [
          FlexMessageDesignSystem.createText('📎 ไฟล์แนบของงาน', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
          FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
          FlexMessageDesignSystem.createSeparator('small'),
          FlexMessageDesignSystem.createText('ไม่มีไฟล์แนบ', 'sm', FlexMessageDesignSystem.colors.textSecondary)
        ],
        [
          FlexMessageDesignSystem.createButton('📋', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}#files`, 'secondary')
        ],
        'extraLarge'
      );
    }

    const content = [
      FlexMessageDesignSystem.createText('📎 ไฟล์แนบของงาน', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`📎 ไฟล์แนบ: ${files.length} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      ...files.slice(0, 3).map(file => [
        FlexMessageDesignSystem.createSeparator('small'),
        FlexMessageDesignSystem.createText(`${this.getFileIcon(file.mimeType)} ${file.originalName}`, 'xs', FlexMessageDesignSystem.colors.textPrimary),
        FlexMessageDesignSystem.createText(`📦 ${this.formatFileSize(file.size)} • 👤 ${file.uploadedByUser?.displayName || 'ไม่ทราบ'}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
      ]).flat(),
      ...(files.length > 3 ? [
        FlexMessageDesignSystem.createSeparator('small'),
        FlexMessageDesignSystem.createText(`และอีก ${files.length - 3} ไฟล์...`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
      ] : []),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 กดปุ่มด้านล่างเพื่อดาวน์โหลดหรือดูไฟล์', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    // สร้างปุ่มสำหรับไฟล์แต่ละไฟล์ (สูงสุด 3 ไฟล์แรก)
    const fileService = serviceContainer.get<FileService>('FileService');
    const fileButtons = files.slice(0, 3).map(file =>
      FlexMessageDesignSystem.createButton(
        `📥 ${file.originalName.substring(0, 8)}...`,
        'uri',
        fileService.generateDownloadUrl(file.groupId, file.id),
        'primary'
      )
    );

    const buttons = [
      ...fileButtons, // ปุ่มดาวน์โหลดไฟล์แต่ละไฟล์
      FlexMessageDesignSystem.createButton('📋', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}&action=view${viewerLineUserId ? `&userId=${viewerLineUserId}` : ''}#files`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📎 ไฟล์แนบ',
      '📎',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดยืนยันการส่งงานพร้อมไฟล์
   */
  static createSubmitConfirmationCard(task: any, group: any, fileCount: number, fileNames: string[]): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('✅ ยืนยันการส่งงาน', 'md', FlexMessageDesignSystem.colors.success, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`📎 ไฟล์ที่จะแนบ: ${fileCount} ไฟล์`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      ...(fileNames.length > 0 ? [
        FlexMessageDesignSystem.createSeparator('small'),
        ...fileNames.map(fileName => 
          FlexMessageDesignSystem.createText(`• ${fileName}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        )
      ] : []),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('กด "ยืนยัน" เพื่อส่งงานพร้อมไฟล์', 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 ✅ ยืนยัน | ❌ ยกเลิก', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('✅', 'postback', `action=confirm_submit&taskId=${task.id}`, 'primary'),
      FlexMessageDesignSystem.createButton('❌', 'postback', `action=submit_cancel&taskId=${task.id}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📤 ยืนยันการส่งงาน',
      '📤',
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'extraLarge'
    );
  }

  private static getCompletionSummary(task: any): { emoji: string; text: string; points: number } {
    const dueTime = moment(task.dueTime);
    const completedTime = moment(task.completedAt || new Date());
    const diffMinutes = completedTime.diff(dueTime, 'minutes');
    const scoring = config.app.kpiScoring.assignee;

    if (diffMinutes <= -24 * 60) {
      return {
        emoji: '🚀',
        text: 'ส่งก่อนกำหนด 24 ชม. ขึ้นไป',
        points: scoring.early
      };
    }

    if (diffMinutes <= 0) {
      return {
        emoji: '⏱️',
        text: 'ส่งตรงเวลา',
        points: scoring.ontime
      };
    }

    const hoursLate = Math.ceil(diffMinutes / 60);
    return {
      emoji: '🐢',
      text: `ส่งล่าช้า ${hoursLate} ชม.`,
      points: scoring.late
    };
  }

  /**
   * ตรวจสอบว่าไฟล์สามารถแสดงตัวอย่างได้หรือไม่
   */
  private static isPreviewable(mimeType: string): boolean {
    const previewableMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain'
    ];
    return previewableMimes.includes(mimeType);
  }

  /**
   * ได้ไอคอนไฟล์ตาม MIME type
   */
  private static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📎';
  }

  /**
   * จัดรูปแบบขนาดไฟล์
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * สร้างการ์ดแสดงรายการไฟล์ในแชทส่วนตัว (มาตรฐานใหม่)
   */
  static createPersonalFileListCard(files: any[], user: any, taskId?: string): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('📎 รายการไฟล์ที่ส่งมา', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText(`👤 ${user.displayName}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`📦 ไฟล์ทั้งหมด: ${files.length} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      ...(files.length > 0 ? [
        FlexMessageDesignSystem.createSeparator('small'),
        ...files.slice(0, 5).map(file => [
          FlexMessageDesignSystem.createText(`${this.getFileIcon(file.mimeType)} ${file.originalName}`, 'xs', FlexMessageDesignSystem.colors.textPrimary),
          FlexMessageDesignSystem.createText(`📦 ${this.formatFileSize(file.size)} • 📅 ${moment(file.uploadedAt).format('HH:mm')}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ]).flat(),
        ...(files.length > 5 ? [
          FlexMessageDesignSystem.createSeparator('small'),
          FlexMessageDesignSystem.createText(`และอีก ${files.length - 5} ไฟล์...`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ] : [])
      ] : [
        FlexMessageDesignSystem.createSeparator('small'),
        FlexMessageDesignSystem.createText('ยังไม่มีไฟล์ที่ส่งมา', 'sm', FlexMessageDesignSystem.colors.textSecondary)
      ]),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 ส่งไฟล์เพิ่มเติมได้เลย หรือกดปุ่มด้านล่างเพื่อดูงานที่ต้องส่ง', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 📋 ดูงานที่ต้องส่ง | 📤 ส่งงานพร้อมไฟล์ | 🗑️ ล้างไฟล์ทั้งหมด', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    // สร้างปุ่มสำหรับไฟล์แต่ละไฟล์ (สูงสุด 3 ไฟล์แรก)
    const fileService = serviceContainer.get<FileService>('FileService');
    const fileButtons = files.slice(0, 3).map(file =>
      FlexMessageDesignSystem.createButton(
        `📥 ${file.originalName.substring(0, 10)}...`,
        'uri',
        fileService.generateDownloadUrl(file.groupId, file.id),
        'secondary'
      )
    );

    const buttons = [
      FlexMessageDesignSystem.createButton('📋', 'postback', 'action=show_personal_tasks', 'primary'),
      ...(files.length > 0 && taskId ? [
        FlexMessageDesignSystem.createButton('📤', 'postback', `action=submit_task&taskId=${taskId}`, 'primary')
      ] : []),
      ...fileButtons, // เพิ่มปุ่มไฟล์แต่ละไฟล์
      FlexMessageDesignSystem.createButton('🗑️', 'postback', 'action=clear_personal_files', 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📎 รายการไฟล์ส่วนตัว',
      '📎',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดแสดงงานที่ต้องส่งพร้อมไฟล์ที่แนบได้ (มาตรฐานใหม่)
   */
  static createPersonalTaskWithFilesCard(task: any, files: any[], user: any): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('📋 งานที่ต้องส่ง', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText(`📝 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`📎 ไฟล์ที่ส่งมาแล้ว: ${files.length} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      ...(files.length > 0 ? [
        FlexMessageDesignSystem.createSeparator('small'),
        ...files.slice(0, 3).map(file => 
          FlexMessageDesignSystem.createText(`• ${file.originalName}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ),
        ...(files.length > 3 ? [
          FlexMessageDesignSystem.createText(`และอีก ${files.length - 3} ไฟล์...`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ] : [])
      ] : [
        FlexMessageDesignSystem.createSeparator('small'),
        FlexMessageDesignSystem.createText('ยังไม่มีไฟล์ที่ส่งมา', 'xs', FlexMessageDesignSystem.colors.textSecondary)
      ]),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 ส่งไฟล์เพิ่มเติมได้เลย หรือกดปุ่มส่งงาน', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 📤 ส่งงาน | 📎 ดูไฟล์ทั้งหมด | ❌ ยกเลิก', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    // สร้างปุ่มสำหรับไฟล์แต่ละไฟล์ (สูงสุด 3 ไฟล์แรก)
    const fileService = serviceContainer.get<FileService>('FileService');
    const fileButtons = files.slice(0, 3).map(file =>
      FlexMessageDesignSystem.createButton(
        `📥 ${file.originalName.substring(0, 8)}...`,
        'uri',
        fileService.generateDownloadUrl(file.groupId, file.id),
        'secondary'
      )
    );

    const buttons = [
      FlexMessageDesignSystem.createButton('📤', 'postback', `action=submit_task&taskId=${task.id}`, 'primary'),
      FlexMessageDesignSystem.createButton('📎', 'postback', 'action=show_personal_files', 'secondary'),
      ...fileButtons, // เพิ่มปุ่มไฟล์แต่ละไฟล์
      FlexMessageDesignSystem.createButton('❌', 'postback', 'action=submit_cancel', 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📋 ส่งงานพร้อมไฟล์',
      '📋',
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดแสดงรายการงานที่ต้องส่ง (มาตรฐานใหม่)
   */
  static createPersonalTaskListCard(tasks: any[], files: any[], user: any): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('📋 งานที่ต้องส่ง', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText(`👤 ${user.displayName}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`📝 งานทั้งหมด: ${tasks.length} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      ...tasks.slice(0, 3).map((task, index) => [
        FlexMessageDesignSystem.createSeparator('small'),
        FlexMessageDesignSystem.createText(`${index + 1}. ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
        FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${moment(task.dueTime).format('DD/MM HH:mm')}`, 'xs', FlexMessageDesignSystem.colors.textSecondary),
        FlexMessageDesignSystem.createText(`📎 ไฟล์ที่ส่งมาแล้ว: ${files.length} รายการ`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
      ]).flat(),
      ...(tasks.length > 3 ? [
        FlexMessageDesignSystem.createSeparator('small'),
        FlexMessageDesignSystem.createText(`และอีก ${tasks.length - 3} งาน...`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
      ] : []),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 เลือกงานที่ต้องการส่ง หรือกดปุ่มดูรายการไฟล์', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 📎 ดูรายการไฟล์ | 📤 ส่งงานต่างๆ', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('📎', 'postback', 'action=show_personal_files', 'primary'),
      ...tasks.slice(0, 3).map((task, index) => 
        FlexMessageDesignSystem.createButton(
          `📤${index + 1}`, 
          'postback', 
          `action=submit_task&taskId=${task.id}`, 
          'secondary'
        )
      ),
      ...(tasks.length > 3 ? [
        FlexMessageDesignSystem.createButton('📋', 'postback', 'action=show_all_personal_tasks', 'secondary')
      ] : [])
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📋 รายการงานที่ต้องส่ง',
      '📋',
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดงานส่วนตัวทั้งหมด (รวมงานที่เกินกำหนด) - มาตรฐานใหม่
   */
  static createAllPersonalTasksCard(tasks: any[], files: any[], user: any, overdueTasks: any[] = []): FlexMessage {
    // กรองงานที่ส่งแล้วออก (มี workflow.submissions)
    const filterSubmittedTasks = (taskList: any[]) => {
      return taskList.filter(t => {
        const workflow = t.workflow as any;
        if (!workflow || !workflow.submissions) return true;
        return !Array.isArray(workflow.submissions) || workflow.submissions.length === 0;
      });
    };
    
    // แยกงานตามสถานะ
    const pendingTasks = filterSubmittedTasks(tasks.filter(task => task.status === 'pending'));
    const inProgressTasks = filterSubmittedTasks(tasks.filter(task => task.status === 'in_progress'));
    
    const content = [
      FlexMessageDesignSystem.createText('📋 งานทั้งหมดที่ต้องส่ง', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText(`👤 ${user.displayName}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`📝 งานทั้งหมด: ${tasks.length} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText(`📎 ไฟล์ที่ส่งมาแล้ว: ${files.length} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      
      // แสดงงานที่เกินกำหนดก่อน (ถ้ามี)
      ...(overdueTasks.length > 0 ? [
        FlexMessageDesignSystem.createText('⚠️ งานที่เกินกำหนด:', 'sm', FlexMessageDesignSystem.colors.danger, 'bold'),
        ...overdueTasks.map((task, index) => [
          FlexMessageDesignSystem.createText(`${index + 1}. ${task.title}`, 'sm', FlexMessageDesignSystem.colors.danger, 'bold'),
          FlexMessageDesignSystem.createText(`   📅 กำหนดส่ง: ${moment(task.dueTime).format('DD/MM HH:mm')} ⚠️ เกินกำหนด`, 'xs', FlexMessageDesignSystem.colors.danger),
          FlexMessageDesignSystem.createText(`   🎯 ${FlexMessageDesignSystem.getPriorityText(task.priority)}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ]).flat(),
        FlexMessageDesignSystem.createSeparator('small')
      ] : []),
      
      // แสดงงานที่กำลังดำเนินการ
      ...(inProgressTasks.length > 0 ? [
        FlexMessageDesignSystem.createText('🔄 งานที่กำลังดำเนินการ:', 'sm', FlexMessageDesignSystem.colors.warning, 'bold'),
        ...inProgressTasks.map((task, index) => [
          FlexMessageDesignSystem.createText(`${overdueTasks.length + index + 1}. ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
          FlexMessageDesignSystem.createText(`   📅 กำหนดส่ง: ${moment(task.dueTime).format('DD/MM HH:mm')}`, 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(`   🎯 ${FlexMessageDesignSystem.getPriorityText(task.priority)}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ]).flat(),
        FlexMessageDesignSystem.createSeparator('small')
      ] : []),
      
      // แสดงงานที่รอดำเนินการ
      ...(pendingTasks.length > 0 ? [
        FlexMessageDesignSystem.createText('⏳ งานที่รอดำเนินการ:', 'sm', FlexMessageDesignSystem.colors.info, 'bold'),
        ...pendingTasks.map((task, index) => [
          FlexMessageDesignSystem.createText(`${overdueTasks.length + inProgressTasks.length + index + 1}. ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
          FlexMessageDesignSystem.createText(`   📅 กำหนดส่ง: ${moment(task.dueTime).format('DD/MM HH:mm')}`, 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(`   🎯 ${FlexMessageDesignSystem.getPriorityText(task.priority)}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ]).flat(),
        FlexMessageDesignSystem.createSeparator('small')
      ] : []),
      
      ...(tasks.length > 5 ? [
        FlexMessageDesignSystem.createSeparator('small'),
        FlexMessageDesignSystem.createText(`และอีก ${tasks.length - 5} งาน...`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
      ] : []),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 กดปุ่มด้านล่างเพื่อเปิดหน้าเว็บส่งงาน', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText('💡 ระบบจะแสดงงานทั้งหมดของคุณพร้อมชื่อกลุ่ม', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    // เปลี่ยนเป็นปุ่มเปิดเว็บแทนการส่งงานในแชท
    const buttons = [
      FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config.baseUrl}/dashboard/submit-tasks?userId=${user.lineUserId}`, 'primary'),
      FlexMessageDesignSystem.createButton('📎 ดูรายการไฟล์', 'postback', 'action=show_personal_files', 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📋 งานทั้งหมดที่ต้องส่ง',
      '📋',
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดยืนยันการส่งงาน (มาตรฐานใหม่) - เปลี่ยนเป็นเปิดเว็บ
   */
  static createTaskSubmissionConfirmationCard(task: any, files: any[], user: any): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('📋 ยืนยันการส่งงาน', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText(`📝 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`👤 ผู้รับผิดชอบ: ${user.displayName}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${moment(task.dueTime).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`📎 ไฟล์ที่ส่งมาแล้ว: ${files.length} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      ...(files.length > 0 ? [
        FlexMessageDesignSystem.createSeparator('small'),
        ...files.slice(0, 3).map(file =>
          FlexMessageDesignSystem.createText(`• ${file.originalName}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ),
        ...(files.length > 3 ? [
          FlexMessageDesignSystem.createText(`และอีก ${files.length - 3} ไฟล์...`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ] : [])
      ] : [
        FlexMessageDesignSystem.createSeparator('small'),
        FlexMessageDesignSystem.createText('ยังไม่มีไฟล์ที่ส่งมา', 'xs', FlexMessageDesignSystem.colors.textSecondary)
      ]),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 กดปุ่มด้านล่างเพื่อเปิดหน้าเว็บส่งงาน', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText('💡 ระบบจะแสดงงานทั้งหมดของคุณพร้อมชื่อกลุ่ม', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    // สร้างปุ่มสำหรับไฟล์แต่ละไฟล์ (สูงสุด 3 ไฟล์แรก)
    const fileService = serviceContainer.get<FileService>('FileService');
    const fileButtons = files.slice(0, 3).map(file =>
      FlexMessageDesignSystem.createButton(
        `📥 ${file.originalName.substring(0, 8)}...`,
        'uri',
        fileService.generateDownloadUrl(file.groupId, file.id),
        'secondary'
      )
    );

    const buttons = [
      FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config.baseUrl}/dashboard/submit-tasks?userId=${user.lineUserId}&taskId=${task.id}`, 'primary'),
      ...fileButtons, // เพิ่มปุ่มไฟล์แต่ละไฟล์
      FlexMessageDesignSystem.createButton('❌', 'postback', 'action=submit_cancel', 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📋 ยืนยันการส่งงาน',
      '📋',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดยืนยันการส่งงานแบบมาตรฐาน (สำหรับงานที่ถูกตีกลับ) - เปลี่ยนเป็นเปิดเว็บ
   */
  static createStandardTaskSubmissionCard(task: any, files: any[], user: any): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('📋 ยืนยันการส่งงานใหม่', 'md', FlexMessageDesignSystem.colors.warning, 'bold'),
      FlexMessageDesignSystem.createText(`📝 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`👤 ผู้รับผิดชอบ: ${user.displayName}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText(`📅 กำหนดส่งใหม่: ${moment(task.dueTime).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem.colors.warning),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`📎 ไฟล์ที่ส่งมาแล้ว: ${files.length} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      ...(files.length > 0 ? [
        FlexMessageDesignSystem.createSeparator('small'),
        ...files.slice(0, 3).map(file =>
          FlexMessageDesignSystem.createText(`• ${file.originalName}`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ),
        ...(files.length > 3 ? [
          FlexMessageDesignSystem.createText(`และอีก ${files.length - 3} ไฟล์...`, 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ] : [])
      ] : [
        FlexMessageDesignSystem.createSeparator('small'),
        FlexMessageDesignSystem.createText('ยังไม่มีไฟล์ที่ส่งมา', 'xs', FlexMessageDesignSystem.colors.textSecondary)
      ]),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 เลือกวิธีการส่งงานใหม่ด้านล่าง', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 📎 ส่งงานพร้อมไฟล์ | 📤 ส่งงานโดยไม่มีไฟล์ | ❌ ยกเลิก', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    // สร้างปุ่มสำหรับไฟล์แต่ละไฟล์ (สูงสุด 3 ไฟล์แรก)
    const fileService = serviceContainer.get<FileService>('FileService');
    const fileButtons = files.slice(0, 3).map(file =>
      FlexMessageDesignSystem.createButton(
        `📥 ${file.originalName.substring(0, 8)}...`,
        'uri',
        fileService.generateDownloadUrl(file.groupId, file.id),
        'secondary'
      )
    );

    const buttons = [
      FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config.baseUrl}/dashboard/submit-tasks?userId=${user.lineUserId}&taskId=${task.id}`, 'primary'),
      ...fileButtons, // เพิ่มปุ่มไฟล์แต่ละไฟล์
      FlexMessageDesignSystem.createButton('❌', 'postback', 'action=submit_cancel', 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📋 ยืนยันการส่งงานใหม่',
      '📋',
      FlexMessageDesignSystem.colors.warning,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดยืนยันการส่งงานสำเร็จ
   */
  static createSubmissionSuccessCard(task: any, fileCount: number, user: any): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('✅ ส่งงานสำเร็จแล้ว', 'md', FlexMessageDesignSystem.colors.success, 'bold'),
      FlexMessageDesignSystem.createText(`📝 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`👤 ผู้ส่ง: ${user.displayName}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText(`📅 ส่งเมื่อ: ${moment().format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      ...(fileCount > 0 ? [
        FlexMessageDesignSystem.createText(`📎 ไฟล์แนบ: ${fileCount} ไฟล์`, 'sm', FlexMessageDesignSystem.colors.success, 'bold'),
        FlexMessageDesignSystem.createSeparator('small')
      ] : [
        FlexMessageDesignSystem.createText(`📤 ส่งงานโดยไม่มีไฟล์แนบ`, 'sm', FlexMessageDesignSystem.colors.info, 'bold'),
        FlexMessageDesignSystem.createSeparator('small')
      ]),
      FlexMessageDesignSystem.createText('🎯 สถานะ: รอการตรวจสอบ', 'sm', FlexMessageDesignSystem.colors.warning),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 ระบบจะส่งงานไปให้ผู้ตรวจตรวจสอบภายใน 2 วัน', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 📋 ดูงานอื่นๆ | 📤 ส่งงานเพิ่มเติม', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('📋', 'postback', 'action=submit_task', 'primary'),
      FlexMessageDesignSystem.createButton('📤', 'postback', 'action=submit_task', 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '✅ ส่งงานสำเร็จ',
      '✅',
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * สร้างการ์ดแสดง Flow การส่งงานที่ชัดเจน - เปลี่ยนเป็นเปิดเว็บ
   */
  static createTaskSubmissionFlowCard(user: any): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('📋 Flow การส่งงาน (มาตรฐานใหม่)', 'md', FlexMessageDesignSystem.colors.primary, 'bold'),
      FlexMessageDesignSystem.createText(`👤 ${user.displayName}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('🔄 **ขั้นตอนการส่งงาน:**', 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText('1️⃣ พิมพ์ "ส่งงาน" เพื่อดูรายการงาน', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText('2️⃣ กดปุ่ม "เปิดหน้าเว็บส่งงาน"', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText('3️⃣ เลือกงานที่ต้องการส่งในหน้าเว็บ', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText('4️⃣ อัปโหลดไฟล์และกรอกหมายเหตุ', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText('5️⃣ กดปุ่มส่งงานในหน้าเว็บ', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 **ข้อดีของการใช้หน้าเว็บ:**', 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText('• แสดงงานทั้งหมดพร้อมชื่อกลุ่ม', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText('• อัปโหลดไฟล์ได้หลายไฟล์พร้อมกัน', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText('• กรอกหมายเหตุได้ยาวและละเอียด', 'xs', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('💡 📋 เริ่มต้นส่งงาน | 📎 ดูรายการไฟล์', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ส่งงาน', 'uri', `${config.baseUrl}/dashboard/submit-tasks?userId=${user.lineUserId}`, 'primary'),
      FlexMessageDesignSystem.createButton('📎 ดูรายการไฟล์', 'postback', 'action=show_personal_files', 'secondary'),
      FlexMessageDesignSystem.createButton('❌', 'postback', 'action=submit_cancel', 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📋 Flow การส่งงาน',
      '📋',
      FlexMessageDesignSystem.colors.primary,
      content,
      buttons,
      'extraLarge'
    );
  }
}
