import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser, isAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const module = searchParams.get('module');
    const action = searchParams.get('action');
    const limit = Math.min(Number(searchParams.get('limit')) || 25, 100);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const offset = (page - 1) * limit;

    const firestore = getAdminFirestore();

    const [auditSnap, usersSnap] = await Promise.all([
      firestore.collection('audit_logs').get(),
      firestore.collection('users').get(),
    ]);

    const userMap: Record<string, { name: string; email: string }> = {};
    usersSnap.docs.forEach((d: any) => {
      const u = d.data();
      userMap[d.id] = { name: u.name, email: u.email };
    });

    let logs = auditSnap.docs.map((d: any) => {
      const a = d.data();
      const u = a.user_id ? userMap[a.user_id] : null;
      return {
        id: d.id,
        ...a,
        user_name: u?.name || 'Sistema',
        user_email: u?.email || null,
      };
    });

    if (module) logs = logs.filter((l: any) => l.module === module);
    if (action) logs = logs.filter((l: any) => l.action === action);

    logs.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const total = logs.length;
    const paginated = logs.slice(offset, offset + limit);

    return NextResponse.json({
      logs: paginated,
      total,
      page,
      limit,
    });
  } catch (err: any) {
    console.error('GET /api/audit error:', err);
    return NextResponse.json({ error: 'Erro ao buscar registros de auditoria.' }, { status: 500 });
  }
}
