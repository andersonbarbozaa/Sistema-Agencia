
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const db = getDb();
    const { id } = await params;
    const body = await request.json();
    const { name, bank, type, initial_balance, responsible_partner_id, status } = body;

    const existing = await db.prepare('SELECT * FROM bank_accounts WHERE id = ?').bind(id).first();
    if (!existing) {
      return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
    }

    await db
      .prepare(`
        UPDATE bank_accounts
        SET name = COALESCE(?, name),
            bank = COALESCE(?, bank),
            type = COALESCE(?, type),
            initial_balance = COALESCE(?, initial_balance),
            responsible_partner_id = ?,
            status = COALESCE(?, status),
            updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(
        name ?? null,
        bank ?? null,
        type ?? null,
        initial_balance !== undefined ? Number(initial_balance) : null,
        responsible_partner_id !== undefined ? responsible_partner_id : (existing as any).responsible_partner_id,
        status ?? null,
        id
      )
      .run();

    await logAudit({
      userId: user.id,
      action: 'UPDATE',
      module: 'FINANCE',
      recordId: id,
      beforeData: existing,
      afterData: body,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao atualizar conta bancária.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const db = getDb();
    const { id } = await params;

    // Check if transactions exist
    const count = await db
      .prepare('SELECT COUNT(*) as total FROM financial_transactions WHERE bank_account_id = ?')
      .bind(id)
      .first<any>();

    if (count && count.total > 0) {
      // Soft-delete / deactivate
      await db.prepare('UPDATE bank_accounts SET status = "inativo" WHERE id = ?').bind(id).run();
      return NextResponse.json({ success: true, message: 'Conta desativada (possui transações vinculadas).' });
    }

    await db.prepare('DELETE FROM bank_accounts WHERE id = ?').bind(id).run();
    return NextResponse.json({ success: true, message: 'Conta removida com sucesso.' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao excluir conta bancária.' }, { status: 500 });
  }
}
