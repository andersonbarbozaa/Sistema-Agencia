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
    const { searchParams } = new URL(request.url);
    const targetQuery = searchParams.get('target');
    const body = await request.json();
    const { name, color, type, is_active } = body;

    const firestore = getAdminFirestore();

    // Check collections
    let target = targetQuery;
    let collectionName = 'task_categories';

    if (!target) {
      const tc = await firestore.collection('task_categories').doc(id).get();
      if (tc.exists) {
        target = 'tasks';
        collectionName = 'task_categories';
      } else {
        target = 'finance';
        collectionName = 'financial_categories';
      }
    } else {
      collectionName = target === 'tasks' ? 'task_categories' : 'financial_categories';
    }

    const catRef = firestore.collection(collectionName).doc(id);
    const catDoc = await catRef.get();
    if (!catDoc.exists) {
      return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
    }

    const existing: any = catDoc.data();
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color;
    if (type !== undefined) updateData.type = type;
    if (is_active !== undefined) updateData.is_active = Number(is_active) ? 1 : 0;

    await catRef.set(updateData, { merge: true });

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      module: 'SETTINGS',
      recordId: id,
      beforeData: existing,
      afterData: body,
    });

    return NextResponse.json({ success: true, message: 'Categoria atualizada com sucesso.' });
  } catch (err: any) {
    console.error('PATCH /api/categories/[id] error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar categoria.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const targetQuery = searchParams.get('target');

    const firestore = getAdminFirestore();
    let target = targetQuery;
    let collectionName = 'task_categories';

    if (!target) {
      const tc = await firestore.collection('task_categories').doc(id).get();
      if (tc.exists) {
        target = 'tasks';
        collectionName = 'task_categories';
      } else {
        target = 'finance';
        collectionName = 'financial_categories';
      }
    } else {
      collectionName = target === 'tasks' ? 'task_categories' : 'financial_categories';
    }

    const catRef = firestore.collection(collectionName).doc(id);
    const catDoc = await catRef.get();
    if (!catDoc.exists) {
      return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
    }

    await catRef.delete();

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      module: 'SETTINGS',
      recordId: id,
      beforeData: catDoc.data(),
    });

    return NextResponse.json({ success: true, message: 'Categoria removida com sucesso.' });
  } catch (err: any) {
    console.error('DELETE /api/categories/[id] error:', err);
    return NextResponse.json({ error: 'Erro ao excluir categoria.' }, { status: 500 });
  }
}
