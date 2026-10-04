import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/clients/[id]/summary ───────────────────────────────────────────
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

    const firestore = getAdminFirestore();

    const clientDoc = await firestore.collection('clients').doc(id).get();
    if (!clientDoc.exists) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const [tasksSnap, projectsSnap, txsSnap, contractsSnap] = await Promise.all([
      firestore.collection('tasks').where('client_id', '==', id).get(),
      firestore.collection('projects').where('client_id', '==', id).get(),
      firestore.collection('financial_transactions').where('client_id', '==', id).get(),
      firestore.collection('contracts').where('client_id', '==', id).get(),
    ]);

    const tasks = tasksSnap.docs.map((d: any) => d.data());
    const total_tasks = tasks.length;
    const completed_tasks = tasks.filter((t: any) => t.status === 'Concluída' || t.status === 'Aprovada').length;
    const pending_tasks = total_tasks - completed_tasks;

    const projects = projectsSnap.docs.map((d: any) => d.data());
    const active_projects = projects.filter((p: any) => p.status !== 'Concluído' && p.status !== 'Cancelado').length;

    const txs = txsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    let total_revenue = 0;
    let pending_revenue = 0;

    txs.forEach((t: any) => {
      const amt = Number(t.amount || 0);
      if (t.type === 'Entrada') {
        total_revenue += amt;
        if (t.status === 'Pendente') {
          pending_revenue += amt;
        }
      }
    });

    const recentTransactions = [...txs]
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5);

    const activeContracts = contractsSnap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((c: any) => c.status === 'Ativo' || c.status === 'ativo')
      .sort((a: any, b: any) => new Date(b.start_date || b.created_at || 0).getTime() - new Date(a.start_date || a.created_at || 0).getTime());

    return NextResponse.json({
      data: {
        client: { id: clientDoc.id, ...clientDoc.data() },
        tasks: {
          total_tasks,
          pending_tasks,
          completed_tasks,
        },
        projects: {
          active_projects,
        },
        financial: {
          total_revenue,
          pending_revenue,
          recent_transactions: recentTransactions,
        },
        contracts: {
          active_contracts: activeContracts,
        },
      },
    });
  } catch (error: any) {
    console.error('[GET /api/clients/[id]/summary]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
