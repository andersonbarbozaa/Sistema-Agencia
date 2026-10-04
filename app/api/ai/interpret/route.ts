import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
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

    const firestore = getAdminFirestore();
    const id = generateId('aiint');
    const now = new Date().toISOString();

    const aiData = {
      id,
      user_id: user.id,
      input_type: audio_base64 ? 'audio' : 'text',
      input_text: input_text || 'Comando de áudio',
      audio_reference: audio_base64 ? 'audio_provided' : null,
      detected_action: interpretation.detected_action,
      structured_payload: interpretation.structured_payload,
      confidence: interpretation.confidence,
      status: 'Pendente',
      created_at: now,
      updated_at: now,
    };

    await firestore.collection('ai_interpretations').doc(id).set(aiData);

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
