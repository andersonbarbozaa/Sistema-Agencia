import { NextRequest, NextResponse } from 'next/server';
import { getDb, getAdminFirestore } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') || searchParams.get('invite');

    if (!code) {
      return NextResponse.json({ error: 'Código de convite não informado' }, { status: 400 });
    }

    const cleanCode = code.trim();
    const db = getDb();
    let workspace = await db
      .prepare(
        `SELECT id, name, description, invite_code, created_at
         FROM workspaces
         WHERE invite_code = ? OR id = ?`
      )
      .bind(cleanCode, cleanCode)
      .first<{ id: string; name: string; description: string | null; invite_code: string; created_at: string }>();

    // Fallback: Busca no Firestore
    if (!workspace) {
      try {
        const firestore = getAdminFirestore();
        if (firestore) {
          const directDoc = await firestore.collection('workspaces').doc(cleanCode).get();
          if (directDoc.exists) {
            const data = directDoc.data();
            workspace = {
              id: directDoc.id,
              name: data?.name || 'Área de Trabalho',
              description: data?.description || null,
              invite_code: data?.invite_code || cleanCode,
              created_at: data?.created_at || new Date().toISOString(),
            };
          } else {
            const querySnap = await firestore.collection('workspaces').where('invite_code', '==', cleanCode).limit(1).get();
            if (!querySnap.empty) {
              const doc = querySnap.docs[0];
              const data = doc.data();
              workspace = {
                id: doc.id,
                name: data?.name || 'Área de Trabalho',
                description: data?.description || null,
                invite_code: data?.invite_code || cleanCode,
                created_at: data?.created_at || new Date().toISOString(),
              };
            }
          }
        }
      } catch (fsErr) {
        console.warn('[invite-info firestore lookup warning]:', fsErr);
      }
    }

    if (!workspace) {
      return NextResponse.json({ error: 'Área de Trabalho não encontrada ou link de convite expirado.' }, { status: 404 });
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('[GET /api/workspaces/invite-info]', error);
    return NextResponse.json({ error: 'Erro ao validar link de convite' }, { status: 500 });
  }
}
