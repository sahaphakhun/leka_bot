import { NotificationCard, NotificationButton, CreateNotificationCardRequest, NotificationCardResponse } from '@/types';
export declare class NotificationCardService {
    private lineService;
    private userService;
    constructor();
    /**
     * สร้างการ์ดแจ้งเตือนใหม่
     */
    createNotificationCard(request: CreateNotificationCardRequest): Promise<NotificationCard>;
    /**
     * ส่งการ์ดแจ้งเตือน
     */
    sendNotificationCard(notificationCard: NotificationCard): Promise<NotificationCardResponse>;
    /**
     * สร้างและส่งการ์ดแจ้งเตือนในขั้นตอนเดียว
     */
    createAndSendNotificationCard(request: CreateNotificationCardRequest): Promise<NotificationCardResponse>;
    /**
     * สร้าง Flex Message สำหรับ LINE
     */
    private createFlexMessage;
    /**
     * ตรวจสอบความถูกต้องของข้อมูล
     */
    private validateNotificationRequest;
    /**
     * ได้สีของหัวข้อตามความสำคัญ
     */
    private getPriorityColor;
    /**
     * สร้างปุ่มมาตรฐาน
     */
    createStandardButtons(): NotificationButton[];
    /**
     * สร้างปุ่มสำหรับการอนุมัติ
     */
    createApprovalButtons(): NotificationButton[];
}
//# sourceMappingURL=NotificationCardService.d.ts.map