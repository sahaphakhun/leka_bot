// User Service - จัดการผู้ใช้และกลุ่ม

import { Repository } from 'typeorm';
import { AppDataSource } from '@/utils/database';
import { User, Group, GroupMember } from '@/models';
import { config } from '@/utils/config';

export class UserService {
  private userRepository: Repository<User>;
  private groupRepository: Repository<Group>;
  private groupMemberRepository: Repository<GroupMember>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.groupRepository = AppDataSource.getRepository(Group);
    this.groupMemberRepository = AppDataSource.getRepository(GroupMember);
  }

  // User Management

  /**
   * ค้นหาผู้ใช้จาก LINE User ID
   */
  public async findByLineUserId(lineUserId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOneBy({ lineUserId });
    } catch (error) {
      console.error('❌ Error finding user by LINE ID:', error);
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
        isVerified: !!data.email
      });

      return await this.userRepository.save(user);
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  /**
   * อัปเดตข้อมูลผู้ใช้
   */
  public async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const user = await this.userRepository.findOneBy({ id: userId });
      if (!user) {
        throw new Error('User not found');
      }

      Object.assign(user, updates);
      
      // ถ้ามี email ให้ตั้งเป็น verified
      if (updates.email) {
        user.isVerified = true;
      }

      return await this.userRepository.save(user);
    } catch (error) {
      console.error('❌ Error updating user:', error);
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
      console.error('❌ Error verifying user email:', error);
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
      console.error('❌ Error finding group by LINE ID:', error);
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
          workingHours: config.app.workingHours
        }
      });

      return await this.groupRepository.save(group);
    } catch (error) {
      console.error('❌ Error creating group:', error);
      throw error;
    }
  }

  /**
   * อัปเดตการตั้งค่ากลุ่ม
   */
  public async updateGroupSettings(groupId: string, settings: Partial<Group['settings']>): Promise<Group> {
    try {
      const group = await this.groupRepository.findOneBy({ id: groupId });
      if (!group) {
        throw new Error('Group not found');
      }

      group.settings = { ...group.settings, ...settings };
      return await this.groupRepository.save(group);
    } catch (error) {
      console.error('❌ Error updating group settings:', error);
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
        { name: `[INACTIVE] ${new Date().toISOString()}` }
      );
    } catch (error) {
      console.error('❌ Error deactivating group:', error);
      throw error;
    }
  }

  // Group Membership Management

  /**
   * ค้นหาสมาชิกภาพในกลุ่ม
   */
  public async findGroupMembership(userId: string, groupId: string): Promise<GroupMember | null> {
    try {
      return await this.groupMemberRepository.findOneBy({ userId, groupId });
    } catch (error) {
      console.error('❌ Error finding group membership:', error);
      throw error;
    }
  }

  /**
   * เพิ่มสมาชิกเข้ากลุ่ม
   */
  public async addGroupMember(
    groupId: string, 
    userId: string, 
    role: 'admin' | 'member' = 'member'
  ): Promise<GroupMember> {
    try {
      const membership = this.groupMemberRepository.create({
        groupId,
        userId,
        role
      });

      return await this.groupMemberRepository.save(membership);
    } catch (error) {
      console.error('❌ Error adding group member:', error);
      throw error;
    }
  }

  /**
   * ลบสมาชิกออกจากกลุ่ม
   */
  public async removeGroupMember(groupId: string, userId: string): Promise<void> {
    try {
      await this.groupMemberRepository.delete({ groupId, userId });
    } catch (error) {
      console.error('❌ Error removing group member:', error);
      throw error;
    }
  }

  /**
   * อัปเดตบทบาทสมาชิก
   */
  public async updateMemberRole(
    groupId: string, 
    userId: string, 
    role: 'admin' | 'member'
  ): Promise<GroupMember> {
    try {
      const membership = await this.groupMemberRepository.findOneBy({ groupId, userId });
      if (!membership) {
        throw new Error('Membership not found');
      }

      membership.role = role;
      return await this.groupMemberRepository.save(membership);
    } catch (error) {
      console.error('❌ Error updating member role:', error);
      throw error;
    }
  }

  /**
   * ดึงสมาชิกในกลุ่ม
   */
  public async getGroupMembers(groupId: string): Promise<Array<User & { role: string }>> {
    try {
      const members = await this.groupMemberRepository.find({
        where: { groupId },
        relations: ['user'],
        order: { joinedAt: 'ASC' }
      });

      return members.map(member => ({
        ...member.user,
        role: member.role
      }));
    } catch (error) {
      console.error('❌ Error getting group members:', error);
      throw error;
    }
  }

  /**
   * ดึงกลุ่มที่ผู้ใช้เป็นสมาชิก
   */
  public async getUserGroups(userId: string): Promise<Array<Group & { role: string }>> {
    try {
      const memberships = await this.groupMemberRepository.find({
        where: { userId },
        relations: ['group'],
        order: { joinedAt: 'ASC' }
      });

      return memberships.map(membership => ({
        ...membership.group,
        role: membership.role
      }));
    } catch (error) {
      console.error('❌ Error getting user groups:', error);
      throw error;
    }
  }

  /**
   * ตรวจสอบสิทธิ์ admin ในกลุ่ม
   */
  public async isGroupAdmin(userId: string, groupId: string): Promise<boolean> {
    try {
      const membership = await this.groupMemberRepository.findOneBy({
        userId,
        groupId,
        role: 'admin'
      });

      return !!membership;
    } catch (error) {
      console.error('❌ Error checking admin status:', error);
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
            $in: lineUserIds
          } as any
        }
      });

      return users;
    } catch (error) {
      console.error('❌ Error resolving LINE users:', error);
      throw error;
    }
  }

  /**
   * สถิติกลุ่ม
   */
  public async getGroupStats(groupId: string): Promise<{
    totalMembers: number;
    verifiedMembers: number;
    adminCount: number;
    joinedThisMonth: number;
  }> {
    try {
      const totalMembers = await this.groupMemberRepository.count({
        where: { groupId }
      });

      const memberships = await this.groupMemberRepository.find({
        where: { groupId },
        relations: ['user']
      });

      const verifiedMembers = memberships.filter(m => m.user.isVerified).length;
      const adminCount = memberships.filter(m => m.role === 'admin').length;
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const joinedThisMonth = memberships.filter(
        m => m.joinedAt >= thisMonth
      ).length;

      return {
        totalMembers,
        verifiedMembers,
        adminCount,
        joinedThisMonth
      };
    } catch (error) {
      console.error('❌ Error getting group stats:', error);
      throw error;
    }
  }
}