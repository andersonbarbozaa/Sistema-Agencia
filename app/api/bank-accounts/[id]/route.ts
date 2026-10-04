import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const firestore = getAdminFirestore();
    const { id } = await params;
    const body = await request.json();
    const { name, bank, type, initial_balance, responsible_partner_id, status } = body;

    const accRef = firestore.collection('bank_accounts').doc(id);
    const accDoc = await accRef.get();
    if (!accDoc.exists) {
      return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
    }

    const existing: any = accDoc.data();
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (bank !== undefined) updateData.bank = bank.trim();
    if (type !== undefined) updateData.type = type;
    if (initial_balance !== undefined) updateData.initial_balance = Number(initial_balance) || 0;
    if (responsible_partner_id !== undefined) updateData.responsible_partner_id = responsible_partner_id;
    if (status !== undefined) updateData.status = status;

    await accRef.set(updateData, { merge: true });

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      module: 'FINANCE',
      recordId: id,
      beforeData: existing,
      afterData: body,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('PATCH /api/bank-accounts/[id] error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar conta bancária.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const firestore = getAdminFirestore();
    const { id } = await params;

    const accRef = firestore.collection('bank_accounts').doc(id);
    const accDoc = await accRef.get();
    if (!accDoc.exists) {
      return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
    }

    // Check if transactions exist
    const txSnap = await firestore
      .collection('financial_transactions')
      .where('bank_account_id', '==', id)
      .limit(1)
      .get();

    if (!txSnap.empty) {
      // Soft-delete / deactivate
      await accRef.set({ status: 'inativo', updated_at: new Date().toISOString() }, { merge: true });
      return NextResponse.json({ success: true, message: 'Conta desativada (possui transações vinculadas).' });
    }

    await accRef.delete();
    return NextResponse.json({ success: true, message: 'Conta removida com sucesso.' });
  } catch (err: any) {
    console.error('DELETE /api/bank-accounts/[id] error:', err);
    return NextResponse.json({ error: 'Erro ao excluir conta bancária.' }, { status: 500 });
  }
}
