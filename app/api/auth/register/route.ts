import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin';
import { hashPassword, createSessionToken, createFirebaseCustomToken, TOKEN_COOKIE_NAME } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      phone,
      company_name,
      company_description,
      job_title,
      invite, // workspace_id or invite_code
      role,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const firestore = getAdminFirestore();
    const auth = getAdminAuth();

    // 1. Verificar se o e-mail já existe no Firestore
    if (firestore) {
      try {
        const firestoreUserSnap = await firestore.collection('users').where('email', '==', cleanEmail).limit(1).get();
        if (!firestoreUserSnap.empty) {
          return NextResponse.json({ error: 'Já existe uma conta cadastrada com este e-mail.' }, { status: 409 });
        }
      } catch (fsCheckErr) {
        console.warn('[Register Firestore Check Warning]:', fsCheckErr);
      }
    }

    // 2. Verificar se o e-mail já existe no Firebase Auth
    if (auth) {
      try {
        const existingAuthUser = await auth.getUserByEmail(cleanEmail);
        if (existingAuthUser) {
          return NextResponse.json({ error: 'Já existe uma conta cadastrada com este e-mail no Firebase Auth.' }, { status: 409 });
        }
      } catch (authCheckErr: any) {
        // auth/user-not-found é o esperado quando o usuário não existe
      }
    }

    const hashedPassword = await hashPassword(password);
    const userId = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();

    let targetWorkspaceId = '';
    let targetWorkspaceName = '';
    let userRole = 'COLABORADOR';
    let userJobTitle = job_title ? job_title.trim() : '';

    // ========================================================
    // CASO A: REGISTO VIA LINK DE CONVITE (MEMBRO DO WORKSPACE)
    // ========================================================
    if (invite && invite.trim()) {
      const inviteCode = invite.trim();
      let workspace: any = null;

      if (firestore) {
        try {
          const docDirect = await firestore.collection('workspaces').doc(inviteCode).get();
          if (docDirect.exists) {
            workspace = { id: docDirect.id, ...docDirect.data() };
          } else {
            const querySnap = await firestore.collection('workspaces').where('invite_code', '==', inviteCode).limit(1).get();
            if (!querySnap.empty) {
              const doc = querySnap.docs[0];
              workspace = { id: doc.id, ...doc.data() };
            }
          }
        } catch (wsFsErr) {
          console.warn('[Register Workspace Lookup Warning]:', wsFsErr);
        }
      }

      if (!workspace && (inviteCode === 'pixelcraft' || inviteCode === 'ws_default')) {
        workspace = {
          id: 'ws_default',
          name: 'PixelCraft Studio',
          description: 'Agência Audiovisual & Criativa',
          invite_code: 'pixelcraft',
        };
      }

      if (!workspace) {
        return NextResponse.json(
          { error: 'Área de Trabalho não encontrada ou link de convite inválido.' },
          { status: 404 }
        );
      }

      targetWorkspaceId = workspace.id;
      targetWorkspaceName = workspace.name || 'Área de Trabalho';
      userRole = role === 'CLIENTE' ? 'CLIENTE' : 'COLABORADOR';
      userJobTitle = userJobTitle || (userRole === 'CLIENTE' ? 'Cliente' : 'Colaborador');
    }
    // ========================================================
    // CASO B: REGISTO ISOLADO (CRIA NOVO WORKSPACE E DONO/ADMIN)
    // ========================================================
    else {
      userRole = 'ADMINISTRADOR';
      userJobTitle = userJobTitle || 'Administrador';

      const finalCompanyName = company_name && company_name.trim() ? company_name.trim() : 'PixelCraft Studio';
      const finalCompanyDesc = company_description && company_description.trim() ? company_description.trim() : null;

      const workspaceId = 'ws_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const inviteCode = 'inv_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);

      // Cria nova Área de Trabalho no Firestore
      if (firestore) {
        try {
          await firestore.collection('workspaces').doc(workspaceId).set({
            id: workspaceId,
            name: finalCompanyName,
            description: finalCompanyDesc,
            owner_id: userId,
            invite_code: inviteCode,
            created_at: now,
            updated_at: now,
          }, { merge: true });
        } catch (wsCreateErr) {
          console.warn('[Firestore Workspace Creation Warning]:', wsCreateErr);
        }
      }

      targetWorkspaceId = workspaceId;
      targetWorkspaceName = finalCompanyName;
    }

    // ========================================================
    // BACKEND/AUTH: CRIAR CONTA NO FIREBASE AUTHENTICATION
    // ========================================================
    if (auth) {
      try {
        await auth.createUser({
          uid: userId,
          email: cleanEmail,
          password: password,
          displayName: cleanName,
        });

        await auth.setCustomUserClaims(userId, {
          role: userRole,
          workspaceId: targetWorkspaceId,
        });
      } catch (authCreateErr: any) {
        console.warn('[Firebase Auth CreateUser Warning]:', authCreateErr);
        try {
          await auth.setCustomUserClaims(userId, {
            role: userRole,
            workspaceId: targetWorkspaceId,
          });
        } catch {}
      }
    }

    // ========================================================
    // FIRESTORE: CRIAR DOCUMENTO DO USUÁRIO COM PERFIL
    // ========================================================
    if (firestore) {
      try {
        await firestore.collection('users').doc(userId).set({
          id: userId,
          uid: userId,
          name: cleanName,
          email: cleanEmail,
          password_hash: hashedPassword,
          phone: phone ? phone.trim() : null,
          role: userRole,
          job_title: userJobTitle,
          workspace_id: targetWorkspaceId,
          workspace_name: targetWorkspaceName,
          status: 'ativo',
          is_partner: userRole === 'ADMINISTRADOR' ? 1 : 0,
          created_at: now,
          updated_at: now,
        }, { merge: true });
        console.log(`[Firestore User Success] Perfil de usuário salvo no Firestore: users/${userId}`);
      } catch (fsUserErr) {
        console.warn('[Firestore User Doc Warning]:', fsUserErr);
      }
    }

    // ========================================================
    // GERAÇÃO DE TOKENS (SESSION TOKEN + FIREBASE CUSTOM TOKEN)
    // ========================================================
    const token = await createSessionToken({
      id: userId,
      email: cleanEmail,
      role: userRole as any,
      workspace_id: targetWorkspaceId,
    });

    const firebaseToken = await createFirebaseCustomToken(userId, {
      role: userRole,
      workspaceId: targetWorkspaceId,
    });

    await logAudit({
      userId,
      action: 'REGISTER',
      module: 'AUTH',
      recordId: userId,
      afterData: { email: cleanEmail, role: userRole, workspace_id: targetWorkspaceId },
    });

    const safeUser = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      role: userRole,
      job_title: userJobTitle,
      workspace_id: targetWorkspaceId,
      workspace_name: targetWorkspaceName,
    };

    const response = NextResponse.json({
      success: true,
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
    console.error('[POST /api/auth/register]', error);
    return NextResponse.json({ error: error?.message || 'Erro interno ao realizar cadastro.' }, { status: 500 });
  }
}
