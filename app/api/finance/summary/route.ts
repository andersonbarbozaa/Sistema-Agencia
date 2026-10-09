
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';

// GET /api/finance/summary â€” financial dashboard summary (admin only or partner)
export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user) && user.is_partner !== 1) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const db = getDb();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // First day of current month â€” YYYY-MM-01
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    // First day of next month (exclusive upper bound)
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const monthEnd = nextMonth.toISOString().split('T')[0];

    const wsId = user.workspace_id || 'ws_default';

    // ---------- Aggregates ----------
    const [
      entriesMonth,
      exitsMonth,
      pendingReceive,
      pendingPay,
      overdueReceive,
      overduePay,
    ] = await Promise.all([
      // total_entries_month
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

      // total_exits_month
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

      // total_pending_receive
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS value
           FROM financial_transactions
           WHERE type = 'Entrada' AND status = 'Pendente'
             AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))`
        )
        .bind(wsId, wsId)
        .first<{ value: number }>(),

      // total_pending_pay
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS value
           FROM financial_transactions
           WHERE type = 'Saída' AND status = 'Pendente'
             AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))`
        )
        .bind(wsId, wsId)
        .first<{ value: number }>(),

      // overdue_receive
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS value
           FROM financial_transactions
           WHERE type = 'Entrada' AND status = 'Pendente' AND due_date < ?
             AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))`
        )
        .bind(todayStr, wsId, wsId)
        .first<{ value: number }>(),

      // overdue_pay
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS value
           FROM financial_transactions
           WHERE type = 'Saída' AND status = 'Pendente' AND due_date < ?
             AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))`
        )
        .bind(todayStr, wsId, wsId)
        .first<{ value: number }>(),
    ]);

    // ---------- Bank balances ----------
    // balance = initial_balance + SUM(Entrada paid) - SUM(SaÃ­da paid)
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

    return NextResponse.json({
      data: {
        total_entries_month: entriesMonth?.value ?? 0,
        total_exits_month: exitsMonth?.value ?? 0,
        total_pending_receive: pendingReceive?.value ?? 0,
        total_pending_pay: pendingPay?.value ?? 0,
        overdue_receive: overdueReceive?.value ?? 0,
        overdue_pay: overduePay?.value ?? 0,
        bank_balances,
      },
    });
  } catch (error) {
    console.error('[GET /api/finance/summary]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


