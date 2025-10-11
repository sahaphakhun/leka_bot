"use strict";
// Command Service - ประมวลผลคำสั่งจากบอท
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandService = void 0;
const FlexMessageDesignSystem_1 = require("./FlexMessageDesignSystem");
const config_1 = require("@/utils/config");
const serviceContainer_1 = require("@/utils/serviceContainer");
const logger_1 = require("@/utils/logger");
const common_1 = require("@/utils/common");
const urlBuilder_1 = require("@/utils/urlBuilder");
class CommandService {
    constructor() {
        this.taskService = serviceContainer_1.serviceContainer.get('TaskService');
        this.userService = serviceContainer_1.serviceContainer.get('UserService');
        this.fileService = serviceContainer_1.serviceContainer.get('FileService');
        this.kpiService = serviceContainer_1.serviceContainer.get('KPIService');
    }
    /**
     * ประมวลผลคำสั่งหลัก
     */
    async executeCommand(command) {
        try {
            logger_1.logger.info('Executing command:', { command: command.command, args: command.args });
            switch (command.command) {
                case '/setup':
                    return await this.handleSetupCommand(command);
                case '/help':
                    return this.getHelpMessage();
                case '/whoami':
                    return await this.handleWhoAmICommand(command);
                case '/leaderboard':
                case '/kpi':
                case '/คะแนน':
                case '/สถิติ':
                    return await this.handleLeaderboardCommand(command);
                case '/stats':
                case '/สถิติรายสัปดาห์':
                    return await this.handleWeeklyStatsCommand(command);
                case 'เซฟไฟล์':
                case '/เซฟไฟล์':
                    return await this.handleSaveFilesCommand(command);
                case 'เพิ่มงาน':
                case 'add':
                    return await this.handleAddTaskCommand(command);
                case '/delete':
                    return await this.handleDeleteAllTasksCommand(command);
                default:
                    return `ไม่พบคำสั่ง "${command.command}" ค่ะ\nพิมพ์ "@เลขา /help" เพื่อดูคำสั่งทั้งหมด`;
            }
        }
        catch (error) {
            logger_1.logger.error('Error executing command:', error);
            return 'เกิดข้อผิดพลาดในการประมวลผลคำสั่ง กรุณาลองใหม่อีกครั้ง';
        }
    }
    /**
     * คำสั่ง /setup - ตั้งค่าและเข้าใช้ Dashboard
     */
    async handleSetupCommand(command) {
        try {
            // ตรวจสอบว่ามีการแท็กผู้ใช้หรือไม่ (สำหรับตั้งค่าผู้บังคับบัญชา)
            if (command.mentions && command.mentions.length > 0) {
                return await this.handleSetupSupervisors(command);
            }
            // สร้างลิงก์ Dashboard พร้อมระบุตัวตนผู้ใช้เพื่อใช้งานฟีเจอร์ที่ต้องการ userId
            const dashboardUrl = urlBuilder_1.UrlBuilder.getDashboardUrl(command.groupId, {
                userId: command.userId
            });
            return `🔧 Dashboard เลขาบอท

📊 เข้าใช้ Dashboard:
${dashboardUrl}

🎯 ฟีเจอร์หลัก:
• 📋 งาน: สร้างงาน/แก้งาน/เลื่อนกำหนด/ปิดงาน
• 🔁 งานประจำ: รายสัปดาห์/รายเดือน (สร้างอัตโนมัติ)
• 📎 ส่งงาน: แนบไฟล์/หมายเหตุ จากเว็บหรือในแชท
• ✅ ตรวจงาน: อนุมัติ/ตีกลับ + ความเห็น + กำหนดส่งใหม่
• ⏰ เตือน/ติดตาม: เตือนกำหนด/เกินกำหนด/ตรวจล่าช้า
• 📁 คลังไฟล์: แยก "ระหว่างส่งงาน/สำเร็จแล้ว"
• 🏆 Leaderboard & KPI: คะแนนและสถิติกลุ่ม
• ⚙️ ตั้งค่ากลุ่ม/เขตเวลา/ปฏิทิน

📊 การตั้งค่าผู้บังคับบัญชา (สำคัญ):
พิมพ์ "@เลขา /setup @นายเอ @นายบี" เพื่อตั้งค่าผู้บังคับบัญชา
ระบบจะส่งสรุปงานของผู้ใต้บังคับบัญชาให้หัวหน้างานทุกวันจันทร์เวลา 08:00 น.`;
        }
        catch (error) {
            logger_1.logger.error('Error in setup command:', error);
            return 'เกิดข้อผิดพลาดในการสร้างลิงก์ Dashboard กรุณาลองใหม่';
        }
    }
    /**
     * จัดการการตั้งค่าผู้บังคับบัญชา
     */
    async handleSetupSupervisors(command) {
        try {
            const groupId = command.groupId;
            const supervisorIds = command.mentions || [];
            if (supervisorIds.length === 0) {
                return '❌ กรุณาแท็กผู้ใช้ที่ต้องการตั้งเป็นผู้บังคับบัญชา\n\n📊 ระบบจะส่งสรุปงานของผู้ใต้บังคับบัญชาให้หัวหน้างานทุกวันจันทร์เวลา 08:00 น.\n\nตัวอย่าง: /setup @นายเอ @นายบี';
            }
            // ตรวจสอบสิทธิ์ (เฉพาะ admin เท่านั้นที่ตั้งค่าผู้บังคับบัญชาได้)
            const isAdmin = await this.userService.isUserAdminInGroup(command.userId, groupId);
            if (!isAdmin) {
                return '❌ คุณไม่มีสิทธิ์ในการตั้งค่าผู้บังคับบัญชา (ต้องเป็น admin เท่านั้น)';
            }
            // อัปเดตการตั้งค่ากลุ่ม
            const success = await this.taskService.updateGroupSupervisors(groupId, supervisorIds);
            if (success) {
                const supervisorNames = supervisorIds.map(id => `@${id}`).join(' ');
                return `✅ ตั้งค่าผู้บังคับบัญชาเรียบร้อยแล้ว!

👥 ผู้บังคับบัญชา:
${supervisorNames}

📊 ระบบจะส่งสรุปงานของผู้ใต้บังคับบัญชาให้หัวหน้างานทุกวันจันทร์เวลา 08:00 น.

💡 สามารถแก้ไขได้โดยใช้คำสั่ง /setup แท็กผู้ใช้ใหม่`;
            }
            else {
                return '❌ เกิดข้อผิดพลาดในการตั้งค่าผู้บังคับบัญชา กรุณาลองใหม่อีกครั้ง';
            }
        }
        catch (error) {
            logger_1.logger.error('Error in setup supervisors command:', error);
            return 'เกิดข้อผิดพลาดในการตั้งค่าผู้บังคับบัญชา กรุณาลองใหม่';
        }
    }
    /**
     * คำสั่ง /help - แสดงคำสั่งทั้งหมด
     */
    getHelpMessage() {
        return `📖 คำสั่งเลขาบอท (สรุปล่าสุด)

🔧 การตั้งค่า
• /setup – เปิด Dashboard กลุ่ม: งาน/งานประจำ/ไฟล์/Leaderboard/ตั้งค่า
• /setup @นายเอ @นายบี – ตั้งค่าผู้บังคับบัญชา (ส่งสรุปงานทุกวันจันทร์ 08:00)
• /whoami – ดูข้อมูลของฉัน (อีเมล/เขตเวลา/บทบาท)

📊 KPI & อันดับ
• /leaderboard หรือ /kpi หรือ /คะแนน หรือ /สถิติ – ดูอันดับ KPI และคะแนนของกลุ่ม
• /stats หรือ /สถิติรายสัปดาห์ – ดูสถิติรายสัปดาห์ของกลุ่ม

📋 งาน (ในแชท)
• เพิ่มงาน "ชื่องาน" @คน @me due 25/12 14:00 – สร้างงานเร็ว
• เพิ่มงาน – แสดงการ์ดพร้อมปุ่มไปหน้าเว็บเพิ่มงาน
• /delete – ลบงานทั้งหมดในกลุ่ม (รีเซต) - เฉพาะ admin

📁 ไฟล์
• เซฟไฟล์ – บันทึกไฟล์ทั้งหมดใน 1 ชั่วโมงล่าสุด

💡 เคล็ดลับ
• ใช้ #แท็ก ในข้อความสร้างงานได้
• งานประจำ (สัปดาห์/เดือน) ตั้งค่าใน Dashboard แล้วระบบจะสร้างให้อัตโนมัติ
• Dashboard: ใช้คำสั่ง /setup เพื่อรับลิงก์ของกลุ่มคุณ
• 📊 ตั้งค่าผู้บังคับบัญชา: /setup @หัวหน้างาน1 @หัวหน้างาน2 (ส่งสรุปงานทุกวันจันทร์ 08:00)
• การทำงานอื่นๆ (ส่งงาน, ตรวจงาน, จัดการงาน) ใช้ผ่านการกดปุ่มบนการ์ดในแชทหรือผ่านเว็บไซต์`;
    }
    /**
     * เพิ่มงาน - แสดงการ์ดพร้อมปุ่มไปหน้าเว็บเพิ่มงาน
     */
    async handleAddTaskCommand(command) {
        try {
            // แสดงการ์ดพร้อมปุ่มไปหน้าเว็บเพิ่มงาน (ไม่มีการสร้างงานจากแชท)
            const newTaskUrl = urlBuilder_1.UrlBuilder.getNewTaskUrl(command.groupId, command.userId);
            const content = [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('กดปุ่มด้านล่างเพื่อเปิดหน้าเว็บกรอกข้อมูลงาน (ชื่องาน กำหนดส่ง ผู้รับผิดชอบ แท็ก ฯลฯ) โดยระบบเลือกกลุ่มและผู้สร้างงานให้อัตโนมัติ', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📝 ข้อมูลของคุณจะถูกบันทึกเป็นผู้สร้างงานโดยอัตโนมัติ', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary, undefined, true)
            ];
            const buttons = [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('เพิ่มงานใหม่', 'uri', newTaskUrl, 'primary'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('เปิด Dashboard กลุ่ม', 'uri', urlBuilder_1.UrlBuilder.getDashboardUrl(command.groupId, { userId: command.userId }), 'secondary')
            ];
            const flexMessage = FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('เพิ่มงานใหม่', '➕', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary, content, buttons, 'extraLarge');
            return flexMessage;
        }
        catch (error) {
            logger_1.logger.error('Error generating add task card:', error);
            return 'เกิดข้อผิดพลาดในการสร้างการ์ดเพิ่มงาน กรุณาลองใหม่';
        }
    }
    /**
     * คำสั่งเซฟไฟล์ - บันทึกไฟล์ทั้งหมดใน 1 ชั่วโมงล่าสุด
     */
    async handleSaveFilesCommand(command) {
        try {
            const groupId = command.groupId;
            const userId = command.userId;
            // ดึงไฟล์ที่ส่งในกลุ่มในช่วง 1 ชั่วโมงล่าสุด
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            // ใช้ FileService เพื่อดึงไฟล์ใน 1 ชั่วโมงล่าสุด
            const { files } = await this.fileService.getGroupFiles(groupId, {
                limit: 50,
                startDate: oneHourAgo
            });
            if (files.length === 0) {
                return 'ไม่พบไฟล์ใหม่ใน 1 ชั่วโมงล่าสุดค่ะ 📁';
            }
            // สร้าง Flex Message แสดงไฟล์พร้อมปุ่มผูกงาน
            const fileContents = files.slice(0, 5).map(file => FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`📄 ${file.originalName}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText((0, common_1.formatFileSize)(file.size), 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ]));
            const content = [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('ไฟล์ทั้งหมดถูกบันทึกแล้ว สามารถผูกกับงานได้ทันที', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary, undefined, true),
                ...fileContents
            ];
            const buttons = [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ผูกไฟล์กับงาน', 'postback', `action=link_files&fileIds=${files.map(f => f.id).join(',')}`, 'primary'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูไฟล์ทั้งหมด', 'postback', `action=view_saved_files&fileIds=${files.map(f => f.id).join(',')}`, 'secondary')
            ];
            const flexMessage = FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard(`📁 เซฟไฟล์สำเร็จ (${files.length} รายการ)`, '📁', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, content, buttons, 'extraLarge');
            return flexMessage;
        }
        catch (error) {
            logger_1.logger.error('Error in save files command:', error);
            return 'เกิดข้อผิดพลาดในการเซฟไฟล์ กรุณาลองใหม่อีกครั้ง';
        }
    }
    /**
     * คำสั่ง /delete - ลบงานทั้งหมดในกลุ่ม (รีเซต)
     */
    async handleDeleteAllTasksCommand(command) {
        try {
            const groupId = command.groupId;
            const userId = command.userId;
            // ตรวจสอบสิทธิ์ (เฉพาะ admin เท่านั้นที่ลบงานทั้งหมดได้)
            const isAdmin = await this.userService.isUserAdminInGroup(userId, groupId);
            if (!isAdmin) {
                return '❌ คุณไม่มีสิทธิ์ในการลบงานทั้งหมด (ต้องเป็น admin เท่านั้น)';
            }
            // ตรวจสอบว่ามีงานในกลุ่มหรือไม่
            const { tasks } = await this.taskService.getGroupTasks(groupId);
            if (tasks.length === 0) {
                return '📋 ไม่มีงานในกลุ่มนี้ให้ลบค่ะ';
            }
            // ลบงานทั้งหมดในกลุ่ม
            let deletedCount = 0;
            for (const task of tasks) {
                try {
                    await this.taskService.deleteTask(task.id);
                    deletedCount++;
                }
                catch (error) {
                    logger_1.logger.warn(`Failed to delete task ${task.id}:`, error);
                }
            }
            return `🗑️ ลบงานทั้งหมดเรียบร้อยแล้ว!

📊 สรุป:
• ลบงานสำเร็จ: ${deletedCount} รายการ
• งานทั้งหมดในกลุ่มถูกลบแล้ว
• ระบบถูกรีเซตเรียบร้อย

💡 หมายเหตุ: การลบงานจะลบข้อมูลทั้งหมดรวมถึงไฟล์ที่แนบมาด้วย`;
        }
        catch (error) {
            logger_1.logger.error('Error in delete all tasks command:', error);
            return 'เกิดข้อผิดพลาดในการลบงาน กรุณาลองใหม่อีกครั้ง';
        }
    }
    /**
     * คำสั่ง /whoami - ตรวจสอบข้อมูลผู้ใช้
     */
    async handleWhoAmICommand(command) {
        try {
            const user = await this.userService.findByLineUserId(command.userId);
            if (!user) {
                return 'ไม่พบข้อมูลของคุณในระบบ กรุณาติดต่อผู้ดูแลกลุ่ม';
            }
            const groups = await this.userService.getUserGroups(user.id);
            const currentGroup = groups.find(g => g.lineGroupId === command.groupId);
            let response = `👤 ข้อมูลของคุณ\n\n`;
            response += `📱 ชื่อ LINE: ${user.displayName}\n`;
            if (user.realName) {
                response += `👤 ชื่อจริง: ${user.realName}\n`;
            }
            if (user.email) {
                response += `📧 อีเมล: ${user.email} ✅\n`;
            }
            else {
                response += `📧 อีเมล: ยังไม่ได้ลิงก์ ❌\n`;
            }
            response += `🌍 เขตเวลา: ${user.timezone}\n`;
            if (currentGroup) {
                response += `👑 บทบาท: ${currentGroup.role === 'admin' ? 'ผู้ดูแล' : 'สมาชิก'}\n`;
            }
            // เพิ่มลิงก์หน้าโปรไฟล์ (เว็บ) ให้ผู้ใช้กรอก/แก้ไขข้อมูลได้ทันที
            const profileUrl = `${config_1.config.baseUrl}/dashboard/profile?lineUserId=${encodeURIComponent(command.userId)}`;
            response += `\n\n🔗 เปิดหน้าโปรไฟล์ (เว็บ): ${profileUrl}`;
            if (!user.email) {
                response += `\n📧 แนะนำ: ลิงก์อีเมลในหน้าโปรไฟล์เพื่อรับอีเมลแจ้งเตือน`;
            }
            return response;
        }
        catch (error) {
            logger_1.logger.error('Error in whoami command:', error);
            return 'เกิดข้อผิดพลาดในการดึงข้อมูล';
        }
    }
    /**
     * คำสั่ง /leaderboard, /kpi, /คะแนน, /สถิติ - แสดง KPI และ Leaderboard
     */
    async handleLeaderboardCommand(command) {
        try {
            const groupId = command.groupId;
            // ดึงข้อมูล Leaderboard สัปดาห์นี้
            const leaderboard = await this.kpiService.getGroupLeaderboard(groupId, 'weekly');
            if (!leaderboard || leaderboard.length === 0) {
                return `📊 ยังไม่มีข้อมูล KPI ในกลุ่มนี้

💡 เคล็ดลับ: เริ่มสร้างงานและปิดงานเพื่อสร้างคะแนน KPI
📱 ใช้คำสั่ง "เพิ่มงาน" เพื่อสร้างงานใหม่

🎆 หรือลองสร้างข้อมูลตัวอย่าง: POST /api/kpi/sample/${groupId}`;
            }
            // สร้าง Flex Message แสดง Leaderboard
            const content = [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🏆 อันดับ KPI สัปดาห์นี้', 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary, 'bold'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('คะแนนรวมตามสูตร 60/30/10 (ตรงเวลา / งานที่สั่งสำเร็จ / โบนัส)', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ];
            // แสดงอันดับ 1-3
            const topUsers = leaderboard.slice(0, 3);
            topUsers.forEach((user, index) => {
                const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                const points = user.totalScore || 0;
                const onTimeRate = Math.round(user.onTimeRate || 0);
                const createdRate = Math.round(user.createdCompletedRate || 0);
                const penalty = Math.abs(Math.round(user.penaltyPoints || 0));
                content.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('vertical', [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${rank} ${user.displayName}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
                        FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${points.toFixed(1)} คะแนน`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                    ]),
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`ตรงเวลา ${onTimeRate}% • งานที่สั่งสำเร็จ ${createdRate}% • โบนัส ${Math.round(user.consistencyScore || 0)} pts • โทษ ${penalty} pts`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
                ]));
            });
            // หาผู้ใช้ปัจจุบันโดยใช้ LINE User ID
            const currentUser = await this.userService.findByLineUserId(command.userId);
            let userInLeaderboard = null;
            if (currentUser) {
                userInLeaderboard = leaderboard.find((u) => u.userId === currentUser.id) || null;
            }
            if (userInLeaderboard) {
                const rank = userInLeaderboard.rank;
                const points = userInLeaderboard.totalScore || 0;
                const onTimeRate = Math.round(userInLeaderboard.onTimeRate || 0);
                const createdRate = Math.round(userInLeaderboard.createdCompletedRate || 0);
                const penalty = Math.abs(Math.round(userInLeaderboard.penaltyPoints || 0));
                content.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`👤 อันดับของคุณ: อันดับที่ ${rank}`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${points.toFixed(1)} คะแนน • ตรงเวลา ${onTimeRate}% • งานที่สั่งสำเร็จ ${createdRate}% • โทษ ${penalty} pts`, 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary));
            }
            else {
                content.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('👤 คุณยังไม่มีคะแนน KPI', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary));
            }
            const buttons = [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายละเอียดทั้งหมด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${groupId}&view=leaderboard`, 'primary'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูสถิติรายสัปดาห์', 'postback', `action=view_weekly_stats&groupId=${groupId}`, 'secondary')
            ];
            const flexMessage = FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('🏆 อันดับ KPI สัปดาห์นี้', '📊', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success, content, buttons, 'extraLarge');
            return flexMessage;
        }
        catch (error) {
            logger_1.logger.error('Error in leaderboard command:', error);
            return 'เกิดข้อผิดพลาดในการดึงข้อมูล KPI กรุณาลองใหม่อีกครั้ง';
        }
    }
    /**
     * คำสั่ง /stats, /สถิติรายสัปดาห์ - แสดงสถิติรายสัปดาห์ของกลุ่ม
     */
    async handleWeeklyStatsCommand(command) {
        try {
            const groupId = command.groupId;
            // ดึงข้อมูลสถิติรายสัปดาห์
            const stats = await this.kpiService.getWeeklyStats(groupId);
            if (!stats) {
                return `📊 ยังไม่มีข้อมูลสถิติในกลุ่มนี้

💡 เคล็ดลับ: เริ่มสร้างงานและปิดงานเพื่อสร้างสถิติ
📱 ใช้คำสั่ง "เพิ่มงาน" เพื่อสร้างงานใหม่`;
            }
            // สร้าง Flex Message แสดงสถิติ
            const content = [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📊 สถิติรายสัปดาห์', 'lg', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary, 'bold'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('สรุปการทำงานของกลุ่ม', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary)
            ];
            // แสดงสถิติหลัก
            content.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('📋 งานทั้งหมด', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${stats.totalTasks || 0} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary)
            ]), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('✅ งานเสร็จ', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${stats.completedTasks || 0} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.success)
            ]), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('⏳ งานค้าง', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${stats.pendingTasks || 0} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.warning)
            ]), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🚨 งานเกินกำหนด', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${stats.overdueTasks || 0} งาน`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.danger)
            ]));
            // แสดงผู้ทำงานดีที่สุด
            if (stats.topPerformer && stats.topPerformer !== 'ไม่มีข้อมูล') {
                content.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('', 'xs', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textSecondary), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('🏆 ผู้ทำงานดีที่สุด', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.primary), FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(stats.topPerformer, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary));
            }
            // แสดงเวลาเฉลี่ย
            if (stats.avgCompletionTime && stats.avgCompletionTime > 0) {
                content.push(FlexMessageDesignSystem_1.FlexMessageDesignSystem.createBox('horizontal', [
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText('⏱️ เวลาเฉลี่ย', 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary),
                    FlexMessageDesignSystem_1.FlexMessageDesignSystem.createText(`${stats.avgCompletionTime} ชม.`, 'sm', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.textPrimary)
                ]));
            }
            const buttons = [
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูรายละเอียดทั้งหมด', 'uri', `${config_1.config.baseUrl}/dashboard?groupId=${groupId}&view=reports`, 'primary'),
                FlexMessageDesignSystem_1.FlexMessageDesignSystem.createButton('ดูอันดับ KPI', 'postback', `action=view_leaderboard&groupId=${groupId}`, 'secondary')
            ];
            const flexMessage = FlexMessageDesignSystem_1.FlexMessageDesignSystem.createStandardTaskCard('📊 สถิติรายสัปดาห์', '📈', FlexMessageDesignSystem_1.FlexMessageDesignSystem.colors.info, content, buttons, 'extraLarge');
            return flexMessage;
        }
        catch (error) {
            logger_1.logger.error('Error in weekly stats command:', error);
            return 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ กรุณาลองใหม่อีกครั้ง';
        }
    }
}
exports.CommandService = CommandService;
//# sourceMappingURL=CommandService.js.map