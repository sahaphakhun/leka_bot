// Command Service - ประมวลผลคำสั่งจากบอท

import { BotCommand } from '@/types';
import { TaskService } from './TaskService';
import { UserService } from './UserService';
import { FileService } from './FileService';
import { FlexMessageDesignSystem } from './FlexMessageDesignSystem';
import { config } from '@/utils/config';
import { serviceContainer } from '@/utils/serviceContainer';
import { logger } from '@/utils/logger';
import { formatFileSize } from '@/utils/common';
import { UrlBuilder } from '@/utils/urlBuilder';

export class CommandService {
  private taskService: TaskService;
  private userService: UserService;
  private fileService: FileService;

  constructor() {
    this.taskService = serviceContainer.get<TaskService>('TaskService');
    this.userService = serviceContainer.get<UserService>('UserService');
    this.fileService = serviceContainer.get<FileService>('FileService');
  }

  /**
   * ประมวลผลคำสั่งหลัก
   */
  public async executeCommand(command: BotCommand): Promise<string | any> {
    try {
      logger.info('Executing command:', { command: command.command, args: command.args });

      switch (command.command) {
        case '/setup':
          return await this.handleSetupCommand(command);

        case '/help':
          return this.getHelpMessage();

        case '/whoami':
          return await this.handleWhoAmICommand(command);

        case 'เซฟไฟล์':
        case '/เซฟไฟล์':
          return await this.handleSaveFilesCommand(command);

        case 'เพิ่มงาน':
        case 'add':
          return await this.handleAddTaskCommand(command);

        case '/delete':
        case 'delete':
          return await this.handleDeleteAllTasksCommand(command);

        default:
          return `ไม่พบคำสั่ง "${command.command}" ค่ะ\nพิมพ์ "@เลขา /help" เพื่อดูคำสั่งทั้งหมด`;
      }

    } catch (error) {
      logger.error('Error executing command:', error);
      return 'เกิดข้อผิดพลาดในการประมวลผลคำสั่ง กรุณาลองใหม่อีกครั้ง';
    }
  }

  /**
   * คำสั่ง /setup - ตั้งค่าและเข้าใช้ Dashboard
   */
  private async handleSetupCommand(command: BotCommand): Promise<string> {
    try {
      // ตรวจสอบว่ามีการแท็กผู้ใช้หรือไม่ (สำหรับตั้งค่าผู้บังคับบัญชา)
      if (command.mentions && command.mentions.length > 0) {
        return await this.handleSetupSupervisors(command);
      }

      // สร้างลิงก์ Dashboard (ทุกคนในกลุ่มสามารถใช้ได้)
      const dashboardUrl = UrlBuilder.getDashboardUrl(command.groupId);

      return `🔧 Dashboard เลขาบอท

📊 เข้าใช้ Dashboard:
${dashboardUrl}

🎯 ฟีเจอร์หลัก:
• 📋 งาน: สร้างงาน/แก้งาน/เลื่อนกำหนด/ปิดงาน
• 🔁 งานประจำ: รายสัปดาห์/รายเดือน (สร้างอัตโนมัติ)
• 📎 ส่งงาน: แนบไฟล์/หมายเหตุ จากเว็บหรือในแชท
• ✅ ตรวจงาน: อนุมัติ/ตีกลับ + ความเห็น + กำหนดส่งใหม่
• ⏰ เตือน/ติดตาม: เตือนกำหนด/เกินกำหนด/ตรวจล่าช้า
• 📁 คลังไฟล์: แยก "ระหว่างส่งงาน/สำเร็จแล้ว"
• 🏆 Leaderboard & KPI: คะแนนและสถิติกลุ่ม
• ⚙️ ตั้งค่ากลุ่ม/เขตเวลา/ปฏิทิน

📊 การตั้งค่าผู้บังคับบัญชา (สำคัญ):
พิมพ์ "@เลขา /setup @นายเอ @นายบี" เพื่อตั้งค่าผู้บังคับบัญชา
ระบบจะส่งสรุปงานของผู้ใต้บังคับบัญชาให้หัวหน้างานทุกวันจันทร์เวลา 08:00 น.`;

    } catch (error) {
      logger.error('Error in setup command:', error);
      return 'เกิดข้อผิดพลาดในการสร้างลิงก์ Dashboard กรุณาลองใหม่';
    }
  }

  /**
   * จัดการการตั้งค่าผู้บังคับบัญชา
   */
  private async handleSetupSupervisors(command: BotCommand): Promise<string> {
    try {
      const groupId = command.groupId;
      const supervisorIds = command.mentions || [];
      
      if (supervisorIds.length === 0) {
        return '❌ กรุณาแท็กผู้ใช้ที่ต้องการตั้งเป็นผู้บังคับบัญชา\n\n📊 ระบบจะส่งสรุปงานของผู้ใต้บังคับบัญชาให้หัวหน้างานทุกวันจันทร์เวลา 08:00 น.\n\nตัวอย่าง: /setup @นายเอ @นายบี';
      }

      // ตรวจสอบสิทธิ์ (เฉพาะ admin เท่านั้นที่ตั้งค่าผู้บังคับบัญชาได้)
      const isAdmin = await this.userService.isUserAdminInGroup(command.userId, groupId);
      if (!isAdmin) {
        return '❌ คุณไม่มีสิทธิ์ในการตั้งค่าผู้บังคับบัญชา (ต้องเป็น admin เท่านั้น)';
      }

      // อัปเดตการตั้งค่ากลุ่ม
      const success = await this.taskService.updateGroupSupervisors(groupId, supervisorIds);
      
      if (success) {
        const supervisorNames = supervisorIds.map(id => `@${id}`).join(' ');
        return `✅ ตั้งค่าผู้บังคับบัญชาเรียบร้อยแล้ว!

👥 ผู้บังคับบัญชา:
${supervisorNames}

📊 ระบบจะส่งสรุปงานของผู้ใต้บังคับบัญชาให้หัวหน้างานทุกวันจันทร์เวลา 08:00 น.

💡 สามารถแก้ไขได้โดยใช้คำสั่ง /setup แท็กผู้ใช้ใหม่`;
      } else {
        return '❌ เกิดข้อผิดพลาดในการตั้งค่าผู้บังคับบัญชา กรุณาลองใหม่อีกครั้ง';
      }

    } catch (error) {
      logger.error('Error in setup supervisors command:', error);
      return 'เกิดข้อผิดพลาดในการตั้งค่าผู้บังคับบัญชา กรุณาลองใหม่';
    }
  }

  /**
   * คำสั่ง /help - แสดงคำสั่งทั้งหมด
   */
  private getHelpMessage(): string {
    return `📖 คำสั่งเลขาบอท (สรุปล่าสุด)

🔧 การตั้งค่า
• /setup – เปิด Dashboard กลุ่ม: งาน/งานประจำ/ไฟล์/Leaderboard/ตั้งค่า
• /setup @นายเอ @นายบี – ตั้งค่าผู้บังคับบัญชา (ส่งสรุปงานทุกวันจันทร์ 08:00)
• /whoami – ดูข้อมูลของฉัน (อีเมล/เขตเวลา/บทบาท)

📋 งาน (ในแชท)
• เพิ่มงาน "ชื่องาน" @คน @me due 25/12 14:00 – สร้างงานเร็ว
• เพิ่มงาน – แสดงการ์ดพร้อมปุ่มไปหน้าเว็บเพิ่มงาน

📁 ไฟล์
• เซฟไฟล์ – บันทึกไฟล์ทั้งหมดใน 1 ชั่วโมงล่าสุด

💡 เคล็ดลับ
• ใช้ #แท็ก ในข้อความสร้างงานได้
• งานประจำ (สัปดาห์/เดือน) ตั้งค่าใน Dashboard แล้วระบบจะสร้างให้อัตโนมัติ
• Dashboard: ใช้คำสั่ง /setup เพื่อรับลิงก์ของกลุ่มคุณ
• 📊 ตั้งค่าผู้บังคับบัญชา: /setup @หัวหน้างาน1 @หัวหน้างาน2 (ส่งสรุปงานทุกวันจันทร์ 08:00)
• การทำงานอื่นๆ (ส่งงาน, ตรวจงาน, จัดการงาน) ใช้ผ่านการกดปุ่มบนการ์ดในแชทหรือผ่านเว็บไซต์`;
  }

















  /**
   * เพิ่มงานจากคำสั่งธรรมชาติ
   */
  private async handleAddTaskCommand(command: BotCommand): Promise<string | any> {
    // เปลี่ยนเป็นแสดงการ์ดพร้อมปุ่มไปหน้าเว็บเพิ่มงาน
    try {
      const newTaskUrl = UrlBuilder.getNewTaskUrl(command.groupId, command.userId);

      const content = [
        FlexMessageDesignSystem.createText(
          'กดปุ่มด้านล่างเพื่อเปิดหน้าเว็บกรอกข้อมูลงาน (ชื่องาน กำหนดส่ง ผู้รับผิดชอบ แท็ก ฯลฯ) โดยระบบเลือกกลุ่มให้อัตโนมัติ',
          'sm',
          FlexMessageDesignSystem.colors.textSecondary,
          undefined,
          true
        )
      ];

      const buttons = [
        FlexMessageDesignSystem.createButton('กรอกข้อมูลงาน', 'uri', newTaskUrl, 'primary'),
        FlexMessageDesignSystem.createButton(
          'เปิด Dashboard กลุ่ม',
          'uri',
          UrlBuilder.getDashboardUrl(command.groupId),
          'secondary'
        )
      ];

      const flexMessage = FlexMessageDesignSystem.createStandardTaskCard(
        'เพิ่มงานใหม่',
        '➕',
        FlexMessageDesignSystem.colors.primary,
        content,
        buttons,
        'compact'
      );

      return flexMessage;
    } catch (error) {
      logger.error('Error generating add task card:', error);
      return 'เกิดข้อผิดพลาดในการสร้างการ์ดเพิ่มงาน กรุณาลองใหม่';
    }
  }



  /**
   * คำสั่งเซฟไฟล์ - บันทึกไฟล์ทั้งหมดใน 1 ชั่วโมงล่าสุด
   */
  private async handleSaveFilesCommand(command: BotCommand): Promise<string | any> {
    try {
      const groupId = command.groupId;
      const userId = command.userId;

      // ดึงไฟล์ที่ส่งในกลุ่มในช่วง 1 ชั่วโมงล่าสุด
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // ใช้ FileService เพื่อดึงไฟล์ใน 1 ชั่วโมงล่าสุด
      const { files } = await this.fileService.getGroupFiles(groupId, { 
        limit: 50,
        startDate: oneHourAgo
      });

      if (files.length === 0) {
        return 'ไม่พบไฟล์ใหม่ใน 1 ชั่วโมงล่าสุดค่ะ 📁';
      }

      // สร้าง Flex Message แสดงไฟล์พร้อมปุ่มผูกงาน
      const fileContents = files.slice(0, 5).map(file => 
        FlexMessageDesignSystem.createBox('horizontal', [
          FlexMessageDesignSystem.createText(`📄 ${file.originalName}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
          FlexMessageDesignSystem.createText(formatFileSize(file.size), 'xs', FlexMessageDesignSystem.colors.textSecondary)
        ])
      );

      const content = [
        FlexMessageDesignSystem.createText('ไฟล์ทั้งหมดถูกบันทึกแล้ว สามารถผูกกับงานได้ทันที', 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true),
        ...fileContents
      ];

      const buttons = [
        FlexMessageDesignSystem.createButton(
          'ผูกไฟล์กับงาน',
          'postback',
          `action=link_files&fileIds=${files.map(f => f.id).join(',')}`,
          'primary'
        ),
        FlexMessageDesignSystem.createButton(
          'ดูไฟล์ทั้งหมด',
          'postback',
          `action=view_saved_files&fileIds=${files.map(f => f.id).join(',')}`,
          'secondary'
        )
      ];

      const flexMessage = FlexMessageDesignSystem.createStandardTaskCard(
        `📁 เซฟไฟล์สำเร็จ (${files.length} รายการ)`,
        '📁',
        FlexMessageDesignSystem.colors.success,
        content,
        buttons,
        'compact'
      );

      return flexMessage;

    } catch (error) {
      logger.error('Error in save files command:', error);
      return 'เกิดข้อผิดพลาดในการเซฟไฟล์ กรุณาลองใหม่อีกครั้ง';
    }
  }

  /**
   * คำสั่ง /delete - ลบงานทั้งหมดในกลุ่ม (รีเซต)
   */
  private async handleDeleteAllTasksCommand(command: BotCommand): Promise<string> {
    try {
      const groupId = command.groupId;
      const userId = command.userId;

      // ตรวจสอบสิทธิ์ (เฉพาะ admin เท่านั้นที่ลบงานทั้งหมดได้)
      const isAdmin = await this.userService.isUserAdminInGroup(userId, groupId);
      if (!isAdmin) {
        return '❌ คุณไม่มีสิทธิ์ในการลบงานทั้งหมด (ต้องเป็น admin เท่านั้น)';
      }

      // ตรวจสอบว่ามีงานในกลุ่มหรือไม่
      const tasks = await this.taskService.getTasksByGroup(groupId);
      if (tasks.length === 0) {
        return '📋 ไม่มีงานในกลุ่มนี้ให้ลบค่ะ';
      }

      // ลบงานทั้งหมดในกลุ่ม
      let deletedCount = 0;
      for (const task of tasks) {
        try {
          await this.taskService.deleteTask(task.id);
          deletedCount++;
        } catch (error) {
          logger.warn(`Failed to delete task ${task.id}:`, error);
        }
      }

      return `🗑️ ลบงานทั้งหมดเรียบร้อยแล้ว!

📊 สรุป:
• ลบงานสำเร็จ: ${deletedCount} รายการ
• งานทั้งหมดในกลุ่มถูกลบแล้ว
• ระบบถูกรีเซตเรียบร้อย

💡 หมายเหตุ: การลบงานจะลบข้อมูลทั้งหมดรวมถึงไฟล์ที่แนบมาด้วย`;

    } catch (error) {
      logger.error('Error in delete all tasks command:', error);
      return 'เกิดข้อผิดพลาดในการลบงาน กรุณาลองใหม่อีกครั้ง';
    }
  }

  /**
   * คำสั่ง /whoami - ตรวจสอบข้อมูลผู้ใช้
   */
  private async handleWhoAmICommand(command: BotCommand): Promise<string> {
    try {
      const user = await this.userService.findByLineUserId(command.userId);
      
      if (!user) {
        return 'ไม่พบข้อมูลของคุณในระบบ กรุณาติดต่อผู้ดูแลกลุ่ม';
      }

      const groups = await this.userService.getUserGroups(user.id);
      const currentGroup = groups.find(g => g.lineGroupId === command.groupId);

      let response = `👤 ข้อมูลของคุณ\n\n`;
      response += `📱 ชื่อ LINE: ${user.displayName}\n`;
      
      if (user.realName) {
        response += `👤 ชื่อจริง: ${user.realName}\n`;
      }
      
      if (user.email) {
        response += `📧 อีเมล: ${user.email} ✅\n`;
      } else {
        response += `📧 อีเมล: ยังไม่ได้ลิงก์ ❌\n`;
      }

      response += `🌍 เขตเวลา: ${user.timezone}\n`;
      
      if (currentGroup) {
        response += `👑 บทบาท: ${currentGroup.role === 'admin' ? 'ผู้ดูแล' : 'สมาชิก'}\n`;
      }

      // เพิ่มลิงก์หน้าโปรไฟล์ (เว็บ) ให้ผู้ใช้กรอก/แก้ไขข้อมูลได้ทันที
      const profileUrl = `${config.baseUrl}/dashboard/profile?lineUserId=${encodeURIComponent(command.userId)}`;
      response += `\n\n🔗 เปิดหน้าโปรไฟล์ (เว็บ): ${profileUrl}`;

      if (!user.email) {
        response += `\n📧 แนะนำ: ลิงก์อีเมลในหน้าโปรไฟล์เพื่อรับอีเมลแจ้งเตือน`;
      }

      return response;

    } catch (error) {
      logger.error('Error in whoami command:', error);
      return 'เกิดข้อผิดพลาดในการดึงข้อมูล';
    }
  }
}