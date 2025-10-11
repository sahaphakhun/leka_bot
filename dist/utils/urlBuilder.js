"use strict";
// URL Builder - จัดการ URLs ในระบบ
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlBuilder = void 0;
const config_1 = require("./config");
class UrlBuilder {
    /**
     * สร้าง URL สำหรับ Dashboard
     */
    static getDashboardUrl(groupId, params) {
        const url = new URL(`${config_1.config.baseUrl}/dashboard`);
        url.searchParams.set('groupId', groupId);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.set(key, value);
            });
        }
        return url.toString();
    }
    /**
     * สร้าง URL สำหรับงาน
     */
    static getTaskUrl(groupId, taskId) {
        return this.getDashboardUrl(groupId, { taskId });
    }
    /**
     * สร้าง URL สำหรับโปรไฟล์
     */
    static getProfileUrl(lineUserId) {
        const url = new URL(`${config_1.config.baseUrl}/dashboard/profile`);
        url.searchParams.set('lineUserId', lineUserId);
        return url.toString();
    }
    /**
     * สร้าง URL สำหรับเพิ่มงานใหม่
     */
    static getNewTaskUrl(groupId, userId) {
        return this.getDashboardUrl(groupId, {
            action: 'new-task',
            userId
        });
    }
    /**
     * สร้าง URL สำหรับ API endpoint
     */
    static getApiUrl(endpoint) {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return `${config_1.config.baseUrl}/api${cleanEndpoint}`;
    }
    /**
     * สร้าง URL สำหรับ webhook
     */
    static getWebhookUrl() {
        return `${config_1.config.baseUrl}/webhook`;
    }
    /**
     * สร้าง URL สำหรับ health check
     */
    static getHealthUrl() {
        return `${config_1.config.baseUrl}/health`;
    }
    /**
     * สร้าง URL สำหรับไฟล์
     */
    static getFileUrl(fileId) {
        return `${config_1.config.baseUrl}/uploads/${fileId}`;
    }
    /**
     * สร้าง URL สำหรับ Google OAuth
     */
    static getGoogleOAuthUrl(state) {
        const url = new URL('https://accounts.google.com/oauth/authorize');
        url.searchParams.set('client_id', config_1.config.google.clientId);
        url.searchParams.set('redirect_uri', config_1.config.google.redirectUri);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
        if (state) {
            url.searchParams.set('state', state);
        }
        return url.toString();
    }
}
exports.UrlBuilder = UrlBuilder;
//# sourceMappingURL=urlBuilder.js.map