// URL Builder - จัดการ URLs ในระบบ

import { config } from './config';

export class UrlBuilder {
  /**
   * สร้าง URL สำหรับ Dashboard
   */
  static getDashboardUrl(groupId: string, params?: Record<string, string>): string {
    const url = new URL(`${config.baseUrl}/dashboard`);
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
  static getTaskUrl(groupId: string, taskId: string): string {
    return this.getDashboardUrl(groupId, { taskId });
  }

  /**
   * สร้าง URL สำหรับโปรไฟล์
   */
  static getProfileUrl(lineUserId: string): string {
    const url = new URL(`${config.baseUrl}/dashboard/profile`);
    url.searchParams.set('lineUserId', lineUserId);
    return url.toString();
  }

  /**
   * สร้าง URL สำหรับเพิ่มงานใหม่
   */
  static getNewTaskUrl(groupId: string, userId: string): string {
    return this.getDashboardUrl(groupId, { 
      action: 'new-task',
      userId 
    });
  }

  /**
   * สร้าง URL สำหรับ API endpoint
   */
  static getApiUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${config.baseUrl}/api${cleanEndpoint}`;
  }

  /**
   * สร้าง URL สำหรับ webhook
   */
  static getWebhookUrl(): string {
    return `${config.baseUrl}/webhook`;
  }

  /**
   * สร้าง URL สำหรับ health check
   */
  static getHealthUrl(): string {
    return `${config.baseUrl}/health`;
  }

  /**
   * สร้าง URL สำหรับไฟล์
   */
  static getFileUrl(fileId: string): string {
    return `${config.baseUrl}/uploads/${fileId}`;
  }

  /**
   * สร้าง URL สำหรับ Google OAuth
   */
  static getGoogleOAuthUrl(state?: string): string {
    const url = new URL('https://accounts.google.com/oauth/authorize');
    url.searchParams.set('client_id', config.google.clientId);
    url.searchParams.set('redirect_uri', config.google.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
    
    if (state) {
      url.searchParams.set('state', state);
    }
    
    return url.toString();
  }
}
