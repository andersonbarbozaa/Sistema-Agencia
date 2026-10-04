import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

type RouteParams = { params: Promise<{ id: string; mediaId: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const firestore = getAdminFirestore();
    const { id: taskId, mediaId } = await params;

    const mediaRef = firestore.collection('task_media_links').doc(mediaId);
    const mediaDoc = await mediaRef.get();
    if (!mediaDoc.exists) {
      return NextResponse.json({ error: 'Mídia não encontrada.' }, { status: 404 });
    }

    const media: any = mediaDoc.data();
    if (media.task_id !== taskId) {
      return NextResponse.json({ error: 'Mídia não pertence a esta tarefa.' }, { status: 400 });
    }

    if (!isAdmin(user) && media.created_by !== user.id) {
      return NextResponse.json({ error: 'Sem permissão para excluir esta mídia.' }, { status: 403 });
    }

    await mediaRef.delete();

    await logAudit({
      userId: user.id,
      action: 'DELETE_MEDIA',
      module: 'TASKS',
      recordId: mediaId,
      beforeData: media,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/tasks/[id]/media/[mediaId] error:', err);
    return NextResponse.json({ error: 'Erro ao remover mídia.' }, { status: 500 });
  }
}
