"use strict";
// เลขาบอท - LINE Group Secretary Bot
// Main Entry Point
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
require("module-alias/register");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./utils/config");
const database_1 = require("./utils/database");
const crypto_1 = require("crypto");
const webhookController_1 = require("./controllers/webhookController");
const apiController_1 = require("./controllers/apiController");
const dashboardController_1 = require("./controllers/dashboardController");
const projectController_1 = require("./controllers/projectController");
const fileBackupRoutes_1 = __importDefault(require("./routes/fileBackupRoutes"));
const LineService_1 = require("./services/LineService");
const CronService_1 = require("./services/CronService");
const logger_1 = require("./utils/logger");
const common_1 = require("./utils/common");
const autoMigration_1 = require("./utils/autoMigration");
class Server {
    constructor() {
        this.app = (0, express_1.default)();
        this.configureMiddleware();
        this.configureRoutes();
        this.setupErrorHandling();
    }
    configureMiddleware() {
        // Security middleware with CSP configuration for dashboard
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    // อนุญาต inline event handlers ชั่วคราวให้ dashboard ทำงานได้ (onclick, onmouseover, ...)
                    // ควร refactor เอา inline ออกในภายหลังเพื่อความปลอดภัย
                    scriptSrcAttr: ["'unsafe-inline'"],
                    scriptSrc: [
                        "'self'",
                        "'unsafe-inline'" // Required for inline scripts in dashboard
                    ],
                    // หมายเหตุ: ไม่ตั้ง styleSrcElem แยก เพื่อให้ styleSrc ใช้เป็น fallback ได้
                    styleSrc: [
                        "'self'",
                        "'unsafe-inline'"
                    ],
                    imgSrc: ["'self'", "data:", "https:"],
                    // อนุญาตปลายทางสำหรับ fetch/XHR/Service Worker
                    connectSrc: [
                        "'self'",
                        "https://res.cloudinary.com"
                    ],
                    // อนุญาต Worker สำหรับ PDF.js
                    workerSrc: [
                        "'self'",
                        "blob:"
                    ],
                    fontSrc: [
                        "'self'"
                    ],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'", "blob:", "data:", "https://res.cloudinary.com"],
                    frameSrc: ["'self'", "blob:", "data:", "https://res.cloudinary.com"]
                }
            }
        }));
        this.app.use((0, cors_1.default)());
        // สำหรับ LINE Webhook - ต้องเป็น raw สำหรับ signature validation และไม่ชนกับ body-parser JSON
        // วางไว้ก่อน body parsers อื่นๆ เพื่อกันการ parse ซ้ำ
        this.app.use('/webhook', express_1.default.raw({ type: '*/*' }));
        // Body parsing middleware (เว้นเส้นทาง /webhook ไว้)
        this.app.use((req, res, next) => {
            if (req.path.startsWith('/webhook')) {
                return next();
            }
            return express_1.default.json({ limit: '200mb' })(req, res, () => {
                return express_1.default.urlencoded({ extended: true })(req, res, next);
            });
        });
        // Static files สำหรับ dashboard และ uploads
        const uploadsCandidates = [
            path_1.default.join(__dirname, 'uploads'),
            path_1.default.join(__dirname, '../uploads'),
        ];
        const uploadsDir = uploadsCandidates.find((p) => fs_1.default.existsSync(p)) || uploadsCandidates[0];
        this.app.use('/uploads', express_1.default.static(uploadsDir));
        // Legacy Dashboard static assets (CSS, JS, images)
        const dashboardCandidates = [
            path_1.default.join(__dirname, 'dashboard'),
            path_1.default.join(__dirname, '../dashboard'),
        ];
        const dashboardDir = dashboardCandidates.find((p) => fs_1.default.existsSync(p)) || dashboardCandidates[0];
        this.app.use('/dashboard', express_1.default.static(dashboardDir));
        // New React Dashboard (serve built files)
        const dashboardNewCandidates = [
            path_1.default.join(__dirname, 'dashboard-new/dist'),
            path_1.default.join(__dirname, '../dashboard-new/dist'),
        ];
        const dashboardNewDir = dashboardNewCandidates.find((p) => fs_1.default.existsSync(p)) || dashboardNewCandidates[0];
        this.app.use('/dashboard-new', express_1.default.static(dashboardNewDir));
        // SPA fallback for dashboard-new so deep links and query strings work
        this.app.get(['/dashboard-new', '/dashboard-new/'], (_req, res) => {
            res.sendFile(path_1.default.join(dashboardNewDir, 'index.html'));
        });
        this.app.get('/dashboard-new/*', (_req, res) => {
            res.sendFile(path_1.default.join(dashboardNewDir, 'index.html'));
        });
        // Serve PDF.js from node_modules under same-origin to satisfy CSP
        try {
            // Resolve the directory containing pdf.min.js
            const pdfjsBuildDir = path_1.default.dirname(require.resolve('pdfjs-dist/build/pdf.min.js'));
            this.app.use('/static/pdfjs', express_1.default.static(pdfjsBuildDir));
            logger_1.logger.info('✅ Serving PDF.js assets at /static/pdfjs');
        }
        catch (e) {
            logger_1.logger.warn('⚠️ pdfjs-dist not found; PDF viewer may fallback to native iframe', e);
        }
    }
    configureRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: (0, common_1.getCurrentTime)(),
                version: process.env.npm_package_version || '1.0.0',
                environment: config_1.config.nodeEnv
            });
        });
        // Simple root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                message: 'Leka Bot API is running',
                status: 'ok',
                timestamp: (0, common_1.getCurrentTime)(),
                environment: config_1.config.nodeEnv
            });
        });
        // Migration status check
        this.app.get('/migration-status', async (req, res) => {
            try {
                const needsMigration = await autoMigration_1.autoMigration.checkMigrationNeeded();
                const migrationResults = autoMigration_1.autoMigration.getMigrationResults();
                res.json({
                    status: 'OK',
                    needsMigration,
                    timestamp: (0, common_1.getCurrentTime)(),
                    message: needsMigration ? 'Database needs migration' : 'Database schema is up to date',
                    lastMigrationResults: Object.keys(migrationResults).length > 0 ? migrationResults : null,
                    endpoints: {
                        runMigration: '/api/admin/migrate',
                        checkDatabase: '/api/admin/check-db'
                    }
                });
            }
            catch (error) {
                res.status(500).json({
                    status: 'ERROR',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: (0, common_1.getCurrentTime)(),
                    message: 'Failed to check migration status'
                });
            }
        });
        // Main routes
        this.app.get('/', (req, res) => {
            res.json({
                message: '🤖 เลขาบอท LINE Group Secretary',
                status: 'Running',
                endpoints: {
                    health: '/health',
                    webhook: '/webhook',
                    api: '/api',
                    'project-rules': '/api/project',
                    dashboard: '/dashboard'
                }
            });
        });
        // LINE Webhook (mount เฉพาะเมื่อเปิดใช้ LINE integration)
        if (config_1.features.lineEnabled) {
            this.app.use('/webhook', (0, webhookController_1.createWebhookRouter)());
        }
        else {
            // ให้ตอบกลับอย่างสุภาพเมื่อมีการเรียก /webhook ในโหมด Dashboard-only
            this.app.post('/webhook', (req, res) => {
                res.status(503).json({ error: 'LINE integration disabled (Dashboard-only mode)' });
            });
        }
        // API Routes
        // Lightweight mock API when DB is not connected (dashboard-only)
        this.app.use('/api', (req, res, next) => {
            if (database_1.AppDataSource.isInitialized)
                return next();
            if (!config_1.config.allowDashboardOnly)
                return next();
            // Minimal endpoints used by dashboard-new initial load
            const groupMatch = req.path.match(/^\/groups\/(.+?)(?:\/(.*))?$/);
            if (req.method === 'GET' && groupMatch) {
                const groupId = groupMatch[1];
                const sub = groupMatch[2];
                if (!sub) {
                    return res.json({ id: groupId, lineGroupId: groupId, name: 'Demo Group', memberCount: 0 });
                }
                if (sub === 'tasks') {
                    const now = new Date();
                    const addDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
                    const sample = [
                        { id: (0, crypto_1.randomUUID)(), title: 'Plan sprint', description: 'Prepare next sprint backlog', status: 'new', dueDate: addDays(3), assignees: [] },
                        { id: (0, crypto_1.randomUUID)(), title: 'Fix bugs', description: 'Triage and fix P1 bugs', status: 'in-progress', dueDate: addDays(1), assignees: [] },
                        { id: (0, crypto_1.randomUUID)(), title: 'Release 2.0', description: 'Cut release and notes', status: 'scheduled', dueDate: addDays(7), assignees: [] },
                    ];
                    return res.json({ success: true, data: sample });
                }
                if (sub === 'members') {
                    return res.json({ success: true, members: [] });
                }
                if (sub === 'stats') {
                    return res.json({ success: true, stats: { total: 3, completed: 0 } });
                }
            }
            return next();
        }, apiController_1.apiRouter);
        // Project Rules & Memory Routes
        this.app.use('/api/project', projectController_1.projectRouter);
        // File Backup Routes
        this.app.use('/api/backup', fileBackupRoutes_1.default);
        // Dashboard Routes (ต้องมาหลัง static files)
        this.app.use('/dashboard', dashboardController_1.dashboardRouter);
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.originalUrl} not found`,
                availableRoutes: ['/', '/health', '/webhook', '/api', '/api/project', '/dashboard']
            });
        });
    }
    setupErrorHandling() {
        // Global error handler
        this.app.use((error, req, res, next) => {
            logger_1.logger.error('Global error handler:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: config_1.config.nodeEnv === 'development' ? error.message : 'Something went wrong',
                ...(config_1.config.nodeEnv === 'development' && { stack: error.stack })
            });
        });
        // Graceful shutdown
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
        process.on('SIGINT', this.gracefulShutdown.bind(this));
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception:', error);
            this.gracefulShutdown();
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled Rejection at:', { promise, reason });
        });
    }
    async gracefulShutdown() {
        logger_1.logger.info('Starting graceful shutdown...');
        try {
            // Stop cron jobs
            this.cronService?.stop();
            // Close database connections
            await (0, database_1.closeDatabase)();
            logger_1.logger.info('Graceful shutdown completed');
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
    async start() {
        try {
            // Validate configuration
            (0, config_1.validateConfig)();
            logger_1.logger.info('Configuration validated');
            // Initialize database (allow dashboard-only mode if configured)
            try {
                await (0, database_1.initializeDatabase)();
                logger_1.logger.info('Database connected');
            }
            catch (dbErr) {
                if (config_1.config.allowDashboardOnly) {
                    logger_1.logger.warn('⚠️ Database connection failed, continuing in dashboard-only mode:', dbErr);
                }
                else {
                    throw dbErr;
                }
            }
            // Run auto-migration if needed (non-blocking)
            try {
                const needsMigration = await autoMigration_1.autoMigration.checkMigrationNeeded();
                if (needsMigration) {
                    logger_1.logger.info('🔄 ตรวจพบว่าจำเป็นต้องรัน migration...');
                    // Run comprehensive migration during startup
                    await autoMigration_1.autoMigration.runAutoMigration();
                    logger_1.logger.info('✅ Auto-migration completed during startup');
                }
                else {
                    logger_1.logger.info('✅ Database schema ครบถ้วน ไม่ต้องรัน migration');
                }
            }
            catch (error) {
                logger_1.logger.warn('⚠️ Auto-migration ล้มเหลว แต่ server จะยังคงทำงานต่อ:', error);
                // Don't fail startup due to migration errors
                logger_1.logger.warn('Server will continue without migration');
            }
            // Initialize LINE service และ Cron jobs (เฉพาะเมื่อเปิดใช้ LINE integration)
            try {
                if (config_1.features.lineEnabled) {
                    // Lazily instantiate only when enabled
                    this.lineService = new LineService_1.LineService();
                    this.cronService = new CronService_1.CronService();
                    await this.lineService.initialize();
                    logger_1.logger.info('LINE service initialized');
                    this.cronService.start();
                    logger_1.logger.info('Cron jobs started');
                }
                else {
                    logger_1.logger.info('Starting in Dashboard-only mode (LINE integration disabled)');
                }
            }
            catch (error) {
                logger_1.logger.warn('⚠️ LINE service initialization failed, continuing in dashboard-only mode:', error);
            }
            // Start server
            const port = config_1.config.port;
            this.app.listen(port, () => {
                logger_1.logger.info('');
                logger_1.logger.info('🚀 เลขาบอท Started Successfully!');
                logger_1.logger.info('====================================');
                logger_1.logger.info(`📡 Server running on port: ${port}`);
                logger_1.logger.info(`🌐 Base URL: ${config_1.config.baseUrl}`);
                logger_1.logger.info(`🔧 Environment: ${config_1.config.nodeEnv}`);
                logger_1.logger.info(`📱 LINE Bot ready to receive webhooks`);
                logger_1.logger.info(`📊 Dashboard available at: ${config_1.config.baseUrl}/dashboard`);
                logger_1.logger.info('====================================');
                logger_1.logger.info('');
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }
}
// Start the server
const server = new Server();
server.start().catch((error) => {
    logger_1.logger.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map