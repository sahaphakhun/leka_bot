// Webhook Controller - จัดการ Webhook จาก LINE

import { Router, Request, Response } from 'express';
import { WebhookEvent, MessageEvent, PostbackEvent, ImageMessage, VideoMessage, AudioMessage } from '@line/bot-sdk';
import { LineService } from '@/services/LineService';
import { TaskService } from '@/services/TaskService';
import { UserService } from '@/services/UserService';
import { FileService } from '@/services/FileService';
import { CommandService } from '@/services/CommandService';
import { config } from '@/utils/config';

export const webhookRouter = Router();

class WebhookController {
  private lineService: LineService;
  private taskService: TaskService;
  private userService: UserService;
  private fileService: FileService;
  private commandService: CommandService;

  constructor() {
    this.lineService = new LineService();
    this.taskService = new TaskService();
    this.userService = new UserService();
    this.fileService = new FileService();
    this.commandService = new CommandService();
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

      const body = JSON.stringify(req.body);
      
      // ตรวจสอบ signature
      if (!this.lineService.validateSignature(body, signature)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const events: WebhookEvent[] = req.body.events || [];
      
      // ประมวลผล events แบบ parallel
      await Promise.all(events.map(event => this.processEvent(event)));
      
      res.status(200).json({ message: 'OK' });

    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * ประมวลผล Event แต่ละประเภท
   */
  private async processEvent(event: WebhookEvent): Promise<void> {
    try {
      console.log('📥 Processing event:', event.type, event.source);

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
          console.log('ℹ️ Unhandled event type:', event.type);
      }

    } catch (error) {
      console.error('❌ Error processing event:', error);
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
        
      default:
        console.log('ℹ️ Unhandled message type:', message.type);
    }
  }

  /**
   * จัดการข้อความแบบข้อความ
   */
  private async handleTextMessage(event: MessageEvent, text: string): Promise<void> {
    const { source, replyToken } = event;
    
    // แยกวิเคราะห์คำสั่ง
    const command = this.lineService.parseCommand(text, event);
    
    if (command) {
      // เป็นคำสั่งบอท
      const response = await this.commandService.executeCommand(command);
      
      if (response) {
        await this.lineService.replyMessage(replyToken!, response);
      }
    } else {
      // ตรวจสอบคีย์เวิร์ดอื่นๆ
      if (text.includes('เลขา') && !text.includes('@เลขา')) {
        // แนะนำวิธีใช้งาน
        const helpText = `สวัสดีค่ะ ฉันคือเลขาบอทค่ะ 🤖

📝 วิธีใช้งาน (ต้องแท็กบอทจริงๆ ใน LINE):

🔧 การตั้งค่า:
• แท็กบอท /setup - เข้าใช้ Dashboard

📋 การจัดการงาน:
• แท็กบอท เพิ่มงาน "ชื่องาน" @คน1 @คน2 due 25/12 14:00
• แท็กบอท /task list - ดูรายการงาน
• แท็กบอท /task mine - งานของฉัน
• แท็กบอท /help - ดูคำสั่งทั้งหมด`;

        await this.lineService.replyMessage(replyToken!, helpText);
      }
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
                  'application/octet-stream'
      });

      // สร้าง Flex Message สำหรับแสดงตัวเลือก
      const flexMessage = {
        type: 'flex' as const,
        altText: 'บันทึกไฟล์แล้ว',
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [{
              type: 'text',
              text: '✅ บันทึกไฟล์แล้ว',
              weight: 'bold',
              color: '#00C851'
            }]
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [{
              type: 'text',
              text: `ไฟล์: ${fileRecord.originalName}`,
              size: 'sm'
            }, {
              type: 'text',
              text: `ขนาด: ${this.formatFileSize(fileRecord.size)}`,
              size: 'sm'
            }]
          },
          footer: {
            type: 'box',
            layout: 'horizontal',
            contents: [{
              type: 'button',
              style: 'primary',
              action: {
                type: 'postback',
                label: 'ผูกกับงาน',
                data: `action=link_file&fileId=${fileRecord.id}`
              }
            }, {
              type: 'button',
              style: 'secondary',
              action: {
                type: 'postback',
                label: 'เพิ่มแท็ก',
                data: `action=tag_file&fileId=${fileRecord.id}`
              }
            }],
            spacing: 'sm'
          }
        }
      };

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
          const taskId = params.get('taskId');
          if (taskId) {
            await this.taskService.completeTask(taskId, userId);
            await this.lineService.replyMessage(replyToken, '✅ ปิดงานเรียบร้อยแล้ว');
          }
          break;

        case 'edit':
          // TODO: ส่งลิงก์ไปยัง LIFF สำหรับแก้ไข
          break;

        case 'link_file':
          const fileId = params.get('fileId');
          if (fileId) {
            const tasks = await this.taskService.getActiveTasks(groupId);
            // TODO: แสดงรายการงานให้เลือก
          }
          break;

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
1. พิมพ์ "@เลขา /setup" เพื่อตั้งค่าเริ่มต้น
2. ผู้ดูแลกลุ่มจะได้ลิงก์สำหรับตั้งค่า
3. สมาชิกแต่ละคนต้องลิงก์บัญชีผ่าน LIFF

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
    // TODO: ส่งข้อความต้อนรับและลิงก์ LIFF
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
   * จัดรูปแบบขนาดไฟล์
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

const webhookController = new WebhookController();

// Routes
webhookRouter.post('/', (req, res) => webhookController.handleWebhook(req, res));