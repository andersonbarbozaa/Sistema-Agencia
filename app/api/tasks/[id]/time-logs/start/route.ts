import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

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
    
    // Check if there is already an active timer for this user and task
    const activeLog = await db.prepare(`
      SELECT id, start_time FROM task_time_logs
      WHERE task_id = ? AND user_id = ? AND end_time IS NULL
    `).bind(taskId, user.id).first() as { id: string; start_time: string } | null;

    if (activeLog) {
      return NextResponse.json({ 
        error: 'Já existe um cronômetro ativo para esta tarefa', 
        id: activeLog.id,
        start_time: activeLog.start_time
      }, { status: 400 });
    }

    const logId = 'log_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const startTime = new Date().toISOString();

    await db.prepare(`
      INSERT INTO task_time_logs (id, task_id, user_id, start_time)
      VALUES (?, ?, ?, ?)
    `).bind(logId, taskId, user.id, startTime).run();

    return NextResponse.json({ id: logId, start_time: startTime, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Start timer error:', error);
    return NextResponse.json({ error: error.message || 'Error starting timer' }, { status: 500 });
  }
}
