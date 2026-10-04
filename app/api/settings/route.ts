
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const db = getDb();
    const rows = await db.prepare('SELECT key, value, description FROM settings').all<any>();

    const settingsObj: Record<string, string> = {};
    for (const r of rows.results || []) {
      settingsObj[r.key] = r.value;
    }

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
    return NextResponse.json({ error: 'Erro ao carregar configurações.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const db = getDb();
    const body = await request.json(); // key-value pairs

    for (const [key, value] of Object.entries(body)) {
      await db
        .prepare(`
          INSERT INTO settings (key, value, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        `)
        .bind(key, String(value))
        .run();
    }

    await logAudit({
      userId: user.id,
      action: 'UPDATE_SETTINGS',
      module: 'SETTINGS',
      afterData: body,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao salvar configurações.' }, { status: 500 });
  }
}
