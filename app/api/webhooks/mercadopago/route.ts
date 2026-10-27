import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { getMercadoPagoClient, Payment } from '@/lib/mercadopago';

// Suporte para handshake/ping GET do Mercado Pago
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'online',
    service: 'PixelCraft Mercado Pago Webhook',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Alguns webhooks IPN enviam dados apenas via searchParams/form
    }

    console.log('[Mercado Pago Webhook] Notificação recebida:', {
      searchParams: Object.fromEntries(searchParams.entries()),
      bodyAction: body?.action,
      bodyType: body?.type,
      dataId: body?.data?.id,
    });

    // 1. Extração do ID do pagamento
    const paymentId =
      body?.data?.id ||
      body?.id ||
      searchParams.get('data.id') ||
      searchParams.get('id');

    const topic =
      body?.type ||
      body?.topic ||
      searchParams.get('topic') ||
      searchParams.get('type');

    // Se for um teste do painel do Mercado Pago
    if (body?.action === 'test' || topic === 'test') {
      return NextResponse.json({ received: true, test: true }, { status: 200 });
    }

    if (!paymentId) {
      console.warn('[Mercado Pago Webhook] Notificação sem ID de pagamento identificado.');
      return NextResponse.json({ received: true, message: 'Sem payment_id' }, { status: 200 });
    }

    // 2. Consulta os detalhes do pagamento no Mercado Pago
    let client;
    try {
      client = getMercadoPagoClient();
    } catch (clientErr: any) {
      console.error('[Mercado Pago Webhook] Erro ao obter cliente Mercado Pago:', clientErr.message);
      return NextResponse.json(
        { error: 'Credenciais do Mercado Pago não configuradas no servidor.' },
        { status: 500 }
      );
    }

    const payment = new Payment(client);
    let paymentData: any;
    try {
      paymentData = await payment.get({ id: String(paymentId) });
    } catch (fetchErr: any) {
      console.error(`[Mercado Pago Webhook] Erro ao consultar pagamento #${paymentId}:`, fetchErr.message);
      // Retornamos 200 para evitar retentativas agressivas de pagamentos não encontrados/sandbox
      return NextResponse.json({ received: true, error: fetchErr.message }, { status: 200 });
    }

    const status = paymentData.status;
    const externalRef = paymentData.external_reference || paymentData.metadata?.workspace_id;
    const planId = paymentData.metadata?.plan_id || paymentData.additional_info?.items?.[0]?.id || null;
    const payerEmail = paymentData.payer?.email || paymentData.metadata?.user_email || null;
    const amount = Number(paymentData.transaction_amount || 0);

    console.log(`[Mercado Pago Webhook] Pagamento #${paymentId} com status: "${status}" para Workspace: "${externalRef}"`);

    const db = getDb();

    // 3. Registra o log do pagamento na tabela payment_logs
    try {
      const logId = 'pay_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      await db
        .prepare(
          `INSERT INTO payment_logs (id, workspace_id, payment_id, status, plan_type, amount, payer_email, raw_payload)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          logId,
          externalRef || 'ws_default',
          String(paymentId),
          status,
          planId,
          amount,
          payerEmail,
          JSON.stringify(paymentData)
        )
        .run();
    } catch (logErr) {
      console.warn('[Mercado Pago Webhook] Aviso ao salvar payment_log:', logErr);
    }

    // 4. Se o status for 'approved', ativa o Workspace
    if (status === 'approved') {
      let targetWorkspaceId = externalRef;

      // Verifica se o workspace existe
      let workspace = null;
      if (targetWorkspaceId) {
        workspace = await db
          .prepare('SELECT * FROM workspaces WHERE id = ?')
          .bind(targetWorkspaceId)
          .first<any>();
      }

      // Se não encontrou pelo ID informado, tenta o workspace padrão
      if (!workspace) {
        workspace = await db
          .prepare('SELECT * FROM workspaces ORDER BY created_at ASC LIMIT 1')
          .first<any>();
        if (workspace) {
          targetWorkspaceId = workspace.id;
        }
      }

      if (targetWorkspaceId) {
        // Atualiza a coluna subscription_status para 'active'
        await db
          .prepare(
            `UPDATE workspaces
             SET subscription_status = 'active',
                 plan_type = COALESCE(?, plan_type),
                 mercadopago_payment_id = ?,
                 updated_at = datetime('now')
             WHERE id = ?`
          )
          .bind(planId, String(paymentId), targetWorkspaceId)
          .run();

        const updatedWorkspace = await db
          .prepare('SELECT * FROM workspaces WHERE id = ?')
          .bind(targetWorkspaceId)
          .first<any>();

        // Registra log de auditoria
        await logAudit({
          userId: paymentData.metadata?.user_id || 'mercadopago_webhook',
          action: 'PAYMENT_APPROVED_SUBSCRIPTION_ACTIVE',
          module: 'BILLING',
          recordId: targetWorkspaceId,
          beforeData: workspace,
          afterData: updatedWorkspace,
        });

        console.log(`[Mercado Pago Webhook] Workspace "${targetWorkspaceId}" ativado com sucesso para o plano "${planId || workspace?.plan_type}"!`);
      } else {
        console.warn('[Mercado Pago Webhook] Nenhum workspace localizado para associar ao pagamento aprovado.');
      }
    }

    return NextResponse.json({
      received: true,
      paymentId,
      status,
      workspaceId: externalRef,
    });
  } catch (error: any) {
    console.error('[Mercado Pago Webhook] Erro crítico ao processar notificação:', error);
    // Sempre retorne 200 para evitar repetições infinitas se o erro for de payload
    return NextResponse.json(
      { received: true, error: error.message || 'Erro interno no processamento do webhook' },
      { status: 200 }
    );
  }
}
