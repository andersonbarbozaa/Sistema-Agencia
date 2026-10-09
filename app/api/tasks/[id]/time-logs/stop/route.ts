import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';

export async function POST(
  request: any,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    
    const activeLog = await db.prepare(`
      SELECT id, start_time FROM task_time_logs
      WHERE task_id = ? AND user_id = ? AND end_time IS NULL
    `).bind((await params).id, user.id).first() as { id: string, start_time: string } | null;

    if (!activeLog) {
      return NextResponse.json({ error: 'No active timer found' }, { status: 400 });
    }

    const endTime = new Date().toISOString();
    const start = new Date(activeLog.start_time);
    const end = new Date(endTime);
    const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);

    await db.prepare(`
      UPDATE task_time_logs
      SET end_time = ?, duration_seconds = ?
      WHERE id = ?
    `).bind(endTime, durationSeconds, activeLog.id).run();

    return NextResponse.json({ id: activeLog.id, end_time: endTime, duration_seconds: durationSeconds }, { status: 200 });
  } catch (error: any) {
    console.error('Stop timer error:', error);
    return NextResponse.json({ error: error.message || 'Error stopping timer' }, { status: 500 });
  }
}
