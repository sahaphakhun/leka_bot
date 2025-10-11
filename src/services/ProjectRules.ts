// Project Rules & Memory Service
// บริการสำหรับเก็บ rules และ memory หลักของโปรเจ็ก

export interface ProjectRule {
  id: string;
  category: 'workflow' | 'quality' | 'security' | 'performance' | 'maintenance';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemory {
  id: string;
  type: 'note' | 'decision' | 'lesson' | 'reference';
  title: string;
  content: string;
  tags: string[];
  relatedRules: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectChecklist {
  id: string;
  name: string;
  description: string;
  items: ChecklistItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

export class ProjectRules {
  private static instance: ProjectRules;
  private rules: Map<string, ProjectRule> = new Map();
  private memories: Map<string, ProjectMemory> = new Map();
  private checklists: Map<string, ProjectChecklist> = new Map();

  private constructor() {
    this.initializeDefaultRules();
    this.initializeDefaultMemories();
    this.initializeDefaultChecklists();
  }

  public static getInstance(): ProjectRules {
    if (!ProjectRules.instance) {
      ProjectRules.instance = new ProjectRules();
    }
    return ProjectRules.instance;
  }

  private initializeDefaultRules(): void {
    // Workflow Rules
    this.addRule({
      id: 'WF-001',
      category: 'workflow',
      title: 'ตรวจสอบโปรเจ็กก่อนเริ่มงาน',
      description: 'ก่อนเริ่มงานใด ๆ ต้องตรวจสอบโปรเจ็กและสร้าง To-dos ในระบบเสมอ',
      priority: 'critical',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.addRule({
      id: 'WF-002',
      category: 'workflow',
      title: 'สร้าง To-dos สำหรับทุกงาน',
      description: 'ทุกงานที่ได้รับมอบหมายต้องสร้าง To-dos ในระบบเพื่อติดตามความคืบหน้า',
      priority: 'high',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.addRule({
      id: 'WF-003',
      category: 'workflow',
      title: 'อัปเดตสถานะงานเป็นประจำ',
      description: 'อัปเดตสถานะงานทุกวันหรือเมื่อมีการเปลี่ยนแปลง',
      priority: 'medium',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Quality Rules
    this.addRule({
      id: 'QL-001',
      category: 'quality',
      title: 'ทดสอบก่อนส่งมอบ',
      description: 'ทุกฟีเจอร์ต้องผ่านการทดสอบก่อนส่งมอบให้ผู้ใช้',
      priority: 'high',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.addRule({
      id: 'QL-002',
      category: 'quality',
      title: 'ตรวจสอบโค้ดก่อน commit',
      description: 'ตรวจสอบโค้ดด้วย linter และ test ก่อน commit',
      priority: 'medium',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Security Rules
    this.addRule({
      id: 'SEC-001',
      category: 'security',
      title: 'ไม่เปิดเผยข้อมูลสำคัญ',
      description: 'ไม่เปิดเผย API keys, passwords หรือข้อมูลสำคัญในโค้ด',
      priority: 'critical',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Performance Rules
    this.addRule({
      id: 'PERF-001',
      category: 'performance',
      title: 'ตรวจสอบประสิทธิภาพ',
      description: 'ตรวจสอบประสิทธิภาพของฟีเจอร์ใหม่ก่อนส่งมอบ',
      priority: 'medium',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  private initializeDefaultMemories(): void {
    // Project Memories
    this.addMemory({
      id: 'MEM-001',
      type: 'lesson',
      title: 'การตรวจสอบโปรเจ็กช่วยป้องกันปัญหา',
      content: 'การตรวจสอบโปรเจ็กก่อนเริ่มงานช่วยให้เห็นภาพรวมและป้องกันปัญหาที่อาจเกิดขึ้น',
      tags: ['project-management', 'best-practice', 'workflow'],
      relatedRules: ['WF-001'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.addMemory({
      id: 'MEM-002',
      type: 'decision',
      title: 'ใช้ TypeScript สำหรับ type safety',
      content: 'ตัดสินใจใช้ TypeScript เพื่อเพิ่มความปลอดภัยของโค้ดและลดข้อผิดพลาด',
      tags: ['technology', 'typescript', 'decision'],
      relatedRules: ['QL-002'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.addMemory({
      id: 'MEM-003',
      type: 'reference',
      title: 'โครงสร้างโปรเจ็ก LINE Bot',
      content: 'โปรเจ็กนี้เป็น LINE Bot สำหรับจัดการงานและปฏิทิน ใช้ Express.js, TypeORM, PostgreSQL',
      tags: ['architecture', 'line-bot', 'reference'],
      relatedRules: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  private initializeDefaultChecklists(): void {
    // Pre-Work Checklist
    this.addChecklist({
      id: 'CL-001',
      name: 'ตรวจสอบก่อนเริ่มงาน',
      description: 'รายการตรวจสอบที่ต้องทำก่อนเริ่มงานใด ๆ',
      items: [
        {
          id: 'CL-001-001',
          title: 'ตรวจสอบสถานะโปรเจ็ก',
          description: 'ตรวจสอบว่าโปรเจ็กทำงานปกติหรือไม่',
          isRequired: true,
          isCompleted: false
        },
        {
          id: 'CL-001-002',
          title: 'ตรวจสอบฐานข้อมูล',
          description: 'ตรวจสอบการเชื่อมต่อฐานข้อมูลและข้อมูลที่จำเป็น',
          isRequired: true,
          isCompleted: false
        },
        {
          id: 'CL-001-003',
          title: 'ตรวจสอบ LINE Bot',
          description: 'ตรวจสอบว่า LINE Bot ทำงานปกติและเชื่อมต่อกับ LINE API',
          isRequired: true,
          isCompleted: false
        },
        {
          id: 'CL-001-004',
          title: 'สร้าง To-dos สำหรับงานที่ได้รับมอบหมาย',
          description: 'สร้าง To-dos ในระบบสำหรับงานที่ได้รับมอบหมาย',
          isRequired: true,
          isCompleted: false
        },
        {
          id: 'CL-001-005',
          title: 'ตรวจสอบ dependencies',
          description: 'ตรวจสอบว่า dependencies ทั้งหมดอัปเดตและทำงานปกติ',
          isRequired: false,
          isCompleted: false
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Code Review Checklist
    this.addChecklist({
      id: 'CL-002',
      name: 'ตรวจสอบโค้ดก่อน commit',
      description: 'รายการตรวจสอบก่อน commit โค้ด',
      items: [
        {
          id: 'CL-002-001',
          title: 'รัน linter',
          description: 'รัน ESLint เพื่อตรวจสอบคุณภาพโค้ด',
          isRequired: true,
          isCompleted: false
        },
        {
          id: 'CL-002-002',
          title: 'รัน tests',
          description: 'รัน unit tests และ integration tests',
          isRequired: true,
          isCompleted: false
        },
        {
          id: 'CL-002-003',
          title: 'ตรวจสอบ type safety',
          description: 'ตรวจสอบว่า TypeScript compile ผ่านโดยไม่มี error',
          isRequired: true,
          isCompleted: false
        },
        {
          id: 'CL-002-004',
          title: 'ตรวจสอบ security',
          description: 'ตรวจสอบว่าไม่มีข้อมูลสำคัญในโค้ด',
          isRequired: true,
          isCompleted: false
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  public addRule(rule: ProjectRule): void {
    this.rules.set(rule.id, rule);
  }

  public addMemory(memory: ProjectMemory): void {
    this.memories.set(memory.id, memory);
  }

  public addChecklist(checklist: ProjectChecklist): void {
    this.checklists.set(checklist.id, checklist);
  }

  public getRule(id: string): ProjectRule | undefined {
    return this.rules.get(id);
  }

  public getMemory(id: string): ProjectMemory | undefined {
    return this.memories.get(id);
  }

  public getChecklist(id: string): ProjectChecklist | undefined {
    return this.checklists.get(id);
  }

  public getAllRules(): ProjectRule[] {
    return Array.from(this.rules.values());
  }

  public getAllMemories(): ProjectMemory[] {
    return Array.from(this.memories.values());
  }

  public getAllChecklists(): ProjectChecklist[] {
    return Array.from(this.checklists.values());
  }

  public getRulesByCategory(category: string): ProjectRule[] {
    return this.getAllRules().filter(rule => rule.category === category);
  }

  public getMemoriesByType(type: string): ProjectMemory[] {
    return this.getAllMemories().filter(memory => memory.type === type);
  }

  public getActiveChecklists(): ProjectChecklist[] {
    return this.getAllChecklists().filter(checklist => checklist.isActive);
  }

  public updateRule(id: string, updates: Partial<ProjectRule>): boolean {
    const rule = this.rules.get(id);
    if (rule) {
      const updatedRule = { ...rule, ...updates, updatedAt: new Date() };
      this.rules.set(id, updatedRule);
      return true;
    }
    return false;
  }

  public updateMemory(id: string, updates: Partial<ProjectMemory>): boolean {
    const memory = this.memories.get(id);
    if (memory) {
      const updatedMemory = { ...memory, ...updates, updatedAt: new Date() };
      this.memories.set(id, updatedMemory);
      return true;
    }
    return false;
  }

  public updateChecklist(id: string, updates: Partial<ProjectChecklist>): boolean {
    const checklist = this.checklists.get(id);
    if (checklist) {
      const updatedChecklist = { ...checklist, ...updates, updatedAt: new Date() };
      this.checklists.set(id, updatedChecklist);
      return true;
    }
    return false;
  }

  public deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  public deleteMemory(id: string): boolean {
    return this.memories.delete(id);
  }

  public deleteChecklist(id: string): boolean {
    return this.checklists.delete(id);
  }
}
