// เลขาบอท - LINE Group Secretary Bot
// Main Entry Point

import 'module-alias/register';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config, validateConfig } from './utils/config';
import { initializeDatabase, closeDatabase } from './utils/database';
import { webhookRouter } from './controllers/webhookController';
import { apiRouter } from './controllers/apiController';
import { dashboardRouter } from './controllers/dashboardController';
import { LineService } from './services/LineService';
import { CronService } from './services/CronService';

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
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // สำหรับ LINE Webhook - ต้องเป็น raw สำหรับ signature validation
    this.app.use('/webhook', express.raw({ type: 'application/json' }));

    // Static files สำหรับ dashboard และ uploads
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    this.app.use('/dashboard/assets', express.static(path.join(__dirname, '../dashboard')));
  }

  private configureRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.nodeEnv
      });
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
          dashboard: '/dashboard'
        }
      });
    });

    // LINE Webhook
    this.app.use('/webhook', webhookRouter);

    // API Routes
    this.app.use('/api', apiRouter);

    // Dashboard Routes
    this.app.use('/dashboard', dashboardRouter);

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        availableRoutes: ['/', '/health', '/webhook', '/api', '/dashboard']
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: any) => {
      console.error('❌ Global error handler:', error);
      
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
      console.error('❌ Uncaught Exception:', error);
      this.gracefulShutdown();
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  private async gracefulShutdown(): Promise<void> {
    console.log('🔄 Starting graceful shutdown...');
    try {
      // Stop cron jobs
      this.cronService.stop();
      
      // Close database connections
      await closeDatabase();
      
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();
      console.log('✅ Configuration validated');

      // Initialize database
      await initializeDatabase();
      console.log('✅ Database connected');

      // Initialize LINE service
      await this.lineService.initialize();
      console.log('✅ LINE service initialized');

      // Start cron jobs
      this.cronService.start();
      console.log('✅ Cron jobs started');

      // Start server
      const port = config.port;
      this.app.listen(port, () => {
        console.log('');
        console.log('🚀 เลขาบอท Started Successfully!');
        console.log('====================================');
        console.log(`📡 Server running on port: ${port}`);
        console.log(`🌐 Base URL: ${config.baseUrl}`);
        console.log(`🔧 Environment: ${config.nodeEnv}`);
        console.log(`📱 LINE Bot ready to receive webhooks`);
        console.log(`📊 Dashboard available at: ${config.baseUrl}/dashboard`);
        console.log('====================================');
        console.log('');
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new Server();
server.start().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});