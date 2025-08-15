// Configuration และ Environment Variables

import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://lekabot-production.up.railway.app' : `http://localhost:${process.env.PORT || '3000'}`),
  allowDashboardOnly: process.env.ALLOW_DASHBOARD_ONLY === 'true' || (process.env.NODE_ENV !== 'production'),
  
  // LINE Configuration
  line: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
    channelSecret: process.env.LINE_CHANNEL_SECRET!,
    botUserId: process.env.LINE_BOT_USER_ID, // Optional - บอท user ID สำหรับตรวจจับ mention
    loginChannelId: process.env.LINE_LOGIN_CHANNEL_ID,
    loginChannelSecret: process.env.LINE_LOGIN_CHANNEL_SECRET,
  },
  
  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'leka_bot',
  },
  
  // Google Services
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  },
  
  // Email Configuration
  email: {
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER!,
    smtpPass: process.env.SMTP_PASS!,
  },
  
  // File Storage
  storage: {
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },
  
  // Cloudinary (optional)
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    uploadFolder: process.env.CLOUDINARY_FOLDER || 'leka-uploads'
  },
  
  // Application Settings
  app: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Asia/Bangkok',
    
    // Default reminder intervals (in ISO 8601 duration format)
    // ปรับตาม requirement: เตือนก่อนถึงกำหนด 1 วัน
    defaultReminders: ['P1D'],
    
    // KPI Scoring
    kpiScoring: {
      early: 2,     // เสร็จก่อนกำหนด ≥ 24 ชม.
      ontime: 1,    // ตรงเวลา ± 24 ชม.
      late: -1,     // ล่าช้า 24-48 ชม.
      overtime: -2, // ค้างนาน > 48 ชม.
    },
    
    // Working hours (24-hour format)
    workingHours: {
      start: '09:00',
      end: '18:00',
    },
  },
};

// Validation
// Required variables (Core functionality only)
const requiredEnvVars = [
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_CHANNEL_SECRET',
];

// Optional variables (Features can be disabled if missing)
const optionalEnvVars = [
  'GOOGLE_CLIENT_ID',        // Google Calendar integration
  'GOOGLE_CLIENT_SECRET',    // Google Calendar integration
  'SMTP_USER',              // Email notifications
  'SMTP_PASS',              // Email notifications
];

export const validateConfig = (): void => {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    if (config.allowDashboardOnly) {
      logger.warn('Missing LINE env vars, starting in Dashboard-only mode:', { missing });
    } else {
      logger.error('Missing required environment variables:', { missing });
      process.exit(1);
    }
  }

  // Check optional features
  const missingOptional = optionalEnvVars.filter(key => !process.env[key]);
  if (missingOptional.length > 0) {
    logger.warn('Optional features disabled due to missing variables:', { missingOptional });
    logger.info('The bot will work but some features will be unavailable:');
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      logger.info('   - Google Calendar integration disabled');
    }
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.info('   - Email notifications disabled');
    }
  }
  
  logger.info('Configuration validated successfully');
};

// Feature flags based on environment variables
export const features = {
  lineEnabled: !!(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET),
  googleCalendar: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  emailNotifications: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
};