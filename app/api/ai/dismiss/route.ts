import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
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

    const firestore = getAdminFirestore();
    const interpRef = firestore.collection('ai_interpretations').doc(interpretation_id);
    const interpDoc = await interpRef.get();

    if (!interpDoc.exists) {
      return NextResponse.json({ error: 'Interpretation not found' }, { status: 404 });
    }

    const interpretation: any = interpDoc.data();

    if (interpretation.status !== 'Pendente') {
      return NextResponse.json(
        { error: `Interpretation is already ${interpretation.status}` },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    await interpRef.set({
      status: 'Dispensado',
      dismissed_at: now,
      dismissed_by: user.id,
      updated_at: now,
    }, { merge: true });

    await logAudit(user.id, 'ai_interpretations', 'DISMISS', interpretation_id, {});

    return NextResponse.json({
      data: {
        interpretation_id,
        status: 'Dispensado',
        dismissed_at: now,
      },
    });
  } catch (error: any) {
    console.error('POST /api/ai/dismiss error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
