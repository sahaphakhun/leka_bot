// Project Memory Service
// บริการสำหรับจัดการ memory และ rules ของโปรเจ็ก

import { ProjectRules, ProjectRule, ProjectMemory } from './ProjectRules';
import { logger } from '@/utils/logger';

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

export class ProjectMemoryService {
  private projectRules: ProjectRules;

  constructor() {
    this.projectRules = ProjectRules.getInstance();
  }

  /**
   * เพิ่ม rule ใหม่
   */
  public addRule(rule: Omit<ProjectRule, 'id' | 'createdAt' | 'updatedAt'>): ProjectRule {
    const newRule: ProjectRule = {
      ...rule,
      id: this.generateRuleId(rule.category),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.projectRules.addRule(newRule);
    logger.info(`📋 เพิ่ม rule ใหม่: ${newRule.title} (${newRule.id})`);
    
    return newRule;
  }

  /**
   * เพิ่ม memory ใหม่
   */
  public addMemory(memory: Omit<ProjectMemory, 'id' | 'createdAt' | 'updatedAt'>): ProjectMemory {
    const newMemory: ProjectMemory = {
      ...memory,
      id: this.generateMemoryId(memory.type),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.projectRules.addMemory(newMemory);
    logger.info(`🧠 เพิ่ม memory ใหม่: ${newMemory.title} (${newMemory.id})`);
    
    return newMemory;
  }

  /**
   * ค้นหา memory และ rules
   */
  public searchMemories(query: string, tags?: string[]): MemorySearchResult {
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
  public getRuleRecommendations(context: string): RuleRecommendation[] {
    const recommendations: RuleRecommendation[] = [];
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
  public generateProjectInsights(): ProjectInsight[] {
    const insights: ProjectInsight[] = [];
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
  public updateRule(ruleId: string, updates: Partial<ProjectRule>): boolean {
    const success = this.projectRules.updateRule(ruleId, updates);
    if (success) {
      logger.info(`📋 อัปเดต rule: ${ruleId}`);
    }
    return success;
  }

  /**
   * อัปเดต memory
   */
  public updateMemory(memoryId: string, updates: Partial<ProjectMemory>): boolean {
    const success = this.projectRules.updateMemory(memoryId, updates);
    if (success) {
      logger.info(`🧠 อัปเดต memory: ${memoryId}`);
    }
    return success;
  }

  /**
   * ลบ rule
   */
  public deleteRule(ruleId: string): boolean {
    const success = this.projectRules.deleteRule(ruleId);
    if (success) {
      logger.info(`🗑️ ลบ rule: ${ruleId}`);
    }
    return success;
  }

  /**
   * ลบ memory
   */
  public deleteMemory(memoryId: string): boolean {
    const success = this.projectRules.deleteMemory(memoryId);
    if (success) {
      logger.info(`🗑️ ลบ memory: ${memoryId}`);
    }
    return success;
  }

  /**
   * รับ rules ตาม category
   */
  public getRulesByCategory(category: string): ProjectRule[] {
    return this.projectRules.getRulesByCategory(category);
  }

  /**
   * รับ memories ตาม type
   */
  public getMemoriesByType(type: string): ProjectMemory[] {
    return this.projectRules.getMemoriesByType(type);
  }

  /**
   * รับ rule ตาม ID
   */
  public getRule(ruleId: string): ProjectRule | undefined {
    return this.projectRules.getRule(ruleId);
  }

  /**
   * รับ memory ตาม ID
   */
  public getMemory(memoryId: string): ProjectMemory | undefined {
    return this.projectRules.getMemory(memoryId);
  }

  /**
   * รับ rules ทั้งหมด
   */
  public getAllRules(): ProjectRule[] {
    return this.projectRules.getAllRules();
  }

  /**
   * รับ memories ทั้งหมด
   */
  public getAllMemories(): ProjectMemory[] {
    return this.projectRules.getAllMemories();
  }

  /**
   * สร้าง rule ID
   */
  private generateRuleId(category: string): string {
    const categoryPrefix = category.toUpperCase().substring(0, 3);
    const timestamp = Date.now().toString().slice(-6);
    return `${categoryPrefix}-${timestamp}`;
  }

  /**
   * สร้าง memory ID
   */
  private generateMemoryId(type: string): string {
    const typePrefix = type.toUpperCase().substring(0, 3);
    const timestamp = Date.now().toString().slice(-6);
    return `MEM-${typePrefix}-${timestamp}`;
  }

  /**
   * ตรวจสอบความสอดคล้องของ rules และ memories
   */
  public validateConsistency(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const rules = this.getAllRules();
    const memories = this.getAllMemories();

    // ตรวจสอบ rules ที่ไม่มี memories ที่เกี่ยวข้อง
    rules.forEach(rule => {
      const relatedMemories = memories.filter(memory => 
        memory.relatedRules.includes(rule.id)
      );
      
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
  public generateSummaryReport(): any {
    const rules = this.getAllRules();
    const memories = this.getAllMemories();
    
    const rulesByCategory = rules.reduce((acc, rule) => {
      if (!acc[rule.category]) acc[rule.category] = [];
      acc[rule.category].push(rule);
      return acc;
    }, {} as Record<string, ProjectRule[]>);

    const memoriesByType = memories.reduce((acc, memory) => {
      if (!acc[memory.type]) acc[memory.type] = [];
      acc[memory.type].push(memory);
      return acc;
    }, {} as Record<string, ProjectMemory[]>);

    const rulesByPriority = rules.reduce((acc, rule) => {
      if (!acc[rule.priority]) acc[rule.priority] = [];
      acc[rule.priority].push(rule);
      return acc;
    }, {} as Record<string, ProjectRule[]>);

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
