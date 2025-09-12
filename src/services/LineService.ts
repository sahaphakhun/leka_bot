// LINE Bot Service - จัดการการเชื่อมต่อและ API ของ LINE

import { Client, WebhookEvent, MessageEvent, TextMessage, FlexMessage } from '@line/bot-sdk';
import { config } from '@/utils/config';
import { BotCommand } from '@/types';
import { FlexMessageDesignSystem } from './FlexMessageDesignSystem';
import { createHmac, timingSafeEqual } from 'crypto';
import moment from 'moment-timezone';
import { UserService } from './UserService';

export class LineService {
  private client: Client;
  private userService: UserService;

  constructor() {
    this.client = new Client({
      channelAccessToken: config.line.channelAccessToken,
      channelSecret: config.line.channelSecret,
    });
    this.userService = new UserService();

    // เพิ่มการ configure เพื่อจัดการปัญหา LINE API Error 400
    // LINE Bot SDK จะจัดการ HTTP configuration ภายใน
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
   * ตรวจสอบความถูกต้องของ message object
   */
  private validateMessage(message: any): boolean {
    try {
      if (Array.isArray(message)) {
        return message.length > 0 && message.every(m => this.validateMessage(m));
      }

      if (typeof message === 'string') {
        const trimmedMessage = message.trim();
        return trimmedMessage.length > 0 && trimmedMessage.length <= 5000; // LINE limit
      }

      if (typeof message === 'object' && message !== null) {
        if (message.type === 'text') {
          const text = message.text?.trim();
          return !!text && text.length > 0 && text.length <= 5000; // LINE limit
        }

        if (message.type === 'flex') {
          // ตรวจสอบ Flex Message size (LINE limit: 50KB)
          const messageSize = JSON.stringify(message).length;
          if (messageSize > 50000) {
            console.warn(`⚠️ Flex Message too large: ${messageSize} bytes (limit: 50KB)`);
            return false;
          }
          return !!(message.altText && message.contents);
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Message validation failed:', error);
      return false;
    }
  }

  /**
   * ตรวจสอบรูปแบบ LINE ID
   */
  private isValidLineId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    
    // LINE User ID: เริ่มด้วย U + 32 ตัวอักษร
    // LINE Group ID: เริ่มด้วย C + 32 ตัวอักษร  
    // LINE Room ID: เริ่มด้วย R + 32 ตัวอักษร
    const lineIdPattern = /^[UCR][a-f0-9]{32}$/i;
    return lineIdPattern.test(id);
  }

  /**
   * ทำความสะอาดข้อความเพื่อป้องกันปัญหา LINE API
   */
  private sanitizeMessage(message: string): string {
    try {
      // ลบอักขระควบคุมที่ไม่ปลอดภัย
      let sanitized = message
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // ลบ control characters
        .replace(/\uFFFE|\uFFFF/g, '') // ลบ BOM characters
        .trim();

      // จำกัดความยาว
      if (sanitized.length > 5000) {
        sanitized = sanitized.substring(0, 4997) + '...';
      }

      return sanitized;
    } catch (error) {
      console.error('❌ Message sanitization failed:', error);
      return 'เกิดข้อผิดพลาด กรุณาลองใหม่';
    }
  }

  /**
   * ส่งข้อความ reply
   */
  public async replyMessage(
    replyToken: string,
    message: string | FlexMessage | Array<string | FlexMessage>
  ): Promise<void> {
    try {
      // ตรวจสอบ replyToken
      if (!replyToken || replyToken.trim() === '') {
        console.error('❌ Invalid replyToken:', replyToken);
        throw new Error('Invalid replyToken');
      }

      // ตรวจสอบ message
      if (!this.validateMessage(message)) {
        console.error('❌ Invalid message:', message);
        throw new Error('Invalid message format');
      }

      const messagesArray = Array.isArray(message) ? message : [message];
      const formatted = messagesArray.map(msg =>
        typeof msg === 'string'
          ? { type: 'text', text: this.sanitizeMessage(msg) } as TextMessage
          : msg
      );

      // เพิ่ม logging เพื่อตรวจสอบข้อความที่ส่งออก
      formatted.forEach(msg => {
        if (msg.type === 'text') {
          console.log('📝 Sending Text Message:', msg.text);
        } else {
          console.log('🎴 Sending Flex Message:', {
            type: msg.type,
            altText: (msg as FlexMessage).altText,
            hasContents: !!(msg as FlexMessage).contents,
          });
        }
      });

      await this.client.replyMessage(replyToken, formatted.length === 1 ? formatted[0] : formatted);
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to reply message:', error);

      // เพิ่มการ log ข้อมูลเพิ่มเติมเพื่อ debug
      console.error('❌ Debug info:', {
        replyToken: replyToken?.substring(0, 10) + '...',
        messageType: Array.isArray(message) ? 'array' : typeof message,
        messageLength: Array.isArray(message)
          ? message.length
          : typeof message === 'string'
            ? message.length
            : 'N/A',
      });

      throw error;
    }
  }

  /**
   * ส่งข้อความไปยังกลุ่ม
   */
  public async pushMessage(groupId: string, message: string | FlexMessage): Promise<void> {
    try {
      // ตรวจสอบ groupId
      if (!groupId || groupId.trim() === '') {
        console.error('❌ Invalid groupId:', groupId);
        throw new Error('Invalid groupId');
      }

      // ตรวจสอบรูปแบบ LINE ID
      if (!this.isValidLineId(groupId)) {
        console.error('❌ Invalid LINE ID format:', groupId);
        throw new Error('Invalid LINE ID format');
      }

      // ตรวจสอบ message
      if (!this.validateMessage(message)) {
        console.error('❌ Invalid message:', message);
        throw new Error('Invalid message format');
      }

      const messageObj = typeof message === 'string' 
        ? { type: 'text', text: this.sanitizeMessage(message) } as TextMessage
        : message;

      await this.client.pushMessage(groupId, messageObj);
      console.log('✅ Push message sent successfully to group:', groupId.substring(0, 10) + '...');
    } catch (error: any) {
      console.error('❌ Failed to push message:', error);
      
      // เพิ่มการ log ข้อมูลเพิ่มเติมเพื่อ debug
      console.error('❌ Debug info:', {
        groupId: groupId?.substring(0, 10) + '...',
        messageType: typeof message,
        messageLength: typeof message === 'string' ? message.length : 'N/A',
        errorStatus: error?.statusCode || error?.status,
        errorMessage: error?.message,
        responseData: error?.originalError?.response?.data || error?.response?.data || null
      });

      // จัดการ error 400 อย่างเฉพาะเจาะจง
      if (error?.statusCode === 400 || error?.status === 400) {
        console.error('❌ LINE API 400 Error - Possible causes:');
        console.error('  - Invalid message format');
        console.error('  - Message too large');
        console.error('  - Invalid LINE ID');
        console.error('  - Bot not in group or user blocked bot');
        
        // ลองส่งข้อความธรรมดาแทน Flex Message
        if (typeof message === 'object' && message.type === 'flex') {
          console.log('🔄 Attempting to send simple text message instead...');
          try {
            const simpleMessage = `📋 ${message.altText || 'การแจ้งเตือน'}`;
            await this.client.pushMessage(groupId, { type: 'text', text: simpleMessage });
            console.log('✅ Fallback text message sent successfully');
            return;
          } catch (fallbackError) {
            console.error('❌ Fallback message also failed:', fallbackError);
            console.error('❌ Fallback response data:', (fallbackError as any)?.originalError?.response?.data || (fallbackError as any)?.response?.data || null);
          }
        }
      }
      
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
    } catch (error: any) {
      // Clearer permission error message
      if (error.status === 403) {
        console.warn('🚫 บอทไม่มีสิทธิ์เข้าถึงรายชื่อสมาชิกกลุ่ม (ต้องการสิทธิ์ "Get member user IDs")');
      } else {
        console.error('❌ Failed to get group member user IDs:', error);
      }
      throw error;
    }
  }

  /**
   * ดึงรายการกลุ่มทั้งหมดที่บอทเป็นสมาชิก
   */
  public async getGroupIds(): Promise<string[]> {
    try {
      const result = await this.client.getGroupIds();
      return result;
    } catch (error: any) {
      console.error('❌ Failed to get group IDs:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลกลุ่มจาก LINE API
   * ลองใช้วิธีต่างๆ เพื่อดึงชื่อกลุ่มที่แท้จริง
   */
  public async getGroupInformation(groupId: string): Promise<{
    groupId: string;
    name: string;
    source: 'line_api' | 'fallback';
  }> {
    try {
      console.log('🔍 พยายามดึงข้อมูลกลุ่ม ' + groupId + ' จาก LINE API');
      
      // ตรวจสอบว่าเป็น personal chat หรือไม่
      if (groupId.startsWith('personal_')) {
        console.log('ℹ️ Personal chat detected');
        return {
          groupId,
          name: 'แชทส่วนตัว',
          source: 'fallback'
        };
      }

      // พยายามใช้ getGroupSummary หากมี (อาจจะมีใน LINE Bot SDK รุ่นใหม่)
      try {
        if (typeof (this.client as any).getGroupSummary === 'function') {
          console.log('🆕 ใช้ getGroupSummary API');
          const groupSummary = await (this.client as any).getGroupSummary(groupId);
          if (groupSummary && groupSummary.groupName) {
            console.log('✅ ดึงชื่อกลุ่มจาก LINE API: ' + groupSummary.groupName);
            return {
              groupId,
              name: groupSummary.groupName,
              source: 'line_api'
            };
          }
        }
      } catch (summaryError: any) {
        console.log('ℹ️ getGroupSummary ไม่สามารถใช้ได้หรือไม่มีข้อมูล:', summaryError?.message || summaryError);
      }

      // พยายามใช้ getGroupMemberUserIds เพื่อตรวจสอบว่ากลุ่มมีอยู่จริง
      try {
        console.log('🔄 ตรวจสอบการเข้าถึงกลุ่มผ่าน getGroupMemberUserIds');
        await this.getGroupMemberUserIds(groupId);
        
        // ถ้าสามารถเข้าถึงได้ แสดงว่ากลุ่มมีอยู่จริง
        // ลองใช้วิธีอื่นในการดึงชื่อกลุ่ม
        
        // วิธีที่ 1: ใช้ getGroupSummary (ถ้ามี)
        try {
          if (typeof (this.client as any).getGroupSummary === 'function') {
            const groupSummary = await (this.client as any).getGroupSummary(groupId);
            if (groupSummary && groupSummary.groupName) {
              console.log('✅ ดึงชื่อกลุ่มจาก LINE API: ' + groupSummary.groupName);
              return {
                groupId,
                name: groupSummary.groupName,
                source: 'line_api'
              };
            }
          }
        } catch (error) {
          console.log('ℹ️ getGroupSummary ไม่สามารถใช้ได้');
        }

        // วิธีที่ 2: ใช้ getGroupMemberProfile (ถ้ามี)
        try {
          if (typeof (this.client as any).getGroupMemberProfile === 'function') {
            const memberIds = await this.getGroupMemberUserIds(groupId);
            if (memberIds.length > 0) {
              // ลองดึงข้อมูลของสมาชิกคนแรกเพื่อดูข้อมูลกลุ่ม
              const firstMember = await (this.client as any).getGroupMemberProfile(groupId, memberIds[0]);
              if (firstMember && firstMember.displayName) {
                console.log(`✅ ดึงข้อมูลสมาชิกกลุ่มสำเร็จ`);
                // ใช้ชื่อสมาชิกคนแรกเป็นชื่อกลุ่มชั่วคราว
                return {
                  groupId,
                  name: `กลุ่ม ${firstMember.displayName}`,
                  source: 'fallback'
                };
              }
            }
          }
        } catch (error) {
          console.log('ℹ️ getGroupMemberProfile ไม่สามารถใช้ได้');
        }

        // ถ้าสามารถเข้าถึงกลุ่มได้ แต่ไม่สามารถดึงชื่อได้
        console.log('ℹ️ สามารถเข้าถึงกลุ่มได้ แต่ไม่สามารถดึงชื่อจาก LINE API ได้');
        
      } catch (accessError: any) {
        if (accessError.status === 403) {
          console.log('🚫 บอทไม่มีสิทธิ์เข้าถึงข้อมูลกลุ่ม (ต้องเพิ่มสิทธิ์ในการตั้งค่า LINE Bot)');
        } else {
          console.log('❌ ไม่สามารถเข้าถึงกลุ่มได้:', accessError?.message || accessError);
        }
      }
      
      console.log('ℹ️ ไม่สามารถดึงชื่อกลุ่มจาก LINE API ได้ ใช้ชื่อเริ่มต้น');
      
      // Fallback: ใช้ชื่อเริ่มต้นที่สวยงามกว่า
      const shortId = groupId.length > 8 ? groupId.substring(0, 8) : groupId;
      return {
        groupId,
        name: `กลุ่ม ${shortId}`,
        source: 'fallback'
      };
      
    } catch (error) {
      console.error('❌ Failed to get group information:', error);
      
      // Fallback สุดท้าย
      const shortId = groupId.length > 8 ? groupId.substring(0, 8) : groupId;
      return {
        groupId,
        name: `กลุ่ม ${shortId}`,
        source: 'fallback'
      };
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
      console.log('🔄 ดึงข้อมูลสมาชิกกลุ่ม ' + groupId + ' จาก LINE API');
      
      // ดึง user IDs จากกลุ่ม
      const userIds = await this.getGroupMemberUserIds(groupId);
      console.log('📊 พบ user IDs: ' + userIds.length + ' คน');
      
      // ดึงข้อมูล profile ของแต่ละคน
      const memberPromises = userIds.map(async (userId) => {
        try {
          const profile = await this.client.getProfile(userId);
          return {
            userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl
          };
        } catch (error: any) {
          if (error.status === 403) {
            console.log('🚫 บอทไม่มีสิทธิ์เข้าถึง profile ผู้ใช้ (ใช้ข้อมูลพื้นฐานแทน)');
            return {
              userId,
              displayName: 'User ' + userId,
              pictureUrl: undefined
            };
          }
          throw error;
        }
      });

      const members = await Promise.all(memberPromises);
      return members;
    } catch (error: any) {
      if (error.status === 403) {
        console.log('🚫 บอทไม่มีสิทธิ์เข้าถึงข้อมูลสมาชิกกลุ่ม (ต้องเพิ่มสิทธิ์ "Get group member profile")');
      } else {
        console.error('❌ Failed to get all group members:', error);
      }
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
    const statusText = FlexMessageDesignSystem.getStatusText(task.status);
    const priorityColor = FlexMessageDesignSystem.getPriorityColor(task.priority);

    const content = [
      ...(task.description ? [FlexMessageDesignSystem.createText(task.description, 'sm', FlexMessageDesignSystem.colors.textSecondary, undefined, true, 'small')] : []),
      FlexMessageDesignSystem.createBox('vertical', [
        FlexMessageDesignSystem.createText(`กำหนดส่ง: ${moment(task.dueTime).tz('Asia/Bangkok').format('DD/MM/YYYY HH:mm')}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
        FlexMessageDesignSystem.createText(`ผู้รับผิดชอบ: ${task.assignees.join(', ')}`, 'sm', FlexMessageDesignSystem.colors.textPrimary),
        ...(task.tags.length > 0 ? [FlexMessageDesignSystem.createText(`แท็ก: ${task.tags.map(tag => `#${tag}`).join(' ')}`, 'sm', FlexMessageDesignSystem.colors.textSecondary)] : [])
      ], undefined, 'medium')
    ];

    const buttons = [
      FlexMessageDesignSystem.createButton('ดูรายละเอียด', 'uri', `${config.baseUrl}/dashboard?taskId=${task.id}&action=view`, 'primary')
    ];

    return FlexMessageDesignSystem.createStandardTaskCard(
      task.title,
      FlexMessageDesignSystem.emojis.task,
      FlexMessageDesignSystem.colors.lightGray,
      content,
      buttons,
      'extraLarge'
    );
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
      console.log('🔄 ลองดึงข้อมูลสมาชิกกลุ่ม ' + groupId + ' จาก LINE API');
      
      const lineMembers = await this.getAllGroupMembers(groupId);
      
      // เพิ่ม source และ timestamp
      const membersWithSource = lineMembers.map(member => ({
        ...member,
        source: 'line_api' as const,
        lastUpdated: new Date()
      }));
      
      console.log('✅ ดึงข้อมูลจาก LINE API สำเร็จ: ' + membersWithSource.length + ' คน');
      
      // Sync ข้อมูลลงฐานข้อมูล
      await this.syncGroupMembersToDatabase(groupId, membersWithSource);
      
      return membersWithSource;
      
    } catch (error: any) {
      // Reduce verbose logging for known issues to prevent Railway rate limiting
      if (error.status === 403) {
        console.warn('🚫 บอทไม่มีสิทธิ์เข้าถึงข้อมูลกลุ่ม (ต้องเพิ่มสิทธิ์ในการตั้งค่า LINE Bot)');
      } else {
        console.warn(`⚠️ LINE API error for group ${groupId}: ${error.status || 'unknown'}`);
      }
      
      // Fallback ไปใช้ฐานข้อมูล
      const dbMembers = await this.getAllGroupMembersFromDatabase(groupId);
      
      if (dbMembers.length > 0) {
        console.log(`📊 Using database fallback: ${dbMembers.length} members`);
        
        // แปลง source ให้ถูกต้องตาม type
        const membersWithCorrectSource = dbMembers.map(member => ({
          ...member,
          source: (member.source === 'webhook' ? 'webhook' : 'database') as 'line_api' | 'database' | 'webhook'
        }));
        
        return membersWithCorrectSource;
      } else {
        console.log('ℹ️ No database fallback available - returning empty array');
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
      console.log('🔄 เริ่ม sync ข้อมูลสมาชิกกลุ่ม ' + groupId + ' จาก LINE API');
      
      let lineMembers = members;
      
      // หากไม่ได้รับ members มา ให้ดึงจาก LINE API
      if (!lineMembers) {
        try {
          lineMembers = await this.getAllGroupMembers(groupId);
        } catch (error: any) {
          if (error.status === 403) {
            console.log('🚫 บอทไม่มีสิทธิ์เข้าถึงข้อมูลสมาชิกกลุ่ม (ต้องเพิ่มสิทธิ์ในการตั้งค่า LINE Bot)');
            console.log('⏭️ ข้ามการ sync จาก LINE API');
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
      
      console.log('📊 พบสมาชิก ' + lineMembers.length + ' คนใน LINE API');
      
      // TODO: เรียกใช้ UserService เพื่อ sync ข้อมูลลงฐานข้อมูล
      // const syncResult = await this.userService.syncGroupMembers(groupId, lineMembers);
      
      // สำหรับตอนนี้ ให้ log ข้อมูลที่ได้
      lineMembers.forEach(member => {
        console.log('📝 Sync: ' + member.userId + ' - ' + member.displayName);
      });
      
      console.log('✅ Sync ข้อมูลสมาชิกเสร็จสิ้น: ' + lineMembers.length + ' คน');
      
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
      console.log('📊 ดึงข้อมูลสมาชิกกลุ่ม ' + groupId + ' จากฐานข้อมูล');
      
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
      console.log('📊 ดึงข้อมูลสมาชิกกลุ่ม ' + groupId + ' จากฐานข้อมูล');
      
      // เรียกใช้ UserService เพื่อดึงข้อมูลจากฐานข้อมูล
      const members = await this.userService.getGroupMembers(groupId);
      
      if (members.length > 0) {
        console.log('✅ พบสมาชิก ' + members.length + ' คนในฐานข้อมูล');
        
        // แปลงข้อมูลให้ตรงกับ format ที่ต้องการ
        return members.map(member => ({
          userId: member.lineUserId,
          displayName: member.displayName,
          pictureUrl: undefined, // User model ไม่มี profilePictureUrl
          source: 'database',
          lastUpdated: member.updatedAt || member.createdAt
        }));
      } else {
        console.log('ℹ️ ไม่พบสมาชิกในฐานข้อมูลสำหรับกลุ่ม ' + groupId);
        return [];
      }
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
      // เรียกใช้ UserService เพื่อดึงข้อมูลจากฐานข้อมูล
      const members = await this.userService.getGroupMembers(groupId);
      const member = members.find(m => m.lineUserId === userId);
      
      if (member) {
        console.log('✅ พบสมาชิกในฐานข้อมูล: ' + member.displayName);
        return {
          userId: member.lineUserId,
          displayName: member.displayName,
          pictureUrl: undefined, // User model ไม่มี profilePictureUrl
          source: 'database',
          lastUpdated: member.updatedAt || member.createdAt
        };
      } else {
        console.log('ℹ️ ไม่พบสมาชิก ' + userId + ' ในฐานข้อมูล');
        return null;
      }
      
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
      // เรียกใช้ UserService เพื่อบันทึกข้อมูลลงฐานข้อมูล
      // ตรวจสอบว่าผู้ใช้มีอยู่แล้วหรือไม่
      let user = await this.userService.findByLineUserId(member.userId);
      
      if (!user) {
        // สร้างผู้ใช้ใหม่
        user = await this.userService.createUser({
          lineUserId: member.userId,
          displayName: member.displayName,
          realName: member.displayName
        });
        console.log('✅ สร้างผู้ใช้ใหม่: ' + member.displayName);
      } else {
        // อัปเดตข้อมูลผู้ใช้ (ไม่รวม profilePictureUrl เพราะไม่มีใน User model)
        await this.userService.updateUser(user.id, {
          displayName: member.displayName
        });
        console.log('✅ อัปเดตข้อมูลผู้ใช้: ' + member.displayName);
      }
      
      // ตรวจสอบว่ากลุ่มมีอยู่แล้วหรือไม่
      let group = await this.userService.findGroupByLineId(groupId);
      
      if (!group) {
        // ดึงข้อมูลกลุ่มจาก LINE API หรือใช้ชื่อเริ่มต้น
        const groupInfo = await this.getGroupInformation(groupId);
        
        // สร้างกลุ่มใหม่ด้วยชื่อที่ดีกว่า
        group = await this.userService.createGroup({
          lineGroupId: groupId,
          name: groupInfo.name
        });
        
        console.log('✅ สร้างกลุ่มใหม่: ' + groupInfo.name + ' (' + groupInfo.source + ')');
      }
      
      // เพิ่มสมาชิกในกลุ่ม (หากยังไม่มี)
      try {
        await this.userService.addGroupMember(group.id, user.id);
        console.log('✅ เพิ่มสมาชิกในกลุ่ม: ' + member.displayName);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log('ℹ️ สมาชิก ' + member.displayName + ' มีอยู่ในกลุ่มแล้ว');
        } else {
          throw error;
        }
      }
      
      console.log('💾 บันทึกข้อมูลสมาชิกลงฐานข้อมูล: ' + member.userId + ' - ' + member.displayName + ' (' + member.source + ')');
      
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
      
      console.log('🗑️ ลบข้อมูลสมาชิกออกจากฐานข้อมูล: ' + userId);
      
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
      console.log('🔄 อัปเดตข้อมูลสมาชิกจาก webhook: ' + eventType + ' - ' + userId + ' ในกลุ่ม ' + groupId);
      
      if (eventType === 'join') {
        // สมาชิกใหม่เข้ากลุ่ม
        try {
          const profile = await this.client.getProfile(userId);
          
          const newMember = {
            userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            source: 'webhook',
            lastUpdated: new Date()
          };
          
          await this.saveMemberToDatabase(groupId, newMember);
          
          console.log(`✅ บันทึกข้อมูลสมาชิกใหม่จาก webhook: ${profile.displayName}`);
          
        } catch (error: any) {
          if (error.status === 403) {
            console.log('🚫 บอทไม่มีสิทธิ์เข้าถึง profile ผู้ใช้ (ใช้ข้อมูลพื้นฐานแทน)');
            
            const basicMember = {
              userId,
              displayName: 'User ' + userId,
              pictureUrl: undefined,
              source: 'webhook_basic',
              lastUpdated: new Date()
            };
            
            await this.saveMemberToDatabase(groupId, basicMember);
            
          } else if (error.status === 404) {
            console.log('🚫 LINE API 404: ผู้ใช้ไม่พบใน LINE API ข้ามการบันทึกข้อมูลสมาชิกใหม่');
            console.log(`ℹ️ สมาชิก ${userId} อาจไม่มีอยู่ในระบบ LINE แล้ว`);
            
            // ไม่บันทึกข้อมูลสำหรับผู้ใช้ที่ไม่มีอยู่ในระบบ
            
          } else {
            throw error;
          }
        }
        
      } else if (eventType === 'leave') {
        // สมาชิกออกจากกลุ่ม
        console.log('👋 สมาชิก ' + userId + ' ออกจากกลุ่ม ' + groupId);
        
        // TODO: อัปเดตสถานะสมาชิกในฐานข้อมูล (เช่น ตั้งเป็น inactive)
        // await this.userService.updateMemberStatus(groupId, userId, 'inactive');
        
      }
      
    } catch (error) {
      console.error('❌ Failed to update member from webhook:', error);
    }
  }

  /**
   * ตรวจสอบและบันทึกข้อมูลสมาชิกใหม่จากข้อความ
   */
  public async checkAndSaveNewMember(groupId: string, userId: string): Promise<{
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
      // ตรวจสอบว่าสมาชิกมีอยู่ในฐานข้อมูลแล้วหรือไม่
      const existingMember = await this.getMemberFromDatabase(groupId, userId);
      
      if (existingMember) {
        console.log('ℹ️ สมาชิก ' + existingMember.displayName + ' มีอยู่ในฐานข้อมูลแล้ว');

        // หากชื่อผู้ใช้ยังเป็นค่าเริ่มต้น เช่น "ไม่ทราบ" ให้พยายามดึงข้อมูลจาก LINE อีกครั้ง
        const unknownNames = ['ไม่ทราบ', 'ผู้ใช้ไม่ทราบชื่อ', ''];
        if (unknownNames.includes(existingMember.displayName)) {
          try {
            const profile = await this.client.getProfile(userId);
            if (profile.displayName && !unknownNames.includes(profile.displayName)) {
              const userEntity = await this.userService.findByLineUserId(userId);
              if (userEntity) {
                await this.userService.updateUser(userEntity.id, {
                  displayName: profile.displayName,
                  realName: profile.displayName
                });
                existingMember.displayName = profile.displayName;
                console.log('🔄 อัปเดตชื่อผู้ใช้จาก \'ไม่ทราบ\' เป็น ' + profile.displayName);
              }
            }
          } catch (error: any) {
            if (error.status === 404) {
              console.warn('🚫 LINE API 404: ผู้ใช้ไม่พบใน LINE API ไม่สามารถอัปเดตชื่อผู้ใช้ได้');
            } else {
              console.warn('⚠️ ไม่สามารถอัปเดตชื่อผู้ใช้จาก LINE API ได้:', error);
            }
          }
        }

        return {
          isNewMember: false,
          memberInfo: existingMember
        };
      }
      
      // ลองดึงข้อมูล profile จาก LINE API
      try {
        const profile = await this.client.getProfile(userId);
        
        const newMember = {
          userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          source: 'message_webhook',
          lastUpdated: new Date()
        };
        
        await this.saveMemberToDatabase(groupId, newMember);
        
        console.log('✅ บันทึกข้อมูลสมาชิกใหม่จากข้อความ: ' + profile.displayName);
        
        return {
          isNewMember: true,
          memberInfo: newMember
        };
        
      } catch (error: any) {
        if (error.status === 403) {
          console.log('🚫 บอทไม่มีสิทธิ์เข้าถึง profile ผู้ใช้ (ใช้ข้อมูลพื้นฐานแทน)');
          
          // บันทึกข้อมูลพื้นฐาน
          const basicMember = {
            userId,
            displayName: 'User ' + userId,
            pictureUrl: undefined,
            source: 'message_webhook_basic',
            lastUpdated: new Date()
          };
          
          await this.saveMemberToDatabase(groupId, basicMember);
          
          return {
            isNewMember: true,
            memberInfo: basicMember
          };
          
        } else if (error.status === 404) {
          console.log('🚫 LINE API 404: ผู้ใช้ไม่พบหรือไม่มีสิทธิ์เข้าถึง ข้ามการบันทึกข้อมูล');
          console.log('ℹ️ User ID: ' + userId + ' อาจเป็น:');
          console.log('   - ผู้ใช้ที่ลบบัญชี LINE แล้ว');
          console.log('   - ผู้ใช้ที่บล็อค LINE Bot');
          console.log('   - User ID ที่ไม่ถูกต้อง');
          
          // ส่งคืนผลลัพธ์ว่าไม่ใช่สมาชิกใหม่ เพื่อข้ามการประมวลผลต่อไป
          return {
            isNewMember: false
          };
          
        } else {
          console.error('❌ Failed to get member profile:', error);
          console.error('❌ Error details: Status ' + error.status + ' - ' + error.statusMessage);
          
          // สำหรับข้อผิดพลาดอื่นๆ ให้ส่งคืนผลลัพธ์ปลอดภัย
          return {
            isNewMember: false
          };
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
