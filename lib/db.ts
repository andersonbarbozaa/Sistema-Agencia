import { getAdminFirestore, getAdminAuth } from './firebase-admin';
import { createRequire } from 'module';

export { getAdminFirestore, getAdminAuth };

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

// Global cached connection
let localDbInstance: D1DatabaseInterface | null = null;
let isHydrating = false;

// Sincronização em segundo plano para o Firebase Firestore
async function syncOperationToFirestore(sql: string, params: any[]) {
  try {
    const trimmed = sql.trim();
    const firestore = getAdminFirestore();
    if (!firestore) return;

    // Detectar INSERT / INSERT OR REPLACE / INSERT OR IGNORE INTO <table>
    const insertMatch = trimmed.match(/^INSERT\s+(?:OR\s+(?:REPLACE|IGNORE)\s+)?INTO\s+([a-zA-Z0-9_]+)\s*\(([\s\S]+?)\)\s*VALUES\s*\(([\s\S]+?)\)/i);
    if (insertMatch) {
      const table = insertMatch[1].toLowerCase();
      const cols = insertMatch[2].split(',').map(c => c.trim().toLowerCase());
      const record: Record<string, any> = {};
      
      cols.forEach((col, idx) => {
        if (idx < params.length) {
          record[col] = params[idx];
        }
      });

      const docId = record.id || record.key || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await firestore.collection(table).doc(String(docId)).set({
        ...record,
        _syncedAt: new Date().toISOString(),
      }, { merge: true });
      console.log(`[Firestore Sync Success] Inserido documento ${table}/${docId}`);
      return;
    }

    // Detectar UPDATE <table> SET ... WHERE id = ?
    const updateMatch = trimmed.match(/^UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+([\s\S]+?)\s+WHERE\s+([\s\S]+)$/i);
    if (updateMatch) {
      const table = updateMatch[1].toLowerCase();
      if (params.length > 0) {
        // O último parâmetro normalmente é o ID do WHERE
        const id = String(params[params.length - 1]);
        if (id) {
          const docRef = firestore.collection(table).doc(id);
          const updateData: Record<string, any> = { _updatedAt: new Date().toISOString() };
          await docRef.set(updateData, { merge: true });
          console.log(`[Firestore Sync Success] Atualizado documento ${table}/${id}`);
        }
      }
      return;
    }

    // Detectar DELETE FROM <table> WHERE id = ?
    const deleteMatch = trimmed.match(/^DELETE\s+FROM\s+([a-zA-Z0-9_]+)\s+WHERE\s+id\s*=\s*\?/i);
    if (deleteMatch && params.length > 0) {
      const table = deleteMatch[1].toLowerCase();
      const id = String(params[0]);
      await firestore.collection(table).doc(id).delete();
      console.log(`[Firestore Sync Success] Removido documento ${table}/${id}`);
      return;
    }
  } catch (err: any) {
    console.error('[Firestore Sync Error]:', err?.message);
  }
}

// Hidratação a partir do Firestore para alimentar o cache SQLite no boot
async function hydrateFromFirestore(sqlite: any) {
  if (isHydrating) return;
  isHydrating = true;
  try {
    const firestore = getAdminFirestore();
    if (!firestore) return;

    // 1. Sincronizar Workspaces
    const wsSnap = await firestore.collection('workspaces').get();
    for (const doc of wsSnap.docs) {
      const d = doc.data();
      sqlite.prepare(`
        INSERT OR REPLACE INTO workspaces (id, name, description, owner_id, invite_code, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        d.id || doc.id,
        d.name || 'Área de Trabalho',
        d.description || null,
        d.owner_id || null,
        d.invite_code || d.id || doc.id,
        d.created_at || new Date().toISOString(),
        d.updated_at || new Date().toISOString()
      );
    }

    // 2. Sincronizar Usuários
    const usersSnap = await firestore.collection('users').get();
    for (const doc of usersSnap.docs) {
      const u = doc.data();
      sqlite.prepare(`
        INSERT OR REPLACE INTO users (
          id, name, email, password_hash, phone, role, status, avatar_url, position_id, client_id, is_partner, job_title, workspace_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        u.id || doc.id,
        u.name || '',
        u.email || '',
        u.password_hash || null,
        u.phone || null,
        u.role || 'COLABORADOR',
        u.status || 'ativo',
        u.avatar_url || null,
        u.position_id || null,
        u.client_id || null,
        u.is_partner || (u.role === 'ADMINISTRADOR' ? 1 : 0),
        u.job_title || 'Colaborador',
        u.workspace_id || null,
        u.created_at || new Date().toISOString(),
        u.updated_at || new Date().toISOString()
      );
    }

    if (wsSnap.size > 0 || usersSnap.size > 0) {
      console.log(`[Firestore Hydration] Carregados ${wsSnap.size} workspaces e ${usersSnap.size} usuários do Firestore para o banco local.`);
    }
  } catch (err: any) {
    console.warn('[Firestore Hydration Warning]:', err?.message);
  } finally {
    isHydrating = false;
  }
}

function initDatabaseSchema(sqlite: any) {
  sqlite.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

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

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'COLABORADOR',
      status TEXT NOT NULL DEFAULT 'ativo',
      avatar_url TEXT,
      position_id TEXT,
      client_id TEXT,
      is_partner INTEGER DEFAULT 0,
      job_title TEXT DEFAULT 'Administrador',
      workspace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trade_name TEXT,
      corporate_name TEXT,
      document TEXT,
      email TEXT,
      phone TEXT,
      city TEXT,
      state TEXT,
      notes TEXT,
      responsible_name TEXT,
      status TEXT NOT NULL DEFAULT 'ativo',
      avatar_url TEXT,
      workspace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      client_id TEXT,
      status TEXT NOT NULL DEFAULT 'Em andamento',
      deadline TEXT,
      value REAL DEFAULT 0,
      workspace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'Não iniciada',
      client_id TEXT,
      project_id TEXT,
      category_id TEXT,
      delivery_date TEXT,
      completed_at TEXT,
      value REAL DEFAULT 0,
      notes TEXT,
      created_by TEXT,
      workspace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_assignees (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'comment',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_media_links (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT,
      url TEXT NOT NULL,
      media_type TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_deletion_requests (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      review_notes TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      workspace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS financial_transactions (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category_id TEXT,
      bank_account_id TEXT,
      client_id TEXT,
      due_date TEXT NOT NULL,
      paid_at TEXT,
      status TEXT NOT NULL DEFAULT 'Pendente',
      created_by TEXT,
      partner_name TEXT,
      workspace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS financial_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT DEFAULT '#10B981',
      workspace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bank_name TEXT,
      initial_balance REAL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'BRL',
      status TEXT DEFAULT 'ativo',
      workspace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      client_id TEXT,
      monthly_value REAL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'ativo',
      file_url TEXT,
      workspace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_leads (
      id TEXT PRIMARY KEY,
      contact_name TEXT NOT NULL,
      company TEXT,
      phone TEXT,
      email TEXT,
      city TEXT,
      platform TEXT,
      status TEXT DEFAULT 'Primeiro contato',
      notes TEXT,
      assignee_id TEXT,
      last_activity_at TEXT DEFAULT (datetime('now')),
      workspace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_interactions (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      user_id TEXT,
      platform TEXT DEFAULT 'WhatsApp',
      notes TEXT,
      interaction_date TEXT DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      client_id TEXT,
      project_id TEXT,
      event_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      google_event_id TEXT,
      workspace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      link TEXT,
      read_at TEXT,
      workspace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      workspace_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      record_id TEXT,
      before_data TEXT,
      after_data TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_interpretations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      input_text TEXT,
      audio_url TEXT,
      raw_interpretation TEXT,
      status TEXT DEFAULT 'Pendente',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      dismissed_at TEXT
    );

    -- Default workspace & settings & admin user
    INSERT OR IGNORE INTO workspaces (id, name, description, owner_id, invite_code)
    VALUES ('ws_default', 'PixelCraft Studio', 'Agência Audiovisual & Criativa', 'usr_anderson', 'pixelcraft');

    INSERT OR IGNORE INTO users (
      id, name, email, password_hash, phone, role, status, is_partner, job_title, workspace_id, created_at, updated_at
    ) VALUES (
      'usr_anderson',
      'Anderson Barboza',
      'anderson@agencia.com',
      '$2b$10$TNXA4RoTuecRRLfUst11TO9DmCBfbTQK1Id/dseBjOqGu3jFGfbI6',
      '11999999999',
      'ADMINISTRADOR',
      'ativo',
      1,
      'Diretor Executivo',
      'ws_default',
      datetime('now'),
      datetime('now')
    );

    INSERT OR IGNORE INTO settings (key, value, description) VALUES
    ('monthly_revenue_goal', '50000', 'Meta mensal de receita da agência'),
    ('default_currency', 'BRL', 'Moeda padrão do sistema (BRL, USD, EUR)'),
    ('exchange_rate_usd', '5.65', 'Taxa de conversão USD para moeda padrão'),
    ('exchange_rate_eur', '6.15', 'Taxa de conversão EUR para moeda padrão');
  `);
}

function getDatabase(): D1DatabaseInterface {
  if (localDbInstance) {
    return localDbInstance;
  }

  let sqlite: any = null;

  try {
    const req = createRequire(import.meta.url);
    const sqliteMod = req('node:sqlite');
    if (sqliteMod && sqliteMod.DatabaseSync) {
      const fs = req('node:fs');
      const path = req('node:path');
      const cwd = (globalThis as any).process?.cwd ? (globalThis as any).process.cwd() : '.';
      const dataDir = path.join(cwd, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.join(dataDir, 'local.sqlite');
      try {
        sqlite = new sqliteMod.DatabaseSync(dbPath);
        console.log(`[Database] SQLite local inicializado com sucesso em: ${dbPath}`);
      } catch (fileErr) {
        console.warn(`[Database] Falha ao abrir ${dbPath}, utilizando :memory::`, fileErr);
        sqlite = new sqliteMod.DatabaseSync(':memory:');
      }
    }
  } catch (err: any) {
    console.warn('[Database] node:sqlite via createRequire não disponível, tentando getBuiltinModule:', err?.message);
    try {
      const getMod = (globalThis as any).process?.getBuiltinModule;
      if (getMod) {
        const sqliteMod = getMod('node:sqlite');
        if (sqliteMod?.DatabaseSync) {
          sqlite = new sqliteMod.DatabaseSync(':memory:');
        }
      }
    } catch {}
  }

  if (!sqlite) {
    console.warn('[Database Fallback] node:sqlite não disponível no ambiente Node.js. Inicializando driver em memória resiliente.');
    const memoryTables: Record<string, any[]> = {};
    sqlite = {
      exec: (_query: string) => {},
      prepare: (_query: string) => ({
        all: (..._params: any[]) => [],
        get: (..._params: any[]) => null,
        run: (..._params: any[]) => ({ changes: 1, lastInsertRowid: 1 })
      })
    };
  }

  initDatabaseSchema(sqlite);

  // Executa hidratação inicial do Firestore em background
  hydrateFromFirestore(sqlite).catch(() => {});

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
            console.error('[Database Query Error - all]:', query, boundParams, err);
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
            console.error('[Database Query Error - first]:', query, boundParams, err);
            throw err;
          }
        },
        async run() {
          try {
            const stmt = sqlite.prepare(query);
            const info = stmt.run(...boundParams);
            // Sincroniza diretamente com o Firebase Firestore
            syncOperationToFirestore(query, boundParams).catch(() => {});
            return { success: true, meta: info };
          } catch (err: any) {
            console.error('[Database Query Error - run]:', query, boundParams, err);
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

  return localDbInstance;
}

export function getDb(): D1DatabaseInterface {
  return getDatabase();
}

// Helpers diretos para Firebase Firestore com suporte multi-tenant de Workspace
export async function getFirestoreDoc<T = any>(collection: string, docId: string): Promise<T | null> {
  const firestore = getAdminFirestore();
  const snap = await firestore.collection(collection).doc(docId).get();
  return snap.exists ? (snap.data() as T) : null;
}

export async function setFirestoreDoc<T extends Record<string, any>>(collection: string, docId: string, data: T): Promise<void> {
  const firestore = getAdminFirestore();
  await firestore.collection(collection).doc(docId).set({
    ...data,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function queryFirestoreWorkspace<T = any>(collection: string, workspaceId: string): Promise<T[]> {
  const firestore = getAdminFirestore();
  const snap = await firestore.collection(collection).where('workspace_id', '==', workspaceId).get();
  return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as T));
}
