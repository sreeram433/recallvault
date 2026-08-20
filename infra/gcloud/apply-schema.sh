#!/usr/bin/env bash
# Run SQL init through the Cloud SQL Auth Proxy. The instance has no public IP.
set -euo pipefail
PROJECT_ID="${PROJECT_ID:?set PROJECT_ID}"
REGION="${REGION:-us-central1}"
SQL_INSTANCE="${SQL_INSTANCE:-recallvault-pg}"
INSTANCE="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

cloud-sql-proxy "${INSTANCE}" --private-ip --port 5432 &
PROXY_PID=$!
trap 'kill ${PROXY_PID}' EXIT
sleep 3
PGPASSWORD="${DB_PASSWORD:?set DB_PASSWORD}" psql \
  "host=127.0.0.1 port=5432 user=recallvault dbname=recallvault sslmode=disable" \
  -f backend/sql/001_init.sql
echo "Schema applied."
