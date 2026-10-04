import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/clients/[id] ───────────────────────────────────────────────────
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (user.role === 'CLIENTE' && user.client_id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const firestore = getAdminFirestore();
    const doc = await firestore.collection('clients').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = { id: doc.id, ...doc.data() };
    return NextResponse.json({ data: client, client });
  } catch (error: any) {
    console.error('[GET /api/clients/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// ─── PATCH /api/clients/[id] ─────────────────────────────────────────────────
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const { id } = await params;
    const firestore = getAdminFirestore();
    const docRef = firestore.collection('clients').doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const body = await request.json();
    const ALLOWED_FIELDS = [
      'name',
      'corporate_name',
      'trade_name',
      'avatar_url',
      'document',
      'email',
      'phone',
      'whatsapp',
      'address',
      'city',
      'state',
      'website',
      'instagram',
      'responsible_user_id',
      'notes',
      'status',
    ];

    if ('cnpj' in body && !('document' in body)) {
      body.document = body.cnpj;
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    for (const field of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updateData[field] = body[field] ?? null;
      }
    }

    await docRef.set(updateData, { merge: true });

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      resource: 'clients',
      resourceId: id,
      details: `Client "${id}" updated`,
    });

    const updatedDoc = await docRef.get();
    return NextResponse.json({ data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    console.error('[PATCH /api/clients/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// ─── DELETE /api/clients/[id] ────────────────────────────────────────────────
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const { id } = await params;
    const firestore = getAdminFirestore();
    const docRef = firestore.collection('clients').doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    await docRef.set({
      status: 'arquivado',
      updated_at: new Date().toISOString(),
    }, { merge: true });

    await logAudit({
      userId: user.id,
      action: 'ARCHIVE',
      resource: 'clients',
      resourceId: id,
      details: `Client "${id}" archived`,
    });

    return NextResponse.json({ message: 'Client archived successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/clients/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
