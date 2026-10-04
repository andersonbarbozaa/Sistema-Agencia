import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/crm/[id]/interactions - List interactions for a lead
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const firestore = getAdminFirestore();

    const leadDoc = await firestore.collection('crm_leads').doc(id).get();
    if (!leadDoc.exists) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const interSnap = await firestore
      .collection('crm_interactions')
      .where('lead_id', '==', id)
      .get();

    let interactions = interSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const usersSnap = await firestore.collection('users').get();
    const userMap: Record<string, string> = {};
    usersSnap.docs.forEach((uDoc: any) => {
      const uData = uDoc.data();
      userMap[uDoc.id] = uData.name || uData.email;
      if (uData.id) userMap[uData.id] = uData.name || uData.email;
    });

    interactions = interactions.map((i: any) => ({
      ...i,
      author_name: i.user_id ? (userMap[i.user_id] || null) : null
    }));

    interactions.sort((a: any, b: any) =>
      new Date(b.interaction_date || b.created_at || 0).getTime() - new Date(a.interaction_date || a.created_at || 0).getTime()
    );

    return NextResponse.json({ data: interactions });
  } catch (error: any) {
    console.error('GET /api/crm/[id]/interactions error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/crm/[id]/interactions - Add interaction and update lead activity
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMINISTRADOR', 'COLABORADOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const firestore = getAdminFirestore();

    const leadRef = firestore.collection('crm_leads').doc(id);
    const leadDoc = await leadRef.get();
    if (!leadDoc.exists) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const body = await request.json();
    const { type, notes, interaction_date } = body;

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    const interactionId =
      'intr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const interactionDate = interaction_date ?? now;

    const interactionData = {
      id: interactionId,
      lead_id: id,
      user_id: user.id,
      type,
      notes: notes ?? null,
      interaction_date: interactionDate,
      created_at: now
    };

    await firestore.collection('crm_interactions').doc(interactionId).set(interactionData);

    // Update lead last_activity_at
    await leadRef.set({
      last_activity_at: now,
      updated_at: now
    }, { merge: true });

    await logAudit(user.id, 'crm_interactions', 'CREATE', interactionId, { lead_id: id, type });

    return NextResponse.json({
      data: {
        ...interactionData,
        author_name: user.name || user.email
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/crm/[id]/interactions error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
