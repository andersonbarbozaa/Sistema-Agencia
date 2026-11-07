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
    const cleanTaskId = (taskId || '').toString().replace(/^task-/, '');

    const mediaLinks = await db
      .prepare(`
        SELECT ml.*, 
               COALESCE(NULLIF(ml.title, ''), NULLIF(ml.description, ''), 'Mídia da Tarefa') as title,
               COALESCE(ml.created_by, ml.uploaded_by) as created_by,
               u.name as created_by_name
        FROM task_media_links ml
        LEFT JOIN users u ON COALESCE(ml.created_by, ml.uploaded_by) = u.id
        WHERE ml.task_id = ? OR ml.task_id = ? OR ml.task_id = ?
        ORDER BY ml.created_at ASC
      `)
      .bind(cleanTaskId, taskId, `task_${cleanTaskId}`)
      .all();

    return NextResponse.json({
      media: mediaLinks.results || [],
      media_links: mediaLinks.results || [],
    });
  } catch (err: any) {
    console.error('[GET /api/tasks/[id]/media]', err);
    return NextResponse.json({ error: 'Erro ao buscar links de mídia.' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const db = getDb();
    const { id: rawTaskId } = await params;
    const taskId = (rawTaskId || '').toString().replace(/^task-/, '');
    const body = await request.json();
    const { url, media_type, description, title } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'A URL é obrigatória.' }, { status: 400 });
    }

    const trimmedUrl = url.trim();
    const detectedType = media_type && media_type !== 'other' ? media_type : detectMediaType(trimmedUrl);
    const mediaId = generateId('med');
    const finalTitle = (title && title.trim())
      ? title.trim()
      : (description && description.trim())
        ? description.trim()
        : detectedType === 'video'
          ? 'Vídeo da Tarefa'
          : detectedType === 'image'
            ? 'Imagem da Tarefa'
            : 'Arquivo da Tarefa';

    // Auto-garantir que colunas existam (compatibilidade Cloudflare D1 e SQLite local)
    try { await db.prepare('ALTER TABLE task_media_links ADD COLUMN title TEXT').run(); } catch (_) {}
    try { await db.prepare('ALTER TABLE task_media_links ADD COLUMN created_by TEXT').run(); } catch (_) {}
    try { await db.prepare('ALTER TABLE task_media_links ADD COLUMN uploaded_by TEXT').run(); } catch (_) {}
    try { await db.prepare('ALTER TABLE task_media_links ADD COLUMN sort_order INTEGER DEFAULT 0').run(); } catch (_) {}

    try {
      await db
        .prepare(`
          INSERT INTO task_media_links (id, task_id, title, url, media_type, description, created_by, uploaded_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `)
        .bind(mediaId, taskId, finalTitle, trimmedUrl, detectedType, description || null, user.id, user.id)
        .run();
    } catch (insertErr: any) {
      console.warn('[POST /api/tasks/[id]/media] First insert attempt failed, trying fallback:', insertErr?.message);
      // Fallback para schema legado com uploaded_by ou created_by separado
      try {
        await db
          .prepare(`
            INSERT INTO task_media_links (id, task_id, url, media_type, description, uploaded_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `)
          .bind(mediaId, taskId, trimmedUrl, detectedType, description || null, user.id)
          .run();
      } catch (fallbackErr: any) {
        console.error('[POST /api/tasks/[id]/media] Fallback insert failed:', fallbackErr?.message);
        throw fallbackErr;
      }
    }

    try {
      await logAudit({
        userId: user.id,
        action: 'ADD_MEDIA',
        module: 'TASKS',
        recordId: mediaId,
        afterData: { taskId, url: trimmedUrl, media_type: detectedType, title: finalTitle },
      });
    } catch (auditErr) {
      console.warn('[POST /api/tasks/[id]/media] Audit log ignored:', auditErr);
    }

    const createdMedia = {
      id: mediaId,
      task_id: taskId,
      title: finalTitle,
      url: trimmedUrl,
      media_type: detectedType,
      description: description || null,
      created_by: user.id,
      uploaded_by: user.id,
      created_by_name: user.name,
    };

    return NextResponse.json({
      success: true,
      media: createdMedia,
      media_links: [createdMedia],
    });
  } catch (err: any) {
    console.error('[POST /api/tasks/[id]/media] Error adding media:', err?.message || err);
    return NextResponse.json({ error: 'Erro ao adicionar link.' }, { status: 500 });
  }
}
