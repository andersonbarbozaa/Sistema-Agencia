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

    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';

    const [posSnap, usersSnap] = await Promise.all([
      firestore.collection('positions').get(),
      firestore.collection('users').get(),
    ]);

    const users = usersSnap.docs.map((d: any) => d.data());

    let positions = posSnap.docs
      .map((doc: any) => {
        const p = doc.data();
        const users_count = users.filter((u: any) => u.position_id === doc.id).length;
        return {
          id: doc.id,
          ...p,
          users_count,
        };
      })
      .filter((p: any) => !p.workspace_id || p.workspace_id === wsId || (wsId === 'ws_default' && p.workspace_id === 'ws_default'));

    positions.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    return NextResponse.json({ positions });
  } catch (err: any) {
    console.error('GET /api/positions error:', err);
    return NextResponse.json({ error: 'Erro ao listar cargos.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const firestore = getAdminFirestore();
    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'O nome do cargo é obrigatório.' }, { status: 400 });
    }

    const id = generateId('pos');
    const wsId = user.workspace_id || 'ws_default';
    const now = new Date().toISOString();

    const posData = {
      id,
      name: name.trim(),
      description: description || null,
      workspace_id: wsId,
      created_at: now,
    };

    await firestore.collection('positions').doc(id).set(posData);

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      module: 'SETTINGS',
      recordId: id,
      afterData: { position: name },
    });

    return NextResponse.json({ success: true, id, data: posData });
  } catch (err: any) {
    console.error('POST /api/positions error:', err);
    return NextResponse.json({ error: 'Erro ao criar cargo.' }, { status: 500 });
  }
}
