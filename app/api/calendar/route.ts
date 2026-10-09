import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// GET /api/calendar - List events with optional month/year or date range filters
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month'); // 1-12
    const year = searchParams.get('year');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const db = getDb();
    
    let where = 'WHERE 1=1';
    let taskWhere = 'WHERE t.status != "Concluída"';
    const params: any[] = [];

    if (user.role === 'CLIENTE') {
      if (!user.client_id) return NextResponse.json({ data: [] });
      where += ' AND e.client_id = ?';
      taskWhere += ' AND t.client_id = ?';
      params.push(user.client_id);
    } else if (user.role === 'COLABORADOR') {
      where += ' AND (e.created_by = ? OR e.id IN (SELECT event_id FROM calendar_event_attendees WHERE user_id = ?))';
      taskWhere += ' AND (t.created_by = ? OR t.id IN (SELECT task_id FROM task_assignees WHERE user_id = ?))';
      params.push(user.id, user.id);
    }

    if (dateFrom && dateTo) {
      where += ' AND e.event_date BETWEEN ? AND ?';
      taskWhere += ' AND t.delivery_date BETWEEN ? AND ?';
      params.push(dateFrom, dateTo);
    } else if (month && year) {
      const paddedMonth = month.padStart(2, '0');
      where += ` AND e.event_date LIKE ?`;
      taskWhere += ` AND t.delivery_date LIKE ?`;
      params.push(`${year}-${paddedMonth}-%`);
    }

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

    return NextResponse.json({ data: events.results || [] });
  } catch (error: any) {
    console.error('GET /api/calendar error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
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
      location,
    } = body;

    if (!title || !event_date) {
      return NextResponse.json({ error: 'title and event_date are required' }, { status: 400 });
    }

    if (start_time && end_time && start_time >= end_time) {
      return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 });
    }

    const db = getDb();
    const id = 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();

    try {
      await db
        .prepare(
          `INSERT INTO calendar_events
            (id, title, description, event_date, start_time, end_time, client_id, project_id, location, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          title,
          description ?? null,
          event_date,
          start_time ?? null,
          end_time ?? null,
          client_id || null,
          project_id || null,
          location ?? null,
          user.id,
          now,
          now
        )
        .run();
    } catch (dbError: any) {
      if (dbError.message && dbError.message.includes('has no column')) {
        try { await db.prepare('ALTER TABLE calendar_events ADD COLUMN location TEXT').run(); } catch(e){}
        try { await db.prepare('ALTER TABLE calendar_events ADD COLUMN google_event_id TEXT').run(); } catch(e){}
        try { await db.prepare('ALTER TABLE calendar_events ADD COLUMN notes TEXT').run(); } catch(e){}
        
        await db
          .prepare(
            `INSERT INTO calendar_events
              (id, title, description, event_date, start_time, end_time, client_id, project_id, location, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            id,
            title,
            description ?? null,
            event_date,
            start_time ?? null,
            end_time ?? null,
            client_id || null,
            project_id || null,
            location ?? null,
            user.id,
            now,
            now
          )
          .run();
      } else {
        throw dbError;
      }
    }

    await logAudit(user.id, 'calendar_events', 'CREATE', id, { title, event_date });

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
      .all();

    return NextResponse.json({ data: event.results?.[0] }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/calendar error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

async function syncWithGoogleCalendar(userId: string, eventId: string, eventData: Record<string, unknown>) {
  try {
    const db = getDb();
    const integration = await db
      .prepare(`SELECT * FROM google_integrations WHERE user_id = ? AND status = 'active'`)
      .bind(userId)
      .all<{ access_token: string; refresh_token: string }>();

    if (!integration.results || integration.results.length === 0) return;
    console.log(`[Google Calendar] Syncing event \${eventId} for user \${userId}`);
  } catch (e) {
    // ignore
  }
}
