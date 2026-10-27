import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getMercadoPagoClient, MERCADOPAGO_PLANS, Preference } from '@/lib/mercadopago';

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para continuar.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawPlanId = body.plan_id || body.planId || body.plan_type || 'individual';
    const planKey = String(rawPlanId).toLowerCase().trim();

    const plan = MERCADOPAGO_PLANS[planKey];
    if (!plan) {
      return NextResponse.json(
        {
          error: `Plano inválido selecionado: "${rawPlanId}". Opções disponíveis: individual, pro, corporativo.`,
        },
        { status: 400 }
      );
    }

    const db = getDb();
    const workspaceId = user.workspace_id || 'ws_default';

    // Busca detalhes do workspace
    const workspace = await db
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .bind(workspaceId)
      .first<any>();

    const workspaceName = workspace?.name || 'PixelCraft Studio';

    // Determina a URL base para retorno e webhook
    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const protoHeader = request.headers.get('x-forwarded-proto') || (hostHeader.includes('localhost') ? 'http' : 'https');
    const origin = request.headers.get('origin') || `${protoHeader}://${hostHeader}`;

    // Instancia o cliente do Mercado Pago com validação do Access Token
    let client;
    try {
      client = getMercadoPagoClient();
    } catch (tokenErr: any) {
      return NextResponse.json(
        {
          error: tokenErr.message || 'MERCADOPAGO_ACCESS_TOKEN não configurado.',
        },
        { status: 400 }
      );
    }

    const preference = new Preference(client);

    const preferenceResponse = await preference.create({
      body: {
        items: [
          {
            id: plan.id,
            title: `Assinatura ${plan.name} - ${workspaceName}`,
            description: `${plan.summary} (${plan.period === 'monthly' ? 'Mensal' : 'Anual'})`,
            quantity: 1,
            unit_price: Number(plan.price),
            currency_id: 'BRL',
          },
        ],
        payer: {
          name: user.name || 'Cliente',
          email: user.email,
        },
        back_urls: {
          success: `${origin}/settings?tab=plans&payment=success&plan=${plan.id}`,
          failure: `${origin}/settings?tab=plans&payment=failure`,
          pending: `${origin}/settings?tab=plans&payment=pending`,
        },
        auto_return: 'approved',
        external_reference: workspaceId,
        metadata: {
          workspace_id: workspaceId,
          plan_id: plan.id,
          user_id: user.id,
          user_email: user.email,
        },
        notification_url: `${origin}/api/webhooks/mercadopago`,
        statement_descriptor: 'PIXELCRAFT',
      },
    });

    return NextResponse.json({
      success: true,
      id: preferenceResponse.id,
      init_point: preferenceResponse.init_point,
      sandbox_init_point: preferenceResponse.sandbox_init_point,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/payments/create-preference] Erro:', error);
    return NextResponse.json(
      {
        error: error.message || 'Erro ao gerar preferência de pagamento no Mercado Pago.',
      },
      { status: 500 }
    );
  }
}
