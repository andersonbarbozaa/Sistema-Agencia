import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth';
import { isMasterAdmin, MASTER_ADMIN_EMAIL } from '@/lib/auth-constants';
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

    // Garante que todas as colunas necessárias existam na tabela workspaces
    try {
      await db.prepare('ALTER TABLE workspaces ADD COLUMN mercadopago_payment_id TEXT').run();
    } catch {}
    try {
      await db.prepare('ALTER TABLE workspaces ADD COLUMN mercadopago_subscription_id TEXT').run();
    } catch {}
    try {
      await db.prepare("ALTER TABLE workspaces ADD COLUMN plan_type TEXT DEFAULT 'individual'").run();
    } catch {}
    try {
      await db.prepare("ALTER TABLE workspaces ADD COLUMN subscription_status TEXT DEFAULT 'trial'").run();
    } catch {}
    try {
      await db.prepare('ALTER TABLE workspaces ADD COLUMN trial_ends_at TEXT').run();
    } catch {}

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
        u.is_partner,
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

    let rawUsers: any[] = [];
    try {
      const usersResult = await db.prepare(usersQuery).all<any>();
      rawUsers = usersResult.results || [];
    } catch (err: any) {
      console.error('[Overview usersQuery error]:', err?.message);
      const simpleUsers = await db.prepare('SELECT id as user_id, name as user_name, email as user_email, role as user_role, status as user_status, created_at as user_created_at FROM users ORDER BY created_at DESC').all<any>();
      rawUsers = (simpleUsers.results || []).map((u) => ({
        ...u,
        workspace_id: 'ws_default',
        workspace_name: 'PixelCraft Studio',
        plan_type: 'individual',
        subscription_status: 'trial',
      }));
    }

    // Busca de Workspaces detalhada para a aba Workspaces
    const wsQuery = `
      SELECT 
        w.id,
        w.name,
        w.description,
        w.owner_id,
        w.plan_type,
        w.subscription_status,
        w.trial_ends_at,
        w.created_at,
        u.name as owner_name,
        u.email as owner_email,
        (SELECT COUNT(*) FROM users WHERE workspace_id = w.id) as total_members
      FROM workspaces w
      LEFT JOIN users u ON w.owner_id = u.id
      ORDER BY w.created_at DESC
    `;

    let rawWorkspaces: any[] = [];
    try {
      const wsResult = await db.prepare(wsQuery).all<any>();
      rawWorkspaces = wsResult.results || [];
    } catch (err: any) {
      console.warn('[Overview wsQuery error]:', err?.message);
    }

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
      const isMaster = isMasterAdmin({ email: u.user_email });

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
        is_partner: u.is_partner === 1,
        created_at: u.user_created_at,
        days_in_system: daysInSystem,
        formatted_age: formattedAge,
        is_master: isMaster,
        workspace: {
          id: u.workspace_id,
          name: u.workspace_name || 'PixelCraft Studio',
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

    const formattedWorkspaces = rawWorkspaces.map((ws) => {
      const isMasterWs = isMasterAdmin({ email: ws.owner_email });
      let status = 'Trial Ativo';
      let remainingDays = null;

      if (isMasterWs) {
        status = 'Vitalício';
      } else if (ws.subscription_status === 'active') {
        status = 'Pago';
      } else if (ws.trial_ends_at) {
        const trialEndMs = new Date(ws.trial_ends_at).getTime();
        const diff = trialEndMs - now;
        remainingDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
        status = remainingDays > 0 ? 'Trial Ativo' : 'Trial Expirado';
      }

      return {
        id: ws.id,
        name: ws.name || 'Estúdio',
        description: ws.description || '',
        owner_id: ws.owner_id,
        owner_name: ws.owner_name || 'Proprietário',
        owner_email: ws.owner_email || '',
        plan_type: ws.plan_type || 'individual',
        subscription_status: status,
        trial_ends_at: ws.trial_ends_at,
        trial_days_remaining: remainingDays,
        total_members: ws.total_members || 1,
        created_at: ws.created_at,
      };
    });

    // Filtra os usuários excluindo o próprio acesso do titular master ("o meu acesso nao precisa mostrar nesta parte")
    const clientUsers = formattedUsers.filter((u) => !u.is_master);

    // Contagem de estatísticas para os usuários e estúdios gerenciados
    const totalUsers = clientUsers.length;
    const uniqueWorkspaces = Math.max(formattedWorkspaces.length, new Set(clientUsers.map((u) => u.workspace.id).filter(Boolean)).size);
    const activePaidCount = clientUsers.filter((u) => u.finance.status === 'Pago' || u.finance.status === 'Vitalício').length;
    const activeTrialCount = clientUsers.filter((u) => u.finance.status === 'Trial Ativo').length;
    const expiredOrPastDueCount = clientUsers.filter(
      (u) => u.finance.status === 'Trial Expirado' || u.finance.status === 'Inadimplente' || u.finance.status === 'Atrasado'
    ).length;

    // Relatório de infraestrutura Cloudflare com fallback seguro
    let cloudflareHealth: any = null;
    try {
      cloudflareHealth = await getCloudflareHealthReport();
    } catch (cfErr: any) {
      console.warn('[Overview Cloudflare Report Warning]:', cfErr?.message);
    }

    // Capacidade estimada de usuários no plano Free (base: 100k requisições/dia / 30 req/dia por usuário = ~3.500 usuários ativos diários)
    const estimatedCapacity = 3500;
    const capacityUsagePercent = Number(((totalUsers / estimatedCapacity) * 100).toFixed(2));

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
      capacity: {
        currentUsers: totalUsers,
        estimatedCapacity,
        capacityUsagePercent,
        status: capacityUsagePercent < 70 ? 'healthy' : capacityUsagePercent < 90 ? 'warning' : 'critical',
      },
      users: clientUsers,
      workspaces: formattedWorkspaces,
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
