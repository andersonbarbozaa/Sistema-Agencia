export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { interpretWithGemini } from '@/lib/gemini';
import { generateId } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const body = await request.json();
    const { input_text, audio_base64 } = body;

    if (!input_text && !audio_base64) {
      return NextResponse.json({ error: 'Texto ou gravação de voz é obrigatório.' }, { status: 400 });
    }

    const interpretation = await interpretWithGemini(input_text || '', audio_base64);

    const db = getDb();
    const id = generateId('aiint');

    await db
      .prepare(`
        INSERT INTO ai_interpretations (
          id, user_id, input_type, input_text, audio_reference, detected_action, structured_payload, confidence, status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pendente', datetime('now'))
      `)
      .bind(
        id,
        user.id,
        audio_base64 ? 'audio' : 'text',
        input_text || 'Comando de áudio',
        audio_base64 ? 'audio_provided' : null,
        interpretation.detected_action,
        JSON.stringify(interpretation.structured_payload),
        interpretation.confidence
      )
      .run();

    await logAudit({
      userId: user.id,
      action: 'AI_INTERPRET',
      module: 'AI',
      recordId: id,
      afterData: { detected_action: interpretation.detected_action, confidence: interpretation.confidence },
    });

    return NextResponse.json({
      id,
      interpretation,
      status: 'Pendente',
    });
  } catch (err: any) {
    console.error('[AI Interpret API Error]:', err);
    return NextResponse.json({ error: 'Erro ao interpretar comando.' }, { status: 500 });
  }
}
