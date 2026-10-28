import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, isMasterAdmin, MASTER_ADMIN_EMAIL } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getCloudflareHealthReport } from '@/lib/cloudflare';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);

    // Validação estrita: apenas o titular master pode acessar
    if (!user || !isMasterAdmin(user)) {
      return NextResponse.json(
        {
          error: 'Acesso restrito. Esta rota e dados são reservados exclusivamente ao titular do sistema.',
          code: 'FORBIDDEN_MASTER_ONLY',
        },
        { status: 403 }
      );
    }

    const db = getDb();

    // Busca cruzada de usuários, workspaces e status financeiro
    const usersQuery = `
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        u.status as user_status,
        u.avatar_url as user_avatar,
        u.phone as user_phone,
        u.job_title,
        u.created_at as user_created_at,
        w.id as workspace_id,
        w.name as workspace_name,
        w.plan_type,
        w.subscription_status,
        w.trial_ends_at,
        w.mercadopago_payment_id,
        w.created_at as workspace_created_at
      FROM users u
      LEFT JOIN workspaces w ON u.workspace_id = w.id
      ORDER BY u.created_at DESC
    `;

    const usersResult = await db.prepare(usersQuery).all<any>();
    const rawUsers = usersResult.results || [];

    // Busca os últimos pagamentos de cada workspace
    let paymentLogs: any[] = [];
    try {
      const logsResult = await db
        .prepare('SELECT * FROM payment_logs ORDER BY created_at DESC LIMIT 200')
        .all<any>();
      paymentLogs = logsResult.results || [];
    } catch {}

    const now = Date.now();

    const formattedUsers = rawUsers.map((u) => {
      const isMaster = u.user_email?.toLowerCase().trim() === MASTER_ADMIN_EMAIL.toLowerCase().trim();

      // Calcula tempo no sistema (dias)
      const createdAtDate = u.user_created_at ? new Date(u.user_created_at) : new Date();
      const diffMs = now - createdAtDate.getTime();
      const daysInSystem = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      let formattedAge = 'Hoje';
      if (daysInSystem === 1) formattedAge = '1 dia';
      else if (daysInSystem > 1 && daysInSystem < 30) formattedAge = `${daysInSystem} dias`;
      else if (daysInSystem >= 30 && daysInSystem < 365) {
        const months = Math.floor(daysInSystem / 30);
        formattedAge = `${months} ${months === 1 ? 'mês' : 'meses'}`;
      } else if (daysInSystem >= 365) {
        const years = (daysInSystem / 365).toFixed(1);
        formattedAge = `${years} anos`;
      }

      // Procura último log de pagamento associado
      const userPayment = paymentLogs.find(
        (p) =>
          (u.workspace_id && p.workspace_id === u.workspace_id) ||
          (u.user_email && p.payer_email && p.payer_email.toLowerCase() === u.user_email.toLowerCase())
      );

      // Determinação do status financeiro real vinculado ao Mercado Pago
      let financialStatus: 'Vitalício' | 'Pago' | 'Trial Ativo' | 'Trial Expirado' | 'Inadimplente' | 'Atrasado';
      let financialBadgeColor: 'emerald' | 'blue' | 'rose' | 'amber' | 'purple' = 'blue';
      let trialDaysRemaining: number | null = null;

      if (isMaster) {
        financialStatus = 'Vitalício';
        financialBadgeColor = 'purple';
      } else if (u.subscription_status === 'active' || userPayment?.status === 'approved') {
        financialStatus = 'Pago';
        financialBadgeColor = 'emerald';
      } else if (u.subscription_status === 'cancelled' || userPayment?.status === 'rejected') {
        financialStatus = 'Inadimplente';
        financialBadgeColor = 'rose';
      } else if (u.subscription_status === 'past_due' || userPayment?.status === 'in_process') {
        financialStatus = 'Atrasado';
        financialBadgeColor = 'amber';
      } else if (u.trial_ends_at) {
        const trialEndMs = new Date(u.trial_ends_at).getTime();
        const diffTrial = trialEndMs - now;
        const remainingDays = Math.ceil(diffTrial / (1000 * 60 * 60 * 24));

        if (remainingDays > 0) {
          financialStatus = 'Trial Ativo';
          trialDaysRemaining = remainingDays;
          financialBadgeColor = 'blue';
        } else {
          financialStatus = 'Trial Expirado';
          trialDaysRemaining = 0;
          financialBadgeColor = 'rose';
        }
      } else {
        financialStatus = 'Trial Ativo';
        financialBadgeColor = 'blue';
      }

      return {
        id: u.user_id,
        name: u.user_name || 'Sem nome',
        email: u.user_email,
        role: u.user_role,
        status: u.user_status,
        avatar_url: u.user_avatar,
        phone: u.user_phone,
        job_title: u.job_title,
        created_at: u.user_created_at,
        days_in_system: daysInSystem,
        formatted_age: formattedAge,
        is_master: isMaster,
        workspace: {
          id: u.workspace_id,
          name: u.workspace_name || 'Estúdio Padrão',
          plan_type: u.plan_type || 'individual',
          subscription_status: isMaster ? 'active' : u.subscription_status || 'trial',
          trial_ends_at: u.trial_ends_at,
          created_at: u.workspace_created_at,
        },
        finance: {
          status: financialStatus,
          badge_color: financialBadgeColor,
          trial_days_remaining: trialDaysRemaining,
          mercadopago_payment_id: u.mercadopago_payment_id || userPayment?.payment_id || null,
          last_payment_amount: userPayment?.amount || null,
          last_payment_date: userPayment?.created_at || null,
        },
      };
    });

    // Contagem de estatísticas globais
    const totalUsers = formattedUsers.length;
    const uniqueWorkspaces = new Set(formattedUsers.map((u) => u.workspace.id).filter(Boolean)).size;
    const activePaidCount = formattedUsers.filter((u) => u.finance.status === 'Pago' || u.finance.status === 'Vitalício').length;
    const activeTrialCount = formattedUsers.filter((u) => u.finance.status === 'Trial Ativo').length;
    const expiredOrPastDueCount = formattedUsers.filter(
      (u) => u.finance.status === 'Trial Expirado' || u.finance.status === 'Inadimplente' || u.finance.status === 'Atrasado'
    ).length;

    // Relatório de infraestrutura Cloudflare
    const cloudflareHealth = await getCloudflareHealthReport();

    return NextResponse.json({
      success: true,
      masterEmail: MASTER_ADMIN_EMAIL,
      stats: {
        totalUsers,
        totalWorkspaces: uniqueWorkspaces,
        activePaidCount,
        activeTrialCount,
        expiredOrPastDueCount,
      },
      users: formattedUsers,
      cloudflareHealth,
    });
  } catch (error: any) {
    console.error('[GET /api/admin-master/overview error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar dados do painel Master Admin' },
      { status: 500 }
    );
  }
}
