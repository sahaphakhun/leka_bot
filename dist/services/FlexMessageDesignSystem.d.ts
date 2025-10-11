import { FlexMessage } from '@line/bot-sdk';
export interface FlexMessageTemplate {
    type: 'flex';
    altText: string;
    contents: {
        type: 'bubble';
        size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
        header?: {
            type: 'box';
            layout: 'vertical' | 'horizontal';
            contents: any[];
            backgroundColor?: string;
            paddingAll?: string;
        };
        body?: {
            type: 'box';
            layout: 'vertical' | 'horizontal';
            spacing?: string;
            contents: any[];
            paddingAll?: string;
        };
        footer?: {
            type: 'box';
            layout: 'vertical' | 'horizontal';
            spacing?: string;
            contents: any[];
            paddingAll?: string;
        };
    };
}
export interface TaskCardData {
    id: string;
    title: string;
    description?: string;
    dueTime?: Date;
    assignees?: string[];
    status?: string;
    priority?: string;
    tags?: string[];
    creator?: string;
    completedBy?: string;
    completedAt?: Date;
    fileCount?: number;
    attachedFiles?: any[];
    initialFiles?: any[];
    submissionFiles?: any[];
    links?: string[];
    changes?: Record<string, any>;
    changedFields?: string[];
    overdueHours?: number;
    submitterName?: string;
    reviewerName?: string;
    newDueTime?: Date;
    completionScore?: number;
    completionStatus?: string;
    completionText?: string;
}
export declare class FlexMessageDesignSystem {
    private static sanitizeText;
    static colors: {
        primary: string;
        success: string;
        warning: string;
        danger: string;
        info: string;
        neutral: string;
        lightGray: string;
        darkGray: string;
        textPrimary: string;
        textSecondary: string;
        white: string;
        priorityHigh: string;
        priorityMedium: string;
        priorityLow: string;
    };
    static sizes: {
        readonly default: undefined;
        readonly compact: "kilo";
        readonly large: "mega";
        readonly extraLarge: "giga";
    };
    static layouts: {
        header: "vertical";
        body: "vertical";
        footer: "horizontal";
    };
    static padding: {
        small: string;
        medium: string;
        large: string;
    };
    static spacing: {
        small: string;
        medium: string;
        large: string;
    };
    static textSizes: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    static emojis: {
        newTask: string;
        overdue: string;
        completed: string;
        updated: string;
        deleted: string;
        submitted: string;
        review: string;
        rejected: string;
        report: string;
        personal: string;
        file: string;
        task: string;
        reminder: string;
        meeting: string;
        approval: string;
    };
    static getStatusColor(status: string): string;
    static getPriorityColor(priority: string): string;
    static getStatusText(status: string): string;
    static getPriorityText(priority: string): string;
    static createButton(label: string, action: 'postback' | 'uri', data: string | {
        [key: string]: any;
    }, style?: 'primary' | 'secondary' | 'danger', height?: 'sm' | 'md'): {
        type: "button";
        style: "primary" | "secondary" | "danger";
        height: "sm" | "md";
        action: {
            data: string;
            type: "postback" | "uri";
            label: string;
        } | {
            uri: string;
            type: "postback" | "uri";
            label: string;
        };
    };
    static createText(text: string, size?: keyof typeof FlexMessageDesignSystem.textSizes, color?: string, weight?: 'bold', wrap?: boolean, margin?: keyof typeof FlexMessageDesignSystem.padding): {
        margin?: string | undefined;
        wrap?: true | undefined;
        weight?: "bold" | undefined;
        type: "text";
        text: string;
        size: string;
        color: string;
    };
    static createSeparator(margin?: keyof typeof FlexMessageDesignSystem.padding): {
        type: "separator";
        margin: string;
    };
    static createBox(layout: 'vertical' | 'horizontal', contents: any[], spacing?: keyof typeof FlexMessageDesignSystem.spacing, padding?: keyof typeof FlexMessageDesignSystem.padding, backgroundColor?: string, cornerRadius?: string): {
        cornerRadius?: string | undefined;
        backgroundColor?: string | undefined;
        paddingAll?: string | undefined;
        spacing?: string | undefined;
        type: "box";
        layout: "vertical" | "horizontal";
        contents: any[];
    };
    static createStandardTaskCard(title: string, emoji: string, color: string, content: any[], // รับได้ทั้ง text, separator, และ box components
    buttons: any[], size?: keyof typeof FlexMessageDesignSystem.sizes): FlexMessage;
    static createTaskInfoCard(taskData: TaskCardData, type: string): FlexMessage;
    private static getTypeConfig;
    private static formatDate;
    private static getBaseUrl;
}
//# sourceMappingURL=FlexMessageDesignSystem.d.ts.map