import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
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

    const firestore = getAdminFirestore();
    const { id: taskId } = await params;

    const [mediaSnap, usersSnap] = await Promise.all([
      firestore.collection('task_media_links').where('task_id', '==', taskId).get(),
      firestore.collection('users').get(),
    ]);

    const userMap: Record<string, string> = {};
    usersSnap.docs.forEach((uDoc: any) => {
      const u = uDoc.data();
      userMap[uDoc.id] = u.name || u.email;
    });

    const media = mediaSnap.docs
      .map((doc: any) => {
        const m = doc.data();
        return {
          id: doc.id,
          ...m,
          created_by_name: m.created_by ? (userMap[m.created_by] || null) : null,
        };
      })
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

    return NextResponse.json({ media });
  } catch (err: any) {
    console.error('GET /api/tasks/[id]/media error:', err);
    return NextResponse.json({ error: 'Erro ao buscar links de mídia.' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const firestore = getAdminFirestore();
    const { id: taskId } = await params;
    const body = await request.json();
    const { title, url, media_type, description, sort_order = 0 } = body;

    if (!title || !url) {
      return NextResponse.json({ error: 'Título e URL são obrigatórios.' }, { status: 400 });
    }

    const detectedType = media_type && media_type !== 'other' ? media_type : detectMediaType(url);
    const mediaId = generateId('med');
    const now = new Date().toISOString();

    const mediaData = {
      id: mediaId,
      task_id: taskId,
      title: title.trim(),
      url: url.trim(),
      media_type: detectedType,
      description: description || null,
      sort_order,
      created_by: user.id,
      created_at: now,
    };

    await firestore.collection('task_media_links').doc(mediaId).set(mediaData);

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
        ...mediaData,
        created_by_name: user.name,
      },
    });
  } catch (err: any) {
    console.error('[Add Media Error]:', err);
    return NextResponse.json({ error: 'Erro ao adicionar link de mídia.' }, { status: 500 });
  }
}
