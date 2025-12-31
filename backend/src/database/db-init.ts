/**
 * Backend Database Initialization
 * Uses better-sqlite3 (native Node.js SQLite) with file-based persistence
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// Database configuration
const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'jefferson-dental.db');
const MIGRATIONS_DIR = path.join(__dirname, '../../../database/migrations');
const SCHEMA_PATH = path.join(__dirname, '../../../database/schema.sql');
const SEED_PATH = path.join(__dirname, '../../../database/seed.sql');

// Singleton instance
let dbInstance: Database.Database | null = null;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Ensure data directory exists
 */
function ensureDataDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 Created data directory:', DATA_DIR);
  }
}

/**
 * Check if database file exists
 */
function databaseExists(): boolean {
  return fs.existsSync(DB_PATH);
}

/**
 * Get current schema version from database
 */
function getCurrentVersion(db: Database.Database): number {
  try {
    const result = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number | null };
    return result.version || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Load SQL file contents
 */
function loadSQLFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Apply migrations to database
 */
function applyMigrations(db: Database.Database): void {
  const currentVersion = getCurrentVersion(db);
  console.log(`📊 Current schema version: ${currentVersion}`);

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('⚠️ Migrations directory not found, skipping migrations');
    return;
  }

  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();

  let migrationsApplied = 0;

  for (const file of migrationFiles) {
    const match = file.match(/migration_(\d+)_/);
    if (!match) continue;

    const version = parseInt(match[1], 10);

    if (version > currentVersion) {
      console.log(`📋 Applying migration ${version}: ${file}`);
      const migrationSQL = loadSQLFile(path.join(MIGRATIONS_DIR, file));

      try {
        db.exec(migrationSQL);
        migrationsApplied++;
        console.log(`✅ Migration ${version} applied successfully`);
      } catch (error) {
        console.error(`❌ Error applying migration ${version}:`, error);
        throw error;
      }
    }
  }

  if (migrationsApplied > 0) {
    console.log(`✅ Applied ${migrationsApplied} migration(s)`);
  } else {
    console.log('✅ Database is up to date');
  }
}

/**
 * Create new database with schema and seed data
 */
function createNewDatabase(db: Database.Database): void {
  console.log('🆕 Creating new database with schema and seed data');

  try {
    console.log('📋 Applying schema...');
    const schemaSQL = loadSQLFile(SCHEMA_PATH);
    db.exec(schemaSQL);
    console.log('✅ Schema applied');

    console.log('🌱 Loading seed data...');
    const seedSQL = loadSQLFile(SEED_PATH);
    db.exec(seedSQL);
    console.log('✅ Seed data loaded');

    const result = db.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number };
    console.log(`📊 Database initialized with ${result.count} patients`);
  } catch (error) {
    console.error('❌ Error creating database:', error);
    throw error;
  }
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize backend database
 * - Ensures data directory exists
 * - Opens/creates SQLite database file
 * - Enables WAL mode for better concurrency
 * - Applies schema and migrations
 * - Loads seed data if new database
 */
export function initBackendDatabase(): Database.Database {
  // Return existing instance if already initialized
  if (dbInstance) {
    console.log('♻️ Reusing existing database instance');
    return dbInstance;
  }

  console.log('🚀 Initializing backend database...');

  // Ensure data directory exists
  ensureDataDirectory();

  // Check if database already exists
  const isNewDatabase = !databaseExists();

  if (isNewDatabase) {
    console.log('🆕 Creating new database at:', DB_PATH);
  } else {
    console.log('📂 Opening existing database at:', DB_PATH);
  }

  // Open database connection
  dbInstance = new Database(DB_PATH, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
  });

  // Enable WAL mode for better concurrency
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  console.log('✅ WAL mode enabled, foreign keys enforced');

  if (isNewDatabase) {
    // Create schema and load seed data
    createNewDatabase(dbInstance);
  } else {
    // Apply any pending migrations
    applyMigrations(dbInstance);

    // Verify database
    const result = dbInstance.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number };
    console.log(`📊 Database ready with ${result.count} patients`);
  }

  return dbInstance;
}

/**
 * Get current database instance
 */
export function getDatabase(): Database.Database | null {
  return dbInstance;
}

/**
 * Reset database (delete file and reinitialize)
 */
export function resetDatabase(): Database.Database {
  console.log('🔄 Resetting database...');

  // Close existing database
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  // Delete database file
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('🗑️ Database file deleted');
  }

  // Delete WAL files
  const walPath = `${DB_PATH}-wal`;
  const shmPath = `${DB_PATH}-shm`;

  if (fs.existsSync(walPath)) {
    fs.unlinkSync(walPath);
  }

  if (fs.existsSync(shmPath)) {
    fs.unlinkSync(shmPath);
  }

  // Reinitialize
  return initBackendDatabase();
}

/**
 * Export database as file (for download)
 */
export function exportDatabaseFile(): Buffer {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error('Database file does not exist');
  }

  return fs.readFileSync(DB_PATH);
}

/**
 * Import database from file
 */
export function importDatabaseFile(data: Buffer): void {
  // Close existing database
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  // Ensure data directory exists
  ensureDataDirectory();

  // Write new database file
  fs.writeFileSync(DB_PATH, data);

  // Reinitialize
  dbInstance = initBackendDatabase();

  console.log('✅ Database imported successfully');
}

/**
 * Backup database to file
 */
export function backupDatabase(backupPath: string): void {
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }

  // Use better-sqlite3's backup API
  dbInstance.backup(backupPath);

  console.log(`💾 Database backed up to: ${backupPath}`);
}

/**
 * Vacuum database (optimize file size)
 */
export function vacuumDatabase(): void {
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }

  console.log('🧹 Vacuuming database...');
  dbInstance.exec('VACUUM');
  console.log('✅ Database vacuumed');
}

/**
 * Get database file size
 */
export function getDatabaseSize(): { bytes: number; readable: string } {
  if (!fs.existsSync(DB_PATH)) {
    return { bytes: 0, readable: '0 B' };
  }

  const stats = fs.statSync(DB_PATH);
  const bytes = stats.size;

  let readable: string;
  if (bytes < 1024) {
    readable = `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    readable = `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    readable = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    readable = `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  return { bytes, readable };
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Close database and cleanup resources
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('🔒 Database closed');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📴 Shutting down gracefully...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📴 Shutting down gracefully...');
  closeDatabase();
  process.exit(0);
});
