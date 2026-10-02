-- ============================================================
-- MULTI-TENANT WORKSPACES MIGRATION
-- ============================================================

-- 1. WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workspaces_invite_code ON workspaces(invite_code);

-- 2. CREATE DEFAULT WORKSPACE
INSERT OR IGNORE INTO workspaces (id, name, description, owner_id, invite_code)
VALUES ('ws_default', 'PixelCraft Studio', 'Agência Audiovisual & Criativa', 'usr_anderson', 'pixelcraft');
