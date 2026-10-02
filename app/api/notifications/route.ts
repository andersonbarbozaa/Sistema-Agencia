export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';

// GET /api/notifications — list notifications for current user
export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';

  try {
    const db = getDb();
    const filter = unreadOnly ? 'AND n.read_at IS NULL' : '';

    const rows = await db
      .prepare(
        `SELECT * FROM notifications n
         WHERE n.user_id = ? ${filter}
         ORDER BY n.created_at DESC
         LIMIT 100`
      )
      .bind(user.id)
      .all();

    const unreadCount = await db
      .prepare(
        `SELECT COUNT(*) AS count FROM notifications
         WHERE user_id = ? AND read_at IS NULL`
      )
      .bind(user.id)
      .first<{ count: number }>();

    return NextResponse.json({
      notifications: rows.results,
      data: rows.results,
      unread_count: unreadCount?.count ?? 0,
    });
  } catch (error) {
    console.error('[GET /api/notifications]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = getDb();
    const now = new Date().toISOString();

    const result = await db
      .prepare(
        `UPDATE notifications
         SET read_at = ?
         WHERE user_id = ? AND read_at IS NULL`
      )
      .bind(now, user.id)
      .run();

    return NextResponse.json({
      message: 'All notifications marked as read',
      updated: result.meta?.changes ?? 0,
    });
  } catch (error) {
    console.error('[PATCH /api/notifications]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications — clear all notifications for current user
export async function DELETE(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = getDb();
    await db
      .prepare('DELETE FROM notifications WHERE user_id = ?')
      .bind(user.id)
      .run();

    return NextResponse.json({ message: 'All notifications cleared successfully' });
  } catch (error) {
    console.error('[DELETE /api/notifications]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
