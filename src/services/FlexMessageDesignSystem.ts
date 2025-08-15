// Flex Message Design System - ระบบออกแบบการ์ดมาตรฐานสำหรับ LINE
// จัดการสี ขนาด layout และ template มาตรฐาน

import { FlexMessage } from '@line/bot-sdk';

export interface FlexMessageTemplate {
  type: 'flex';
  altText: string;
  contents: {
    type: 'bubble';
    size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
    header?: {
      type: 'box';
      layout: 'vertical' | 'horizontal';
      contents: any[];
      backgroundColor?: string;
      paddingAll?: string;
    };
    body?: {
      type: 'box';
      layout: 'vertical' | 'horizontal';
      spacing?: string;
      contents: any[];
      paddingAll?: string;
    };
    footer?: {
      type: 'box';
      layout: 'vertical' | 'horizontal';
      spacing?: string;
      contents: any[];
      paddingAll?: string;
    };
  };
}

export interface TaskCardData {
  id: string;
  title: string;
  description?: string;
  dueTime?: Date;
  assignees?: string[];
  status?: string;
  priority?: string;
  tags?: string[];
  creator?: string;
  completedBy?: string;
  completedAt?: Date;
  fileCount?: number;
  links?: string[];
  changes?: Record<string, any>;
  changedFields?: string[];
  overdueHours?: number;
  submitterName?: string;
  reviewerName?: string;
  newDueTime?: Date;
  completionScore?: number;
  completionStatus?: string;
  completionText?: string;
}

export class FlexMessageDesignSystem {
  // สีมาตรฐานตามประเภทการ์ด
  static colors = {
    // สีหลัก
    primary: '#2196F3',      // งานใหม่/อัปเดต/รอตรวจ
    success: '#4CAF50',      // งานสำเร็จ/รายงาน
    warning: '#FF9800',      // เตือน/งานกำลังดำเนินการ
    danger: '#F44336',       // งานเกินกำหนด/ถูกตีกลับ
    info: '#9C27B0',         // งานที่ถูกส่ง
    neutral: '#9E9E9E',      // งานที่ถูกลบ/ยกเลิก
    
    // สีรอง
    lightGray: '#F8F9FA',    // พื้นหลังอ่อน
    darkGray: '#666666',     // ข้อความรอง
    textPrimary: '#333333',  // ข้อความหลัก
    textSecondary: '#666666', // ข้อความรอง
    white: '#FFFFFF',        // ข้อความขาว
    
    // สีความสำคัญ
    priorityHigh: '#FF5551',
    priorityMedium: '#FFA500',
    priorityLow: '#00C851'
  };

  // ขนาดมาตรฐาน
  static sizes = {
    default: undefined,      // ขนาดปกติ
    compact: 'kilo',        // ขนาดกะทัดรัด
    large: 'mega'           // ขนาดใหญ่
  };

  // Layout มาตรฐาน
  static layouts = {
    header: 'vertical' as const,
    body: 'vertical' as const,
    footer: 'horizontal' as const
  };

  // Padding มาตรฐาน
  static padding = {
    small: 'sm',
    medium: 'md',
    large: 'lg'
  };

  // Spacing มาตรฐาน
  static spacing = {
    small: 'sm',
    medium: 'md',
    large: 'lg'
  };

  // ขนาดข้อความมาตรฐาน
  static textSizes = {
    xs: 'xs',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl'
  };

  // อิโมจิมาตรฐานตามประเภทการ์ด
  static emojis = {
    newTask: '🆕',
    overdue: '⚠️',
    completed: '✅',
    updated: '✏️',
    deleted: '🗑️',
    submitted: '📎',
    review: '📝',
    rejected: '❌',
    report: '📊',
    personal: '📋',
    file: '📁',
    task: '📋',
    reminder: '⏰',
    meeting: '📅',
    approval: '📋'
  };

  // สีตามสถานะงาน
  static getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return this.colors.primary;
      case 'in_progress':
        return this.colors.warning;
      case 'completed':
        return this.colors.success;
      case 'cancelled':
        return this.colors.neutral;
      case 'overdue':
        return this.colors.danger;
      default:
        return this.colors.primary;
    }
  }

  // สีตามความสำคัญ
  static getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return this.colors.priorityHigh;
      case 'medium':
        return this.colors.priorityMedium;
      case 'low':
        return this.colors.priorityLow;
      default:
        return this.colors.priorityLow;
    }
  }

  // ข้อความสถานะ
  static getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'รอดำเนินการ';
      case 'in_progress':
        return 'กำลังดำเนินการ';
      case 'completed':
        return 'เสร็จแล้ว';
      case 'cancelled':
        return 'ยกเลิก';
      case 'overdue':
        return 'เกินกำหนด';
      default:
        return status;
    }
  }

  // ข้อความความสำคัญ
  static getPriorityText(priority: string): string {
    switch (priority) {
      case 'high':
        return 'ความสำคัญสูง';
      case 'medium':
        return 'ความสำคัญปานกลาง';
      case 'low':
        return 'ความสำคัญต่ำ';
      default:
        return 'ไม่ระบุ';
    }
  }

  // สร้างปุ่มมาตรฐาน
  static createButton(
    label: string,
    action: 'postback' | 'uri',
    data: string | { [key: string]: any },
    style: 'primary' | 'secondary' | 'danger' = 'primary',
    height: 'sm' | 'md' = 'sm'
  ) {
    return {
      type: 'button' as const,
      style,
      height,
      action: {
        type: action,
        label,
        ...(action === 'postback' 
          ? { data: typeof data === 'string' ? data : JSON.stringify(data) }
          : { uri: data as string }
        )
      }
    };
  }

  // สร้างข้อความมาตรฐาน
  static createText(
    text: string,
    size: keyof typeof FlexMessageDesignSystem.textSizes = 'sm',
    color: string = this.colors.textPrimary,
    weight?: 'bold',
    wrap?: boolean,
    margin?: keyof typeof FlexMessageDesignSystem.padding
  ) {
    return {
      type: 'text' as const,
      text,
      size: this.textSizes[size],
      color,
      ...(weight && { weight }),
      ...(wrap && { wrap }),
      ...(margin && { margin: this.padding[margin] })
    };
  }

  // สร้าง separator มาตรฐาน
  static createSeparator(margin: keyof typeof FlexMessageDesignSystem.padding = 'medium') {
    return {
      type: 'separator' as const,
      margin: this.padding[margin]
    };
  }

  // สร้าง box มาตรฐาน
  static createBox(
    layout: 'vertical' | 'horizontal',
    contents: any[],
    spacing?: keyof typeof FlexMessageDesignSystem.spacing,
    padding?: keyof typeof FlexMessageDesignSystem.padding,
    backgroundColor?: string,
    cornerRadius?: string
  ) {
    return {
      type: 'box' as const,
      layout,
      contents,
      ...(spacing && { spacing: this.spacing[spacing] }),
      ...(padding && { paddingAll: this.padding[padding] }),
      ...(backgroundColor && { backgroundColor }),
      ...(cornerRadius && { cornerRadius })
    };
  }

  // สร้าง template มาตรฐานสำหรับการ์ดงาน
  static createStandardTaskCard(
    title: string,
    emoji: string,
    color: string,
    content: any[], // รับได้ทั้ง text, separator, และ box components
    buttons: any[],
    size: keyof typeof FlexMessageDesignSystem.sizes = 'default'
  ): FlexMessage {
    return {
      type: 'flex',
      altText: title,
      contents: {
        type: 'bubble',
        ...(size !== 'default' && { size: this.sizes[size] as 'nano' | 'micro' | 'kilo' | 'mega' | 'giga' }),
        header: {
          type: 'box',
          layout: this.layouts.header,
          contents: [
            this.createText(`${emoji} ${title}`, 'lg', this.colors.white, 'bold')
          ],
          backgroundColor: color,
          paddingAll: this.padding.medium
        },
        body: {
          type: 'box',
          layout: this.layouts.body,
          spacing: this.spacing.medium,
          contents: content,
          paddingAll: this.padding.medium
        },
        ...(buttons.length > 0 && {
          footer: {
            type: 'box',
            layout: this.layouts.footer,
            spacing: this.spacing.small,
            contents: buttons,
            paddingAll: this.padding.medium
          }
        })
      }
    };
  }

  // สร้าง template สำหรับการ์ดข้อมูลงาน
  static createTaskInfoCard(taskData: TaskCardData, type: string): FlexMessage {
    const { title, description, dueTime, assignees, priority, tags, status } = taskData;
    
    // กำหนดสีและอิโมจิตามประเภท
    const typeConfig = this.getTypeConfig(type);
    
    // สร้างเนื้อหา
    const content: any[] = [];
    
    if (dueTime) {
      content.push(
        this.createText(`📅 กำหนดส่ง: ${this.formatDate(dueTime)}`, 'sm', this.colors.textPrimary)
      );
    }
    
    if (assignees && assignees.length > 0) {
      content.push(
        this.createText(`👥 ผู้รับผิดชอบ: ${assignees.join(', ')}`, 'sm', this.colors.textPrimary)
      );
    }
    
    if (priority) {
      content.push(
        this.createText(
          `🎯 ${this.getPriorityText(priority)}`,
          'sm',
          this.getPriorityColor(priority),
          'bold'
        )
      );
    }
    
    if (tags && tags.length > 0) {
      content.push(
        this.createText(
          `🏷️ ${tags.map(tag => `#${tag}`).join(' ')}`,
          'sm',
          this.colors.textSecondary,
          undefined,
          true
        )
      );
    }
    
    if (description) {
      content.push(
        this.createText(`📝 ${description}`, 'sm', this.colors.textSecondary, undefined, true)
      );
    }
    
    // สร้างปุ่มมาตรฐาน
    const buttons = [
      this.createButton('ดูรายละเอียด', 'uri', `${this.getBaseUrl()}/dashboard?taskId=${taskData.id}`, 'primary')
    ];
    
    return this.createStandardTaskCard(
      title,
      typeConfig.emoji,
      typeConfig.color,
      content,
      buttons,
      'compact'
    );
  }

  // กำหนดค่าตามประเภทการ์ด
  private static getTypeConfig(type: string): { emoji: string; color: string } {
    switch (type) {
      case 'new':
        return { emoji: this.emojis.newTask, color: this.colors.primary };
      case 'overdue':
        return { emoji: this.emojis.overdue, color: this.colors.danger };
      case 'completed':
        return { emoji: this.emojis.completed, color: this.colors.success };
      case 'updated':
        return { emoji: this.emojis.updated, color: this.colors.primary };
      case 'deleted':
        return { emoji: this.emojis.deleted, color: this.colors.neutral };
      case 'submitted':
        return { emoji: this.emojis.submitted, color: this.colors.info };
      case 'review':
        return { emoji: this.emojis.review, color: this.colors.primary };
      case 'rejected':
        return { emoji: this.emojis.rejected, color: this.colors.danger };
      case 'report':
        return { emoji: this.emojis.report, color: this.colors.success };
      case 'personal':
        return { emoji: this.emojis.personal, color: this.colors.success };
      default:
        return { emoji: this.emojis.task, color: this.colors.primary };
    }
  }

  // จัดรูปแบบวันที่
  private static formatDate(date: Date): string {
    const moment = require('moment-timezone');
    return moment(date).tz('Asia/Bangkok').format('DD/MM/YYYY HH:mm');
  }

  // รับ base URL
  private static getBaseUrl(): string {
    const config = require('@/utils/config').default;
    return config.baseUrl;
  }
}
