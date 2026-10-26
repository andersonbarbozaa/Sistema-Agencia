-- Migration 0008: Add address column to crm_leads
ALTER TABLE crm_leads ADD COLUMN address TEXT;
