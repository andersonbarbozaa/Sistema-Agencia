import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
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
    const search = searchParams.get('search')?.toLowerCase().trim() || '';

    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';

    const [usersSnap, posSnap] = await Promise.all([
      firestore.collection('users').get(),
      firestore.collection('positions').get(),
    ]);

    const posMap: Record<string, string> = {};
    posSnap.docs.forEach((d: any) => { posMap[d.id] = d.data().name; });

    let userList = usersSnap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((u: any) => {
        if (wsId === 'ws_default') {
          return !u.workspace_id || u.workspace_id === 'ws_default';
        }
        return u.workspace_id === wsId;
      });

    if (role && role !== 'todos') {
      userList = userList.filter((u: any) => u.role === role);
    }
    if (status && status !== 'todos') {
      userList = userList.filter((u: any) => u.status === status);
    }
    if (search) {
      userList = userList.filter((u: any) =>
        (u.name && u.name.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search))
      );
    }

    userList = userList.map((u: any) => {
      const { password_hash, ...safeUser } = u;
      return {
        ...safeUser,
        position_name: u.position_id ? (posMap[u.position_id] || null) : null,
      };
    });

    userList.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    return NextResponse.json({ users: userList, data: userList });
  } catch (error: any) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users - Create user (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMINISTRADOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { name, email, password, role, status, phone, avatar_url, position_id, client_id, is_partner, job_title } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios.' }, { status: 400 });
    }

    const firestore = getAdminFirestore();

    // Check for duplicate email
    const existingSnap = await firestore
      .collection('users')
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json({ error: 'Email já cadastrado.' }, { status: 409 });
    }

    const id = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const wsId = user.workspace_id || 'ws_default';
    const password_hash = await hashPassword(password);

    const newUser = {
      id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
      role: role ?? 'COLABORADOR',
      status: status ?? 'ativo',
      phone: phone ?? null,
      avatar_url: avatar_url ?? null,
      position_id: position_id ?? null,
      client_id: client_id ?? null,
      is_partner: is_partner ? 1 : 0,
      job_title: job_title ?? null,
      workspace_id: wsId,
      created_at: now,
      updated_at: now,
    };

    await firestore.collection('users').doc(id).set(newUser);

    await logAudit(user.id, 'users', 'CREATE', id, { name, email, role });

    const { password_hash: _, ...safeUser } = newUser;
    return NextResponse.json({ data: safeUser, user: safeUser }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/users error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
