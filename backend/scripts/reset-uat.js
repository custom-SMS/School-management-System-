/**
 * UAT Database Reset Script
 * 
 * This script resets the UAT database to a clean state by:
 * 1. Optionally backing up the current state
 * 2. Cleaning all existing data
 * 3. Running seed scripts to populate fresh test data
 * 
 * Usage:
 *   node scripts/reset-uat.js
 *   node scripts/reset-uat.js --backup
 *   node scripts/reset-uat.js --no-backup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const shouldBackup = !args.includes('--no-backup');
const forceBackup = args.includes('--backup');

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function backupDatabase() {
  log('📦 Creating database backup...');
  
  try {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `uat-backup-${timestamp}.sql`);
    
    // Use pg_dump for PostgreSQL backup
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    
    execSync(`pg_dump "${databaseUrl}" > "${backupFile}"`, { stdio: 'inherit' });
    
    log(`✅ Backup created: ${backupFile}`);
    return backupFile;
  } catch (error) {
    log(`⚠️  Backup failed: ${error.message}`);
    if (forceBackup) {
      throw error;
    }
    return null;
  }
}

function clearRedisCache() {
  log('🧹 Clearing Redis cache...');
  
  try {
    const { getRedis } = require('../utils/upstashRedis');
    const redis = getRedis();
    
    // Check if Redis is properly configured
    if (redis.z !== null) {
      // This is a no-op implementation, Redis is not configured
      log('⚠️  Redis not configured, skipping cache clear');
    } else {
      // Real Redis instance - clear all keys
      redis.flushAll().then(() => {
        log('✅ Redis cache cleared');
      }).catch(() => {
        log('⚠️  Failed to clear Redis cache');
      });
    }
  } catch (error) {
    log(`⚠️  Redis cache clear failed: ${error.message}`);
  }
}

async function resetDatabase() {
  log('🔄 Resetting UAT database...');
  
  try {
    // Run the seed script
    execSync('node seeds/uat/index.js', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    log('✅ Database reset completed');
  } catch (error) {
    log(`❌ Database reset failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  log('🚀 Starting UAT database reset process...\n');
  
  try {
    // Step 1: Backup (if enabled)
    let backupFile = null;
    if (shouldBackup || forceBackup) {
      backupFile = backupDatabase();
    }
    
    // Step 2: Clear Redis cache
    clearRedisCache();
    
    // Step 3: Reset database
    await resetDatabase();
    
    log('\n✨ UAT database reset completed successfully!');
    log('\n📝 Next steps:');
    log('  1. Start the backend server: npm run dev');
    log('  2. Start the frontend server: npm run dev (in frontend directory)');
    log('  3. Test with accounts from TESTING_STRATEGY.md');
    
    if (backupFile) {
      log(`\n💾 Backup saved to: ${backupFile}`);
    }
    
  } catch (error) {
    log('\n❌ UAT database reset failed!');
    log(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
