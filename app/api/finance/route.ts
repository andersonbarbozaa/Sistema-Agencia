import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const PAGE_SIZE = 20;

// GET /api/finance — list transactions (all roles except CLIENTE)
export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');           // Entrada | Saída
  const status = searchParams.get('status');       // Pendente | Pago
  const client_id = searchParams.get('client_id');
  const bank_account_id = searchParams.get('bank_account_id');
  const category_id = searchParams.get('category_id');
  const date_from = searchParams.get('date_from');
  const date_to = searchParams.get('date_to');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  try {
    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';

    let queryRef: any = firestore.collection('financial_transactions');
    if (wsId !== 'ws_default') {
      queryRef = queryRef.where('workspace_id', '==', wsId);
    }

    const snap = await queryRef.get();
    let txs = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    if (wsId === 'ws_default') {
      txs = txs.filter((t: any) => !t.workspace_id || t.workspace_id === 'ws_default');
    }

    if (type && type !== 'todos') txs = txs.filter((t: any) => t.type === type);
    if (status && status !== 'todos') txs = txs.filter((t: any) => t.status === status);
    if (client_id) txs = txs.filter((t: any) => t.client_id === client_id);
    if (bank_account_id) txs = txs.filter((t: any) => t.bank_account_id === bank_account_id);
    if (category_id) txs = txs.filter((t: any) => t.category_id === category_id);
    if (date_from) txs = txs.filter((t: any) => t.due_date >= date_from);
    if (date_to) txs = txs.filter((t: any) => t.due_date <= date_to);

    // Carregar relacionamentos (categorias, contas bancárias, clientes, usuários) em paralelo
    const [catsSnap, accountsSnap, clientsSnap, usersSnap] = await Promise.all([
      firestore.collection('financial_categories').get(),
      firestore.collection('bank_accounts').get(),
      firestore.collection('clients').get(),
      firestore.collection('users').get(),
    ]);

    const catMap: Record<string, string> = {};
    catsSnap.docs.forEach((d: any) => { catMap[d.id] = d.data().name; });

    const accMap: Record<string, string> = {};
    accountsSnap.docs.forEach((d: any) => { accMap[d.id] = d.data().name; });

    const cliMap: Record<string, string> = {};
    clientsSnap.docs.forEach((d: any) => { cliMap[d.id] = d.data().name; });

    const userMap: Record<string, string> = {};
    usersSnap.docs.forEach((d: any) => { userMap[d.id] = d.data().name || d.data().email; });

    txs = txs.map((t: any) => ({
      ...t,
      amount: Number(t.amount || 0),
      category_name: t.category_id ? (catMap[t.category_id] || null) : null,
      bank_account_name: t.bank_account_id ? (accMap[t.bank_account_id] || null) : null,
      client_name: t.client_id ? (cliMap[t.client_id] || null) : null,
      created_by_name: t.created_by ? (userMap[t.created_by] || null) : null,
    }));

    // Ordenação decrescente por due_date e created_at
    txs.sort((a: any, b: any) => {
      const dateA = a.due_date || a.created_at || '';
      const dateB = b.due_date || b.created_at || '';
      return dateB.localeCompare(dateA);
    });

    const total = txs.length;
    const paginated = txs.slice(offset, offset + PAGE_SIZE);

    return NextResponse.json({
      data: paginated,
      pagination: {
        page,
        page_size: PAGE_SIZE,
        total,
        total_pages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (error: any) {
    console.error('[GET /api/finance]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/finance — create transaction (admin only)
export async function POST(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { description, amount, type, due_date, status, client_id, bank_account_id, category_id, notes, partner_id } = body;

    if (!description || amount == null || !type || !due_date) {
      return NextResponse.json(
        { error: 'Missing required fields: description, amount, type, due_date' },
        { status: 400 }
      );
    }

    if (!['Entrada', 'Saída'].includes(type)) {
      return NextResponse.json({ error: 'type must be Entrada or Saída' }, { status: 400 });
    }

    const firestore = getAdminFirestore();
    const id = 'fin_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const txStatus = status ?? 'Pendente';
    const wsId = user.workspace_id || 'ws_default';

    const transactionData = {
      id,
      description: String(description).trim(),
      amount: Number(amount),
      type,
      status: txStatus,
      due_date,
      paid_at: txStatus === 'Pago' ? (body.paid_at || now) : null,
      client_id: client_id ?? null,
      bank_account_id: bank_account_id ?? null,
      category_id: category_id ?? null,
      partner_id: partner_id ?? null,
      notes: notes ?? null,
      created_by: user.id,
      workspace_id: wsId,
      created_at: now,
      updated_at: now,
    };

    await firestore.collection('financial_transactions').doc(id).set(transactionData);

    await logAudit({
      user_id: user.id,
      action: 'CREATE',
      entity: 'transaction',
      entity_id: id,
      details: `Created ${type} transaction: ${description} — R$ ${amount}`,
    });

    return NextResponse.json({ data: transactionData }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/finance]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
