-- Migração: Criação de tabelas de Dívidas e Histórico de Pagamentos de Dívidas

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT DEFAULT 'ws_default',
  title TEXT NOT NULL,
  total_amount REAL NOT NULL,
  remaining_amount REAL NOT NULL,
  paid_amount REAL NOT NULL DEFAULT 0,
  due_date TEXT,
  company_name TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  category_id TEXT REFERENCES financial_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  total_installments INTEGER DEFAULT 1,
  paid_installments INTEGER DEFAULT 0,
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_debts_workspace_id ON debts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);

CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  workspace_id TEXT DEFAULT 'ws_default',
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  installment_number INTEGER,
  payment_method TEXT,
  notes TEXT,
  transaction_id TEXT REFERENCES financial_transactions(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_workspace_id ON debt_payments(workspace_id);
