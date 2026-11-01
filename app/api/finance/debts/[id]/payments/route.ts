import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';

// POST /api/finance/debts/[id]/payments — registra pagamento/amortização de parcela da dívida
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const db = getDb();
  const wsId = user.workspace_id || 'ws_default';

  try {
    const debt = await db.prepare(`
      SELECT * FROM debts 
      WHERE id = ? AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
    `).bind(id, wsId, wsId).first<any>();

    if (!debt) {
      return NextResponse.json({ error: 'Dívida não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const {
      amount,
      payment_date,
      payment_method,
      notes,
      create_transaction,
    } = body;

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json({ error: 'Informe um valor de pagamento válido maior que zero.' }, { status: 400 });
    }

    if (debt.remaining_amount <= 0) {
      return NextResponse.json({ error: 'Esta dívida já está totalmente quitada.' }, { status: 400 });
    }

    const payDate = payment_date || new Date().toISOString().split('T')[0];
    const paymentId = `debt_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const installmentNumber = (Number(debt.paid_installments) || 0) + 1;

    let transactionId: string | null = null;

    // Se solicitado, cria lançamento de despesa (Saída) no fluxo de caixa geral
    if (create_transaction) {
      transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const txDescription = `Pagamento Dívida: ${debt.title}${debt.company_name ? ` (${debt.company_name})` : ''} - Parcela ${installmentNumber}`;
      
      try {
        await db.prepare(`
          INSERT INTO financial_transactions (
            id,
            description,
            amount,
            type,
            status,
            due_date,
            paid_at,
            created_by,
            partner_id,
            workspace_id,
            notes,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, 'Saída', 'Pago', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).bind(
          transactionId,
          txDescription,
          payAmount,
          payDate,
          payDate,
          user.id,
          debt.user_id || user.id,
          wsId,
          notes || `Pagamento amortizado na dívida ${debt.title}`
        ).run();
      } catch (txErr) {
        console.error('Erro ao gerar lançamento de Saída:', txErr);
        transactionId = null;
      }
    }

    // Registra o pagamento em debt_payments
    await db.prepare(`
      INSERT INTO debt_payments (
        id,
        debt_id,
        workspace_id,
        amount,
        payment_date,
        installment_number,
        payment_method,
        notes,
        transaction_id,
        created_by,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      paymentId,
      id,
      wsId,
      payAmount,
      payDate,
      installmentNumber,
      payment_method || 'PIX',
      notes ? notes.trim() : null,
      transactionId,
      user.id
    ).run();

    // Atualiza a dívida: reduz remaining_amount e aumenta paid_amount
    const newPaidAmount = Number(debt.paid_amount || 0) + payAmount;
    const newRemainingAmount = Math.max(0, Number(debt.remaining_amount || 0) - payAmount);
    const newStatus = newRemainingAmount <= 0.001 ? 'paga' : 'parcial';
    const newPaidInstallments = installmentNumber;

    await db.prepare(`
      UPDATE debts SET
        paid_amount = ?,
        remaining_amount = ?,
        paid_installments = ?,
        status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      newPaidAmount,
      newRemainingAmount,
      newPaidInstallments,
      newStatus,
      id
    ).run();

    // Retorna dívida e pagamento atualizados
    const updatedDebt = await db.prepare(`
      SELECT 
        d.*,
        u.name AS user_name,
        u.email AS user_email,
        u.avatar_url AS user_avatar_url
      FROM debts d
      LEFT JOIN users u ON u.id = d.user_id
      WHERE d.id = ?
    `).bind(id).first<any>();

    return NextResponse.json({
      success: true,
      message: 'Pagamento registrado com sucesso!',
      debt: updatedDebt,
      payment: {
        id: paymentId,
        debt_id: id,
        amount: payAmount,
        payment_date: payDate,
        installment_number: installmentNumber,
        payment_method,
        notes,
      }
    });
  } catch (error: any) {
    console.error('[POST /api/finance/debts/[id]/payments]', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar pagamento' }, { status: 500 });
  }
}
