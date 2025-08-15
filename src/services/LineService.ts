// LINE Bot Service - จัดการการเชื่อมต่อและ API ของ LINE

import { Client, WebhookEvent, MessageEvent, TextMessage, FlexMessage } from '@line/bot-sdk';
import { config } from '@/utils/config';
import { BotCommand } from '@/types';
import { createHmac, timingSafeEqual } from 'crypto';
import moment from 'moment-timezone';

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
      if (!signature || !config.line.channelSecret) return false;
      const mac = createHmac('sha256', config.line.channelSecret);
      mac.update(body);
      const expected = mac.digest('base64');
      // ใช้ timingSafeEqual เมื่อความยาวเท่ากัน
      if (expected.length === signature.length) {
        try {
          return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
        } catch {
          return expected === signature;
        }
      }
      return expected === signature;
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
    const mentions: string[] = [];

    console.log('🔍 Parsing command:', { text, eventType: event.message.type });

    // ตรวจสอบการ mention ใน LINE จริงๆ
    if (event.message.type === 'text') {
      const textMessage = event.message as any;
      
      // เช็คจาก mention structure ของ LINE
      if (textMessage.mention && textMessage.mention.mentionees) {
        console.log('📱 Found mentions:', textMessage.mention.mentionees);
        
        // ตรวจสอบว่าบอทถูกแท็กหรือไม่
        const botMentions = textMessage.mention.mentionees.filter((mention: any) => {
          // ตรวจสอบหลายเงื่อนไข
          return mention.isSelf || 
                 (config.line.botUserId && mention.userId === config.line.botUserId) ||
                 mention.type === 'bot';
        });
        
        if (botMentions.length > 0) {
          isMentioned = true;
          console.log('✅ Bot mentioned via LINE mention (isSelf or botUserId match)');
          
          // ลบ mention text ของบอทออกจากข้อความ
          botMentions.forEach((botMention: any) => {
            // หา display name ของบอทใน mention และลบออก
            const mentionStartIndex = botMention.index || 0;
            const mentionLength = botMention.length || 0;
            if (mentionStartIndex >= 0 && mentionLength > 0) {
              const beforeMention = cleanText.substring(0, mentionStartIndex);
              const afterMention = cleanText.substring(mentionStartIndex + mentionLength);
              cleanText = (beforeMention + afterMention).trim();
            }
          });
        }
        
        // เก็บ mentions ของผู้ใช้อื่น (ไม่ใช่บอท)
        textMessage.mention.mentionees.forEach((mention: any) => {
          if (!mention.isSelf && 
              !(config.line.botUserId && mention.userId === config.line.botUserId) &&
              mention.type !== 'bot') {
            mentions.push(mention.userId);
          }
        });
      }
    }

    // ตรวจสอบการ mention แบบพิมพ์ธรรมดา @เลขา
    const botMention = '@เลขา';
    if (text.includes(botMention)) {
      cleanText = text.replace(botMention, '').trim();
      isMentioned = true;
      console.log('✅ Bot mentioned via @เลขา');
    }

    // ตรวจสอบคำสั่งที่เริ่มด้วย / หรือเป็นคำสั่งที่รู้จัก
    if (!isMentioned && (text.startsWith('/') || this.isValidBotCommand(text))) {
      isMentioned = true;
      console.log('✅ Bot command detected:', text.substring(0, 20));
    }

    // ถ้าไม่ใช่การเรียกบอท ให้ return null
    if (!isMentioned) {
      console.log('❌ Not a bot command, ignoring');
      return null;
    }
    
    console.log('🤖 Processing bot command');
    
    // แยก mentions เพิ่มเติมจากข้อความ (กรณีที่พิมพ์ @username ธรรมดา)
    const additionalMentionRegex = /@(\w+|me)/g;
    let additionalMatch;
    const additionalMentions: string[] = [];
    
    // Reset regex lastIndex
    additionalMentionRegex.lastIndex = 0;
    
    while ((additionalMatch = additionalMentionRegex.exec(cleanText)) !== null) {
      const mentionText = additionalMatch[1];
      if (mentionText !== 'เลขา') { // ไม่รวมการ mention บอท
        // ถ้าเป็น @me ให้ใช้ userId ของผู้ส่งข้อความ
        if (mentionText === 'me') {
          additionalMentions.push(event.source.userId!);
        } else {
          // สำหรับ @username ธรรมดา เก็บไว้เป็น displayName (จะแปลงภายหลัง)
          additionalMentions.push(mentionText);
        }
      }
    }
    
    // รวม mentions จาก LINE mention และ text mention
    mentions.push(...additionalMentions);

    // ลบ mentions ออกจากข้อความ (ใช้ regex ใหม่เพื่อไม่ให้มีปัญหา lastIndex)
    cleanText = cleanText.replace(/@(\w+|me)/g, '').trim();
    cleanText = cleanText.replace(/@เลขา/g, '').trim();
    
    // ลบช่องว่างเกินออก
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    // แยกคำสั่งและ arguments
    const parts = cleanText.split(' ').filter(part => part.length > 0);
    if (parts.length === 0) {
      // ถ้าไม่มีคำสั่ง แต่มีการ mention บอท ให้ตอบคำแนะนำ
      console.log('📋 No command found, showing help');
      return {
        command: 'help',
        args: [],
        mentions,
        groupId: event.source.type === 'group' ? event.source.groupId! : '',
        userId: event.source.userId!,
        originalText: text
      };
    }

    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    console.log('✅ Command parsed:', { command, args, mentions });

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

      // เพิ่ม logging เพื่อตรวจสอบ Flex Message
      if (typeof message !== 'string') {
        console.log('🎴 Sending Flex Message:', {
          type: message.type,
          altText: message.altText,
          hasContents: !!message.contents
        });
      } else {
        console.log('📝 Sending Text Message:', message);
      }

      await this.client.replyMessage(replyToken, messageObj);
      console.log('✅ Message sent successfully');
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
   * ดึงรายชื่อสมาชิกทั้งหมดในกลุ่มจาก LINE API
   */
  public async getGroupMemberUserIds(groupId: string): Promise<string[]> {
    try {
      const result = await this.client.getGroupMemberIds(groupId);
      return result;
    } catch (error) {
      console.error('❌ Failed to get group member user IDs:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลสมาชิกทั้งหมดในกลุ่มพร้อมรายละเอียด
   */
  public async getAllGroupMembers(groupId: string): Promise<Array<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
  }>> {
    try {
      // ดึงรายชื่อสมาชิกทั้งหมดในกลุ่ม
      const userIds = await this.getGroupMemberUserIds(groupId);
      
      // ดึงข้อมูลรายละเอียดของแต่ละสมาชิก
      const memberPromises = userIds.map(async (userId) => {
        try {
          const profile = await this.getGroupMemberProfile(groupId, userId);
          return {
            userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl
          };
        } catch (error) {
          console.error(`❌ Failed to get profile for user ${userId}:`, error);
          // ส่งคืนข้อมูลพื้นฐานถ้าไม่สามารถดึงข้อมูลได้
          return {
            userId,
            displayName: `User ${userId}`,
            pictureUrl: undefined
          };
        }
      });

      const members = await Promise.all(memberPromises);
      return members;
    } catch (error) {
      console.error('❌ Failed to get all group members:', error);
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
                  text: `กำหนดส่ง: ${moment(task.dueTime).tz('Asia/Bangkok').format('DD/MM/YYYY HH:mm')}`,
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

  /**
   * ดึงข้อมูลสมาชิกแบบ hybrid (LINE API + ฐานข้อมูล)
   * ลองใช้ LINE API ก่อน หากไม่สำเร็จจะใช้ฐานข้อมูลแทน
   */
  public async getGroupMembersHybrid(groupId: string): Promise<Array<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
    source: 'line_api' | 'database' | 'webhook';
    lastUpdated: Date;
  }>> {
    try {
      // ลองใช้ LINE API ก่อน (วิธี 1.3)
      console.log(`🔄 ลองดึงข้อมูลสมาชิกกลุ่ม ${groupId} จาก LINE API`);
      
      const lineMembers = await this.getAllGroupMembers(groupId);
      
      // เพิ่ม source และ timestamp
      const membersWithSource = lineMembers.map(member => ({
        ...member,
        source: 'line_api' as const,
        lastUpdated: new Date()
      }));
      
      console.log(`✅ ดึงข้อมูลจาก LINE API สำเร็จ: ${membersWithSource.length} คน`);
      
      // Sync ข้อมูลลงฐานข้อมูล
      await this.syncGroupMembersToDatabase(groupId, membersWithSource);
      
      return membersWithSource;
      
    } catch (error: any) {
      console.warn('⚠️ LINE API ไม่ทำงาน เปลี่ยนไปใช้ฐานข้อมูลแทน');
      
      if (error.status === 403) {
        console.warn('⚠️ Bot ไม่มีสิทธิ์เข้าถึงข้อมูลสมาชิกกลุ่ม (ไม่ใช่ Verified/Premium Bot)');
      }
      
      // Fallback ไปใช้ฐานข้อมูล
      const dbMembers = await this.getAllGroupMembersFromDatabase(groupId);
      
      if (dbMembers.length > 0) {
        console.log(`📊 ดึงข้อมูลจากฐานข้อมูล: ${dbMembers.length} คน`);
        
        // แปลง source ให้ถูกต้องตาม type
        const membersWithCorrectSource = dbMembers.map(member => ({
          ...member,
          source: (member.source === 'webhook' ? 'webhook' : 'database') as 'line_api' | 'database' | 'webhook'
        }));
        
        return membersWithCorrectSource;
      } else {
        console.warn('⚠️ ไม่มีข้อมูลในฐานข้อมูล ส่งคืน array ว่าง');
        return [];
      }
    }
  }

  /**
   * Sync ข้อมูลสมาชิกจาก LINE API ลงฐานข้อมูล
   * ใช้ทั้งวิธี 1.3 (Verified/Premium Bot) และเก็บข้อมูลในฐานข้อมูล
   */
  public async syncGroupMembersToDatabase(groupId: string, members?: Array<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
  }>): Promise<{
    success: boolean;
    totalMembers: number;
    syncedMembers: number;
    errors: string[];
  }> {
    try {
      console.log(`🔄 เริ่ม sync ข้อมูลสมาชิกกลุ่ม ${groupId} จาก LINE API`);
      
      let lineMembers = members;
      
      // หากไม่ได้รับ members มา ให้ดึงจาก LINE API
      if (!lineMembers) {
        try {
          lineMembers = await this.getAllGroupMembers(groupId);
        } catch (error: any) {
          if (error.status === 403) {
            console.warn('⚠️ Bot ไม่มีสิทธิ์เข้าถึงข้อมูลสมาชิกกลุ่ม (อาจไม่ใช่ Verified/Premium Bot)');
            console.warn('⚠️ ข้ามการ sync จาก LINE API');
            return {
              success: false,
              totalMembers: 0,
              syncedMembers: 0,
              errors: ['Bot ไม่มีสิทธิ์เข้าถึงข้อมูลสมาชิกกลุ่ม']
            };
          }
          throw error;
        }
      }
      
      console.log(`📊 พบสมาชิก ${lineMembers.length} คนใน LINE API`);
      
      // TODO: เรียกใช้ UserService เพื่อ sync ข้อมูลลงฐานข้อมูล
      // const syncResult = await this.userService.syncGroupMembers(groupId, lineMembers);
      
      // สำหรับตอนนี้ ให้ log ข้อมูลที่ได้
      lineMembers.forEach(member => {
        console.log(`📝 Sync: ${member.userId} - ${member.displayName}`);
      });
      
      console.log(`✅ Sync ข้อมูลสมาชิกเสร็จสิ้น: ${lineMembers.length} คน`);
      
      return {
        success: true,
        totalMembers: lineMembers.length,
        syncedMembers: lineMembers.length,
        errors: []
      };

    } catch (error: any) {
      console.error('❌ Failed to sync group members:', error);
      
      return {
        success: false,
        totalMembers: 0,
        syncedMembers: 0,
        errors: [error.message || 'Unknown error']
      };
    }
  }

  /**
   * ดึงข้อมูลสมาชิกจากฐานข้อมูล (fallback เมื่อ LINE API ไม่ทำงาน)
   */
  public async getGroupMembersFromDatabase(groupId: string): Promise<Array<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
  }>> {
    try {
      console.log(`📊 ดึงข้อมูลสมาชิกกลุ่ม ${groupId} จากฐานข้อมูล`);
      
      // TODO: เรียกใช้ UserService เพื่อดึงข้อมูลจากฐานข้อมูล
      // const members = await this.userService.getGroupMembers(groupId);
      
      // สำหรับตอนนี้ ให้ส่งคืนข้อมูลตัวอย่าง
      console.warn('⚠️ ฟังก์ชันนี้ยังไม่ได้เชื่อมต่อกับฐานข้อมูล');
      console.warn('⚠️ กรุณาเพิ่มการเชื่อมต่อฐานข้อมูลเพื่อดึงข้อมูลสมาชิก');
      
      return [];
    } catch (error) {
      console.error('❌ Failed to get group members from database:', error);
      return [];
    }
  }

  /**
   * ดึงข้อมูลสมาชิกทั้งหมดจากฐานข้อมูล (รวม source และ timestamp)
   */
  public async getAllGroupMembersFromDatabase(groupId: string): Promise<Array<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
    source: string;
    lastUpdated: Date;
  }>> {
    try {
      console.log(`📊 ดึงข้อมูลสมาชิกกลุ่ม ${groupId} ทั้งหมดจากฐานข้อมูล`);
      
      // TODO: เรียกใช้ UserService เพื่อดึงข้อมูลจากฐานข้อมูล
      // const members = await this.userService.getAllGroupMembers(groupId);
      
      // สำหรับตอนนี้ ให้ส่งคืนข้อมูลตัวอย่าง
      console.warn('⚠️ ฟังก์ชันนี้ยังไม่ได้เชื่อมต่อกับฐานข้อมูล');
      console.warn('⚠️ กรุณาเพิ่มการเชื่อมต่อฐานข้อมูลเพื่อดึงข้อมูลสมาชิก');
      
      return [];
    } catch (error) {
      console.error('❌ Failed to get all group members from database:', error);
      return [];
    }
  }

  /**
   * ดึงข้อมูลสมาชิกจากฐานข้อมูล (public method)
   */
  public async getMemberFromDatabase(groupId: string, userId: string): Promise<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
    source: string;
    lastUpdated: Date;
  } | null> {
    try {
      // TODO: เรียกใช้ UserService เพื่อดึงข้อมูลจากฐานข้อมูล
      // const member = await this.userService.getGroupMember(groupId, userId);
      
      // สำหรับตอนนี้ ให้ส่งคืน null (ไม่พบสมาชิก)
      console.log(`🔍 ค้นหาสมาชิกในฐานข้อมูล: ${userId}`);
      console.warn('⚠️ ฟังก์ชันนี้ยังไม่ได้เชื่อมต่อกับฐานข้อมูล');
      
      return null;
      
    } catch (error) {
      console.error('❌ Failed to get member from database:', error);
      return null;
    }
  }

  /**
   * บันทึกข้อมูลสมาชิกลงฐานข้อมูล
   */
  private async saveMemberToDatabase(groupId: string, member: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    source: string;
    lastUpdated: Date;
  }): Promise<void> {
    try {
      // TODO: เรียกใช้ UserService เพื่อบันทึกข้อมูลลงฐานข้อมูล
      // await this.userService.saveGroupMember(groupId, member);
      
      console.log(`💾 บันทึกข้อมูลสมาชิกลงฐานข้อมูล: ${member.userId} - ${member.displayName} (${member.source})`);
      
    } catch (error) {
      console.error('❌ Failed to save member to database:', error);
    }
  }

  /**
   * ลบข้อมูลสมาชิกออกจากฐานข้อมูล
   */
  private async removeMemberFromDatabase(groupId: string, userId: string): Promise<void> {
    try {
      // TODO: เรียกใช้ UserService เพื่อลบข้อมูลออกจากฐานข้อมูล
      // await this.userService.removeGroupMember(groupId, userId);
      
      console.log(`🗑️ ลบข้อมูลสมาชิกออกจากฐานข้อมูล: ${userId}`);
      
    } catch (error) {
      console.error('❌ Failed to remove member from database:', error);
    }
  }

  /**
   * อัปเดตข้อมูลสมาชิกจาก webhook events
   * ใช้เก็บข้อมูลสมาชิกที่เพิ่มเข้ามาใหม่ในกลุ่ม
   */
  public async updateMemberFromWebhook(groupId: string, userId: string, eventType: 'join' | 'leave'): Promise<void> {
    try {
      console.log(`🔄 อัปเดตข้อมูลสมาชิกจาก webhook: ${eventType} - ${userId} ในกลุ่ม ${groupId}`);
      
      if (eventType === 'join') {
        // เมื่อมีสมาชิกใหม่เข้ากลุ่ม
        try {
          // ลองดึงข้อมูล profile จาก LINE API
          const profile = await this.getGroupMemberProfile(groupId, userId);
          
          // บันทึกลงฐานข้อมูล
          await this.saveMemberToDatabase(groupId, {
            userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            source: 'webhook',
            lastUpdated: new Date()
          });
          
          console.log(`✅ บันทึกข้อมูลสมาชิกใหม่: ${profile.displayName}`);
          
        } catch (error: any) {
          if (error.status === 403) {
            console.warn('⚠️ ไม่สามารถดึงข้อมูล profile ได้ ใช้ข้อมูลพื้นฐานแทน');
            // บันทึกข้อมูลพื้นฐาน
            await this.saveMemberToDatabase(groupId, {
              userId,
              displayName: `User ${userId}`,
              pictureUrl: undefined,
              source: 'webhook',
              lastUpdated: new Date()
            });
          } else {
            throw error;
          }
        }
      } else if (eventType === 'leave') {
        // เมื่อสมาชิกออกจากกลุ่ม
        await this.removeMemberFromDatabase(groupId, userId);
        console.log(`✅ ลบข้อมูลสมาชิกที่ออกจากกลุ่ม: ${userId}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to update member from webhook:', error);
    }
  }

  /**
   * ตรวจสอบและบันทึกสมาชิกใหม่ที่ส่งข้อความ
   * ใช้เมื่อมีคนส่งข้อความแต่ยังไม่ได้บันทึกในฐานข้อมูล
   */
  public async checkAndSaveNewMemberFromMessage(groupId: string, userId: string): Promise<{
    isNewMember: boolean;
    memberInfo?: {
      userId: string;
      displayName: string;
      pictureUrl?: string;
      source: string;
      lastUpdated: Date;
    };
  }> {
    try {
      console.log(`🔍 ตรวจสอบสมาชิกใหม่จากข้อความ: ${userId} ในกลุ่ม ${groupId}`);
      
      // ตรวจสอบว่าสมาชิกนี้มีในฐานข้อมูลหรือไม่
      const existingMember = await this.getMemberFromDatabase(groupId, userId);
      
      if (existingMember) {
        console.log(`✅ สมาชิกมีอยู่แล้วในฐานข้อมูล: ${existingMember.displayName}`);
        return {
          isNewMember: false,
          memberInfo: existingMember
        };
      }
      
      // สมาชิกใหม่ - ลองดึงข้อมูลจาก LINE API
      console.log(`🆕 พบสมาชิกใหม่: ${userId} - เริ่มดึงข้อมูลจาก LINE API`);
      
      try {
        const profile = await this.getGroupMemberProfile(groupId, userId);
        
        const newMember = {
          userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          source: 'message_webhook',
          lastUpdated: new Date()
        };
        
        // บันทึกลงฐานข้อมูล
        await this.saveMemberToDatabase(groupId, newMember);
        
        console.log(`✅ บันทึกข้อมูลสมาชิกใหม่จากข้อความ: ${profile.displayName}`);
        
        return {
          isNewMember: true,
          memberInfo: newMember
        };
        
      } catch (error: any) {
        if (error.status === 403) {
          console.warn('⚠️ ไม่สามารถดึงข้อมูล profile ได้ ใช้ข้อมูลพื้นฐานแทน');
          
          // บันทึกข้อมูลพื้นฐาน
          const basicMember = {
            userId,
            displayName: `User ${userId}`,
            pictureUrl: undefined,
            source: 'message_webhook_basic',
            lastUpdated: new Date()
          };
          
          await this.saveMemberToDatabase(groupId, basicMember);
          
          return {
            isNewMember: true,
            memberInfo: basicMember
          };
          
        } else {
          console.error('❌ Failed to get member profile:', error);
          throw error;
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to check and save new member:', error);
      return {
        isNewMember: false
      };
    }
  }
}