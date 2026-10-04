import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/projects/[id] ──────────────────────────────────────────────────
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const firestore = getAdminFirestore();

    const projDoc = await firestore.collection('projects').doc(id).get();
    if (!projDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project: any = { id: projDoc.id, ...projDoc.data() };

    // CLIENTE can only see their own projects
    if (user.role === 'CLIENTE' && project.client_id !== user.client_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [clientDoc, tasksSnap] = await Promise.all([
      project.client_id ? firestore.collection('clients').doc(project.client_id).get() : Promise.resolve(null),
      firestore.collection('tasks').where('project_id', '==', id).get(),
    ]);

    const tasks = tasksSnap.docs.map((d: any) => d.data());
    const total_tasks = tasks.length;
    const completed_tasks = tasks.filter((t: any) => t.status === 'Concluída' || t.status === 'Aprovada').length;
    const pending_tasks = total_tasks - completed_tasks;

    return NextResponse.json({
      data: {
        ...project,
        client_name: clientDoc?.exists ? clientDoc.data()?.name : null,
        end_date: project.deadline || project.end_date || null,
        total_tasks,
        completed_tasks,
        pending_tasks,
      }
    });
  } catch (error: any) {
    console.error('[GET /api/projects/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// ─── PATCH /api/projects/[id] ────────────────────────────────────────────────
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role === 'CLIENTE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const firestore = getAdminFirestore();

    const projRef = firestore.collection('projects').doc(id);
    const projDoc = await projRef.get();
    if (!projDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const existing: any = projDoc.data();
    const body = await request.json();

    if ('end_date' in body && !('deadline' in body)) {
      body.deadline = body.end_date;
    }

    const allowed = ['name', 'description', 'status', 'client_id', 'start_date', 'deadline', 'value'];
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    for (const field of allowed) {
      if (field in body) {
        updateData[field] = field === 'value' ? Number(body[field]) : body[field];
      }
    }

    await projRef.set(updateData, { merge: true });

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      module: 'PROJECTS',
      recordId: id,
      beforeData: existing,
      afterData: updateData,
      ipAddress: request.headers.get('x-forwarded-for'),
    });

    const updatedDoc = await projRef.get();
    return NextResponse.json({ data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    console.error('[PATCH /api/projects/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// ─── DELETE /api/projects/[id] ───────────────────────────────────────────────
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const { id } = await params;
    const firestore = getAdminFirestore();

    const projRef = firestore.collection('projects').doc(id);
    const projDoc = await projRef.get();
    if (!projDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await projRef.delete();

    await logAudit({
      userId: user.id,
      action: 'DELETE',
      module: 'PROJECTS',
      recordId: id,
      beforeData: projDoc.data(),
      ipAddress: request.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/projects/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
