-- Migration 0009: Add avatar_url and social_links to clients table
ALTER TABLE clients ADD COLUMN avatar_url TEXT;
ALTER TABLE clients ADD COLUMN social_links TEXT;
