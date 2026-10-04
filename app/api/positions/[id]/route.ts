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

    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    const firestore = getAdminFirestore();
    const posRef = firestore.collection('positions').doc(id);
    const posDoc = await posRef.get();
    if (!posDoc.exists) {
      return NextResponse.json({ error: 'Cargo não encontrado.' }, { status: 404 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome do cargo é obrigatório.' }, { status: 400 });
    }

    const existing: any = posDoc.data();
    const updateData: Record<string, any> = {
      name: name.trim(),
      description: description || null,
      updated_at: new Date().toISOString(),
    };

    await posRef.set(updateData, { merge: true });

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      module: 'SETTINGS',
      recordId: id,
      beforeData: existing,
      afterData: { name, description },
    });

    return NextResponse.json({ success: true, message: 'Cargo atualizado com sucesso.' });
  } catch (err: any) {
    console.error('PATCH /api/positions/[id] error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar cargo.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id } = await params;
    const firestore = getAdminFirestore();

    const posRef = firestore.collection('positions').doc(id);
    const posDoc = await posRef.get();
    if (!posDoc.exists) {
      return NextResponse.json({ error: 'Cargo não encontrado.' }, { status: 404 });
    }

    // Set position_id to null for users who have this position
    const usersWithPos = await firestore.collection('users').where('position_id', '==', id).get();
    const batch = firestore.batch();
    usersWithPos.docs.forEach((d: any) => {
      batch.update(d.ref, { position_id: null });
    });
    batch.delete(posRef);
    await batch.commit();

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      module: 'SETTINGS',
      recordId: id,
      beforeData: posDoc.data(),
    });

    return NextResponse.json({ success: true, message: 'Cargo excluído com sucesso.' });
  } catch (err: any) {
    console.error('DELETE /api/positions/[id] error:', err);
    return NextResponse.json({ error: 'Erro ao excluir cargo.' }, { status: 500 });
  }
}
