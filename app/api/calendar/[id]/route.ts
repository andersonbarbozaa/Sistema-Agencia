import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/calendar/[id] - Single calendar event
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const firestore = getAdminFirestore();

    const eventDoc = await firestore.collection('calendar_events').doc(id).get();
    if (!eventDoc.exists) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const event: any = { id: eventDoc.id, ...eventDoc.data() };

    let client_name = null;
    let project_name = null;
    let created_by_name = null;

    if (event.client_id) {
      const c = await firestore.collection('clients').doc(event.client_id).get();
      if (c.exists) client_name = c.data()?.name || null;
    }
    if (event.project_id) {
      const p = await firestore.collection('projects').doc(event.project_id).get();
      if (p.exists) project_name = p.data()?.name || null;
    }
    if (event.created_by) {
      const u = await firestore.collection('users').doc(event.created_by).get();
      if (u.exists) created_by_name = u.data()?.name || u.data()?.email || null;
    }

    return NextResponse.json({
      data: {
        ...event,
        client_name,
        project_name,
        created_by_name,
      }
    });
  } catch (error: any) {
    console.error('GET /api/calendar/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
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

    const { id } = await params;
    const firestore = getAdminFirestore();

    const eventRef = firestore.collection('calendar_events').doc(id);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const existing: any = eventDoc.data();
    const body = await request.json();
    const { start_time, end_time } = body;

    const resolvedStart = start_time ?? existing.start_time;
    const resolvedEnd = end_time ?? existing.end_time;
    if (resolvedStart && resolvedEnd && resolvedStart >= resolvedEnd) {
      return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 });
    }

    const allowedFields = [
      'title', 'description', 'event_date', 'start_time', 'end_time',
      'client_id', 'project_id', 'event_type', 'location', 'attendees',
    ];

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    await eventRef.set(updateData, { merge: true });

    await logAudit(user.id, 'calendar_events', 'UPDATE', id, body);

    const updatedDoc = await eventRef.get();
    return NextResponse.json({ data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    console.error('PATCH /api/calendar/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/calendar/[id] - Delete calendar event
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMINISTRADOR', 'COLABORADOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const firestore = getAdminFirestore();

    const eventRef = firestore.collection('calendar_events').doc(id);
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    await eventRef.delete();

    await logAudit(user.id, 'calendar_events', 'DELETE', id);

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/calendar/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
