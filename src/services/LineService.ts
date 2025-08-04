// LINE Bot Service - จัดการการเชื่อมต่อและ API ของ LINE

import { Client, WebhookEvent, MessageEvent, TextMessage, FlexMessage } from '@line/bot-sdk';
import { config } from '@/utils/config';
import { BotCommand, LineWebhookEvent } from '@/types';

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
      return this.client.validateSignature(body, config.line.channelSecret, signature);
    } catch (error) {
      console.error('❌ Signature validation failed:', error);
      return false;
    }
  }

  /**
   * แยกวิเคราะห์ข้อความเป็นคำสั่ง
   */
  public parseCommand(text: string, event: MessageEvent): BotCommand | null {
    // ตรวจสอบว่าเป็นการแท็กบอทหรือไม่
    const botMention = '@เลขา';
    if (!text.includes(botMention)) {
      return null;
    }

    // ลบ mention ออกและทำความสะอาด
    let cleanText = text.replace(botMention, '').trim();
    
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
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: task.title,
              weight: 'bold',
              size: 'lg',
              color: '#333333'
            },
            {
              type: 'text',
              text: statusText,
              size: 'sm',
              color: priorityColor,
              weight: 'bold'
            }
          ],
          backgroundColor: '#F8F9FA'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            ...(task.description ? [{
              type: 'text',
              text: task.description,
              size: 'sm',
              color: '#666666',
              wrap: true,
              margin: 'sm'
            }] : []),
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: `กำหนดส่ง: ${task.dueTime.toLocaleString('th-TH')}`,
                  size: 'sm',
                  color: '#333333'
                },
                {
                  type: 'text',
                  text: `ผู้รับผิดชอบ: ${task.assignees.join(', ')}`,
                  size: 'sm',
                  color: '#333333'
                },
                ...(task.tags.length > 0 ? [{
                  type: 'text',
                  text: `แท็ก: ${task.tags.map(tag => `#${tag}`).join(' ')}`,
                  size: 'sm',
                  color: '#666666'
                }] : [])
              ],
              margin: 'md'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'postback',
                label: 'แก้ไข',
                data: `action=edit&taskId=${task.id}`
              }
            },
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'postback',
                label: 'เสร็จแล้ว',
                data: `action=complete&taskId=${task.id}`
              }
            }
          ],
          spacing: 'sm'
        }
      }
    };
  }
}