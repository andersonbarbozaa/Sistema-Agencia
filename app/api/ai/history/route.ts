import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const firestore = getAdminFirestore();

    const [interpSnap, usersSnap] = await Promise.all([
      firestore.collection('ai_interpretations').get(),
      firestore.collection('users').get(),
    ]);

    const userMap: Record<string, string> = {};
    usersSnap.docs.forEach((d: any) => {
      userMap[d.id] = d.data().name || d.data().email;
    });

    let history = interpSnap.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        user_name: data.user_id ? (userMap[data.user_id] || null) : null,
      };
    });

    history.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return NextResponse.json({ history: history.slice(0, 25) });
  } catch (err: any) {
    console.error('GET /api/ai/history error:', err);
    return NextResponse.json({ error: 'Erro ao buscar histórico de IA.' }, { status: 500 });
  }
}
