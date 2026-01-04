/**
 * Database Adapter
 *
 * Unified database entry point using Drizzle ORM.
 * Supports SQLite (development) and PostgreSQL (production).
 *
 * Services should import directly from './drizzle.js' for Drizzle queries.
 * This file provides backwards compatibility for legacy code.
 */

import { initDatabase, closePool, getDb, getDbMode } from './drizzle.js'

// Re-export main functions
export { initDatabase, closePool, getDb, getDbMode }

// Legacy compatibility - some old services may still use db.query()
// These will fail with clear error messages
export const query = async () => {
  throw new Error(
    'db.query() is no longer supported. Please use Drizzle ORM queries. ' +
    'Import { getDb } from "./drizzle.js" and use Drizzle query syntax.'
  )
}

export const getClient = async () => {
  throw new Error(
    'db.getClient() is no longer supported. Please use Drizzle ORM. ' +
    'Import { getDb } from "./drizzle.js".'
  )
}

export default {
  query,
  initDatabase,
  getClient,
  closePool,
  getDb,
  getDbMode,
}
