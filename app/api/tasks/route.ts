import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createNotification, notifyAdmins } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// GET /api/tasks
// List tasks with multi-tenant workspace isolation and filters.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const client_id = searchParams.get('client_id');
    const assignee_id = searchParams.get('assignee_id');
    const category_id = searchParams.get('category_id');
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const limit = 50;

    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';

    let queryRef: any = firestore.collection('tasks');
    if (wsId !== 'ws_default') {
      queryRef = queryRef.where('workspace_id', '==', wsId);
    }

    const snap = await queryRef.get();
    let tasks = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    if (wsId === 'ws_default') {
      tasks = tasks.filter((t: any) => !t.workspace_id || t.workspace_id === 'ws_default');
    }

    // Role-based visibility
    if (user.role === 'CLIENTE') {
      tasks = tasks.filter((t: any) => t.client_id === user.client_id);
    } else if (client_id) {
      tasks = tasks.filter((t: any) => t.client_id === client_id);
    }

    if (status && status !== 'todos') {
      tasks = tasks.filter((t: any) => t.status === status);
    }
    if (category_id && category_id !== 'todos') {
      tasks = tasks.filter((t: any) => t.category_id === category_id);
    }
    if (assignee_id) {
      tasks = tasks.filter((t: any) => {
        if (Array.isArray(t.assignee_ids)) return t.assignee_ids.includes(assignee_id);
        if (Array.isArray(t.assignees)) return t.assignees.some((a: any) => (typeof a === 'string' ? a === assignee_id : a.id === assignee_id));
        return false;
      });
    }
    if (search) {
      tasks = tasks.filter((t: any) =>
        (t.name && t.name.toLowerCase().includes(search)) ||
        (t.title && t.title.toLowerCase().includes(search)) ||
        (t.description && t.description.toLowerCase().includes(search))
      );
    }

    // Enrich with client, category, and user metadata
    const [clientsSnap, catsSnap, usersSnap] = await Promise.all([
      firestore.collection('clients').get(),
      firestore.collection('task_categories').get(),
      firestore.collection('users').get(),
    ]);

    const clientMap: Record<string, string> = {};
    clientsSnap.docs.forEach((d: any) => { clientMap[d.id] = d.data().name; });

    const catMap: Record<string, { name: string; color: string }> = {};
    catsSnap.docs.forEach((d: any) => {
      catMap[d.id] = { name: d.data().name, color: d.data().color || '#3B82F6' };
    });

    const userMap: Record<string, any> = {};
    usersSnap.docs.forEach((d: any) => {
      const u = d.data();
      userMap[d.id] = { id: d.id, name: u.name, avatar_url: u.avatar_url || null, role: u.role };
    });

    tasks = tasks.map((t: any) => {
      const cat = t.category_id ? catMap[t.category_id] : null;
      let enrichedAssignees: any[] = [];
      if (Array.isArray(t.assignees) && t.assignees.length > 0) {
        enrichedAssignees = t.assignees.map((a: any) => {
          const uId = typeof a === 'string' ? a : a.id;
          return userMap[uId] || (typeof a === 'object' ? a : { id: uId, name: 'Colaborador' });
        });
      } else if (Array.isArray(t.assignee_ids) && t.assignee_ids.length > 0) {
        enrichedAssignees = t.assignee_ids.map((uId: string) => userMap[uId] || { id: uId, name: 'Colaborador' });
      }

      return {
        ...t,
        name: t.name || t.title || 'Tarefa sem título',
        title: t.title || t.name || 'Tarefa sem título',
        delivery_date: t.delivery_date || t.due_date || null,
        due_date: t.delivery_date || t.due_date || null,
        client_name: t.client_id ? (clientMap[t.client_id] || null) : null,
        category_name: cat?.name || null,
        category_color: cat?.color || '#3B82F6',
        created_by_name: t.created_by ? (userMap[t.created_by]?.name || null) : null,
        assignees: enrichedAssignees,
        media_links_count: t.media_links_count || 0,
        comments_count: t.comments_count || 0,
        deletion_request_status: t.deletion_request_status || null,
      };
    });

    // Ordenação decrescente por created_at
    tasks.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return NextResponse.json({
      tasks: tasks.slice(0, limit),
      pagination: {
        hasMore: tasks.length > limit,
        nextCursor: null,
        count: tasks.length,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/tasks]', error);
    return NextResponse.json({ error: error?.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/tasks
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (user.role === 'CLIENTE') {
      return NextResponse.json({ error: 'Sem permissão para criar tarefas' }, { status: 403 });
    }

    const body = await request.json();
    const taskName = (body.name || body.title || '').trim();
    const description = body.description || null;
    const status = body.status || 'Não iniciada';
    const client_id = body.client_id;
    const category_id = body.category_id || null;
    const delivery_date = body.delivery_date || body.due_date || null;
    const value = body.value ? Number(body.value) : 0;
    const notes = body.notes || null;
    const rawAssignees = body.assignees || body.assignee_ids || [];

    if (!taskName) {
      return NextResponse.json({ error: 'Nome da tarefa é obrigatório' }, { status: 400 });
    }
    if (!client_id) {
      return NextResponse.json({ error: 'Cliente é obrigatório' }, { status: 400 });
    }

    const firestore = getAdminFirestore();
    const id = 'task_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const wsId = user.workspace_id || 'ws_default';

    const assigneeIds = Array.isArray(rawAssignees)
      ? rawAssignees.map((a: any) => (typeof a === 'string' ? a : a.id)).filter(Boolean)
      : [];

    const taskDocData = {
      id,
      name: taskName,
      title: taskName,
      description,
      status,
      client_id,
      category_id,
      delivery_date,
      due_date: delivery_date,
      value,
      notes,
      created_by: user.id,
      workspace_id: wsId,
      assignee_ids: assigneeIds,
      assignees: assigneeIds,
      created_at: now,
      updated_at: now,
    };

    await firestore.collection('tasks').doc(id).set(taskDocData);

    // Salvar no histórico de status
    const histId = 'tsh_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    await firestore.collection('task_status_history').doc(histId).set({
      id: histId,
      task_id: id,
      user_id: user.id,
      previous_status: null,
      new_status: status,
      comment: 'Tarefa criada',
      created_at: now,
    });

    // Se valor > 0, cria transação financeira automaticamente
    if (value > 0) {
      const txId = 'fin_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const dueDate = delivery_date || now.split('T')[0];
      await firestore.collection('financial_transactions').doc(txId).set({
        id: txId,
        type: 'Entrada',
        description: `Recebível da tarefa: ${taskName}`,
        amount: value,
        status: 'Pendente',
        due_date: dueDate,
        client_id,
        task_id: id,
        created_by: user.id,
        workspace_id: wsId,
        created_at: now,
        updated_at: now,
      });
    }

    // Notificar responsáveis atribuídos
    for (const assigneeId of assigneeIds) {
      if (assigneeId !== user.id) {
        await createNotification({
          userId: assigneeId,
          title: 'Nova tarefa atribuída',
          message: `Você foi atribuído à tarefa "${taskName}"`,
          type: 'task',
          referenceModule: 'tasks',
          referenceId: id,
        });
      }
    }

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      module: 'tasks',
      recordId: id,
      afterData: { name: taskName, client_id, delivery_date, value },
      ipAddress: request.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ task: taskDocData }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/tasks]', error);
    return NextResponse.json({ error: error?.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
