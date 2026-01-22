#!/bin/sh
set -e

echo "Running database migrations..."
node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "Seeding database..."
node_modules/.bin/prisma db seed || echo "Seed skipped or already applied"

echo "Starting DPM API..."
exec node dist/index.js
