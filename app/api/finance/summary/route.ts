import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { checkAndSendWeeklyFinancialNotification } from '@/lib/notifications';

// GET /api/finance/summary — financial dashboard summary (admin only or partner)
export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user) && user.is_partner !== 1) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const db = getDb();
    const searchParams = request.nextUrl.searchParams;
    const now = new Date();

    const targetYear = searchParams.get('year')
      ? parseInt(searchParams.get('year')!, 10)
      : now.getFullYear();
    const targetMonth = searchParams.get('month')
      ? parseInt(searchParams.get('month')!, 10)
      : now.getMonth() + 1;

    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const targetMonthPrefix = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

    const wsId = user.workspace_id || 'ws_default';

    // Dispara notificação semanal de saúde financeira se couber
    checkAndSendWeeklyFinancialNotification(user).catch(() => {});

    // ---------- Consultas Financeiras Consolidadas Rigorosamente por Status ----------
    const [
      entriesMonthPaid,
      entriesMonthPending,
      entriesMonthOverdue,
      exitsMonthPaid,
      exitsMonthPending,
      exitsMonthOverdue,
      bankBalancesResult,
    ] = await Promise.all([
      // 1. Receitas Recebidas no mês (Entrada com status Pago/Recebido no mês)
      db
        .prepare(`
          SELECT COALESCE(SUM(amount), 0) AS value
          FROM financial_transactions
          WHERE type = 'Entrada'
            AND (
              LOWER(COALESCE(status, '')) IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida', 'liquidado')
              OR (paid_at IS NOT NULL AND LOWER(COALESCE(status, '')) != 'cancelado')
            )
            AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
            AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ?
        `)
        .bind(wsId, wsId, targetMonthPrefix)
        .first<{ value: number }>(),

      // 2. Receitas a Receber do mês (Entrada Pendente com vencimento no mês)
      db
        .prepare(`
          SELECT COALESCE(SUM(amount), 0) AS value
          FROM financial_transactions
          WHERE type = 'Entrada'
            AND (
              LOWER(COALESCE(status, '')) IN ('pendente', 'a receber', 'aguardando')
              OR (paid_at IS NULL AND LOWER(COALESCE(status, '')) NOT IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida', 'liquidado', 'cancelado'))
            )
            AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
            AND strftime('%Y-%m', due_date) = ?
        `)
        .bind(wsId, wsId, targetMonthPrefix)
        .first<{ value: number }>(),

      // 3. Receitas vencidas acumuladas (Geral até hoje)
      db
        .prepare(`
          SELECT COALESCE(SUM(amount), 0) AS value
          FROM financial_transactions
          WHERE type = 'Entrada'
            AND (
              LOWER(COALESCE(status, '')) IN ('pendente', 'a receber', 'aguardando')
              OR (paid_at IS NULL AND LOWER(COALESCE(status, '')) NOT IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida', 'liquidado', 'cancelado'))
            )
            AND due_date < ?
            AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
        `)
        .bind(todayStr, wsId, wsId)
        .first<{ value: number }>(),

      // 4. Despesas Pagas no mês (Saída com status Pago/Liquidado no mês)
      db
        .prepare(`
          SELECT COALESCE(SUM(amount), 0) AS value
          FROM financial_transactions
          WHERE type = 'Saída'
            AND (
              LOWER(COALESCE(status, '')) IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida', 'liquidado')
              OR (paid_at IS NOT NULL AND LOWER(COALESCE(status, '')) != 'cancelado')
            )
            AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
            AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ?
        `)
        .bind(wsId, wsId, targetMonthPrefix)
        .first<{ value: number }>(),

      // 5. Despesas a Pagar do mês (Saída Pendente com vencimento no mês)
      db
        .prepare(`
          SELECT COALESCE(SUM(amount), 0) AS value
          FROM financial_transactions
          WHERE type = 'Saída'
            AND (
              LOWER(COALESCE(status, '')) IN ('pendente', 'a pagar', 'aguardando')
              OR (paid_at IS NULL AND LOWER(COALESCE(status, '')) NOT IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida', 'liquidado', 'cancelado'))
            )
            AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
            AND strftime('%Y-%m', due_date) = ?
        `)
        .bind(wsId, wsId, targetMonthPrefix)
        .first<{ value: number }>(),

      // 6. Despesas vencidas acumuladas
      db
        .prepare(`
          SELECT COALESCE(SUM(amount), 0) AS value
          FROM financial_transactions
          WHERE type = 'Saída'
            AND (
              LOWER(COALESCE(status, '')) IN ('pendente', 'a pagar', 'aguardando')
              OR (paid_at IS NULL AND LOWER(COALESCE(status, '')) NOT IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida', 'liquidado', 'cancelado'))
            )
            AND due_date < ?
            AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
        `)
        .bind(todayStr, wsId, wsId)
        .first<{ value: number }>(),

      // 7. Saldos em Contas Bancárias
      db
        .prepare(`
          SELECT
            ba.id,
            ba.name AS account_name,
            ba.initial_balance,
            COALESCE(SUM(CASE WHEN t.type = 'Entrada' AND (LOWER(COALESCE(t.status, '')) IN ('pago', 'recebido', 'concluido') OR t.paid_at IS NOT NULL) THEN t.amount ELSE 0 END), 0) AS total_entries,
            COALESCE(SUM(CASE WHEN t.type = 'Saída' AND (LOWER(COALESCE(t.status, '')) IN ('pago', 'recebido', 'concluido') OR t.paid_at IS NOT NULL) THEN t.amount ELSE 0 END), 0) AS total_exits
          FROM bank_accounts ba
          LEFT JOIN financial_transactions t ON t.bank_account_id = ba.id
          WHERE ba.status = 'ativo' AND (ba.workspace_id = ? OR (ba.workspace_id IS NULL AND ? = 'ws_default'))
          GROUP BY ba.id, ba.name, ba.initial_balance
          ORDER BY ba.name
        `)
        .bind(wsId, wsId)
        .all<{
          id: string;
          account_name: string;
          initial_balance: number;
          total_entries: number;
          total_exits: number;
        }>(),
    ]);

    const bank_balances = (bankBalancesResult.results ?? []).map((row) => ({
      id: row.id,
      account_name: row.account_name,
      balance: row.initial_balance + row.total_entries - row.total_exits,
    }));

    // Métricas consolidadas rigorosamente pelo status:
    const totalEntriesPaid = entriesMonthPaid?.value ?? 0;
    const totalEntriesPending = entriesMonthPending?.value ?? 0;
    const totalEntriesOverdue = entriesMonthOverdue?.value ?? 0;
    const totalRevenuePeriod = totalEntriesPaid + totalEntriesPending;

    const totalExitsPaid = exitsMonthPaid?.value ?? 0;
    const totalExitsPending = exitsMonthPending?.value ?? 0;
    const totalExitsOverdue = exitsMonthOverdue?.value ?? 0;
    const totalExpensesPeriod = totalExitsPaid + totalExitsPending;

    // Lucro Realizado (estritamente o que foi recebido - o que foi pago)
    const netProfitRealized = totalEntriesPaid - totalExitsPaid;
    const netProfitProjected = totalRevenuePeriod - totalExpensesPeriod;
    const marginRealized = totalEntriesPaid > 0 ? Math.round((netProfitRealized / totalEntriesPaid) * 100) : 0;

    return NextResponse.json({
      data: {
        target_year: targetYear,
        target_month: targetMonth,

        // Card 1: Receitas
        recebido_no_mes: totalEntriesPaid,             // Total de receitas recebidas (já pagas)
        pendente_receber_mes: totalEntriesPending,     // Total a receber (pendentes/futuras)
        total_receitas_periodo: totalRevenuePeriod,    // Total previsto do período (recebido + pendente)

        // Card 2: Despesas
        pago_no_mes: totalExitsPaid,                   // Total de despesas pagas
        pendente_pagar_mes: totalExitsPending,         // Total a pagar (pendentes/futuras)
        total_despesas_periodo: totalExpensesPeriod,   // Total previsto do período (pago + a pagar)

        // Card 3: Lucro por Período (Auditado)
        lucro_realizado_mes: netProfitRealized,        // Lucro real do período selecionado
        lucro_projetado_mes: netProfitProjected,       // Lucro projetado considerando pendências
        margem_realizada: marginRealized,              // Margem realizada %

        // Compatibilidade com componentes existentes
        receita_do_mes: totalEntriesPaid,
        receita_prevista_mes: totalRevenuePeriod,
        total_despesas_mes: totalExitsPaid,
        despesa_prevista_mes: totalExpensesPeriod,
        lucro_liquido_mes: netProfitRealized,
        vencido_receber_mes: totalEntriesOverdue,
        vencido_pagar_mes: totalExitsOverdue,
        total_entries_month: totalEntriesPaid,
        total_exits_month: totalExitsPaid,
        total_pending_receive: totalEntriesPending,
        total_pending_pay: totalExitsPending,
        bank_balances,
      },
    });
  } catch (error) {
    console.error('[GET /api/finance/summary]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
