import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const result: any = {
      timestamp: new Date().toISOString(),
      runtime: 'cloudflare-workers-d1',
      database: { status: 'unknown' },
    };

    try {
      const db = getDb();
      const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
      const wsCount = await db.prepare('SELECT COUNT(*) as count FROM workspaces').first<{ count: number }>();

      result.database = {
        status: 'connected',
        users_count: userCount?.count ?? 0,
        workspaces_count: wsCount?.count ?? 0,
      };
    } catch (dbErr: any) {
      result.database = {
        status: 'error',
        error: dbErr?.message || 'Erro ao consultar banco D1',
      };
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || 'Internal Server Error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
