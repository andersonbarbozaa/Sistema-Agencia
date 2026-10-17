import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Apenas administradores podem enviar convites.' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role, position_id, job_title } = body;

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Informe um e-mail válido para enviar o convite.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const validRole = role === 'ADMINISTRADOR' || role === 'CLIENTE' ? role : 'COLABORADOR';

    const db = getDb();
    const workspaceId = user.workspace_id || 'ws_default';

    const workspace = await db
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .bind(workspaceId)
      .first<any>();

    const inviteCode = workspace?.invite_code || user.workspace_invite_code || workspaceId;
    const companyName = workspace?.name || user.workspace_name || 'Nossa Equipe';

    let finalJobTitle = job_title ? job_title.trim() : '';
    if (!finalJobTitle && position_id) {
      const pos = await db
        .prepare('SELECT name FROM positions WHERE id = ?')
        .bind(position_id)
        .first<{ name: string }>();
      if (pos?.name) finalJobTitle = pos.name;
    }
    if (!finalJobTitle) {
      finalJobTitle = validRole === 'ADMINISTRADOR' ? 'Administrador' : validRole === 'CLIENTE' ? 'Cliente' : 'Colaborador';
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      invite: inviteCode,
      email: cleanEmail,
      role: validRole,
      job_title: finalJobTitle,
    });
    if (position_id) {
      params.set('position_id', position_id);
    }

    const inviteUrl = `${origin}/register?${params.toString()}`;

    const subject = `Convite para participar de ${companyName}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
        <h2 style="margin-top: 0; color: #ffffff;">Você foi convidado para ${companyName}!</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          <strong>${user.name}</strong> convidou você para acessar o sistema da empresa <strong>${companyName}</strong> com o cargo de <strong>${finalJobTitle}</strong>.
        </p>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${inviteUrl}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
            Criar Minha Conta e Entrar na Equipe
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">
          Caso o botão não funcione, copie e cole este link no navegador:<br/>
          <a href="${inviteUrl}" style="color: #60a5fa;">${inviteUrl}</a>
        </p>
      </div>
    `;

    let emailSent = false;

    // 1. Try Resend API if RESEND_API_KEY is configured
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const fromEmail = process.env.EMAIL_FROM || 'Convites <onboarding@resend.dev>';
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [cleanEmail],
            subject,
            html: htmlBody,
          }),
        });
        if (res.ok) {
          emailSent = true;
        }
      } catch (err) {
        console.warn('[POST /api/users/invite] Resend failed:', err);
      }
    }

    // 2. Try MailChannels (Cloudflare Workers native email) if not yet sent
    if (!emailSent) {
      try {
        const mcRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: cleanEmail }] }],
            from: {
              email: process.env.EMAIL_FROM || `noreply@${new URL(origin).hostname === 'localhost' ? 'sistemaagencia.com' : new URL(origin).hostname}`,
              name: companyName,
            },
            subject,
            content: [{ type: 'text/html', value: htmlBody }],
          }),
        });
        if (mcRes.ok) {
          emailSent = true;
        }
      } catch {
        // Ignore MailChannels fallback error in local dev
      }
    }

    await logAudit({
      userId: user.id,
      action: 'INVITE_USER',
      module: 'USERS',
      recordId: cleanEmail,
      afterData: { email: cleanEmail, role: validRole, position_id, job_title: finalJobTitle, invite_url: inviteUrl, email_sent: emailSent },
    });

    return NextResponse.json({
      success: true,
      email_sent: emailSent,
      invite_url: inviteUrl,
      message: emailSent
        ? `Convite enviado com sucesso para ${cleanEmail}!`
        : `Convite preparado para ${cleanEmail}! O link exclusivo também foi copiado para sua área de transferência.`,
    });
  } catch (error: any) {
    console.error('[POST /api/users/invite]', error);
    return NextResponse.json({ error: error?.message || 'Erro ao enviar convite.' }, { status: 500 });
  }
}
