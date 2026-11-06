import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

type RouteParams = { params: Promise<{ id: string; mediaId: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const db = getDb();
    const { id: taskId, mediaId } = await params;
    const cleanTaskId = (taskId || '').toString().replace(/^task-/, '');

    const media = await db
      .prepare('SELECT * FROM task_media_links WHERE id = ? AND (task_id = ? OR task_id = ?)')
      .bind(mediaId, cleanTaskId, taskId)
      .first<any>();

    if (!media) {
      return NextResponse.json({ error: 'Mídia não encontrada.' }, { status: 404 });
    }

    const creatorId = media.created_by || media.uploaded_by;
    if (!isAdmin(user) && creatorId && creatorId !== user.id) {
      return NextResponse.json({ error: 'Sem permissão para excluir esta mídia.' }, { status: 403 });
    }

    await db.prepare('DELETE FROM task_media_links WHERE id = ?').bind(mediaId).run();

    try {
      await logAudit({
        userId: user.id,
        action: 'DELETE_MEDIA',
        module: 'TASKS',
        recordId: mediaId,
        beforeData: media,
      });
    } catch (_) {}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao remover mídia.' }, { status: 500 });
  }
}
