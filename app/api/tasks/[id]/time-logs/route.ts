import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';

export async function GET(
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
    
    const { results: logs } = await db.prepare(`
      SELECT l.*, u.name as user_name 
      FROM task_time_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.task_id = ?
      ORDER BY l.start_time DESC
    `).bind(taskId).all();

    const mappedLogs = (logs || []).map((l: any) => ({
      ...l,
      is_current_user: l.user_id === user.id,
    }));

    return NextResponse.json(mappedLogs);
  } catch (error: any) {
    console.error('Get time logs error:', error);
    return NextResponse.json({ error: error.message || 'Error getting time logs' }, { status: 500 });
  }
}
