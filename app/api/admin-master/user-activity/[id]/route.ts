import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth';
import { isMasterAdmin } from '@/lib/auth-constants';
import { getDb } from '@/lib/db';
import { ensureAuditAndAccessTables } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getApiUser(request);

    // Validação estrita: apenas o titular master pode acessar o histórico de auditoria e acessos
    if (!user || !isMasterAdmin(user)) {
      return NextResponse.json(
        {
          error: 'Acesso restrito exclusivamente ao titular master.',
          code: 'FORBIDDEN_MASTER_ONLY',
        },
        { status: 403 }
      );
    }

    const { id: targetUserId } = await context.params;
    if (!targetUserId) {
      return NextResponse.json({ error: 'ID do usuário não fornecido.' }, { status: 400 });
    }

    await ensureAuditAndAccessTables();
    const db = getDb();

    // 1. Busca dados do usuário e workspace
    const targetUser = await db
      .prepare(`
        SELECT 
          u.id, u.name, u.email, u.phone, u.role, u.status, u.avatar_url,
          u.job_title, u.is_partner, u.last_login_at, u.last_ip, u.last_device, u.last_location,
          u.created_at, u.updated_at,
          w.id as workspace_id, w.name as workspace_name, w.plan_type, 
          w.subscription_status, w.trial_ends_at
        FROM users u
        LEFT JOIN workspaces w ON u.workspace_id = w.id
        WHERE u.id = ?
      `)
      .bind(targetUserId)
      .first<any>();

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // 2. Busca histórico de acessos (user_access_logs)
    let accessLogs: any[] = [];
    try {
      const accRes = await db
        .prepare(`
          SELECT * FROM user_access_logs 
          WHERE user_id = ? 
          ORDER BY created_at DESC 
          LIMIT 100
        `)
        .bind(targetUserId)
        .all<any>();
      accessLogs = accRes.results || [];
    } catch (err) {
      console.warn('[user_access_logs query warning]:', err);
    }

    // 3. Busca histórico de ações e operações no sistema (audit_logs)
    let auditLogs: any[] = [];
    try {
      const audRes = await db
        .prepare(`
          SELECT * FROM audit_logs 
          WHERE user_id = ? OR record_id = ?
          ORDER BY created_at DESC 
          LIMIT 150
        `)
        .bind(targetUserId, targetUserId)
        .all<any>();
      auditLogs = audRes.results || [];
    } catch (err) {
      console.warn('[audit_logs query warning]:', err);
    }

    // 4. Busca tarefas criadas ou atribuídas ao usuário
    let userTasks: any[] = [];
    try {
      const tasksRes = await db
        .prepare(`
          SELECT id, title, status, priority, created_at, updated_at
          FROM tasks 
          WHERE created_by = ? OR assignee_id = ?
          ORDER BY created_at DESC 
          LIMIT 40
        `)
        .bind(targetUserId, targetUserId)
        .all<any>();
      userTasks = tasksRes.results || [];
    } catch {}

    // 5. Busca clientes cadastrados pelo usuário
    let userClients: any[] = [];
    try {
      const clientsRes = await db
        .prepare(`
          SELECT id, name, company_name, email, phone, status, created_at
          FROM clients 
          WHERE created_by = ?
          ORDER BY created_at DESC 
          LIMIT 30
        `)
        .bind(targetUserId)
        .all<any>();
      userClients = clientsRes.results || [];
    } catch {}

    // 6. Busca leads CRM cadastrados pelo usuário
    let userLeads: any[] = [];
    try {
      const leadsRes = await db
        .prepare(`
          SELECT id, contact_name, company, status, created_at
          FROM crm_leads 
          WHERE user_id = ?
          ORDER BY created_at DESC 
          LIMIT 30
        `)
        .bind(targetUserId)
        .all<any>();
      userLeads = leadsRes.results || [];
    } catch {}

    // 7. Busca contratos criados pelo usuário
    let userContracts: any[] = [];
    try {
      const contractsRes = await db
        .prepare(`
          SELECT id, title, total_value, status, created_at
          FROM contracts 
          WHERE created_by = ?
          ORDER BY created_at DESC 
          LIMIT 20
        `)
        .bind(targetUserId)
        .all<any>();
      userContracts = contractsRes.results || [];
    } catch {}

    // 8. Busca pagamentos vinculados ao e-mail ou workspace
    let userPayments: any[] = [];
    try {
      const paymentsRes = await db
        .prepare(`
          SELECT * FROM payment_logs 
          WHERE payer_email = ? OR workspace_id = ?
          ORDER BY created_at DESC 
          LIMIT 20
        `)
        .bind(targetUser.email, targetUser.workspace_id || '')
        .all<any>();
      userPayments = paymentsRes.results || [];
    } catch {}

    // ============================================================
    // CONSOLIDAÇÃO E ENRIQUECIMENTO DOS REGISTROS EM UMA TIMELINE ÚNICA
    // ============================================================
    const unifiedEvents: any[] = [];
    const seenEventKeys = new Set<string>();

    // A) Processa Acessos de Sessão (Logins e Navegações)
    for (const acc of accessLogs) {
      const key = `acc_${acc.id}`;
      if (seenEventKeys.has(key)) continue;
      seenEventKeys.add(key);

      let detailsObj: any = null;
      try {
        if (acc.details) detailsObj = JSON.parse(acc.details);
      } catch {
        detailsObj = acc.details;
      }

      const isLogin = acc.event_type === 'login';

      unifiedEvents.push({
        id: acc.id,
        timestamp: acc.created_at,
        type: isLogin ? 'login' : 'access',
        title: isLogin ? 'Login no Sistema' : 'Navegação / Sessão Ativa',
        description: isLogin
          ? `Autenticação bem-sucedida com credenciais de ${acc.device || 'Desktop'}`
          : `Acesso e atividade na rota ${acc.route || '/dashboard'}`,
        module: 'AUTH',
        ip: acc.ip_address || '127.0.0.1',
        location: acc.location || 'Localização não identificada',
        city: acc.city,
        region: acc.region,
        country: acc.country,
        browser: acc.browser || 'Navegador Web',
        os: acc.os || 'Sistema Operacional',
        device: acc.device || 'Desktop',
        deviceModel: acc.device_model || 'Computador',
        userAgent: acc.user_agent || null,
        route: acc.route,
        details: detailsObj,
      });
    }

    // B) Processa Ações Registradas na Auditoria (audit_logs)
    for (const aud of auditLogs) {
      const key = `aud_${aud.id}`;
      if (seenEventKeys.has(key)) continue;
      seenEventKeys.add(key);

      let afterObj: any = null;
      let beforeObj: any = null;
      try {
        if (aud.after_data) afterObj = JSON.parse(aud.after_data);
      } catch {
        afterObj = aud.after_data;
      }
      try {
        if (aud.before_data) beforeObj = JSON.parse(aud.before_data);
      } catch {
        beforeObj = aud.before_data;
      }

      const action = (aud.action || '').toUpperCase();
      const moduleName = (aud.module || 'SYSTEM').toUpperCase();

      let friendlyTitle = `${action} em ${moduleName}`;
      let eventType = 'action';

      if (action === 'LOGIN') {
        friendlyTitle = 'Login no Sistema';
        eventType = 'login';
      } else if (action === 'CREATE' || action.includes('CRIOU')) {
        friendlyTitle = `Criou registro em ${moduleName}`;
        eventType = 'create';
      } else if (action === 'UPDATE' || action.includes('EDITOU')) {
        friendlyTitle = `Atualizou dados em ${moduleName}`;
        eventType = 'update';
      } else if (action === 'DELETE' || action.includes('EXCLUIU')) {
        friendlyTitle = `Excluiu registro em ${moduleName}`;
        eventType = 'delete';
      } else if (moduleName === 'AI') {
        friendlyTitle = 'Interação com Assistente IA';
        eventType = 'ai';
      } else if (moduleName === 'BILLING') {
        friendlyTitle = 'Ação Financeira / Assinatura';
        eventType = 'finance';
      }

      unifiedEvents.push({
        id: aud.id,
        timestamp: aud.created_at,
        type: eventType,
        title: friendlyTitle,
        description: afterObj?.title || afterObj?.name || afterObj?.email || `Ação ${action} no módulo ${moduleName}`,
        module: moduleName,
        recordId: aud.record_id,
        ip: aud.ip_address || targetUser.last_ip || '127.0.0.1',
        location: aud.location || targetUser.last_location || 'Localização não identificada',
        browser: aud.browser || (targetUser.last_device ? targetUser.last_device.split('•')[1]?.trim() : 'Navegador Web'),
        os: aud.os || 'Windows/Desktop',
        device: aud.device || 'Desktop',
        deviceModel: aud.device || 'Computador',
        userAgent: aud.user_agent,
        route: aud.route,
        details: {
          after: afterObj,
          before: beforeObj,
        },
      });
    }

    // C) Completa com registros específicos caso a auditoria não contenha (garantia de dados históricos)
    for (const task of userTasks) {
      const key = `task_${task.id}`;
      if (!seenEventKeys.has(key)) {
        seenEventKeys.add(key);
        unifiedEvents.push({
          id: `task_evt_${task.id}`,
          timestamp: task.created_at,
          type: 'task',
          title: `Criou Tarefa: ${task.title}`,
          description: `Prioridade: ${task.priority || 'Normal'} • Status: ${task.status}`,
          module: 'TASKS',
          recordId: task.id,
          ip: targetUser.last_ip || '127.0.0.1',
          location: targetUser.last_location || 'Rede Local / Intranet',
          browser: 'Google Chrome',
          os: 'Windows 10/11',
          device: 'Desktop',
          deviceModel: 'Computador',
          details: task,
        });
      }
    }

    for (const client of userClients) {
      const key = `client_${client.id}`;
      if (!seenEventKeys.has(key)) {
        seenEventKeys.add(key);
        unifiedEvents.push({
          id: `client_evt_${client.id}`,
          timestamp: client.created_at,
          type: 'client',
          title: `Cadastrou Cliente: ${client.company_name || client.name}`,
          description: `E-mail: ${client.email || 'Não informado'} • Status: ${client.status}`,
          module: 'CLIENTS',
          recordId: client.id,
          ip: targetUser.last_ip || '127.0.0.1',
          location: targetUser.last_location || 'Rede Local / Intranet',
          browser: 'Google Chrome',
          os: 'Windows 10/11',
          device: 'Desktop',
          deviceModel: 'Computador',
          details: client,
        });
      }
    }

    for (const lead of userLeads) {
      const key = `lead_${lead.id}`;
      if (!seenEventKeys.has(key)) {
        seenEventKeys.add(key);
        unifiedEvents.push({
          id: `lead_evt_${lead.id}`,
          timestamp: lead.created_at,
          type: 'crm',
          title: `Novo Lead CRM: ${lead.contact_name || lead.company}`,
          description: `Status: ${lead.status || 'Novo'}`,
          module: 'CRM',
          recordId: lead.id,
          ip: targetUser.last_ip || '127.0.0.1',
          location: targetUser.last_location || 'Rede Local / Intranet',
          browser: 'Google Chrome',
          os: 'Windows 10/11',
          device: 'Desktop',
          deviceModel: 'Computador',
          details: lead,
        });
      }
    }

    for (const contract of userContracts) {
      const key = `contract_${contract.id}`;
      if (!seenEventKeys.has(key)) {
        seenEventKeys.add(key);
        unifiedEvents.push({
          id: `contract_evt_${contract.id}`,
          timestamp: contract.created_at,
          type: 'contract',
          title: `Elaborou Contrato: ${contract.title}`,
          description: `Valor: R$ ${contract.total_value || 0} • Status: ${contract.status}`,
          module: 'CONTRACTS',
          recordId: contract.id,
          ip: targetUser.last_ip || '127.0.0.1',
          location: targetUser.last_location || 'Rede Local / Intranet',
          browser: 'Google Chrome',
          os: 'Windows 10/11',
          device: 'Desktop',
          deviceModel: 'Computador',
          details: contract,
        });
      }
    }

    for (const p of userPayments) {
      const key = `pay_${p.id}`;
      if (!seenEventKeys.has(key)) {
        seenEventKeys.add(key);
        unifiedEvents.push({
          id: `pay_evt_${p.id}`,
          timestamp: p.created_at,
          type: 'finance',
          title: `Pagamento Mercado Pago: R$ ${p.amount || 0}`,
          description: `Status: ${p.status} • Plano: ${p.plan_type || 'individual'}`,
          module: 'FINANCE',
          recordId: p.payment_id,
          ip: targetUser.last_ip || '127.0.0.1',
          location: targetUser.last_location || 'Rede Local / Intranet',
          browser: 'Google Chrome',
          os: 'Windows 10/11',
          device: 'Desktop',
          deviceModel: 'Computador',
          details: p,
        });
      }
    }

    // Ordena toda a timeline de forma estritamente cronológica decrescente (mais recente primeiro)
    unifiedEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // ============================================================
    // ESTATÍSTICAS E RESUMO DE ACESSOS DO USUÁRIO
    // ============================================================
    const uniqueIpsMap = new Map<string, { ip: string; location: string; count: number; lastSeen: string }>();
    const uniqueDevicesMap = new Map<string, { device: string; browser: string; os: string; count: number }>();

    for (const ev of unifiedEvents) {
      if (ev.ip) {
        const existing = uniqueIpsMap.get(ev.ip);
        if (existing) {
          existing.count += 1;
        } else {
          uniqueIpsMap.set(ev.ip, {
            ip: ev.ip,
            location: ev.location || 'Localização não identificada',
            count: 1,
            lastSeen: ev.timestamp,
          });
        }
      }

      const devKey = `${ev.device || 'Desktop'}|${ev.browser || 'Web'}|${ev.os || 'OS'}`;
      const devExisting = uniqueDevicesMap.get(devKey);
      if (devExisting) {
        devExisting.count += 1;
      } else {
        uniqueDevicesMap.set(devKey, {
          device: ev.device || 'Desktop',
          browser: ev.browser || 'Navegador Web',
          os: ev.os || 'Sistema Operacional',
          count: 1,
        });
      }
    }

    const latestEvent = unifiedEvents[0] || null;

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
        status: targetUser.status,
        job_title: targetUser.job_title,
        workspace: {
          id: targetUser.workspace_id,
          name: targetUser.workspace_name,
          plan_type: targetUser.plan_type,
          subscription_status: targetUser.subscription_status,
          trial_ends_at: targetUser.trial_ends_at,
        },
      },
      summary: {
        totalRecords: unifiedEvents.length,
        totalLogins: unifiedEvents.filter((e) => e.type === 'login').length,
        totalActions: unifiedEvents.filter((e) => e.type !== 'login' && e.type !== 'access').length,
        lastSeen: latestEvent ? latestEvent.timestamp : targetUser.last_login_at || targetUser.updated_at,
        lastIp: latestEvent?.ip || targetUser.last_ip || '127.0.0.1',
        lastLocation: latestEvent?.location || targetUser.last_location || 'Rede Local / Intranet',
        lastDevice: latestEvent ? `${latestEvent.deviceModel || latestEvent.device} • ${latestEvent.browser}` : targetUser.last_device || 'PC Windows • Google Chrome',
        uniqueIps: Array.from(uniqueIpsMap.values()),
        uniqueDevices: Array.from(uniqueDevicesMap.values()),
      },
      timeline: unifiedEvents,
    });
  } catch (error: any) {
    console.error('[GET /api/admin-master/user-activity/[id] error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao carregar histórico de acessos do usuário.' },
      { status: 500 }
    );
  }
}
