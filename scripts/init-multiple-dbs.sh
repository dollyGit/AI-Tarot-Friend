#!/bin/bash
# ============================================================
# TarotFriend — PostgreSQL Multi-Database Init Script
# Creates 5 databases with pgvector extension on first boot
# ============================================================
set -e

DATABASES="tarot_db customer_db caring_db shop_db scheduler_db"

for db in $DATABASES; do
  echo "Creating database: $db"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE $db' WHERE NOT EXISTS (
      SELECT FROM pg_database WHERE datname = '$db'
    )\gexec
EOSQL

  echo "Enabling pgvector extension on: $db"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
done

echo "All databases created successfully:"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "\l" | grep -E "tarot_db|customer_db|caring_db|shop_db|scheduler_db"
