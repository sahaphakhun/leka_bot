export declare class UrlBuilder {
    /**
     * สร้าง URL สำหรับ Dashboard
     */
    static getDashboardUrl(groupId: string, params?: Record<string, string>): string;
    /**
     * สร้าง URL สำหรับงาน
     */
    static getTaskUrl(groupId: string, taskId: string): string;
    /**
     * สร้าง URL สำหรับโปรไฟล์
     */
    static getProfileUrl(lineUserId: string): string;
    /**
     * สร้าง URL สำหรับเพิ่มงานใหม่
     */
    static getNewTaskUrl(groupId: string, userId: string): string;
    /**
     * สร้าง URL สำหรับ API endpoint
     */
    static getApiUrl(endpoint: string): string;
    /**
     * สร้าง URL สำหรับ webhook
     */
    static getWebhookUrl(): string;
    /**
     * สร้าง URL สำหรับ health check
     */
    static getHealthUrl(): string;
    /**
     * สร้าง URL สำหรับไฟล์
     */
    static getFileUrl(fileId: string): string;
    /**
     * สร้าง URL สำหรับ Google OAuth
     */
    static getGoogleOAuthUrl(state?: string): string;
}
//# sourceMappingURL=urlBuilder.d.ts.map