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

    // Helper to ensure table exists in Cloudflare D1
    const ensureTable = async () => {
      try {
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS task_time_logs (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            start_time TEXT NOT NULL,
            end_time TEXT,
            duration_seconds INTEGER,
            note TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `).run();
      } catch (e) {}
    };
    
    // Check if there is already an active timer for this user and task
    let activeLog: any = null;
    try {
      activeLog = await db.prepare(`
        SELECT id, start_time FROM task_time_logs
        WHERE task_id = ? AND user_id = ? AND end_time IS NULL
      `).bind(taskId, user.id).first() as { id: string; start_time: string } | null;
    } catch (dbErr: any) {
      if (dbErr.message && dbErr.message.includes('no such table')) {
        await ensureTable();
      } else {
        throw dbErr;
      }
    }

    if (activeLog) {
      return NextResponse.json({ 
        error: 'Já existe um cronômetro ativo para esta tarefa', 
        id: activeLog.id,
        start_time: activeLog.start_time
      }, { status: 400 });
    }

    const logId = 'log_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const startTime = new Date().toISOString();

    try {
      await db.prepare(`
        INSERT INTO task_time_logs (id, task_id, user_id, start_time)
        VALUES (?, ?, ?, ?)
      `).bind(logId, taskId, user.id, startTime).run();
    } catch (insertErr: any) {
      if (insertErr.message && insertErr.message.includes('no such table')) {
        await ensureTable();
        await db.prepare(`
          INSERT INTO task_time_logs (id, task_id, user_id, start_time)
          VALUES (?, ?, ?, ?)
        `).bind(logId, taskId, user.id, startTime).run();
      } else {
        throw insertErr;
      }
    }

    return NextResponse.json({ id: logId, start_time: startTime, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Start timer error:', error);
    return NextResponse.json({ error: error.message || 'Error starting timer' }, { status: 500 });
  }
}
