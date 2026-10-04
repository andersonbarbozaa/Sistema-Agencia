import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

// GET /api/crm - List leads with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignee_id = searchParams.get('assignee_id');
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = 20;

    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';

    let queryRef: any = firestore.collection('crm_leads');
    if (wsId !== 'ws_default') {
      queryRef = queryRef.where('workspace_id', '==', wsId);
    }

    const snap = await queryRef.get();
    let leads = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    if (wsId === 'ws_default') {
      leads = leads.filter((l: any) => !l.workspace_id || l.workspace_id === 'ws_default');
    }

    if (status && status !== 'todos') {
      leads = leads.filter((l: any) => l.status === status);
    }
    if (assignee_id) {
      leads = leads.filter((l: any) => l.assignee_id === assignee_id);
    }
    if (search) {
      leads = leads.filter((l: any) =>
        (l.contact_name && l.contact_name.toLowerCase().includes(search)) ||
        (l.company && l.company.toLowerCase().includes(search)) ||
        (l.email && l.email.toLowerCase().includes(search)) ||
        (l.phone && l.phone.toLowerCase().includes(search))
      );
    }

    // Buscar nomes dos usuários para os assignees
    const userMap: Record<string, string> = {};
    const usersSnap = await firestore.collection('users').get();
    usersSnap.docs.forEach((uDoc: any) => {
      const uData = uDoc.data();
      userMap[uDoc.id] = uData.name || uData.email;
      if (uData.id) userMap[uData.id] = uData.name || uData.email;
    });

    const nowTime = Date.now();
    leads = leads.map((l: any) => {
      const lastAct = l.last_activity_at ? new Date(l.last_activity_at).getTime() : new Date(l.created_at || 0).getTime();
      const is_inactive = (nowTime - lastAct) > (7 * 24 * 60 * 60 * 1000);
      return {
        ...l,
        assignee_name: l.assignee_id ? (userMap[l.assignee_id] || null) : null,
        is_inactive: is_inactive ? 1 : 0
      };
    });

    leads.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const total = leads.length;
    const offset = (page - 1) * limit;
    const paginatedLeads = leads.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedLeads,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('GET /api/crm error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/crm - Create lead
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMINISTRADOR', 'COLABORADOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const contact_name = body.contact_name;
    const company = body.company ?? null;
    const email = body.email ?? null;
    const phone = body.phone || body.whatsapp || null;
    const status = body.status ?? 'Novo';
    const assignee_id = body.assignee_id ?? null;
    const notes = body.notes ?? null;
    const source = body.source || body.platform || null;
    const estimated_value = body.estimated_value ? Number(body.estimated_value) : null;

    if (!contact_name) {
      return NextResponse.json({ error: 'contact_name is required' }, { status: 400 });
    }

    const firestore = getAdminFirestore();
    const id = 'lead_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const wsId = user.workspace_id || 'ws_default';

    const newLead = {
      id,
      contact_name: contact_name.trim(),
      company,
      email,
      phone,
      status,
      assignee_id,
      notes,
      source,
      estimated_value,
      workspace_id: wsId,
      last_activity_at: now,
      created_at: now,
      updated_at: now,
    };

    await firestore.collection('crm_leads').doc(id).set(newLead);

    await logAudit(user.id, 'crm_leads', 'CREATE', id, { contact_name, company });

    if (assignee_id && assignee_id !== user.id) {
      await createNotification(
        assignee_id,
        'lead_assigned',
        `Você foi designado para o lead: ${contact_name}`,
        id,
        'crm_lead'
      );
    }

    return NextResponse.json({ data: newLead }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/crm error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
