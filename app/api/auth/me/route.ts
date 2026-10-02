import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
