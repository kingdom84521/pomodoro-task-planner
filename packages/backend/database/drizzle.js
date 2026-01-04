/**
 * Drizzle ORM Database Connection
 *
 * This is the unified database entry point that abstracts the underlying database.
 * Services should import from this file and use Drizzle query syntax.
 *
 * Supports:
 * - SQLite (development/testing) - uses better-sqlite3
 * - PostgreSQL (production) - uses pg Pool
 */

import * as schema from './schema.js'

const dbMode = process.env.DB_MODE || 'sqlite'

let db = null
let sqliteInstance = null // Keep reference for cleanup

/**
 * Initialize SQLite database (development mode)
 */
async function createSqliteDb() {
  // Dynamic import - better-sqlite3 only exists in dev environment
  const { drizzle } = await import('drizzle-orm/better-sqlite3')
  const Database = (await import('better-sqlite3')).default

  const dbPath = process.env.SQLITE_PATH || './dev.db'
  console.log(`🔧 Using SQLite database: ${dbPath}`)

  sqliteInstance = new Database(dbPath)

  // Enable WAL mode for better concurrent access
  sqliteInstance.pragma('journal_mode = WAL')

  return drizzle(sqliteInstance, { schema })
}

/**
 * Initialize PostgreSQL database (production mode)
 */
async function createPostgresDb() {
  const { drizzle } = await import('drizzle-orm/node-postgres')
  const { Pool } = await import('pg')

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required for PostgreSQL mode')
  }

  console.log('🔧 Using PostgreSQL database')

  const pool = new Pool({ connectionString })
  return drizzle(pool, { schema })
}

/**
 * Get the database instance
 * This is lazy-initialized on first call
 */
export async function getDb() {
  if (!db) {
    if (dbMode === 'postgresql' || dbMode === 'postgres') {
      db = await createPostgresDb()
    } else {
      db = await createSqliteDb()
    }
  }
  return db
}

/**
 * Initialize database - create tables and seed development data
 */
export async function initDatabase() {
  const database = await getDb()

  if (dbMode === 'postgresql' || dbMode === 'postgres') {
    // For PostgreSQL, create tables if they don't exist
    await createPostgresTables(database)
  } else {
    // For SQLite, we need to create tables manually if they don't exist
    await createSqliteTables()

    // Seed development data if database is empty
    if (process.env.NODE_ENV !== 'production') {
      const { seedDevelopmentData } = await import('./seed.js')
      await seedDevelopmentData(database)
    }
  }

  console.log('✓ Database initialized')
}

/**
 * Create SQLite tables (development only)
 * In production, use Drizzle migrations instead
 */
async function createSqliteTables() {
  if (!sqliteInstance) return

  // Create all tables
  sqliteInstance.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zitadel_sub TEXT UNIQUE,
      email TEXT,
      name TEXT,
      email_verified INTEGER DEFAULT 0,
      settings_data TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Resource groups table
    CREATE TABLE IF NOT EXISTS resource_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      percentage_limit INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Tasks table
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '待處理',
      resource_group_id INTEGER REFERENCES resource_groups(id),
      scheduled_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Work records table
    CREATE TABLE IF NOT EXISTS work_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      task_id INTEGER REFERENCES tasks(id),
      task_name TEXT NOT NULL,
      duration INTEGER NOT NULL,
      resource_group_id INTEGER REFERENCES resource_groups(id),
      completed_at INTEGER NOT NULL,
      created_at INTEGER
    );

    -- Routine tasks table
    CREATE TABLE IF NOT EXISTS routine_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      resource_group_id INTEGER REFERENCES resource_groups(id),
      recurrence_rule TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      starts_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Routine task instances table
    CREATE TABLE IF NOT EXISTS routine_task_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_task_id INTEGER NOT NULL REFERENCES routine_tasks(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      scheduled_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      scheduled_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER
    );

    -- Meetings table
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      meeting_type TEXT NOT NULL,
      recurrence_rule TEXT,
      scheduled_time TEXT NOT NULL,
      scheduled_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );

    -- Meeting instances table
    CREATE TABLE IF NOT EXISTS meeting_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL REFERENCES meetings(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at INTEGER,
      ended_at INTEGER,
      actual_duration INTEGER,
      is_ad_hoc INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER
    );

    -- Daily analytics table (pre-calculated statistics)
    CREATE TABLE IF NOT EXISTS daily_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      work_duration_by_resource TEXT,
      total_work_duration INTEGER NOT NULL DEFAULT 0,
      meeting_count INTEGER NOT NULL DEFAULT 0,
      total_meeting_duration INTEGER NOT NULL DEFAULT 0,
      routine_completed INTEGER NOT NULL DEFAULT 0,
      routine_total INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER,
      UNIQUE(user_id, date)
    );

    -- Cron job log table (for tracking scheduled job execution)
    CREATE TABLE IF NOT EXISTS cron_job_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_name TEXT NOT NULL,
      last_run_date TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at INTEGER
    );

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_resource_groups_user_id ON resource_groups(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_work_records_user_id ON work_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_work_records_completed_at ON work_records(completed_at);
    CREATE INDEX IF NOT EXISTS idx_routine_tasks_user_id ON routine_tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_routine_task_instances_scheduled_date ON routine_task_instances(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
    CREATE INDEX IF NOT EXISTS idx_meeting_instances_scheduled_date ON meeting_instances(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_daily_analytics_user_date ON daily_analytics(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_cron_job_log_job_name ON cron_job_log(job_name, status);
  `)

  console.log('✓ SQLite tables created')
}

/**
 * Create PostgreSQL tables (production)
 */
async function createPostgresTables(database) {
  const { sql } = await import('drizzle-orm')

  await database.execute(sql`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      zitadel_sub TEXT UNIQUE,
      email TEXT,
      name TEXT,
      email_verified BOOLEAN DEFAULT FALSE,
      settings_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Resource groups table
    CREATE TABLE IF NOT EXISTS resource_groups (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      percentage_limit INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Tasks table
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '待處理',
      resource_group_id INTEGER REFERENCES resource_groups(id) ON DELETE SET NULL,
      scheduled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Work records table
    CREATE TABLE IF NOT EXISTS work_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      task_name TEXT NOT NULL,
      duration INTEGER NOT NULL,
      resource_group_id INTEGER REFERENCES resource_groups(id) ON DELETE SET NULL,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Routine tasks table
    CREATE TABLE IF NOT EXISTS routine_tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      resource_group_id INTEGER REFERENCES resource_groups(id) ON DELETE SET NULL,
      recurrence_rule JSONB,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      starts_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Routine task instances table
    CREATE TABLE IF NOT EXISTS routine_task_instances (
      id SERIAL PRIMARY KEY,
      routine_task_id INTEGER NOT NULL REFERENCES routine_tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scheduled_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      scheduled_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Meetings table
    CREATE TABLE IF NOT EXISTS meetings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      meeting_type TEXT NOT NULL,
      recurrence_rule JSONB,
      scheduled_time TEXT NOT NULL,
      scheduled_date TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Meeting instances table
    CREATE TABLE IF NOT EXISTS meeting_instances (
      id SERIAL PRIMARY KEY,
      meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      actual_duration INTEGER,
      is_ad_hoc BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Daily analytics table
    CREATE TABLE IF NOT EXISTS daily_analytics (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      work_duration_by_resource JSONB,
      total_work_duration INTEGER NOT NULL DEFAULT 0,
      meeting_count INTEGER NOT NULL DEFAULT 0,
      total_meeting_duration INTEGER NOT NULL DEFAULT 0,
      routine_completed INTEGER NOT NULL DEFAULT 0,
      routine_total INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, date)
    );

    -- Cron job log table
    CREATE TABLE IF NOT EXISTS cron_job_log (
      id SERIAL PRIMARY KEY,
      job_name TEXT NOT NULL,
      last_run_date TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  // Create indexes (separate statements for PostgreSQL)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_resource_groups_user_id ON resource_groups(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
    'CREATE INDEX IF NOT EXISTS idx_work_records_user_id ON work_records(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_work_records_completed_at ON work_records(completed_at)',
    'CREATE INDEX IF NOT EXISTS idx_routine_tasks_user_id ON routine_tasks(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_routine_task_instances_scheduled_date ON routine_task_instances(scheduled_date)',
    'CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_meeting_instances_scheduled_date ON meeting_instances(scheduled_date)',
    'CREATE INDEX IF NOT EXISTS idx_daily_analytics_user_date ON daily_analytics(user_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_cron_job_log_job_name ON cron_job_log(job_name, status)',
  ]

  for (const indexSql of indexes) {
    await database.execute(sql.raw(indexSql))
  }

  console.log('✓ PostgreSQL tables created')
}

/**
 * Close database connection
 */
export async function closePool() {
  if (sqliteInstance) {
    sqliteInstance.close()
    sqliteInstance = null
    console.log('✓ SQLite connection closed')
  }
  // For PostgreSQL, the pool would need to be closed here
}

/**
 * Get the database mode
 */
export function getDbMode() {
  return dbMode
}

// Re-export schema for convenience
export * from './schema.js'
