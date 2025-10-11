"use strict";
// Project Memory Service
// บริการสำหรับจัดการ memory และ rules ของโปรเจ็ก
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMemoryService = void 0;
const ProjectRules_1 = require("./ProjectRules");
const logger_1 = require("@/utils/logger");
class ProjectMemoryService {
    constructor() {
        this.projectRules = ProjectRules_1.ProjectRules.getInstance();
    }
    /**
     * เพิ่ม rule ใหม่
     */
    addRule(rule) {
        const newRule = {
            ...rule,
            id: this.generateRuleId(rule.category),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.projectRules.addRule(newRule);
        logger_1.logger.info(`📋 เพิ่ม rule ใหม่: ${newRule.title} (${newRule.id})`);
        return newRule;
    }
    /**
     * เพิ่ม memory ใหม่
     */
    addMemory(memory) {
        const newMemory = {
            ...memory,
            id: this.generateMemoryId(memory.type),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.projectRules.addMemory(newMemory);
        logger_1.logger.info(`🧠 เพิ่ม memory ใหม่: ${newMemory.title} (${newMemory.id})`);
        return newMemory;
    }
    /**
     * ค้นหา memory และ rules
     */
    searchMemories(query, tags) {
        const searchQuery = query.toLowerCase();
        const searchTags = tags || [];
        // ค้นหาใน memories
        const memories = this.projectRules.getAllMemories().filter(memory => {
            const matchesQuery = memory.title.toLowerCase().includes(searchQuery) ||
                memory.content.toLowerCase().includes(searchQuery);
            const matchesTags = searchTags.length === 0 ||
                searchTags.some(tag => memory.tags.includes(tag));
            return matchesQuery && matchesTags;
        });
        // ค้นหาใน rules
        const rules = this.projectRules.getAllRules().filter(rule => {
            const matchesQuery = rule.title.toLowerCase().includes(searchQuery) ||
                rule.description.toLowerCase().includes(searchQuery);
            return matchesQuery;
        });
        return {
            memories,
            rules,
            totalResults: memories.length + rules.length,
            searchQuery,
            searchTags
        };
    }
    /**
     * รับ rule recommendations ตาม context
     */
    getRuleRecommendations(context) {
        const recommendations = [];
        const contextLower = context.toLowerCase();
        // ตรวจสอบ context และแนะนำ rules ที่เกี่ยวข้อง
        if (contextLower.includes('เริ่มงาน') || contextLower.includes('เริ่มโปรเจ็ก')) {
            recommendations.push({
                ruleId: 'WF-001',
                ruleTitle: 'ตรวจสอบโปรเจ็กก่อนเริ่มงาน',
                reason: 'ต้องตรวจสอบโปรเจ็กก่อนเริ่มงานใด ๆ เสมอ',
                priority: 'critical',
                context: 'การเริ่มงานใหม่'
            });
        }
        if (contextLower.includes('สร้างงาน') || contextLower.includes('มอบหมายงาน')) {
            recommendations.push({
                ruleId: 'WF-002',
                ruleTitle: 'สร้าง To-dos สำหรับทุกงาน',
                reason: 'ทุกงานต้องสร้าง To-dos ในระบบเพื่อติดตามความคืบหน้า',
                priority: 'high',
                context: 'การสร้างงานใหม่'
            });
        }
        if (contextLower.includes('commit') || contextLower.includes('โค้ด')) {
            recommendations.push({
                ruleId: 'QL-002',
                ruleTitle: 'ตรวจสอบโค้ดก่อน commit',
                reason: 'ต้องตรวจสอบโค้ดด้วย linter และ test ก่อน commit',
                priority: 'medium',
                context: 'การ commit โค้ด'
            });
        }
        if (contextLower.includes('ส่งมอบ') || contextLower.includes('deploy')) {
            recommendations.push({
                ruleId: 'QL-001',
                ruleTitle: 'ทดสอบก่อนส่งมอบ',
                reason: 'ทุกฟีเจอร์ต้องผ่านการทดสอบก่อนส่งมอบ',
                priority: 'high',
                context: 'การส่งมอบงาน'
            });
        }
        if (contextLower.includes('ความปลอดภัย') || contextLower.includes('security')) {
            recommendations.push({
                ruleId: 'SEC-001',
                ruleTitle: 'ไม่เปิดเผยข้อมูลสำคัญ',
                reason: 'ไม่เปิดเผย API keys, passwords หรือข้อมูลสำคัญในโค้ด',
                priority: 'critical',
                context: 'การจัดการความปลอดภัย'
            });
        }
        return recommendations;
    }
    /**
     * สร้าง project insights ตามสถานะปัจจุบัน
     */
    generateProjectInsights() {
        const insights = [];
        const rules = this.projectRules.getAllRules();
        const memories = this.projectRules.getAllMemories();
        // ตรวจสอบ rules ที่สำคัญ
        const criticalRules = rules.filter(rule => rule.priority === 'critical');
        if (criticalRules.length > 0) {
            insights.push({
                type: 'warning',
                title: 'มี Rules ที่สำคัญ',
                message: `มี ${criticalRules.length} rules ที่มีความสำคัญสูง ควรปฏิบัติตามอย่างเคร่งครัด`,
                relatedRules: criticalRules.map(r => r.id),
                relatedMemories: [],
                timestamp: new Date(),
                priority: 'high'
            });
        }
        // ตรวจสอบ workflow rules
        const workflowRules = rules.filter(rule => rule.category === 'workflow');
        if (workflowRules.length > 0) {
            insights.push({
                type: 'info',
                title: 'Workflow Rules',
                message: `มี ${workflowRules.length} rules สำหรับ workflow ที่ควรปฏิบัติตาม`,
                relatedRules: workflowRules.map(r => r.id),
                relatedMemories: [],
                timestamp: new Date(),
                priority: 'medium'
            });
        }
        // ตรวจสอบ lessons learned
        const lessons = memories.filter(memory => memory.type === 'lesson');
        if (lessons.length > 0) {
            insights.push({
                type: 'success',
                title: 'บทเรียนที่ได้เรียนรู้',
                message: `มี ${lessons.length} บทเรียนที่ได้เรียนรู้จากประสบการณ์`,
                relatedRules: [],
                relatedMemories: lessons.map(l => l.id),
                timestamp: new Date(),
                priority: 'medium'
            });
        }
        return insights;
    }
    /**
     * อัปเดต rule
     */
    updateRule(ruleId, updates) {
        const success = this.projectRules.updateRule(ruleId, updates);
        if (success) {
            logger_1.logger.info(`📋 อัปเดต rule: ${ruleId}`);
        }
        return success;
    }
    /**
     * อัปเดต memory
     */
    updateMemory(memoryId, updates) {
        const success = this.projectRules.updateMemory(memoryId, updates);
        if (success) {
            logger_1.logger.info(`🧠 อัปเดต memory: ${memoryId}`);
        }
        return success;
    }
    /**
     * ลบ rule
     */
    deleteRule(ruleId) {
        const success = this.projectRules.deleteRule(ruleId);
        if (success) {
            logger_1.logger.info(`🗑️ ลบ rule: ${ruleId}`);
        }
        return success;
    }
    /**
     * ลบ memory
     */
    deleteMemory(memoryId) {
        const success = this.projectRules.deleteMemory(memoryId);
        if (success) {
            logger_1.logger.info(`🗑️ ลบ memory: ${memoryId}`);
        }
        return success;
    }
    /**
     * รับ rules ตาม category
     */
    getRulesByCategory(category) {
        return this.projectRules.getRulesByCategory(category);
    }
    /**
     * รับ memories ตาม type
     */
    getMemoriesByType(type) {
        return this.projectRules.getMemoriesByType(type);
    }
    /**
     * รับ rule ตาม ID
     */
    getRule(ruleId) {
        return this.projectRules.getRule(ruleId);
    }
    /**
     * รับ memory ตาม ID
     */
    getMemory(memoryId) {
        return this.projectRules.getMemory(memoryId);
    }
    /**
     * รับ rules ทั้งหมด
     */
    getAllRules() {
        return this.projectRules.getAllRules();
    }
    /**
     * รับ memories ทั้งหมด
     */
    getAllMemories() {
        return this.projectRules.getAllMemories();
    }
    /**
     * สร้าง rule ID
     */
    generateRuleId(category) {
        const categoryPrefix = category.toUpperCase().substring(0, 3);
        const timestamp = Date.now().toString().slice(-6);
        return `${categoryPrefix}-${timestamp}`;
    }
    /**
     * สร้าง memory ID
     */
    generateMemoryId(type) {
        const typePrefix = type.toUpperCase().substring(0, 3);
        const timestamp = Date.now().toString().slice(-6);
        return `MEM-${typePrefix}-${timestamp}`;
    }
    /**
     * ตรวจสอบความสอดคล้องของ rules และ memories
     */
    validateConsistency() {
        const issues = [];
        const rules = this.getAllRules();
        const memories = this.getAllMemories();
        // ตรวจสอบ rules ที่ไม่มี memories ที่เกี่ยวข้อง
        rules.forEach(rule => {
            const relatedMemories = memories.filter(memory => memory.relatedRules.includes(rule.id));
            if (relatedMemories.length === 0 && rule.priority === 'critical') {
                issues.push(`Critical rule ${rule.id} ไม่มี memories ที่เกี่ยวข้อง`);
            }
        });
        // ตรวจสอบ memories ที่อ้างอิง rules ที่ไม่มีอยู่
        memories.forEach(memory => {
            memory.relatedRules.forEach(ruleId => {
                if (!rules.find(r => r.id === ruleId)) {
                    issues.push(`Memory ${memory.id} อ้างอิง rule ${ruleId} ที่ไม่มีอยู่`);
                }
            });
        });
        return {
            isValid: issues.length === 0,
            issues
        };
    }
    /**
     * สร้างรายงานสรุป rules และ memories
     */
    generateSummaryReport() {
        const rules = this.getAllRules();
        const memories = this.getAllMemories();
        const rulesByCategory = rules.reduce((acc, rule) => {
            if (!acc[rule.category])
                acc[rule.category] = [];
            acc[rule.category].push(rule);
            return acc;
        }, {});
        const memoriesByType = memories.reduce((acc, memory) => {
            if (!acc[memory.type])
                acc[memory.type] = [];
            acc[memory.type].push(memory);
            return acc;
        }, {});
        const rulesByPriority = rules.reduce((acc, rule) => {
            if (!acc[rule.priority])
                acc[rule.priority] = [];
            acc[rule.priority].push(rule);
            return acc;
        }, {});
        return {
            summary: {
                totalRules: rules.length,
                totalMemories: memories.length,
                rulesByCategory: Object.keys(rulesByCategory).map(cat => ({
                    category: cat,
                    count: rulesByCategory[cat].length
                })),
                memoriesByType: Object.keys(memoriesByType).map(type => ({
                    type,
                    count: memoriesByType[type].length
                })),
                rulesByPriority: Object.keys(rulesByPriority).map(priority => ({
                    priority,
                    count: rulesByPriority[priority].length
                }))
            },
            consistency: this.validateConsistency(),
            insights: this.generateProjectInsights()
        };
    }
}
exports.ProjectMemoryService = ProjectMemoryService;
//# sourceMappingURL=ProjectMemoryService.js.map