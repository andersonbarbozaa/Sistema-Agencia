export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/notifications/[id] — mark single notification as read
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const db = getDb();
    const notification = await db
      .prepare('SELECT * FROM notifications WHERE id = ?')
      .bind(id)
      .first<{ id: string; user_id: string; read_at: string | null }>();

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Users may only update their own notifications
    if (notification.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (notification.read_at) {
      return NextResponse.json({ message: 'Already marked as read', data: notification });
    }

    const now = new Date().toISOString();
    await db
      .prepare('UPDATE notifications SET read_at = ? WHERE id = ?')
      .bind(now, id)
      .run();

    const updated = await db
      .prepare('SELECT * FROM notifications WHERE id = ?')
      .bind(id)
      .first();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[PATCH /api/notifications/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] — delete notification
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const db = getDb();
    const notification = await db
      .prepare('SELECT * FROM notifications WHERE id = ?')
      .bind(id)
      .first<{ id: string; user_id: string }>();

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (notification.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.prepare('DELETE FROM notifications WHERE id = ?').bind(id).run();
    return NextResponse.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('[DELETE /api/notifications/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
