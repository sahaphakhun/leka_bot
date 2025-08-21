#!/usr/bin/env ts-node

// Database Migration Runner
// Usage: npm run migrate

import { DataSource } from 'typeorm';
import { config } from '../utils/config';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('🚀 Starting database migration...');

  // Create database connection
  const dataSource = new DataSource({
    type: 'postgres',
    url: config.database.url,
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.name,
    ssl: config.database.url ? { rejectUnauthorized: false } : false,
    logging: true
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/add-attachment-type.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL commands (handle multiple statements)
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Found ${commands.length} SQL commands to execute`);

    // Execute each command
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.toLowerCase().includes('select')) {
        // For SELECT statements, show results
        console.log(`\n🔍 Executing query ${i + 1}:`);
        const result = await dataSource.query(command);
        console.table(result);
      } else {
        // For DDL statements, just execute
        console.log(`\n⚡ Executing command ${i + 1}: ${command.substring(0, 50)}...`);
        await dataSource.query(command);
        console.log('✅ Command executed successfully');
      }
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration().catch(console.error);
}

export { runMigration };
