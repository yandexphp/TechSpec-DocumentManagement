#!/bin/sh
set -e

echo "Waiting for database to be ready..."

# Extract host from DATABASE_URL (format: postgresql://user:pass@host:port/db)
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=5432

# Wait for database to be available using pg_isready (max 50 attempts)
MAX_RETRIES=50
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U postgres > /dev/null 2>&1; then
    echo "✅ Database is ready!"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Database is unavailable - sleeping (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ ERROR: Database is not available after $MAX_RETRIES attempts"
  exit 1
fi

echo "Running migrations..."
npx prisma migrate deploy

EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Migrations completed successfully!"
  exit 0
else
  echo "❌ Migrations failed with exit code $EXIT_CODE"
  exit $EXIT_CODE
fi

