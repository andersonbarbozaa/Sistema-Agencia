import { getAdminFirestore, getAdminAuth } from './firebase-admin';

export { getAdminFirestore, getAdminAuth };

// ============================================================
// INTERFACE DE COMPATIBILIDADE SEGURA (SEM DEPENDÊNCIA DE SQLITE/D1)
// Garante execução 100% segura no Cloudflare Workers e Node.js
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

const safeMockDb: D1DatabaseInterface = {
  prepare(_query: string): D1PreparedStatement {
    return {
      bind(..._values: any[]) {
        return this;
      },
      async all<T = any>() {
        return { results: [] as T[], success: true };
      },
      async first<T = any>(_colName?: string) {
        return null;
      },
      async run() {
        return { success: true, meta: { changes: 0 } };
      },
    };
  },
  async batch(_statements: D1PreparedStatement[]) {
    return [];
  },
  async exec(_query: string) {
    return undefined;
  },
};

export function getDb(): D1DatabaseInterface {
  return safeMockDb;
}

// ============================================================
// HELPERS OFICIAIS DO FIREBASE FIRESTORE (MULTI-TENANT WORKSPACE)
// ============================================================

export async function getFirestoreDoc<T = any>(collection: string, docId: string): Promise<T | null> {
  try {
    const firestore = getAdminFirestore();
    if (!firestore) return null;
    const snap = await firestore.collection(collection).doc(docId).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as T) : null;
  } catch (err: any) {
    console.warn(`[Firestore getDoc Error] ${collection}/${docId}:`, err?.message);
    return null;
  }
}

export async function setFirestoreDoc<T extends Record<string, any>>(collection: string, docId: string, data: T): Promise<void> {
  try {
    const firestore = getAdminFirestore();
    if (!firestore) return;
    await firestore.collection(collection).doc(docId).set({
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    console.warn(`[Firestore setDoc Error] ${collection}/${docId}:`, err?.message);
  }
}

export async function queryFirestoreWorkspace<T = any>(collection: string, workspaceId: string): Promise<T[]> {
  try {
    const firestore = getAdminFirestore();
    if (!firestore) return [];
    const snap = await firestore.collection(collection).where('workspace_id', '==', workspaceId).get();
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as T));
  } catch (err: any) {
    console.warn(`[Firestore queryWorkspace Error] ${collection} (workspace: ${workspaceId}):`, err?.message);
    return [];
  }
}
