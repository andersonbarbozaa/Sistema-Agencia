import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/workspaces/current — Get current user's workspace details
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const firestore = getAdminFirestore();
    const workspaceId = user.workspace_id || 'ws_default';

    const wsDoc = await firestore.collection('workspaces').doc(workspaceId).get();

    if (!wsDoc.exists) {
      // Default fallback
      if (workspaceId === 'ws_default') {
        const defaultWs = {
          id: 'ws_default',
          name: 'PixelCraft Studio',
          description: 'Agência Audiovisual & Criativa',
          invite_code: 'pixelcraft',
          created_at: new Date().toISOString(),
        };
        await firestore.collection('workspaces').doc('ws_default').set(defaultWs);
        return NextResponse.json({ workspace: defaultWs });
      }
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ workspace: { id: wsDoc.id, ...wsDoc.data() } });
  } catch (error: any) {
    console.error('[GET /api/workspaces/current]', error);
    return NextResponse.json({ error: error?.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH /api/workspaces/current — Update workspace name and description
export async function PATCH(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Apenas administradores podem alterar os dados da empresa.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'O Nome da Empresa é obrigatório.' }, { status: 400 });
    }

    const firestore = getAdminFirestore();
    const workspaceId = user.workspace_id || 'ws_default';
    const wsRef = firestore.collection('workspaces').doc(workspaceId);
    const wsDoc = await wsRef.get();

    const existing: any = wsDoc.exists ? wsDoc.data() : {};
    const newName = name.trim();
    const newDesc = description !== undefined ? (description ? description.trim() : null) : (existing.description || null);
    const now = new Date().toISOString();

    const updatedData = {
      ...existing,
      id: workspaceId,
      name: newName,
      description: newDesc,
      updated_at: now,
    };

    await wsRef.set(updatedData, { merge: true });

    await logAudit({
      userId: user.id,
      action: 'UPDATE_WORKSPACE',
      module: 'SETTINGS',
      recordId: workspaceId,
      beforeData: existing,
      afterData: updatedData,
    });

    return NextResponse.json({ workspace: updatedData });
  } catch (error: any) {
    console.error('[PATCH /api/workspaces/current]', error);
    return NextResponse.json({ error: error?.message || 'Erro ao atualizar dados da empresa' }, { status: 500 });
  }
}
