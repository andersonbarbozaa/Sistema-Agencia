import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'super_secret_jwt_key_creative_agency_2026_change_in_production';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const MASTER_EMAIL = 'anderson.barbozaa@gmail.com';
const TOKEN_COOKIE_NAME = 'agencia_auth_token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proteção ultra-estrita das rotas Master Admin
  if (pathname.startsWith('/admin-master') || pathname.startsWith('/api/admin-master')) {
    // 1. Tenta recuperar o token de sessão do cookie ou header
    let token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // Se não há token, barra imediatamente
    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Autenticação necessária para acessar o painel Master.', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const email = typeof payload?.email === 'string' ? payload.email.toLowerCase().trim() : '';

      // Passe livre irrestrito exclusivamente para anderson.barbozaa@gmail.com
      if (email === MASTER_EMAIL) {
        return NextResponse.next();
      }

      // Qualquer outro usuário (dono, admin, colaborador, cliente) é barrado imediatamente
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          {
            error: 'Acesso negado (403 Forbidden). Esta rota é de acesso exclusivo do titular do sistema.',
            code: 'FORBIDDEN_MASTER_ONLY',
          },
          { status: 403 }
        );
      }

      // Redireciona usuários não autorizados para a página inicial com status 403
      const redirectUrl = new URL('/dashboard', request.url);
      redirectUrl.searchParams.set('error', '403_master_only');
      return NextResponse.redirect(redirectUrl, { status: 307 });
    } catch (err) {
      // Token inválido ou adulterado
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Sessão inválida ou expirada.', code: 'INVALID_TOKEN' },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin-master/:path*', '/api/admin-master/:path*'],
};
