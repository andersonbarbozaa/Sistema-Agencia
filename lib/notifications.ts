import { getDb } from './db';
import { NotificationType } from '@/types';

export interface NotificationParams {
  userId?: string;
  user_id?: string;
  title?: string;
  message?: string;
  type?: NotificationType | string;
  referenceModule?: string;
  reference_module?: string;
  referenceId?: string;
  reference_id?: string;
  [key: string]: any;
}

export async function createNotification(
  paramOrUserId: NotificationParams | string,
  titleOrType?: string,
  message?: string,
  referenceId?: string,
  referenceModule?: string
): Promise<void> {
  try {
    const db = getDb();
    const id = 'notif_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    let finalUserId = '';
    let finalTitle = 'Notificação';
    let finalMessage = '';
    let finalType = 'info';
    let finalRefModule: string | null = null;
    let finalRefId: string | null = null;

    if (typeof paramOrUserId === 'object' && paramOrUserId !== null) {
      finalUserId = paramOrUserId.userId || paramOrUserId.user_id || '';
      finalTitle = paramOrUserId.title || 'Notificação';
      finalMessage = paramOrUserId.message || '';
      finalType = (paramOrUserId.type as string) || 'info';
      finalRefModule = paramOrUserId.referenceModule || paramOrUserId.reference_module || null;
      finalRefId = paramOrUserId.referenceId || paramOrUserId.reference_id || null;
    } else {
      finalUserId = paramOrUserId;
      finalTitle = titleOrType || 'Notificação';
      finalMessage = message || '';
      finalType = 'info';
      finalRefId = referenceId || null;
      finalRefModule = referenceModule || null;
    }

    await db
      .prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, reference_module, reference_id, read_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, datetime('now'))
      `)
      .bind(
        id,
        finalUserId,
        finalTitle,
        finalMessage,
        finalType,
        finalRefModule,
        finalRefId
      )
      .run();
  } catch (err) {
    console.error('[Notification Error]:', err);
  }
}

export async function notifyAdmins(params: Omit<NotificationParams, 'userId'>): Promise<void> {
  try {
    const db = getDb();
    const admins = await db
      .prepare(`SELECT id FROM users WHERE role = 'ADMINISTRADOR' AND status = 'ativo'`)
      .all<{ id: string }>();

    if (admins.results && admins.results.length > 0) {
      for (const admin of admins.results) {
        await createNotification({
          ...params,
          userId: admin.id,
        });
      }
    }
  } catch (err) {
    console.error('[Notify Admins Error]:', err);
  }
}


export async function checkAndSendWeeklyFinancialNotification(user: { id: string; role: string; workspace_id?: string; is_partner?: number }): Promise<void> {
  // Apenas administradores e sócios recebem o parecer financeiro
  if (user.role !== 'ADMINISTRADOR' && user.is_partner !== 1) return;

  try {
    const db = getDb();
    const wsId = user.workspace_id || 'ws_default';

    // Verificar se já foi enviada notificação nos últimos 7 dias
    const existing = await db
      .prepare(`
        SELECT id FROM notifications
        WHERE user_id = ?
          AND reference_module = 'finance'
          AND type = 'weekly_financial_health'
          AND created_at >= datetime('now', '-7 days')
        LIMIT 1
      `)
      .bind(user.id)
      .first<{ id: string }>();

    if (existing) {
      return; // Já enviada nos últimos 7 dias
    }

    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [entriesRow, exitsRow] = await Promise.all([
      db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as val
        FROM financial_transactions
        WHERE type = 'Entrada'
          AND (
            LOWER(COALESCE(status, '')) IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida', 'liquidado')
            OR (paid_at IS NOT NULL AND LOWER(COALESCE(status, '')) != 'cancelado')
          )
          AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
          AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ?
      `).bind(wsId, wsId, currentMonthPrefix).first<{ val: number }>(),

      db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as val
        FROM financial_transactions
        WHERE type = 'Saída'
          AND (
            LOWER(COALESCE(status, '')) IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida', 'liquidado')
            OR (paid_at IS NOT NULL AND LOWER(COALESCE(status, '')) != 'cancelado')
          )
          AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
          AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ?
      `).bind(wsId, wsId, currentMonthPrefix).first<{ val: number }>(),
    ]);

    const received = entriesRow?.val || 0;
    const spent = exitsRow?.val || 0;
    const net = received - spent;

    let healthStatus = 'Equilibrada';
    let tip = 'Mantenha o acompanhamento rigoroso das cobranças.';
    if (received === 0 && spent === 0) {
      healthStatus = 'Aguardando Lançamentos';
      tip = 'Cadastre as receitas e despesas para gerar o diagnóstico do mês.';
    } else if (net > 0 && (spent === 0 || received >= spent * 1.3)) {
      healthStatus = 'Excelente (Superávit Alto)';
      tip = 'Receitas superam com folga as despesas; reserve parte do lucro.';
    } else if (net >= 0) {
      healthStatus = 'Boa (Operação Equilibrada)';
      tip = 'Operação em superávit; monitore as pendências a receber do mês.';
    } else {
      healthStatus = 'Atenção (Déficit no Período)';
      tip = 'Despesas superaram as receitas realizadas; revise os custos operacionais.';
    }

    const formatBRL = (val: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const notifTitle = `📊 Parecer Semanal do Contador: ${healthStatus}`;
    const notifMsg = `Receitas realizadas de ${formatBRL(received)}, despesas de ${formatBRL(spent)} e resultado de ${formatBRL(net)}. ${tip} Clique para ver a análise completa.`;

    await createNotification({
      userId: user.id,
      title: notifTitle,
      message: notifMsg,
      type: 'weekly_financial_health',
      referenceModule: 'finance',
      referenceId: 'weekly_report',
    });
  } catch (err) {
    console.error('[Weekly Notification Error]:', err);
  }
}
