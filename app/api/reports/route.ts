import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const todayStr = new Date().toISOString().split('T')[0];

    const [txSnap, catsSnap, clientsSnap, usersSnap] = await Promise.all([
      firestore.collection('financial_transactions').get(),
      firestore.collection('financial_categories').get(),
      firestore.collection('clients').get(),
      firestore.collection('users').get(),
    ]);

    const isWs = (item: any) => {
      if (wsId === 'ws_default') return !item.workspace_id || item.workspace_id === 'ws_default';
      return item.workspace_id === wsId;
    };

    const txs = txSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter(isWs);
    const categories = catsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const clients = clientsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter(isWs);
    const users = usersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter(isWs);

    // 1. Mensal
    const monthlyMap: Record<string, { month: string; entries_paid: number; exits_paid: number; entries_pending: number; exits_pending: number }> = {};
    for (let m = 1; m <= 12; m++) {
      const monthStr = String(m).padStart(2, '0');
      monthlyMap[monthStr] = {
        month: monthStr,
        entries_paid: 0,
        exits_paid: 0,
        entries_pending: 0,
        exits_pending: 0,
      };
    }

    txs.forEach((t: any) => {
      const date = t.paid_at || t.due_date || '';
      if (date.startsWith(year)) {
        const m = date.substring(5, 7);
        if (monthlyMap[m]) {
          const amt = Number(t.amount || 0);
          if (t.type === 'Entrada') {
            if (t.status === 'Pago') monthlyMap[m].entries_paid += amt;
            else if (t.status === 'Pendente') monthlyMap[m].entries_pending += amt;
          } else if (t.type === 'Saída') {
            if (t.status === 'Pago') monthlyMap[m].exits_paid += amt;
            else if (t.status === 'Pendente') monthlyMap[m].exits_pending += amt;
          }
        }
      }
    });

    const monthlyData = Object.values(monthlyMap);

    // 2. Gastos por categoria (Saídas Pagas)
    const catMap: Record<string, { id: string; name: string; total_amount: number; count: number }> = {};
    categories.forEach((c: any) => {
      catMap[c.id] = { id: c.id, name: c.name, total_amount: 0, count: 0 };
    });

    txs.forEach((t: any) => {
      if (t.type === 'Saída' && t.status === 'Pago' && t.category_id) {
        if (!catMap[t.category_id]) {
          catMap[t.category_id] = { id: t.category_id, name: 'Outros', total_amount: 0, count: 0 };
        }
        catMap[t.category_id].total_amount += Number(t.amount || 0);
        catMap[t.category_id].count++;
      }
    });

    const categorySpending = Object.values(catMap)
      .filter((c) => c.count > 0)
      .sort((a, b) => b.total_amount - a.total_amount);

    // 3. Faturamento por cliente
    const clientBilling = clients.map((c: any) => {
      let total_received = 0;
      let total_pending = 0;
      let total_overdue = 0;
      let transaction_count = 0;

      txs.forEach((t: any) => {
        if (t.client_id === c.id && t.type === 'Entrada') {
          transaction_count++;
          const amt = Number(t.amount || 0);
          if (t.status === 'Pago') total_received += amt;
          if (t.status === 'Pendente') {
            total_pending += amt;
            if (t.due_date && t.due_date < todayStr) {
              total_overdue += amt;
            }
          }
        }
      });

      return {
        id: c.id,
        name: c.name,
        total_received,
        total_pending,
        total_overdue,
        transaction_count,
      };
    }).sort((a, b) => b.total_received - a.total_received);

    // 4. Sócios
    const partnerData = users
      .filter((u: any) => u.is_partner && u.status === 'ativo')
      .map((u: any) => {
        let total_expenses = 0;
        let total_entries = 0;
        let transaction_count = 0;

        txs.forEach((t: any) => {
          if (t.partner_id === u.id && t.status === 'Pago') {
            transaction_count++;
            const amt = Number(t.amount || 0);
            if (t.type === 'Saída') total_expenses += amt;
            if (t.type === 'Entrada') total_entries += amt;
          }
        });

        return {
          id: u.id,
          name: u.name,
          total_expenses,
          total_entries,
          transaction_count,
        };
      });

    return NextResponse.json({
      year,
      monthly: monthlyData,
      by_category: categorySpending,
      by_client: clientBilling,
      by_partner: partnerData,
    });
  } catch (err: any) {
    console.error('[Reports Error]:', err);
    return NextResponse.json({ error: 'Erro ao gerar relatórios.' }, { status: 500 });
  }
}
