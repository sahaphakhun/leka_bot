import { User, Group, GroupMember } from "@/models";
export declare class UserService {
    private userRepository;
    private groupRepository;
    private groupMemberRepository;
    constructor();
    /**
     * อัปเดตการตั้งค่าผู้ใช้ (เช่น ปฏิทินส่วนบุคคล)
     */
    updateUserSettings(userId: string, settings: Partial<User["settings"]>): Promise<User>;
    /**
     * ค้นหาผู้ใช้จาก LINE User ID
     */
    findByLineUserId(lineUserId: string): Promise<User | null>;
    /**
     * สร้างผู้ใช้ใหม่
     */
    createUser(data: {
        lineUserId: string;
        displayName: string;
        realName?: string;
        email?: string;
        timezone?: string;
    }): Promise<User>;
    /**
     * ค้นหาผู้ใช้จาก ID
     */
    findById(userId: string): Promise<User | null>;
    /**
     * อัปเดตข้อมูลผู้ใช้
     */
    updateUser(userId: string, updates: Partial<User>): Promise<User>;
    /**
     * ยืนยันอีเมลผู้ใช้
     */
    verifyUserEmail(userId: string, email: string): Promise<User>;
    /**
     * ค้นหากลุ่มจาก LINE Group ID
     */
    findGroupByLineId(lineGroupId: string): Promise<Group | null>;
    /** ค้นหากลุ่มจาก internal Group ID (UUID) */
    findGroupById(id: string): Promise<Group | null>;
    /**
     * ดึงกลุ่มทั้งหมดจากฐานข้อมูล
     */
    getAllGroups(): Promise<Group[]>;
    /**
     * อัปเดตชื่อกลุ่ม
     */
    updateGroupName(groupId: string, newName: string): Promise<Group>;
    /**
     * สร้างกลุ่มใหม่
     */
    createGroup(data: {
        lineGroupId: string;
        name: string;
        timezone?: string;
    }): Promise<Group>;
    /**
     * อัปเดตการตั้งค่ากลุ่ม
     */
    updateGroupSettings(groupId: string, settings: Partial<Group["settings"]>): Promise<Group>;
    /**
     * ปิดใช้งานกลุ่ม (เมื่อบอทออกจากกลุ่ม)
     */
    deactivateGroup(lineGroupId: string): Promise<void>;
    /**
     * ค้นหาสมาชิกภาพในกลุ่ม
     */
    findGroupMembership(userId: string, groupId: string): Promise<GroupMember | null>;
    /**
     * เพิ่มสมาชิกเข้ากลุ่ม
     */
    addGroupMember(groupId: string, userId: string, role?: "admin" | "member"): Promise<GroupMember>;
    /**
     * ลบสมาชิกออกจากกลุ่ม
     */
    removeGroupMember(groupId: string, userId: string): Promise<void>;
    /**
     * อัปเดตบทบาทสมาชิก
     */
    updateMemberRole(groupId: string, userId: string, role: "admin" | "member"): Promise<GroupMember>;
    /**
     * ดึงสมาชิกในกลุ่ม
     * @param groupId - LINE Group ID (เช่น "C5d6c442ec0b3287f71787fdd9437e520")
     */
    getGroupMembers(groupId: string): Promise<Array<User & {
        role: string;
    }>>;
    /**
     * ดึงกลุ่มที่ผู้ใช้เป็นสมาชิก
     * @param userId - Database User ID (UUID)
     */
    getUserGroups(userId: string): Promise<Array<Group & {
        role: string;
    }>>;
    /**
     * ตรวจสอบสิทธิ์ admin ในกลุ่ม
     * @param userId - LINE User ID (เช่น "Uc92411a226e4d4c9866adef05068bdf1")
     * @param groupId - LINE Group ID (เช่น "C5d6c442ec0b3287f71787fdd9437e520")
     */
    isGroupAdmin(userId: string, groupId: string): Promise<boolean>;
    /**
     * แปลงผู้ใช้ไลน์เป็น User entity
     */
    resolveLineUsers(lineUserIds: string[]): Promise<User[]>;
    /**
     * สถิติกลุ่ม
     * @param groupId - LINE Group ID (เช่น "C5d6c442ec0b3287f71787fdd9437e520")
     */
    getGroupStats(groupId: string): Promise<{
        totalMembers: number;
        verifiedMembers: number;
        adminCount: number;
        joinedThisMonth: number;
    }>;
    /**
     * ตรวจสอบว่าผู้ใช้เป็น admin ในกลุ่มหรือไม่
     */
    isUserAdminInGroup(userId: string, groupId: string): Promise<boolean>;
    /**
     * ลบสมาชิกหลายคนพร้อมกัน (Bulk Delete)
     * @param groupId - Group ID (UUID)
     * @param memberIds - Array of LINE User IDs
     * @returns Result with success count and errors
     */
    bulkRemoveMembers(groupId: string, memberIds: string[]): Promise<{
        successCount: number;
        failedCount: number;
        errors: Array<{
            memberId: string;
            error: string;
        }>;
    }>;
    /**
     * อัปเดตบทบาทสมาชิกหลายคนพร้อมกัน (Bulk Update Role)
     * @param groupId - Group ID (UUID)
     * @param memberIds - Array of LINE User IDs
     * @param newRole - New role to assign
     * @returns Result with success count and errors
     */
    bulkUpdateMemberRole(groupId: string, memberIds: string[], newRole: "admin" | "member"): Promise<{
        successCount: number;
        failedCount: number;
        errors: Array<{
            memberId: string;
            error: string;
        }>;
    }>;
    /**
     * Generate email verification token
     * @param userId - User ID
     * @param email - Email address to verify
     * @returns Verification token
     */
    generateEmailVerificationToken(userId: string, email: string): Promise<string>;
    /**
     * Verify email with token
     * @param userId - User ID
     * @param token - Verification token
     */
    verifyEmail(userId: string, token: string): Promise<void>;
}
//# sourceMappingURL=UserService.d.ts.map