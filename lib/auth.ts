import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getDb } from './db';
import { User, UserRole } from '@/types';

export * from './auth-constants';
import { isMasterAdmin } from './auth-constants';

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

export async function createSessionToken(user: { id: string; email: string; role: UserRole; client_id?: string | null; workspace_id?: string | null }): Promise<string> {
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

export async function verifySessionToken(token: string): Promise<{ userId: string; email: string; role: UserRole; clientId?: string | null; workspaceId?: string | null } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as any;
  } catch (err) {
    return null;
  }
}

async function querySessionUserFromDb(
  userId: string,
  payload?: { userId: string; email: string; role: UserRole; clientId?: string | null; workspaceId?: string | null }
): Promise<User | null> {
  const db = getDb();
  try {
    await db.prepare('ALTER TABLE workspaces ADD COLUMN logo_url TEXT').run();
  } catch {
    // Ignore if column already exists
  }
  try {
    await db.prepare('ALTER TABLE clients ADD COLUMN company_name TEXT').run();
  } catch {
    // Ignore if column already exists
  }

  const runUserLookup = async (whereClause: string, bindVal: string): Promise<User | null> => {
    try {
      return await db
        .prepare(`
          SELECT u.id, u.name, u.email, u.avatar_url, u.phone, u.role, u.position_id, u.client_id, u.is_partner, u.status, u.created_at, u.updated_at,
                 u.workspace_id, u.job_title,
                 w.name as workspace_name, w.description as workspace_description, w.logo_url as workspace_logo, w.invite_code as workspace_invite_code,
                 p.name as position_name, COALESCE(NULLIF(c.company_name, ''), NULLIF(c.trade_name, ''), NULLIF(c.corporate_name, ''), c.name) as client_name
          FROM users u
          LEFT JOIN workspaces w ON COALESCE(u.workspace_id, 'ws_default') = w.id
          LEFT JOIN positions p ON u.position_id = p.id
          LEFT JOIN clients c ON u.client_id = c.id
          WHERE ${whereClause} AND u.status = 'ativo'
        `)
        .bind(bindVal)
        .first<User>();
    } catch {
      try {
        return await db
          .prepare(`
            SELECT u.id, u.name, u.email, u.avatar_url, u.phone, u.role, u.position_id, u.client_id, u.is_partner, u.status, u.created_at, u.updated_at,
                   u.workspace_id, u.job_title,
                   w.name as workspace_name, w.description as workspace_description, w.invite_code as workspace_invite_code,
                   p.name as position_name, COALESCE(NULLIF(c.trade_name, ''), NULLIF(c.corporate_name, ''), c.name) as client_name
            FROM users u
            LEFT JOIN workspaces w ON COALESCE(u.workspace_id, 'ws_default') = w.id
            LEFT JOIN positions p ON u.position_id = p.id
            LEFT JOIN clients c ON u.client_id = c.id
            WHERE ${whereClause} AND u.status = 'ativo'
          `)
          .bind(bindVal)
          .first<User>();
      } catch {
        return await db
          .prepare(`
            SELECT u.id, u.name, u.email, u.avatar_url, u.phone, u.role, u.position_id, u.client_id, u.is_partner, u.status, u.created_at, u.updated_at,
                   u.workspace_id, u.job_title
            FROM users u
            WHERE ${whereClause} AND u.status = 'ativo'
          `)
          .bind(bindVal)
          .first<User>();
      }
    }
  };

  let user = await runUserLookup('u.id = ?', userId);

  // Fallback by email if user ID changed after re-seed or migration
  if (!user && payload?.email) {
    user = await runUserLookup('lower(u.email) = lower(?)', payload.email.trim());
  }

  // Auto-provision if valid JWT exists (or Master Admin) but local DB instance was reset
  if (!user && payload?.email && payload?.userId) {
    const cleanEmail = payload.email.trim().toLowerCase();
    const wsId = payload.workspaceId || 'ws_default';
    const role: UserRole = isMasterAdmin({ email: cleanEmail })
      ? 'ADMINISTRADOR'
      : (payload.role || 'ADMINISTRADOR');
    const defaultName = isMasterAdmin({ email: cleanEmail })
      ? 'Anderson Barboza'
      : cleanEmail.split('@')[0];
    const defaultHash = '$2b$10$TNXA4RoTuecRRLfUst11TO9DmCBfbTQK1Id/dseBjOqGu3jFGfbI6';

    try {
      await db
        .prepare(`
          INSERT OR IGNORE INTO workspaces (id, name, description, owner_id, invite_code)
          VALUES (?, 'PixelCraft Studio', 'Agência Audiovisual & Criativa', ?, ?)
        `)
        .bind(wsId, payload.userId, wsId === 'ws_default' ? 'pixelcraft' : `inv_${wsId}`)
        .run();
    } catch {}

    try {
      await db
        .prepare(`
          INSERT OR IGNORE INTO users (id, name, email, password_hash, role, client_id, status, workspace_id, job_title)
          VALUES (?, ?, ?, ?, ?, ?, 'ativo', ?, ?)
        `)
        .bind(
          payload.userId,
          defaultName,
          cleanEmail,
          defaultHash,
          role,
          payload.clientId || null,
          wsId,
          role === 'ADMINISTRADOR' ? 'Administrador' : role === 'CLIENTE' ? 'Cliente' : 'Colaborador'
        )
        .run();
      user = await runUserLookup('u.id = ?', payload.userId);
    } catch {}
  }

  return user;
}

async function resolveClientInfoForUser(user: User, payloadClientId?: string | null): Promise<void> {
  if (user.role !== 'CLIENTE') return;
  const db = getDb();
  try {
    if (payloadClientId && payloadClientId !== user.client_id) {
      user.client_id = payloadClientId;
      const cRow = await db
        .prepare("SELECT COALESCE(NULLIF(company_name, ''), NULLIF(trade_name, ''), NULLIF(corporate_name, ''), name) as name FROM clients WHERE id = ?")
        .bind(payloadClientId)
        .first<{ name: string }>()
        .catch(() =>
          db
            .prepare("SELECT COALESCE(NULLIF(trade_name, ''), NULLIF(corporate_name, ''), name) as name FROM clients WHERE id = ?")
            .bind(payloadClientId)
            .first<{ name: string }>()
        );
      if (cRow) user.client_name = cRow.name;
    }
    if (!user.client_id) {
      const match = await db
        .prepare("SELECT id, COALESCE(NULLIF(company_name, ''), NULLIF(trade_name, ''), NULLIF(corporate_name, ''), name) as name FROM clients WHERE lower(email) = lower(?) OR id = ? LIMIT 1")
        .bind(user.email, user.id)
        .first<any>()
        .catch(() =>
          db
            .prepare("SELECT id, COALESCE(NULLIF(trade_name, ''), NULLIF(corporate_name, ''), name) as name FROM clients WHERE lower(email) = lower(?) OR id = ? LIMIT 1")
            .bind(user.email, user.id)
            .first<any>()
        );
      if (match) {
        user.client_id = match.id;
        user.client_name = match.name;
      }
    }
  } catch {
    // Ignore client resolution errors
  }
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    const user = await querySessionUserFromDb(payload.userId, payload);
    if (!user) return null;

    await resolveClientInfoForUser(user, payload.clientId);

    return { ...user };
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
      // Check cookies from request header
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`(^|;\\s*)${TOKEN_COOKIE_NAME}=([^;]*)`));
      if (match) {
        token = match[2];
      }
    }

    // Fallback to Next.js cookies() helper if header wasn't populated
    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
      } catch {
        // Ignore if outside Next.js request context
      }
    }

    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    const user = await querySessionUserFromDb(payload.userId, payload);
    if (!user) return null;

    await resolveClientInfoForUser(user, payload.clientId);

    return user;
  } catch (err) {
    return null;
  }
}

export { TOKEN_COOKIE_NAME };
