import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') || searchParams.get('invite');

    if (!code) {
      return NextResponse.json({ error: 'Código de convite não informado' }, { status: 400 });
    }

    const db = getDb();
    const workspace = await db
      .prepare(
        `SELECT id, name, description, invite_code, created_at
         FROM workspaces
         WHERE invite_code = ? OR id = ?`
      )
      .bind(code, code)
      .first<{ id: string; name: string; description: string | null; invite_code: string; created_at: string }>();

    if (!workspace) {
      return NextResponse.json({ error: 'Área de Trabalho não encontrada ou link de convite expirado.' }, { status: 404 });
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('[GET /api/workspaces/invite-info]', error);
    return NextResponse.json({ error: 'Erro ao validar link de convite' }, { status: 500 });
  }
}
