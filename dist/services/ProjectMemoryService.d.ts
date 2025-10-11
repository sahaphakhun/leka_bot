import { ProjectRule, ProjectMemory } from './ProjectRules';
export interface MemorySearchResult {
    memories: ProjectMemory[];
    rules: ProjectRule[];
    totalResults: number;
    searchQuery: string;
    searchTags: string[];
}
export interface RuleRecommendation {
    ruleId: string;
    ruleTitle: string;
    reason: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    context: string;
}
export interface ProjectInsight {
    type: 'warning' | 'info' | 'success' | 'error';
    title: string;
    message: string;
    relatedRules: string[];
    relatedMemories: string[];
    timestamp: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
}
export declare class ProjectMemoryService {
    private projectRules;
    constructor();
    /**
     * เพิ่ม rule ใหม่
     */
    addRule(rule: Omit<ProjectRule, 'id' | 'createdAt' | 'updatedAt'>): ProjectRule;
    /**
     * เพิ่ม memory ใหม่
     */
    addMemory(memory: Omit<ProjectMemory, 'id' | 'createdAt' | 'updatedAt'>): ProjectMemory;
    /**
     * ค้นหา memory และ rules
     */
    searchMemories(query: string, tags?: string[]): MemorySearchResult;
    /**
     * รับ rule recommendations ตาม context
     */
    getRuleRecommendations(context: string): RuleRecommendation[];
    /**
     * สร้าง project insights ตามสถานะปัจจุบัน
     */
    generateProjectInsights(): ProjectInsight[];
    /**
     * อัปเดต rule
     */
    updateRule(ruleId: string, updates: Partial<ProjectRule>): boolean;
    /**
     * อัปเดต memory
     */
    updateMemory(memoryId: string, updates: Partial<ProjectMemory>): boolean;
    /**
     * ลบ rule
     */
    deleteRule(ruleId: string): boolean;
    /**
     * ลบ memory
     */
    deleteMemory(memoryId: string): boolean;
    /**
     * รับ rules ตาม category
     */
    getRulesByCategory(category: string): ProjectRule[];
    /**
     * รับ memories ตาม type
     */
    getMemoriesByType(type: string): ProjectMemory[];
    /**
     * รับ rule ตาม ID
     */
    getRule(ruleId: string): ProjectRule | undefined;
    /**
     * รับ memory ตาม ID
     */
    getMemory(memoryId: string): ProjectMemory | undefined;
    /**
     * รับ rules ทั้งหมด
     */
    getAllRules(): ProjectRule[];
    /**
     * รับ memories ทั้งหมด
     */
    getAllMemories(): ProjectMemory[];
    /**
     * สร้าง rule ID
     */
    private generateRuleId;
    /**
     * สร้าง memory ID
     */
    private generateMemoryId;
    /**
     * ตรวจสอบความสอดคล้องของ rules และ memories
     */
    validateConsistency(): {
        isValid: boolean;
        issues: string[];
    };
    /**
     * สร้างรายงานสรุป rules และ memories
     */
    generateSummaryReport(): any;
}
//# sourceMappingURL=ProjectMemoryService.d.ts.map