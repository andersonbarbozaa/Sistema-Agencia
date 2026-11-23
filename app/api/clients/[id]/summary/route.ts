
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

    // Verify client exists (fallback gracefully if virtual/user client)
    const client = (await db
      .prepare('SELECT id, name FROM clients WHERE id = ?')
      .bind(id)
      .first()) || { id, name: 'Cliente' };

    // ── Client Tasks & Status Counts ────────────────────────────────────────
    // Tasks are linked directly via t.client_id (or via project p.client_id)
    const clientTasksResult = await db
      .prepare(
        `SELECT t.*,
                tc.name as category_name,
                tc.color as category_color,
                u.name as created_by_name,
                (SELECT COUNT(*) FROM task_media_links WHERE task_id = t.id) as media_links_count,
                (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comments_count,
                (SELECT status FROM financial_transactions WHERE task_id = t.id AND type = 'Entrada' LIMIT 1) as financial_status,
                (SELECT id FROM financial_transactions WHERE task_id = t.id AND type = 'Entrada' LIMIT 1) as financial_id
         FROM tasks t
         LEFT JOIN task_categories tc ON t.category_id = tc.id
         LEFT JOIN users u ON t.created_by = u.id
         LEFT JOIN projects p ON t.project_id = p.id
         WHERE t.client_id = ? OR p.client_id = ?
         ORDER BY COALESCE(t.delivery_date, t.created_at) DESC, t.created_at DESC`
      )
      .bind(id, id)
      .all<any>();

    const rawClientTasks = clientTasksResult.results ?? [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const isTaskOverdue = (t: any) => {
      const s = (t.status || '').toLowerCase();
      if (s.includes('atrasad')) return true;
      const isConcluded = s.includes('conclu') || s.includes('aprovad');
      if (isConcluded) {
        if ((t.value && Number(t.value) > 0) || t.financial_id) {
          if (!t.financial_status || t.financial_status.toLowerCase() !== 'pago') {
            return true;
          }
        }
        return false;
      }
      if (!t.delivery_date) return false;
      const [y, m, d] = String(t.delivery_date).split('T')[0].split('-').map(Number);
      if (!y || !m || !d) return false;
      const delivery = new Date(y, m - 1, d);
      return delivery.getTime() < today.getTime();
    };

    const statusCounts = {
      nao_iniciada: 0,
      em_producao: 0,
      em_aprovacao: 0,
      em_alteracao: 0,
      aprovada: 0,
      concluida: 0,
      atrasadas: 0,
    };

    const clientTasks = rawClientTasks.map((t: any) => {
      const st = (t.status || 'Não iniciada').trim();
      const stLower = st.toLowerCase();
      if (stLower === 'não iniciada' || stLower === 'nao iniciada') statusCounts.nao_iniciada++;
      else if (stLower === 'em produção' || stLower === 'em producao') statusCounts.em_producao++;
      else if (stLower === 'em aprovação' || stLower === 'em aprovacao') statusCounts.em_aprovacao++;
      else if (stLower === 'em alteração' || stLower === 'em alteracao' || stLower === 'em revisão' || stLower === 'em revisao') statusCounts.em_alteracao++;
      else if (stLower === 'aprovada') statusCounts.aprovada++;
      else if (stLower === 'concluída' || stLower === 'concluida' || stLower === 'finalizada') statusCounts.concluida++;

      const overdue = isTaskOverdue(t);
      if (overdue) statusCounts.atrasadas++;

      let checklist: any[] = [];
      if (Array.isArray(t.checklist)) {
        checklist = t.checklist;
      } else if (typeof t.checklist === 'string' && t.checklist.trim()) {
        try {
          const parsed = JSON.parse(t.checklist);
          if (Array.isArray(parsed)) checklist = parsed;
        } catch {}
      }

      return {
        ...t,
        title: t.name,
        due_date: t.delivery_date,
        is_overdue: overdue,
        checklist,
        checklist_total: checklist.length,
        checklist_completed: checklist.filter((i: any) => i && i.completed).length,
      };
    });

    const totalTasksCount = clientTasks.length;
    const completedTasksCount = statusCounts.concluida;
    const pendingTasksCount = Math.max(0, totalTasksCount - completedTasksCount);

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
          total:         totalTasksCount,
          pending:       pendingTasksCount,
          completed:     completedTasksCount,
          status_counts: statusCounts,
          list:          clientTasks,
        },
        client_tasks: clientTasks,
        task_status_counts: statusCounts,
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
