import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || user.role === 'CLIENTE') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';

    let accountsQuery: any = firestore.collection('bank_accounts');
    if (wsId !== 'ws_default') {
      accountsQuery = accountsQuery.where('workspace_id', '==', wsId);
    }

    let txsQuery: any = firestore.collection('financial_transactions');
    if (wsId !== 'ws_default') {
      txsQuery = txsQuery.where('workspace_id', '==', wsId);
    }

    const [accSnap, txSnap, usersSnap] = await Promise.all([
      accountsQuery.get(),
      txsQuery.get(),
      firestore.collection('users').get(),
    ]);

    let accounts = accSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    if (wsId === 'ws_default') {
      accounts = accounts.filter((a: any) => !a.workspace_id || a.workspace_id === 'ws_default');
    }

    const txs = txSnap.docs.map((d: any) => d.data());

    const userMap: Record<string, string> = {};
    usersSnap.docs.forEach((d: any) => {
      userMap[d.id] = d.data().name || d.data().email;
    });

    const enriched = accounts.map((acc: any) => {
      let total_entries = 0;
      let total_exits = 0;

      txs.forEach((t: any) => {
        if (t.bank_account_id === acc.id && t.status === 'Pago') {
          const amt = Number(t.amount || 0);
          if (t.type === 'Entrada') total_entries += amt;
          if (t.type === 'Saída') total_exits += amt;
        }
      });

      const initial = Number(acc.initial_balance || 0);
      return {
        ...acc,
        initial_balance: initial,
        total_entries,
        total_exits,
        current_balance: initial + total_entries - total_exits,
        responsible_partner_name: acc.responsible_partner_id ? (userMap[acc.responsible_partner_id] || null) : null,
      };
    });

    enriched.sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

    return NextResponse.json({ accounts: enriched });
  } catch (err: any) {
    console.error('GET /api/bank-accounts error:', err);
    return NextResponse.json({ error: 'Erro ao listar contas bancárias.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const firestore = getAdminFirestore();
    const body = await request.json();
    const { name, bank, type = 'Corrente', initial_balance = 0, responsible_partner_id, status = 'ativo' } = body;

    if (!name || !bank) {
      return NextResponse.json({ error: 'Nome e Banco são obrigatórios.' }, { status: 400 });
    }

    const id = generateId('acc');
    const wsId = user.workspace_id || 'ws_default';
    const now = new Date().toISOString();

    const accountData = {
      id,
      name: name.trim(),
      bank: bank.trim(),
      type,
      initial_balance: Number(initial_balance) || 0,
      responsible_partner_id: responsible_partner_id || null,
      status,
      workspace_id: wsId,
      created_at: now,
      updated_at: now,
    };

    await firestore.collection('bank_accounts').doc(id).set(accountData);

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      module: 'FINANCE',
      recordId: id,
      afterData: body,
    });

    return NextResponse.json({ success: true, id, account: accountData });
  } catch (err: any) {
    console.error('POST /api/bank-accounts error:', err);
    return NextResponse.json({ error: 'Erro ao criar conta bancária.' }, { status: 500 });
  }
}
