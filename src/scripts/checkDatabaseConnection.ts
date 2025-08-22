import 'reflect-metadata';
import { AppDataSource } from '@/utils/database';
import { logger } from '@/utils/logger';

export async function checkDatabaseConnection(): Promise<void> {
  try {
    console.log('🔍 Checking database connection...');
    
    // ตรวจสอบ environment variables
    console.log('📋 Environment Variables:');
    console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT_SET');
    console.log('- DB_HOST:', process.env.DB_HOST);
    console.log('- DB_PORT:', process.env.DB_PORT);
    console.log('- DB_USERNAME:', process.env.DB_USERNAME);
    console.log('- DB_NAME:', process.env.DB_NAME);
    console.log('- DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT_SET');
    console.log('');

    // ตรวจสอบ DataSource options
    console.log('⚙️ DataSource Options:');
    console.log('- Type:', AppDataSource.options.type);
    console.log('- Host:', (AppDataSource.options as any).host);
    console.log('- Port:', (AppDataSource.options as any).port);
    console.log('- Database:', (AppDataSource.options as any).database);
    console.log('- Username:', (AppDataSource.options as any).username);
    console.log('- Has Password:', !!(AppDataSource.options as any).password);
    console.log('');

    // ตรวจสอบสถานะการเชื่อมต่อ
    console.log('🔌 Connection Status:');
    console.log('- Is Initialized:', AppDataSource.isInitialized);
    console.log('- Is Connected:', AppDataSource.isInitialized ? 'Checking...' : 'Not initialized');
    console.log('');

    // พยายาม initialize ถ้ายังไม่ได้
    if (!AppDataSource.isInitialized) {
      console.log('🔄 Initializing database connection...');
      await AppDataSource.initialize();
      console.log('✅ Database initialized successfully');
    }

    // ทดสอบการเชื่อมต่อ
    console.log('🧪 Testing database connection...');
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    
    const result = await queryRunner.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Database connection test successful:');
    console.log('- Current Time:', result[0].current_time);
    console.log('- PostgreSQL Version:', result[0].postgres_version);
    
    await queryRunner.release();
    
    console.log('🎉 Database connection is working properly!');

  } catch (error) {
    console.error('❌ Database connection error:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    // ให้ข้อมูลเพิ่มเติมสำหรับการแก้ไขปัญหา
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if DATABASE_URL is correct');
    console.log('2. Verify database credentials');
    console.log('3. Check if database server is running');
    console.log('4. Verify network connectivity');
    console.log('5. Check Railway database status');
    
    throw error;
  }
}

// รัน script ถ้าเรียกโดยตรง
if (require.main === module) {
  checkDatabaseConnection()
    .then(() => {
      console.log('✅ Database check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database check failed:', error);
      process.exit(1);
    });
}
