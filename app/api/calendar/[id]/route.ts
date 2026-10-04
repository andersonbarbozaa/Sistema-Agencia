
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/calendar/[id] - Single calendar event
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const { id } = await params;

    const event = await db
      .prepare(
        `SELECT
          e.*,
          c.name as client_name,
          p.name as project_name,
          u.name as created_by_name
        FROM calendar_events e
        LEFT JOIN clients c ON c.id = e.client_id
        LEFT JOIN projects p ON p.id = e.project_id
        LEFT JOIN users u ON u.id = e.created_by
        WHERE e.id = ?`
      )
      .bind(id)
      .first();

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    return NextResponse.json({ data: event });
  } catch (error) {
    console.error('GET /api/calendar/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/calendar/[id] - Update calendar event
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMINISTRADOR', 'COLABORADOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDb();
    const { id } = await params;

    const existing = await db
      .prepare('SELECT * FROM calendar_events WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const body = await request.json();
    const { start_time, end_time } = body;

    // Validate times if both provided
    const resolvedStart = start_time ?? existing.start_time;
    const resolvedEnd = end_time ?? existing.end_time;
    if (resolvedStart && resolvedEnd && resolvedStart >= resolvedEnd) {
      return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 });
    }

    const allowedFields = [
      'title', 'description', 'event_date', 'start_time', 'end_time',
      'client_id', 'project_id', 'event_type', 'location', 'attendees',
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(field === 'attendees' && Array.isArray(body[field]) ? JSON.stringify(body[field]) : body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    values.push(now, id);

    await db
      .prepare(`UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    await logAudit(user.id, 'calendar_events', 'UPDATE', id, body);

    // Async Google Calendar sync if google_event_id exists
    if (existing.google_event_id) {
      updateGoogleCalendarEvent(user.id, existing.google_event_id as string, id, body).catch((err) =>
        console.error('Google Calendar update error:', err)
      );
    }

    const updated = await db
      .prepare(
        `SELECT e.*, c.name as client_name, p.name as project_name
        FROM calendar_events e
        LEFT JOIN clients c ON c.id = e.client_id
        LEFT JOIN projects p ON p.id = e.project_id
        WHERE e.id = ?`
      )
      .bind(id)
      .first();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PATCH /api/calendar/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/calendar/[id] - Delete event and remove from Google Calendar if synced
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMINISTRADOR', 'COLABORADOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDb();
    const { id } = await params;

    const existing = await db
      .prepare('SELECT * FROM calendar_events WHERE id = ?')
      .bind(id)
      .first<Record<string, unknown>>();

    if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    await db.prepare('DELETE FROM calendar_events WHERE id = ?').bind(id).run();

    await logAudit(user.id, 'calendar_events', 'DELETE', id, { title: existing.title });

    // Remove from Google Calendar if google_event_id exists
    if (existing.google_event_id) {
      deleteGoogleCalendarEvent(user.id, existing.google_event_id as string).catch((err) =>
        console.error('Google Calendar delete error:', err)
      );
    }

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/calendar/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Async Google Calendar helpers (non-blocking)
async function updateGoogleCalendarEvent(
  userId: string,
  googleEventId: string,
  localEventId: string,
  eventData: Record<string, unknown>
) {
  const db = getDb();
  const integration = await db
    .prepare(`SELECT * FROM google_integrations WHERE user_id = ? AND status = 'active'`)
    .bind(userId)
    .first();

  if (!integration) return;

  // TODO: Implement Google Calendar API PATCH call
  console.log(`[Google Calendar] Updating event ${googleEventId} for user ${userId}`);
}

async function deleteGoogleCalendarEvent(userId: string, googleEventId: string) {
  const db = getDb();
  const integration = await db
    .prepare(`SELECT * FROM google_integrations WHERE user_id = ? AND status = 'active'`)
    .bind(userId)
    .first();

  if (!integration) return;

  // TODO: Implement Google Calendar API DELETE call
  console.log(`[Google Calendar] Deleting event ${googleEventId} for user ${userId}`);
}
