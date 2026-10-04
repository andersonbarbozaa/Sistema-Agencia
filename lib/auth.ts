import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getDb } from './db';
import { getAdminAuth, getAdminFirestore } from './firebase-admin';
import { User, UserRole } from '@/types';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'super_secret_jwt_key_creative_agency_2026_change_in_production';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const TOKEN_COOKIE_NAME = 'agencia_auth_token';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (err) {
    return false;
  }
}

// Sincroniza usuário com o Firebase Auth
export async function syncUserWithFirebaseAuth(user: {
  id: string;
  email: string;
  password?: string;
  name?: string;
  role: string;
  workspaceId?: string;
}): Promise<void> {
  try {
    const auth = getAdminAuth();
    if (!auth) return;

    try {
      // Verifica se o usuário já existe no Firebase Auth
      await auth.getUser(user.id);
      // Atualiza claims e dados
      await auth.setCustomUserClaims(user.id, {
        role: user.role,
        workspaceId: user.workspaceId,
      });
      if (user.name) {
        await auth.updateUser(user.id, { displayName: user.name });
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // Cria usuário no Firebase Auth
        await auth.createUser({
          uid: user.id,
          email: user.email,
          password: user.password && user.password.length >= 6 ? user.password : undefined,
          displayName: user.name,
        });
        await auth.setCustomUserClaims(user.id, {
          role: user.role,
          workspaceId: user.workspaceId,
        });
      }
    }
  } catch (err) {
    console.warn('[Firebase Auth Sync Warning]:', err);
  }
}

export async function createSessionToken(user: {
  id: string;
  email: string;
  role: UserRole;
  client_id?: string | null;
  workspace_id?: string | null;
}): Promise<string> {
  return new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    clientId: user.client_id || null,
    workspaceId: user.workspace_id || null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

// Gera Firebase Custom Token para login no frontend
export async function createFirebaseCustomToken(userId: string, claims?: Record<string, any>): Promise<string | null> {
  try {
    const auth = getAdminAuth();
    if (auth) {
      return await auth.createCustomToken(userId, claims);
    }
  } catch (err) {
    console.warn('[Firebase Custom Token Error]:', err);
  }
  return null;
}

export async function verifySessionToken(token: string): Promise<{
  userId: string;
  email: string;
  role: UserRole;
  clientId?: string | null;
  workspaceId?: string | null;
} | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as any;
  } catch (err) {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    const db = getDb();
    let user = await db
      .prepare(`
        SELECT u.id, u.name, u.email, u.avatar_url, u.phone, u.role, u.position_id, u.client_id, u.is_partner, u.status, u.created_at, u.updated_at,
               u.workspace_id, u.job_title,
               w.name as workspace_name, w.description as workspace_description, w.invite_code as workspace_invite_code,
               p.name as position_name, c.name as client_name
          FROM users u
          LEFT JOIN workspaces w ON u.workspace_id = w.id
          LEFT JOIN positions p ON u.position_id = p.id
          LEFT JOIN clients c ON u.client_id = c.id
         WHERE u.id = ? AND u.status = 'ativo'
      `)
      .bind(payload.userId)
      .first<User>();

    if (!user) {
      try {
        const firestore = getAdminFirestore();
        if (firestore) {
          const doc = await firestore.collection('users').doc(payload.userId).get();
          if (doc.exists) {
            user = doc.data() as User;
          }
        }
      } catch {}
    }

    return user ? { ...user } : null;
  } catch (err) {
    return null;
  }
}

export async function getApiUser(request: Request): Promise<User | null> {
  try {
    // Check Authorization header first
    const authHeader = request.headers.get('authorization');
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Check cookies
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`(^|;\\s*)${TOKEN_COOKIE_NAME}=([^;]*)`));
      if (match) {
        token = match[2];
      }
    }

    if (!token) return null;

    // First try internal session token
    let payload = await verifySessionToken(token);
    let userId = payload?.userId;

    // If not valid JWT, check if it is a Firebase ID Token
    if (!userId) {
      try {
        const auth = getAdminAuth();
        if (auth) {
          const decoded = await auth.verifyIdToken(token);
          userId = decoded.uid;
        }
      } catch {}
    }

    if (!userId) return null;

    const db = getDb();
    let user = await db
      .prepare(`
        SELECT u.id, u.name, u.email, u.avatar_url, u.phone, u.role, u.position_id, u.client_id, u.is_partner, u.status, u.created_at, u.updated_at,
               u.workspace_id, u.job_title,
               w.name as workspace_name, w.description as workspace_description, w.invite_code as workspace_invite_code,
               p.name as position_name, c.name as client_name
          FROM users u
          LEFT JOIN workspaces w ON u.workspace_id = w.id
          LEFT JOIN positions p ON u.position_id = p.id
          LEFT JOIN clients c ON u.client_id = c.id
         WHERE u.id = ? AND u.status = 'ativo'
      `)
      .bind(userId)
      .first<User>();

    if (!user) {
      try {
        const firestore = getAdminFirestore();
        if (firestore) {
          const doc = await firestore.collection('users').doc(userId).get();
          if (doc.exists) {
            user = doc.data() as User;
          }
        }
      } catch {}
    }

    return user ? { ...user } : null;
  } catch (err) {
    return null;
  }
}

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'ADMINISTRADOR';
}

export function isCollaborator(user: User | null | undefined): boolean {
  return user?.role === 'COLABORADOR';
}

export function isClient(user: User | null | undefined): boolean {
  return user?.role === 'CLIENTE';
}

export { TOKEN_COOKIE_NAME };
