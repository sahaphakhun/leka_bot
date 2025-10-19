"use strict";
// User Service - จัดการผู้ใช้และกลุ่ม
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const database_1 = require("@/utils/database");
const models_1 = require("@/models");
const config_1 = require("@/utils/config");
class UserService {
    constructor() {
        this.userRepository = database_1.AppDataSource.getRepository(models_1.User);
        this.groupRepository = database_1.AppDataSource.getRepository(models_1.Group);
        this.groupMemberRepository = database_1.AppDataSource.getRepository(models_1.GroupMember);
    }
    /**
     * อัปเดตการตั้งค่าผู้ใช้ (เช่น ปฏิทินส่วนบุคคล)
     */
    async updateUserSettings(userId, settings) {
        try {
            const user = await this.userRepository.findOneBy({ id: userId });
            if (!user) {
                throw new Error("User not found");
            }
            user.settings = { ...(user.settings || {}), ...(settings || {}) };
            return await this.userRepository.save(user);
        }
        catch (error) {
            console.error("❌ Error updating user settings:", error);
            throw error;
        }
    }
    // User Management
    /**
     * ค้นหาผู้ใช้จาก LINE User ID
     */
    async findByLineUserId(lineUserId) {
        try {
            return await this.userRepository.findOneBy({ lineUserId });
        }
        catch (error) {
            console.error("❌ Error finding user by LINE ID:", error);
            throw error;
        }
    }
    /**
     * สร้างผู้ใช้ใหม่
     */
    async createUser(data) {
        try {
            const user = this.userRepository.create({
                lineUserId: data.lineUserId,
                displayName: data.displayName,
                realName: data.realName,
                email: data.email,
                timezone: data.timezone || config_1.config.app.defaultTimezone,
                isVerified: !!data.email,
            });
            return await this.userRepository.save(user);
        }
        catch (error) {
            console.error("❌ Error creating user:", error);
            throw error;
        }
    }
    /**
     * ค้นหาผู้ใช้จาก ID
     */
    async findById(userId) {
        try {
            return await this.userRepository.findOneBy({ id: userId });
        }
        catch (error) {
            console.error("❌ Error finding user by ID:", error);
            throw error;
        }
    }
    /**
     * อัปเดตข้อมูลผู้ใช้
     */
    async updateUser(userId, updates) {
        try {
            const user = await this.userRepository.findOneBy({ id: userId });
            if (!user) {
                throw new Error("User not found");
            }
            Object.assign(user, updates);
            // ถ้ามี email ให้ตั้งเป็น verified
            if (updates.email) {
                user.isVerified = true;
            }
            return await this.userRepository.save(user);
        }
        catch (error) {
            console.error("❌ Error updating user:", error);
            throw error;
        }
    }
    /**
     * ยืนยันอีเมลผู้ใช้
     */
    async verifyUserEmail(userId, email) {
        try {
            return await this.updateUser(userId, { email, isVerified: true });
        }
        catch (error) {
            console.error("❌ Error verifying user email:", error);
            throw error;
        }
    }
    // Group Management
    /**
     * ค้นหากลุ่มจาก LINE Group ID
     */
    async findGroupByLineId(lineGroupId) {
        try {
            return await this.groupRepository.findOneBy({ lineGroupId });
        }
        catch (error) {
            console.error("❌ Error finding group by LINE ID:", error);
            throw error;
        }
    }
    /** ค้นหากลุ่มจาก internal Group ID (UUID) */
    async findGroupById(id) {
        try {
            return await this.groupRepository.findOneBy({ id });
        }
        catch (error) {
            console.error("❌ Error finding group by ID:", error);
            throw error;
        }
    }
    /**
     * ดึงกลุ่มทั้งหมดจากฐานข้อมูล
     */
    async getAllGroups() {
        try {
            return await this.groupRepository.find({
                order: { createdAt: "DESC" },
            });
        }
        catch (error) {
            console.error("❌ Error getting all groups:", error);
            throw error;
        }
    }
    /**
     * อัปเดตชื่อกลุ่ม
     */
    async updateGroupName(groupId, newName) {
        try {
            const group = await this.groupRepository.findOneBy({ id: groupId });
            if (!group) {
                throw new Error("Group not found");
            }
            group.name = newName;
            return await this.groupRepository.save(group);
        }
        catch (error) {
            console.error("❌ Error updating group name:", error);
            throw error;
        }
    }
    /**
     * สร้างกลุ่มใหม่
     */
    async createGroup(data) {
        try {
            const group = this.groupRepository.create({
                lineGroupId: data.lineGroupId,
                name: data.name,
                timezone: data.timezone || config_1.config.app.defaultTimezone,
                settings: {
                    reminderIntervals: config_1.config.app.defaultReminders,
                    enableLeaderboard: true,
                    defaultReminders: config_1.config.app.defaultReminders,
                    workingHours: config_1.config.app.workingHours,
                },
            });
            return await this.groupRepository.save(group);
        }
        catch (error) {
            console.error("❌ Error creating group:", error);
            throw error;
        }
    }
    /**
     * อัปเดตการตั้งค่ากลุ่ม
     */
    async updateGroupSettings(groupId, settings) {
        try {
            const group = await this.groupRepository.findOneBy({ id: groupId });
            if (!group) {
                throw new Error("Group not found");
            }
            group.settings = { ...group.settings, ...settings };
            return await this.groupRepository.save(group);
        }
        catch (error) {
            console.error("❌ Error updating group settings:", error);
            throw error;
        }
    }
    /**
     * ปิดใช้งานกลุ่ม (เมื่อบอทออกจากกลุ่ม)
     */
    async deactivateGroup(lineGroupId) {
        try {
            // อัปเดตชื่อกลุ่มเป็น inactive
            await this.groupRepository.update({ lineGroupId }, { name: `[INACTIVE] ${new Date().toISOString()}` });
        }
        catch (error) {
            console.error("❌ Error deactivating group:", error);
            throw error;
        }
    }
    // Group Membership Management
    /**
     * ค้นหาสมาชิกภาพในกลุ่ม
     */
    async findGroupMembership(userId, groupId) {
        try {
            return await this.groupMemberRepository.findOneBy({ userId, groupId });
        }
        catch (error) {
            console.error("❌ Error finding group membership:", error);
            throw error;
        }
    }
    /**
     * เพิ่มสมาชิกเข้ากลุ่ม
     */
    async addGroupMember(groupId, userId, role = "admin") {
        try {
            const membership = this.groupMemberRepository.create({
                groupId,
                userId,
                role,
            });
            return await this.groupMemberRepository.save(membership);
        }
        catch (error) {
            console.error("❌ Error adding group member:", error);
            throw error;
        }
    }
    /**
     * ลบสมาชิกออกจากกลุ่ม
     */
    async removeGroupMember(groupId, userId) {
        try {
            await this.groupMemberRepository.delete({ groupId, userId });
        }
        catch (error) {
            console.error("❌ Error removing group member:", error);
            throw error;
        }
    }
    /**
     * อัปเดตบทบาทสมาชิก
     */
    async updateMemberRole(groupId, userId, role) {
        try {
            const membership = await this.groupMemberRepository.findOneBy({
                groupId,
                userId,
            });
            if (!membership) {
                throw new Error("Membership not found");
            }
            membership.role = role;
            return await this.groupMemberRepository.save(membership);
        }
        catch (error) {
            console.error("❌ Error updating member role:", error);
            throw error;
        }
    }
    /**
     * ดึงสมาชิกในกลุ่ม
     * @param groupId - LINE Group ID (เช่น "C5d6c442ec0b3287f71787fdd9437e520")
     */
    async getGroupMembers(groupId) {
        try {
            // รองรับทั้ง LINE Group ID และ internal UUID
            let group = null;
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
            group = isUuid
                ? await this.groupRepository.findOneBy({ id: groupId })
                : await this.groupRepository.findOneBy({ lineGroupId: groupId });
            if (!group) {
                throw new Error(`Group not found for LINE ID: ${groupId}`);
            }
            const members = await this.groupMemberRepository.find({
                where: { groupId: group.id },
                relations: ["user"],
                order: { joinedAt: "ASC" },
            });
            return members.map((member) => ({
                ...member.user,
                role: member.role,
            }));
        }
        catch (error) {
            console.error("❌ Error getting group members:", error);
            throw error;
        }
    }
    /**
     * ดึงกลุ่มที่ผู้ใช้เป็นสมาชิก
     * @param userId - Database User ID (UUID)
     */
    async getUserGroups(userId) {
        try {
            const memberships = await this.groupMemberRepository.find({
                where: { userId },
                relations: ["group"],
                order: { joinedAt: "ASC" },
            });
            return memberships.map((membership) => ({
                ...membership.group,
                role: membership.role,
            }));
        }
        catch (error) {
            console.error("❌ Error getting user groups:", error);
            throw error;
        }
    }
    /**
     * ตรวจสอบสิทธิ์ admin ในกลุ่ม
     * @param userId - LINE User ID (เช่น "Uc92411a226e4d4c9866adef05068bdf1")
     * @param groupId - LINE Group ID (เช่น "C5d6c442ec0b3287f71787fdd9437e520")
     */
    async isGroupAdmin(userId, groupId) {
        try {
            // ค้นหา User entity จาก LINE User ID
            const user = await this.userRepository.findOneBy({ lineUserId: userId });
            if (!user) {
                console.log(`⚠️ User not found for LINE ID: ${userId}`);
                return false;
            }
            // ค้นหา Group entity จาก LINE Group ID
            const group = await this.groupRepository.findOneBy({
                lineGroupId: groupId,
            });
            if (!group) {
                console.log(`⚠️ Group not found for LINE ID: ${groupId}`);
                return false;
            }
            // ตรวจสอบสมาชิกภาพแบบ admin ด้วย internal UUIDs
            const membership = await this.groupMemberRepository.findOneBy({
                userId: user.id,
                groupId: group.id,
                role: "admin",
            });
            return !!membership;
        }
        catch (error) {
            console.error("❌ Error checking admin status:", error);
            return false;
        }
    }
    /**
     * แปลงผู้ใช้ไลน์เป็น User entity
     */
    async resolveLineUsers(lineUserIds) {
        try {
            const users = await this.userRepository.find({
                where: {
                    lineUserId: {
                        $in: lineUserIds,
                    },
                },
            });
            return users;
        }
        catch (error) {
            console.error("❌ Error resolving LINE users:", error);
            throw error;
        }
    }
    /**
     * สถิติกลุ่ม
     * @param groupId - LINE Group ID (เช่น "C5d6c442ec0b3287f71787fdd9437e520")
     */
    async getGroupStats(groupId) {
        try {
            // ค้นหา Group entity จาก LINE Group ID หรือ UUID
            let group = null;
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId);
            group = isUuid
                ? await this.groupRepository.findOneBy({ id: groupId })
                : await this.groupRepository.findOneBy({ lineGroupId: groupId });
            if (!group) {
                throw new Error(`Group not found for LINE ID: ${groupId}`);
            }
            const totalMembers = await this.groupMemberRepository.count({
                where: { groupId: group.id },
            });
            const memberships = await this.groupMemberRepository.find({
                where: { groupId: group.id },
                relations: ["user"],
            });
            const verifiedMembers = memberships.filter((m) => m.user.isVerified).length;
            const adminCount = memberships.filter((m) => m.role === "admin").length;
            const thisMonth = new Date();
            thisMonth.setDate(1);
            thisMonth.setHours(0, 0, 0, 0);
            const joinedThisMonth = memberships.filter((m) => m.joinedAt >= thisMonth).length;
            return {
                totalMembers,
                verifiedMembers,
                adminCount,
                joinedThisMonth,
            };
        }
        catch (error) {
            console.error("❌ Error getting group stats:", error);
            throw error;
        }
    }
    /**
     * ตรวจสอบว่าผู้ใช้เป็น admin ในกลุ่มหรือไม่
     */
    async isUserAdminInGroup(userId, groupId) {
        try {
            return await this.isGroupAdmin(userId, groupId);
        }
        catch (error) {
            console.error("❌ Error checking if user is admin in group:", error);
            return false;
        }
    }
    // Bulk Operations
    /**
     * ลบสมาชิกหลายคนพร้อมกัน (Bulk Delete)
     * @param groupId - Group ID (UUID)
     * @param memberIds - Array of LINE User IDs
     * @returns Result with success count and errors
     */
    async bulkRemoveMembers(groupId, memberIds) {
        const results = {
            successCount: 0,
            failedCount: 0,
            errors: [],
        };
        try {
            // ค้นหา Group entity จาก UUID
            const group = await this.groupRepository.findOneBy({ id: groupId });
            if (!group) {
                throw new Error("Group not found");
            }
            // ลบทีละคน เพื่อจัดการ error แยกกัน
            for (const lineUserId of memberIds) {
                try {
                    // หา User entity จาก LINE User ID
                    const user = await this.userRepository.findOneBy({ lineUserId });
                    if (!user) {
                        results.failedCount++;
                        results.errors.push({
                            memberId: lineUserId,
                            error: "User not found",
                        });
                        continue;
                    }
                    // ลบสมาชิกภาพ
                    await this.groupMemberRepository.delete({
                        groupId: group.id,
                        userId: user.id,
                    });
                    results.successCount++;
                    console.log(`✅ Removed member ${lineUserId} from group ${groupId}`);
                }
                catch (error) {
                    results.failedCount++;
                    results.errors.push({
                        memberId: lineUserId,
                        error: error instanceof Error ? error.message : "Unknown error",
                    });
                    console.error(`❌ Failed to remove member ${lineUserId}:`, error);
                }
            }
            console.log(`📊 Bulk remove complete: ${results.successCount} success, ${results.failedCount} failed`);
            return results;
        }
        catch (error) {
            console.error("❌ Error in bulk remove members:", error);
            throw error;
        }
    }
    /**
     * อัปเดตบทบาทสมาชิกหลายคนพร้อมกัน (Bulk Update Role)
     * @param groupId - Group ID (UUID)
     * @param memberIds - Array of LINE User IDs
     * @param newRole - New role to assign
     * @returns Result with success count and errors
     */
    async bulkUpdateMemberRole(groupId, memberIds, newRole) {
        const results = {
            successCount: 0,
            failedCount: 0,
            errors: [],
        };
        try {
            // ค้นหา Group entity จาก UUID
            const group = await this.groupRepository.findOneBy({ id: groupId });
            if (!group) {
                throw new Error("Group not found");
            }
            // อัปเดตทีละคน
            for (const lineUserId of memberIds) {
                try {
                    // หา User entity จาก LINE User ID
                    const user = await this.userRepository.findOneBy({ lineUserId });
                    if (!user) {
                        results.failedCount++;
                        results.errors.push({
                            memberId: lineUserId,
                            error: "User not found",
                        });
                        continue;
                    }
                    // อัปเดตบทบาท
                    const membership = await this.groupMemberRepository.findOneBy({
                        groupId: group.id,
                        userId: user.id,
                    });
                    if (!membership) {
                        results.failedCount++;
                        results.errors.push({
                            memberId: lineUserId,
                            error: "Membership not found",
                        });
                        continue;
                    }
                    membership.role = newRole;
                    await this.groupMemberRepository.save(membership);
                    results.successCount++;
                    console.log(`✅ Updated member ${lineUserId} role to ${newRole}`);
                }
                catch (error) {
                    results.failedCount++;
                    results.errors.push({
                        memberId: lineUserId,
                        error: error instanceof Error ? error.message : "Unknown error",
                    });
                    console.error(`❌ Failed to update member ${lineUserId}:`, error);
                }
            }
            console.log(`📊 Bulk update role complete: ${results.successCount} success, ${results.failedCount} failed`);
            return results;
        }
        catch (error) {
            console.error("❌ Error in bulk update member role:", error);
            throw error;
        }
    }
    /**
     * Generate email verification token
     * @param userId - User ID
     * @param email - Email address to verify
     * @returns Verification token
     */
    async generateEmailVerificationToken(userId, email) {
        try {
            const user = await this.userRepository.findOneBy({ id: userId });
            if (!user) {
                throw new Error("User not found");
            }
            // Generate random token
            const crypto = require("crypto");
            const token = crypto.randomBytes(32).toString("hex");
            // Store token in user settings (expires in 24 hours)
            const settings = user.settings || {};
            settings.emailVerification = {
                email,
                token,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
            user.settings = settings;
            await this.userRepository.save(user);
            console.log(`✅ Generated email verification token for user ${userId}`);
            return token;
        }
        catch (error) {
            console.error("❌ Error generating email verification token:", error);
            throw error;
        }
    }
    /**
     * Verify email with token
     * @param userId - User ID
     * @param token - Verification token
     */
    async verifyEmail(userId, token) {
        try {
            const user = await this.userRepository.findOneBy({ id: userId });
            if (!user) {
                throw new Error("User not found");
            }
            const settings = user.settings || {};
            const verification = settings.emailVerification;
            if (!verification) {
                throw new Error("No verification pending");
            }
            if (verification.token !== token) {
                throw new Error("Invalid verification token");
            }
            const expiresAt = new Date(verification.expiresAt);
            if (expiresAt < new Date()) {
                throw new Error("Verification token expired");
            }
            // Update user email and mark as verified
            user.email = verification.email;
            user.isVerified = true;
            // Clear verification data
            delete settings.emailVerification;
            user.settings = settings;
            await this.userRepository.save(user);
            console.log(`✅ Email verified for user ${userId}`);
        }
        catch (error) {
            console.error("❌ Error verifying email:", error);
            throw error;
        }
    }
}
exports.UserService = UserService;
//# sourceMappingURL=UserService.js.map