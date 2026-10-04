
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createSessionToken, createFirebaseCustomToken, TOKEN_COOKIE_NAME } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const db = getDb();
    const user = await db
      .prepare(`
        SELECT u.*, p.name as position_name, c.name as client_name,
               w.name as workspace_name, w.description as workspace_description, w.invite_code as workspace_invite_code
        FROM users u
        LEFT JOIN workspaces w ON u.workspace_id = w.id
        LEFT JOIN positions p ON u.position_id = p.id
        LEFT JOIN clients c ON u.client_id = c.id
        WHERE lower(u.email) = lower(?) AND u.status = 'ativo'
      `)
      .bind(email.trim())
      .first<any>();

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas ou usuário inativo.' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role,
      client_id: user.client_id,
      workspace_id: user.workspace_id,
    });

    const firebaseToken = await createFirebaseCustomToken(user.id, {
      role: user.role,
      workspaceId: user.workspace_id,
    });

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      module: 'AUTH',
      recordId: user.id,
      afterData: { email: user.email, role: user.role },
      ipAddress: request.headers.get('x-forwarded-for') || 'local',
    });

    // Remove sensitive password hash
    const { password_hash, ...safeUser } = user;

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      token,
      firebase_token: firebaseToken,
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('[Login API Error]:', err);
    return NextResponse.json({ error: 'Erro interno ao realizar login.' }, { status: 500 });
  }
}
