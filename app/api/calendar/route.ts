import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
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

    const firestore = getAdminFirestore();
    const wsId = user.workspace_id || 'ws_default';

    let queryRef: any = firestore.collection('calendar_events');
    if (wsId !== 'ws_default') {
      queryRef = queryRef.where('workspace_id', '==', wsId);
    }

    const [eventsSnap, clientsSnap, projectsSnap, usersSnap] = await Promise.all([
      queryRef.get(),
      firestore.collection('clients').get(),
      firestore.collection('projects').get(),
      firestore.collection('users').get(),
    ]);

    let events = eventsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    if (wsId === 'ws_default') {
      events = events.filter((e: any) => !e.workspace_id || e.workspace_id === 'ws_default');
    }

    if (month && year) {
      const monthPrefix = `${year}-${month.padStart(2, '0')}`;
      events = events.filter((e: any) => e.event_date && e.event_date.startsWith(monthPrefix));
    } else {
      if (date_from) events = events.filter((e: any) => e.event_date >= date_from);
      if (date_to) events = events.filter((e: any) => e.event_date <= date_to);
    }

    const clientMap: Record<string, string> = {};
    clientsSnap.docs.forEach((d: any) => { clientMap[d.id] = d.data().name; });

    const projMap: Record<string, string> = {};
    projectsSnap.docs.forEach((d: any) => { projMap[d.id] = d.data().name; });

    const userMap: Record<string, string> = {};
    usersSnap.docs.forEach((d: any) => { userMap[d.id] = d.data().name || d.data().email; });

    events = events.map((e: any) => ({
      ...e,
      client_name: e.client_id ? (clientMap[e.client_id] || null) : null,
      project_name: e.project_id ? (projMap[e.project_id] || null) : null,
      created_by_name: e.created_by ? (userMap[e.created_by] || null) : null,
    }));

    events.sort((a: any, b: any) => {
      const comp = (a.event_date || '').localeCompare(b.event_date || '');
      if (comp !== 0) return comp;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    return NextResponse.json({ data: events });
  } catch (error: any) {
    console.error('GET /api/calendar error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
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

    if (start_time && end_time && start_time >= end_time) {
      return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 });
    }

    const firestore = getAdminFirestore();
    const id = 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const wsId = user.workspace_id || 'ws_default';

    const eventData = {
      id,
      title: title.trim(),
      description: description ?? null,
      event_date,
      start_time: start_time ?? null,
      end_time: end_time ?? null,
      client_id: client_id ?? null,
      project_id: project_id ?? null,
      event_type: event_type ?? 'Reunião',
      location: location ?? null,
      attendees: Array.isArray(attendees) ? attendees : [],
      created_by: user.id,
      workspace_id: wsId,
      created_at: now,
      updated_at: now,
    };

    await firestore.collection('calendar_events').doc(id).set(eventData);

    await logAudit(user.id, 'calendar_events', 'CREATE', id, { title, event_date });

    if (Array.isArray(attendees) && attendees.length > 0) {
      for (const attendeeId of attendees) {
        if (attendeeId !== user.id) {
          await createNotification(
            attendeeId,
            'event_invite',
            `Você foi adicionado ao evento: ${title}`,
            id,
            'calendar_event'
          );
        }
      }
    }

    return NextResponse.json({ data: eventData }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/calendar error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
