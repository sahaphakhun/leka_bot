// Entry Point สำหรับ Leka Bot Application

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateConfig } from '@/utils/config';
import { initializeDatabase, closeDatabase } from '@/utils/database';
import { LineService } from '@/services/LineService';
import { CronService } from '@/services/CronService';

// Import Routes
import { webhookRouter } from '@/controllers/webhookController';
import { apiRouter } from '@/controllers/apiController';
import { dashboardRouter } from '@/controllers/dashboardController';

class LekaBot {
  private app: express.Application;
  private lineService: LineService;
  private cronService: CronService;

  constructor() {
    this.app = express();
    this.lineService = new LineService();
    this.cronService = new CronService();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? [config.baseUrl, /\.railway\.app$/] 
        : true,
      credentials: true,
    }));

    // Body parsing middleware
    this.app.use('/webhook', express.raw({ type: 'application/json' }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Static file serving
    this.app.use('/uploads', express.static('uploads'));
    this.app.use('/dashboard', express.static('dashboard/dist'));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.nodeEnv
      });
    });

    // LINE Webhook
    this.app.use('/webhook', webhookRouter);

    // API Routes
    this.app.use('/api', apiRouter);

    // Dashboard Routes  
    this.app.use('/dashboard', dashboardRouter);

    // Default route - redirect to dashboard
    this.app.get('/', (req, res) => {
      res.redirect('/dashboard');
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ 
        error: 'Not Found',
        message: 'The requested resource was not found.'
      });
    });
  }

  private setupErrorHandler(): void {
    // Global error handler
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ Unhandled error:', err);
      
      if (res.headersSent) {
        return next(err);
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: config.nodeEnv === 'development' ? err.message : 'Something went wrong'
      });
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Stop cron jobs
        this.cronService.stop();
        console.log('✅ Cron jobs stopped');

        // Close database connection
        await closeDatabase();
        
        // Close server
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();

      // Initialize database
      await initializeDatabase();

      // Setup Express application
      this.setupMiddleware();
      this.setupRoutes();
      this.setupErrorHandler();
      this.setupGracefulShutdown();

      // Initialize services
      await this.lineService.initialize();
      console.log('✅ LINE Bot service initialized');

      // Start cron jobs
      this.cronService.start();
      console.log('✅ Cron jobs started');

      // Start server
      const server = this.app.listen(config.port, () => {
        console.log(`🚀 Leka Bot is running on port ${config.port}`);
        console.log(`🌐 Environment: ${config.nodeEnv}`);
        console.log(`📱 LINE Bot ready to receive webhooks`);
        console.log(`📊 Dashboard available at: ${config.baseUrl}/dashboard`);
      });

      // Set server timeout for long-running requests
      server.timeout = 30000; // 30 seconds

    } catch (error) {
      console.error('❌ Failed to start Leka Bot:', error);
      process.exit(1);
    }
  }
}

// Start the application
const lekaBot = new LekaBot();
lekaBot.start().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});