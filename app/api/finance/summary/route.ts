import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';

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

    // Month boundary: YYYY-MM-01 to start of next month
    const monthStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const nextMonthDate = new Date(targetYear, targetMonth, 1);
    const monthEnd = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

    const wsId = user.workspace_id || 'ws_default';

    // ---------- Aggregates for requested month ----------
    const [
      entriesMonthPaid,
      entriesMonthPending,
      entriesMonthOverdue,
      entriesTotalMonth,
      exitsMonthPaid,
      exitsMonthPending,
      exitsMonthOverdue,
      exitsTotalMonth,
      overdueReceiveItemsRes,
      overduePayItemsRes,
    ] = await Promise.all([
      // 1. Recebido no mês (Entrada e Pago no mês)
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS value
           FROM financial_transactions
           WHERE type = 'Entrada' AND status = 'Pago'
             AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
             AND COALESCE(paid_at, due_date, created_at) >= ? AND COALESCE(paid_at, due_date, created_at) < ?`
        )
        .bind(wsId, wsId, monthStart, monthEnd)
        .first<{ value: number }>(),

      // 2. Pendente a receber do mês
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS value
           FROM financial_transactions
           WHERE type = 'Entrada' AND status = 'Pendente'
             AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
             AND due_date >= ? AND due_date < ?`
        )
        .bind(wsId, wsId, monthStart, monthEnd)
        .first<{ value: number }>(),

      // 3. Vencido a receber (no mês ou geral até hoje)
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS value
           FROM financial_transactions
           WHERE type = 'Entrada' AND status = 'Pendente' AND due_date < ?
             AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))`
        )
        .bind(todayStr, wsId, wsId)
        .first<{ value: number }>(),

      // 4. Receita prevista / total do mês (Pago + Pendente)
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS value
           FROM financial_transactions
           WHERE type = 'Entrada'
             AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
             AND ((status = 'Pago' AND COALESCE(paid_at, due_date) >= ? AND COALESCE(paid_at, due_date) < ?)
               OR (status = 'Pendente' AND due_date >= ? AND due_date < ?))`
        )
        .bind(wsId, wsId, monthStart, monthEnd, monthStart, monthEnd)
        .first<{ value: number }>(),

      // 5. Despesas pagas no mês (Saída e Pago no mês)
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS value
           FROM financial_transactions
           WHERE type = 'Saída' AND status = 'Pago'
             AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
             AND COALESCE(paid_at, due_date, created_at) >= ? AND COALESCE(paid_at, due_date, created_at) < ?`
        )
        .bind(wsId, wsId, monthStart, monthEnd)
        .first<{ value: number }>(),

      // 6. Despesas pendentes do mês
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS value
           FROM financial_transactions
           WHERE type = 'Saída' AND status = 'Pendente'
             AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
             AND due_date >= ? AND due_date < ?`
        )
        .bind(wsId, wsId, monthStart, monthEnd)
        .first<{ value: number }>(),

      // 7. Despesas vencidas a pagar
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS value
           FROM financial_transactions
           WHERE type = 'Saída' AND status = 'Pendente' AND due_date < ?
             AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))`
        )
        .bind(todayStr, wsId, wsId)
        .first<{ value: number }>(),

      // 8. Total de despesas do mês
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS value
           FROM financial_transactions
           WHERE type = 'Saída'
             AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
             AND ((status = 'Pago' AND COALESCE(paid_at, due_date) >= ? AND COALESCE(paid_at, due_date) < ?)
               OR (status = 'Pendente' AND due_date >= ? AND due_date < ?))`
        )
        .bind(wsId, wsId, monthStart, monthEnd, monthStart, monthEnd)
        .first<{ value: number }>(),

      // 9. Lista de recebimentos vencidos
      db
        .prepare(
          `SELECT t.id, t.description, t.amount, t.due_date, c.name AS client_name
           FROM financial_transactions t
           LEFT JOIN clients c ON t.client_id = c.id
           WHERE t.type = 'Entrada' AND t.status = 'Pendente' AND t.due_date < ?
             AND (t.workspace_id = ? OR (t.workspace_id IS NULL AND ? = 'ws_default'))
           ORDER BY t.due_date ASC`
        )
        .bind(todayStr, wsId, wsId)
        .all<any>(),

      // 10. Lista de pagamentos vencidos
      db
        .prepare(
          `SELECT t.id, t.description, t.amount, t.due_date, c.name AS client_name
           FROM financial_transactions t
           LEFT JOIN clients c ON t.client_id = c.id
           WHERE t.type = 'Saída' AND t.status = 'Pendente' AND t.due_date < ?
             AND (t.workspace_id = ? OR (t.workspace_id IS NULL AND ? = 'ws_default'))
           ORDER BY t.due_date ASC`
        )
        .bind(todayStr, wsId, wsId)
        .all<any>(),
    ]);

    // Bank balances
    const bankBalancesResult = await db
      .prepare(
        `SELECT
          ba.id,
          ba.name               AS account_name,
          ba.initial_balance,
          COALESCE(SUM(CASE WHEN t.type = 'Entrada' AND t.status = 'Pago' THEN t.amount ELSE 0 END), 0)  AS total_entries,
          COALESCE(SUM(CASE WHEN t.type = 'Saída'   AND t.status = 'Pago' THEN t.amount ELSE 0 END), 0)  AS total_exits
        FROM bank_accounts ba
        LEFT JOIN financial_transactions t ON t.bank_account_id = ba.id
        WHERE ba.status = 'ativo' AND (ba.workspace_id = ? OR (ba.workspace_id IS NULL AND ? = 'ws_default'))
        GROUP BY ba.id, ba.name, ba.initial_balance
        ORDER BY ba.name`
      )
      .bind(wsId, wsId)
      .all<{
        id: string;
        account_name: string;
        initial_balance: number;
        total_entries: number;
        total_exits: number;
      }>();

    const bank_balances = (bankBalancesResult.results ?? []).map((row) => ({
      id: row.id,
      account_name: row.account_name,
      balance: row.initial_balance + row.total_entries - row.total_exits,
    }));

    const overdueReceiveItems = overdueReceiveItemsRes.results || [];
    const overduePayItems = overduePayItemsRes.results || [];

    const totalEntriesPaid = entriesMonthPaid?.value ?? 0;
    const totalEntriesPending = entriesMonthPending?.value ?? 0;
    const totalEntriesOverdue = entriesMonthOverdue?.value ?? 0;
    const totalRevenueMonth = entriesTotalMonth?.value ?? (totalEntriesPaid + totalEntriesPending);

    const totalExitsPaid = exitsMonthPaid?.value ?? 0;
    const totalExitsPending = exitsMonthPending?.value ?? 0;
    const totalExitsOverdue = exitsMonthOverdue?.value ?? 0;
    const totalExpensesMonth = exitsTotalMonth?.value ?? (totalExitsPaid + totalExitsPending);

    const netProfitMonth = totalEntriesPaid - totalExitsPaid;

    return NextResponse.json({
      data: {
        target_year: targetYear,
        target_month: targetMonth,

        // Contas a Receber
        receita_do_mes: totalRevenueMonth,
        recebido_no_mes: totalEntriesPaid,
        pendente_receber_mes: totalEntriesPending,
        vencido_receber_mes: totalEntriesOverdue,

        // Contas a Pagar
        pago_no_mes: totalExitsPaid,
        pendente_pagar_mes: totalExitsPending,
        vencido_pagar_mes: totalExitsOverdue,
        total_despesas_mes: totalExpensesMonth,

        // Lucro
        lucro_liquido_mes: netProfitMonth,

        // Alertas de vencidos
        overdue_receive_count: overdueReceiveItems.length,
        overdue_receive_total: overdueReceiveItems.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0),
        overdue_receive_items: overdueReceiveItems,

        overdue_pay_count: overduePayItems.length,
        overdue_pay_total: overduePayItems.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0),
        overdue_pay_items: overduePayItems,

        // Backward compatibility
        total_entries_month: totalEntriesPaid,
        total_exits_month: totalExitsPaid,
        total_pending_receive: totalEntriesPending,
        total_pending_pay: totalExitsPending,
        overdue_receive: totalEntriesOverdue,
        overdue_pay: totalExitsOverdue,
        bank_balances,
      },
    });
  } catch (error) {
    console.error('[GET /api/finance/summary]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
