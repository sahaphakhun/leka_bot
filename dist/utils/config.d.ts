export declare const config: {
    port: number;
    nodeEnv: string;
    baseUrl: string;
    allowDashboardOnly: boolean;
    line: {
        channelAccessToken: string;
        channelSecret: string;
        botUserId: string | undefined;
        loginChannelId: string | undefined;
        loginChannelSecret: string | undefined;
    };
    database: {
        url: string | undefined;
        host: string;
        port: number;
        username: string;
        password: string;
        name: string;
    };
    google: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
        serviceAccountKey: string | undefined;
        serviceAccountJson: string | undefined;
        driveSharedFolderId: string | undefined;
        credentialsPath: string | undefined;
        serviceAccountType: string | undefined;
        serviceAccountProjectId: string | undefined;
        serviceAccountPrivateKeyId: string | undefined;
        serviceAccountPrivateKey: string | undefined;
        serviceAccountClientEmail: string | undefined;
        serviceAccountClientId: string | undefined;
        serviceAccountAuthUri: string | undefined;
        serviceAccountTokenUri: string | undefined;
        serviceAccountAuthProviderX509CertUrl: string | undefined;
        serviceAccountClientX509CertUrl: string | undefined;
        serviceAccountUniverseDomain: string | undefined;
    };
    email: {
        smtpHost: string;
        smtpPort: number;
        smtpUser: string;
        smtpPass: string;
    };
    storage: {
        uploadPath: string;
    };
    cloudinary: {
        cloudName: string | undefined;
        apiKey: string | undefined;
        apiSecret: string | undefined;
        uploadFolder: string;
    };
    app: {
        jwtSecret: string;
        defaultTimezone: string;
        defaultReminders: string[];
        kpiScoring: {
            assignee: {
                early: number;
                ontime: number;
                late: number;
                streakBonus: number;
            };
            creator: {
                completion: number;
                ontimeBonus: number;
            };
            penalty: {
                overdue7Days: number;
            };
            weights: {
                onTimeDelivery: number;
                createdCompleted: number;
                consistencyBonus: number;
            };
        };
        workingHours: {
            start: string;
            end: string;
        };
    };
};
export declare const validateConfig: () => void;
export declare const features: {
    lineEnabled: boolean;
    googleCalendar: boolean;
    emailNotifications: boolean;
};
//# sourceMappingURL=config.d.ts.map