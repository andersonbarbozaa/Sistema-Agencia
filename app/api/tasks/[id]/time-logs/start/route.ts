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

    const db = await getDb();
    
    // Check if there is already an active timer for this user and task
    const activeLog = await db.prepare(`
      SELECT id FROM task_time_logs
      WHERE task_id = ? AND user_id = ? AND end_time IS NULL
    `).bind((await params).id, user.id).first();

    if (activeLog) {
      return NextResponse.json({ error: 'Timer already running for this task' }, { status: 400 });
    }

    const logId = uuidv4();
    const startTime = new Date().toISOString();

    await db.prepare(`
      INSERT INTO task_time_logs (id, task_id, user_id, start_time)
      VALUES (?, ?, ?, ?)
    `).bind(logId, (await params).id, user.id, startTime).run();

    return NextResponse.json({ id: logId, start_time: startTime }, { status: 201 });
  } catch (error: any) {
    console.error('Start timer error:', error);
    return NextResponse.json({ error: error.message || 'Error starting timer' }, { status: 500 });
  }
}
