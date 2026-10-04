import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/contracts - List contracts with optional client_id/status filters
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get('client_id');
    const status = searchParams.get('status');

    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';

    let queryRef: any = firestore.collection('contracts');
    if (wsId !== 'ws_default') {
      queryRef = queryRef.where('workspace_id', '==', wsId);
    }

    const [contractsSnap, clientsSnap] = await Promise.all([
      queryRef.get(),
      firestore.collection('clients').get(),
    ]);

    let contracts = contractsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (wsId === 'ws_default') {
      contracts = contracts.filter((c: any) => !c.workspace_id || c.workspace_id === 'ws_default');
    }

    const clientMap: Record<string, string> = {};
    clientsSnap.docs.forEach((d: any) => { clientMap[d.id] = d.data().name; });

    // CLIENTE role can only see their own contracts
    if (user.role === 'CLIENTE') {
      contracts = contracts.filter((c: any) => c.client_id === user.client_id);
    } else if (client_id) {
      contracts = contracts.filter((c: any) => c.client_id === client_id);
    }

    if (status && status !== 'todos') {
      contracts = contracts.filter((c: any) => c.status === status);
    }

    contracts = contracts.map((c: any) => ({
      ...c,
      client_name: c.client_id ? (clientMap[c.client_id] || null) : null,
    }));

    contracts.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return NextResponse.json({ data: contracts });
  } catch (error: any) {
    console.error('GET /api/contracts error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/contracts - Create contract (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { client_id, title, description, value, start_date, end_date, status, file_url } = body;

    if (!client_id || !title) {
      return NextResponse.json({ error: 'client_id and title are required' }, { status: 400 });
    }

    const firestore = getAdminFirestore();

    // Validate client exists
    const clientDoc = await firestore.collection('clients').doc(client_id).get();
    if (!clientDoc.exists) {
      return NextResponse.json({ error: 'client_id does not exist' }, { status: 422 });
    }

    const id = 'ctr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const wsId = user.workspace_id || 'ws_default';

    const contractData = {
      id,
      client_id,
      title: title.trim(),
      description: description ?? null,
      value: value ? Number(value) : null,
      start_date: start_date ?? null,
      end_date: end_date ?? null,
      status: status ?? 'Ativo',
      file_url: file_url ?? null,
      created_by: user.id,
      workspace_id: wsId,
      created_at: now,
      updated_at: now,
    };

    await firestore.collection('contracts').doc(id).set(contractData);

    await logAudit(user.id, 'contracts', 'CREATE', id, { client_id, title });

    return NextResponse.json({
      data: {
        ...contractData,
        client_name: clientDoc.data()?.name || null,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/contracts error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
