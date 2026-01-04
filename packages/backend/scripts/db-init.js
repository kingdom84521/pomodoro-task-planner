/**
 * Database Initialization Script
 *
 * This script runs before the main application starts.
 * It checks if the target database exists and creates it if needed.
 */

import pg from 'pg'

const { Client } = pg

async function main() {
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    console.log('    DATABASE_URL not set, skipping database check')
    process.exit(0)
  }

  // Parse DATABASE_URL to extract database name
  const url = new URL(dbUrl)
  const dbName = url.pathname.slice(1) // Remove leading /

  if (!dbName) {
    console.error('    ERROR: Could not parse database name from DATABASE_URL')
    process.exit(1)
  }

  // Create URL for postgres database (to check/create target database)
  url.pathname = '/postgres'
  const postgresUrl = url.toString()

  console.log(`    Target database: ${dbName}`)

  // Connect to postgres database
  const client = new Client({ connectionString: postgresUrl })

  try {
    await client.connect()
    console.log('    Connected to PostgreSQL')

    // Check if database exists
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    )

    if (result.rows.length === 0) {
      console.log(`    Database '${dbName}' does not exist, creating...`)
      // Use double quotes for database name to handle special characters
      await client.query(`CREATE DATABASE "${dbName}"`)
      console.log('    Database created successfully')
    } else {
      console.log('    Database already exists')
    }
  } catch (error) {
    console.error('    ERROR:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
