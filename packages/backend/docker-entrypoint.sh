#!/bin/sh
set -e

echo "=== Pomodoro Backend Startup ==="

# Only run database check if DB_MODE is postgres
if [ "$DB_MODE" = "postgres" ] || [ "$DB_MODE" = "postgresql" ]; then
  echo "[1/3] Waiting for PostgreSQL..."

  # Wait for PostgreSQL to be available (max 30 seconds)
  RETRIES=30
  until node -e "
    import('pg').then(({ default: pg }) => {
      const url = new URL(process.env.DATABASE_URL);
      url.pathname = '/postgres';
      const client = new pg.Client({ connectionString: url.toString() });
      client.connect()
        .then(() => { client.end(); process.exit(0); })
        .catch(() => process.exit(1));
    });
  " 2>/dev/null; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -le 0 ]; then
      echo "    ERROR: Could not connect to PostgreSQL after 30 seconds"
      exit 1
    fi
    echo "    Waiting for PostgreSQL... ($RETRIES attempts left)"
    sleep 1
  done
  echo "    PostgreSQL is available"

  echo "[2/3] Checking database..."
  node packages/backend/scripts/db-init.js

  echo "[3/3] Starting application..."
else
  echo "[1/1] Using SQLite mode, starting application..."
fi

# Start the application
exec node packages/backend/index.js
