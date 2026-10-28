import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth';
import { logUserAccess } from '@/lib/audit';

// Cache em memória para throttlar o heartbeat e evitar escritas excessivas no banco
const lastHeartbeatByUser = new Map<string, number>();

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Registra sessão / heartbeat a cada 5 minutos por usuário para rastrear navegação e dispositivo
    const now = Date.now();
    const last = lastHeartbeatByUser.get(user.id) || 0;
    if (now - last > 5 * 60 * 1000) {
      lastHeartbeatByUser.set(user.id, now);
      // Dispara em segundo plano sem bloquear a resposta da rota
      logUserAccess(user.id, request, 'session_heartbeat', {
        email: user.email,
        role: user.role,
      }, user.workspace_id).catch(() => {});
    }

    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
