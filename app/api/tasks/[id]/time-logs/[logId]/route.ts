import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';

export async function PATCH(
  request: any,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { note } = await request.json();

    const db = await getDb();
    
    const log = await db.prepare(`
      SELECT user_id FROM task_time_logs WHERE id = ? AND task_id = ?
    `).bind((await params).logId, (await params).id).first() as { user_id: string } | null;

    if (!log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    // Optional: restrict note editing to the user who created it
    if (log.user_id !== user.id && user.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.prepare(`
      UPDATE task_time_logs
      SET note = ?
      WHERE id = ?
    `).bind(note, (await params).logId).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update time log error:', error);
    return NextResponse.json({ error: error.message || 'Error updating log' }, { status: 500 });
  }
}
