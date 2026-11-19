-- Migration 0012: Add checklist JSON column to tasks
ALTER TABLE tasks ADD COLUMN checklist TEXT;
