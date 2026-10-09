const fs = require('fs');
const file = 'app/api/tasks/[id]/media/route.ts';
let content = fs.readFileSync(file, 'utf8');

const newPost = `export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const db = getDb();
    const { id: taskId } = await params;
    const body = await request.json();
    const { url, media_type, description } = body;

    if (!url) return NextResponse.json({ error: 'A URL é obrigatória.' }, { status: 400 });

    const detectedType = media_type && media_type !== 'other' ? media_type : detectMediaType(url);
    const mediaId = generateId('med');
    
    await db
      .prepare('INSERT INTO task_media_links (id, task_id, url, media_type, description, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\\'now\\'))')
      .bind(mediaId, taskId, url.trim(), detectedType, description || null, user.id)
      .run();

    await logAudit({
      userId: user.id,
      action: 'ADD_MEDIA',
      module: 'TASKS',
      recordId: mediaId,
      afterData: { taskId, url, media_type: detectedType },
    });

    return NextResponse.json({
      success: true,
      media: {
        id: mediaId,
        task_id: taskId,
        url,
        media_type: detectedType,
        description,
        uploaded_by: user.id,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao adicionar link.' }, { status: 500 });
  }
}
`;

content = content.substring(0, content.indexOf('export async function POST')) + newPost;
fs.writeFileSync(file, content);
console.log('Fixed media POST');
