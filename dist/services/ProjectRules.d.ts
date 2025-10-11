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
export declare class ProjectRules {
    private static instance;
    private rules;
    private memories;
    private checklists;
    private constructor();
    static getInstance(): ProjectRules;
    private initializeDefaultRules;
    private initializeDefaultMemories;
    private initializeDefaultChecklists;
    addRule(rule: ProjectRule): void;
    addMemory(memory: ProjectMemory): void;
    addChecklist(checklist: ProjectChecklist): void;
    getRule(id: string): ProjectRule | undefined;
    getMemory(id: string): ProjectMemory | undefined;
    getChecklist(id: string): ProjectChecklist | undefined;
    getAllRules(): ProjectRule[];
    getAllMemories(): ProjectMemory[];
    getAllChecklists(): ProjectChecklist[];
    getRulesByCategory(category: string): ProjectRule[];
    getMemoriesByType(type: string): ProjectMemory[];
    getActiveChecklists(): ProjectChecklist[];
    updateRule(id: string, updates: Partial<ProjectRule>): boolean;
    updateMemory(id: string, updates: Partial<ProjectMemory>): boolean;
    updateChecklist(id: string, updates: Partial<ProjectChecklist>): boolean;
    deleteRule(id: string): boolean;
    deleteMemory(id: string): boolean;
    deleteChecklist(id: string): boolean;
}
//# sourceMappingURL=ProjectRules.d.ts.map