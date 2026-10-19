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

    const db = getDb();
    const { id: taskId } = await params;
    
    let activeLog = await db.prepare(`
      SELECT id, start_time FROM task_time_logs
      WHERE task_id = ? AND user_id = ? AND end_time IS NULL
      ORDER BY start_time DESC
      LIMIT 1
    `).bind(taskId, user.id).first() as { id: string, start_time: string } | null;

    if (!activeLog) {
      activeLog = await db.prepare(`
        SELECT id, start_time FROM task_time_logs
        WHERE task_id = ? AND end_time IS NULL
        ORDER BY start_time DESC
        LIMIT 1
      `).bind(taskId).first() as { id: string, start_time: string } | null;
    }

    if (!activeLog) {
      return NextResponse.json({ error: 'Nenhum cronômetro ativo encontrado para esta tarefa' }, { status: 400 });
    }

    const endTime = new Date().toISOString();
    const start = new Date(activeLog.start_time);
    const end = new Date(endTime);
    const durationSeconds = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 1000));

    await db.prepare(`
      UPDATE task_time_logs
      SET end_time = ?, duration_seconds = ?
      WHERE id = ?
    `).bind(endTime, durationSeconds, activeLog.id).run();

    return NextResponse.json({ id: activeLog.id, end_time: endTime, duration_seconds: durationSeconds, success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Stop timer error:', error);
    return NextResponse.json({ error: error.message || 'Error stopping timer' }, { status: 500 });
  }
}
