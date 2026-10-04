import { getCloudflareContext } from '@opennextjs/cloudflare';

// ============================================================
// CLOUDFLARE D1 DATABASE INTERFACE & RESOLVER
// Executa 100% nativo no Cloudflare Workers via binding DB
// ============================================================

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

let localDbInstance: D1DatabaseInterface | null = null;

function getLocalDatabase(): D1DatabaseInterface {
  if (localDbInstance) {
    return localDbInstance;
  }

  let sqlite: any = null;

  try {
    const getMod = (globalThis as any).process?.getBuiltinModule;
    if (getMod) {
      const sqliteMod = getMod('node:sqlite');
      if (sqliteMod?.DatabaseSync) {
        sqlite = new sqliteMod.DatabaseSync(':memory:');
      }
    }
  } catch {}

  if (sqlite) {
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
        INSERT OR IGNORE INTO workspaces (id, name, description, owner_id, invite_code)
        VALUES ('ws_default', 'PixelCraft Studio', 'Agência Audiovisual & Criativa', 'usr_anderson', 'pixelcraft');

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          phone TEXT,
          role TEXT NOT NULL DEFAULT 'ADMINISTRADOR',
          status TEXT NOT NULL DEFAULT 'ativo',
          avatar_url TEXT,
          position_id TEXT,
          client_id TEXT,
          is_partner INTEGER DEFAULT 1,
          job_title TEXT DEFAULT 'Administrador',
          workspace_id TEXT DEFAULT 'ws_default',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status, workspace_id, job_title)
        VALUES ('usr_anderson', 'Anderson Barboza', 'anderson@agencia.com', '$2b$10$TNXA4RoTuecRRLfUst11TO9DmCBfbTQK1Id/dseBjOqGu3jFGfbI6', 'ADMINISTRADOR', 'ativo', 'ws_default', 'Administrador');

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT
        );
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
            boundParams = values.map((val) => (val === undefined ? null : val));
            return this;
          },
          async all<T = any>() {
            try {
              const stmt = sqlite.prepare(query);
              const rows = stmt.all(...boundParams) as any[];
              const plainRows = rows.map((r) => (r && typeof r === 'object' ? { ...r } : r));
              return { results: plainRows as T[], success: true };
            } catch (err: any) {
              console.error('[D1 Local all]:', query, err?.message);
              return { results: [] as T[], success: false, error: err?.message };
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
              console.error('[D1 Local first]:', query, err?.message);
              return null;
            }
          },
          async run() {
            try {
              const stmt = sqlite.prepare(query);
              const info = stmt.run(...boundParams);
              return { success: true, meta: info };
            } catch (err: any) {
              console.error('[D1 Local run]:', query, err?.message);
              return { success: false, meta: {}, error: err?.message };
            }
          },
        };
      },
      async batch(statements: D1PreparedStatement[]) {
        const results = [];
        for (const s of statements) results.push(await s.run());
        return results;
      },
      async exec(query: string) {
        return sqlite.exec(query);
      },
    };
    return localDbInstance;
  }

  // Safe dummy fallback if no local sqlite is available
  localDbInstance = {
    prepare(_query: string): D1PreparedStatement {
      return {
        bind(..._values: any[]) {
          return this;
        },
        async all<T = any>() {
          return { results: [] as T[], success: true };
        },
        async first<T = any>() {
          return null;
        },
        async run() {
          return { success: true, meta: { changes: 0 } };
        },
      };
    },
    async batch() {
      return [];
    },
    async exec() {},
  };
  return localDbInstance;
}

export function getDb(): D1DatabaseInterface {
  // 1. Cloudflare Workers context via OpenNext
  try {
    const ctx = getCloudflareContext();
    const cfDb = (ctx?.env as any)?.DB;
    if (cfDb) {
      return cfDb as D1DatabaseInterface;
    }
  } catch {}

  // 2. Global / process bindings (Cloudflare Workers native)
  if (typeof (globalThis as any).DB !== 'undefined') {
    return (globalThis as any).DB as D1DatabaseInterface;
  }
  if (
    typeof (globalThis as any).process?.env?.DB !== 'undefined' &&
    typeof (globalThis as any).process.env.DB?.prepare === 'function'
  ) {
    return (globalThis as any).process.env.DB as D1DatabaseInterface;
  }

  // 3. Fallback para compilação e testes locais
  return getLocalDatabase();
}
