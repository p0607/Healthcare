#!/bin/sh

set -e



if [ "${PRISMA_DB_PUSH:-0}" = "1" ]; then

  echo "Applying database schema (Prisma db push — dev only)…"

  npx prisma db push --skip-generate

else

  echo "Applying database migrations (Prisma migrate deploy)…"

  npx prisma migrate deploy

fi



if [ "${SEED_ON_START:-0}" = "1" ]; then

  echo "Seeding demo data (SEED_ON_START=1)…"

  node src/seed.js

fi



echo "Starting API on port ${PORT:-5050}…"

exec node src/server.js

