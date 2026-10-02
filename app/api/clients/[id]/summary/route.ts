import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/clients/[id]/summary ───────────────────────────────────────────
// Returns an aggregated summary for the given client:
//   - Task stats (total / pending / completed)
//   - Project stats (active projects count)
//   - Financial stats (total revenue, pending revenue)
//   - Recent transactions (last 5)
//   - Active contracts
//
// CLIENTE role can only retrieve the summary for their own client record.
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // CLIENTE can only access their own summary
    if (user.role === 'CLIENTE' && user.client_id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb();

    // Verify client exists
    const client = await db
      .prepare('SELECT id, name FROM clients WHERE id = ?')
      .bind(id)
      .first();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // ── Task counts ─────────────────────────────────────────────────────────
    // Tasks are linked to projects which are linked to clients
    const taskStats = await db
      .prepare(
        `SELECT
           COUNT(*)                                          AS total_tasks,
           SUM(CASE WHEN t.status != 'concluida' THEN 1 ELSE 0 END) AS pending_tasks,
           SUM(CASE WHEN t.status = 'concluida'  THEN 1 ELSE 0 END) AS completed_tasks
         FROM tasks t
         INNER JOIN projects p ON t.project_id = p.id
         WHERE p.client_id = ?`
      )
      .bind(id)
      .first() as Record<string, number> | null;

    // ── Active projects count ───────────────────────────────────────────────
    const projectStats = await db
      .prepare(
        `SELECT COUNT(*) AS active_projects
         FROM projects
         WHERE client_id = ? AND status = 'ativo'`
      )
      .bind(id)
      .first() as Record<string, number> | null;

    // ── Financial stats ─────────────────────────────────────────────────────
    const revenueStats = await db
      .prepare(
        `SELECT
           COALESCE(SUM(amount), 0)                                               AS total_revenue,
           COALESCE(SUM(CASE WHEN status = 'Pendente' THEN amount ELSE 0 END), 0) AS pending_revenue
         FROM financial_transactions
         WHERE client_id = ? AND type = 'Entrada'`
      )
      .bind(id)
      .first() as Record<string, number> | null;

    // ── Recent transactions (last 5) ────────────────────────────────────────
    const recentTransactions = await db
      .prepare(
        `SELECT id, description, amount, type, status, created_at
         FROM financial_transactions
         WHERE client_id = ?
         ORDER BY created_at DESC
         LIMIT 5`
      )
      .bind(id)
      .all();

    // ── Active contracts ────────────────────────────────────────────────────
    const activeContracts = await db
      .prepare(
        `SELECT id, title, value, start_date, end_date, status
         FROM contracts
         WHERE client_id = ? AND status = 'ativo'
         ORDER BY start_date DESC`
      )
      .bind(id)
      .all();

    return NextResponse.json({
      data: {
        client: { id: client.id, name: client.name },
        tasks: {
          total:     taskStats?.total_tasks     ?? 0,
          pending:   taskStats?.pending_tasks   ?? 0,
          completed: taskStats?.completed_tasks ?? 0,
        },
        projects: {
          active: projectStats?.active_projects ?? 0,
        },
        revenue: {
          total:   revenueStats?.total_revenue   ?? 0,
          pending: revenueStats?.pending_revenue ?? 0,
        },
        recent_transactions: recentTransactions.results ?? [],
        active_contracts:    activeContracts.results    ?? [],
      },
    });
  } catch (error) {
    console.error('[GET /api/clients/[id]/summary]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
