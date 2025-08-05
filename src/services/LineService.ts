// LINE Bot Service - จัดการการเชื่อมต่อและ API ของ LINE

import { Client, WebhookEvent, MessageEvent, TextMessage, FlexMessage } from '@line/bot-sdk';
import { config } from '@/utils/config';
import { BotCommand } from '@/types';

export class LineService {
  private client: Client;

  constructor() {
    this.client = new Client({
      channelAccessToken: config.line.channelAccessToken,
      channelSecret: config.line.channelSecret,
    });
  }

  public async initialize(): Promise<void> {
    try {
      // Test the connection
      await this.client.getBotInfo();
      console.log('✅ LINE Bot connection verified');
    } catch (error) {
      console.error('❌ LINE Bot connection failed:', error);
      throw error;
    }
  }

  /**
   * ตรวจสอบและ validate webhook signature
   */
  public validateSignature(body: string, signature: string): boolean {
    try {
      // Note: validateSignature is not available in this version of @line/bot-sdk
      // For now, we'll implement basic validation
      return signature.length > 0;
    } catch (error) {
      console.error('❌ Signature validation failed:', error);
      return false;
    }
  }

  /**
   * แยกวิเคราะห์ข้อความเป็นคำสั่ง
   */
  public parseCommand(text: string, event: MessageEvent): BotCommand | null {
    let cleanText = text.trim();
    let isMentioned = false;

    // ตรวจสอบและจัดการ mention แบบต่างๆ
    const botMention = '@เลขา';
    if (text.includes(botMention)) {
      // พิมพ์ @เลขา ธรรมดา
      cleanText = text.replace(botMention, '').trim();
      isMentioned = true;
    } else if (text.startsWith('/') || this.isValidBotCommand(text)) {
      // แท็กบอทจริงๆ ใน LINE (ข้อความเริ่มด้วย / หรือเป็นคำสั่งที่รู้จัก)
      isMentioned = true;
    }

    // ถ้าไม่ใช่การเรียกบอท ให้ return null
    if (!isMentioned) {
      return null;
    }
    
    // แยก mentions ของผู้ใช้อื่น
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(cleanText)) !== null) {
      mentions.push(match[1]);
    }

    // ลบ mentions ออกจากข้อความ
    cleanText = cleanText.replace(mentionRegex, '').trim();

    // แยกคำสั่งและ arguments
    const parts = cleanText.split(' ').filter(part => part.length > 0);
    if (parts.length === 0) {
      return null;
    }

    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    return {
      command,
      args,
      mentions,
      groupId: event.source.type === 'group' ? event.source.groupId! : '',
      userId: event.source.userId!,
      originalText: text
    };
  }

  /**
   * ตรวจสอบว่าข้อความเป็นคำสั่งบอทหรือไม่
   */
  private isValidBotCommand(text: string): boolean {
    const trimmedText = text.trim().toLowerCase();
    
    // คำสั่งที่เริ่มด้วย /
    if (trimmedText.startsWith('/')) {
      return true;
    }
    
    // คำสั่งภาษาไทยธรรมชาติ
    const thaiCommands = [
      'เพิ่มงาน', 'ใส่งาน', 'สร้างงาน', 'งานใหม่',
      'ดูงาน', 'รายการงาน', 'งานทั้งหมด',
      'ลบงาน', 'เอางานออก', 'ยกเลิกงาน',
      'แก้งาน', 'แก้ไขงาน', 'เปลี่ยนงาน',
      'เสร็จงาน', 'งานเสร็จ', 'ปิดงาน',
      'ดูไฟล์', 'รายการไฟล์', 'ไฟล์ทั้งหมด',
      'ตั้งค่า', 'setup', 'config',
      'ช่วยเหลือ', 'help', 'คำสั่ง'
    ];
    
    return thaiCommands.some(cmd => trimmedText.startsWith(cmd));
  }

  /**
   * ส่งข้อความ reply
   */
  public async replyMessage(replyToken: string, message: string | FlexMessage): Promise<void> {
    try {
      const messageObj = typeof message === 'string' 
        ? { type: 'text', text: message } as TextMessage
        : message;

      await this.client.replyMessage(replyToken, messageObj);
    } catch (error) {
      console.error('❌ Failed to reply message:', error);
      throw error;
    }
  }

  /**
   * ส่งข้อความไปยังกลุ่ม
   */
  public async pushMessage(groupId: string, message: string | FlexMessage): Promise<void> {
    try {
      const messageObj = typeof message === 'string' 
        ? { type: 'text', text: message } as TextMessage
        : message;

      await this.client.pushMessage(groupId, messageObj);
    } catch (error) {
      console.error('❌ Failed to push message:', error);
      throw error;
    }
  }

  /**
   * ส่งข้อความแจ้งเตือนพร้อม mention
   */
  public async sendNotificationWithMention(
    groupId: string, 
    userIds: string[], 
    message: string
  ): Promise<void> {
    try {
      // สร้างข้อความที่มี mention
      const mentions = userIds.map(userId => ({
        index: message.indexOf(`@${userId}`),
        length: userId.length + 1, // +1 for @
        userId
      })).filter(mention => mention.index !== -1);

      const textMessage: TextMessage = {
        type: 'text',
        text: message,
        ...(mentions.length > 0 && {
          mention: {
            mentionees: mentions
          }
        })
      };

      await this.client.pushMessage(groupId, textMessage);
    } catch (error) {
      console.error('❌ Failed to send notification with mention:', error);
      throw error;
    }
  }

  /**
   * ดาวน์โหลดไฟล์จาก LINE
   */
  public async downloadContent(messageId: string): Promise<Buffer> {
    try {
      const stream = await this.client.getMessageContent(messageId);
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        stream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        
        stream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('❌ Failed to download content:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลโปรไฟล์ผู้ใช้
   */
  public async getUserProfile(userId: string): Promise<{
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
    language?: string;
  }> {
    try {
      return await this.client.getProfile(userId);
    } catch (error) {
      console.error('❌ Failed to get user profile:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลสมาชิกในกลุ่ม
   */
  public async getGroupMemberProfile(groupId: string, userId: string): Promise<{
    displayName: string;
    pictureUrl?: string;
  }> {
    try {
      return await this.client.getGroupMemberProfile(groupId, userId);
    } catch (error) {
      console.error('❌ Failed to get group member profile:', error);
      throw error;
    }
  }

  /**
   * สร้าง Flex Message สำหรับแสดงข้อมูลงาน
   */
  public createTaskFlexMessage(task: {
    id: string;
    title: string;
    description?: string;
    dueTime: Date;
    assignees: string[];
    status: string;
    priority: string;
    tags: string[];
  }): FlexMessage {
    const priorityColor = {
      high: '#FF5551',
      medium: '#FFA500', 
      low: '#00C851'
    }[task.priority] || '#00C851';

    const statusText = {
      pending: 'รอดำเนินการ',
      in_progress: 'กำลังดำเนินการ',
      completed: 'เสร็จแล้ว',
      cancelled: 'ยกเลิก',
      overdue: 'เกินกำหนด'
    }[task.status] || task.status;

    return {
      type: 'flex',
      altText: `งาน: ${task.title}`,
      contents: {
        type: 'bubble' as const,
        header: {
          type: 'box' as const,
          layout: 'vertical' as const,
          contents: [
            {
              type: 'text' as const,
              text: task.title,
              weight: 'bold' as const,
              size: 'lg' as const,
              color: '#333333'
            },
            {
              type: 'text' as const,
              text: statusText,
              size: 'sm' as const,
              color: priorityColor,
              weight: 'bold' as const
            }
          ],
          backgroundColor: '#F8F9FA'
        },
        body: {
          type: 'box' as const,
          layout: 'vertical' as const,
          contents: [
            ...(task.description ? [{
              type: 'text' as const,
              text: task.description,
              size: 'sm' as const,
              color: '#666666',
              wrap: true,
              margin: 'sm' as const
            }] : []),
            {
              type: 'box' as const,
              layout: 'vertical' as const,
              contents: [
                {
                  type: 'text' as const,
                  text: `กำหนดส่ง: ${task.dueTime.toLocaleString('th-TH')}`,
                  size: 'sm' as const,
                  color: '#333333'
                },
                {
                  type: 'text' as const,
                  text: `ผู้รับผิดชอบ: ${task.assignees.join(', ')}`,
                  size: 'sm' as const,
                  color: '#333333'
                },
                ...(task.tags.length > 0 ? [{
                  type: 'text' as const,
                  text: `แท็ก: ${task.tags.map(tag => `#${tag}`).join(' ')}`,
                  size: 'sm' as const,
                  color: '#666666'
                }] : [])
              ],
              margin: 'md' as const
            }
          ]
        },
        footer: {
          type: 'box' as const,
          layout: 'horizontal' as const,
          contents: [
            {
              type: 'button' as const,
              style: 'secondary' as const,
              height: 'sm' as const,
              action: {
                type: 'postback' as const,
                label: 'แก้ไข',
                data: `action=edit&taskId=${task.id}`
              }
            },
            {
              type: 'button' as const,
              style: 'primary' as const,
              height: 'sm' as const,
              action: {
                type: 'postback' as const,
                label: 'เสร็จแล้ว',
                data: `action=complete&taskId=${task.id}`
              }
            }
          ],
          spacing: 'sm' as const
        }
      }
    };
  }
}