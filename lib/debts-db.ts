import { D1DatabaseInterface } from './db';

let tablesEnsured = false;

/**
 * Garante a criação automática das tabelas 'debts' e 'debt_payments'
 * caso ainda não tenham sido criadas no D1 ou SQLite.
 */
export async function ensureDebtTables(db: D1DatabaseInterface): Promise<void> {
  if (tablesEnsured) return;

  try {
    if (typeof db.exec === 'function') {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS debts (
          id TEXT PRIMARY KEY,
          workspace_id TEXT DEFAULT 'ws_default',
          title TEXT NOT NULL,
          total_amount REAL NOT NULL,
          remaining_amount REAL NOT NULL,
          paid_amount REAL NOT NULL DEFAULT 0,
          due_date TEXT,
          company_name TEXT,
          user_id TEXT,
          client_id TEXT,
          category_id TEXT,
          status TEXT NOT NULL DEFAULT 'pendente',
          total_installments INTEGER DEFAULT 1,
          paid_installments INTEGER DEFAULT 0,
          notes TEXT,
          created_by TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_debts_workspace_id ON debts(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
        CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);

        CREATE TABLE IF NOT EXISTS debt_payments (
          id TEXT PRIMARY KEY,
          debt_id TEXT NOT NULL,
          workspace_id TEXT DEFAULT 'ws_default',
          amount REAL NOT NULL,
          payment_date TEXT NOT NULL,
          installment_number INTEGER,
          payment_method TEXT,
          notes TEXT,
          transaction_id TEXT,
          created_by TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
        CREATE INDEX IF NOT EXISTS idx_debt_payments_workspace_id ON debt_payments(workspace_id);
      `);
      tablesEnsured = true;
      return;
    }
  } catch (err) {
    // Se db.exec não suportar múltiplos statements, executa via prepare individual
  }

  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS debts (
        id TEXT PRIMARY KEY,
        workspace_id TEXT DEFAULT 'ws_default',
        title TEXT NOT NULL,
        total_amount REAL NOT NULL,
        remaining_amount REAL NOT NULL,
        paid_amount REAL NOT NULL DEFAULT 0,
        due_date TEXT,
        company_name TEXT,
        user_id TEXT,
        client_id TEXT,
        category_id TEXT,
        status TEXT NOT NULL DEFAULT 'pendente',
        total_installments INTEGER DEFAULT 1,
        paid_installments INTEGER DEFAULT 0,
        notes TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS debt_payments (
        id TEXT PRIMARY KEY,
        debt_id TEXT NOT NULL,
        workspace_id TEXT DEFAULT 'ws_default',
        amount REAL NOT NULL,
        payment_date TEXT NOT NULL,
        installment_number INTEGER,
        payment_method TEXT,
        notes TEXT,
        transaction_id TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();

    tablesEnsured = true;
  } catch (err: any) {
    console.error('[ensureDebtTables]:', err?.message);
  }
}
