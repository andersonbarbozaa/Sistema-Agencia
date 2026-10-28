import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, isMasterAdmin } from '@/lib/auth';
import { getCloudflareHealthReport } from '@/lib/cloudflare';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);

    // Validação estrita: apenas o titular master pode acessar
    if (!user || !isMasterAdmin(user)) {
      return NextResponse.json(
        {
          error: 'Acesso restrito. Esta rota e dados são reservados exclusivamente ao titular do sistema.',
          code: 'FORBIDDEN_MASTER_ONLY',
        },
        { status: 403 }
      );
    }

    const report = await getCloudflareHealthReport();

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('[GET /api/admin-master/cloudflare error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao consultar telemetria Cloudflare' },
      { status: 500 }
    );
  }
}
