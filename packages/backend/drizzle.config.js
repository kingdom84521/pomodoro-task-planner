import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './database/schema.js',
  out: './database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.SQLITE_PATH || './dev.db',
  },
  verbose: true,
  strict: true,
})
