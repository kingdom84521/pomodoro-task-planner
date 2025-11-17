import * as dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface EnvironmentConfig {
  // App
  NODE_ENV: string;
  PORT: number;

  // Database
  MONGODB_URI: string;
  DB_POOL_SIZE: number;
  DB_MIN_POOL_SIZE: number;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // CORS
  CORS_ORIGIN: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Socket.io
  SOCKET_IO_CORS_ORIGIN: string;

  // Logging
  LOG_LEVEL: string;

  // OAuth (Phase 2)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_CALLBACK_URL?: string;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getEnvRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env: EnvironmentConfig = {
  // App
  NODE_ENV: getEnvString('NODE_ENV', 'development'),
  PORT: getEnvNumber('PORT', 3000),

  // Database
  MONGODB_URI: getEnvRequired('MONGODB_URI'),
  DB_POOL_SIZE: getEnvNumber('DB_POOL_SIZE', 10),
  DB_MIN_POOL_SIZE: getEnvNumber('DB_MIN_POOL_SIZE', 2),

  // JWT
  JWT_SECRET: getEnvRequired('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnvString('JWT_EXPIRES_IN', '7d'),
  JWT_REFRESH_SECRET: getEnvString('JWT_REFRESH_SECRET', getEnvRequired('JWT_SECRET') + '_refresh'),
  JWT_REFRESH_EXPIRES_IN: getEnvString('JWT_REFRESH_EXPIRES_IN', '30d'),

  // CORS
  CORS_ORIGIN: getEnvString('CORS_ORIGIN', 'http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),

  // Socket.io
  SOCKET_IO_CORS_ORIGIN: getEnvString('SOCKET_IO_CORS_ORIGIN', 'http://localhost:5173'),

  // Logging
  LOG_LEVEL: getEnvString('LOG_LEVEL', 'info'),

  // OAuth (Phase 2)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
};

// Validate environment
export function validateEnvironment(): void {
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT_SECRET length
  if (env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security');
  }

  // Validate PORT
  if (env.PORT < 1 || env.PORT > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  console.log('✓ Environment configuration validated successfully');
}

export default env;
