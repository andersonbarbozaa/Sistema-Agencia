import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') || searchParams.get('invite');

    if (!code) {
      return NextResponse.json({ error: 'Código de convite não informado' }, { status: 400 });
    }

    const cleanCode = code.trim();
    const firestore = getAdminFirestore();

    // 1. Try finding by ID
    const directDoc = await firestore.collection('workspaces').doc(cleanCode).get();
    if (directDoc.exists) {
      const data = directDoc.data();
      return NextResponse.json({
        workspace: {
          id: directDoc.id,
          name: data?.name || 'Área de Trabalho',
          description: data?.description || null,
          invite_code: data?.invite_code || cleanCode,
          created_at: data?.created_at || new Date().toISOString(),
        }
      });
    }

    // 2. Try finding by invite_code
    const querySnap = await firestore.collection('workspaces').where('invite_code', '==', cleanCode).limit(1).get();
    if (!querySnap.empty) {
      const doc = querySnap.docs[0];
      const data = doc.data();
      return NextResponse.json({
        workspace: {
          id: doc.id,
          name: data?.name || 'Área de Trabalho',
          description: data?.description || null,
          invite_code: data?.invite_code || cleanCode,
          created_at: data?.created_at || new Date().toISOString(),
        }
      });
    }

    // Special fallback for 'pixelcraft' or 'ws_default'
    if (cleanCode === 'pixelcraft' || cleanCode === 'ws_default') {
      const defaultWs = {
        id: 'ws_default',
        name: 'PixelCraft Studio',
        description: 'Agência Audiovisual & Criativa',
        invite_code: 'pixelcraft',
        created_at: new Date().toISOString(),
      };
      await firestore.collection('workspaces').doc('ws_default').set(defaultWs, { merge: true });
      return NextResponse.json({ workspace: defaultWs });
    }

    return NextResponse.json({ error: 'Área de Trabalho não encontrada ou link de convite expirado.' }, { status: 404 });
  } catch (error: any) {
    console.error('[GET /api/workspaces/invite-info]', error);
    return NextResponse.json({ error: error?.message || 'Erro ao validar link de convite' }, { status: 500 });
  }
}
