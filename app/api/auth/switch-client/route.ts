import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, createSessionToken, TOKEN_COOKIE_NAME } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/auth/switch-client - List all clients associated with current user's email
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const wsId = user.workspace_id || 'ws_default';

    // Query clients that have the same email as user or match user.client_id
    const clientsQuery = await db
      .prepare(`
        SELECT id, name, company_name, corporate_name, trade_name, avatar_url, email, status
        FROM clients
        WHERE (lower(email) = lower(?) OR id = ?) AND status != 'arquivado'
        ORDER BY COALESCE(NULLIF(company_name, ''), NULLIF(trade_name, ''), NULLIF(corporate_name, ''), name) ASC
      `)
      .bind(user.email, user.client_id || '')
      .all();

    return NextResponse.json({
      success: true,
      active_client_id: user.client_id,
      clients: clientsQuery.results || [],
    });
  } catch (error: any) {
    console.error('[GET /api/auth/switch-client]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/auth/switch-client - Switch current session to another client
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { client_id } = body;

    if (!client_id) {
      return NextResponse.json({ error: 'ID do cliente é obrigatório.' }, { status: 400 });
    }

    const db = getDb();

    // Verify that the requested client belongs to user's email or workspace
    const targetClient = await db
      .prepare('SELECT id, name, company_name, corporate_name, trade_name, avatar_url, email FROM clients WHERE id = ?')
      .bind(client_id)
      .first<any>();

    if (!targetClient) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    // Security check: non-admins can only switch to clients matching their email or client_id
    if (user.role === 'CLIENTE') {
      const isAllowed =
        targetClient.id === user.client_id ||
        (targetClient.email && targetClient.email.toLowerCase() === user.email.toLowerCase());

      if (!isAllowed) {
        return NextResponse.json({ error: 'Acesso não autorizado a esta empresa.' }, { status: 403 });
      }
    }

    // Update session token with new client_id
    const newToken = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role,
      client_id: targetClient.id,
      workspace_id: user.workspace_id,
    });

    // Also persist client_id in users table for convenience
    await db
      .prepare('UPDATE users SET client_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(targetClient.id, user.id)
      .run();

    await logAudit({
      userId: user.id,
      action: 'SWITCH_CLIENT',
      module: 'AUTH',
      recordId: targetClient.id,
      afterData: { previousClientId: user.client_id, newClientId: targetClient.id, clientName: targetClient.name },
      ipAddress: request.headers.get('x-forwarded-for') || 'local',
    });

    const response = NextResponse.json({
      success: true,
      client_id: targetClient.id,
      client: targetClient,
      token: newToken,
    });

    // Set updated cookie
    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('[POST /api/auth/switch-client]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
