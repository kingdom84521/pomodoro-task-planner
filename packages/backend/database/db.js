import pkg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'pomodoro_planner',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
})

// Test connection on startup
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err)
  process.exit(-1)
})

/**
 * Execute a SQL query
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export async function query(text, params) {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

/**
 * Initialize database - create tables and insert default data
 * @returns {Promise<void>}
 */
export async function initDatabase() {
  try {
    console.log('Initializing database...')

    const schemaPath = join(__dirname, 'schema.sql')
    const schema = readFileSync(schemaPath, 'utf8')

    await query(schema)

    console.log('✓ Database initialized successfully')
  } catch (error) {
    // If tables already exist, this is expected behavior
    if (error.code === '42P07') {
      console.log('✓ Database tables already exist')
    } else {
      console.error('Error initializing database:', error.message)
      throw error
    }
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<PoolClient>}
 */
export async function getClient() {
  return await pool.connect()
}

/**
 * Close all pool connections
 * @returns {Promise<void>}
 */
export async function closePool() {
  await pool.end()
  console.log('✓ Database pool closed')
}

export default {
  query,
  initDatabase,
  getClient,
  closePool,
  pool,
}
