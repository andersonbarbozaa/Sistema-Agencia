-- ============================================================
-- BANCO DE DADOS: CLOUDFLARE D1 (SQLITE)
-- SISTEMA DE GERENCIAMENTO DE AGÊNCIA CRIATIVA
-- ============================================================

PRAGMA foreign_keys = ON;

-- 1. CARGOS (POSITIONS) - Separado de perfis de permissão
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. CLIENTES
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  corporate_name TEXT,
  trade_name TEXT,
  document TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  website TEXT,
  instagram TEXT,
  responsible_user_id TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. USUÁRIOS
-- Perfis: 'ADMINISTRADOR', 'COLABORADOR', 'CLIENTE'
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'COLABORADOR',
  position_id TEXT REFERENCES positions(id) ON DELETE SET NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  is_partner INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. PROJETOS
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  description TEXT,
  start_date TEXT,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'Planejamento',
  value REAL DEFAULT 0,
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. CATEGORIAS DE TAREFAS
CREATE TABLE IF NOT EXISTS task_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3b82f6',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. TAREFAS
-- delivery_date é independente de due_date financeiro ou Google Calendar
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  category_id TEXT REFERENCES task_categories(id) ON DELETE SET NULL,
  delivery_date TEXT,
  status TEXT NOT NULL DEFAULT 'Não iniciada',
  completed_at TEXT,
  value REAL DEFAULT 0,
  notes TEXT,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. RESPONSÁVEIS PELA TAREFA (Múltiplos responsáveis)
CREATE TABLE IF NOT EXISTS task_assignees (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(task_id, user_id)
);

-- 8. LINKS DE MÍDIA DAS TAREFAS (Sem R2, somente links externos)
CREATE TABLE IF NOT EXISTS task_media_links (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'other', -- 'image', 'video', 'document', 'other'
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. COMENTÁRIOS E FEEDBACKS DE TAREFAS
CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'comment', -- 'comment', 'approval', 'change_request'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. HISTÓRICO DE STATUS DAS TAREFAS
CREATE TABLE IF NOT EXISTS task_status_history (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 11. SOLICITAÇÕES DE EXCLUSÃO DE TAREFAS (Para colaboradores)
CREATE TABLE IF NOT EXISTS task_deletion_requests (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  review_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 12. CONTAS BANCÁRIAS
CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bank TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Corrente',
  initial_balance REAL NOT NULL DEFAULT 0,
  responsible_partner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 13. CATEGORIAS FINANCEIRAS
CREATE TABLE IF NOT EXISTS financial_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'both', -- 'entrada', 'saida', 'both'
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 14. TRANSAÇÕES FINANCEIRAS
CREATE TABLE IF NOT EXISTS financial_transactions (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL, -- 'Entrada', 'Saída'
  category_id TEXT REFERENCES financial_categories(id) ON DELETE SET NULL,
  bank_account_id TEXT REFERENCES bank_accounts(id) ON DELETE SET NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  due_date TEXT NOT NULL,
  paid_at TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Pago'
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 15. CONTRATOS
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  value REAL NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  external_url TEXT,
  notes TEXT,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 16. CRM - LEADS / PROSPECÇÃO
CREATE TABLE IF NOT EXISTS crm_leads (
  id TEXT PRIMARY KEY,
  contact_name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  city TEXT,
  first_contact_date TEXT NOT NULL,
  platform TEXT,
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Novo', -- 'Novo', 'Em andamento', 'Aguardando resposta', 'Sem resposta', 'Finalizado positivo', 'Finalizado negativo'
  notes TEXT,
  last_activity_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 17. CRM - HISTÓRICO DE INTERAÇÕES
CREATE TABLE IF NOT EXISTS crm_interactions (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interaction_date TEXT NOT NULL,
  platform TEXT NOT NULL,
  message TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 18. AGENDA / COMPROMISSOS (Somente este módulo sincroniza com Google Calendar)
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_event_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 19. NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'task_assigned', 'task_due', 'client_approval', 'change_request', 'deletion_request', 'bill_due', 'lead_inactive', 'comment', 'system'
  reference_module TEXT,
  reference_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 20. AUDITORIA
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id TEXT,
  before_data TEXT,
  after_data TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 21. INTEGRAÇÃO GOOGLE CALENDAR
CREATE TABLE IF NOT EXISTS google_integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date INTEGER,
  calendar_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 22. HISTÓRICO DE INTERPRETAÇÕES DE IA (GEMINI)
CREATE TABLE IF NOT EXISTS ai_interpretations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL, -- 'text', 'audio'
  input_text TEXT NOT NULL,
  audio_reference TEXT,
  detected_action TEXT NOT NULL,
  structured_payload TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.9,
  status TEXT NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Confirmado', 'Dispensado', 'Erro'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT,
  dismissed_at TEXT
);

-- 23. CONFIGURAÇÕES GERAIS DO SISTEMA
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- ÍNDICES PARA ALTA PERFORMANCE (ESPECIFICAÇÕES DO REQUISITO 58)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_delivery_date ON tasks(delivery_date);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);

CREATE INDEX IF NOT EXISTS idx_financial_client_id ON financial_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_financial_due_date ON financial_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_financial_type ON financial_transactions(type);

CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_last_activity ON crm_leads(last_activity_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

CREATE INDEX IF NOT EXISTS idx_calendar_event_date ON calendar_events(event_date);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
