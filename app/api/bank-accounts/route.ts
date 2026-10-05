
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || user.role === 'CLIENTE') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const db = getDb();
    const wsId = user.workspace_id || 'ws_default';
    const accounts = await db
      .prepare(`
        SELECT ba.*, u.name as responsible_partner_name,
          COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE bank_account_id = ba.id AND type = 'Entrada' AND status = 'Pago'), 0) as total_entries,
          COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE bank_account_id = ba.id AND type = 'Saída' AND status = 'Pago'), 0) as total_exits
        FROM bank_accounts ba
        LEFT JOIN users u ON ba.responsible_partner_id = u.id
        WHERE (ba.workspace_id = ? OR (ba.workspace_id IS NULL AND ? = 'ws_default'))
        ORDER BY ba.created_at ASC
      `)
      .bind(wsId, wsId)
      .all<any>();

    const enriched = (accounts.results || []).map(acc => ({
      ...acc,
      current_balance: (acc.initial_balance || 0) + (acc.total_entries || 0) - (acc.total_exits || 0),
    }));

    return NextResponse.json({ accounts: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao listar contas bancárias.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const db = getDb();
    const body = await request.json();
    const { name, bank, type = 'Corrente', initial_balance = 0, responsible_partner_id, status = 'ativo' } = body;

    if (!name || !bank) {
      return NextResponse.json({ error: 'Nome e Banco são obrigatórios.' }, { status: 400 });
    }

    const id = generateId('acc');
    const wsId = user.workspace_id || 'ws_default';
    await db
      .prepare(`
        INSERT INTO bank_accounts (id, name, bank, type, initial_balance, responsible_partner_id, status, workspace_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `)
      .bind(id, name.trim(), bank.trim(), type, Number(initial_balance) || 0, responsible_partner_id || null, status, wsId)
      .run();

    await logAudit({
      userId: user.id,
      action: 'CREATE',
      module: 'FINANCE',
      recordId: id,
      afterData: body,
    });

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao criar conta bancária.' }, { status: 500 });
  }
}
