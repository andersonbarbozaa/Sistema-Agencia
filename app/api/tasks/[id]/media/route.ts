import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { detectMediaType } from '@/lib/media';
import { generateId } from '@/lib/utils';
import { logAudit } from '@/lib/audit';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const db = getDb();
    const { id: taskId } = await params;

    const mediaLinks = await db
      .prepare(`
        SELECT ml.*, u.name as created_by_name
        FROM task_media_links ml
        LEFT JOIN users u ON ml.created_by = u.id
        WHERE ml.task_id = ?
        ORDER BY ml.sort_order ASC, ml.created_at ASC
      `)
      .bind(taskId)
      .all();

    return NextResponse.json({ media: mediaLinks.results || [] });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao buscar links de mídia.' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const db = getDb();
    const { id: taskId } = await params;
    const body = await request.json();
    const { title, url, media_type, description, sort_order = 0 } = body;

    if (!title || !url) {
      return NextResponse.json({ error: 'Título e URL são obrigatórios.' }, { status: 400 });
    }

    // Auto-detect type if not provided or set to other
    const detectedType = media_type && media_type !== 'other' ? media_type : detectMediaType(url);

    const mediaId = generateId('med');
    await db
      .prepare(`
        INSERT INTO task_media_links (id, task_id, title, url, media_type, description, sort_order, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      .bind(mediaId, taskId, title.trim(), url.trim(), detectedType, description || null, sort_order, user.id)
      .run();

    await logAudit({
      userId: user.id,
      action: 'ADD_MEDIA',
      module: 'TASKS',
      recordId: mediaId,
      afterData: { taskId, title, url, media_type: detectedType },
    });

    return NextResponse.json({
      success: true,
      media: {
        id: mediaId,
        task_id: taskId,
        title,
        url,
        media_type: detectedType,
        description,
        sort_order,
        created_by: user.id,
      },
    });
  } catch (err: any) {
    console.error('[Add Media Error]:', err);
    return NextResponse.json({ error: 'Erro ao adicionar link de mídia.' }, { status: 500 });
  }
}
