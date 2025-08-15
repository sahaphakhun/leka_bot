// Webhook Controller - จัดการ Webhook จาก LINE

import { Router, Request, Response } from 'express';
import { WebhookEvent, MessageEvent, PostbackEvent, ImageMessage, VideoMessage, AudioMessage } from '@line/bot-sdk';
import { LineService } from '@/services/LineService';
import { TaskService } from '@/services/TaskService';
import { UserService } from '@/services/UserService';
import { FileService } from '@/services/FileService';
import { FlexMessageDesignSystem } from '@/services/FlexMessageDesignSystem';
import { FlexMessageTemplateService } from '@/services/FlexMessageTemplateService';
import { CommandService } from '@/services/CommandService';
import { config } from '@/utils/config';
import { serviceContainer } from '@/utils/serviceContainer';
import { logger } from '@/utils/logger';
import { formatFileSize } from '@/utils/common';

export const webhookRouter = Router();

class WebhookController {
  private lineService: LineService;
  private taskService: TaskService;
  private userService: UserService;
  private fileService: FileService;
  private commandService: CommandService;

  constructor() {
    this.lineService = serviceContainer.get<LineService>('LineService');
    this.taskService = serviceContainer.get<TaskService>('TaskService');
    this.userService = serviceContainer.get<UserService>('UserService');
    this.fileService = serviceContainer.get<FileService>('FileService');
    this.commandService = serviceContainer.get<CommandService>('CommandService');
  }

  /**
   * จัดการ Webhook Event จาก LINE
   */
  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.get('X-Line-Signature');
      if (!signature) {
        res.status(400).json({ error: 'Missing signature' });
        return;
      }

      // parse raw body (express.raw) → text → validate signature → JSON.parse
      const rawBodyBuffer = (req as any).body as Buffer;
      const body = rawBodyBuffer ? rawBodyBuffer.toString('utf8') : JSON.stringify(req.body || {});
      
      // ตรวจสอบ signature
      if (!this.lineService.validateSignature(body, signature)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
      const parsed = body ? JSON.parse(body) : {};
      const events: WebhookEvent[] = parsed.events || [];
      
      // ประมวลผล events แบบ parallel
      await Promise.all(events.map(event => this.processEvent(event)));
      
      res.status(200).json({ message: 'OK' });

    } catch (error) {
      logger.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * ประมวลผล Event แต่ละประเภท
   */
  private async processEvent(event: WebhookEvent): Promise<void> {
    try {
      logger.info('Processing event:', { type: event.type, source: event.source });

      switch (event.type) {
        case 'message':
          await this.handleMessageEvent(event as MessageEvent);
          break;
          
        case 'postback':
          await this.handlePostbackEvent(event as PostbackEvent);
          break;
          
        case 'join':
          await this.handleJoinEvent(event);
          break;
          
        case 'leave':
          await this.handleLeaveEvent(event);
          break;
          
        case 'memberJoined':
          await this.handleMemberJoinedEvent(event);
          break;
          
        case 'memberLeft':
          await this.handleMemberLeftEvent(event);
          break;

        default:
          logger.info('Unhandled event type:', { type: event.type });
      }

    } catch (error) {
      logger.error('Error processing event:', error);
    }
  }

  /**
   * จัดการข้อความ
   */
  private async handleMessageEvent(event: MessageEvent): Promise<void> {
    const { message, source, replyToken } = event;

    // ตรวจสอบว่าเป็นกลุ่มหรือไม่
    if (source.type !== 'group') {
      await this.lineService.replyMessage(replyToken!, 
        'บอทนี้ใช้งานได้เฉพาะในกลุ่ม LINE เท่านั้นค่ะ');
      return;
    }

    const groupId = source.groupId!;
    const userId = source.userId!;

    // ตรวจสอบและสร้าง user/group record ถ้าไม่มี
    await this.ensureUserAndGroup(userId, groupId);

    // ตรวจสอบและบันทึกสมาชิกใหม่ที่ส่งข้อความ
    await this.checkAndSaveNewMemberFromMessage(groupId, userId);

    switch (message.type) {
      case 'text':
        await this.handleTextMessage(event, message.text);
        break;
        
      case 'image':
      case 'video':
      case 'audio':
      // Note: File messages are handled through other message types
      // case 'file':
      //   await this.handleFileMessage(event, message as any);
      //   break;

          // ไม่บันทึกไฟล์อัตโนมัติแล้ว - รอคำสั่ง "เซฟไฟล์"
          console.log('📁 ไฟล์ได้รับแล้ว (ไม่บันทึกอัตโนมัติ)');
          break;
        
      default:
        console.log('ℹ️ Unhandled message type:', message.type);
    }
  }

  /**
   * จัดการข้อความแบบข้อความ
   */
  private async handleTextMessage(event: MessageEvent, text: string): Promise<void> {
    const { source, replyToken } = event;
    
    console.log('📝 Processing text message:', text);
    
    // แยกวิเคราะห์คำสั่ง
    const command = this.lineService.parseCommand(text, event);
    
    if (command) {
      // เป็นคำสั่งบอท
      console.log('✅ Command detected, executing:', command.command);
      try {
        const response = await this.commandService.executeCommand(command);
        
        if (response) {
          // เพิ่ม logging เพื่อตรวจสอบ response
          console.log('📤 Command response type:', typeof response);
          if (typeof response !== 'string') {
            console.log('🎴 Response is Flex Message:', {
              type: response.type,
              altText: response.altText
            });
          } else {
            console.log('📝 Response is Text Message:', response.substring(0, 100) + '...');
          }
          
          await this.lineService.replyMessage(replyToken!, response);
          console.log('📤 Bot response sent');
        } else {
          console.log('⚠️ No response from command service');
        }
      } catch (error) {
        console.error('❌ Error executing command:', error);
        await this.lineService.replyMessage(replyToken!, 
          'เกิดข้อผิดพลาดในการประมวลผลคำสั่ง กรุณาลองใหม่อีกครั้ง');
      }
    } else {
      // ไม่ใช่คำสั่งบอท - ตรวจสอบว่าควรตอบกลับหรือไม่
      console.log('❌ Not a bot command');
      
      // ตอบกลับเฉพาะเมื่อมีการพูดถึงบอทโดยตรง (ไม่ใช่แท็ก)
      if (text.toLowerCase().includes('เลขา') && 
          !text.includes('@เลขา') && 
          (text.includes('สวัสดี') || text.includes('hello') || text.includes('hi'))) {
        // แนะนำวิธีใช้งานเฉพาะเมื่อทักทาย
        const helpText = `สวัสดีค่ะ ฉันคือเลขาบอทค่ะ 🤖

📝 วิธีใช้งาน:
• แท็กบอทใน LINE แล้วพิมพ์คำสั่ง
• หรือพิมพ์ @เลขา <คำสั่ง>
• หรือพิมพ์ /<คำสั่ง>

🔧 เริ่มต้น: แท็กบอท /help เพื่อดูคำสั่งทั้งหมด`;

        await this.lineService.replyMessage(replyToken!, helpText);
      }
      // ไม่ตอบกลับข้อความอื่นๆ เพื่อไม่ให้รบกวน
    }
  }

  /**
   * จัดการไฟล์ที่อัปโหลด
   */
  private async handleFileMessage(event: MessageEvent, message: ImageMessage | VideoMessage | AudioMessage): Promise<void> {
    try {
      const { source, replyToken } = event;
      const groupId = source.type === 'group' ? (source as any).groupId : '';
      const userId = source.userId!;

      // ดาวน์โหลดไฟล์
      const content = await this.lineService.downloadContent((message as any).id);
      
      // บันทึกไฟล์
      const fileRecord = await this.fileService.saveFile({
        groupId,
        uploadedBy: userId,
        messageId: (message as any).id,
        content,
        originalName: (message as any).fileName || `file_${(message as any).id}`,
        mimeType: message.type === 'image' ? 'image/jpeg' : 
                  message.type === 'video' ? 'video/mp4' :
                  message.type === 'audio' ? 'audio/mpeg' : 
                  'application/octet-stream',
        folderStatus: 'in_progress'
      });

      // สร้าง Flex Message สำหรับแสดงตัวเลือก
      const fileContent = [
        FlexMessageDesignSystem.createText(`ไฟล์: ${fileRecord.originalName}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
        FlexMessageDesignSystem.createText(`ขนาด: ${this.formatFileSize(fileRecord.size)}`, 'sm', FlexMessageDesignSystem.colors.textPrimary)
      ];

      const fileButtons = [
        FlexMessageDesignSystem.createButton(
          'ผูกกับงาน',
          'postback',
          `action=link_file&fileId=${fileRecord.id}`,
          'primary'
        ),
        FlexMessageDesignSystem.createButton(
          'เพิ่มแท็ก',
          'postback',
          `action=tag_file&fileId=${fileRecord.id}`,
          'secondary'
        )
      ];

      const flexMessage = FlexMessageDesignSystem.createStandardTaskCard(
        '✅ บันทึกไฟล์แล้ว',
        '📁',
        FlexMessageDesignSystem.colors.success,
        fileContent,
        fileButtons,
        'compact'
      );

      await this.lineService.replyMessage(replyToken!, flexMessage as any);

    } catch (error) {
      console.error('❌ Error handling file message:', error);
      await this.lineService.replyMessage(event.replyToken!, 
        'ขออภัยค่ะ เกิดข้อผิดพลาดในการบันทึกไฟล์');
    }
  }

  /**
   * จัดการ Postback Event (จากปุ่มต่างๆ)
   */
  private async handlePostbackEvent(event: PostbackEvent): Promise<void> {
    const { replyToken, source } = event;
    const data = (event as any).postback?.data;
    const groupId = source.type === 'group' ? source.groupId! : '';
    const userId = source.userId!;

    try {
      const params = new URLSearchParams(data);
      const action = params.get('action');

      switch (action) {
        case 'complete':
        case 'complete_task':
          const taskId = params.get('taskId');
          if (taskId) {
            try {
              await this.taskService.completeTask(taskId, userId);
              await this.lineService.replyMessage(replyToken, '✅ ปิดงานเรียบร้อยแล้ว');
            } catch (err: any) {
              await this.lineService.replyMessage(replyToken, `❌ ไม่สามารถปิดงานได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
            }
          }
          break;

        case 'submit_confirm': {
          const taskId = params.get('taskId')!;
          const fileIdsParam = params.get('fileIds') || '';
          const note = params.get('note') || '';
          const fileIds = fileIdsParam ? fileIdsParam.split(',').filter(Boolean) : [];
          try {
            const task = await this.taskService.recordSubmission(taskId, userId, fileIds, note);
            await this.lineService.replyMessage(replyToken, `📥 บันทึกการส่งงานให้ "${task.title}" แล้วค่ะ`);
          } catch (err: any) {
            await this.lineService.replyMessage(replyToken, `❌ ส่งงานไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }

        case 'submit_nofile': {
          const taskId = params.get('taskId')!;
          const note = params.get('note') || '';
          try {
            const task = await this.taskService.recordSubmission(taskId, userId, [], note);
            await this.lineService.replyMessage(replyToken, `📥 บันทึกการส่งงาน (ไม่มีไฟล์แนบ) ให้ "${task.title}" แล้วค่ะ`);
          } catch (err: any) {
            await this.lineService.replyMessage(replyToken, `❌ ส่งงานไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }

        case 'submit_cancel':
          await this.lineService.replyMessage(replyToken, 'ยกเลิกการส่งงานแล้ว');
          break;

        case 'submit_with_files': {
          const taskId = params.get('taskId')!;
          try {
            // ส่งการ์ดให้แนบไฟล์
            const task = await this.taskService.getTaskById(taskId);
            const group = { id: groupId, lineGroupId: groupId, name: 'กลุ่ม' };
            const assignee = await this.userService.findByLineUserId(userId);
            
            const fileAttachmentCard = FlexMessageTemplateService.createFileAttachmentCard(task, group, assignee);
            await this.lineService.replyMessage(replyToken, fileAttachmentCard);
          } catch (err: any) {
            await this.lineService.replyMessage(replyToken, `❌ ไม่สามารถแสดงการ์ดแนบไฟล์ได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }

        case 'confirm_submit': {
          const taskId = params.get('taskId')!;
          try {
            // ส่งการ์ดยืนยันการส่งงาน
            const task = await this.taskService.getTaskById(taskId);
            const group = { id: groupId, lineGroupId: groupId, name: 'กลุ่ม' };
            
            // หาไฟล์ที่ผู้ใช้ส่งล่าสุด (24 ชม.)
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const { files } = await this.fileService.getGroupFiles(groupId, { startDate: since });
            
            const submitConfirmationCard = FlexMessageTemplateService.createSubmitConfirmationCard(
              task, 
              group, 
              files.length, 
              files.map((f: any) => f.originalName)
            );
            await this.lineService.replyMessage(replyToken, submitConfirmationCard);
          } catch (err: any) {
            await this.lineService.replyMessage(replyToken, `❌ ไม่สามารถแสดงการ์ดยืนยันได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }

        case 'approve_task': {
          const taskId2 = params.get('taskId');
          if (taskId2) {
            try {
              await this.taskService.completeTask(taskId2, userId);
              await this.lineService.replyMessage(replyToken, '✅ อนุมัติและปิดงานเรียบร้อย');
            } catch (err: any) {
              await this.lineService.replyMessage(replyToken, `❌ อนุมัติไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
            }
          }
          break;
        }

        case 'edit':
          // TODO: ส่งลิงก์ไปยังหน้าเว็บสำหรับแก้ไข
          break;

        case 'link_file':
          const fileId = params.get('fileId');
          if (fileId) {
            const tasks = await this.taskService.getActiveTasks(groupId);
            // TODO: แสดงรายการงานให้เลือก
          }
          break;

        case 'link_files': {
          const fileIdsParam = params.get('fileIds');
          if (fileIdsParam) {
            const fileIds = fileIdsParam.split(',').filter(Boolean);
            const tasks = await this.taskService.getActiveTasks(groupId);
            
            // สร้าง Flex Message แสดงรายการงานให้เลือก
            const taskButtons = tasks.slice(0, 5).map((task: any) => 
              FlexMessageDesignSystem.createButton(
                `${task.title} (${task.id.substring(0, 8)})`,
                'postback',
                `action=link_files_to_task&taskId=${task.id}&fileIds=${fileIds.join(',')}`,
                'secondary'
              )
            );

            const footerButtons = [
              FlexMessageDesignSystem.createButton(
                'ไม่ผูกกับงาน',
                'postback',
                `action=no_link_files&fileIds=${fileIds.join(',')}`,
                'primary'
              )
            ];

            const flexMessage = FlexMessageDesignSystem.createStandardTaskCard(
              '📋 เลือกงานเพื่อผูกไฟล์',
              '📋',
              FlexMessageDesignSystem.colors.primary,
              [
                FlexMessageDesignSystem.createText(`ไฟล์ ${fileIds.length} รายการ`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
                ...taskButtons
              ],
              footerButtons,
              'compact'
            );
            
            await this.lineService.replyMessage(replyToken, flexMessage as any);
          }
          break;
        }

        case 'link_files_to_task': {
          const taskId = params.get('taskId');
          const fileIdsParam = params.get('fileIds');
          if (taskId && fileIdsParam) {
            const fileIds = fileIdsParam.split(',').filter(Boolean);
            try {
              // ผูกไฟล์กับงาน
              for (const fileId of fileIds) {
                await this.fileService.linkFileToTask(fileId, taskId);
              }
              await this.lineService.replyMessage(replyToken, '✅ ผูกไฟล์กับงานเรียบร้อยแล้ว');
            } catch (err: any) {
              await this.lineService.replyMessage(replyToken, `❌ ไม่สามารถผูกไฟล์ได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
            }
          }
          break;
        }

        case 'no_link_files': {
          const fileIdsParam = params.get('fileIds');
          if (fileIdsParam) {
            await this.lineService.replyMessage(replyToken, '✅ ไฟล์ถูกบันทึกแล้วโดยไม่ผูกกับงาน');
          }
          break;
        }

        case 'view_saved_files': {
          const fileIdsParam = params.get('fileIds');
          if (fileIdsParam) {
            const fileIds = fileIdsParam.split(',').filter(Boolean);
            // แสดงรายการไฟล์ที่บันทึกแล้ว
            let response = '📁 ไฟล์ที่บันทึกแล้ว:\n\n';
            for (const fileId of fileIds) {
              try {
                const file = await this.fileService.getFilesByIds([fileId]);
                if (file && file.length > 0) {
                  const fileData = file[0];
                  response += `📄 ${fileData.originalName}\n`;
                  response += `📦 ${this.formatFileSize(fileData.size)}\n`;
                  response += `👤 ${fileData.uploadedByUser?.displayName || 'ไม่ทราบ'}\n\n`;
                }
              } catch (error) {
                console.error('Error getting file:', error);
              }
            }
            await this.lineService.replyMessage(replyToken, response);
          }
          break;
        }

        default:
          console.log('ℹ️ Unhandled postback action:', action);
      }

    } catch (error) {
      console.error('❌ Error handling postback:', error);
      await this.lineService.replyMessage(replyToken, 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  }

  /**
   * จัดการเมื่อบอทเข้าร่วมกลุ่ม
   */
  private async handleJoinEvent(event: WebhookEvent): Promise<void> {
    if (event.source.type === 'group') {
      const groupId = event.source.groupId!;
      
      const welcomeMessage = `สวัสดีค่ะ! ฉันคือเลขาบอท 🤖
      
ฉันจะช่วยจัดการงานและปฏิทินให้กับกลุ่มนี้ค่ะ

เริ่มต้นใช้งาน:
1. พิมพ์ "@เลขา /setup" เพื่อรับลิงก์ Dashboard ของกลุ่ม
2. ผู้ดูแลกลุ่มตั้งค่ากลุ่มจากลิงก์ดังกล่าว
3. สมาชิกแต่ละคนพิมพ์ "@เลขา /whoami" แล้วกดลิงก์ "เปิดหน้าโปรไฟล์ (เว็บ)" เพื่อกรอกชื่อจริง/อีเมล/เขตเวลา

พิมพ์ "@เลขา /help" เพื่อดูคำสั่งทั้งหมดค่ะ ✨`;

      await this.lineService.pushMessage(groupId, welcomeMessage);
    }
  }

  /**
   * จัดการเมื่อบอทออกจากกลุ่ม
   */
  private async handleLeaveEvent(event: WebhookEvent): Promise<void> {
    if (event.source.type === 'group') {
      const groupId = event.source.groupId!;
      
      // TODO: ทำเครื่องหมายกลุ่มเป็น inactive
      await this.userService.deactivateGroup(groupId);
    }
  }

  /**
   * จัดการเมื่อมีสมาชิกใหม่เข้าร่วม
   */
  private async handleMemberJoinedEvent(event: WebhookEvent): Promise<void> {
    // TODO: ส่งข้อความต้อนรับและลิงก์หน้าเว็บ
  }

  /**
   * จัดการเมื่อมีสมาชิกออกจากกลุ่ม
   */
  private async handleMemberLeftEvent(event: WebhookEvent): Promise<void> {
    // TODO: อัปเดตสถานะสมาชิก
  }

  /**
   * ตรวจสอบและสร้าง User/Group record
   */
  private async ensureUserAndGroup(userId: string, groupId: string): Promise<void> {
    try {
      // ตรวจสอบ user
      let user = await this.userService.findByLineUserId(userId);
      if (!user) {
        const profile = await this.lineService.getUserProfile(userId);
        user = await this.userService.createUser({
          lineUserId: userId,
          displayName: profile.displayName
        });
      }

      // ตรวจสอบ group
      let group = await this.userService.findGroupByLineId(groupId);
      if (!group) {
        group = await this.userService.createGroup({
          lineGroupId: groupId,
          name: `กลุ่ม ${groupId.substring(0, 8)}`
        });
      }

      // ตรวจสอบ membership
      const membership = await this.userService.findGroupMembership(user.id, group.id);
      if (!membership) {
        await this.userService.addGroupMember(group.id, user.id);
      }

    } catch (error) {
      console.error('❌ Error ensuring user and group:', error);
    }
  }

  /**
   * ตรวจสอบและบันทึกสมาชิกใหม่ที่ส่งข้อความ
   */
  private async checkAndSaveNewMemberFromMessage(groupId: string, userId: string): Promise<void> {
    try {
      console.log(`🔍 ตรวจสอบสมาชิกใหม่จากข้อความ: ${userId} ในกลุ่ม ${groupId}`);
      
      // ใช้ฟังก์ชันใหม่ที่เราสร้างใน LineService
      const result = await this.lineService.checkAndSaveNewMemberFromMessage(groupId, userId);
      
      if (result.isNewMember && result.memberInfo) {
        console.log(`🆕 บันทึกสมาชิกใหม่จากข้อความ: ${result.memberInfo.displayName}`);
        
        // แจ้งเตือนในกลุ่มว่ามีสมาชิกใหม่ (ถ้าต้องการ)
        // await this.lineService.pushMessage(groupId, 
        //   `ยินดีต้อนรับ ${result.memberInfo.displayName} เข้ากลุ่มค่ะ! 👋`);
      }
      
    } catch (error) {
      console.error('❌ Error checking and saving new member from message:', error);
    }
  }

  /**
   * จัดรูปแบบขนาดไฟล์
   */
  private formatFileSize(bytes: number): string {
    return formatFileSize(bytes);
  }
}

const webhookController = new WebhookController();

// Routes
webhookRouter.post('/', (req, res) => webhookController.handleWebhook(req, res));