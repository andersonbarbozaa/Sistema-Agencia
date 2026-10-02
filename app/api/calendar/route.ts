import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

// GET /api/calendar - List events with optional month/year or date range filters
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    const db = getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];

    const wsId = user.workspace_id || 'ws_default';
    conditions.push('(e.workspace_id = ? OR (e.workspace_id IS NULL AND ? = "ws_default"))');
    params.push(wsId, wsId);

    if (month && year) {
      // Filter by specific month/year: YYYY-MM
      const monthStr = month.padStart(2, '0');
      conditions.push(`strftime('%Y-%m', e.event_date) = ?`);
      params.push(`${year}-${monthStr}`);
    } else if (date_from && date_to) {
      conditions.push('e.event_date >= ?');
      params.push(date_from);
      conditions.push('e.event_date <= ?');
      params.push(date_to);
    } else if (date_from) {
      conditions.push('e.event_date >= ?');
      params.push(date_from);
    } else if (date_to) {
      conditions.push('e.event_date <= ?');
      params.push(date_to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const events = await db
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
        ${where}
        ORDER BY e.event_date ASC, e.start_time ASC`
      )
      .bind(...params)
      .all();

    return NextResponse.json({ data: events.results });
  } catch (error) {
    console.error('GET /api/calendar error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/calendar - Create calendar event
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMINISTRADOR', 'COLABORADOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      event_date,
      start_time,
      end_time,
      client_id,
      project_id,
      event_type,
      location,
      attendees,
    } = body;

    if (!title || !event_date) {
      return NextResponse.json({ error: 'title and event_date are required' }, { status: 400 });
    }

    // Validate start_time < end_time when both provided
    if (start_time && end_time && start_time >= end_time) {
      return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 });
    }

    const db = getDb();
    const id = 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const wsId = user.workspace_id || 'ws_default';

    await db
      .prepare(
        `INSERT INTO calendar_events
          (id, title, description, event_date, start_time, end_time, client_id, project_id, event_type, location, attendees, created_by, workspace_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        title,
        description ?? null,
        event_date,
        start_time ?? null,
        end_time ?? null,
        client_id ?? null,
        project_id ?? null,
        event_type ?? 'Geral',
        location ?? null,
        attendees ? JSON.stringify(attendees) : null,
        user.id,
        wsId,
        now,
        now
      )
      .run();

    await logAudit(user.id, 'calendar_events', 'CREATE', id, { title, event_date });

    // Async Google Calendar sync: check if user has google_integration
    // This happens asynchronously — fire and forget
    syncWithGoogleCalendar(user.id, id, body).catch((err) =>
      console.error('Google Calendar sync error:', err)
    );

    const event = await db
      .prepare(
        `SELECT e.*, c.name as client_name, p.name as project_name
        FROM calendar_events e
        LEFT JOIN clients c ON c.id = e.client_id
        LEFT JOIN projects p ON p.id = e.project_id
        WHERE e.id = ?`
      )
      .bind(id)
      .first();

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    console.error('POST /api/calendar error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Asynchronous Google Calendar sync (non-blocking)
async function syncWithGoogleCalendar(userId: string, eventId: string, eventData: Record<string, unknown>) {
  const db = getDb();
  const integration = await db
    .prepare(`SELECT * FROM google_integrations WHERE user_id = ? AND status = 'active'`)
    .bind(userId)
    .first<{ access_token: string; refresh_token: string }>();

  if (!integration) return; // No Google integration, skip

  // TODO: Implement Google Calendar API call using integration.access_token
  // This is a placeholder for the actual Google Calendar API integration
  console.log(`[Google Calendar] Syncing event ${eventId} for user ${userId}`);
}
