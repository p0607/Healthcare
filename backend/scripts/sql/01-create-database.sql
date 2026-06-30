-- Nurse Care — create database (local PostgreSQL only)
--
-- Run as a superuser, connected to the default `postgres` database:
--   psql -U postgres -f scripts/sql/01-create-database.sql
--
-- On Azure Database for PostgreSQL, create the database in the Azure Portal instead.

SELECT 'CREATE DATABASE nurse_care'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nurse_care')\gexec

-- Optional: dedicated app role (local dev). Skip on Azure — use the server admin user.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nurse_care_app') THEN
    CREATE ROLE nurse_care_app WITH LOGIN PASSWORD 'change_me_in_production';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE nurse_care TO nurse_care_app;
