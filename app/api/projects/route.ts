import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// ─── GET /api/projects ───────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status')?.trim() ?? '';
    const clientIdFilter = searchParams.get('client_id')?.trim() ?? '';
    const search = searchParams.get('search')?.toLowerCase().trim() ?? '';
    const limit = 50;

    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';

    let queryRef: any = firestore.collection('projects');
    if (wsId !== 'ws_default') {
      queryRef = queryRef.where('workspace_id', '==', wsId);
    }

    const [projectsSnap, clientsSnap, tasksSnap] = await Promise.all([
      queryRef.get(),
      firestore.collection('clients').get(),
      firestore.collection('tasks').get(),
    ]);

    let projects = projectsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    if (wsId === 'ws_default') {
      projects = projects.filter((p: any) => !p.workspace_id || p.workspace_id === 'ws_default');
    }

    const clientMap: Record<string, string> = {};
    clientsSnap.docs.forEach((d: any) => { clientMap[d.id] = d.data().name; });

    const allTasks = tasksSnap.docs.map((d: any) => d.data());

    // Role filtering
    if (user.role === 'CLIENTE') {
      projects = projects.filter((p: any) => p.client_id === user.client_id);
    } else if (clientIdFilter) {
      projects = projects.filter((p: any) => p.client_id === clientIdFilter);
    }

    if (statusFilter && statusFilter !== 'todos') {
      projects = projects.filter((p: any) => p.status === statusFilter);
    }

    if (search) {
      projects = projects.filter((p: any) =>
        (p.name && p.name.toLowerCase().includes(search)) ||
        (p.description && p.description.toLowerCase().includes(search))
      );
    }

    projects = projects.map((p: any) => {
      const projTasks = allTasks.filter((t: any) => t.project_id === p.id);
      const total_tasks = projTasks.length;
      const completed_tasks = projTasks.filter((t: any) => t.status === 'Concluída' || t.status === 'Aprovada').length;

      return {
        ...p,
        client_name: p.client_id ? (clientMap[p.client_id] || null) : null,
        end_date: p.deadline || p.end_date || null,
        total_tasks,
        completed_tasks,
      };
    });

    projects.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return NextResponse.json({
      data: projects.slice(0, limit),
      pagination: { limit, hasNextPage: projects.length > limit, nextCursor: null },
    });
  } catch (error: any) {
    console.error('[GET /api/projects]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// ─── POST /api/projects ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { name, client_id } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Field "name" is required' }, { status: 400 });
    }

    if (!client_id || typeof client_id !== 'string' || !client_id.trim()) {
      return NextResponse.json({ error: 'Field "client_id" is required' }, { status: 400 });
    }

    const firestore = getAdminFirestore();

    // Verify client exists
    const clientDoc = await firestore.collection('clients').doc(client_id.trim()).get();
    if (!clientDoc.exists) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const id = 'proj_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const wsId = user.workspace_id || 'ws_default';

    const deadline = body.deadline ?? body.end_date ?? null;

    const projectData = {
      id,
      name: name.trim(),
      description: body.description ? String(body.description).trim() : null,
      client_id: client_id.trim(),
      status: body.status ?? 'Em andamento',
      start_date: body.start_date ?? null,
      deadline,
      value: body.value !== undefined ? Number(body.value) : 0,
      workspace_id: wsId,
      created_at: now,
      updated_at: now,
    };

    await firestore.collection('projects').doc(id).set(projectData);

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      module: 'PROJECTS',
      recordId: id,
      afterData: projectData,
      ipAddress: request.headers.get('x-forwarded-for'),
    });

    return NextResponse.json(
      {
        data: {
          ...projectData,
          client_name: clientDoc.data()?.name || null,
          total_tasks: 0,
          completed_tasks: 0,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/projects]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
