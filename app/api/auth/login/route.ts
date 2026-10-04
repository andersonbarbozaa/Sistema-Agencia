import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { verifyPassword, createSessionToken, createFirebaseCustomToken, TOKEN_COOKIE_NAME, hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const firestore = getAdminFirestore();

    let user: any = null;

    if (firestore) {
      try {
        const userSnap = await firestore.collection('users').where('email', '==', cleanEmail).limit(1).get();
        if (!userSnap.empty) {
          const fsDoc = userSnap.docs[0];
          user = {
            id: fsDoc.id,
            ...fsDoc.data(),
          };
        }
      } catch (fsErr) {
        console.warn('[Login Firestore Error]:', fsErr);
      }
    }

    // Default admin seed se for anderson@agencia.com e ainda não existir no Firestore
    if (!user && cleanEmail === 'anderson@agencia.com') {
      const now = new Date().toISOString();
      const defaultHash = '$2b$10$TNXA4RoTuecRRLfUst11TO9DmCBfbTQK1Id/dseBjOqGu3jFGfbI6'; // admin123
      user = {
        id: 'usr_anderson',
        name: 'Anderson Barboza',
        email: 'anderson@agencia.com',
        password_hash: defaultHash,
        role: 'ADMINISTRADOR',
        status: 'ativo',
        is_partner: 1,
        job_title: 'Diretor Executivo',
        workspace_id: 'ws_default',
        workspace_name: 'PixelCraft Studio',
        created_at: now,
        updated_at: now,
      };

      if (firestore) {
        try {
          await firestore.collection('users').doc('usr_anderson').set(user, { merge: true });
          await firestore.collection('workspaces').doc('ws_default').set({
            id: 'ws_default',
            name: 'PixelCraft Studio',
            description: 'Agência Audiovisual & Criativa',
            owner_id: 'usr_anderson',
            invite_code: 'pixelcraft',
            created_at: now,
            updated_at: now,
          }, { merge: true });
        } catch (e) {
          console.warn('[Admin Seed Firestore Warning]:', e);
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas ou usuário inativo.' }, { status: 401 });
    }

    if (user.status === 'inativo') {
      return NextResponse.json({ error: 'Usuário inativo. Entre em contato com o suporte.' }, { status: 403 });
    }

    if (!user.password_hash) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const wsId = user.workspace_id || 'ws_default';

    // Buscar workspace details no Firestore
    let workspaceName = user.workspace_name || 'PixelCraft Studio';
    if (firestore && wsId) {
      try {
        const wsDoc = await firestore.collection('workspaces').doc(wsId).get();
        if (wsDoc.exists) {
          workspaceName = wsDoc.data()?.name || workspaceName;
        }
      } catch {}
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role,
      client_id: user.client_id,
      workspace_id: wsId,
    });

    const firebaseToken = await createFirebaseCustomToken(user.id, {
      role: user.role,
      workspaceId: wsId,
    });

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      module: 'AUTH',
      recordId: user.id,
      afterData: { email: user.email, role: user.role, workspace_id: wsId },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone || null,
      avatar_url: user.avatar_url || null,
      position_id: user.position_id || null,
      position_name: user.position_name || null,
      client_id: user.client_id || null,
      client_name: user.client_name || null,
      is_partner: user.is_partner || 0,
      job_title: user.job_title || null,
      workspace_id: wsId,
      workspace_name: workspaceName,
    };

    const response = NextResponse.json({
      user: safeUser,
      token,
      firebase_token: firebaseToken,
    });

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
  } catch (error: any) {
    console.error('[POST /api/auth/login]', error);
    return NextResponse.json({ error: error?.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
