
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// POST /api/ai/dismiss - Dismiss a pending AI interpretation (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMINISTRADOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { interpretation_id } = body;

    if (!interpretation_id) {
      return NextResponse.json({ error: 'interpretation_id is required' }, { status: 400 });
    }

    const db = getDb();

    const interpretation = await db
      .prepare('SELECT * FROM ai_interpretations WHERE id = ?')
      .bind(interpretation_id)
      .first<Record<string, unknown>>();

    if (!interpretation) {
      return NextResponse.json({ error: 'Interpretation not found' }, { status: 404 });
    }

    if (interpretation.status !== 'Pendente') {
      return NextResponse.json(
        { error: `Interpretation is already ${interpretation.status}` },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    await db
      .prepare(
        `UPDATE ai_interpretations
        SET status = 'Dispensado', dismissed_at = ?, dismissed_by = ?, updated_at = ?
        WHERE id = ?`
      )
      .bind(now, user.id, now, interpretation_id)
      .run();

    await logAudit(user.id, 'ai_interpretations', 'DISMISS', interpretation_id, {});

    return NextResponse.json({
      data: {
        interpretation_id,
        status: 'Dispensado',
        dismissed_at: now,
      },
    });
  } catch (error) {
    console.error('POST /api/ai/dismiss error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
