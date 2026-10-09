CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  corporate_name TEXT,
  trade_name TEXT,
  avatar_url TEXT,
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
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'COLABORADOR',
  position_id TEXT,
  client_id TEXT,
  is_partner INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  job_title TEXT DEFAULT 'Administrador',
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_id TEXT NOT NULL,
  description TEXT,
  start_date TEXT,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'Planejamento',
  value REAL DEFAULT 0,
  notes TEXT,
  created_by TEXT,
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  is_active INTEGER NOT NULL DEFAULT 1,
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  client_id TEXT NOT NULL,
  project_id TEXT,
  category_id TEXT,
  delivery_date TEXT,
  status TEXT NOT NULL DEFAULT 'Não iniciada',
  completed_at TEXT,
  value REAL DEFAULT 0,
  notes TEXT,
  created_by TEXT NOT NULL,
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_assignees (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_media_links (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  comment TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_status_history (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_deletion_requests (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bank TEXT,
  type TEXT NOT NULL DEFAULT 'Corrente',
  initial_balance REAL NOT NULL DEFAULT 0,
  responsible_partner_id TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financial_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'both',
  color TEXT DEFAULT '#10b981',
  is_active INTEGER NOT NULL DEFAULT 1,
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  due_date TEXT NOT NULL,
  paid_at TEXT,
  category_id TEXT,
  bank_account_id TEXT,
  client_id TEXT,
  task_id TEXT,
  project_id TEXT,
  partner_id TEXT,
  notes TEXT,
  created_by TEXT,
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  contract_value REAL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  document_url TEXT,
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crm_leads (
  id TEXT PRIMARY KEY,
  contact_name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Novo',
  estimated_value REAL DEFAULT 0,
  source TEXT,
  notes TEXT,
  assignee_id TEXT,
  workspace_id TEXT,
  last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crm_interactions (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  notes TEXT NOT NULL,
  interaction_date TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  client_id TEXT,
  project_id TEXT,
  google_event_id TEXT,
  created_by TEXT NOT NULL,
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  reference_module TEXT,
  reference_id TEXT,
  read_at TEXT,
  workspace_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id TEXT,
  before_data TEXT,
  after_data TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS google_integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT,
  calendar_id TEXT,
  sync_enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_interpretations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  input_type TEXT NOT NULL,
  input_text TEXT NOT NULL,
  audio_reference TEXT,
  detected_action TEXT NOT NULL,
  structured_payload TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.9,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT,
  dismissed_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
