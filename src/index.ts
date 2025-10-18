// เลขาบอท - LINE Group Secretary Bot
// Main Entry Point

import "reflect-metadata";
import "module-alias/register";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { config, validateConfig, features } from "./utils/config";
import {
  initializeDatabase,
  closeDatabase,
  AppDataSource,
} from "./utils/database";
import { randomUUID } from "crypto";
import { createWebhookRouter } from "./controllers/webhookController";
import { apiRouter } from "./controllers/apiController";
import { dashboardRouter } from "./controllers/dashboardController";
import { projectRouter } from "./controllers/projectController";
import fileBackupRouter from "./routes/fileBackupRoutes";
import { LineService } from "./services/LineService";
import { CronService } from "./services/CronService";
import { logger } from "./utils/logger";
import { getCurrentTime } from "./utils/common";
import { autoMigration } from "./utils/autoMigration";

class Server {
  private app: Application;
  private lineService?: LineService;
  private cronService?: CronService;

  constructor() {
    this.app = express();

    this.configureMiddleware();
    this.configureRoutes();
    this.setupErrorHandling();
  }

  private configureMiddleware(): void {
    // Security middleware with CSP configuration for dashboard
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            // อนุญาต inline event handlers ชั่วคราวให้ dashboard ทำงานได้ (onclick, onmouseover, ...)
            // ควร refactor เอา inline ออกในภายหลังเพื่อความปลอดภัย
            scriptSrcAttr: ["'unsafe-inline'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'", // Required for inline scripts in dashboard
            ],
            // หมายเหตุ: ไม่ตั้ง styleSrcElem แยก เพื่อให้ styleSrc ใช้เป็น fallback ได้
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            // อนุญาตปลายทางสำหรับ fetch/XHR/Service Worker
            connectSrc: ["'self'", "https://res.cloudinary.com"],
            // อนุญาต Worker สำหรับ PDF.js
            workerSrc: ["'self'", "blob:"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: [
              "'self'",
              "blob:",
              "data:",
              "https://res.cloudinary.com",
            ],
            frameSrc: [
              "'self'",
              "blob:",
              "data:",
              "https://res.cloudinary.com",
            ],
          },
        },
      }),
    );
    // CORS configuration - รองรับทั้ง dashboard เก่าและใหม่
    this.app.use(
      cors({
        origin: function (origin, callback) {
          // Allow requests with no origin (like mobile apps, Postman, curl)
          if (!origin) return callback(null, true);

          // Allow all origins in development
          if (config.nodeEnv === "development") {
            return callback(null, true);
          }

          // Allow specific origins in production
          const allowedOrigins = [
            "https://lekabot-production.up.railway.app",
            "http://localhost:5173",
            "http://localhost:3000",
          ];

          if (
            allowedOrigins.indexOf(origin) !== -1 ||
            origin.includes("railway.app")
          ) {
            callback(null, true);
          } else {
            callback(null, true); // ยังคงอนุญาตเพื่อไม่ให้เกิดปัญหา
          }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        exposedHeaders: ["Content-Range", "X-Content-Range"],
        maxAge: 86400, // 24 hours
      }),
    );

    // สำหรับ LINE Webhook - ต้องเป็น raw สำหรับ signature validation และไม่ชนกับ body-parser JSON
    // วางไว้ก่อน body parsers อื่นๆ เพื่อกันการ parse ซ้ำ
    this.app.use("/webhook", express.raw({ type: "*/*" }));

    // Body parsing middleware (เว้นเส้นทาง /webhook ไว้)
    this.app.use((req, res, next) => {
      if (req.path.startsWith("/webhook")) {
        return next();
      }
      return express.json({ limit: "200mb" })(req, res, () => {
        return express.urlencoded({ extended: true })(req, res, next);
      });
    });

    // Static files สำหรับ dashboard และ uploads
    const uploadsCandidates = [
      path.join(__dirname, "uploads"),
      path.join(__dirname, "../uploads"),
    ];
    const uploadsDir =
      uploadsCandidates.find((p) => fs.existsSync(p)) || uploadsCandidates[0];
    this.app.use("/uploads", express.static(uploadsDir));

    // Legacy Dashboard static assets (CSS, JS, images)
    const dashboardCandidates = [
      path.join(__dirname, "dashboard"),
      path.join(__dirname, "../dashboard"),
    ];
    const dashboardDir =
      dashboardCandidates.find((p) => fs.existsSync(p)) ||
      dashboardCandidates[0];
    this.app.use("/dashboard", express.static(dashboardDir));

    // New React Dashboard (serve built files)
    const dashboardNewCandidates = [
      path.join(__dirname, "dashboard-new/dist"),
      path.join(__dirname, "../dashboard-new/dist"),
    ];
    const dashboardNewDir =
      dashboardNewCandidates.find((p) => fs.existsSync(p)) ||
      dashboardNewCandidates[0];
    this.app.use("/dashboard-new", express.static(dashboardNewDir));
    // SPA fallback for dashboard-new so deep links and query strings work
    this.app.get(
      ["/dashboard-new", "/dashboard-new/"],
      (_req: Request, res: Response) => {
        res.sendFile(path.join(dashboardNewDir, "index.html"));
      },
    );
    this.app.get("/dashboard-new/*", (_req: Request, res: Response) => {
      res.sendFile(path.join(dashboardNewDir, "index.html"));
    });

    // Serve PDF.js from node_modules under same-origin to satisfy CSP
    try {
      // Resolve the directory containing pdf.min.js
      const pdfjsBuildDir = path.dirname(
        require.resolve("pdfjs-dist/build/pdf.min.js"),
      );
      this.app.use("/static/pdfjs", express.static(pdfjsBuildDir));
      logger.info("✅ Serving PDF.js assets at /static/pdfjs");
    } catch (e) {
      logger.warn(
        "⚠️ pdfjs-dist not found; PDF viewer may fallback to native iframe",
        e,
      );
    }
  }

  private configureRoutes(): void {
    // Health check
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({
        status: "OK",
        timestamp: getCurrentTime(),
        version: process.env.npm_package_version || "1.0.0",
        environment: config.nodeEnv,
      });
    });

    // Simple root endpoint
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        message: "Leka Bot API is running",
        status: "ok",
        timestamp: getCurrentTime(),
        environment: config.nodeEnv,
      });
    });

    // Migration status check
    this.app.get("/migration-status", async (req: Request, res: Response) => {
      try {
        const needsMigration = await autoMigration.checkMigrationNeeded();
        const migrationResults = autoMigration.getMigrationResults();

        res.json({
          status: "OK",
          needsMigration,
          timestamp: getCurrentTime(),
          message: needsMigration
            ? "Database needs migration"
            : "Database schema is up to date",
          lastMigrationResults:
            Object.keys(migrationResults).length > 0 ? migrationResults : null,
          endpoints: {
            runMigration: "/api/admin/migrate",
            checkDatabase: "/api/admin/check-db",
          },
        });
      } catch (error) {
        res.status(500).json({
          status: "ERROR",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: getCurrentTime(),
          message: "Failed to check migration status",
        });
      }
    });

    // Main routes
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        message: "🤖 เลขาบอท LINE Group Secretary",
        status: "Running",
        endpoints: {
          health: "/health",
          webhook: "/webhook",
          api: "/api",
          "project-rules": "/api/project",
          dashboard: "/dashboard",
        },
      });
    });

    // LINE Webhook (mount เฉพาะเมื่อเปิดใช้ LINE integration)
    if (features.lineEnabled) {
      this.app.use("/webhook", createWebhookRouter());
    } else {
      // ให้ตอบกลับอย่างสุภาพเมื่อมีการเรียก /webhook ในโหมด Dashboard-only
      this.app.post("/webhook", (req: Request, res: Response) => {
        res
          .status(503)
          .json({ error: "LINE integration disabled (Dashboard-only mode)" });
      });
    }

    // API Routes
    // Lightweight mock API when DB is not connected (dashboard-only)
    this.app.use(
      "/api",
      (req: Request, res: Response, next) => {
        if (AppDataSource.isInitialized) return next();
        if (!config.allowDashboardOnly) return next();

        // Minimal endpoints used by dashboard-new initial load
        const groupMatch = req.path.match(/^\/groups\/(.+?)(?:\/(.*))?$/);
        if (req.method === "GET" && groupMatch) {
          const groupId = groupMatch[1];
          const sub = groupMatch[2];

          if (!sub) {
            return res.json({
              id: groupId,
              lineGroupId: groupId,
              name: "Demo Group",
              memberCount: 0,
            });
          }
          if (sub === "tasks") {
            const now = new Date();
            const addDays = (d: number) =>
              new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
            const sample = [
              {
                id: randomUUID(),
                title: "Plan sprint",
                description: "Prepare next sprint backlog",
                status: "new",
                dueDate: addDays(3),
                assignees: [],
              },
              {
                id: randomUUID(),
                title: "Fix bugs",
                description: "Triage and fix P1 bugs",
                status: "in-progress",
                dueDate: addDays(1),
                assignees: [],
              },
              {
                id: randomUUID(),
                title: "Release 2.0",
                description: "Cut release and notes",
                status: "scheduled",
                dueDate: addDays(7),
                assignees: [],
              },
            ];
            return res.json({ success: true, data: sample });
          }
          if (sub === "members") {
            return res.json({ success: true, members: [] });
          }
          if (sub === "stats") {
            return res.json({
              success: true,
              stats: { total: 3, completed: 0 },
            });
          }
        }
        return next();
      },
      apiRouter,
    );

    // Project Rules & Memory Routes
    this.app.use("/api/project", projectRouter);

    // File Backup Routes
    this.app.use("/api/backup", fileBackupRouter);

    // Dashboard Routes (ต้องมาหลัง static files)
    this.app.use("/dashboard", dashboardRouter);

    // 404 handler
    this.app.use("*", (req: Request, res: Response) => {
      res.status(404).json({
        error: "Not Found",
        message: `Route ${req.originalUrl} not found`,
        availableRoutes: [
          "/",
          "/health",
          "/webhook",
          "/api",
          "/api/project",
          "/dashboard",
        ],
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: any) => {
      logger.error("Global error handler:", error);

      res.status(500).json({
        error: "Internal Server Error",
        message:
          config.nodeEnv === "development"
            ? error.message
            : "Something went wrong",
        ...(config.nodeEnv === "development" && { stack: error.stack }),
      });
    });

    // Graceful shutdown
    process.on("SIGTERM", this.gracefulShutdown.bind(this));
    process.on("SIGINT", this.gracefulShutdown.bind(this));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error: Error) => {
      logger.error("Uncaught Exception:", error);
      this.gracefulShutdown();
    });

    process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
      logger.error("Unhandled Rejection at:", { promise, reason });
    });
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info("Starting graceful shutdown...");
    try {
      // Stop cron jobs
      this.cronService?.stop();

      // Close database connections
      await closeDatabase();

      logger.info("Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown:", error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();
      logger.info("Configuration validated");

      // Initialize database (allow dashboard-only mode if configured)
      try {
        await initializeDatabase();
        logger.info("Database connected");
      } catch (dbErr) {
        if (config.allowDashboardOnly) {
          logger.warn(
            "⚠️ Database connection failed, continuing in dashboard-only mode:",
            dbErr,
          );
        } else {
          throw dbErr;
        }
      }

      // Run auto-migration if needed (non-blocking)
      try {
        const needsMigration = await autoMigration.checkMigrationNeeded();
        if (needsMigration) {
          logger.info("🔄 ตรวจพบว่าจำเป็นต้องรัน migration...");

          // Run comprehensive migration during startup
          await autoMigration.runAutoMigration();
          logger.info("✅ Auto-migration completed during startup");
        } else {
          logger.info("✅ Database schema ครบถ้วน ไม่ต้องรัน migration");
        }
      } catch (error) {
        logger.warn(
          "⚠️ Auto-migration ล้มเหลว แต่ server จะยังคงทำงานต่อ:",
          error,
        );
        // Don't fail startup due to migration errors
        logger.warn("Server will continue without migration");
      }

      // Initialize LINE service และ Cron jobs (เฉพาะเมื่อเปิดใช้ LINE integration)
      try {
        if (features.lineEnabled) {
          // Lazily instantiate only when enabled
          this.lineService = new LineService();
          this.cronService = new CronService();

          await this.lineService.initialize();
          logger.info("LINE service initialized");
          this.cronService.start();
          logger.info("Cron jobs started");
        } else {
          logger.info(
            "Starting in Dashboard-only mode (LINE integration disabled)",
          );
        }
      } catch (error) {
        logger.warn(
          "⚠️ LINE service initialization failed, continuing in dashboard-only mode:",
          error,
        );
      }

      // Start server
      const port = config.port;
      this.app.listen(port, () => {
        logger.info("");
        logger.info("🚀 เลขาบอท Started Successfully!");
        logger.info("====================================");
        logger.info(`📡 Server running on port: ${port}`);
        logger.info(`🌐 Base URL: ${config.baseUrl}`);
        logger.info(`🔧 Environment: ${config.nodeEnv}`);
        logger.info(`📱 LINE Bot ready to receive webhooks`);
        logger.info(`📊 Dashboard available at: ${config.baseUrl}/dashboard`);
        logger.info("====================================");
        logger.info("");
      });
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new Server();
server.start().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
