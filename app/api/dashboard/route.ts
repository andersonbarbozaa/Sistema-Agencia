
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isClient, isAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'NÃ£o autenticado.' }, { status: 401 });
    }

    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // IF CLIENT: Restricted dashboard data only
    if (isClient(user)) {
      const clientId = user.client_id;
      if (!clientId) {
        return NextResponse.json({ error: 'Cliente nÃ£o vinculado.' }, { status: 400 });
      }

      // Client's tasks
      const tasksRes = await db
        .prepare(`
          SELECT t.*, tc.name as category_name, tc.color as category_color, p.name as project_name
          FROM tasks t
          LEFT JOIN task_categories tc ON t.category_id = tc.id
          LEFT JOIN projects p ON t.project_id = p.id
          WHERE t.client_id = ?
          ORDER BY 
            CASE 
              WHEN t.status = 'Em aprovaÃ§Ã£o' THEN 1
              WHEN t.status = 'Em produÃ§Ã£o' THEN 2
              WHEN t.status = 'Em alteraÃ§Ã£o' THEN 3
              WHEN t.status = 'NÃ£o iniciada' THEN 4
              ELSE 5
            END,
            t.delivery_date ASC
          LIMIT 5
        `)
        .bind(clientId)
        .all();

      // Counts
      const counts = await db
        .prepare(`
          SELECT 
            COUNT(CASE WHEN status != 'ConcluÃ­da' THEN 1 END) as pending_tasks,
            COUNT(CASE WHEN status = 'Em aprovaÃ§Ã£o' THEN 1 END) as awaiting_approval,
            COUNT(CASE WHEN status = 'ConcluÃ­da' THEN 1 END) as completed_tasks
          FROM tasks
          WHERE client_id = ?
        `)
        .bind(clientId)
        .first<any>();

      // Client active projects
      const projects = await db
        .prepare(`
          SELECT * FROM projects
          WHERE client_id = ? AND status != 'Cancelado'
          ORDER BY deadline ASC
          LIMIT 5
        `)
        .bind(clientId)
        .all();

      return NextResponse.json({
        role: 'CLIENTE',
        counts: counts || { pending_tasks: 0, awaiting_approval: 0, completed_tasks: 0 },
        tasks: tasksRes.results || [],
        projects: projects.results || [],
      });
    }

    // ADMINISTRATOR / COLLABORATOR DASHBOARD
    const wsId = user.workspace_id || 'ws_default';

    // 1. Task counts and lists (limit 5 for Cloudflare efficiency)
    const taskStats = await db
      .prepare(`
        SELECT 
          COUNT(CASE WHEN status NOT IN ('ConcluÃ­da', 'Aprovada') THEN 1 END) as pending_tasks,
          COUNT(CASE WHEN status = 'Em produÃ§Ã£o' THEN 1 END) as in_production_tasks,
          COUNT(CASE WHEN status = 'Em aprovaÃ§Ã£o' THEN 1 END) as in_approval_tasks,
          COUNT(CASE WHEN status NOT IN ('ConcluÃ­da', 'Aprovada') AND delivery_date <= date('now', '+3 days') THEN 1 END) as due_soon_tasks,
          COUNT(CASE WHEN status NOT IN ('ConcluÃ­da', 'Aprovada') AND delivery_date < date('now') THEN 1 END) as overdue_tasks
        FROM tasks
        WHERE 1=1
      `)
      
      .first<any>();

    // Initial 5 urgent tasks
    const urgentTasks = await db
      .prepare(`
        SELECT t.id, t.name, t.delivery_date, t.status, t.value,
               c.name as client_name, p.name as project_name, tc.name as category_name, tc.color as category_color,
               (SELECT COUNT(*) FROM task_media_links WHERE task_id = t.id) as media_count
        FROM tasks t
        LEFT JOIN clients c ON t.client_id = c.id
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        WHERE t.status NOT IN ('ConcluÃ­da', 'Aprovada')
          
        ORDER BY t.delivery_date ASC
        LIMIT 5
      `)
      
      .all();

    // 2. Active Projects (limit 5)
    const activeProjects = await db
      .prepare(`
        SELECT p.*, c.name as client_name,
               (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks,
               (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'ConcluÃ­da') as completed_tasks
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.status NOT IN ('ConcluÃ­do', 'Cancelado')
          
        ORDER BY p.deadline ASC
        LIMIT 5
      `)
      
      .all();

    // 3. Upcoming Calendar Events (limit 5)
    const upcomingEvents = await db
      .prepare(`
        SELECT e.*, c.name as client_name
        FROM calendar_events e
        LEFT JOIN clients c ON e.client_id = c.id
        WHERE e.event_date >= date('now')
          
        ORDER BY e.event_date ASC, e.start_time ASC
        LIMIT 5
      `)
      
      .all();

    // 4. CRM Leads (limit 5 with dynamic 7-day inactive flag)
    const leadsRes = await db
      .prepare(`
        SELECT l.*, u.name as assignee_name,
               CASE WHEN CAST((julianday('now') - julianday(l.last_activity_at)) AS INTEGER) > 7 THEN 1 ELSE 0 END as is_inactive
        FROM crm_leads l
        LEFT JOIN users u ON l.assignee_id = u.id
        WHERE l.status NOT IN ('Finalizado positivo', 'Finalizado negativo')
          
        ORDER BY l.last_activity_at DESC
        LIMIT 5
      `)
      
      .all();

    // 5. Financial Summary (Admin only, or restricted view)
    let financialSummary = null;
    let partnerExpenses = null;
    let overdueBills = null;

    if (isAdmin(user) || user.is_partner === 1) {
      // Month totals (current month)
      const currentMonth = today.substring(0, 7); // YYYY-MM
      const prevDate = new Date();
      prevDate.setMonth(prevDate.getMonth() - 1);
      const prevMonth = prevDate.toISOString().substring(0, 7);

      const finMonth = await db
        .prepare(`
          SELECT 
            COALESCE(SUM(CASE WHEN type = 'Entrada' AND status = 'Pago' AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ? THEN amount ELSE 0 END), 0) as current_entries,
            COALESCE(SUM(CASE WHEN type = 'Saída' AND status = 'Pago' AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ? THEN amount ELSE 0 END), 0) as current_exits,
            COALESCE(SUM(CASE WHEN type = 'Entrada' AND status = 'Pago' AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ? THEN amount ELSE 0 END), 0) as prev_entries,
            COALESCE(SUM(CASE WHEN type = 'Saída' AND status = 'Pago' AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ? THEN amount ELSE 0 END), 0) as prev_exits,
            COALESCE(SUM(CASE WHEN type = 'Entrada' AND status = 'Pendente' THEN amount ELSE 0 END), 0) as to_receive,
            COALESCE(SUM(CASE WHEN type = 'Saída' AND status = 'Pendente' THEN amount ELSE 0 END), 0) as to_pay
          FROM financial_transactions
          WHERE 1=1
        `)
        .bind(currentMonth, currentMonth, prevMonth, prevMonth)
        .first<any>();

      // Total balance in bank accounts
      const bankAccounts = await db
        .prepare(`
          SELECT ba.id, ba.name, ba.bank, ba.initial_balance,
            COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE bank_account_id = ba.id AND type = 'Entrada' AND status = 'Pago'), 0) as total_entries,
            COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE bank_account_id = ba.id AND type = 'Saída' AND status = 'Pago'), 0) as total_exits
          FROM bank_accounts ba
          WHERE ba.status = 'ativo' 
        `)
        
        .all<any>();

      let totalBalance = 0;
      const computedAccounts = (bankAccounts.results || []).map(acc => {
        const bal = (acc.initial_balance || 0) + (acc.total_entries || 0) - (acc.total_exits || 0);
        totalBalance += bal;
        return {
          id: acc.id,
          name: acc.name,
          bank: acc.bank,
          balance: bal,
        };
      });

      // Bills due soon & Overdue bills (limit 5)
      overdueBills = await db
        .prepare(`
          SELECT ft.*, fc.name as category_name, c.name as client_name
          FROM financial_transactions ft
          LEFT JOIN financial_categories fc ON ft.category_id = fc.id
          LEFT JOIN clients c ON ft.client_id = c.id
          WHERE ft.status = 'Pendente'
            
          ORDER BY ft.due_date ASC
          LIMIT 5
        `)
        
        .all();

      // Partner expenses comparison (Requisito 14 & 28: sem ranking, apenas dados analÃ­ticos)
      const partnersData = await db
        .prepare(`
          SELECT u.id, u.name,
            COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE partner_id = u.id AND type = 'Saída' AND status = 'Pago' AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ?), 0) as month_expenses,
            COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE partner_id = u.id AND type = 'Entrada' AND status = 'Pago' AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ?), 0) as month_entries
          FROM users u
          WHERE u.is_partner = 1 AND u.status = 'ativo' 
        `)
        .bind(currentMonth, currentMonth)
        .all();

      // Monthly revenue goal
      const goalRow = await db.prepare("SELECT value FROM settings WHERE key = 'monthly_revenue_goal'").first<{ value: string }>();
      const monthlyRevenueGoal = parseFloat(goalRow?.value || '50000') || 50000;

      financialSummary = {
        total_balance: totalBalance,
        accounts: computedAccounts,
        monthly_revenue_goal: monthlyRevenueGoal,
        current_month: {
          entries: finMonth?.current_entries || 0,
          exits: finMonth?.current_exits || 0,
          result: (finMonth?.current_entries || 0) - (finMonth?.current_exits || 0),
        },
        previous_month: {
          entries: finMonth?.prev_entries || 0,
          exits: finMonth?.prev_exits || 0,
          result: (finMonth?.prev_entries || 0) - (finMonth?.prev_exits || 0),
        },
        to_receive: finMonth?.to_receive || 0,
        to_pay: finMonth?.to_pay || 0,
        overdue_bills: overdueBills.results || [],
      };

      partnerExpenses = partnersData.results || [];
    }

    return NextResponse.json({
      role: user.role,
      task_stats: taskStats || { pending_tasks: 0, in_production_tasks: 0, in_approval_tasks: 0, due_soon_tasks: 0, overdue_tasks: 0 },
      urgent_tasks: urgentTasks.results || [],
      upcoming_events: upcomingEvents.results || [],
      recent_leads: leadsRes.results || [],
      financial: financialSummary,
      partner_expenses: partnerExpenses,
    });
  } catch (err: any) {
    console.error('[Dashboard API Error]:', err);
    return NextResponse.json({ error: String(err) + String(err?.stack) }, { status: 500 });
  }
}

