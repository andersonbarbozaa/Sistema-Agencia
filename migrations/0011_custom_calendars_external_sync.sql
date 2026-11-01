-- Migração: Criação / Atualização de custom_calendars com suporte a vínculo de plataformas externas

CREATE TABLE IF NOT EXISTS custom_calendars (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL DEFAULT 'ws_default',
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  visibility TEXT NOT NULL DEFAULT 'group',
  external_platform TEXT DEFAULT 'none',
  external_url TEXT,
  external_account TEXT,
  sync_enabled INTEGER DEFAULT 0,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE custom_calendars ADD COLUMN external_platform TEXT DEFAULT 'none';
ALTER TABLE custom_calendars ADD COLUMN external_url TEXT;
ALTER TABLE custom_calendars ADD COLUMN external_account TEXT;
ALTER TABLE custom_calendars ADD COLUMN sync_enabled INTEGER DEFAULT 0;
