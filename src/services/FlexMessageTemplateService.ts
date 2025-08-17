// Flex Message Template Service - บริการสร้างการ์ดมาตรฐาน
// ใช้ Design System เพื่อสร้างการ์ดที่สม่ำเสมอ

import { FlexMessageDesignSystem, TaskCardData } from './FlexMessageDesignSystem';
import { FlexMessage } from '@line/bot-sdk';
import moment from 'moment';
import { config } from '@/utils/config';

export class FlexMessageTemplateService {
  /**
   * สร้างการ์ดงานใหม่
   */
  static createNewTaskCard(task: any, group: any, creator: any, dueDate: string): FlexMessage {
    const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ') || 'ไม่ระบุ';
    const tagsText = (task.tags && task.tags.length > 0) ? `🏷️ ${task.tags.map((t: string) => `#${t}`).join(' ')}` : '';
    const priorityColor = FlexMessageDesignSystem.getPriorityColor(task.priority);
    const priorityText = FlexMessageDesignSystem.getPriorityText(task.priority);

    const content = [
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueDate}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`👤 ผู้สร้าง: ${creator?.displayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      ...(priorityText ? [FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
      ...(task.description ? [FlexMessageDesignSystem.createText(`📝 ${task.description}`, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : []),
      ...(tagsText ? [FlexMessageDesignSystem.createText(tagsText, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true)] : [])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      FlexMessageDesignSystem.emojis.newTask,
      FlexMessageDesignSystem.colors.primary,
      content,
      buttons,
      'large'
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
      FlexMessageDesignSystem.createButton('ดูงาน', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      FlexMessageDesignSystem.emojis.overdue,
      FlexMessageDesignSystem.colors.danger,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้างการ์ดงานสำเร็จ
   */
  static createCompletedTaskCard(task: any, group: any, completedBy: any): FlexMessage {
    const completionScore = this.calculateCompletionScore(task);
    const scoreColor = completionScore >= 90 ? FlexMessageDesignSystem.colors.success : completionScore >= 70 ? FlexMessageDesignSystem.colors.warning : FlexMessageDesignSystem.colors.danger;

    const content = [
      FlexMessageDesignSystem.createText(`👤 ปิดงานโดย: ${completedBy.displayName}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`🎯 เสร็จเมื่อ: ${moment(task.completedAt).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`${this.getCompletionStatusEmoji(task)} ${this.getCompletionStatusText(task)}`, 'sm', FlexMessageDesignSystem.colors.textSecondary, 'bold'),
      FlexMessageDesignSystem.createBox('horizontal', [
        FlexMessageDesignSystem.createText('คะแนน:', 'sm', FlexMessageDesignSystem.colors.textSecondary),
        FlexMessageDesignSystem.createText(`${completionScore}/100`, 'sm', scoreColor, 'bold')
      ], 'small')
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      FlexMessageDesignSystem.emojis.completed,
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้างการ์ดงานที่อัปเดต
   */
  static createUpdatedTaskCard(task: any, group: any, changes: Record<string, any>, changedFields: string[]): FlexMessage {
    const dueText = task.dueTime ? moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm') : '-';
    const tagsText = (task.tags && task.tags.length > 0) ? `🏷️ ${task.tags.map((t: string) => `#${t}`).join(' ')}` : '';
    const assigneeNames = (task.assignedUsers || []).map((u: any) => u.displayName).join(', ');
    const headerEmoji = changes.status ? (changes.status === 'cancelled' ? '🚫' : '🔄') : '✏️';
    const headerColor = changes.status === 'cancelled' ? FlexMessageDesignSystem.colors.neutral : FlexMessageDesignSystem.colors.primary;
    const priorityColor = FlexMessageDesignSystem.getPriorityColor(task.priority);
    const priorityText = FlexMessageDesignSystem.getPriorityText(task.priority);

    const content = [
      FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${dueText}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`👥 ผู้รับผิดชอบ: ${assigneeNames}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      ...(priorityText ? [FlexMessageDesignSystem.createText(`🎯 ${priorityText}`, 'sm', priorityColor, 'bold')] : []),
      ...(tagsText ? [FlexMessageDesignSystem.createText(tagsText, 'sm', FlexMessageDesignSystem.colors.textSecondary)] : []),
      ...(changedFields.length > 0 ? [FlexMessageDesignSystem.createText(`🔧 เปลี่ยนแปลง: ${changedFields.join(', ')}`, 'sm', FlexMessageDesignSystem.colors.warning, 'bold')] : [])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      headerEmoji,
      headerColor,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้างการ์ดงานที่ถูกลบ
   */
  static createDeletedTaskCard(task: any, group: any): FlexMessage {
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
      FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.lineGroupId}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      FlexMessageDesignSystem.emojis.deleted,
      FlexMessageDesignSystem.colors.neutral,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้างการ์ดงานที่ถูกส่ง
   */
  static createSubmittedTaskCard(task: any, group: any, submitterDisplayName: string, fileCount: number, links: string[]): FlexMessage {
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
      FlexMessageDesignSystem.createButton('ดูงาน', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      FlexMessageDesignSystem.emojis.submitted,
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้างการ์ดขอตรวจงาน
   */
  static createReviewRequestCard(task: any, group: any, details: any, dueText: string): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('📝 มีงานรอการตรวจ', 'md', FlexMessageDesignSystem.colors.warning, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`👤 ผู้ส่ง: ${details.submitterDisplayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      ...(details.fileCount > 0 ? [
        FlexMessageDesignSystem.createText(`📎 ไฟล์แนบ: ${details.fileCount} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary)
      ] : []),
      ...(details.links && details.links.length > 0 ? [
        FlexMessageDesignSystem.createText(`🔗 ลิงก์: ${details.links.length} รายการ`, 'sm', FlexMessageDesignSystem.colors.textPrimary)
      ] : []),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`📅 กำหนดตรวจภายใน: ${dueText}`, 'sm', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('✅ อนุมัติการตรวจ', 'postback', `action=approve_review&taskId=${task.id}`, 'primary'),
      FlexMessageDesignSystem.createButton('❌ ตีกลับงาน', 'postback', `action=reject_task&taskId=${task.id}`, 'secondary'),
      FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📝 งานรอการตรวจ',
      '📝',
      FlexMessageDesignSystem.colors.warning,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้างการ์ดขออนุมัติการปิดงาน
   */
  static createApprovalRequestCard(task: any, group: any, reviewer: any): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('🔍 งานผ่านการตรวจแล้ว', 'md', FlexMessageDesignSystem.colors.success, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`👤 ผู้ตรวจ: ${reviewer.displayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`✅ ตรวจเมื่อ: ${moment().tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('📝 ขั้นตอนต่อไป: กรุณาอนุมัติการปิดงานเพื่อให้งานเสร็จสิ้น', 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createText('💡 หมายเหตุ: งานผ่านการตรวจแล้ว แต่ยังต้องรอการอนุมัติการปิดงานจากผู้สั่งงาน', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('✅ อนุมัติการปิดงาน', 'postback', `action=approve_completion&taskId=${task.id}`, 'primary'),
      FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '🔍 งานผ่านการตรวจแล้ว',
      '🔍',
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้างการ์ดงานที่ถูกตีกลับ
   */
  static createRejectedTaskCard(task: any, group: any, newDueTime: Date, reviewerDisplayName?: string): FlexMessage {
    const newDueText = moment(newDueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
    
    const content = [
      FlexMessageDesignSystem.createText('❌ งานถูกตีกลับ', 'md', FlexMessageDesignSystem.colors.danger, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText(`👤 ผู้ตรวจ: ${reviewerDisplayName || 'ไม่ระบุ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`📅 กำหนดส่งใหม่: ${newDueText}`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('กรุณาตรวจสอบข้อผิดพลาดและส่งงานใหม่ตามกำหนด', 'sm', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`, 'primary'),
      FlexMessageDesignSystem.createButton('ส่งงานใหม่', 'postback', `action=submit_task&taskId=${task.id}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '❌ งานถูกตีกลับ',
      '❌',
      FlexMessageDesignSystem.colors.danger,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้างการ์ดรายงานรายวัน
   */
  static createDailySummaryCard(group: any, tasks: any[], timezone: string): FlexMessage {
    // งานที่กำลังดำเนินการ = ทุกงานที่ยังไม่เลยกำหนดและยังไม่ส่ง
    const inProgressTasks = tasks.filter(t => 
      t.status === 'in_progress' || 
      t.status === 'pending' || 
      (t.status === 'submitted' && !t.isCompleted)
    );
    
    // งานที่ดำเนินการแล้ว = งานที่เสร็จแล้วหรือส่งแล้ว
    const completedTasks = tasks.filter(t => 
      t.status === 'completed' || 
      (t.status === 'submitted' && t.isCompleted)
    );
    
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
          FlexMessageDesignSystem.createText('✅ ดำเนินการแล้ว', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(completedTasks.length.toString(), 'md', FlexMessageDesignSystem.colors.success, 'bold')
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
      FlexMessageDesignSystem.createText(`📋 งานที่กำลังดำเนินการ ${inProgressTasks.length} งาน`, 'sm', FlexMessageDesignSystem.colors.textSecondary, 'bold'),
      FlexMessageDesignSystem.createText('💡 คลิกปุ่มด้านล่างเพื่อดูรายละเอียดเพิ่มเติม', 'sm', FlexMessageDesignSystem.colors.textSecondary)
    );

      const buttons = [
        FlexMessageDesignSystem.createButton('📊 ดู Dashboard', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}`, 'primary'),
        FlexMessageDesignSystem.createButton('📋 ดูงานทั้งหมด', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}#tasks`, 'secondary')
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
  static createPersonalReportCard(assignee: any, tasks: any[], timezone: string): FlexMessage {
    const overdueTasks = tasks.filter(t => t.status === 'overdue');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
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
      FlexMessageDesignSystem.createButton('📊 ดู Dashboard', 'uri', `${config.baseUrl}/dashboard?groupId=${assignee.groupId}`, 'primary'),
      FlexMessageDesignSystem.createButton('📋 ดูงานทั้งหมดของฉัน', 'uri', `${config.baseUrl}/dashboard?groupId=${assignee.groupId}#my-tasks`, 'secondary')
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
      FlexMessageDesignSystem.createText('📤 ไฟล์ที่ส่งจะถูกแนบกับงานโดยอัตโนมัติ', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('📎 ดูรายการไฟล์', 'postback', `action=show_personal_files`, 'primary'),
      FlexMessageDesignSystem.createButton('📋 ดูงานที่ต้องส่ง', 'postback', `action=show_personal_tasks`, 'secondary'),
      FlexMessageDesignSystem.createButton('❌ ยกเลิก', 'postback', `action=submit_cancel&taskId=${task.id}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📎 แนบไฟล์และส่งงาน',
      '📎',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'large'
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

    const buttons = [
      FlexMessageDesignSystem.createButton('ดาวน์โหลด', 'uri', `${config.baseUrl}/api/files/${file.id}/download`, 'primary'),
      ...(this.isPreviewable(file.mimeType) ? [
        FlexMessageDesignSystem.createButton('ดูตัวอย่าง', 'uri', `${config.baseUrl}/api/files/${file.id}/preview`, 'secondary')
      ] : [])
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📎 ไฟล์แนบ',
      '📎',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้างการ์ดแสดงรายการไฟล์แนบของงาน
   */
  static createTaskFilesCard(task: any, files: any[], group: any): FlexMessage {
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
          FlexMessageDesignSystem.createButton('ดูในเว็บ', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}#files`, 'secondary')
        ],
        'large'
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
      ] : [])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูทั้งหมดในเว็บ', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}#files`, 'primary'),
      ...(files.length === 1 ? [
        FlexMessageDesignSystem.createButton('ดาวน์โหลด', 'uri', `${config.baseUrl}/api/files/${files[0].id}/download`, 'secondary')
      ] : [])
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📎 ไฟล์แนบ',
      '📎',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'large'
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
      FlexMessageDesignSystem.createText('กด "ยืนยัน" เพื่อส่งงานพร้อมไฟล์', 'sm', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ยืนยัน', 'postback', `action=confirm_submit&taskId=${task.id}`, 'primary'),
      FlexMessageDesignSystem.createButton('ยกเลิก', 'postback', `action=submit_cancel&taskId=${task.id}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📤 ยืนยันการส่งงาน',
      '📤',
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'large'
    );
  }

  // Helper methods
  private static calculateCompletionScore(task: any): number {
    // คำนวณคะแนนตามความสมบูรณ์ของงาน
    let score = 100;
    
    if (task.status === 'completed') {
      const dueTime = moment(task.dueTime);
      const completedTime = moment(task.completedAt);
      
      if (completedTime.isAfter(dueTime)) {
        const hoursLate = completedTime.diff(dueTime, 'hours');
        score = Math.max(60, 100 - (hoursLate * 2)); // ลดคะแนน 2 คะแนนต่อชั่วโมงที่เกิน
      }
    }
    
    return Math.round(score);
  }

  private static getCompletionStatusEmoji(task: any): string {
    const score = this.calculateCompletionScore(task);
    if (score >= 90) return '🏆';
    if (score >= 70) return '👍';
    return '⚠️';
  }

  private static getCompletionStatusText(task: any): string {
    const score = this.calculateCompletionScore(task);
    if (score >= 90) return 'งานสมบูรณ์แบบ';
    if (score >= 70) return 'งานเสร็จตามกำหนด';
    return 'งานเสร็จช้า';
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
   * สร้างการ์ดแสดงรายการไฟล์ในแชทส่วนตัว
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
      FlexMessageDesignSystem.createText('💡 ส่งไฟล์เพิ่มเติมได้เลย หรือกดปุ่มด้านล่างเพื่อดูงานที่ต้องส่ง', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

              const buttons = [
      FlexMessageDesignSystem.createButton('📋 ดูงานที่ต้องส่ง', 'postback', 'action=show_personal_tasks', 'primary'),
      ...(files.length > 0 && taskId ? [
        FlexMessageDesignSystem.createButton('📤 ส่งงานพร้อมไฟล์', 'postback', `action=submit_with_personal_files&taskId=${taskId}`, 'primary')
      ] : []),
      FlexMessageDesignSystem.createButton('🗑️ ล้างไฟล์ทั้งหมด', 'postback', 'action=clear_personal_files', 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📎 รายการไฟล์ส่วนตัว',
      '📎',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'large'
    );
  }

  /**
   * สร้างการ์ดแสดงงานที่ต้องส่งพร้อมไฟล์ที่แนบได้
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
      FlexMessageDesignSystem.createText('💡 ส่งไฟล์เพิ่มเติมได้เลย หรือกดปุ่มส่งงาน', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('📤 ส่งงาน', 'postback', `action=submit_with_personal_files&taskId=${task.id}`, 'primary'),
      FlexMessageDesignSystem.createButton('📎 ดูไฟล์ทั้งหมด', 'postback', 'action=show_personal_files', 'secondary'),
      FlexMessageDesignSystem.createButton('❌ ยกเลิก', 'postback', 'action=submit_cancel', 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📋 ส่งงานพร้อมไฟล์',
      '📋',
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'large'
    );
  }
}