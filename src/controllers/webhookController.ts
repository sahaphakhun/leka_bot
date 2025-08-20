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
import moment from 'moment-timezone';

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

    // ตรวจสอบประเภทของ source
    if (source.type === 'group') {
      // แชทกลุ่ม
      const groupId = source.groupId!;
      const userId = source.userId!;

      // ตรวจสอบและสร้าง user/group record ถ้าไม่มี
      await this.ensureUserAndGroup(userId, groupId);

      // ตรวจสอบและบันทึกสมาชิกใหม่ที่ส่งข้อความ
      await this.checkAndSaveNewMemberFromMessage(groupId, userId);
    } else if (source.type === 'user') {
      // แชทส่วนตัว
      const userId = source.userId!;
      
      // ตรวจสอบและสร้าง user record ถ้าไม่มี
      await this.ensureUserExists(userId);
    } else {
      // ไม่รองรับ source type อื่นๆ
      console.log('⚠️ Unsupported source type:', source.type);
      return;
    }

    switch (message.type) {
      case 'text':
        await this.handleTextMessage(event, message.text);
        break;
        
      case 'image':
      case 'video':
      case 'audio':
      case 'file':
        await this.handleFileMessage(event, message as any);
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
    
    // ตรวจสอบประเภทของ source
    if (source.type === 'user') {
      const userId = source.userId!;
      const trimmedText = text.trim();
      
      // ตรวจสอบคำสั่งพิเศษในแชทส่วนตัว
      if (trimmedText === 'ส่งงาน') {
        try {
          const user = await this.userService.findByLineUserId(userId);
          if (user) {
            const tasks = await this.taskService.getUserTasks(user.id, ['pending', 'in_progress']);
            if (tasks.length > 0) {
              // แสดงการ์ดใหญ่แสดงงานทั้งหมด พร้อมคำแนะนำการส่งงาน
              const allTasksCard = FlexMessageTemplateService.createAllPersonalTasksCard(tasks, [], user);
              const guideText =
                '💡 **วิธีการส่งงาน:**\n\n' +
                `📝 เลือกงานที่ต้องการส่งโดยพิมพ์เลข 1-${tasks.length} ในแชท\n\n` +
                '📎 **ถ้าต้องการแนบไฟล์:**\n' +
                '1. ส่งไฟล์ในแชทก่อน\n' +
                '2. เลือกงานที่ต้องการส่ง\n' +
                '3. เลือก "แนบไฟล์" ในการ์ดยืนยัน\n\n' +
                '📤 **ถ้าไม่ต้องการแนบไฟล์:**\n' +
                '1. เลือกงานที่ต้องการส่ง\n' +
                '2. เลือก "ไม่แนบไฟล์" ในการ์ดยืนยัน';

              await this.lineService.replyMessage(replyToken!, [allTasksCard, guideText]);
            } else {
              await this.lineService.replyMessage(replyToken!, '✅ ไม่มีงานที่ต้องส่งแล้วค่ะ');
            }
          }
        } catch (err: any) {
          await this.safeReplyError(replyToken!, `❌ ไม่สามารถดึงข้อมูลงานได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
        }
        return;
      } else if (trimmedText === 'งาน') {
        await this.handlePersonalTaskRequest(event);
        return;
      } else if (/^\d+$/.test(trimmedText)) {
        // ตรวจสอบว่าเป็นตัวเลขหรือไม่
        try {
          const user = await this.userService.findByLineUserId(userId);
          if (user) {
            const tasks = await this.taskService.getUserTasks(user.id, ['pending', 'in_progress']);
            const taskIndex = parseInt(trimmedText) - 1;
            
            if (taskIndex >= 0 && taskIndex < tasks.length) {
              const selectedTask = tasks[taskIndex];
              const personalGroupId = user.id;
              const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
              const { files } = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
              
              // แสดงการ์ดยืนยันการส่งงาน
              const confirmationCard = FlexMessageTemplateService.createTaskSubmissionConfirmationCard(selectedTask, files, user);
              await this.lineService.replyMessage(replyToken!, confirmationCard);
            } else {
              await this.lineService.replyMessage(replyToken!, 
                `❌ เลขที่ระบุไม่ถูกต้อง\n\n` +
                `📝 กรุณาพิมพ์เลข 1-${tasks.length} เท่านั้น\n\n` +
                `💡 พิมพ์ "ส่งงาน" เพื่อดูรายการงานใหม่`
              );
            }
          }
        } catch (err: any) {
          await this.safeReplyError(replyToken!, `❌ ไม่สามารถดึงข้อมูลงานได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
        }
        return;
      }
    }
    
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
        await this.safeReplyError(replyToken!, 
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
  private async handleFileMessage(event: MessageEvent, message: ImageMessage | VideoMessage | AudioMessage | any): Promise<void> {
    const { source, replyToken } = event;
    
    // ตรวจสอบประเภทของ source
    if (source.type === 'user') {
      // แชทส่วนตัว - บันทึกไฟล์และแสดงรายการไฟล์
      const userId = source.userId!;
      
      try {
        // บันทึกไฟล์
        const savedFile = await this.fileService.saveFileFromLine(message, userId, 'personal_chat');
        
        if (savedFile) {
          // หาไฟล์ทั้งหมดที่ส่งล่าสุด (24 ชม.)
          const user = await this.userService.findByLineUserId(userId);
          if (user) {
            const personalGroupId = user.id; // ใช้ user ID โดยตรง (เป็น UUID ที่ถูกต้อง)
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const { files } = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
            
            // สร้างการ์ดแสดงรายการไฟล์
            const fileListCard = FlexMessageTemplateService.createPersonalFileListCard(files, user, undefined);
            await this.lineService.replyMessage(replyToken!, fileListCard);
            
            logger.info('File saved and file list shown:', {
              fileId: savedFile.id,
              fileName: savedFile.originalName,
              totalFiles: files.length,
              userId: userId
            });
          }
        }
      } catch (error) {
        logger.error('Error saving file in personal chat:', error);
        await this.lineService.replyMessage(replyToken!, 
          '❌ ไม่สามารถบันทึกไฟล์ได้ กรุณาลองใหม่อีกครั้ง'
        );
      }
    } else if (source.type === 'group') {
      // แชทกลุ่ม - ไม่บันทึกอัตโนมัติ
      logger.info('File message received in group chat but ignored (auto-save disabled)', {
        messageId: (message as any).id,
        messageType: message.type,
        fileName: (message as any).fileName || 'unknown',
        groupId: source.groupId
      });
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
              // ดึงข้อมูลงานเพื่อตรวจสอบ requireAttachment
              const task = await this.taskService.getTaskById(taskId);
              
              if (!task) {
                await this.safeReplyError(replyToken, '❌ ไม่พบงานที่ระบุ');
                return;
              }
              
              // ตรวจสอบว่าต้องแนบไฟล์หรือไม่
              if (task.requireAttachment) {
                // ถ้าต้องแนบไฟล์ ให้แสดงการ์ดให้แนบไฟล์ก่อน
                let groupIdToUse = groupId;
                let groupName = 'กลุ่ม';
                if (source.type === 'user') {
                  const user = await this.userService.findByLineUserId(userId);
                  if (user) {
                    groupIdToUse = user.id; // ใช้ user ID โดยตรง (เป็น UUID ที่ถูกต้อง)
                    groupName = 'แชทส่วนตัว';
                  }
                }
                
                const group = { id: groupIdToUse, lineGroupId: groupIdToUse, name: groupName };
                const assignee = await this.userService.findByLineUserId(userId);
                
                const fileAttachmentCard = FlexMessageTemplateService.createFileAttachmentCard(task, group, assignee);
                await this.lineService.replyMessage(replyToken, fileAttachmentCard);
              } else {
                // ถ้าไม่ต้องแนบไฟล์ ให้ส่งงานทันที
                const submittedTask = await this.taskService.recordSubmission(taskId, userId, [], 'ส่งงานผ่านการกดปุ่มทำเครื่องหมายเสร็จ');
                await this.lineService.replyMessage(replyToken, '✅ ส่งงานเรียบร้อยแล้ว ระบบจะส่งงานไปให้ผู้ตรวจตรวจสอบภายใน 2 วัน');
              }
            } catch (err: any) {
              await this.safeReplyError(replyToken, `❌ ไม่สามารถส่งงานได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
            }
          }
          break;

        case 'submit_confirm': {
          const taskId = params.get('taskId')!;
          const fileIds = params.get('fileIds')?.split(',').filter(Boolean) || [];
          const note = params.get('note') || '';
          try {
            // ในแชทส่วนตัว ให้หาไฟล์ที่ส่งล่าสุด (24 ชม.) ถ้าไม่มี fileIds
            let finalFileIds = fileIds;
                         if (source.type === 'user' && fileIds.length === 0) {
               const user = await this.userService.findByLineUserId(userId);
               if (user) {
                 const personalGroupId = user.id; // ใช้ user ID โดยตรง (เป็น UUID ที่ถูกต้อง)
                 const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
                 try {
                   const result = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
                   finalFileIds = result.files?.map((f: any) => f.id) || [];
                 } catch (error) {
                   console.warn('Could not get personal chat files:', error);
                 }
               }
             }
            
            const task = await this.taskService.recordSubmission(taskId, userId, finalFileIds, note);
            await this.lineService.replyMessage(replyToken, `✅ ส่งงาน "${task.title}" พร้อมไฟล์แนบ ${finalFileIds.length} ไฟล์ สำเร็จแล้วค่ะ`);
          } catch (err: any) {
            await this.safeReplyError(replyToken, `❌ ส่งงานไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }

        case 'submit_nofile': {
          const taskId = params.get('taskId')!;
          const note = params.get('note') || '';
          try {
            // ในแชทส่วนตัว ให้หาไฟล์ที่ส่งล่าสุด (24 ชม.) เพื่อแนบ
            let fileIds: string[] = [];
                         if (source.type === 'user') {
               const user = await this.userService.findByLineUserId(userId);
               if (user) {
                 const personalGroupId = user.id; // ใช้ user ID โดยตรง (เป็น UUID ที่ถูกต้อง)
                 const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
                 try {
                   const result = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
                   fileIds = result.files?.map((f: any) => f.id) || [];
                 } catch (error) {
                   console.warn('Could not get personal chat files:', error);
                 }
               }
             }
            
            const task = await this.taskService.recordSubmission(taskId, userId, fileIds, note);
            if (fileIds.length > 0) {
              await this.lineService.replyMessage(replyToken, `📥 บันทึกการส่งงาน "${task.title}" พร้อมไฟล์แนบ ${fileIds.length} ไฟล์ แล้วค่ะ`);
            } else {
              await this.lineService.replyMessage(replyToken, `📥 บันทึกการส่งงาน (ไม่มีไฟล์แนบ) ให้ "${task.title}" แล้วค่ะ`);
            }
          } catch (err: any) {
            await this.safeReplyError(replyToken, `❌ ส่งงานไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
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
            
            // ในแชทส่วนตัว ให้ใช้ personal chat group
            let groupIdToUse = groupId;
            let groupName = 'กลุ่ม';
                           if (source.type === 'user') {
                 const user = await this.userService.findByLineUserId(userId);
                 if (user) {
                   groupIdToUse = user.id; // ใช้ user ID โดยตรง (เป็น UUID ที่ถูกต้อง)
                   groupName = 'แชทส่วนตัว';
                 }
               }
            
            const group = { id: groupIdToUse, lineGroupId: groupIdToUse, name: groupName };
            const assignee = await this.userService.findByLineUserId(userId);
            
            const fileAttachmentCard = FlexMessageTemplateService.createFileAttachmentCard(task, group, assignee);
            await this.lineService.replyMessage(replyToken, fileAttachmentCard);
          } catch (err: any) {
            await this.safeReplyError(replyToken, `❌ ไม่สามารถแสดงการ์ดแนบไฟล์ได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }

        case 'confirm_submit': {
          const taskId = params.get('taskId')!;
          try {
            // ส่งการ์ดยืนยันการส่งงาน
            const task = await this.taskService.getTaskById(taskId);
            
            // ในแชทส่วนตัว ให้หาไฟล์จาก personal chat ของผู้ใช้
            let files: any[] = [];
            if (source.type === 'user') {
              // แชทส่วนตัว - หาไฟล์จาก personal chat
              const user = await this.userService.findByLineUserId(userId);
                           if (user) {
               const personalGroupId = user.id; // ใช้ user ID โดยตรง (เป็น UUID ที่ถูกต้อง)
               const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
               try {
                 const result = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
                 files = result.files || [];
               } catch (error) {
                 console.warn('Could not get personal chat files:', error);
                 files = [];
               }
             }
            } else {
              // แชทกลุ่ม - หาไฟล์จากกลุ่ม
              const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
              const result = await this.fileService.getGroupFiles(groupId, { startDate: since });
              files = result.files || [];
            }
            
            const group = { 
              id: source.type === 'user' ? userId : groupId, 
              lineGroupId: source.type === 'user' ? `personal_${userId}` : groupId, 
              name: source.type === 'user' ? 'แชทส่วนตัว' : 'กลุ่ม' 
            };
            
            const submitConfirmationCard = FlexMessageTemplateService.createSubmitConfirmationCard(
              task, 
              group, 
              files.length, 
              files.map((f: any) => f.originalName)
            );
            await this.lineService.replyMessage(replyToken, submitConfirmationCard);
          } catch (err: any) {
            await this.safeReplyError(replyToken, `❌ ไม่สามารถแสดงการ์ดยืนยันได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
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
              await this.safeReplyError(replyToken, `❌ อนุมัติไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
            }
          }
          break;
        }

        case 'approve_review': {
          const taskId = params.get('taskId');
          if (taskId) {
            try {
              await this.taskService.approveReview(taskId, userId);
              await this.lineService.replyMessage(replyToken, '✅ อนุมัติการตรวจเรียบร้อยแล้ว');
            } catch (err: any) {
              await this.safeReplyError(replyToken, `❌ อนุมัติการตรวจไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
            }
          }
          break;
        }

        case 'approve_completion': {
          const taskId = params.get('taskId');
          if (taskId) {
            try {
              await this.taskService.approveCompletion(taskId, userId);
              await this.lineService.replyMessage(replyToken, '✅ อนุมัติการปิดงานเรียบร้อยแล้ว');
            } catch (err: any) {
              await this.safeReplyError(replyToken, `❌ อนุมัติการปิดงานไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
            }
          }
          break;
        }

        case 'submit_task': {
          const taskId = params.get('taskId');
          if (taskId) {
            try {
              // ส่งการ์ดให้แนบไฟล์สำหรับงานที่ถูกตีกลับ
              const task = await this.taskService.getTaskById(taskId);
              const group = { id: groupId, lineGroupId: groupId, name: 'กลุ่ม' };
              const assignee = await this.userService.findByLineUserId(userId);
              
              const fileAttachmentCard = FlexMessageTemplateService.createFileAttachmentCard(task, group, assignee);
              await this.lineService.replyMessage(replyToken, fileAttachmentCard);
            } catch (err: any) {
              await this.safeReplyError(replyToken, `❌ ไม่สามารถแสดงการ์ดแนบไฟล์ได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
            }
          }
          break;
        }

        case 'reject_task': {
          const taskId = params.get('taskId');
          const extensionDays = parseInt(params.get('extensionDays') || '3');
          if (taskId) {
            try {
              await this.taskService.rejectTaskAndExtendDeadline(taskId, userId, extensionDays);
              await this.safeReplyError(replyToken, `❌ ตีกลับงานและขยายเวลาออกไป ${extensionDays} วันเรียบร้อย`);
            } catch (err: any) {
              await this.safeReplyError(replyToken, `❌ ตีกลับงานไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
            }
          }
          break;
        }

        case 'edit':
          // TODO: ส่งลิงก์ไปยังหน้าเว็บสำหรับแก้ไข
          break;

        case 'show_personal_tasks': {
          try {
            // แสดงงานที่ต้องส่งในแชทส่วนตัว
            const user = await this.userService.findByLineUserId(userId);
            if (user) {
              // หาไฟล์ที่ส่งล่าสุด (24 ชม.)
              const personalGroupId = user.id; // ใช้ user ID โดยตรง (เป็น UUID ที่ถูกต้อง)
              const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
              const { files } = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
              
              // หางานที่ต้องส่ง (pending, in_progress)
              const tasks = await this.taskService.getUserTasks(user.id, ['pending', 'in_progress']);
              
                             if (tasks.length > 0) {
                 if (tasks.length === 1) {
                   // ถ้ามีงานเดียว แสดงงานนั้นพร้อมไฟล์
                   const task = tasks[0];
                   const taskWithFilesCard = FlexMessageTemplateService.createPersonalTaskWithFilesCard(task, files, user);
                   await this.lineService.replyMessage(replyToken, taskWithFilesCard);
                   
                   // แสดงการ์ดรายการไฟล์พร้อม taskId
                   const fileListCard = FlexMessageTemplateService.createPersonalFileListCard(files, user, task.id);
                   await this.lineService.replyMessage(replyToken, fileListCard);
                 } else {
                   // ถ้ามีหลายงาน แสดงรายการงานทั้งหมด
                   const taskListCard = FlexMessageTemplateService.createPersonalTaskListCard(tasks, files, user);
                   await this.lineService.replyMessage(replyToken, taskListCard);
                 }
               } else {
                 await this.lineService.replyMessage(replyToken, '✅ ไม่มีงานที่ต้องส่งแล้วค่ะ');
               }
            }
          } catch (err: any) {
            await this.safeReplyError(replyToken, `❌ ไม่สามารถแสดงงานได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }

        case 'show_personal_files': {
          try {
            // แสดงรายการไฟล์ทั้งหมดในแชทส่วนตัว
            const user = await this.userService.findByLineUserId(userId);
            if (user) {
              const personalGroupId = user.id; // ใช้ user ID โดยตรง (เป็น UUID ที่ถูกต้อง)
              const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
              const { files } = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
              
              const fileListCard = FlexMessageTemplateService.createPersonalFileListCard(files, user, undefined);
              await this.lineService.replyMessage(replyToken, fileListCard);
            }
          } catch (err: any) {
            await this.safeReplyError(replyToken, `❌ ไม่สามารถแสดงไฟล์ได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }

        case 'clear_personal_files': {
          try {
            // ล้างไฟล์ทั้งหมดในแชทส่วนตัว (ลบไฟล์เก่าเกิน 24 ชม.)
            const user = await this.userService.findByLineUserId(userId);
            if (user) {
              const personalGroupId = user.id; // ใช้ user ID โดยตรง (เป็น UUID ที่ถูกต้อง)
              const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
              const { files } = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
              
              // ลบไฟล์เก่าเกิน 24 ชม.
              const oldFiles = files.filter((f: any) => new Date(f.uploadedAt) < since);
              for (const file of oldFiles) {
                try {
                  await this.fileService.deleteFile(file.id);
                } catch (error) {
                  console.warn('Could not delete old file:', file.id, error);
                }
              }
              
              await this.lineService.replyMessage(replyToken, `🗑️ ล้างไฟล์เก่า ${oldFiles.length} ไฟล์เรียบร้อยแล้วค่ะ`);
            }
          } catch (err: any) {
            await this.safeReplyError(replyToken, `❌ ไม่สามารถล้างไฟล์ได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }

        case 'submit_with_personal_files': {
          const taskId = params.get('taskId');
          try {
            // ส่งงานพร้อมไฟล์จากแชทส่วนตัว
            const user = await this.userService.findByLineUserId(userId);
            if (user) {
              const personalGroupId = user.id; // ใช้ user ID โดยตรง (เป็น UUID ที่ถูกต้อง)
              const since = new Date(Date.now() - 60 * 60 * 1000);
              const { files } = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
              
              if (taskId) {
                // ส่งงานเฉพาะที่ระบุ
                const fileIds = files.map((f: any) => f.id);
                const task = await this.taskService.recordSubmission(taskId, userId, fileIds, 'ส่งงานพร้อมไฟล์จากแชทส่วนตัว');
                
                await this.lineService.replyMessage(replyToken, 
                  `✅ ส่งงาน "${task.title}" พร้อมไฟล์แนบ ${fileIds.length} ไฟล์ สำเร็จแล้วค่ะ\n\n` +
                  `ระบบจะส่งงานไปให้ผู้ตรวจตรวจสอบภายใน 2 วัน`
                );
              } else {
                // ถ้าไม่มี taskId ให้แสดงงานที่ต้องส่ง
                const tasks = await this.taskService.getUserTasks(user.id, ['pending', 'in_progress']);
                if (tasks.length > 0) {
                  const task = tasks[0];
                  const taskWithFilesCard = FlexMessageTemplateService.createPersonalTaskWithFilesCard(task, files, user);
                  await this.lineService.replyMessage(replyToken, taskWithFilesCard);
                } else {
                  await this.lineService.replyMessage(replyToken, '✅ ไม่มีงานที่ต้องส่งแล้วค่ะ');
                }
              }
            }
          } catch (err: any) {
            await this.safeReplyError(replyToken, `❌ ส่งงานไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }

        case 'confirm_task_submission': {
          const taskId = params.get('taskId');
          const hasFiles = params.get('hasFiles') === 'true';
          try {
            const user = await this.userService.findByLineUserId(userId);
            if (user && taskId) {
              const task = await this.taskService.getTaskById(taskId);
              if (task) {
                if (hasFiles) {
                  // ถ้ามีไฟล์ ให้แนบไฟล์ก่อน
                  const personalGroupId = user.id;
                  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
                  const { files } = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
                  
                  if (files.length > 0) {
                    const fileIds = files.map((f: any) => f.id);
                    const submittedTask = await this.taskService.recordSubmission(taskId, userId, fileIds, 'ส่งงานพร้อมไฟล์จากแชทส่วนตัว');
                    await this.lineService.replyMessage(replyToken, 
                      `✅ ส่งงาน "${submittedTask.title}" พร้อมไฟล์แนบ ${fileIds.length} ไฟล์ สำเร็จแล้วค่ะ\n\n` +
                      `ระบบจะส่งงานไปให้ผู้ตรวจตรวจสอบภายใน 2 วัน`
                    );
                  } else {
                    await this.safeReplyError(replyToken, '❌ ไม่พบไฟล์ที่ส่งมา กรุณาส่งไฟล์ก่อนค่ะ');
                  }
                } else {
                  // ถ้าไม่มีไฟล์ ส่งงานเลย
                  const submittedTask = await this.taskService.recordSubmission(taskId, userId, [], 'ส่งงานโดยไม่มีไฟล์แนบ');
                  await this.lineService.replyMessage(replyToken, 
                    `✅ ส่งงาน "${submittedTask.title}" สำเร็จแล้วค่ะ (ไม่มีไฟล์แนบ)\n\n` +
                    `ระบบจะส่งงานไปให้ผู้ตรวจตรวจสอบภายใน 2 วัน`
                  );
                }
              } else {
                await this.safeReplyError(replyToken, '❌ ไม่พบงานที่ระบุ');
              }
            }
          } catch (err: any) {
            await this.safeReplyError(replyToken, `❌ ส่งงานไม่สำเร็จ: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }

        case 'show_all_personal_tasks': {
          try {
            // แสดงงานทั้งหมดที่ต้องส่ง
            const user = await this.userService.findByLineUserId(userId);
            if (user) {
              const personalGroupId = user.id;
              const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
              const { files } = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
              
              const tasks = await this.taskService.getUserTasks(user.id, ['pending', 'in_progress']);
              if (tasks.length > 0) {
                const allTasksCard = FlexMessageTemplateService.createAllPersonalTasksCard(tasks, files, user);
                await this.lineService.replyMessage(replyToken, allTasksCard);
              } else {
                await this.lineService.replyMessage(replyToken, '✅ ไม่มีงานที่ต้องส่งแล้วค่ะ');
              }
            }
          } catch (err: any) {
            await this.safeReplyError(replyToken, `❌ ไม่สามารถแสดงงานได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }

        case 'show_more_personal_tasks': {
          try {
            // แสดงงานเพิ่มเติม (ถ้ามีมากกว่า 5 งาน)
            const user = await this.userService.findByLineUserId(userId);
            if (user) {
              const personalGroupId = user.id;
              const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
              const { files } = await this.fileService.getGroupFiles(personalGroupId, { startDate: since });
              
              const tasks = await this.taskService.getUserTasks(user.id, ['pending', 'in_progress']);
              if (tasks.length > 5) {
                const remainingTasks = tasks.slice(5);
                const moreTasksCard = FlexMessageTemplateService.createAllPersonalTasksCard(remainingTasks, files, user);
                await this.lineService.replyMessage(replyToken, moreTasksCard);
              } else {
                await this.lineService.replyMessage(replyToken, '✅ ไม่มีงานเพิ่มเติมแล้วค่ะ');
              }
            }
          } catch (err: any) {
            await this.safeReplyError(replyToken, `❌ ไม่สามารถแสดงงานได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }

        case 'show_task_files': {
          const taskId = params.get('taskId');
          const groupId = params.get('groupId');
          try {
            if (taskId && groupId) {
              // ดึงข้อมูลงานและไฟล์
              const task = await this.taskService.getTaskById(taskId);
              const files = await this.fileService.getTaskFiles(taskId);
              
              if (task && files.length > 0) {
                // สร้างการ์ดแสดงไฟล์ของงาน
                const taskFilesCard = FlexMessageTemplateService.createTaskFilesCard(task, files, { id: groupId });
                await this.lineService.replyMessage(replyToken, taskFilesCard);
              } else if (task) {
                await this.lineService.replyMessage(replyToken, `📋 งาน "${task.title}" ไม่มีไฟล์แนบค่ะ`);
              } else {
                await this.lineService.replyMessage(replyToken, '❌ ไม่พบงานที่ระบุ');
              }
            } else {
              await this.lineService.replyMessage(replyToken, '❌ ข้อมูลไม่ครบถ้วน');
            }
          } catch (err: any) {
            await this.safeReplyError(replyToken, `❌ ไม่สามารถแสดงไฟล์ได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
          }
          break;
        }
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
              await this.safeReplyError(replyToken, `❌ ไม่สามารถผูกไฟล์ได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
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
                  response += `👤 ${fileData.uploadedByUser?.displayName || 'ไม่ทราบ'}\n`;
                  if (fileData.linkedTasks && fileData.linkedTasks.length > 0) {
                    response += `📋 มาจากงาน: ${fileData.linkedTasks[0].title}\n`;
                  }
                  response += `\n`;
                }
              } catch (error) {
                console.error('Error getting file:', error);
              }
            }
            await this.lineService.replyMessage(replyToken, response);
          }
          break;
        }







        case 'view_details': {
          const taskId = params.get('taskId');
          if (taskId) {
            try {
              // สร้างลิงก์ไปยังหน้ารายละเอียดงาน
              const taskDetailUrl = `${config.baseUrl}/dashboard/task/${taskId}`;
              const message = `📋 รายละเอียดงาน\n\n🔗 ดูรายละเอียดเพิ่มเติมได้ที่:\n${taskDetailUrl}`;
              
              await this.lineService.replyMessage(replyToken, message);
            } catch (err: any) {
              await this.safeReplyError(replyToken, `❌ ไม่สามารถแสดงรายละเอียดงานได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
            }
          }
          break;
        }

        case 'request_extension': {
          const taskId = params.get('taskId');
          const groupId = params.get('groupId');
          
          if (taskId && groupId) {
            try {
              // ตรวจสอบว่าเกิน 1 วันหรือไม่
              const task = await this.taskService.getTaskById(taskId);
              if (!task) {
                await this.safeReplyError(replyToken, '❌ ไม่พบงานที่ระบุ');
                return;
              }

              const taskCreatedAt = new Date(task.createdAt);
              const oneDayLater = new Date(taskCreatedAt.getTime() + 24 * 60 * 60 * 1000);
              const now = new Date();

              if (now >= oneDayLater) {
                await this.lineService.replyMessage(replyToken, '❌ เลย 1 วันแล้ว ไม่สามารถขอเลื่อนได้');
                return;
              }

              // ส่งการ์ดขอเลื่อนไปยังผู้สร้างงาน
              const creator = await this.userService.findById(task.createdBy);
              if (creator && creator.lineUserId) {
                const extensionCard = await this.createExtensionRequestCard(task, groupId, userId);
                await this.lineService.pushMessage(creator.lineUserId, extensionCard);
                
                await this.lineService.replyMessage(replyToken, 
                  `✅ ส่งคำขอเลื่อนเวลาไปยังผู้สร้างงานแล้ว\n\n` +
                  `📋 งาน: ${task.title}\n` +
                  `👤 ผู้สร้าง: ${creator.displayName}\n\n` +
                  `⏰ รอการอนุมัติจากผู้สร้างงาน`
                );
              } else {
                await this.safeReplyError(replyToken, '❌ ไม่พบผู้สร้างงาน');
              }
            } catch (err: any) {
              await this.safeReplyError(replyToken, `❌ ไม่สามารถส่งคำขอเลื่อนได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
            }
          } else {
            await this.safeReplyError(replyToken, '❌ ข้อมูลไม่ครบถ้วน');
          }
          break;
        }

        case 'reject_extension': {
          const taskId = params.get('taskId');
          const requesterId = params.get('requesterId');
          
          if (taskId && requesterId) {
            try {
              const task = await this.taskService.getTaskById(taskId);
              if (!task) {
                await this.safeReplyError(replyToken, '❌ ไม่พบงานที่ระบุ');
                return;
              }

              // ส่งการ์ดปฏิเสธไปยังผู้ขอ
              const requester = await this.userService.findByLineUserId(requesterId);
              if (requester && requester.lineUserId) {
                // ส่งการ์ดแจ้งเตือนการปฏิเสธ
                await this.notificationService.sendExtensionRejectedNotification(
                  task as any, 
                  requester as any
                );
              }

              await this.lineService.replyMessage(replyToken, '✅ ปฏิเสธคำขอเลื่อนเวลาแล้ว');
            } catch (err: any) {
              await this.safeReplyError(replyToken, `❌ ไม่สามารถปฏิเสธคำขอได้: ${err.message || 'เกิดข้อผิดพลาด'}`);
            }
          } else {
            await this.safeReplyError(replyToken, '❌ ข้อมูลไม่ครบถ้วน');
          }
          break;
        }

        default:
          console.log('ℹ️ Unhandled postback action:', action);
      }

    } catch (error) {
      console.error('❌ Error handling postback:', error);
      
      // ตรวจสอบ replyToken ก่อนส่งข้อความ
      await this.safeReplyError(replyToken, 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  }

  /**
   * ส่งข้อความ error ไปยัง LINE อย่างปลอดภัย
   */
  private async safeReplyError(replyToken: string, errorMessage: string): Promise<void> {
    try {
      // ตรวจสอบ replyToken
      if (!replyToken || replyToken.trim() === '') {
        console.warn('⚠️ No valid replyToken to send error message');
        return;
      }

      // ตรวจสอบข้อความ error
      if (!errorMessage || errorMessage.trim() === '') {
        errorMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
      }

      // จำกัดความยาวข้อความเพื่อป้องกันปัญหา
      if (errorMessage.length > 1000) {
        errorMessage = errorMessage.substring(0, 997) + '...';
      }

      await this.lineService.replyMessage(replyToken, errorMessage);
    } catch (lineError) {
      console.error('❌ Failed to send error message to LINE:', lineError);
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
   * จัดการคำขอดูงานในแชทส่วนตัว
   */
  private async handlePersonalTaskRequest(event: MessageEvent): Promise<void> {
    try {
      const { source, replyToken } = event;
      const userId = source.userId!;

      // ดึงงานทั้งหมดที่ผู้ใช้เป็นผู้รับผิดชอบและยังไม่เสร็จ
      const userTasks = await this.taskService.getUserIncompleteTasks(userId);
      
      if (userTasks.length === 0) {
        await this.lineService.replyMessage(event.replyToken!, 
          '📋 คุณไม่มีงานที่ต้องทำในขณะนี้ค่ะ\n\n💡 งานจะแสดงที่นี่เมื่อคุณได้รับมอบหมายงานใหม่');
        return;
      }

      // จัดกลุ่มงานตามกลุ่ม
      const tasksByGroup = this.groupTasksByGroup(userTasks);
      
      // สร้าง Flex Message แสดงงานทั้งหมด
      const flexMessage = this.createPersonalTasksFlexMessage(tasksByGroup);
      
      await this.lineService.replyMessage(event.replyToken!, flexMessage);
      
          } catch (error) {
        console.error('❌ Error handling personal task request:', error);
        await this.lineService.replyMessage(event.replyToken!, 
          'เกิดข้อผิดพลาดในการดึงข้อมูลงาน กรุณาลองใหม่อีกครั้ง');
      }
  }

  /**
   * จัดกลุ่มงานตามกลุ่ม
   */
  private groupTasksByGroup(tasks: any[]): { [groupId: string]: { groupName: string; tasks: any[] } } {
    const grouped: { [groupId: string]: { groupName: string; tasks: any[] } } = {};
    
    for (const task of tasks) {
      const groupId = task.groupId;
      if (!grouped[groupId]) {
        grouped[groupId] = {
          groupName: task.group?.name || `กลุ่ม ${groupId.substring(0, 8)}`,
          tasks: []
        };
      }
      grouped[groupId].tasks.push(task);
    }
    
    return grouped;
  }

      /**
   * สร้าง Flex Message แสดงงานส่วนตัว
   */
  private createPersonalTasksFlexMessage(tasksByGroup: { [groupId: string]: { groupName: string; tasks: any[] } }): any {
    const groupEntries = Object.entries(tasksByGroup);
    
    const content: any[] = [
      FlexMessageDesignSystem.createText(
        `📋 งานที่ต้องทำของคุณ (${Object.values(tasksByGroup).reduce((total, group) => total + group.tasks.length, 0)} รายการ)`,
        'lg',
        FlexMessageDesignSystem.colors.textPrimary,
        'bold',
        true
      ),
      // เพิ่มคำอธิบายสถานะงาน
      FlexMessageDesignSystem.createText(
        '⏳ รอทำ | 🔄 กำลังทำ | ⚠️ เกินกำหนด',
        'xs',
        FlexMessageDesignSystem.colors.textSecondary,
        undefined,
        true
      )
    ];

    // เพิ่มงานแต่ละกลุ่ม
    for (const [groupId, groupData] of groupEntries) {
      // หัวข้อกลุ่ม - ใช้ชื่อกลุ่มจริง
      content.push(
        FlexMessageDesignSystem.createText(
          `🏷️ ${groupData.groupName}`,
          'md',
          FlexMessageDesignSystem.colors.primary,
          'bold',
          true
        )
      );

      // งานในกลุ่ม
      for (const task of groupData.tasks.slice(0, 10)) { // แสดง 10 งานแรก
        const statusEmoji = this.getTaskStatusEmoji(task.status);
        const dueDate = task.dueTime ? moment(task.dueTime).format('DD/MM HH:mm') : 'ไม่มีกำหนด';
        
        // ใช้ "|" ขีดคั่นบอกสถานะงาน
        content.push(
          FlexMessageDesignSystem.createText(
            `${statusEmoji} ${task.title} | ⏰ ${dueDate}`,
            'sm',
            FlexMessageDesignSystem.colors.textPrimary
          )
        );
      }

              // แสดงจำนวนงานที่เหลือ
        if (groupData.tasks.length > 10) {
          content.push(
            FlexMessageDesignSystem.createText(
              `... และอีก ${groupData.tasks.length - 10} งาน`,
              'xs',
              FlexMessageDesignSystem.colors.textSecondary,
              undefined,
              true
            )
          );
        }

      // เพิ่มเส้นคั่นระหว่างกลุ่ม
      if (groupEntries.indexOf([groupId, groupData]) < groupEntries.length - 1) {
        content.push({
          type: 'separator',
          margin: 'lg'
        });
      }
    }

    // ปุ่มดูงานทั้งหมด
    const buttons = [
      FlexMessageDesignSystem.createButton(
        'ดูงานทั้งหมดในเว็บ',
        'uri',
        `${config.baseUrl}/dashboard/my-tasks`,
        'primary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '📋 งานที่ต้องทำของคุณ',
      '📋',
      FlexMessageDesignSystem.colors.primary,
      content,
      buttons,
      'extraLarge'
    );
  }

  /**
   * ได้ emoji สถานะงาน
   */
  private getTaskStatusEmoji(status: string): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'in_progress': return '🔄';
      case 'submitted': return '📤';
      case 'reviewed': return '👀';
      default: return '📋';
    }
  }

  /**
   * ตรวจสอบและสร้าง User record (สำหรับแชทส่วนตัว)
   */
  private async ensureUserExists(userId: string): Promise<void> {
    try {
      console.log(`🔍 ตรวจสอบและสร้าง User record สำหรับแชทส่วนตัว: ${userId}`);
      
      // ตรวจสอบ user
      let user = await this.userService.findByLineUserId(userId);
      if (!user) {
        try {
          const profile = await this.lineService.getUserProfile(userId);
          user = await this.userService.createUser({
            lineUserId: userId,
            displayName: profile.displayName
          });
          console.log(`✅ สร้างผู้ใช้ใหม่สำหรับแชทส่วนตัว: ${profile.displayName}`);
        } catch (error: any) {
          if (error.status === 403) {
            console.warn('⚠️ ไม่สามารถดึงข้อมูล profile ได้ ใช้ชื่อพื้นฐานแทน');
            user = await this.userService.createUser({
              lineUserId: userId,
              displayName: `User ${userId.substring(0, 8)}`
            });
            console.log(`✅ สร้างผู้ใช้ใหม่ด้วยชื่อพื้นฐาน: ${user.displayName}`);
          } else {
            throw error;
          }
        }
      } else {
        console.log(`ℹ️ ผู้ใช้มีอยู่ในฐานข้อมูลแล้ว: ${user.displayName}`);

        // หากชื่อผู้ใช้ยังเป็นค่าเริ่มต้น เช่น "ไม่ทราบ" ให้ลองอัปเดตอีกครั้งจาก LINE
        const unknownNames = ['ไม่ทราบ', 'ผู้ใช้ไม่ทราบชื่อ', ''];
        if (unknownNames.includes(user.displayName)) {
          try {
            const profile = await this.lineService.getUserProfile(userId);
            if (profile.displayName && !unknownNames.includes(profile.displayName)) {
              await this.userService.updateUser(user.id, {
                displayName: profile.displayName,
                realName: profile.displayName
              });
              console.log(`🔄 อัปเดตชื่อผู้ใช้จาก 'ไม่ทราบ' เป็น ${profile.displayName}`);
            }
          } catch (error) {
            console.warn('⚠️ ไม่สามารถอัปเดตชื่อผู้ใช้จาก LINE API ได้:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error ensuring user exists:', error);
    }
  }

  /**
   * ตรวจสอบและสร้าง User/Group record
   */
  private async ensureUserAndGroup(userId: string, groupId: string): Promise<void> {
    try {
      console.log(`🔍 ตรวจสอบและสร้าง User/Group record: ${userId} ในกลุ่ม ${groupId}`);
      
      // ใช้ LineService.checkAndSaveNewMember เพื่อให้ได้ข้อมูลที่ครบถ้วน
      const result = await this.lineService.checkAndSaveNewMember(groupId, userId);
      
      if (result.isNewMember) {
        console.log(`✅ เพิ่มสมาชิกใหม่ลงฐานข้อมูล: ${result.memberInfo?.displayName || userId}`);
      } else {
        console.log(`ℹ️ สมาชิกมีอยู่ในฐานข้อมูลแล้ว: ${userId}`);
      }
      
      // ตรวจสอบว่ากลุ่มมีอยู่ในฐานข้อมูลหรือไม่
      let group = await this.userService.findGroupByLineId(groupId);
      if (!group) {
        group = await this.userService.createGroup({
          lineGroupId: groupId,
          name: `กลุ่ม ${groupId.substring(0, 8)}`
        });
        console.log(`✅ สร้างกลุ่มใหม่: ${group.name}`);
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
      console.log(`🔍 ตรวจสอบสมาชิกใหม่ที่ส่งข้อความ: ${userId} ในกลุ่ม ${groupId}`);
      
      // ใช้ LineService.checkAndSaveNewMember แทน เพื่อให้ได้ข้อมูลที่ครบถ้วน
      const result = await this.lineService.checkAndSaveNewMember(groupId, userId);
      
      if (result.isNewMember) {
        console.log(`✅ เพิ่มสมาชิกใหม่ลงฐานข้อมูล: ${result.memberInfo?.displayName || userId}`);
      } else {
        console.log(`ℹ️ สมาชิกมีอยู่ในฐานข้อมูลแล้ว: ${userId}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to check/save new member:', error);
    }
  }

  /**
   * ได้ MIME type จากชื่อไฟล์
   */
  private getMimeTypeFromFileName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeMap: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      'mp3': 'audio/mpeg',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime'
    };
    return mimeMap[ext || ''] || 'application/octet-stream';
  }

  /**
   * จัดรูปแบบขนาดไฟล์
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * สร้างการ์ดขอเลื่อนเวลา
   */
  private async createExtensionRequestCard(task: any, groupId: string, requesterId: string): Promise<any> {
    const requester = await this.userService.findByLineUserId(requesterId);
    const dueDate = moment(task.dueTime).tz(config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
    
    const content = [
      FlexMessageDesignSystem.createText(`📋 งาน: ${task.title}`, 'sm', FlexMessageDesignSystem.colors.textPrimary, 'bold'),
      FlexMessageDesignSystem.createText(`📅 กำหนดส่งเดิม: ${dueDate}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`👤 ผู้ขอ: ${requester?.displayName || 'ไม่ทราบ'}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
      FlexMessageDesignSystem.createText(`📝 เหตุผล: ขอเลื่อนเวลาส่งงาน`, 'sm', FlexMessageDesignSystem.colors.textSecondary),
      FlexMessageDesignSystem.createSeparator('medium'),
      FlexMessageDesignSystem.createText('💡 กดปุ่มด้านล่างเพื่ออนุมัติและเลือกวันกำหนดงานใหม่', 'xs', FlexMessageDesignSystem.colors.textSecondary)
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton(
        'อนุมัติและเลือกวันใหม่', 
        'uri', 
        `${config.baseUrl}/dashboard?groupId=${groupId}&taskId=${task.id}&action=approve_extension`, 
        'primary'
      ),
      FlexMessageDesignSystem.createButton(
        'ปฏิเสธ', 
        'postback', 
        `action=reject_extension&taskId=${task.id}&requesterId=${requesterId}`, 
        'secondary'
      )
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      '⏰ คำขอเลื่อนเวลา',
      '⏰',
      FlexMessageDesignSystem.colors.warning,
      content,
      buttons,
      'compact'
    );
  }
}

const webhookController = new WebhookController();

// Routes
webhookRouter.post('/', (req, res) => webhookController.handleWebhook(req, res));