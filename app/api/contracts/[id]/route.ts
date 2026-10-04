import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/contracts/[id] - Get single contract
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const firestore = getAdminFirestore();

    const contractDoc = await firestore.collection('contracts').doc(id).get();
    if (!contractDoc.exists) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    const contractData: any = { id: contractDoc.id, ...contractDoc.data() };

    // CLIENTE: can only view their own contracts
    if (user.role === 'CLIENTE' && contractData.client_id !== user.client_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let client_name = null;
    if (contractData.client_id) {
      const cl = await firestore.collection('clients').doc(contractData.client_id).get();
      if (cl.exists) client_name = cl.data()?.name || null;
    }

    return NextResponse.json({
      data: {
        ...contractData,
        client_name,
      }
    });
  } catch (error: any) {
    console.error('GET /api/contracts/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/contracts/[id] - Update contract (admin only)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const firestore = getAdminFirestore();

    const contractRef = firestore.collection('contracts').doc(id);
    const contractDoc = await contractRef.get();
    if (!contractDoc.exists) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    const existing: any = contractDoc.data();
    const body = await request.json();
    const allowedFields = ['title', 'description', 'value', 'start_date', 'end_date', 'status', 'file_url', 'client_id'];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = field === 'value' ? (body[field] ? Number(body[field]) : null) : body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const now = new Date().toISOString();
    updateData.updated_at = now;

    await contractRef.set(updateData, { merge: true });

    await logAudit(user.id, 'contracts', 'UPDATE', id, body);

    const updatedDoc = await contractRef.get();
    const updatedData: any = { id: updatedDoc.id, ...updatedDoc.data() };

    let client_name = null;
    if (updatedData.client_id) {
      const cl = await firestore.collection('clients').doc(updatedData.client_id).get();
      if (cl.exists) client_name = cl.data()?.name || null;
    }

    return NextResponse.json({
      data: {
        ...updatedData,
        client_name,
      }
    });
  } catch (error: any) {
    console.error('PATCH /api/contracts/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/contracts/[id] - Delete contract (admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const firestore = getAdminFirestore();

    const contractRef = firestore.collection('contracts').doc(id);
    const contractDoc = await contractRef.get();
    if (!contractDoc.exists) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    await contractRef.delete();

    await logAudit(user.id, 'contracts', 'DELETE', id);

    return NextResponse.json({ success: true, message: 'Contrato excluído com sucesso.' });
  } catch (error: any) {
    console.error('DELETE /api/contracts/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
