export declare class ServiceContainer {
    private static instance;
    private services;
    private constructor();
    static getInstance(): ServiceContainer;
    /**
     * ได้ service instance
     */
    get<T>(serviceName: string): T;
    /**
     * สร้าง service instance
     */
    private createService;
    /**
     * ล้าง service cache
     */
    clear(): void;
    /**
     * ตรวจสอบว่า service มีอยู่หรือไม่
     */
    has(serviceName: string): boolean;
    /**
     * ลบ service ออกจาก cache
     */
    remove(serviceName: string): boolean;
}
export declare const serviceContainer: ServiceContainer;
//# sourceMappingURL=serviceContainer.d.ts.map