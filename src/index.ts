// เลขาบอท - LINE Group Secretary Bot
// Main Entry Point

import 'reflect-metadata';
import 'module-alias/register';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config, validateConfig, features } from './utils/config';
import { initializeDatabase, closeDatabase } from './utils/database';
import { webhookRouter } from './controllers/webhookController';
import { apiRouter } from './controllers/apiController';
import { dashboardRouter } from './controllers/dashboardController';
import { projectRouter } from './controllers/projectController';
import { LineService } from './services/LineService';
import { CronService } from './services/CronService';
import { logger } from './utils/logger';
import { getCurrentTime } from './utils/common';
import { autoMigration } from './utils/autoMigration';

class Server {
  private app: Application;
  private lineService: LineService;
  private cronService: CronService;

  constructor() {
    this.app = express();
    this.lineService = new LineService();
    this.cronService = new CronService();
    
    this.configureMiddleware();
    this.configureRoutes();
    this.setupErrorHandling();
  }

  private configureMiddleware(): void {
    // Security middleware with CSP configuration for dashboard
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // อนุญาต inline event handlers ชั่วคราวให้ dashboard ทำงานได้ (onclick, onmouseover, ...)
          // ควร refactor เอา inline ออกในภายหลังเพื่อความปลอดภัย
          scriptSrcAttr: ["'unsafe-inline'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for inline scripts in dashboard
            "https://cdnjs.cloudflare.com" // Allow moment.js from CDN
          ],
          styleSrc: [
            "'self'", 
            "'unsafe-inline'",
            "https://fonts.googleapis.com", // Allow Google Fonts
            "https://cdnjs.cloudflare.com" // Allow Font Awesome
          ],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://res.cloudinary.com"],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com", // Allow Google Fonts
            "https://cdnjs.cloudflare.com" // Allow Font Awesome fonts
          ],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'", "blob:", "data:", "https://res.cloudinary.com"],
          frameSrc: ["'self'", "blob:", "data:", "https://res.cloudinary.com"]
        }
      }
    }));
    this.app.use(cors());

    // สำหรับ LINE Webhook - ต้องเป็น raw สำหรับ signature validation และไม่ชนกับ body-parser JSON
    // วางไว้ก่อน body parsers อื่นๆ เพื่อกันการ parse ซ้ำ
    this.app.use('/webhook', express.raw({ type: '*/*' }));

    // Body parsing middleware (เว้นเส้นทาง /webhook ไว้)
    this.app.use((req, res, next) => {
      if (req.path.startsWith('/webhook')) {
        return next();
      }
      return express.json({ limit: '10mb' })(req, res, () => {
        return express.urlencoded({ extended: true })(req, res, next);
      });
    });

    // Static files สำหรับ dashboard และ uploads
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    
    // Dashboard static assets (CSS, JS, images)  
    this.app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));
  }

  private configureRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'OK',
        timestamp: getCurrentTime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.nodeEnv
      });
    });

    // Migration status check
    this.app.get('/migration-status', async (req: Request, res: Response) => {
      try {
        const needsMigration = await autoMigration.checkMigrationNeeded();
        res.json({
          status: 'OK',
          needsMigration,
          timestamp: getCurrentTime(),
          message: needsMigration ? 'Database needs migration' : 'Database schema is up to date'
        });
      } catch (error) {
        res.status(500).json({
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: getCurrentTime()
        });
      }
    });

    // Main routes
    this.app.get('/', (req: Request, res: Response) => {
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
    if (features.lineEnabled) {
      this.app.use('/webhook', webhookRouter);
    } else {
      // ให้ตอบกลับอย่างสุภาพเมื่อมีการเรียก /webhook ในโหมด Dashboard-only
      this.app.post('/webhook', (req: Request, res: Response) => {
        res.status(503).json({ error: 'LINE integration disabled (Dashboard-only mode)' });
      });
    }

    // API Routes
    this.app.use('/api', apiRouter);

    // Project Rules & Memory Routes
    this.app.use('/api/project', projectRouter);

    // Dashboard Routes (ต้องมาหลัง static files)
    this.app.use('/dashboard', dashboardRouter);

    // Favicon route (avoid 404 noise if not provided)
    this.app.get('/favicon.ico', (req: Request, res: Response) => {
      try {
        const favPath = path.join(__dirname, '../dashboard/favicon.ico');
        res.sendFile(favPath, (err) => {
          if (err) {
            // If no favicon file exists, return 204 No Content to silence browser errors
            res.status(204).end();
          }
        });
      } catch {
        res.status(204).end();
      }
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        availableRoutes: ['/', '/health', '/webhook', '/api', '/api/project', '/dashboard']
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: any) => {
      logger.error('Global error handler:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: config.nodeEnv === 'development' ? error.message : 'Something went wrong',
        ...(config.nodeEnv === 'development' && { stack: error.stack })
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown();
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Rejection at:', { promise, reason });
    });
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Starting graceful shutdown...');
    try {
      // Stop cron jobs
      this.cronService.stop();
      
      // Close database connections
      await closeDatabase();
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();
      logger.info('Configuration validated');

      // Initialize database
      await initializeDatabase();
      logger.info('Database connected');

      // Run auto-migration if needed
      try {
        const needsMigration = await autoMigration.checkMigrationNeeded();
        if (needsMigration) {
          logger.info('🔄 ตรวจพบว่าจำเป็นต้องรัน migration...');
          await autoMigration.runAutoMigration();
        } else {
          logger.info('✅ Database schema ครบถ้วน ไม่ต้องรัน migration');
        }
      } catch (error) {
        logger.warn('⚠️ Auto-migration ล้มเหลว แต่ server จะยังคงทำงานต่อ:', error);
      }

      // Initialize LINE service และ Cron jobs (เฉพาะเมื่อเปิดใช้ LINE integration)
      if (features.lineEnabled) {
        await this.lineService.initialize();
        logger.info('LINE service initialized');
        this.cronService.start();
        logger.info('Cron jobs started');
      } else {
        logger.info('Starting in Dashboard-only mode (LINE integration disabled)');
      }

      // Start server
      const port = config.port;
      this.app.listen(port, () => {
        logger.info('');
        logger.info('🚀 เลขาบอท Started Successfully!');
        logger.info('====================================');
        logger.info(`📡 Server running on port: ${port}`);
        logger.info(`🌐 Base URL: ${config.baseUrl}`);
        logger.info(`🔧 Environment: ${config.nodeEnv}`);
        logger.info(`📱 LINE Bot ready to receive webhooks`);
        logger.info(`📊 Dashboard available at: ${config.baseUrl}/dashboard`);
        logger.info('====================================');
        logger.info('');
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new Server();
server.start().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
