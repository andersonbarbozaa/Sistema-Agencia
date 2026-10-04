import { NextResponse } from 'next/server';
import { getDb, getAdminFirestore } from '@/lib/db';
import { verifyPassword, createSessionToken, createFirebaseCustomToken, TOKEN_COOKIE_NAME } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDb();
    let user = await db
      .prepare(`
        SELECT u.*, p.name as position_name, c.name as client_name,
               w.name as workspace_name, w.description as workspace_description, w.invite_code as workspace_invite_code
        FROM users u
        LEFT JOIN workspaces w ON u.workspace_id = w.id
        LEFT JOIN positions p ON u.position_id = p.id
        LEFT JOIN clients c ON u.client_id = c.id
        WHERE lower(u.email) = ? AND u.status = 'ativo'
      `)
      .bind(cleanEmail)
      .first<any>();

    // Fallback: Procura no Firestore se não encontrado no banco local
    if (!user) {
      try {
        const firestore = getAdminFirestore();
        if (firestore) {
          const userSnap = await firestore.collection('users').where('email', '==', cleanEmail).limit(1).get();
          if (!userSnap.empty) {
            const fsUser = userSnap.docs[0].data();
            user = {
              ...fsUser,
              id: fsUser.id || userSnap.docs[0].id,
            };

            // Se o usuário tem senha gravada e workspace, sincroniza para o SQLite local
            if (user && user.password_hash) {
              try {
                await db
                  .prepare(`
                    INSERT OR REPLACE INTO users (
                      id, name, email, password_hash, phone, role, job_title, workspace_id, is_partner, status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                  `)
                  .bind(
                    user.id,
                    user.name || '',
                    cleanEmail,
                    user.password_hash,
                    user.phone || null,
                    user.role || 'COLABORADOR',
                    user.job_title || 'Colaborador',
                    user.workspace_id || null,
                    user.is_partner || (user.role === 'ADMINISTRADOR' ? 1 : 0),
                    user.status || 'ativo'
                  )
                  .run();
              } catch (syncErr) {
                console.warn('[Login SQLite Cache Warning]:', syncErr);
              }
            }
          }
        }
      } catch (fsErr) {
        console.warn('[Login Firestore Lookup Warning]:', fsErr);
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas ou usuário inativo.' }, { status: 401 });
    }

    if (user.password_hash) {
      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
      }
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
