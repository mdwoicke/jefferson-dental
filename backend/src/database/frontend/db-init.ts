/**
 * Frontend Database Initialization
 * Uses sql.js (SQLite compiled to WebAssembly) with IndexedDB persistence
 */

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

// IndexedDB configuration
const DB_NAME = 'jefferson-dental-db';
const DB_STORE_NAME = 'database';
const DB_KEY = 'sqliteDb';
const DB_VERSION = 1;

// Singleton instance
let sqlInstance: SqlJsStatic | null = null;
let dbInstance: Database | null = null;
let saveTimeout: NodeJS.Timeout | null = null;

// ============================================================================
// INDEXEDDB UTILITIES
// ============================================================================

/**
 * Open IndexedDB connection
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
        db.createObjectStore(DB_STORE_NAME);
      }
    };
  });
}

/**
 * Load database from IndexedDB
 */
async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const db = await openIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_STORE_NAME], 'readonly');
      const store = transaction.objectStore(DB_STORE_NAME);
      const request = store.get(DB_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    return null;
  }
}

/**
 * Save database to IndexedDB
 */
async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  try {
    const db = await openIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(DB_STORE_NAME);
      const request = store.put(data, DB_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
  }
}

/**
 * Clear database from IndexedDB
 */
export async function clearIndexedDB(): Promise<void> {
  try {
    const db = await openIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(DB_STORE_NAME);
      const request = store.delete(DB_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
  }
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Save database with debouncing (avoid excessive saves)
 */
export function scheduleSave(): void {
  if (!dbInstance) return;

  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Schedule save after 5 seconds of inactivity
  saveTimeout = setTimeout(async () => {
    if (dbInstance) {
      const data = dbInstance.export();
      await saveToIndexedDB(data);
      console.log('💾 Database auto-saved to IndexedDB');
    }
  }, 5000);
}

/**
 * Initialize sql.js library
 */
async function initSqlLibrary(): Promise<SqlJsStatic> {
  if (sqlInstance) {
    return sqlInstance;
  }

  console.log('📦 Loading sql.js WASM...');

  try {
    // Load sql.js from CDN
    sqlInstance = await initSqlJs({
      locateFile: (file) => {
        // Use CDN for WASM file
        return `https://sql.js.org/dist/${file}`;
      }
    });

    console.log('✅ sql.js WASM loaded successfully');
    return sqlInstance;
  } catch (error) {
    console.error('❌ Failed to load sql.js:', error);
    throw new Error('Failed to initialize SQL library');
  }
}

/**
 * Load schema SQL from file
 */
async function loadSchemaSQL(): Promise<string> {
  try {
    const response = await fetch('/database/schema.sql');
    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading schema:', error);
    throw error;
  }
}

/**
 * Load seed data SQL from file
 */
async function loadSeedSQL(): Promise<string> {
  try {
    const response = await fetch('/database/seed.sql');
    if (!response.ok) {
      throw new Error(`Failed to fetch seed data: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading seed data:', error);
    throw error;
  }
}

/**
 * Initialize browser database
 * - Loads sql.js WASM
 * - Checks IndexedDB for existing database
 * - If exists: loads from IndexedDB
 * - If new: creates schema and loads seed data
 * - Sets up auto-save
 */
export async function initBrowserDatabase(): Promise<Database> {
  // Return existing instance if already initialized
  if (dbInstance) {
    console.log('♻️ Reusing existing database instance');
    return dbInstance;
  }

  console.log('🚀 Initializing browser database...');

  // Initialize sql.js library
  const SQL = await initSqlLibrary();

  // Try to load existing database from IndexedDB
  const existingData = await loadFromIndexedDB();

  if (existingData) {
    // Load existing database
    console.log('📂 Loading existing database from IndexedDB');
    dbInstance = new SQL.Database(existingData);
    console.log('✅ Database loaded from IndexedDB');
  } else {
    // Create new database
    console.log('🆕 Creating new database');
    dbInstance = new SQL.Database();

    // Load and execute schema
    console.log('📋 Applying schema...');
    const schemaSQL = await loadSchemaSQL();
    dbInstance.exec(schemaSQL);
    console.log('✅ Schema applied');

    // Load and execute seed data
    console.log('🌱 Loading seed data...');
    const seedSQL = await loadSeedSQL();
    dbInstance.exec(seedSQL);
    console.log('✅ Seed data loaded');

    // Save to IndexedDB
    const data = dbInstance.export();
    await saveToIndexedDB(data);
    console.log('💾 Database saved to IndexedDB');
  }

  // Verify database
  const result = dbInstance.exec('SELECT COUNT(*) as count FROM patients');
  const patientCount = result[0]?.values[0]?.[0] || 0;
  console.log(`📊 Database ready with ${patientCount} patients`);

  return dbInstance;
}

/**
 * Get current database instance
 */
export function getDatabase(): Database | null {
  return dbInstance;
}

/**
 * Reset database (clear and reinitialize)
 */
export async function resetDatabase(): Promise<Database> {
  console.log('🔄 Resetting database...');

  // Close existing database
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  // Clear IndexedDB
  await clearIndexedDB();

  // Reinitialize
  return await initBrowserDatabase();
}

/**
 * Export database as file (for download)
 */
export function exportDatabaseFile(): Uint8Array {
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }

  return dbInstance.export();
}

/**
 * Import database from file
 */
export async function importDatabaseFile(data: Uint8Array): Promise<void> {
  if (!sqlInstance) {
    await initSqlLibrary();
  }

  // Close existing database
  if (dbInstance) {
    dbInstance.close();
  }

  // Create new database from imported data
  dbInstance = new sqlInstance!.Database(data);

  // Save to IndexedDB
  await saveToIndexedDB(data);

  console.log('✅ Database imported successfully');
}

/**
 * Manually save database (call after critical operations)
 */
export async function saveDatabase(): Promise<void> {
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }

  const data = dbInstance.export();
  await saveToIndexedDB(data);
  console.log('💾 Database saved manually');
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Close database and cleanup resources
 */
export function closeDatabase(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  if (dbInstance) {
    // Final save before closing
    const data = dbInstance.export();
    saveToIndexedDB(data).then(() => {
      console.log('💾 Final save completed');
    });

    dbInstance.close();
    dbInstance = null;
    console.log('🔒 Database closed');
  }
}

// Auto-save on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    closeDatabase();
  });
}
