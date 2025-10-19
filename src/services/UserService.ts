// User Service - จัดการผู้ใช้และกลุ่ม

import { Repository } from "typeorm";
import { AppDataSource } from "@/utils/database";
import { User, Group, GroupMember } from "@/models";
import { config } from "@/utils/config";

export class UserService {
  private userRepository: Repository<User>;
  private groupRepository: Repository<Group>;
  private groupMemberRepository: Repository<GroupMember>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.groupRepository = AppDataSource.getRepository(Group);
    this.groupMemberRepository = AppDataSource.getRepository(GroupMember);
  }

  /**
   * อัปเดตการตั้งค่าผู้ใช้ (เช่น ปฏิทินส่วนบุคคล)
   */
  public async updateUserSettings(
    userId: string,
    settings: Partial<User["settings"]>,
  ): Promise<User> {
    try {
      const user = await this.userRepository.findOneBy({ id: userId });
      if (!user) {
        throw new Error("User not found");
      }
      user.settings = { ...(user.settings || {}), ...(settings || {}) } as any;
      return await this.userRepository.save(user);
    } catch (error) {
      console.error("❌ Error updating user settings:", error);
      throw error;
    }
  }

  // User Management

  /**
   * ค้นหาผู้ใช้จาก LINE User ID
   */
  public async findByLineUserId(lineUserId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOneBy({ lineUserId });
    } catch (error) {
      console.error("❌ Error finding user by LINE ID:", error);
      throw error;
    }
  }

  /**
   * สร้างผู้ใช้ใหม่
   */
  public async createUser(data: {
    lineUserId: string;
    displayName: string;
    realName?: string;
    email?: string;
    timezone?: string;
  }): Promise<User> {
    try {
      const user = this.userRepository.create({
        lineUserId: data.lineUserId,
        displayName: data.displayName,
        realName: data.realName,
        email: data.email,
        timezone: data.timezone || config.app.defaultTimezone,
        isVerified: !!data.email,
      });

      return await this.userRepository.save(user);
    } catch (error) {
      console.error("❌ Error creating user:", error);
      throw error;
    }
  }

  /**
   * ค้นหาผู้ใช้จาก ID
   */
  public async findById(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOneBy({ id: userId });
    } catch (error) {
      console.error("❌ Error finding user by ID:", error);
      throw error;
    }
  }

  /**
   * อัปเดตข้อมูลผู้ใช้
   */
  public async updateUser(
    userId: string,
    updates: Partial<User>,
  ): Promise<User> {
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
    } catch (error) {
      console.error("❌ Error updating user:", error);
      throw error;
    }
  }

  /**
   * ยืนยันอีเมลผู้ใช้
   */
  public async verifyUserEmail(userId: string, email: string): Promise<User> {
    try {
      return await this.updateUser(userId, { email, isVerified: true });
    } catch (error) {
      console.error("❌ Error verifying user email:", error);
      throw error;
    }
  }

  // Group Management

  /**
   * ค้นหากลุ่มจาก LINE Group ID
   */
  public async findGroupByLineId(lineGroupId: string): Promise<Group | null> {
    try {
      return await this.groupRepository.findOneBy({ lineGroupId });
    } catch (error) {
      console.error("❌ Error finding group by LINE ID:", error);
      throw error;
    }
  }

  /** ค้นหากลุ่มจาก internal Group ID (UUID) */
  public async findGroupById(id: string): Promise<Group | null> {
    try {
      return await this.groupRepository.findOneBy({ id });
    } catch (error) {
      console.error("❌ Error finding group by ID:", error);
      throw error;
    }
  }

  /**
   * ดึงกลุ่มทั้งหมดจากฐานข้อมูล
   */
  public async getAllGroups(): Promise<Group[]> {
    try {
      return await this.groupRepository.find({
        order: { createdAt: "DESC" },
      });
    } catch (error) {
      console.error("❌ Error getting all groups:", error);
      throw error;
    }
  }

  /**
   * อัปเดตชื่อกลุ่ม
   */
  public async updateGroupName(
    groupId: string,
    newName: string,
  ): Promise<Group> {
    try {
      const group = await this.groupRepository.findOneBy({ id: groupId });
      if (!group) {
        throw new Error("Group not found");
      }

      group.name = newName;
      return await this.groupRepository.save(group);
    } catch (error) {
      console.error("❌ Error updating group name:", error);
      throw error;
    }
  }

  /**
   * สร้างกลุ่มใหม่
   */
  public async createGroup(data: {
    lineGroupId: string;
    name: string;
    timezone?: string;
  }): Promise<Group> {
    try {
      const group = this.groupRepository.create({
        lineGroupId: data.lineGroupId,
        name: data.name,
        timezone: data.timezone || config.app.defaultTimezone,
        settings: {
          reminderIntervals: config.app.defaultReminders,
          enableLeaderboard: true,
          defaultReminders: config.app.defaultReminders,
          workingHours: config.app.workingHours,
        },
      });

      return await this.groupRepository.save(group);
    } catch (error) {
      console.error("❌ Error creating group:", error);
      throw error;
    }
  }

  /**
   * อัปเดตการตั้งค่ากลุ่ม
   */
  public async updateGroupSettings(
    groupId: string,
    settings: Partial<Group["settings"]>,
  ): Promise<Group> {
    try {
      const group = await this.groupRepository.findOneBy({ id: groupId });
      if (!group) {
        throw new Error("Group not found");
      }

      group.settings = { ...group.settings, ...settings };
      return await this.groupRepository.save(group);
    } catch (error) {
      console.error("❌ Error updating group settings:", error);
      throw error;
    }
  }

  /**
   * ปิดใช้งานกลุ่ม (เมื่อบอทออกจากกลุ่ม)
   */
  public async deactivateGroup(lineGroupId: string): Promise<void> {
    try {
      // อัปเดตชื่อกลุ่มเป็น inactive
      await this.groupRepository.update(
        { lineGroupId },
        { name: `[INACTIVE] ${new Date().toISOString()}` },
      );
    } catch (error) {
      console.error("❌ Error deactivating group:", error);
      throw error;
    }
  }

  // Group Membership Management

  /**
   * ค้นหาสมาชิกภาพในกลุ่ม
   */
  public async findGroupMembership(
    userId: string,
    groupId: string,
  ): Promise<GroupMember | null> {
    try {
      return await this.groupMemberRepository.findOneBy({ userId, groupId });
    } catch (error) {
      console.error("❌ Error finding group membership:", error);
      throw error;
    }
  }

  /**
   * เพิ่มสมาชิกเข้ากลุ่ม
   */
  public async addGroupMember(
    groupId: string,
    userId: string,
    role: "admin" | "member" = "admin",
  ): Promise<GroupMember> {
    try {
      const membership = this.groupMemberRepository.create({
        groupId,
        userId,
        role,
      });

      return await this.groupMemberRepository.save(membership);
    } catch (error) {
      console.error("❌ Error adding group member:", error);
      throw error;
    }
  }

  /**
   * ลบสมาชิกออกจากกลุ่ม
   */
  public async removeGroupMember(
    groupId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.groupMemberRepository.delete({ groupId, userId });
    } catch (error) {
      console.error("❌ Error removing group member:", error);
      throw error;
    }
  }

  /**
   * อัปเดตบทบาทสมาชิก
   */
  public async updateMemberRole(
    groupId: string,
    userId: string,
    role: "admin" | "member",
  ): Promise<GroupMember> {
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
    } catch (error) {
      console.error("❌ Error updating member role:", error);
      throw error;
    }
  }

  /**
   * ดึงสมาชิกในกลุ่ม
   * @param groupId - LINE Group ID (เช่น "C5d6c442ec0b3287f71787fdd9437e520")
   */
  public async getGroupMembers(
    groupId: string,
  ): Promise<Array<User & { role: string }>> {
    try {
      // รองรับทั้ง LINE Group ID และ internal UUID
      let group = null as Group | null;
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          groupId,
        );
      group = isUuid
        ? await this.groupRepository.findOneBy({ id: groupId as any })
        : await this.groupRepository.findOneBy({ lineGroupId: groupId as any });
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
    } catch (error) {
      console.error("❌ Error getting group members:", error);
      throw error;
    }
  }

  /**
   * ดึงกลุ่มที่ผู้ใช้เป็นสมาชิก
   * @param userId - Database User ID (UUID)
   */
  public async getUserGroups(
    userId: string,
  ): Promise<Array<Group & { role: string }>> {
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
    } catch (error) {
      console.error("❌ Error getting user groups:", error);
      throw error;
    }
  }

  /**
   * ตรวจสอบสิทธิ์ admin ในกลุ่ม
   * @param userId - LINE User ID (เช่น "Uc92411a226e4d4c9866adef05068bdf1")
   * @param groupId - LINE Group ID (เช่น "C5d6c442ec0b3287f71787fdd9437e520")
   */
  public async isGroupAdmin(userId: string, groupId: string): Promise<boolean> {
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
    } catch (error) {
      console.error("❌ Error checking admin status:", error);
      return false;
    }
  }

  /**
   * แปลงผู้ใช้ไลน์เป็น User entity
   */
  public async resolveLineUsers(lineUserIds: string[]): Promise<User[]> {
    try {
      const users = await this.userRepository.find({
        where: {
          lineUserId: {
            $in: lineUserIds,
          } as any,
        },
      });

      return users;
    } catch (error) {
      console.error("❌ Error resolving LINE users:", error);
      throw error;
    }
  }

  /**
   * สถิติกลุ่ม
   * @param groupId - LINE Group ID (เช่น "C5d6c442ec0b3287f71787fdd9437e520")
   */
  public async getGroupStats(groupId: string): Promise<{
    totalMembers: number;
    verifiedMembers: number;
    adminCount: number;
    joinedThisMonth: number;
  }> {
    try {
      // ค้นหา Group entity จาก LINE Group ID หรือ UUID
      let group = null as Group | null;
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          groupId,
        );
      group = isUuid
        ? await this.groupRepository.findOneBy({ id: groupId as any })
        : await this.groupRepository.findOneBy({ lineGroupId: groupId as any });
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

      const verifiedMembers = memberships.filter(
        (m) => m.user.isVerified,
      ).length;
      const adminCount = memberships.filter((m) => m.role === "admin").length;

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const joinedThisMonth = memberships.filter(
        (m) => m.joinedAt >= thisMonth,
      ).length;

      return {
        totalMembers,
        verifiedMembers,
        adminCount,
        joinedThisMonth,
      };
    } catch (error) {
      console.error("❌ Error getting group stats:", error);
      throw error;
    }
  }

  /**
   * ตรวจสอบว่าผู้ใช้เป็น admin ในกลุ่มหรือไม่
   */
  public async isUserAdminInGroup(
    userId: string,
    groupId: string,
  ): Promise<boolean> {
    try {
      return await this.isGroupAdmin(userId, groupId);
    } catch (error) {
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
  public async bulkRemoveMembers(
    groupId: string,
    memberIds: string[],
  ): Promise<{
    successCount: number;
    failedCount: number;
    errors: Array<{ memberId: string; error: string }>;
  }> {
    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [] as Array<{ memberId: string; error: string }>,
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
        } catch (error) {
          results.failedCount++;
          results.errors.push({
            memberId: lineUserId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          console.error(`❌ Failed to remove member ${lineUserId}:`, error);
        }
      }

      console.log(
        `📊 Bulk remove complete: ${results.successCount} success, ${results.failedCount} failed`,
      );
      return results;
    } catch (error) {
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
  public async bulkUpdateMemberRole(
    groupId: string,
    memberIds: string[],
    newRole: "admin" | "member",
  ): Promise<{
    successCount: number;
    failedCount: number;
    errors: Array<{ memberId: string; error: string }>;
  }> {
    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [] as Array<{ memberId: string; error: string }>,
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
        } catch (error) {
          results.failedCount++;
          results.errors.push({
            memberId: lineUserId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          console.error(`❌ Failed to update member ${lineUserId}:`, error);
        }
      }

      console.log(
        `📊 Bulk update role complete: ${results.successCount} success, ${results.failedCount} failed`,
      );
      return results;
    } catch (error) {
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
  public async generateEmailVerificationToken(
    userId: string,
    email: string,
  ): Promise<string> {
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
    } catch (error) {
      console.error("❌ Error generating email verification token:", error);
      throw error;
    }
  }

  /**
   * Verify email with token
   * @param userId - User ID
   * @param token - Verification token
   */
  public async verifyEmail(userId: string, token: string): Promise<void> {
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
    } catch (error) {
      console.error("❌ Error verifying email:", error);
      throw error;
    }
  }
}
