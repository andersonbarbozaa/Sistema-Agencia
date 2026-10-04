import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/finance/[id] — single transaction
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = await params;
    const firestore = getAdminFirestore();

    const txDoc = await firestore.collection('financial_transactions').doc(id).get();
    if (!txDoc.exists) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    const txData: any = { id: txDoc.id, ...txDoc.data() };
    const wsId = user.workspace_id || 'ws_default';
    if (wsId !== 'ws_default' && txData.workspace_id && txData.workspace_id !== wsId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let category_name = null;
    let bank_account_name = null;
    let client_name = null;
    let created_by_name = null;

    if (txData.category_id) {
      const c = await firestore.collection('financial_categories').doc(txData.category_id).get();
      if (c.exists) category_name = c.data()?.name || null;
    }
    if (txData.bank_account_id) {
      const b = await firestore.collection('bank_accounts').doc(txData.bank_account_id).get();
      if (b.exists) bank_account_name = b.data()?.name || null;
    }
    if (txData.client_id) {
      const cl = await firestore.collection('clients').doc(txData.client_id).get();
      if (cl.exists) client_name = cl.data()?.name || null;
    }
    if (txData.created_by) {
      const u = await firestore.collection('users').doc(txData.created_by).get();
      if (u.exists) created_by_name = u.data()?.name || u.data()?.email || null;
    }

    return NextResponse.json({
      data: {
        ...txData,
        amount: Number(txData.amount || 0),
        category_name,
        bank_account_name,
        client_name,
        created_by_name,
      }
    });
  } catch (error: any) {
    console.error('[GET /api/finance/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/finance/[id] — update transaction
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = await params;
    const firestore = getAdminFirestore();

    const txRef = firestore.collection('financial_transactions').doc(id);
    const txDoc = await txRef.get();
    if (!txDoc.exists) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    const existing: any = txDoc.data();
    const wsId = user.workspace_id || 'ws_default';
    if (wsId !== 'ws_default' && existing.workspace_id && existing.workspace_id !== wsId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const now = new Date().toISOString();

    const allowedFields = ['description', 'amount', 'type', 'status', 'due_date', 'paid_at', 'client_id', 'bank_account_id', 'category_id', 'partner_id', 'notes'];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = field === 'amount' ? Number(body[field]) : body[field];
      }
    }

    // Auto-set paid_at when marking as Pago
    if (body.status === 'Pago' && existing.status !== 'Pago') {
      if (!body.paid_at && !updateData.paid_at) {
        updateData.paid_at = now;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updateData.updated_at = now;

    await txRef.set(updateData, { merge: true });

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      entity: 'transaction',
      entityId: id,
      beforeData: existing,
      afterData: { ...existing, ...updateData },
    });

    const updatedDoc = await txRef.get();
    return NextResponse.json({ data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    console.error('[PATCH /api/finance/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/finance/[id] — delete transaction (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = await params;
    const firestore = getAdminFirestore();

    const txRef = firestore.collection('financial_transactions').doc(id);
    const txDoc = await txRef.get();
    if (!txDoc.exists) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    const existing: any = txDoc.data();
    await txRef.delete();

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      entity: 'transaction',
      entityId: id,
      beforeData: existing,
    });

    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (error: any) {
    console.error('[DELETE /api/finance/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
