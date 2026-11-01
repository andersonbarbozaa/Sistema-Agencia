import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';

// GET /api/finance/debts/[id] — busca dívida detalhada com pagamentos
export async function GET(
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
      SELECT 
        d.*,
        u.name AS user_name,
        u.email AS user_email,
        u.avatar_url AS user_avatar_url,
        creator.name AS created_by_name
      FROM debts d
      LEFT JOIN users u ON u.id = d.user_id
      LEFT JOIN users creator ON creator.id = d.created_by
      WHERE d.id = ? AND (d.workspace_id = ? OR (d.workspace_id IS NULL AND ? = 'ws_default'))
    `).bind(id, wsId, wsId).first<any>();

    if (!debt) {
      return NextResponse.json({ error: 'Dívida não encontrada' }, { status: 404 });
    }

    const paymentsResult = await db.prepare(`
      SELECT 
        dp.*,
        u.name AS created_by_name
      FROM debt_payments dp
      LEFT JOIN users u ON u.id = dp.created_by
      WHERE dp.debt_id = ?
      ORDER BY dp.payment_date DESC, dp.created_at DESC
    `).bind(id).all();

    return NextResponse.json({
      debt,
      payments: paymentsResult.results || [],
    });
  } catch (error: any) {
    console.error('[GET /api/finance/debts/[id]]', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar detalhes da dívida' }, { status: 500 });
  }
}

// PATCH /api/finance/debts/[id] — edita informações da dívida
export async function PATCH(
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
      title,
      total_amount,
      due_date,
      company_name,
      user_id,
      client_id,
      total_installments,
      notes,
      status,
    } = body;

    let newTotalAmount = debt.total_amount;
    let newRemainingAmount = debt.remaining_amount;

    if (total_amount !== undefined && !isNaN(Number(total_amount))) {
      newTotalAmount = Number(total_amount);
      // Se alterou o valor total, o remaining_amount ajusta proporcionalmente subtraindo o que já foi pago
      newRemainingAmount = Math.max(0, newTotalAmount - Number(debt.paid_amount || 0));
    }

    let newStatus = status || debt.status;
    if (newRemainingAmount <= 0) {
      newStatus = 'paga';
    } else if (Number(debt.paid_amount || 0) > 0) {
      newStatus = 'parcial';
    } else {
      newStatus = 'pendente';
    }

    await db.prepare(`
      UPDATE debts SET
        title = COALESCE(?, title),
        total_amount = ?,
        remaining_amount = ?,
        due_date = ?,
        company_name = ?,
        user_id = ?,
        client_id = ?,
        total_installments = COALESCE(?, total_installments),
        notes = ?,
        status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      title ? title.trim() : debt.title,
      newTotalAmount,
      newRemainingAmount,
      due_date !== undefined ? due_date : debt.due_date,
      company_name !== undefined ? (company_name ? company_name.trim() : null) : debt.company_name,
      user_id !== undefined ? user_id : debt.user_id,
      client_id !== undefined ? client_id : debt.client_id,
      total_installments !== undefined ? Math.max(1, parseInt(total_installments, 10)) : debt.total_installments,
      notes !== undefined ? (notes ? notes.trim() : null) : debt.notes,
      newStatus,
      id
    ).run();

    const updated = await db.prepare(`
      SELECT 
        d.*,
        u.name AS user_name,
        u.email AS user_email,
        u.avatar_url AS user_avatar_url
      FROM debts d
      LEFT JOIN users u ON u.id = d.user_id
      WHERE d.id = ?
    `).bind(id).first<any>();

    return NextResponse.json({ success: true, debt: updated });
  } catch (error: any) {
    console.error('[PATCH /api/finance/debts/[id]]', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar dívida' }, { status: 500 });
  }
}

// DELETE /api/finance/debts/[id] — exclui dívida e seus pagamentos
export async function DELETE(
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

    // Exclui pagamentos vinculados
    await db.prepare('DELETE FROM debt_payments WHERE debt_id = ?').bind(id).run();
    // Exclui a dívida
    await db.prepare('DELETE FROM debts WHERE id = ?').bind(id).run();

    return NextResponse.json({ success: true, message: 'Dívida excluída com sucesso' });
  } catch (error: any) {
    console.error('[DELETE /api/finance/debts/[id]]', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir dívida' }, { status: 500 });
  }
}
