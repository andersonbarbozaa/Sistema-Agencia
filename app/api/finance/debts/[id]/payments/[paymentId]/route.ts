import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';

// DELETE /api/finance/debts/[id]/payments/[paymentId] — exclui/estorna um pagamento de dívida
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, paymentId } = await params;
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

    const payment = await db.prepare(`
      SELECT * FROM debt_payments 
      WHERE id = ? AND debt_id = ?
    `).bind(paymentId, id).first<any>();

    if (!payment) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }

    // Se gerou transação no fluxo de caixa, exclui a transação
    if (payment.transaction_id) {
      try {
        await db.prepare('DELETE FROM financial_transactions WHERE id = ?').bind(payment.transaction_id).run();
      } catch (txErr) {
        console.error('Erro ao excluir transação associada:', txErr);
      }
    }

    // Remove o pagamento
    await db.prepare('DELETE FROM debt_payments WHERE id = ?').bind(paymentId).run();

    // Recalcula dívida restaurando o saldo restante
    const payAmount = Number(payment.amount || 0);
    const newPaidAmount = Math.max(0, Number(debt.paid_amount || 0) - payAmount);
    const newRemainingAmount = Math.min(Number(debt.total_amount || 0), Number(debt.remaining_amount || 0) + payAmount);
    const newPaidInstallments = Math.max(0, Number(debt.paid_installments || 0) - 1);
    const newStatus = newRemainingAmount <= 0.001 ? 'paga' : (newPaidAmount > 0 ? 'parcial' : 'pendente');

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
      message: 'Pagamento estornado com sucesso!',
      debt: updatedDebt,
    });
  } catch (error: any) {
    console.error('[DELETE /api/finance/debts/[id]/payments/[paymentId]]', error);
    return NextResponse.json({ error: error.message || 'Erro ao estornar pagamento' }, { status: 500 });
  }
}
