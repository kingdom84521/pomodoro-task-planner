// Database adapter - switches between real PostgreSQL and mock database

const dbMode = process.env.DB_MODE || 'mock'

let db

if (dbMode === 'mock') {
  console.log('🔧 Database mode: MOCK (no PostgreSQL required)')
  db = await import('./mockDb.js')
} else {
  console.log('🔧 Database mode: PostgreSQL')
  db = await import('./db.js')
}

export const query = db.query
export const initDatabase = db.initDatabase
export const getClient = db.getClient
export const closePool = db.closePool

export default {
  query,
  initDatabase,
  getClient,
  closePool,
}
