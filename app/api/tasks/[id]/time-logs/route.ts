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

    const db = await getDb();
    
    const { results: logs } = await db.prepare(`
      SELECT l.*, u.name as user_name 
      FROM task_time_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.task_id = ?
      ORDER BY l.start_time DESC
    `).bind((await params).id).all();

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Get time logs error:', error);
    return NextResponse.json({ error: error.message || 'Error getting time logs' }, { status: 500 });
  }
}
