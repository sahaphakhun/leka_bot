// Debug Middleware - สำหรับ logging requests และ responses

import { Request, Response, NextFunction } from 'express';

export const debugMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log incoming request
  console.log(`🌐 [REQUEST] ${req.method} ${req.path}`);
  console.log(`📍 [REQUEST] From: ${req.ip}`);
  console.log(`🕐 [REQUEST] Time: ${new Date().toISOString()}`);
  
  // Log headers (กรองเฉพาะที่สำคัญ)
  const importantHeaders = {
    'user-agent': req.headers['user-agent'],
    'content-type': req.headers['content-type'],
    'x-line-signature': req.headers['x-line-signature'],
    'content-length': req.headers['content-length']
  };
  
  console.log(`📋 [REQUEST] Headers:`, importantHeaders);
  
  // Log body สำหรับ POST requests (แต่ไม่ log sensitive data)
  if (req.method === 'POST' && req.body) {
    if (req.path === '/webhook') {
      console.log(`📦 [REQUEST] Webhook body structure:`, {
        destination: req.body.destination,
        eventsCount: req.body.events?.length || 0,
        eventTypes: req.body.events?.map((e: any) => e.type) || []
      });
    } else {
      console.log(`📦 [REQUEST] Body keys:`, Object.keys(req.body));
    }
  }
  
  // Log query parameters
  if (Object.keys(req.query).length > 0) {
    console.log(`🔍 [REQUEST] Query:`, req.query);
  }
  
  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    
    console.log(`📤 [RESPONSE] ${req.method} ${req.path}`);
    console.log(`⏱️ [RESPONSE] Duration: ${duration}ms`);
    console.log(`📊 [RESPONSE] Status: ${res.statusCode}`);
    
    // Log response body (แต่ไม่ log sensitive data)
    if (res.statusCode >= 400) {
      console.log(`❌ [RESPONSE] Error body:`, body);
    } else if (req.path === '/webhook') {
      console.log(`✅ [RESPONSE] Webhook response:`, body);
    } else {
      console.log(`✅ [RESPONSE] Success (${Object.keys(body || {}).length} keys)`);
    }
    
    return originalJson.call(this, body);
  };
  
  // Log when request finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`🏁 [FINISHED] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    console.log(`---`); // Separator for readability
  });
  
  next();
};

// Middleware สำหรับ log errors
export const errorLogMiddleware = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error(`💥 [ERROR] Unhandled error in ${req.method} ${req.path}`);
  console.error(`🔍 [ERROR] Details:`, {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
    }
  });
  
  next(error);
};

// Helper function สำหรับ log environment info
export const logSystemInfo = (): void => {
  console.log(`🚀 [SYSTEM] Starting เลขาบอท`);
  console.log(`📍 [SYSTEM] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 [SYSTEM] Node.js: ${process.version}`);
  console.log(`💾 [SYSTEM] Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.log(`🕐 [SYSTEM] Started at: ${new Date().toISOString()}`);
  console.log(`📦 [SYSTEM] Process ID: ${process.pid}`);
  
  // Log environment variables (แต่ไม่ log sensitive values)
  const envVars = {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    BASE_URL: process.env.BASE_URL,
    HAS_LINE_TOKEN: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
    HAS_LINE_SECRET: !!process.env.LINE_CHANNEL_SECRET,
    HAS_GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    HAS_GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    HAS_SMTP_USER: !!process.env.SMTP_USER,
    HAS_SMTP_PASS: !!process.env.SMTP_PASS,
    HAS_DATABASE_URL: !!process.env.DATABASE_URL,
  };
  
  console.log(`⚙️ [SYSTEM] Environment check:`, envVars);
  console.log(`===== System Ready =====`);
};