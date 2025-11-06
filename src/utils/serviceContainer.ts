// Service Container - Dependency Injection Container

import { LineService } from '@/services/LineService';
import { TaskService } from '@/services/TaskService';
import { UserService } from '@/services/UserService';
import { FileService } from '@/services/FileService';
import { CommandService } from '@/services/CommandService';
import { NotificationService } from '@/services/NotificationService';
import { EmailService } from '@/services/EmailService';
import { KPIService } from '@/services/KPIService';
import { CronService } from '@/services/CronService';
import { GoogleCalendarService } from '@/services/GoogleCalendarService';
import { GoogleService } from '@/services/GoogleService';
import { NotificationCardService } from '@/services/NotificationCardService';
import { FlexMessageDesignSystem } from '@/services/FlexMessageDesignSystem';
import { FlexMessageTemplateService } from '@/services/FlexMessageTemplateService';
import { ProjectRules } from '@/services/ProjectRules';
import { ProjectMemoryService } from '@/services/ProjectMemoryService';
import { ProjectWorkflowService } from '@/services/ProjectWorkflowService';
import { ProjectChecklistService } from '@/services/ProjectChecklistService';
import { RecurringTaskService } from '@/services/RecurringTaskService';
import { TaskDeletionService } from '@/services/TaskDeletionService';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * ได้ service instance
   */
  get<T>(serviceName: string): T {
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, this.createService(serviceName));
    }
    return this.services.get(serviceName);
  }

  /**
   * สร้าง service instance
   */
  private createService(serviceName: string): any {
    switch (serviceName) {
      case 'LineService':
        return new LineService();
      
      case 'TaskService':
        return new TaskService();
      
      case 'UserService':
        return new UserService();
      
      case 'FileService':
        return new FileService();
      
      case 'CommandService':
        return new CommandService();
      
      case 'NotificationService':
        return new NotificationService();
      
      case 'EmailService':
        return new EmailService();
      
      case 'KPIService':
        return new KPIService();
      
      case 'CronService':
        return new CronService();
      
      case 'GoogleCalendarService':
        return new GoogleCalendarService();
      
      case 'GoogleService':
        return new GoogleService();
      
      case 'NotificationCardService':
        return new NotificationCardService();
      
      case 'FlexMessageDesignSystem':
        return FlexMessageDesignSystem;
      
      case 'FlexMessageTemplateService':
        return FlexMessageTemplateService;
      
      case 'ProjectRules':
        return ProjectRules.getInstance();
      
      case 'ProjectMemoryService':
        return new ProjectMemoryService();
      
      case 'ProjectWorkflowService':
        return new ProjectWorkflowService();
      
      case 'ProjectChecklistService':
        return new ProjectChecklistService();
      
      case 'RecurringTaskService':
        return new RecurringTaskService();

      case 'TaskDeletionService':
        return new TaskDeletionService();
      
      default:
        throw new Error(`Service not found: ${serviceName}`);
    }
  }

  /**
   * ล้าง service cache
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * ตรวจสอบว่า service มีอยู่หรือไม่
   */
  has(serviceName: string): boolean {
    return this.services.has(serviceName);
  }

  /**
   * ลบ service ออกจาก cache
   */
  remove(serviceName: string): boolean {
    return this.services.delete(serviceName);
  }
}

// Export singleton instance
export const serviceContainer = ServiceContainer.getInstance(); 
