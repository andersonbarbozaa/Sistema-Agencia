
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getAdminFirestore } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/users - List users (admin only), with role/status filters
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMINISTRADOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    const db = getDb();
    const wsId = user.workspace_id || 'ws_default';
    const conditions: string[] = [
      '(u.workspace_id = ? OR (u.workspace_id IS NULL AND ? = "ws_default"))'
    ];
    const params: unknown[] = [wsId, wsId];

    if (role) {
      conditions.push('u.role = ?');
      params.push(role);
    }
    if (status) {
      conditions.push('u.status = ?');
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const users = await db
      .prepare(
        `SELECT
          u.id, u.name, u.email, u.role, u.status, u.phone, u.avatar_url,
          u.position_id, u.client_id, u.is_partner, u.job_title, u.workspace_id,
          u.created_at, u.updated_at,
          p.name as position_name
        FROM users u
        LEFT JOIN positions p ON p.id = u.position_id
        ${where}
        ORDER BY u.name ASC`
      )
      .bind(...params)
      .all();

    let userList = users.results || [];

    // Fallback: busca diretamente no Firestore caso o cache SQLite ainda não contenha os usuários
    if (userList.length === 0) {
      try {
        const firestore = getAdminFirestore();
        if (firestore) {
          const snap = await firestore.collection('users').where('workspace_id', '==', wsId).get();
          if (!snap.empty) {
            userList = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any;
          }
        }
      } catch (fsErr) {
        console.warn('[GET /api/users Firestore fallback warning]:', fsErr);
      }
    }

    return NextResponse.json({ users: userList, data: userList });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users - Create user (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMINISTRADOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { name, email, password, role, status, phone, avatar_url, position_id, client_id, is_partner } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios.' }, { status: 400 });
    }

    const db = getDb();

    // Check for duplicate email
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      return NextResponse.json({ error: 'Email já cadastrado.' }, { status: 409 });
    }

    const id = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const wsId = user.workspace_id || 'ws_default';
    const hashedPassword = await hashPassword(password);
    const jobTitle = body.job_title || (role === 'ADMINISTRADOR' ? 'Administrador' : 'Colaborador');

    await db
      .prepare(
        `INSERT INTO users
          (id, name, email, password_hash, role, status, phone, avatar_url, position_id, client_id, is_partner, job_title, workspace_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        name,
        email,
        hashedPassword,
        role ?? 'COLABORADOR',
        status ?? 'ativo',
        phone ?? null,
        avatar_url ?? null,
        position_id ?? null,
        client_id ?? null,
        is_partner ? 1 : 0,
        jobTitle,
        wsId,
        now,
        now
      )
      .run();

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      module: 'USERS',
      recordId: id,
      afterData: { name, email, role: role ?? 'COLABORADOR' },
    });

    const created = await db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.status, u.phone, u.avatar_url,
          u.position_id, u.client_id, u.is_partner, u.created_at, u.updated_at, p.name as position_name
        FROM users u
        LEFT JOIN positions p ON p.id = u.position_id
        WHERE u.id = ?`
      )
      .bind(id)
      .first();

    return NextResponse.json({ data: created, user: created }, { status: 201 });
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
