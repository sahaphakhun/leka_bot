import { Group } from '@/models';
type PendingDeletionRequest = NonNullable<Group['settings']['pendingDeletionRequest']>;
interface InitiateDeletionOptions {
    groupId: string;
    requesterLineUserId: string;
    taskIds: string[];
    filter?: 'all' | 'incomplete' | 'custom';
}
interface ApprovalResult {
    status: 'pending' | 'executed' | 'noop' | 'error';
    message: string;
    data?: any;
}
export declare class TaskDeletionService {
    private groupRepository;
    private taskRepository;
    private userRepository;
    private groupMemberRepository;
    private taskService;
    private lineService;
    private userService;
    private ensurePositiveInteger;
    private calculateApprovalThreshold;
    /**
     * ค้นหา Group entity จาก internal UUID หรือ LINE Group ID
     */
    private resolveGroup;
    /**
     * ดึงคำขอลบงานที่รอดำเนินการของกลุ่ม
     */
    getPendingRequest(groupIdOrLineId: string): Promise<PendingDeletionRequest | null>;
    /**
     * สร้างคำขอลบงานใหม่
     */
    initiateDeletionRequest(options: InitiateDeletionOptions): Promise<PendingDeletionRequest>;
    /**
     * บันทึกการยืนยันของสมาชิก
     */
    registerApproval(groupIdOrLineId: string, approverLineUserId: string): Promise<ApprovalResult>;
    /**
     * ดำเนินการลบงานเมื่อได้รับการยืนยันครบตามกำหนด
     */
    private executeDeletion;
    /**
     * แจ้งเตือนในกลุ่มเมื่อมีคำขอลบงานใหม่
     */
    private notifyNewDeletionRequest;
}
export {};
//# sourceMappingURL=TaskDeletionService.d.ts.map