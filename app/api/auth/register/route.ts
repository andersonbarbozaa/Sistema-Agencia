export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, createSessionToken, TOKEN_COOKIE_NAME } from '@/lib/auth';
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
    const db = getDb();

    // Check if email is already registered
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE lower(email) = ?')
      .bind(cleanEmail)
      .first();

    if (existingUser) {
      return NextResponse.json({ error: 'Já existe uma conta cadastrada com este e-mail.' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const userId = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    let targetWorkspaceId = '';
    let targetWorkspaceName = '';
    let userRole = 'COLABORADOR';
    let userJobTitle = job_title ? job_title.trim() : '';

    // ========================================================
    // CASE A: MEMBER REGISTRATION VIA INVITE LINK
    // ========================================================
    if (invite && invite.trim()) {
      const inviteCode = invite.trim();
      const workspace = await db
        .prepare('SELECT * FROM workspaces WHERE invite_code = ? OR id = ?')
        .bind(inviteCode, inviteCode)
        .first<any>();

      if (!workspace) {
        return NextResponse.json(
          { error: 'Área de Trabalho não encontrada ou link de convite inválido.' },
          { status: 404 }
        );
      }

      targetWorkspaceId = workspace.id;
      targetWorkspaceName = workspace.name;
      userRole = role === 'CLIENTE' ? 'CLIENTE' : 'COLABORADOR';
      userJobTitle = userJobTitle || (userRole === 'CLIENTE' ? 'Cliente' : 'Colaborador');

      await db
        .prepare(`
          INSERT INTO users (
            id, name, email, password_hash, phone, role, job_title, workspace_id, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ativo', datetime('now'), datetime('now'))
        `)
        .bind(
          userId,
          cleanName,
          cleanEmail,
          hashedPassword,
          phone ? phone.trim() : null,
          userRole,
          userJobTitle,
          targetWorkspaceId
        )
        .run();
    }
    // ========================================================
    // CASE B: NEW OWNER ACCOUNT CREATION (CREATES NEW WORKSPACE)
    // ========================================================
    else {
      userRole = 'ADMINISTRADOR';
      userJobTitle = userJobTitle || 'Administrador';

      const finalCompanyName = company_name && company_name.trim() ? company_name.trim() : 'PixelCraft Studio';
      const finalCompanyDesc = company_description && company_description.trim() ? company_description.trim() : null;

      const workspaceId = 'ws_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const inviteCode = 'inv_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);

      // Create new isolated workspace
      await db
        .prepare(`
          INSERT INTO workspaces (id, name, description, owner_id, invite_code, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `)
        .bind(workspaceId, finalCompanyName, finalCompanyDesc, userId, inviteCode)
        .run();

      targetWorkspaceId = workspaceId;
      targetWorkspaceName = finalCompanyName;

      // Create owner user
      await db
        .prepare(`
          INSERT INTO users (
            id, name, email, password_hash, phone, role, job_title, workspace_id, is_partner, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'ADMINISTRADOR', ?, ?, 1, 'ativo', datetime('now'), datetime('now'))
        `)
        .bind(
          userId,
          cleanName,
          cleanEmail,
          hashedPassword,
          phone ? phone.trim() : null,
          userJobTitle,
          targetWorkspaceId
        )
        .run();
    }

    // Generate Session Token
    const token = await createSessionToken({
      id: userId,
      email: cleanEmail,
      role: userRole as any,
      workspace_id: targetWorkspaceId,
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
    });

    // Set auth cookie
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
  } catch (error) {
    console.error('[POST /api/auth/register]', error);
    return NextResponse.json({ error: 'Erro interno ao realizar cadastro.' }, { status: 500 });
  }
}
