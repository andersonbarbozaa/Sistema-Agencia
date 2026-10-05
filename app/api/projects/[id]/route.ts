
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/projects/[id] ──────────────────────────────────────────────────
// Returns a single project with client_name and task counts.
// CLIENTE role can only access projects linked to their own client_id.
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();

    const project = await db
      .prepare(
        `SELECT
           p.id,
           p.name,
           p.description,
           p.status,
           p.client_id,
           c.name          AS client_name,
           p.start_date,
           p.deadline,
           p.deadline      AS end_date,
           p.value,
           p.created_at,
           p.updated_at,
           COUNT(t.id)                                             AS total_tasks,
           SUM(CASE WHEN t.status = 'Concluída' THEN 1 ELSE 0 END) AS completed_tasks,
           SUM(CASE WHEN t.status != 'Concluída' THEN 1 ELSE 0 END) AS pending_tasks
         FROM projects p
         LEFT JOIN clients c ON c.id = p.client_id
         LEFT JOIN tasks   t ON t.project_id = p.id
         WHERE p.id = ?
         GROUP BY p.id`
      )
      .bind(id)
      .first() as Record<string, unknown> | null;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // CLIENTE can only see their own projects
    if (user.role === 'CLIENTE' && project.client_id !== user.client_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error('[GET /api/projects/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── PATCH /api/projects/[id] ────────────────────────────────────────────────
// Update project fields.
// Admins can update any project.
// Collaborators can update projects they are assigned to (via project_members or similar).
// CLIENTE role is forbidden.
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
    const db = await getDb();

    const existing = await db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();

    // Support legacy alias end_date -> deadline
    if ('end_date' in body && !('deadline' in body)) {
      body.deadline = body.end_date;
    }

    // Allowed updatable fields
    const ALLOWED_FIELDS = [
      'name',
      'description',
      'status',
      'client_id',
      'start_date',
      'deadline',
      'value',
      'notes',
    ];

    const setClauses: string[] = [];
    const values: unknown[]    = [];

    for (const field of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        // If updating client_id, verify new client exists
        if (field === 'client_id') {
          const clientCheck = await db
            .prepare('SELECT id FROM clients WHERE id = ?')
            .bind(body[field])
            .first();
          if (!clientCheck) {
            return NextResponse.json(
              { error: 'Client not found' },
              { status: 404 }
            );
          }
        }
        setClauses.push(`${field} = ?`);
        values.push(body[field] ?? null);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    setClauses.push('updated_at = ?');
    values.push(now, id);

    await db
      .prepare(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    await logAudit({
      userId:     user.id,
      action:     'UPDATE',
      resource:   'projects',
      resourceId: id,
      details:    `Project "${id}" updated`,
    });

    const updated = await db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .bind(id)
      .first();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[PATCH /api/projects/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── DELETE /api/projects/[id] ───────────────────────────────────────────────
// Permanently delete a project. Admin only.
// Blocked if the project still has tasks associated with it.
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
    const db = await getDb();

    const existing = await db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Guard: cannot delete if tasks still exist
    const taskCheck = await db
      .prepare('SELECT COUNT(*) AS task_count FROM tasks WHERE project_id = ?')
      .bind(id)
      .first() as { task_count: number } | null;

    if ((taskCheck?.task_count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete project: it still has ${taskCheck?.task_count} task(s). Remove all tasks first.`,
        },
        { status: 409 }
      );
    }

    await db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();

    await logAudit({
      userId:     user.id,
      action:     'DELETE',
      resource:   'projects',
      resourceId: id,
      details:    `Project "${id}" permanently deleted`,
    });

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/projects/[id]]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
