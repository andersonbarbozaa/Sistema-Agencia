import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/clients/portal-user?client_id=...
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    const db = getDb();
    const wsId = user.workspace_id || 'ws_default';

    let query = `
      SELECT u.id, u.name, u.email, u.phone, u.status, u.client_id, u.created_at, u.updated_at,
             c.name as client_name
      FROM users u
      LEFT JOIN clients c ON c.id = u.client_id
      WHERE u.role = 'CLIENTE'
        AND (u.workspace_id = ? OR (u.workspace_id IS NULL AND ? = 'ws_default'))
    `;
    const params: unknown[] = [wsId, wsId];

    if (clientId) {
      query += ' AND u.client_id = ?';
      params.push(clientId);
    }

    query += ' ORDER BY u.created_at DESC';

    const res = await db.prepare(query).bind(...params).all<any>();
    return NextResponse.json({ users: res.results || [] });
  } catch (error: any) {
    console.error('[GET portal-user error]:', error);
    return NextResponse.json({ error: 'Erro ao buscar usuários do portal.' }, { status: 500 });
  }
}

// POST /api/clients/portal-user
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getApiUser(request);
    if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    if (currentUser.role === 'CLIENTE') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

    const body = await request.json();
    const { client_id, name, email, password, phone } = body;

    if (!client_id || !email || !password) {
      return NextResponse.json(
        { error: 'Cliente, e-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve conter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDb();
    const wsId = currentUser.workspace_id || 'ws_default';

    // Verify client exists
    const client = await db.prepare('SELECT id, name FROM clients WHERE id = ?').bind(client_id).first<any>();
    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    // Check duplicate email
    const existing = await db
      .prepare('SELECT id FROM users WHERE lower(email) = ?')
      .bind(cleanEmail)
      .first();

    if (existing) {
      return NextResponse.json(
        { error: 'Este e-mail já está cadastrado no sistema.' },
        { status: 409 }
      );
    }

    const id = 'usr_cli_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const hashedPassword = await hashPassword(password);
    const resolvedName = (name && name.trim()) ? name.trim() : client.name;

    await db
      .prepare(`
        INSERT INTO users
          (id, name, email, password_hash, role, status, phone, client_id, job_title, workspace_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'CLIENTE', 'ativo', ?, ?, 'Cliente', ?, ?, ?)
      `)
      .bind(
        id,
        resolvedName,
        cleanEmail,
        hashedPassword,
        phone || null,
        client_id,
        wsId,
        now,
        now
      )
      .run();

    await logAudit({
      userId: currentUser.id,
      action: 'CREATE_CLIENT_USER',
      module: 'CLIENTS',
      recordId: id,
      afterData: { name: resolvedName, email: cleanEmail, client_id, client_name: client.name },
    });

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const loginUrl = `${protocol}://${host}/login?portal=cliente`;

    const inviteMessage = `Olá, ${resolvedName}! Seu acesso ao Portal do Cliente da agência está pronto.\n\n🔗 Link de Acesso: ${loginUrl}\n📧 E-mail: ${cleanEmail}\n🔑 Senha: ${password}\n\nNo portal você pode aprovar, reprovar e acompanhar todas as suas demandas em tempo real.`;

    return NextResponse.json({
      success: true,
      user: {
        id,
        name: resolvedName,
        email: cleanEmail,
        client_id,
        client_name: client.name,
      },
      credentials: {
        email: cleanEmail,
        password,
        login_url: loginUrl,
      },
      invite_message: inviteMessage,
    });
  } catch (error: any) {
    console.error('[POST portal-user error]:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar usuário do portal.' }, { status: 500 });
  }
}
