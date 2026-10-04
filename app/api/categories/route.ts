import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'tasks', 'finance', 'all'

    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';

    let taskCategories: any[] = [];
    let financialCategories: any[] = [];

    if (type === 'all' || type === 'tasks') {
      const snap = await firestore.collection('task_categories').get();
      taskCategories = snap.docs
        .map((d: any) => ({ id: d.id, ...d.data() }))
        .filter((c: any) => !c.workspace_id || c.workspace_id === wsId || (wsId === 'ws_default' && c.workspace_id === 'ws_default'))
        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    }

    if ((type === 'all' || type === 'finance') && user.role !== 'CLIENTE') {
      const snap = await firestore.collection('financial_categories').get();
      financialCategories = snap.docs
        .map((d: any) => ({ id: d.id, ...d.data() }))
        .filter((c: any) => !c.workspace_id || c.workspace_id === wsId || (wsId === 'ws_default' && c.workspace_id === 'ws_default'))
        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    }

    return NextResponse.json({
      task_categories: taskCategories,
      financial_categories: financialCategories,
    });
  } catch (err: any) {
    console.error('GET /api/categories error:', err);
    return NextResponse.json({ error: 'Erro ao listar categorias.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';
    const body = await request.json();
    const { target, name, color, type = 'both', is_active = 1 } = body; // target: 'tasks' | 'finance'

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (target === 'tasks') {
      const id = generateId('tcat');
      const catData = {
        id,
        name: name.trim(),
        color: color || '#3b82f6',
        is_active: Number(is_active) ? 1 : 0,
        workspace_id: wsId,
        created_at: now,
      };

      await firestore.collection('task_categories').doc(id).set(catData);

      await logAudit({
        userId: user.id,
        action: 'CREATE',
        module: 'SETTINGS',
        recordId: id,
        afterData: { target: 'task_category', name, color },
      });

      return NextResponse.json({ success: true, id, data: catData });
    } else if (target === 'finance') {
      const id = generateId('fcat');
      const catData = {
        id,
        name: name.trim(),
        type,
        is_active: Number(is_active) ? 1 : 0,
        workspace_id: wsId,
        created_at: now,
      };

      await firestore.collection('financial_categories').doc(id).set(catData);

      await logAudit({
        userId: user.id,
        action: 'CREATE',
        module: 'SETTINGS',
        recordId: id,
        afterData: { target: 'financial_category', name, type },
      });

      return NextResponse.json({ success: true, id, data: catData });
    }

    return NextResponse.json({ error: 'Alvo de categoria inválido.' }, { status: 400 });
  } catch (err: any) {
    console.error('POST /api/categories error:', err);
    return NextResponse.json({ error: 'Erro ao criar categoria.' }, { status: 500 });
  }
}
