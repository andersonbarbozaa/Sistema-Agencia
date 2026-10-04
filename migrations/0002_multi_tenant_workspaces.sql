-- ============================================================
-- MULTI-TENANT WORKSPACES MIGRATION
-- Garante o isolamento estrito de dados por workspace_id
-- ============================================================

-- 1. TABELA DE WORKSPACES
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

-- 2. CRIAÇÃO DO WORKSPACE PADRÃO
INSERT OR IGNORE INTO workspaces (id, name, description, owner_id, invite_code)
VALUES ('ws_default', 'PixelCraft Studio', 'Agência Audiovisual & Criativa', 'usr_anderson', 'pixelcraft');

-- 3. ADICIONAR COLUNAS DE WORKSPACE_ID EM TODAS AS TABELAS
ALTER TABLE users ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN job_title TEXT DEFAULT 'Administrador';

ALTER TABLE clients ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE task_categories ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE financial_transactions ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE financial_categories ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE bank_accounts ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE contracts ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE crm_leads ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE calendar_events ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE positions ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;

-- 4. ÍNDICES DE DESEMPENHO E ISOLAMENTO MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_clients_workspace_id ON clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_financial_workspace_id ON financial_transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_workspace_id ON crm_leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace_id ON calendar_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON notifications(workspace_id);

-- 5. ATUALIZAR REGISTOS EXISTENTES PARA O WORKSPACE PADRÃO
UPDATE users SET workspace_id = 'ws_default' WHERE workspace_id IS NULL;
UPDATE users SET job_title = 'Administrador' WHERE job_title IS NULL;
UPDATE clients SET workspace_id = 'ws_default' WHERE workspace_id IS NULL;
UPDATE projects SET workspace_id = 'ws_default' WHERE workspace_id IS NULL;
UPDATE tasks SET workspace_id = 'ws_default' WHERE workspace_id IS NULL;
UPDATE task_categories SET workspace_id = 'ws_default' WHERE workspace_id IS NULL;
UPDATE financial_transactions SET workspace_id = 'ws_default' WHERE workspace_id IS NULL;
UPDATE financial_categories SET workspace_id = 'ws_default' WHERE workspace_id IS NULL;
UPDATE bank_accounts SET workspace_id = 'ws_default' WHERE workspace_id IS NULL;
UPDATE contracts SET workspace_id = 'ws_default' WHERE workspace_id IS NULL;
UPDATE crm_leads SET workspace_id = 'ws_default' WHERE workspace_id IS NULL;
UPDATE calendar_events SET workspace_id = 'ws_default' WHERE workspace_id IS NULL;
UPDATE notifications SET workspace_id = 'ws_default' WHERE workspace_id IS NULL;
UPDATE positions SET workspace_id = 'ws_default' WHERE workspace_id IS NULL;
