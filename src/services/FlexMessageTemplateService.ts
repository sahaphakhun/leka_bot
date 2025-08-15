// Flex Message Template Service - บริการสร้างการ์ดมาตรฐาน
// ใช้ Design System เพื่อสร้างการ์ดที่สม่ำเสมอ

import { FlexMessageDesignSystem, TaskCardData } from './FlexMessageDesignSystem';
import { FlexMessage } from '@line/bot-sdk';
import moment from 'moment-timezone';
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
      'compact'
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
      'compact'
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
      'compact'
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
      'compact'
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
      'compact'
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
      'compact'
    );
  }

  /**
   * สร้างการ์ดงานรอตรวจ
   */
  static createReviewRequestCard(task: any, group: any, details: any, dueText: string): FlexMessage {
    const submitterName = details.submitterDisplayName || 'ไม่ระบุ';

    const content = [
      FlexMessageDesignSystem.createText(task.description || 'ไม่มีคำอธิบาย', 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true),
      FlexMessageDesignSystem.createSeparator(),
      FlexMessageDesignSystem.createBox('horizontal', [
        FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('👤 ผู้ส่ง', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(submitterName, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold')
        ]),
        FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('📅 กำหนดตรวจ', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(dueText, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold')
        ])
      ])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูงาน', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      FlexMessageDesignSystem.emojis.review,
      FlexMessageDesignSystem.colors.primary,
      content,
      buttons,
      'compact'
    );
  }

  /**
   * สร้างการ์ดงานที่ถูกตีกลับ
   */
  static createRejectedTaskCard(task: any, group: any, newDueTime: Date, reviewerDisplayName?: string): FlexMessage {
    const newDueText = moment(newDueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
    const reviewerName = reviewerDisplayName || 'ไม่ระบุ';

    const content = [
      FlexMessageDesignSystem.createText(task.description || 'ไม่มีคำอธิบาย', 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true),
      FlexMessageDesignSystem.createSeparator(),
      FlexMessageDesignSystem.createBox('horizontal', [
        FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('👤 ผู้ตรวจ', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(reviewerName, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold')
        ]),
        FlexMessageDesignSystem.createBox('vertical', [
          FlexMessageDesignSystem.createText('📅 กำหนดส่งใหม่', 'xs', FlexMessageDesignSystem.colors.textSecondary),
          FlexMessageDesignSystem.createText(newDueText, 'sm', FlexMessageDesignSystem.colors.danger, 'bold')
        ])
      ])
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูงาน', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}&taskId=${task.id}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      FlexMessageDesignSystem.emojis.rejected,
      FlexMessageDesignSystem.colors.danger,
      content,
      buttons,
      'compact'
    );
  }

  /**
   * สร้างการ์ดรายงานรายวัน
   */
  static createDailySummaryCard(group: any, tasks: any[], timezone: string): FlexMessage {
    const overdueTasks = tasks.filter(t => t.status === 'overdue');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const date = moment().tz(timezone).format('DD/MM/YYYY');

    const content = [
      FlexMessageDesignSystem.createText(`🗓️ วันที่ ${date}`, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, undefined, 'medium'),
      FlexMessageDesignSystem.createSeparator(),
      FlexMessageDesignSystem.createText(`📋 งานค้างทั้งหมด: ${tasks.length} งาน`, 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createBox('vertical', [
        FlexMessageDesignSystem.createText(`⚠️ งานเกินกำหนด: ${overdueTasks.length} งาน`, 'sm', FlexMessageDesignSystem.colors.danger),
        FlexMessageDesignSystem.createText(`⏳ งานกำลังดำเนินการ: ${inProgressTasks.length} งาน`, 'sm', FlexMessageDesignSystem.colors.warning),
        FlexMessageDesignSystem.createText(`📝 งานรอดำเนินการ: ${pendingTasks.length} งาน`, 'sm', FlexMessageDesignSystem.colors.primary)
      ], 'small')
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดู Dashboard', 'uri', `${config.baseUrl}/dashboard?groupId=${group.id}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      group.name,
      FlexMessageDesignSystem.emojis.report,
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'compact'
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
    const header = `📋 การ์ดงานส่วนบุคคล - ${assignee.displayName}`;
    const subtitle = `🗓️ วันที่ ${date} | 📊 งานค้าง ${tasks.length} งาน`;

    const content = [
      FlexMessageDesignSystem.createText(subtitle, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator()
    ];

    // เพิ่มงานเกินกำหนด
    if (overdueTasks.length > 0) {
      content.push(
        FlexMessageDesignSystem.createText('⚠️ งานเกินกำหนด:', 'sm', FlexMessageDesignSystem.colors.danger, 'bold', undefined, 'medium')
      );
      
      overdueTasks.forEach(task => {
        content.push(
          FlexMessageDesignSystem.createBox('vertical', [
            FlexMessageDesignSystem.createText(task.title, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold', true),
            FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${moment(task.dueTime).tz(timezone).format('DD/MM/YYYY HH:mm')}`, 'xs', FlexMessageDesignSystem.colors.danger)
          ], 'small', 'small', '#FFF2F2', 'sm') as any
        );
      });
    }

    // เพิ่มงานกำลังดำเนินการ
    if (inProgressTasks.length > 0) {
      content.push(
        FlexMessageDesignSystem.createText('⏳ งานกำลังดำเนินการ:', 'sm', FlexMessageDesignSystem.colors.warning, 'bold', undefined, 'medium')
      );
      
      inProgressTasks.forEach(task => {
        content.push(
          FlexMessageDesignSystem.createBox('vertical', [
            FlexMessageDesignSystem.createText(task.title, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold', true),
            FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${moment(task.dueTime).tz(timezone).format('DD/MM/YYYY HH:mm')}`, 'xs', FlexMessageDesignSystem.colors.warning)
          ], 'small', 'small', '#FFF8E1', 'sm') as any
        );
      });
    }

    // เพิ่มงานรอดำเนินการ
    if (pendingTasks.length > 0) {
      content.push(
        FlexMessageDesignSystem.createText('📝 งานรอดำเนินการ:', 'sm', FlexMessageDesignSystem.colors.primary, 'bold', undefined, 'medium')
      );
      
      pendingTasks.forEach(task => {
        content.push(
          FlexMessageDesignSystem.createBox('vertical', [
            FlexMessageDesignSystem.createText(task.title, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold', true),
            FlexMessageDesignSystem.createText(`📅 กำหนดส่ง: ${moment(task.dueTime).tz(timezone).format('DD/MM/YYYY HH:mm')}`, 'xs', FlexMessageDesignSystem.colors.primary)
          ], 'small', 'small', '#F0F8FF', 'sm') as any
        );
      });
    }

    const buttons = [
      FlexMessageDesignSystem.createButton('ดู Dashboard', 'uri', `${config.baseUrl}/dashboard?groupId=${assignee.groupId}`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      header,
      FlexMessageDesignSystem.emojis.personal,
      FlexMessageDesignSystem.colors.success,
      content,
      buttons,
      'compact'
    );
  }

  /**
   * สร้างการ์ดสำหรับการแนบไฟล์เมื่อส่งงาน
   */
  static createFileAttachmentCard(task: any, group: any, assignee: any): FlexMessage {
    const content = [
      FlexMessageDesignSystem.createText('📎 การแนบไฟล์สำหรับงาน', 'md', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText(`📋 ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('กรุณาพิมพ์ข้อความแนบ (ถ้ามี) และส่งไฟล์ที่ต้องการแนบในแชทนี้และกดส่ง', 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true),
      FlexMessageDesignSystem.createText('⚠️ ต้องมีไฟล์อย่างน้อย 1 ไฟล์', 'xs', FlexMessageDesignSystem.colors.warning, 'bold'),
      FlexMessageDesignSystem.createSeparator('small'),
      FlexMessageDesignSystem.createText('📤 ไฟล์ที่ส่งจะถูกแนบกับงานโดยอัตโนมัติ', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ส่ง', 'postback', `action=submit_with_files&taskId=${task.id}`, 'primary'),
      FlexMessageDesignSystem.createButton('ยกเลิก', 'postback', `action=submit_cancel&taskId=${task.id}`, 'secondary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📎 แนบไฟล์และส่งงาน',
      '📎',
      FlexMessageDesignSystem.colors.info,
      content,
      buttons,
      'compact'
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
      'compact'
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
}
