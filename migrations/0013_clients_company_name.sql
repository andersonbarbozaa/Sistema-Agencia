-- Migration 0013: Add company_name column to clients table
ALTER TABLE clients ADD COLUMN company_name TEXT;
