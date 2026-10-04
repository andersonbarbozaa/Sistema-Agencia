
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createNotification, notifyAdmins } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// GET /api/tasks
// List tasks with cursor-based pagination (20 per page) and optional filters.
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
    const cursor = searchParams.get('cursor');
    const limit = 20;

    const db = getDb();

    const baseSelect = `
      SELECT t.*, c.name as client_name,
             tc.name as category_name, tc.color as category_color,
             u.name as created_by_name,
             (SELECT COUNT(*) FROM task_media_links WHERE task_id = t.id) as media_links_count,
             (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comments_count,
             (SELECT status FROM task_deletion_requests WHERE task_id = t.id AND status = 'pending' LIMIT 1) as deletion_request_status
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN task_categories tc ON t.category_id = tc.id
      LEFT JOIN users u ON t.created_by = u.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    const wsId = user.workspace_id || 'ws_default';
    conditions.push('(t.workspace_id = ? OR (t.workspace_id IS NULL AND ? = "ws_default"))');
    params.push(wsId, wsId);

    // Role-based visibility
    if (user.role === 'CLIENTE') {
      conditions.push('t.client_id = ?');
      params.push(user.client_id);
    }

    if (status) {
      conditions.push('t.status = ?');
      params.push(status);
    }
    if (client_id && user.role !== 'CLIENTE') {
      conditions.push('t.client_id = ?');
      params.push(client_id);
    }
    if (category_id) {
      conditions.push('t.category_id = ?');
      params.push(category_id);
    }

    if (assignee_id) {
      conditions.push('EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?)');
      params.push(assignee_id);
    }

    if (cursor) {
      const cursorDecoded = Buffer.from(cursor, 'base64').toString('utf8');
      conditions.push("(t.created_at < ? OR (t.created_at = ? AND t.id < ?))");
      params.push(cursorDecoded, cursorDecoded, cursor);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      ${baseSelect}
      ${whereClause}
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ?
    `;
    params.push(limit + 1);

    const { results } = await db.prepare(query).bind(...params).all<any>();

    const hasMore = results.length > limit;
    const rawTasks = hasMore ? results.slice(0, limit) : results;

    // Normalizing task fields for both name/title and delivery_date/due_date
    const tasks = rawTasks.map((t: any) => ({
      ...t,
      title: t.name,
      due_date: t.delivery_date,
    }));

    if (tasks.length > 0) {
      const ids = tasks.map((t: any) => `'${t.id}'`).join(',');
      const { results: assigneeRows } = await db
        .prepare(`
          SELECT ta.task_id, u.id, u.name, u.avatar_url, u.role
          FROM task_assignees ta
          JOIN users u ON ta.user_id = u.id
          WHERE ta.task_id IN (${ids})
        `)
        .all<any>();

      const assigneeMap: Record<string, any[]> = {};
      for (const row of assigneeRows) {
        if (!assigneeMap[row.task_id]) assigneeMap[row.task_id] = [];
        assigneeMap[row.task_id].push({ id: row.id, name: row.name, avatar_url: row.avatar_url, role: row.role });
      }
      for (const task of tasks) {
        task.assignees = assigneeMap[task.id] || [];
      }
    }

    let nextCursor: string | null = null;
    if (hasMore && tasks.length > 0) {
      const last = tasks[tasks.length - 1];
      nextCursor = Buffer.from(last.created_at).toString('base64');
    }

    return NextResponse.json({
      tasks,
      pagination: {
        hasMore,
        nextCursor,
        count: tasks.length,
      },
    });
  } catch (error) {
    console.error('[GET /api/tasks]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
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
    const assignees = body.assignees || body.assignee_ids || [];

    if (!taskName) {
      return NextResponse.json({ error: 'Nome da tarefa é obrigatório' }, { status: 400 });
    }

    if (!client_id) {
      return NextResponse.json({ error: 'Cliente é obrigatório' }, { status: 400 });
    }

    const db = getDb();
    const id = 'task_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();

    const wsId = user.workspace_id || 'ws_default';

    await db
      .prepare(`
        INSERT INTO tasks (id, name, description, status, client_id,
                           category_id, delivery_date, value, notes, created_by, workspace_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        taskName,
        description,
        status,
        client_id,
        category_id,
        delivery_date,
        value,
        notes,
        user.id,
        wsId,
        now,
        now
      )
      .run();

    if (Array.isArray(assignees) && assignees.length > 0) {
      for (const userId of assignees) {
        const assigneeId = 'ta_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        await db
          .prepare(`INSERT INTO task_assignees (id, task_id, user_id, assigned_at) VALUES (?, ?, ?, ?)`)
          .bind(assigneeId, id, userId, now)
          .run();
      }
    }

    const histId = 'tsh_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    await db
      .prepare(`
        INSERT INTO task_status_history (id, task_id, user_id, previous_status, new_status, comment, created_at)
        VALUES (?, ?, ?, NULL, ?, ?, ?)
      `)
      .bind(histId, id, user.id, status, 'Tarefa criada', now)
      .run();

    if (value > 0) {
      const txId = 'fin_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const dueDate = delivery_date || now.split('T')[0];
      await db
        .prepare(`
          INSERT INTO financial_transactions (id, type, description, amount, status, due_date,
                                              client_id, task_id,
                                              created_by, created_at, updated_at)
          VALUES (?, 'Entrada', ?, ?, 'Pendente', ?, ?, ?, ?, ?, ?)
        `)
        .bind(txId, `Recebível da tarefa: ${taskName}`, value, dueDate, client_id, id, user.id, now, now)
        .run();
    }

    if (Array.isArray(assignees) && assignees.length > 0) {
      for (const userId of assignees) {
        if (userId !== user.id) {
          await createNotification({
            userId,
            title: 'Nova tarefa atribuída',
            message: `Você foi atribuído à tarefa "${taskName}"`,
            type: 'task',
            referenceModule: 'tasks',
            referenceId: id,
          });
        }
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

    return NextResponse.json(
      {
        task: {
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
          created_at: now,
          updated_at: now,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/tasks]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
