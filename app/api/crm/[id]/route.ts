import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/crm/[id] - Single lead with interactions
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const firestore = getAdminFirestore();

    const leadDoc = await firestore.collection('crm_leads').doc(id).get();
    if (!leadDoc.exists) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const leadData: any = { id: leadDoc.id, ...leadDoc.data() };

    // Workspace check
    const wsId = user.workspace_id || 'ws_default';
    if (wsId !== 'ws_default' && leadData.workspace_id && leadData.workspace_id !== wsId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Assignee name
    let assignee_name = null;
    if (leadData.assignee_id) {
      const uDoc = await firestore.collection('users').doc(leadData.assignee_id).get();
      if (uDoc.exists) {
        assignee_name = uDoc.data()?.name || null;
      }
    }

    const lastAct = leadData.last_activity_at ? new Date(leadData.last_activity_at).getTime() : new Date(leadData.created_at || 0).getTime();
    const is_inactive = (Date.now() - lastAct) > (7 * 24 * 60 * 60 * 1000);

    // Get interactions
    const interSnap = await firestore
      .collection('crm_interactions')
      .where('lead_id', '==', id)
      .get();

    let interactions = interSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // User names for interactions
    const userMap: Record<string, string> = {};
    const usersSnap = await firestore.collection('users').get();
    usersSnap.docs.forEach((uDoc: any) => {
      const uData = uDoc.data();
      userMap[uDoc.id] = uData.name || uData.email;
      if (uData.id) userMap[uData.id] = uData.name || uData.email;
    });

    interactions = interactions.map((i: any) => ({
      ...i,
      author_name: i.user_id ? (userMap[i.user_id] || null) : null
    }));

    interactions.sort((a: any, b: any) => new Date(b.interaction_date || b.created_at || 0).getTime() - new Date(a.interaction_date || a.created_at || 0).getTime());

    return NextResponse.json({
      data: {
        ...leadData,
        assignee_name,
        is_inactive: is_inactive ? 1 : 0,
        interactions
      }
    });
  } catch (error: any) {
    console.error('GET /api/crm/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/crm/[id] - Update lead
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const existingData: any = leadDoc.data();
    const wsId = user.workspace_id || 'ws_default';
    if (wsId !== 'ws_default' && existingData.workspace_id && existingData.workspace_id !== wsId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const payload: Record<string, any> = { ...body };
    if ('whatsapp' in payload && !('phone' in payload)) payload.phone = payload.whatsapp;
    if ('platform' in payload && !('source' in payload)) payload.source = payload.platform;

    const allowedFields = ['contact_name', 'company', 'email', 'phone', 'status', 'assignee_id', 'notes', 'source', 'estimated_value'];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (field in payload) {
        updateData[field] = payload[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const now = new Date().toISOString();
    updateData.last_activity_at = now;
    updateData.updated_at = now;

    await leadRef.set(updateData, { merge: true });

    await logAudit(user.id, 'crm_leads', 'UPDATE', id, body);

    const updatedDoc = await leadRef.get();
    const updatedData: any = { id: updatedDoc.id, ...updatedDoc.data() };

    let assignee_name = null;
    if (updatedData.assignee_id) {
      const uDoc = await firestore.collection('users').doc(updatedData.assignee_id).get();
      if (uDoc.exists) assignee_name = uDoc.data()?.name || null;
    }

    return NextResponse.json({
      data: {
        ...updatedData,
        assignee_name,
        is_inactive: 0
      }
    });
  } catch (error: any) {
    console.error('PATCH /api/crm/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/crm/[id] - Delete lead (admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const firestore = getAdminFirestore();

    const leadRef = firestore.collection('crm_leads').doc(id);
    const leadDoc = await leadRef.get();
    if (!leadDoc.exists) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    await leadRef.delete();

    // Delete associated interactions
    const interSnap = await firestore.collection('crm_interactions').where('lead_id', '==', id).get();
    const batch = firestore.batch();
    interSnap.docs.forEach((doc: any) => batch.delete(doc.ref));
    await batch.commit();

    await logAudit(user.id, 'crm_leads', 'DELETE', id);

    return NextResponse.json({ message: 'Lead deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/crm/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
