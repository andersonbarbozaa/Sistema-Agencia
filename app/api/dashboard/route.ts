import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isClient, isAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const firestore = getAdminFirestore();
    const today = new Date().toISOString().split('T')[0];
    const wsId = user.workspace_id || 'ws_default';

    // ─────────────────────────────────────────────────────────────────────────
    // CLIENT DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────
    if (isClient(user)) {
      const clientId = user.client_id;
      if (!clientId) {
        return NextResponse.json({ error: 'Cliente não vinculado.' }, { status: 400 });
      }

      const [tasksSnap, projectsSnap, catsSnap] = await Promise.all([
        firestore.collection('tasks').where('client_id', '==', clientId).get(),
        firestore.collection('projects').where('client_id', '==', clientId).get(),
        firestore.collection('task_categories').get(),
      ]);

      const catMap: Record<string, { name: string; color: string }> = {};
      catsSnap.docs.forEach((d: any) => {
        catMap[d.id] = { name: d.data().name, color: d.data().color || '#3b82f6' };
      });

      const clientTasks = tasksSnap.docs.map((d: any) => {
        const t = d.data();
        const cat = t.category_id ? catMap[t.category_id] : null;
        return {
          id: d.id,
          ...t,
          category_name: cat?.name || null,
          category_color: cat?.color || '#3b82f6',
        };
      });

      let pending_tasks = 0;
      let awaiting_approval = 0;
      let completed_tasks = 0;

      clientTasks.forEach((t: any) => {
        if (t.status === 'Concluída' || t.status === 'Aprovada') completed_tasks++;
        else pending_tasks++;
        if (t.status === 'Em aprovação') awaiting_approval++;
      });

      const statusWeights: Record<string, number> = {
        'Em aprovação': 1,
        'Em produção': 2,
        'Em alteração': 3,
        'Não iniciada': 4,
      };

      clientTasks.sort((a: any, b: any) => {
        const wA = statusWeights[a.status] || 5;
        const wB = statusWeights[b.status] || 5;
        if (wA !== wB) return wA - wB;
        return (a.delivery_date || '').localeCompare(b.delivery_date || '');
      });

      let clientProjects = projectsSnap.docs
        .map((d: any) => ({ id: d.id, ...d.data() }))
        .filter((p: any) => p.status !== 'Cancelado');

      clientProjects.sort((a: any, b: any) => (a.deadline || '').localeCompare(b.deadline || ''));

      return NextResponse.json({
        role: 'CLIENTE',
        counts: { pending_tasks, awaiting_approval, completed_tasks },
        tasks: clientTasks.slice(0, 5),
        projects: clientProjects.slice(0, 5),
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN / COLLABORATOR DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────
    const [tasksSnap, projectsSnap, eventsSnap, leadsSnap, txSnap, accountsSnap, clientsSnap, catsSnap, usersSnap, settingsSnap] = await Promise.all([
      firestore.collection('tasks').get(),
      firestore.collection('projects').get(),
      firestore.collection('calendar_events').get(),
      firestore.collection('crm_leads').get(),
      firestore.collection('financial_transactions').get(),
      firestore.collection('bank_accounts').get(),
      firestore.collection('clients').get(),
      firestore.collection('task_categories').get(),
      firestore.collection('users').get(),
      firestore.collection('settings').get(),
    ]);

    // Helpers para isolamento de Workspace
    const isWs = (item: any) => {
      if (wsId === 'ws_default') return !item.workspace_id || item.workspace_id === 'ws_default';
      return item.workspace_id === wsId;
    };

    const clientMap: Record<string, string> = {};
    clientsSnap.docs.forEach((d: any) => { clientMap[d.id] = d.data().name; });

    const projMap: Record<string, string> = {};
    projectsSnap.docs.forEach((d: any) => { projMap[d.id] = d.data().name; });

    const catMap: Record<string, { name: string; color: string }> = {};
    catsSnap.docs.forEach((d: any) => {
      catMap[d.id] = { name: d.data().name, color: d.data().color || '#3b82f6' };
    });

    const userMap: Record<string, string> = {};
    usersSnap.docs.forEach((d: any) => { userMap[d.id] = d.data().name || d.data().email; });

    // 1. Tarefas
    const allTasks = tasksSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter(isWs);

    let pending_tasks = 0;
    let in_production_tasks = 0;
    let in_approval_tasks = 0;
    let due_soon_tasks = 0;
    let overdue_tasks = 0;

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

    allTasks.forEach((t: any) => {
      const isDone = t.status === 'Concluída' || t.status === 'Aprovada';
      const dDate = t.delivery_date ? t.delivery_date.substring(0, 10) : '';

      if (!isDone) {
        pending_tasks++;
        if (dDate && dDate <= threeDaysStr && dDate >= today) due_soon_tasks++;
        if (dDate && dDate < today) overdue_tasks++;
      }
      if (t.status === 'Em produção') in_production_tasks++;
      if (t.status === 'Em aprovação') in_approval_tasks++;
    });

    const urgentTasks = allTasks
      .filter((t: any) => t.status !== 'Concluída' && t.status !== 'Aprovada')
      .map((t: any) => {
        const cat = t.category_id ? catMap[t.category_id] : null;
        return {
          id: t.id,
          name: t.name || t.title || 'Tarefa',
          title: t.title || t.name || 'Tarefa',
          delivery_date: t.delivery_date,
          due_date: t.delivery_date,
          status: t.status,
          value: t.value || 0,
          client_name: t.client_id ? (clientMap[t.client_id] || null) : null,
          project_name: t.project_id ? (projMap[t.project_id] || null) : null,
          category_name: cat?.name || null,
          category_color: cat?.color || '#3b82f6',
          media_count: t.media_links_count || 0,
        };
      })
      .sort((a: any, b: any) => (a.delivery_date || '9999').localeCompare(b.delivery_date || '9999'))
      .slice(0, 5);

    // 2. Projetos ativos
    const allProjects = projectsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter(isWs);
    const activeProjects = allProjects
      .filter((p: any) => p.status !== 'Concluído' && p.status !== 'Cancelado')
      .map((p: any) => {
        const pTasks = allTasks.filter((t: any) => t.project_id === p.id);
        const comp = pTasks.filter((t: any) => t.status === 'Concluída' || t.status === 'Aprovada').length;
        return {
          id: p.id,
          name: p.name,
          client_name: p.client_id ? (clientMap[p.client_id] || null) : null,
          deadline: p.deadline || p.end_date,
          end_date: p.deadline || p.end_date,
          total_tasks: pTasks.length,
          completed_tasks: comp,
        };
      })
      .sort((a: any, b: any) => (a.deadline || '9999').localeCompare(b.deadline || '9999'))
      .slice(0, 5);

    // 3. Próximos eventos da agenda
    const allEvents = eventsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter(isWs);
    const upcomingEvents = allEvents
      .filter((e: any) => (e.event_date || '') >= today)
      .map((e: any) => ({
        id: e.id,
        title: e.title,
        event_date: e.event_date,
        start_time: e.start_time,
        end_time: e.end_time,
        location: e.location,
        client_name: e.client_id ? (clientMap[e.client_id] || null) : null,
      }))
      .sort((a: any, b: any) => {
        const c = (a.event_date || '').localeCompare(b.event_date || '');
        if (c !== 0) return c;
        return (a.start_time || '').localeCompare(b.start_time || '');
      })
      .slice(0, 5);

    // 4. Leads recentes do CRM
    const allLeads = leadsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter(isWs);
    const nowTime = Date.now();
    const recentLeads = allLeads
      .filter((l: any) => l.status !== 'Finalizado positivo' && l.status !== 'Finalizado negativo')
      .map((l: any) => {
        const lastAct = l.last_activity_at ? new Date(l.last_activity_at).getTime() : new Date(l.created_at || 0).getTime();
        const is_inactive = (nowTime - lastAct) > (7 * 24 * 60 * 60 * 1000);
        return {
          id: l.id,
          contact_name: l.contact_name,
          company: l.company,
          status: l.status,
          assignee_name: l.assignee_id ? (userMap[l.assignee_id] || null) : null,
          is_inactive: is_inactive ? 1 : 0,
          last_activity_at: l.last_activity_at,
        };
      })
      .sort((a: any, b: any) => (b.last_activity_at || '').localeCompare(a.last_activity_at || ''))
      .slice(0, 5);

    // 5. Financeiro (apenas para Admin)
    let financialSummary = null;
    let partnerExpenses = null;

    if (isAdmin(user)) {
      const allTxs = txSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter(isWs);
      const allAccounts = accountsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter(isWs);

      const currentMonth = today.substring(0, 7);
      const prevDate = new Date();
      prevDate.setMonth(prevDate.getMonth() - 1);
      const prevMonth = prevDate.toISOString().substring(0, 7);

      let current_entries = 0;
      let current_exits = 0;
      let prev_entries = 0;
      let prev_exits = 0;
      let to_receive = 0;
      let to_pay = 0;

      allTxs.forEach((t: any) => {
        const amt = Number(t.amount || 0);
        const paidMonth = t.paid_at ? t.paid_at.substring(0, 7) : '';

        if (t.status === 'Pago') {
          if (t.type === 'Entrada') {
            if (paidMonth === currentMonth) current_entries += amt;
            if (paidMonth === prevMonth) prev_entries += amt;
          } else if (t.type === 'Saída') {
            if (paidMonth === currentMonth) current_exits += amt;
            if (paidMonth === prevMonth) prev_exits += amt;
          }
        } else if (t.status === 'Pendente') {
          if (t.type === 'Entrada') to_receive += amt;
          if (t.type === 'Saída') to_pay += amt;
        }
      });

      let totalBalance = 0;
      const computedAccounts = allAccounts
        .filter((a: any) => a.status !== 'inativo')
        .map((acc: any) => {
          const initial = Number(acc.initial_balance || 0);
          let entries = 0;
          let exits = 0;

          allTxs.forEach((t: any) => {
            if (t.bank_account_id === acc.id && t.status === 'Pago') {
              const amt = Number(t.amount || 0);
              if (t.type === 'Entrada') entries += amt;
              if (t.type === 'Saída') exits += amt;
            }
          });

          const bal = initial + entries - exits;
          totalBalance += bal;
          return {
            id: acc.id,
            name: acc.name,
            bank: acc.bank,
            balance: bal,
          };
        });

      const overdueBills = allTxs
        .filter((t: any) => t.status === 'Pendente' && (t.due_date ? t.due_date.substring(0, 10) < today : false))
        .map((t: any) => ({
          ...t,
          client_name: t.client_id ? (clientMap[t.client_id] || null) : null,
        }))
        .sort((a: any, b: any) => (a.due_date || '').localeCompare(b.due_date || ''))
        .slice(0, 5);

      let monthlyRevenueGoal = 50000;
      settingsSnap.docs.forEach((doc: any) => {
        if (doc.id === 'monthly_revenue_goal' || doc.data()?.key === 'monthly_revenue_goal') {
          monthlyRevenueGoal = parseFloat(doc.data()?.value || '50000') || 50000;
        }
      });

      financialSummary = {
        total_balance: totalBalance,
        accounts: computedAccounts,
        monthly_revenue_goal: monthlyRevenueGoal,
        current_month: {
          entries: current_entries,
          exits: current_exits,
          result: current_entries - current_exits,
        },
        previous_month: {
          entries: prev_entries,
          exits: prev_exits,
          result: prev_entries - prev_exits,
        },
        to_receive,
        to_pay,
        overdue_bills: overdueBills,
      };

      // Sócios
      const partnerUsers = usersSnap.docs
        .map((d: any) => ({ id: d.id, ...d.data() }))
        .filter((u: any) => u.is_partner && u.status === 'ativo' && isWs(u));

      partnerExpenses = partnerUsers.map((u: any) => {
        let month_expenses = 0;
        let month_entries = 0;

        allTxs.forEach((t: any) => {
          if (t.partner_id === u.id && t.status === 'Pago' && t.paid_at && t.paid_at.substring(0, 7) === currentMonth) {
            const amt = Number(t.amount || 0);
            if (t.type === 'Saída') month_expenses += amt;
            if (t.type === 'Entrada') month_entries += amt;
          }
        });

        return {
          id: u.id,
          name: u.name,
          month_expenses,
          month_entries,
        };
      });
    }

    return NextResponse.json({
      role: user.role,
      task_stats: {
        pending_tasks,
        in_production_tasks,
        in_approval_tasks,
        due_soon_tasks,
        overdue_tasks,
      },
      urgent_tasks: urgentTasks,
      active_projects: activeProjects,
      upcoming_events: upcomingEvents,
      recent_leads: recentLeads,
      financial: financialSummary,
      partner_expenses: partnerExpenses,
    });
  } catch (err: any) {
    console.error('[Dashboard API Error]:', err);
    return NextResponse.json({ error: 'Erro ao carregar dados do dashboard.' }, { status: 500 });
  }
}
