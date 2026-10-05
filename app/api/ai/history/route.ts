
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const db = getDb();
    const interpretations = await db
      .prepare(`
        SELECT ai.*, u.name as user_name
        FROM ai_interpretations ai
        LEFT JOIN users u ON ai.user_id = u.id
        ORDER BY ai.created_at DESC
        LIMIT 25
      `)
      .all<any>();

    const parsed = (interpretations.results || []).map(item => {
      let payload = item.structured_payload;
      try {
        if (typeof payload === 'string') {
          payload = JSON.parse(payload);
        }
      } catch {
        // keep as is
      }
      return {
        ...item,
        structured_payload: payload,
      };
    });

    return NextResponse.json({ history: parsed });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao buscar histórico de IA.' }, { status: 500 });
  }
}
