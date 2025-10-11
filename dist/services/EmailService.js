"use strict";
// Email Service - จัดการการส่งอีเมล
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("@/utils/config");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
class EmailService {
    constructor() {
        this._sentTaskCreatedEmails = new Set();
        if (config_1.features.emailNotifications) {
            try {
                this.transporter = nodemailer_1.default.createTransport({
                    host: config_1.config.email.smtpHost,
                    port: config_1.config.email.smtpPort,
                    secure: config_1.config.email.smtpPort === 465,
                    auth: {
                        user: config_1.config.email.smtpUser,
                        pass: config_1.config.email.smtpPass,
                    },
                });
                // ทดสอบการเชื่อมต่อ
                this.transporter.verify().then(() => {
                    console.log('✅ Email service initialized successfully');
                }).catch((error) => {
                    console.warn('⚠️ Email service connection failed, disabling email notifications:', error.message);
                    this.transporter = null;
                });
            }
            catch (error) {
                console.warn('⚠️ Failed to initialize email service, disabling email notifications:', error);
                this.transporter = null;
            }
        }
        else {
            console.log('ℹ️ Email notifications disabled - SMTP credentials not provided');
        }
    }
    /**
     * ทดสอบการเชื่อมต่อ SMTP
     */
    async verifyConnection() {
        try {
            if (!this.transporter) {
                console.log('⚠️ Email transporter not initialized');
                return false;
            }
            await this.transporter.verify();
            console.log('✅ Email service connection verified');
            return true;
        }
        catch (error) {
            console.error('❌ Email service connection failed:', error);
            return false;
        }
    }
    /**
     * ส่งอีเมลเตือนงาน
     */
    async sendTaskReminder(user, task, reminderType) {
        try {
            // ตรวจสอบว่า Email feature เปิดใช้งานหรือไม่
            if (!config_1.features.emailNotifications) {
                console.log('ℹ️ Email notifications disabled - skipping reminder email');
                return;
            }
            if (!this.transporter) {
                console.log('⚠️ Email transporter not initialized');
                return;
            }
            const template = this.createTaskReminderTemplate(user, task, reminderType);
            await this.transporter.sendMail({
                from: `"เลขาบอท" <${config_1.config.email.smtpUser}>`,
                to: user.email,
                subject: template.subject,
                html: template.html,
                text: template.text,
            });
            console.log(`✅ Sent task reminder email to: ${user.email}`);
        }
        catch (error) {
            console.error('❌ Error sending task reminder email:', error);
            throw error;
        }
    }
    /**
     * ส่งอีเมลแจ้งงานใหม่
     */
    async sendTaskCreatedNotification(user, task) {
        try {
            // ตรวจสอบว่า Email feature เปิดใช้งานหรือไม่
            if (!config_1.features.emailNotifications) {
                console.log('ℹ️ Email notifications disabled - skipping task created email');
                return;
            }
            if (!this.transporter) {
                console.log('⚠️ Email transporter not initialized');
                return;
            }
            const dedupeKey = `${task.id}_${user.id || user.email}`;
            if (this._sentTaskCreatedEmails.has(dedupeKey)) {
                console.log(`⚠️ Duplicate task created email for: ${dedupeKey}`);
                return;
            }
            const template = this.createTaskCreatedTemplate(user, task);
            await this.transporter.sendMail({
                from: `"เลขาบอท" <${config_1.config.email.smtpUser}>`,
                to: user.email,
                subject: template.subject,
                html: template.html,
                text: template.text,
            });
            this._sentTaskCreatedEmails.add(dedupeKey);
            console.log(`✅ Sent task created email to: ${user.email}`);
        }
        catch (error) {
            console.error('❌ Error sending task created email:', error);
            throw error;
        }
    }
    /**
     * ส่งอีเมลแจ้งงานเกินกำหนด
     */
    async sendOverdueNotification(user, task, overdueHours) {
        try {
            // ตรวจสอบว่า Email feature เปิดใช้งานหรือไม่
            if (!config_1.features.emailNotifications) {
                console.log('ℹ️ Email notifications disabled - skipping overdue notification');
                return;
            }
            if (!this.transporter) {
                console.log('⚠️ Email transporter not initialized');
                return;
            }
            const template = this.createOverdueTemplate(user, task, overdueHours);
            await this.transporter.sendMail({
                from: `"เลขาบอท" <${config_1.config.email.smtpUser}>`,
                to: user.email,
                subject: template.subject,
                html: template.html,
                text: template.text,
                priority: 'high',
            });
            console.log(`✅ Sent overdue notification email to: ${user.email}`);
        }
        catch (error) {
            console.error('❌ Error sending overdue notification email:', error);
            throw error;
        }
    }
    /**
     * ส่งอีเมลสรุปรายสัปดาห์
     */
    async sendWeeklyReport(user, groupName, groupId, stats, tasks) {
        try {
            // ตรวจสอบว่า Email feature เปิดใช้งานหรือไม่
            if (!config_1.features.emailNotifications) {
                console.log('ℹ️ Email notifications disabled - skipping weekly report');
                return;
            }
            if (!this.transporter) {
                console.log('⚠️ Email transporter not initialized');
                return;
            }
            const template = this.createWeeklyReportTemplate(user, groupName, groupId, stats, tasks);
            await this.transporter.sendMail({
                from: `"เลขาบอท" <${config_1.config.email.smtpUser}>`,
                to: user.email,
                subject: template.subject,
                html: template.html,
                text: template.text,
            });
            console.log(`✅ Sent weekly report email to: ${user.email}`);
        }
        catch (error) {
            console.error('❌ Error sending weekly report email:', error);
            throw error;
        }
    }
    // Template Methods
    /**
     * สร้างเทมเพลตอีเมลเตือนงาน
     */
    createTaskReminderTemplate(user, task, reminderType) {
        const dueTime = (0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
        const groupId = task.group?.lineGroupId || task.groupId;
        const dashboardUrl = `${config_1.config.baseUrl}/dashboard?groupId=${groupId}`;
        let reminderText = '';
        switch (reminderType) {
            case 'P1D':
            case '1d':
                reminderText = 'พรุ่งนี้';
                break;
            case 'PT3H':
            case '3h':
                reminderText = 'อีก 3 ชั่วโมง';
                break;
            default:
                reminderText = 'เตือนล่วงหน้า';
        }
        const subject = `🔔 เตือนงาน - ${task.title} (${reminderText})`;
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #007bff; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .task-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .label { font-weight: bold; color: #495057; }
        .value { color: #212529; margin-bottom: 10px; }
        .description { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; }
        .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
        .urgent { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">🔔 เตือนงาน</div>
            <div style="color: #6c757d;">เลขาบอท - ระบบจัดการงานกลุ่ม</div>
        </div>
        
        <p>สวัสดี คุณ${user.realName || user.displayName}</p>
        
        <div class="task-info">
            <div class="label">📋 งาน:</div>
            <div class="value" style="font-size: 18px; font-weight: bold;">${task.title}</div>
            
            ${task.description ? `
            <div class="description">
                <div class="label">📝 รายละเอียด:</div>
                <div>${task.description}</div>
            </div>
            ` : ''}
            
            <div class="label">📅 กำหนดส่ง:</div>
            <div class="value">${dueTime}</div>
            
            <div class="label">⏰ การเตือน:</div>
            <div class="value">${reminderText}</div>
            
            ${task.tags && task.tags.length > 0 ? `
            <div class="label">🏷️ แท็ก:</div>
            <div class="value">${task.tags.map((tag) => `#${tag}`).join(' ')}</div>
            ` : ''}
        </div>
        
        <div style="text-align: center;">
            <a href="${dashboardUrl}" class="button">เปิดแดshboard</a>
        </div>
        
        <div class="footer">
            <p>อีเมลนี้ส่งจากระบบเลขาบอทโดยอัตโนมัติ</p>
            <p>หากไม่ต้องการรับอีเมล สามารถปิดการแจ้งเตือนได้ที่แดshboard</p>
        </div>
    </div>
</body>
</html>`;
        const text = `เตือนงาน - ${task.title}

สวัสดี คุณ${user.realName || user.displayName}

งาน: ${task.title}
${task.description ? `รายละเอียด: ${task.description}\n` : ''}กำหนดส่ง: ${dueTime}
การเตือน: ${reminderText}

ดูรายละเอียดที่: ${dashboardUrl}`;
        return { subject, html, text };
    }
    /**
     * สร้างเทมเพลตอีเมลงานใหม่
     */
    createTaskCreatedTemplate(user, task) {
        const dueTime = (0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
        const groupId = task.group?.lineGroupId || task.groupId;
        const dashboardUrl = `${config_1.config.baseUrl}/dashboard?groupId=${groupId}`;
        const creatorName = task.createdByUser?.displayName || 'ไม่ทราบ';
        const groupName = task.group?.displayName || task.group?.name || 'ไม่ทราบกลุ่ม';
        const priorityText = this.getPriorityText(task.priority);
        const statusText = this.getStatusText(task.status);
        const subject = `📋 งานใหม่ - ${task.title} (${groupName})`;
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #28a745; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #28a745; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .task-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .label { font-weight: bold; color: #495057; }
        .value { color: #212529; margin-bottom: 10px; }
        .description { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; }
        .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
        .priority-high { color: #dc3545; font-weight: bold; }
        .priority-medium { color: #ffc107; font-weight: bold; }
        .priority-low { color: #28a745; font-weight: bold; }
        .attachments { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .attachment-item { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">📋 งานใหม่</div>
            <div style="color: #6c757d;">เลขาบอท - ระบบจัดการงานกลุ่ม</div>
        </div>
        
        <p>สวัสดี คุณ${user.realName || user.displayName}</p>
        <p>คุณได้รับมอบหมายงานใหม่ในกลุ่ม <strong>${groupName}</strong></p>
        
        <div class="task-info">
            <div class="label">📋 งาน:</div>
            <div class="value" style="font-size: 18px; font-weight: bold;">${task.title}</div>
            
            <div class="label">👥 กลุ่ม:</div>
            <div class="value">${groupName}</div>
            
            ${task.description ? `
            <div class="description">
                <div class="label">📝 รายละเอียด:</div>
                <div>${task.description}</div>
            </div>
            ` : ''}
            
            <div class="label">📅 กำหนดส่ง:</div>
            <div class="value">${dueTime}</div>
            
            <div class="label">⚡ ระดับความสำคัญ:</div>
            <div class="value priority-${task.priority || 'medium'}">${priorityText}</div>
            
            <div class="label">📊 สถานะ:</div>
            <div class="value">${statusText}</div>
            
            <div class="label">👤 สร้างโดย:</div>
            <div class="value">${creatorName}</div>
            
            ${task.tags && task.tags.length > 0 ? `
            <div class="label">🏷️ แท็ก:</div>
            <div class="value">${task.tags.map((tag) => `#${tag}`).join(' ')}</div>
            ` : ''}
            
            ${task.attachments && task.attachments.length > 0 ? `
            <div class="attachments">
                <div class="label">📎 ไฟล์แนบ:</div>
                ${task.attachments.map((file) => `
                    <div class="attachment-item">
                        📄 ${file.originalName || file.filename} 
                        (${this.formatFileSize(file.size || 0)})
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        
        <div style="text-align: center;">
            <a href="${dashboardUrl}" class="button">เปิดแดshboard</a>
        </div>
        
        <div class="footer">
            <p>อีเมลนี้ส่งจากระบบเลขาบอทโดยอัตโนมัติ</p>
            <p>📅 งานนี้จะถูกเพิ่มใน Google Calendar ของกลุ่มโดยอัตโนมัติ</p>
        </div>
    </div>
</body>
</html>`;
        const text = `งานใหม่ - ${task.title} (${groupName})

สวัสดี คุณ${user.realName || user.displayName}

คุณได้รับมอบหมายงานใหม่ในกลุ่ม ${groupName}

งาน: ${task.title}
กลุ่ม: ${groupName}
${task.description ? `รายละเอียด: ${task.description}\n` : ''}กำหนดส่ง: ${dueTime}
ระดับความสำคัญ: ${priorityText}
สถานะ: ${statusText}
สร้างโดย: ${creatorName}
${task.tags && task.tags.length > 0 ? `แท็ก: ${task.tags.map((tag) => `#${tag}`).join(' ')}\n` : ''}${task.attachments && task.attachments.length > 0 ? `ไฟล์แนบ: ${task.attachments.length} ไฟล์\n` : ''}
ดูรายละเอียดที่: ${dashboardUrl}

📅 งานนี้จะถูกเพิ่มใน Google Calendar ของกลุ่มโดยอัตโนมัติ`;
        return { subject, html, text };
    }
    /**
     * สร้างเทมเพลตอีเมลงานเกินกำหนด
     */
    createOverdueTemplate(user, task, overdueHours) {
        const dueTime = (0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM/YYYY HH:mm');
        const groupId = task.group?.lineGroupId || task.groupId;
        const dashboardUrl = `${config_1.config.baseUrl}/dashboard?groupId=${groupId}`;
        const subject = `⚠️ งานเกินกำหนด - ${task.title}`;
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #dc3545; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #dc3545; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .task-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; }
        .label { font-weight: bold; color: #495057; }
        .value { color: #212529; margin-bottom: 10px; }
        .overdue { color: #dc3545; font-weight: bold; font-size: 16px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; }
        .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">⚠️ งานเกินกำหนด</div>
            <div style="color: #6c757d;">เลขาบอท - ระบบจัดการงานกลุ่ม</div>
        </div>
        
        <p>สวัสดี คุณ${user.realName || user.displayName}</p>
        <p><strong style="color: #dc3545;">งานของคุณเกินกำหนดแล้ว กรุณาดำเนินการให้เสร็จสิ้นโดยเร็วที่สุด</strong></p>
        
        <div class="task-info">
            <div class="label">📋 งาน:</div>
            <div class="value" style="font-size: 18px; font-weight: bold;">${task.title}</div>
            
            <div class="label">📅 กำหนดส่ง:</div>
            <div class="value">${dueTime}</div>
            
            <div class="label">⏰ เกินมาแล้ว:</div>
            <div class="overdue">${overdueHours} ชั่วโมง</div>
        </div>
        
        <div style="text-align: center;">
            <a href="${dashboardUrl}" class="button">เปิดแดshboard</a>
        </div>
        
        <div class="footer">
            <p>อีเมลนี้ส่งจากระบบเลขาบอทโดยอัตโนมัติ</p>
        </div>
    </div>
</body>
</html>`;
        const text = `งานเกินกำหนด - ${task.title}

สวัสดี คุณ${user.realName || user.displayName}

งานของคุณเกินกำหนดแล้ว กรุณาดำเนินการให้เสร็จสิ้นโดยเร็วที่สุด

งาน: ${task.title}
กำหนดส่ง: ${dueTime}
เกินมาแล้ว: ${overdueHours} ชั่วโมง

ดูรายละเอียดที่: ${dashboardUrl}`;
        return { subject, html, text };
    }
    /**
     * สร้างเทมเพลตรายงานรายสัปดาห์
     */
    createWeeklyReportTemplate(user, groupName, groupId, stats, tasks) {
        const weekStart = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).startOf('week').format('DD/MM');
        const weekEnd = (0, moment_timezone_1.default)().tz(config_1.config.app.defaultTimezone).endOf('week').format('DD/MM');
        const dashboardUrl = `${config_1.config.baseUrl}/dashboard?groupId=${groupId}`;
        const subject = `📊 รายงานประจำสัปดาห์ - ${groupName} (${weekStart}-${weekEnd})`;
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #6f42c1; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #6f42c1; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat-item { text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 8px; margin: 5px; }
        .stat-number { font-size: 24px; font-weight: bold; color: #6f42c1; }
        .stat-label { color: #6c757d; font-size: 14px; }
        .task-list { margin: 20px 0; }
        .task-item { padding: 10px; border-left: 3px solid #6f42c1; margin: 10px 0; background-color: #f8f9fa; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; }
        .button { display: inline-block; padding: 12px 24px; background-color: #6f42c1; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">📊 รายงานประจำสัปดาห์</div>
            <div style="color: #6c757d;">${groupName} (${weekStart} - ${weekEnd})</div>
        </div>
        
        <p>สวัสดี คุณ${user.realName || user.displayName}</p>
        
        <div class="stats">
            <div class="stat-item">
                <div class="stat-number">${stats.completedTasks || 0}</div>
                <div class="stat-label">งานเสร็จ</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.pendingTasks || 0}</div>
                <div class="stat-label">งานค้าง</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.overdueTasks || 0}</div>
                <div class="stat-label">งานเกิน</div>
            </div>
        </div>
        
        ${tasks.length > 0 ? `
        <h3>งานที่กำลังดำเนินการ</h3>
        <div class="task-list">
            ${tasks.slice(0, 5).map(task => `
                <div class="task-item">
                    <strong>${task.title}</strong><br>
                    กำหนดส่ง: ${(0, moment_timezone_1.default)(task.dueTime).tz(config_1.config.app.defaultTimezone).format('DD/MM HH:mm')}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div style="text-align: center;">
            <a href="${dashboardUrl}" class="button">ดูรายงานฉบับเต็ม</a>
        </div>
        
        <div class="footer">
            <p>รายงานนี้ส่งทุกวันจันทร์เวลา 09:00 น.</p>
            <p>หากไม่ต้องการรับรายงาน สามารถปิดได้ที่แดshboard</p>
        </div>
    </div>
</body>
</html>`;
        const text = `รายงานประจำสัปดาห์ - ${groupName} (${weekStart} - ${weekEnd})

สวัสดี คุณ${user.realName || user.displayName}

สถิติสัปดาห์นี้:
- งานเสร็จ: ${stats.completedTasks || 0}
- งานค้าง: ${stats.pendingTasks || 0}  
- งานเกินกำหนด: ${stats.overdueTasks || 0}

ดูรายงานฉบับเต็มที่: ${dashboardUrl}`;
        return { subject, html, text };
    }
    // Helper Methods
    /**
     * แปลงระดับความสำคัญเป็นข้อความ
     */
    getPriorityText(priority) {
        const priorityMap = {
            low: 'ต่ำ',
            medium: 'ปานกลาง',
            high: 'สูง'
        };
        return priorityMap[priority] || priority;
    }
    /**
     * แปลงสถานะเป็นข้อความ
     */
    getStatusText(status) {
        const statusMap = {
            pending: 'รอดำเนินการ',
            in_progress: 'กำลังดำเนินการ',
            completed: 'เสร็จแล้ว',
            cancelled: 'ยกเลิก',
            overdue: 'เกินกำหนด'
        };
        return statusMap[status] || status;
    }
    /**
     * จัดรูปแบบขนาดไฟล์
     */
    formatFileSize(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
exports.EmailService = EmailService;
//# sourceMappingURL=EmailService.js.map