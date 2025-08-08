// Command Service - ประมวลผลคำสั่งจากบอท

import { BotCommand, Task } from '@/types';
import { TaskService } from './TaskService';
import { UserService } from './UserService';
import { FileService } from './FileService';
import { LineService } from './LineService';
import { config } from '@/utils/config';
import moment from 'moment-timezone';

export class CommandService {
  private taskService: TaskService;
  private userService: UserService;
  private fileService: FileService;
  private lineService: LineService;

  constructor() {
    this.taskService = new TaskService();
    this.userService = new UserService();
    this.fileService = new FileService();
    this.lineService = new LineService();
  }

  /**
   * ประมวลผลคำสั่งหลัก
   */
  public async executeCommand(command: BotCommand): Promise<string | any> {
    try {
      console.log('🤖 Executing command:', command.command, command.args);

      switch (command.command) {
        case '/setup':
          return await this.handleSetupCommand(command);

        case '/help':
          return this.getHelpMessage();

        case '/task':
          return await this.handleTaskCommand(command);

        // คำสั่งในแชทสำหรับเวิร์กโฟลว์ตรวจงาน/ส่งงาน ให้ใช้งานได้จากแชททันที
        case '/submit':
          return await this.handleSubmitCommand(command);
        case '/approve':
          return await this.handleApproveCommand(command);
        case '/reject':
          return await this.handleRejectCommand(command);

        case '/files':
          return await this.handleFilesCommand(command);

        case '/whoami':
          return await this.handleWhoAmICommand(command);

        case 'เพิ่มงาน':
        case 'add':
          return await this.handleAddTaskCommand(command);

        default:
          return `ไม่พบคำสั่ง "${command.command}" ค่ะ\nพิมพ์ "@เลขา /help" เพื่อดูคำสั่งทั้งหมด`;
      }

    } catch (error) {
      console.error('❌ Error executing command:', error);
      return 'เกิดข้อผิดพลาดในการประมวลผลคำสั่ง กรุณาลองใหม่อีกครั้ง';
    }
  }

  /**
   * คำสั่ง /setup - ตั้งค่าและเข้าใช้ Dashboard
   */
  private async handleSetupCommand(command: BotCommand): Promise<string> {
    try {
      // สร้างลิงก์ Dashboard (ทุกคนในกลุ่มสามารถใช้ได้)
      const dashboardUrl = `${config.baseUrl}/dashboard?groupId=${command.groupId}`;

      return `🔧 Dashboard เลขาบอท

📊 เข้าใช้ Dashboard:
${dashboardUrl}

🎯 ฟีเจอร์ที่ใช้ได้:
• 📅 ปฏิทินและรายการงาน
• 📋 สร้างและจัดการงาน
• 📁 ไฟล์ที่เก็บในกลุ่ม
• 🏆 คะแนนและ Leaderboard
• ⚙️ ตั้งค่ากลุ่ม`;

    } catch (error) {
      console.error('❌ Error in setup command:', error);
      return 'เกิดข้อผิดพลาดในการสร้างลิงก์ Dashboard กรุณาลองใหม่';
    }
  }

  /**
   * คำสั่ง /help - แสดงคำสั่งทั้งหมด
   */
  private getHelpMessage(): string {
    return `📖 คำสั่งเลขาบอท

🔧 **การตั้งค่า**
• แท็กบอท /setup - ตั้งค่าเริ่มต้นและเข้าใช้ Dashboard
• แท็กบอท /whoami - ตรวจสอบข้อมูลของฉัน

📋 **จัดการงาน**
• แท็กบอท เพิ่มงาน "ชื่องาน" @คน1 @คน2 @me due dd/mm hh:mm
• แท็กบอท /task add "ชื่องาน" @คน @me due dd/mm hh:mm
• แท็กบอท /task list - ดูรายการงาน
• แท็กบอท /task mine - งานของฉัน
• แท็กบอท /task done <รหัสงาน> - ปิดงาน
• แท็กบอท /task move <รหัสงาน> <วันเวลาใหม่> - เลื่อนงาน

📁 **จัดการไฟล์**
• แท็กบอท /files list - ดูไฟล์ทั้งหมด
• แท็กบอท /files search <คำค้น> - ค้นหาไฟล์

🎯 **วิธีใช้งาน**
• แท็กบอทจริง: แท็กในแชต LINE แล้วพิมพ์คำสั่ง
• แท็กแบบข้อความ: @เลขา <คำสั่ง>
• คำสั่งตรง: /<คำสั่ง> (บางคำสั่ง)

👥 **การระบุผู้รับผิดชอบ**
• @me - เพิ่มตัวเองรับผิดชอบ
• แท็กสมาชิก - แท็กคนในกลุ่ม
• @ชื่อ - พิมพ์ชื่อสมาชิก

💡 **เคล็ดลับ**
- ส่งไฟล์ในกลุ่มเพื่อบันทึกอัตโนมัติ
- ใช้แท็ก (#แท็ก) ในการสร้างงานเพื่อจัดหมวดหมู่
- ดูแดชบอร์ดที่: ${config.baseUrl}/dashboard?groupId=<ID_กลุ่ม>`;
  }

  /**
   * คำสั่ง /task - จัดการงาน
   */
  private async handleTaskCommand(command: BotCommand): Promise<string | any> {
    const [subCommand, ...args] = command.args;

    switch (subCommand) {
      case 'list':
        return await this.listTasks(command, args);
      
      case 'mine':
        return await this.listMyTasks(command);
      
      case 'done':
        return await this.completeTask(command, args);
      
      case 'move':
        return await this.moveTask(command, args);
      
      case 'add':
        return await this.addTaskFromCommand(command, args);

      default:
        return 'คำสั่งย่อยไม่ถูกต้อง ใช้: list, mine, done, move, add';
    }
  }

  /**
   * ส่งงาน (ผู้รับงานแนบไฟล์ในแชท แล้วพิมพ์ /submit <รหัสงาน หรือ ชื่องาน> [หมายเหตุ]
   * หมายเหตุ: ระบบจะนำไฟล์ล่าสุดของผู้ใช้ในกลุ่ม (24 ชม.) ไปผูกกับงานโดยอัตโนมัติ
   */
  private async handleSubmitCommand(command: BotCommand): Promise<string> {
    try {
      const [taskQuery, ...noteParts] = command.args;
      if (!taskQuery) return 'กรุณาระบุรหัสงานหรือชื่องาน เช่น /submit abc123 รายงานเดือนเม.ย.';

      // ค้นหางานจากรหัสหรือชื่อ
      const { tasks } = await this.taskService.searchTasks(command.groupId, taskQuery, { limit: 1 });
      if (tasks.length === 0) return `ไม่พบงาน "${taskQuery}"`; 

      const task = tasks[0];

      // หาไฟล์ที่ผู้ใช้คนนี้เพิ่งส่งในกลุ่มล่าสุด (24 ชม.)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { files } = await this.fileService.getGroupFiles(command.groupId, {
        uploadedBy: command.userId,
        startDate: since,
        limit: 20
      } as any);

      if (!files || files.length === 0) {
        return 'ไม่พบไฟล์ที่คุณส่งใน 24 ชั่วโมงที่ผ่านมา กรุณาส่งไฟล์ในแชทก่อน แล้วพิมพ์ /submit อีกครั้ง';
      }

      // ใช้ไฟล์ล่าสุด 1-5 ไฟล์
      const fileIds = files.slice(0, 5).map(f => f.id);
      const note = noteParts.join(' ');

      await this.taskService.recordSubmission(task.id, command.userId, fileIds, note);
      return `📥 รับไฟล์ ${fileIds.length} ไฟล์ และบันทึกการส่งงานให้ "${task.title}" แล้วค่ะ\nรอผู้ตรวจยืนยันภายใน 2 วัน`;
    } catch (error) {
      console.error('❌ submit error:', error);
      return 'เกิดข้อผิดพลาดในการส่งงาน กรุณาลองใหม่';
    }
  }

  /** ผู้ตรวจอนุมัติงาน */
  private async handleApproveCommand(command: BotCommand): Promise<string> {
    try {
      const [taskQuery] = command.args;
      if (!taskQuery) return 'ระบุรหัสงานหรือชื่องาน เช่น /approve abc123';
      const { tasks } = await this.taskService.searchTasks(command.groupId, taskQuery, { limit: 1 });
      if (tasks.length === 0) return `ไม่พบงาน "${taskQuery}"`;
      const task = tasks[0];

      try {
        await this.taskService.completeTask(task.id, command.userId);
      } catch (err: any) {
        return `❌ อนุมัติไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`;
      }
      return `✅ อนุมัติงาน "${task.title}" สำเร็จ และปิดงานเรียบร้อย`;
    } catch (error) {
      console.error('❌ approve error:', error);
      return 'เกิดข้อผิดพลาดในการอนุมัติงาน';
    }
  }

  /** ผู้ตรวจตีกลับงาน + กำหนดวันใหม่ */
  private async handleRejectCommand(command: BotCommand): Promise<string> {
    try {
      if (command.args.length < 2) {
        return 'รูปแบบไม่ถูกต้อง\nใช้: /reject <รหัสงานหรือชื่องาน> <กำหนดส่งใหม่ เช่น 25/12 14:00> [ความเห็น]';
      }
      const [taskQuery, ...rest] = command.args;
      const newDueText = rest.shift();
      const comment = rest.join(' ');

      const newDue = this.parseDateTime(newDueText!);
      if (!newDue) return 'รูปแบบวันเวลาไม่ถูกต้อง เช่น 25/12 14:00';

      const { tasks } = await this.taskService.searchTasks(command.groupId, taskQuery, { limit: 1 });
      if (tasks.length === 0) return `ไม่พบนงาน "${taskQuery}"`;
      const task = tasks[0];

      // อัปเดตงานด้วย reviewAction: 'revise'
      await this.taskService.updateTask(task.id, {
        dueTime: newDue,
        // ใส่ฟิลด์พิเศษเพื่อบันทึก workflow
        ...( { reviewAction: 'revise', reviewerUserId: command.userId, reviewerComment: comment } as any )
      });

      return `❌ ตีกลับงาน "${task.title}" และกำหนดวันส่งใหม่เป็น ${moment(newDue).format('DD/MM/YYYY HH:mm')} แล้ว`;
    } catch (error) {
      console.error('❌ reject error:', error);
      return 'เกิดข้อผิดพลาดในการตีกลับงาน';
    }
  }

  /**
   * รายการงาน
   */
  private async listTasks(command: BotCommand, args: string[]): Promise<string | any> {
    const filter = args[0] || 'all';
    const limit = 5; // จำกัดแสดง 5 งานล่าสุด

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    let status: Task['status'] | undefined;

    // กำหนดตัวกรอง
    switch (filter) {
      case 'today':
      case 'วันนี้':
        startDate = moment().startOf('day').toDate();
        endDate = moment().endOf('day').toDate();
        break;
      
      case 'week':
      case 'สัปดาห์':
        startDate = moment().startOf('week').toDate();
        endDate = moment().endOf('week').toDate();
        break;
      
      case 'pending':
      case 'รอ':
        status = 'pending';
        break;
    }

    const { tasks } = await this.taskService.getGroupTasks(command.groupId, {
      startDate,
      endDate,
      status,
      limit
    });

    if (tasks.length === 0) {
      return 'ไม่พบงานที่ตรงกับเงื่อนไขค่ะ ✨';
    }

    let response = `📋 รายการงาน (${filter})\n\n`;
    
    tasks.forEach((task, index) => {
      const dueDate = moment(task.dueTime).format('DD/MM HH:mm');
      const statusIcon = {
        pending: '⏳',
        in_progress: '🔄',
        completed: '✅',
        cancelled: '❌',
        overdue: '⚠️'
      }[task.status];

      const assigneeNames = task.assignedUsers?.map(u => u.displayName).join(', ') || 'ไม่ระบุ';

      response += `${index + 1}. ${statusIcon} ${task.title}
📅 ${dueDate} | 👥 ${assigneeNames}
`;
      
      if (task.tags && task.tags.length > 0) {
        response += `🏷️ ${task.tags.map(tag => `#${tag}`).join(' ')}\n`;
      }
      
      response += '\n';
    });

    response += `📊 ดูทั้งหมดได้ที่: ${config.baseUrl}/dashboard?groupId=${command.groupId}`;

    return response;
  }

  /**
   * งานของฉัน
   */
  private async listMyTasks(command: BotCommand): Promise<string> {
    const { tasks } = await this.taskService.getGroupTasks(command.groupId, {
      assigneeId: command.userId,
      status: 'pending'
    });

    if (tasks.length === 0) {
      return 'คุณไม่มีงานที่รอดำเนินการค่ะ 🎉';
    }

    let response = '📋 งานของฉัน\n\n';
    
    tasks.forEach((task, index) => {
      const dueDate = moment(task.dueTime).format('DD/MM HH:mm');
      const priority = {
        high: '🔥',
        medium: '📋',
        low: '📝'
      }[task.priority];

      response += `${index + 1}. ${priority} ${task.title}
📅 กำหนดส่ง: ${dueDate}
🆔 รหัส: ${task.id.substring(0, 8)}

`;
    });

    return response;
  }

  /**
   * ปิดงาน
   */
  private async completeTask(command: BotCommand, args: string[]): Promise<string> {
    const taskQuery = args.join(' ');
    if (!taskQuery) {
      return 'กรุณาระบุรหัสงานหรือชื่องานค่ะ\nตัวอย่าง: @เลขา /task done abc123';
    }

    // ค้นหางานจากรหัสหรือชื่อ
    const { tasks } = await this.taskService.searchTasks(command.groupId, taskQuery, { limit: 1 });
    
    if (tasks.length === 0) {
      return `ไม่พบงาน "${taskQuery}" ค่ะ`;
    }

    const task = tasks[0];

    try {
      await this.taskService.completeTask(task.id, command.userId);
      return `✅ ปิดงาน "${task.title}" เรียบร้อยแล้ว\n🎉 ขอบคุณสำหรับการทำงานค่ะ!`;
    } catch (error) {
      return 'ไม่สามารถปิดงานได้ คุณอาจไม่มีสิทธิ์หรืองานถูกปิดแล้ว';
    }
  }

  /**
   * เลื่อนงาน
   */
  private async moveTask(command: BotCommand, args: string[]): Promise<string> {
    if (args.length < 2) {
      return 'รูปแบบไม่ถูกต้อง\nใช้: @เลขา /task move <รหัสงาน> <วันเวลาใหม่>';
    }

    const [taskQuery, ...dateArgs] = args;
    const newDateTime = this.parseDateTime(dateArgs.join(' '));

    if (!newDateTime) {
      return 'รูปแบบวันเวลาไม่ถูกต้อง\nตัวอย่าง: 25/12 14:00 หรือ พรุ่งนี้ 9:00';
    }

    // ค้นหางาน
    const { tasks } = await this.taskService.searchTasks(command.groupId, taskQuery, { limit: 1 });
    
    if (tasks.length === 0) {
      return `ไม่พบงาน "${taskQuery}" ค่ะ`;
    }

    const task = tasks[0];

    try {
      await this.taskService.updateTask(task.id, { dueTime: newDateTime });
      const newDateStr = moment(newDateTime).format('DD/MM/YYYY HH:mm');
      return `📅 เลื่อนงาน "${task.title}" ไปวันที่ ${newDateStr} แล้วค่ะ`;
    } catch (error) {
      return 'ไม่สามารถเลื่อนงานได้ กรุณาตรวจสอบสิทธิ์';
    }
  }

  /**
   * เพิ่มงานจากคำสั่ง /task add
   */
  private async addTaskFromCommand(command: BotCommand, args: string[]): Promise<string | any> {
    return await this.parseAndCreateTask(command, args.join(' '));
  }

  /**
   * เพิ่มงานจากคำสั่งธรรมชาติ
   */
  private async handleAddTaskCommand(command: BotCommand): Promise<string | any> {
    // เปลี่ยนเป็นแสดงการ์ดพร้อมปุ่มไปหน้าเว็บเพิ่มงาน
    try {
      const newTaskUrl = `${config.baseUrl}/dashboard?groupId=${encodeURIComponent(command.groupId)}&action=new-task&userId=${encodeURIComponent(command.userId)}`;

      const flexMessage = {
        type: 'flex',
        altText: 'เพิ่มงานใหม่ในกลุ่ม',
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'เพิ่มงานใหม่',
                weight: 'bold',
                size: 'lg',
                color: '#333333'
              }
            ]
          },
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: 'กดปุ่มด้านล่างเพื่อเปิดหน้าเว็บกรอกข้อมูลงาน (ชื่องาน กำหนดส่ง ผู้รับผิดชอบ แท็ก ฯลฯ) โดยระบบเลือกกลุ่มให้อัตโนมัติ',
                wrap: true,
                size: 'sm',
                color: '#666666'
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: 'กรอกข้อมูลงาน',
                  uri: newTaskUrl
                }
              },
              {
                type: 'button',
                style: 'secondary',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: 'เปิด Dashboard กลุ่ม',
                  uri: `${config.baseUrl}/dashboard?groupId=${encodeURIComponent(command.groupId)}`
                }
              }
            ]
          }
        }
      } as any;

      return flexMessage;
    } catch (error) {
      console.error('❌ Error generating add task card:', error);
      return 'เกิดข้อผิดพลาดในการสร้างการ์ดเพิ่มงาน กรุณาลองใหม่';
    }
  }

  /**
   * วิเคราะห์และสร้างงาน
   */
  private async parseAndCreateTask(command: BotCommand, text: string): Promise<string | any> {
    try {
      console.log('🔍 Parsing task from text:', text);
      console.log('👥 Mentions:', command.mentions);
      
      const parsed = this.parseTaskFromText(text, command.mentions);
      
      console.log('📝 Parsed result:', {
        title: parsed.title,
        dueTime: parsed.dueTime,
        startTime: parsed.startTime,
        assignees: parsed.assignees,
        priority: parsed.priority,
        tags: parsed.tags
      });
      
      if (!parsed.title) {
        console.log('❌ No title found');
        return 'ไม่สามารถแยกวิเคราะห์ชื่องานได้\nตัวอย่าง: แท็กบอท เพิ่มงาน "ประชุมลูกค้า" @บอล @me due 25/12 14:00';
      }

      if (!parsed.dueTime) {
        console.log('❌ No due time found');
        return `ไม่สามารถแยกวิเคราะห์วันเวลากำหนดส่งได้
        
ตัวอย่างที่ถูกต้อง:
• แท็กบอท เพิ่มงาน "ชื่องาน" @me due 25/12 14:00
• แท็กบอท เพิ่มงาน "ชื่องาน" @me เริ่ม 20/12 09:00 ถึง 25/12 17:00

ข้อความที่ได้รับ: "${text}"
วิเคราะห์ได้: title="${parsed.title}", startTime="${parsed.startTime}", dueTime="${parsed.dueTime}"`;
      }

      // แปลง mentions เป็น user IDs
      const assigneeIds = await this.resolveAssignees(command.groupId, parsed.assignees);
      
      if (assigneeIds.length === 0) {
        console.log('❌ No assignees found');
        return 'ไม่พบผู้รับผิดชอบที่ระบุ กรุณาแท็กสมาชิกในกลุ่มหรือใช้ @me ค่ะ';
      }

      console.log('👥 Resolved assignee IDs:', assigneeIds);

      // ดึง display names ของผู้รับผิดชอบ
      const assigneeNames: string[] = [];
      for (const assigneeId of assigneeIds) {
        const user = await this.userService.findById(assigneeId);
        if (user) {
          assigneeNames.push(user.displayName);
        }
      }

      console.log('👥 Assignee display names:', assigneeNames);

      // สร้างงาน
      const task = await this.taskService.createTask({
        groupId: command.groupId,
        title: parsed.title,
        description: parsed.description,
        assigneeIds,
        createdBy: command.userId,
        dueTime: parsed.dueTime,
        startTime: parsed.startTime,
        priority: parsed.priority,
        tags: parsed.tags,
        customReminders: parsed.reminders
      });

      console.log('✅ Task created:', task.id);

      // สร้าง Flex Message
      const flexMessage = this.lineService.createTaskFlexMessage({
        id: task.id,
        title: task.title,
        description: task.description,
        dueTime: task.dueTime,
        assignees: assigneeNames, // ใช้ display names แทน user IDs
        status: task.status,
        priority: task.priority,
        tags: task.tags
      });

      return flexMessage;

    } catch (error) {
      console.error('❌ Error creating task:', error);
      return 'เกิดข้อผิดพลาดในการสร้างงาน กรุณาลองใหม่';
    }
  }

  /**
   * จัดการคำสั่งไฟล์
   */
  private async handleFilesCommand(command: BotCommand): Promise<string> {
    const [subCommand, ...args] = command.args;

    switch (subCommand) {
      case 'list':
        return await this.listFiles(command, args);
      
      case 'search':
        return await this.searchFiles(command, args);
      
      default:
        return 'คำสั่งย่อยไม่ถูกต้อง ใช้: list, search';
    }
  }

  /**
   * รายการไฟล์
   */
  private async listFiles(command: BotCommand, args: string[]): Promise<string> {
    const { files } = await this.fileService.getGroupFiles(command.groupId, { limit: 10 });

    if (files.length === 0) {
      return 'ยังไม่มีไฟล์ในกลุ่มนี้ค่ะ\nลองส่งไฟล์ในแชตเพื่อให้บอทบันทึกอัตโนมัติ';
    }

    let response = '📁 ไฟล์ล่าสุด (10 ไฟล์)\n\n';
    
    files.forEach((file, index) => {
      const uploadDate = moment(file.uploadedAt).format('DD/MM HH:mm');
      const fileSize = this.formatFileSize(file.size);
      
      response += `${index + 1}. 📄 ${file.originalName}
📅 ${uploadDate} | 📦 ${fileSize}
👤 ${file.uploadedByUser?.displayName || 'ไม่ทราบ'}
`;
      
      if (file.tags.length > 0) {
        response += `🏷️ ${file.tags.map(tag => `#${tag}`).join(' ')}\n`;
      }
      
      response += '\n';
    });

    response += `📊 ดูทั้งหมดได้ที่: ${config.baseUrl}/dashboard?groupId=${command.groupId}#files`;

    return response;
  }

  /**
   * ค้นหาไฟล์
   */
  private async searchFiles(command: BotCommand, args: string[]): Promise<string> {
    const query = args.join(' ');
    if (!query) {
      return 'กรุณาระบุคำค้นหาค่ะ\nตัวอย่าง: @เลขา /files search รูปภาพ';
    }

    const { files } = await this.fileService.getGroupFiles(command.groupId, { 
      search: query, 
      limit: 5 
    });

    if (files.length === 0) {
      return `ไม่พบไฟล์ที่ตรงกับ "${query}" ค่ะ`;
    }

    let response = `🔍 ผลการค้นหา "${query}"\n\n`;
    
    files.forEach((file, index) => {
      const uploadDate = moment(file.uploadedAt).format('DD/MM HH:mm');
      
      response += `${index + 1}. 📄 ${file.originalName}
📅 ${uploadDate}
🔗 ${this.fileService.generateDownloadUrl(file.id)}

`;
    });

    return response;
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

      if (!user.email) {
        const linkUrl = `${config.baseUrl}/liff/profile?userId=${user.id}`;
        response += `\n🔗 ลิงก์อีเมลที่นี่: ${linkUrl}`;
      }

      return response;

    } catch (error) {
      console.error('❌ Error in whoami command:', error);
      return 'เกิดข้อผิดพลาดในการดึงข้อมูล';
    }
  }

  // Helper Methods

  /**
   * แยกวิเคราะห์งานจากข้อความ
   */
  private parseTaskFromText(text: string, mentions: string[]): {
    title?: string;
    description?: string;
    assignees: string[];
    dueTime?: Date;
    startTime?: Date;
    priority: 'low' | 'medium' | 'high';
    tags: string[];
    reminders?: string[];
  } {
    console.log('🔍 parseTaskFromText input:', { text, mentions });
    
    const result: {
      title?: string;
      description?: string;
      assignees: string[];
      dueTime?: Date;
      startTime?: Date;
      priority: 'low' | 'medium' | 'high';
      tags: string[];
      reminders?: string[];
    } = {
      assignees: mentions,
      priority: 'medium' as const,
      tags: [] as string[]
    };

    // แยกชื่องาน (ในเครื่องหมายคำพูด)
    const titleMatch = text.match(/["'"](.*?)["'"]/);
    if (titleMatch) {
      result.title = titleMatch[1];
      console.log('📝 Title found:', result.title);
    } else {
      console.log('❌ No title found in quotes');
      
      // ลองหาชื่องานแบบอื่น - หลังคำว่า "เพิ่มงาน" หรือ "add" แต่ก่อนการ mention
      const altTitleMatch = text.match(/(?:เพิ่มงาน|add)\s+([^@]+?)(?:\s+@|\s+เริ่ม|\s+due|\s+ถึง|$)/i);
      if (altTitleMatch) {
        result.title = altTitleMatch[1].trim().replace(/^["']|["']$/g, '');
        console.log('📝 Alternative title found:', result.title);
      }
    }

    // แยกแท็ก
    const tagMatches = text.match(/#(\w+)/g);
    if (tagMatches) {
      result.tags = tagMatches.map(tag => tag.substring(1));
    }

    // แยกวันเวลา - รองรับรูปแบบ "เริ่ม ... ถึง ..." และ "due ..."
    
    // ลองหา pattern "เริ่ม ... ถึง ..." ก่อน
    const startEndPattern = /(?:เริ่ม|start)\s+([\d\/\-\s:]+?)\s+(?:ถึง|to|until)\s+([\d\/\-\s:]+?)(?:\s|$)/i;
    const startEndMatch = text.match(startEndPattern);
    
    if (startEndMatch) {
      const startTimeStr = startEndMatch[1]?.trim();
      const endTimeStr = startEndMatch[2]?.trim();
      
      console.log('🔍 Found start-end pattern:', { startTimeStr, endTimeStr });
      
      if (startTimeStr) {
        result.startTime = this.parseDateTime(startTimeStr);
        console.log('🕐 Parsed start time:', startTimeStr, '→', result.startTime);
      }
      
      if (endTimeStr) {
        result.dueTime = this.parseDateTime(endTimeStr);
        console.log('🕕 Parsed end time:', endTimeStr, '→', result.dueTime);
      }
    } else {
      console.log('❌ No start-end pattern found, looking for due only');
      
      // ถ้าไม่มี pattern "เริ่ม ... ถึง ..." ให้ลองหา "due" หรือ "ถึง" อย่างเดียว
      const duePattern = /(?:due|ถึง|กำหนด)\s+([\d\/\-\s:]+?)(?:\s|$)/i;
      const dueMatch = text.match(duePattern);
      if (dueMatch) {
        result.dueTime = this.parseDateTime(dueMatch[1]);
        console.log('📅 Parsed due time:', dueMatch[1], '→', result.dueTime);
      }
      
      // ลองหาแค่ "เริ่ม" อย่างเดียว
      const startOnlyPattern = /(?:เริ่ม|start)\s+([\d\/\-\s:]+?)(?:\s+[^\d]|$)/i;
      const startOnlyMatch = text.match(startOnlyPattern);
      if (startOnlyMatch) {
        result.startTime = this.parseDateTime(startOnlyMatch[1]);
        console.log('🕐 Parsed start time only:', startOnlyMatch[1], '→', result.startTime);
      }
    }

    // แยกระดับความสำคัญ
    if (text.includes('สำคัญ') || text.includes('ด่วน') || text.includes('high')) {
      result.priority = 'high';
    } else if (text.includes('low') || text.includes('ไม่ด่วน')) {
      result.priority = 'low';
    }

    return result;
  }

  /**
   * แปลง mentions เป็น user IDs
   */
  private async resolveAssignees(groupId: string, mentions: string[]): Promise<string[]> {
    if (mentions.length === 0) return [];

    try {
      const resolvedUserIds: string[] = [];
      
      for (const mention of mentions) {
        // ถ้าเป็น userId จาก LINE mention หรือ @me ตรงๆ
        if (mention.startsWith('U') || mention.length > 10) {
          // ตรวจสอบว่าเป็น LINE userId หรือไม่
          const user = await this.userService.findByLineUserId(mention);
          if (user) {
            resolvedUserIds.push(user.id);
          }
        } else {
          // ถ้าเป็น displayName ที่พิมพ์ธรรมดา ให้ค้นหาในกลุ่ม
          const groupMembers = await this.userService.getGroupMembers(groupId);
          const matchedUser = groupMembers.find(member => 
            member.displayName.toLowerCase().includes(mention.toLowerCase()) ||
            member.realName?.toLowerCase().includes(mention.toLowerCase())
          );
          
          if (matchedUser) {
            resolvedUserIds.push(matchedUser.id);
          }
        }
      }
      
      return resolvedUserIds;
    } catch (error) {
      console.error('❌ Error resolving assignees:', error);
      return [];
    }
  }

  /**
   * แปลงข้อความเป็นวันเวลา
   */
  private parseDateTime(dateStr: string): Date | undefined {
    try {
      console.log('📅 Parsing datetime:', dateStr);
      const now = moment().tz(config.app.defaultTimezone);
      
      // รูปแบบต่างๆ ที่รองรับ
      const formats = [
        'DD/MM/YYYY HH:mm',
        'DD/MM HH:mm',
        'DD/MM/YY HH:mm',
        'DD/MM/YYYY',
        'DD/MM',
        'YYYY-MM-DD HH:mm',
        'YYYY-MM-DD',
        'DD-MM-YYYY HH:mm',
        'DD-MM-YYYY',
        'DD-MM HH:mm',
        'DD-MM',
        'HH:mm'
      ];

      // คำพิเศษ
      const specialDates: { [key: string]: moment.Moment } = {
        'วันนี้': now.clone(),
        'พรุ่งนี้': now.clone().add(1, 'day'),
        'มะรืนนี้': now.clone().add(2, 'days'),
        'สัปดาห์หน้า': now.clone().add(1, 'week'),
        'เดือนหน้า': now.clone().add(1, 'month')
      };

      // ตรวจสอบคำพิเศษ
      for (const [key, date] of Object.entries(specialDates)) {
        if (dateStr.includes(key)) {
          const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})/);
          if (timeMatch) {
            date.hour(parseInt(timeMatch[1])).minute(parseInt(timeMatch[2]));
          } else {
            // ถ้าไม่มีเวลาระบุ ใช้ 09:00
            date.hour(9).minute(0);
          }
          console.log(`  Special date result: ${date.toDate()} (${config.app.defaultTimezone})`);
          return date.toDate();
        }
      }

      // ลองแปลงตามรูปแบบต่างๆ
      for (const format of formats) {
        const parsed = moment.tz(dateStr, format, config.app.defaultTimezone);
        console.log(`  Testing format "${format}":`, parsed.isValid() ? 'Valid' : 'Invalid');
        
        if (parsed.isValid()) {
          console.log(`  ✅ Successfully parsed with format "${format}"`);
          
          // ถ้าไม่มีปี ใช้ปีปัจจุบัน
          if (!format.includes('Y')) {
            parsed.year(now.year());
            console.log(`  Added current year: ${now.year()}`);
          }
          
          // ถ้าไม่มีเวลา ใช้ 09:00
          if (!format.includes('H')) {
            parsed.hour(9).minute(0);
            console.log(`  Added default time: 09:00`);
          }

          const result = parsed.toDate();
          console.log(`  Final result: ${result} (${config.app.defaultTimezone})`);
          return result;
        }
      }

      return undefined;
    } catch (error) {
      console.error('❌ Error parsing date:', error);
      return undefined;
    }
  }

  /**
   * จัดรูปแบบขนาดไฟล์
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}