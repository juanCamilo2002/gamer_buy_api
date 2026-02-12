#!/bin/sh

echo "⏳ Waiting for database..."

# Esperar hasta que Postgres responda
until nc -z db 5432; do
  sleep 1
done

echo "🚀 Database is up"

echo "📦 Running Prisma migrations..."
npx prisma migrate deploy --config prisma.config.ts

echo "🔥 Starting application..."
exec node dist/src/main.js
