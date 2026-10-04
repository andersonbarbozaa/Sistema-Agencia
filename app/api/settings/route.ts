import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const firestore = getAdminFirestore();
    const snap = await firestore.collection('settings').get();

    const settingsObj: Record<string, string> = {
      monthly_revenue_goal: '50000',
      default_currency: 'BRL',
      exchange_rate_usd: '5.65',
      exchange_rate_eur: '6.15',
    };

    snap.docs.forEach((doc: any) => {
      const data = doc.data();
      settingsObj[doc.id] = data.value !== undefined ? String(data.value) : '';
      if (data.key) {
        settingsObj[data.key] = data.value !== undefined ? String(data.value) : '';
      }
    });

    const isGeminiConfigured =
      (!!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') ||
      (!!settingsObj['gemini_api_key'] && settingsObj['gemini_api_key'].trim() !== '');

    return NextResponse.json({
      settings: settingsObj,
      gemini_configured: isGeminiConfigured,
      gemini_model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      google_calendar_configured: !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim() !== '',
    });
  } catch (err: any) {
    console.error('GET /api/settings error:', err);
    return NextResponse.json({ error: 'Erro ao carregar configurações.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const firestore = getAdminFirestore();
    const body = await request.json(); // key-value pairs
    const now = new Date().toISOString();

    const batch = firestore.batch();
    for (const [key, value] of Object.entries(body)) {
      const docRef = firestore.collection('settings').doc(key);
      batch.set(docRef, {
        key,
        value: String(value),
        updated_at: now,
      }, { merge: true });
    }
    await batch.commit();

    await logAudit({
      userId: user.id,
      action: 'UPDATE_SETTINGS',
      module: 'SETTINGS',
      afterData: body,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST /api/settings error:', err);
    return NextResponse.json({ error: 'Erro ao salvar configurações.' }, { status: 500 });
  }
}
