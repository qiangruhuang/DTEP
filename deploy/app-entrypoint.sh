#!/bin/sh
set -eu
mkdir -p /data
if [ ! -f /data/custom.db ]; then cp /app/db/custom.db.seed /data/custom.db; fi
export DATABASE_URL="${DATABASE_URL:-file:/data/custom.db}"
exec node server.js
