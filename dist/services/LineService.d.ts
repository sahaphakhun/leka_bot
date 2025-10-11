import { MessageEvent, FlexMessage } from '@line/bot-sdk';
import { BotCommand } from '@/types';
export declare class LineService {
    private client;
    private userService;
    constructor();
    initialize(): Promise<void>;
    /**
     * ตรวจสอบและ validate webhook signature
     */
    validateSignature(body: string, signature: string): boolean;
    /**
     * แยกวิเคราะห์ข้อความเป็นคำสั่ง
     */
    parseCommand(text: string, event: MessageEvent): BotCommand | null;
    /**
     * ตรวจสอบว่าข้อความเป็นคำสั่งบอทหรือไม่
     */
    private isValidBotCommand;
    /**
     * ตรวจสอบความถูกต้องของ message object
     */
    private validateMessage;
    /**
     * ตรวจสอบรูปแบบ LINE ID
     */
    private isValidLineId;
    /**
     * ทำความสะอาดข้อความเพื่อป้องกันปัญหา LINE API
     */
    private sanitizeMessage;
    /**
     * ส่งข้อความ reply
     */
    replyMessage(replyToken: string, message: string | FlexMessage | Array<string | FlexMessage>): Promise<void>;
    /**
     * ส่งข้อความไปยังกลุ่ม
     */
    pushMessage(groupId: string, message: string | FlexMessage): Promise<void>;
    /**
     * ส่งข้อความแจ้งเตือนพร้อม mention
     */
    sendNotificationWithMention(groupId: string, userIds: string[], message: string): Promise<void>;
    /**
     * ดาวน์โหลดไฟล์จาก LINE
     */
    downloadContent(messageId: string): Promise<Buffer>;
    /**
     * ดึงข้อมูลโปรไฟล์ผู้ใช้
     */
    getUserProfile(userId: string): Promise<{
        displayName: string;
        pictureUrl?: string;
        statusMessage?: string;
        language?: string;
    }>;
    /**
     * ดึงข้อมูลสมาชิกในกลุ่ม
     */
    getGroupMemberProfile(groupId: string, userId: string): Promise<{
        displayName: string;
        pictureUrl?: string;
    }>;
    /**
     * ดึงรายชื่อสมาชิกทั้งหมดในกลุ่มจาก LINE API
     */
    getGroupMemberUserIds(groupId: string): Promise<string[]>;
    /**
     * ดึงรายการกลุ่มทั้งหมดที่บอทเป็นสมาชิก
     */
    getGroupIds(): Promise<string[]>;
    /**
     * ดึงข้อมูลกลุ่มจาก LINE API
     * ลองใช้วิธีต่างๆ เพื่อดึงชื่อกลุ่มที่แท้จริง
     */
    getGroupInformation(groupId: string): Promise<{
        groupId: string;
        name: string;
        source: 'line_api' | 'fallback';
    }>;
    /**
     * ตรวจสอบการอยู่ในกลุ่มของบอทด้วย LINE API: GET /v2/bot/group/{groupId}/summary
     * - คืนค่า inGroup=true ถ้าดึง summary ได้
     * - คืนค่า inGroup=false ถ้าได้ 404 (บอทไม่ได้อยู่ในกลุ่ม)
     * - สำหรับ error อื่นๆ จะไม่สรุปผล เพื่อความปลอดภัย
     */
    isBotInGroupViaSummary(groupId: string): Promise<{
        inGroup: boolean;
        status?: number;
        reason?: string;
    }>;
    /**
     * ดึงข้อมูลสมาชิกทั้งหมดในกลุ่มพร้อมรายละเอียด
     */
    getAllGroupMembers(groupId: string): Promise<Array<{
        userId: string;
        displayName: string;
        pictureUrl?: string;
    }>>;
    /**
     * สร้าง Flex Message สำหรับแสดงข้อมูลงาน
     */
    createTaskFlexMessage(task: {
        id: string;
        title: string;
        description?: string;
        dueTime: Date;
        assignees: string[];
        status: string;
        priority: string;
        tags: string[];
    }): FlexMessage;
    /**
     * ดึงข้อมูลสมาชิกแบบ hybrid (LINE API + ฐานข้อมูล)
     * ลองใช้ LINE API ก่อน หากไม่สำเร็จจะใช้ฐานข้อมูลแทน
     */
    getGroupMembersHybrid(groupId: string): Promise<Array<{
        userId: string;
        displayName: string;
        pictureUrl?: string;
        source: 'line_api' | 'database' | 'webhook';
        lastUpdated: Date;
    }>>;
    /**
     * Sync ข้อมูลสมาชิกจาก LINE API ลงฐานข้อมูล
     * ใช้ทั้งวิธี 1.3 (Verified/Premium Bot) และเก็บข้อมูลในฐานข้อมูล
     */
    syncGroupMembersToDatabase(groupId: string, members?: Array<{
        userId: string;
        displayName: string;
        pictureUrl?: string;
    }>): Promise<{
        success: boolean;
        totalMembers: number;
        syncedMembers: number;
        errors: string[];
    }>;
    /**
     * ดึงข้อมูลสมาชิกจากฐานข้อมูล (fallback เมื่อ LINE API ไม่ทำงาน)
     */
    getGroupMembersFromDatabase(groupId: string): Promise<Array<{
        userId: string;
        displayName: string;
        pictureUrl?: string;
    }>>;
    /**
     * ดึงข้อมูลสมาชิกทั้งหมดจากฐานข้อมูล (รวม source และ timestamp)
     */
    getAllGroupMembersFromDatabase(groupId: string): Promise<Array<{
        userId: string;
        displayName: string;
        pictureUrl?: string;
        source: string;
        lastUpdated: Date;
    }>>;
    /**
     * ดึงข้อมูลสมาชิกจากฐานข้อมูล (public method)
     */
    getMemberFromDatabase(groupId: string, userId: string): Promise<{
        userId: string;
        displayName: string;
        pictureUrl?: string;
        source: string;
        lastUpdated: Date;
    } | null>;
    /**
     * บันทึกข้อมูลสมาชิกลงฐานข้อมูล
     */
    private saveMemberToDatabase;
    /**
     * ลบข้อมูลสมาชิกออกจากฐานข้อมูล
     */
    private removeMemberFromDatabase;
    /**
     * อัปเดตข้อมูลสมาชิกจาก webhook events
     * ใช้เก็บข้อมูลสมาชิกที่เพิ่มเข้ามาใหม่ในกลุ่ม
     */
    updateMemberFromWebhook(groupId: string, userId: string, eventType: 'join' | 'leave'): Promise<void>;
    /**
     * ตรวจสอบและบันทึกข้อมูลสมาชิกใหม่จากข้อความ
     */
    checkAndSaveNewMember(groupId: string, userId: string): Promise<{
        isNewMember: boolean;
        memberInfo?: {
            userId: string;
            displayName: string;
            pictureUrl?: string;
            source: string;
            lastUpdated: Date;
        };
    }>;
}
//# sourceMappingURL=LineService.d.ts.map