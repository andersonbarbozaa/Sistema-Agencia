import fs from 'fs';
import path from 'path';

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  all<T = any>(): Promise<{ results: T[]; success: boolean; error?: string }>;
  first<T = any>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; meta: any; error?: string }>;
}

export interface D1DatabaseInterface {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<any[]>;
  exec(query: string): Promise<any>;
}

// Global cached connection for local development
let localDbInstance: any = null;

function getLocalDatabase(): D1DatabaseInterface {
  if (!localDbInstance) {
    const nodeSqlite = eval('require')('node:sqlite');
    const DatabaseSync = nodeSqlite.DatabaseSync;
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'local.sqlite');
    const sqlite = new DatabaseSync(dbPath);

    // Enable WAL mode for high performance concurrency
    sqlite.exec('PRAGMA journal_mode = WAL;');
    sqlite.exec('PRAGMA foreign_keys = ON;');

    // Verify if tables exist, otherwise auto-migrate
    const checkTable = sqlite.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='users';").get() as any;
    if (!checkTable || checkTable.count === 0) {
      const migrationFile = path.join(process.cwd(), 'migrations', '0001_initial_schema.sql');
      if (fs.existsSync(migrationFile)) {
        const sql = fs.readFileSync(migrationFile, 'utf8');
        sqlite.exec(sql);
        console.log('[D1 Local] Schema migrado com sucesso a partir de migrations/0001_initial_schema.sql');
      }
    }

    // Safe column migrations
    try { sqlite.exec("ALTER TABLE clients ADD COLUMN avatar_url TEXT;"); } catch {}
    try { sqlite.exec("ALTER TABLE bank_accounts ADD COLUMN currency TEXT NOT NULL DEFAULT 'BRL';"); } catch {}

    // Workspaces Multi-tenant schema
    try {
      sqlite.exec(`
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

        INSERT OR IGNORE INTO workspaces (id, name, description, owner_id, invite_code)
        VALUES ('ws_default', 'PixelCraft Studio', 'Agência Audiovisual & Criativa', 'usr_anderson', 'pixelcraft');
      `);
    } catch (e) {
      console.error('[Workspaces migration error]', e);
    }

    // Add workspace_id and job_title to tables
    try { sqlite.exec("ALTER TABLE users ADD COLUMN workspace_id TEXT;"); } catch {}
    try { sqlite.exec("ALTER TABLE users ADD COLUMN job_title TEXT DEFAULT 'Administrador';"); } catch {}
    try { sqlite.exec("ALTER TABLE clients ADD COLUMN workspace_id TEXT;"); } catch {}
    try { sqlite.exec("ALTER TABLE projects ADD COLUMN workspace_id TEXT;"); } catch {}
    try { sqlite.exec("ALTER TABLE tasks ADD COLUMN workspace_id TEXT;"); } catch {}
    try { sqlite.exec("ALTER TABLE task_categories ADD COLUMN workspace_id TEXT;"); } catch {}
    try { sqlite.exec("ALTER TABLE financial_transactions ADD COLUMN workspace_id TEXT;"); } catch {}
    try { sqlite.exec("ALTER TABLE financial_categories ADD COLUMN workspace_id TEXT;"); } catch {}
    try { sqlite.exec("ALTER TABLE bank_accounts ADD COLUMN workspace_id TEXT;"); } catch {}
    try { sqlite.exec("ALTER TABLE contracts ADD COLUMN workspace_id TEXT;"); } catch {}
    try { sqlite.exec("ALTER TABLE crm_leads ADD COLUMN workspace_id TEXT;"); } catch {}
    try { sqlite.exec("ALTER TABLE calendar_events ADD COLUMN workspace_id TEXT;"); } catch {}
    try { sqlite.exec("ALTER TABLE notifications ADD COLUMN workspace_id TEXT;"); } catch {}
    try { sqlite.exec("ALTER TABLE positions ADD COLUMN workspace_id TEXT;"); } catch {}

    // Backfill existing records with default workspace
    try {
      sqlite.exec(`
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
      `);
    } catch (e) {
      console.error('[Workspaces backfill error]', e);
    }

    // Default settings
    try {
      sqlite.exec(`
        INSERT OR IGNORE INTO settings (key, value, description) VALUES
        ('monthly_revenue_goal', '50000', 'Meta mensal de receita da agência'),
        ('default_currency', 'BRL', 'Moeda padrão do sistema (BRL, USD, EUR)'),
        ('exchange_rate_usd', '5.65', 'Taxa de conversão USD para moeda padrão'),
        ('exchange_rate_eur', '6.15', 'Taxa de conversão EUR para moeda padrão');
      `);
    } catch {}

    localDbInstance = {
      prepare(query: string): D1PreparedStatement {
        let boundParams: any[] = [];
        return {
          bind(...values: any[]) {
            boundParams = values.map(val => (val === undefined ? null : val));
            return this;
          },
          async all<T = any>() {
            try {
              const stmt = sqlite.prepare(query);
              const rows = stmt.all(...boundParams) as any[];
              const plainRows = rows.map(r => (r && typeof r === 'object' ? { ...r } : r));
              return { results: plainRows as T[], success: true };
            } catch (err: any) {
              console.error('[D1 Query Error - all]:', query, boundParams, err);
              throw err;
            }
          },
          async first<T = any>(colName?: string) {
            try {
              const stmt = sqlite.prepare(query);
              const row = stmt.get(...boundParams) as any;
              if (!row) return null;
              const plainRow = typeof row === 'object' ? { ...row } : row;
              if (colName) return plainRow[colName] ?? null;
              return plainRow as T;
            } catch (err: any) {
              console.error('[D1 Query Error - first]:', query, boundParams, err);
              throw err;
            }
          },
          async run() {
            try {
              const stmt = sqlite.prepare(query);
              const info = stmt.run(...boundParams);
              return { success: true, meta: info };
            } catch (err: any) {
              console.error('[D1 Query Error - run]:', query, boundParams, err);
              throw err;
            }
          }
        };
      },
      async batch(statements: D1PreparedStatement[]) {
        const results = [];
        for (const s of statements) {
          results.push(await s.run());
        }
        return results;
      },
      async exec(query: string) {
        return sqlite.exec(query);
      }
    };
  }

  return localDbInstance;
}

export function getDb(): D1DatabaseInterface {
  // If running in Cloudflare Pages/Workers environment with env.DB
  if (typeof (globalThis as any).process?.env?.DB !== 'undefined') {
    return (globalThis as any).process.env.DB as D1DatabaseInterface;
  }
  // Otherwise use local SQLite with standard D1 compatibility interface
  return getLocalDatabase();
}
