"use strict";
// Service Container - Dependency Injection Container
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceContainer = exports.ServiceContainer = void 0;
const LineService_1 = require("@/services/LineService");
const TaskService_1 = require("@/services/TaskService");
const UserService_1 = require("@/services/UserService");
const FileService_1 = require("@/services/FileService");
const CommandService_1 = require("@/services/CommandService");
const NotificationService_1 = require("@/services/NotificationService");
const EmailService_1 = require("@/services/EmailService");
const KPIService_1 = require("@/services/KPIService");
const CronService_1 = require("@/services/CronService");
const GoogleCalendarService_1 = require("@/services/GoogleCalendarService");
const GoogleService_1 = require("@/services/GoogleService");
const NotificationCardService_1 = require("@/services/NotificationCardService");
const FlexMessageDesignSystem_1 = require("@/services/FlexMessageDesignSystem");
const FlexMessageTemplateService_1 = require("@/services/FlexMessageTemplateService");
const ProjectRules_1 = require("@/services/ProjectRules");
const ProjectMemoryService_1 = require("@/services/ProjectMemoryService");
const ProjectWorkflowService_1 = require("@/services/ProjectWorkflowService");
const ProjectChecklistService_1 = require("@/services/ProjectChecklistService");
const RecurringTaskService_1 = require("@/services/RecurringTaskService");
class ServiceContainer {
    constructor() {
        this.services = new Map();
    }
    static getInstance() {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }
    /**
     * ได้ service instance
     */
    get(serviceName) {
        if (!this.services.has(serviceName)) {
            this.services.set(serviceName, this.createService(serviceName));
        }
        return this.services.get(serviceName);
    }
    /**
     * สร้าง service instance
     */
    createService(serviceName) {
        switch (serviceName) {
            case 'LineService':
                return new LineService_1.LineService();
            case 'TaskService':
                return new TaskService_1.TaskService();
            case 'UserService':
                return new UserService_1.UserService();
            case 'FileService':
                return new FileService_1.FileService();
            case 'CommandService':
                return new CommandService_1.CommandService();
            case 'NotificationService':
                return new NotificationService_1.NotificationService();
            case 'EmailService':
                return new EmailService_1.EmailService();
            case 'KPIService':
                return new KPIService_1.KPIService();
            case 'CronService':
                return new CronService_1.CronService();
            case 'GoogleCalendarService':
                return new GoogleCalendarService_1.GoogleCalendarService();
            case 'GoogleService':
                return new GoogleService_1.GoogleService();
            case 'NotificationCardService':
                return new NotificationCardService_1.NotificationCardService();
            case 'FlexMessageDesignSystem':
                return FlexMessageDesignSystem_1.FlexMessageDesignSystem;
            case 'FlexMessageTemplateService':
                return FlexMessageTemplateService_1.FlexMessageTemplateService;
            case 'ProjectRules':
                return ProjectRules_1.ProjectRules.getInstance();
            case 'ProjectMemoryService':
                return new ProjectMemoryService_1.ProjectMemoryService();
            case 'ProjectWorkflowService':
                return new ProjectWorkflowService_1.ProjectWorkflowService();
            case 'ProjectChecklistService':
                return new ProjectChecklistService_1.ProjectChecklistService();
            case 'RecurringTaskService':
                return new RecurringTaskService_1.RecurringTaskService();
            default:
                throw new Error(`Service not found: ${serviceName}`);
        }
    }
    /**
     * ล้าง service cache
     */
    clear() {
        this.services.clear();
    }
    /**
     * ตรวจสอบว่า service มีอยู่หรือไม่
     */
    has(serviceName) {
        return this.services.has(serviceName);
    }
    /**
     * ลบ service ออกจาก cache
     */
    remove(serviceName) {
        return this.services.delete(serviceName);
    }
}
exports.ServiceContainer = ServiceContainer;
// Export singleton instance
exports.serviceContainer = ServiceContainer.getInstance();
//# sourceMappingURL=serviceContainer.js.map