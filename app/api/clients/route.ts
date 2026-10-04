import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// ─── GET /api/clients ────────────────────────────────────────────────────────
// List clients from Firebase Firestore with multi-tenant workspace isolation.
export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role === 'CLIENTE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() ?? '';
    const status = searchParams.get('status')?.trim() ?? '';
    const limit = 50;

    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';

    // Firestore query com isolamento de workspace
    let queryRef: any = firestore.collection('clients');
    if (wsId !== 'ws_default') {
      queryRef = queryRef.where('workspace_id', '==', wsId);
    }

    const snap = await queryRef.get();
    let clients = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    // Filtro adicional de workspace caso seja ws_default
    if (wsId === 'ws_default') {
      clients = clients.filter((c: any) => !c.workspace_id || c.workspace_id === 'ws_default');
    }

    if (status && status !== 'todos') {
      clients = clients.filter((c: any) => c.status === status);
    }

    if (search) {
      clients = clients.filter((c: any) =>
        (c.name && c.name.toLowerCase().includes(search)) ||
        (c.trade_name && c.trade_name.toLowerCase().includes(search)) ||
        (c.document && c.document.toLowerCase().includes(search))
      );
    }

    // Ordenação decrescente por created_at
    clients.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return NextResponse.json({
      data: clients,
      clients: clients,
      pagination: {
        limit,
        hasNextPage: false,
        nextCursor: null,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/clients]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// ─── POST /api/clients ───────────────────────────────────────────────────────
// Create a new client in Firebase Firestore. Admin only.
export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Field "name" is required' },
        { status: 400 }
      );
    }

    const id = 'cli_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const wsId = user.workspace_id || 'ws_default';

    const clientData = {
      id,
      name: name.trim(),
      corporate_name: body.corporate_name ?? null,
      trade_name: body.trade_name ?? null,
      avatar_url: body.avatar_url ?? null,
      document: body.document ?? body.cnpj ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      whatsapp: body.whatsapp ?? null,
      address: body.address ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      website: body.website ?? null,
      instagram: body.instagram ?? null,
      responsible_user_id: body.responsible_user_id ?? null,
      notes: body.notes ?? null,
      status: body.status ?? 'ativo',
      workspace_id: wsId,
      created_at: now,
      updated_at: now,
    };

    const firestore = getAdminFirestore();
    await firestore.collection('clients').doc(id).set(clientData);

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      resource: 'clients',
      resourceId: id,
      details: `Client "${name.trim()}" created`,
    });

    return NextResponse.json({ data: clientData, client: clientData }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/clients]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
