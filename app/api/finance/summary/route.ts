import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';

// GET /api/finance/summary — financial dashboard summary (admin only)
export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const firestore = getAdminFirestore();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const monthEnd = nextMonth.toISOString().split('T')[0];

    const wsId = user.workspace_id || 'ws_default';

    // Obter transações e contas bancárias do workspace
    let txQuery: any = firestore.collection('financial_transactions');
    if (wsId !== 'ws_default') {
      txQuery = txQuery.where('workspace_id', '==', wsId);
    }
    const txSnap = await txQuery.get();
    let txs = txSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (wsId === 'ws_default') {
      txs = txs.filter((t: any) => !t.workspace_id || t.workspace_id === 'ws_default');
    }

    let accountsQuery: any = firestore.collection('bank_accounts');
    if (wsId !== 'ws_default') {
      accountsQuery = accountsQuery.where('workspace_id', '==', wsId);
    }
    const accSnap = await accountsQuery.get();
    let accounts = accSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (wsId === 'ws_default') {
      accounts = accounts.filter((a: any) => !a.workspace_id || a.workspace_id === 'ws_default');
    }

    // Calcular agregados
    let total_entries_month = 0;
    let total_exits_month = 0;
    let total_pending_receive = 0;
    let total_pending_pay = 0;
    let overdue_receive = 0;
    let overdue_pay = 0;

    txs.forEach((t: any) => {
      const amt = Number(t.amount || 0);
      const isPaid = t.status === 'Pago';
      const isPending = t.status === 'Pendente';
      const paidDate = t.paid_at ? t.paid_at.substring(0, 10) : '';
      const dueDate = t.due_date ? t.due_date.substring(0, 10) : '';

      if (t.type === 'Entrada') {
        if (isPaid && paidDate >= monthStart && paidDate < monthEnd) {
          total_entries_month += amt;
        }
        if (isPending) {
          total_pending_receive += amt;
          if (dueDate && dueDate < todayStr) {
            overdue_receive += amt;
          }
        }
      } else if (t.type === 'Saída') {
        if (isPaid && paidDate >= monthStart && paidDate < monthEnd) {
          total_exits_month += amt;
        }
        if (isPending) {
          total_pending_pay += amt;
          if (dueDate && dueDate < todayStr) {
            overdue_pay += amt;
          }
        }
      }
    });

    // Saldo bancário por conta
    const bank_balances = accounts
      .filter((a: any) => a.status !== 'inativo')
      .map((acc: any) => {
        const initial = Number(acc.initial_balance || 0);
        let entries = 0;
        let exits = 0;

        txs.forEach((t: any) => {
          if (t.bank_account_id === acc.id && t.status === 'Pago') {
            const amt = Number(t.amount || 0);
            if (t.type === 'Entrada') entries += amt;
            if (t.type === 'Saída') exits += amt;
          }
        });

        return {
          id: acc.id,
          account_name: acc.name,
          balance: initial + entries - exits,
        };
      });

    return NextResponse.json({
      data: {
        total_entries_month,
        total_exits_month,
        total_pending_receive,
        total_pending_pay,
        overdue_receive,
        overdue_pay,
        bank_balances,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/finance/summary]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
