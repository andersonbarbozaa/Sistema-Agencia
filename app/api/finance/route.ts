
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const PAGE_SIZE = 20;

// GET /api/finance â€” list transactions (all roles except CLIENTE)
export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');           // Entrada | SaÃ­da
  const status = searchParams.get('status');       // Pendente | Pago
  const client_id = searchParams.get('client_id');
  const bank_account_id = searchParams.get('bank_account_id');
  const category_id = searchParams.get('category_id');
  const date_from = searchParams.get('date_from');
  const date_to = searchParams.get('date_to');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const db = getDb();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  const wsId = user.workspace_id || 'ws_default';
  conditions.push("(t.workspace_id = ? OR (t.workspace_id IS NULL AND ? = 'ws_default'))");
  params.push(wsId, wsId);

  if (type) { conditions.push('t.type = ?'); params.push(type); }
  if (status) { conditions.push('t.status = ?'); params.push(status); }
  if (client_id) { conditions.push('t.client_id = ?'); params.push(client_id); }
  if (bank_account_id) { conditions.push('t.bank_account_id = ?'); params.push(bank_account_id); }
  if (category_id) { conditions.push('t.category_id = ?'); params.push(category_id); }
  if (date_from) { conditions.push('t.due_date >= ?'); params.push(date_from); }
  if (date_to) { conditions.push('t.due_date <= ?'); params.push(date_to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countResult = await db
      .prepare(`SELECT COUNT(*) as total FROM financial_transactions t ${where}`)
      .bind(...params)
      .first<{ total: number }>();

    const total = countResult?.total ?? 0;

    const rows = await db
      .prepare(
        `SELECT
          t.*,
          fc.name        AS category_name,
          ba.name        AS bank_account_name,
          c.name         AS client_name,
          u.name         AS created_by_name
        FROM financial_transactions t
        LEFT JOIN financial_categories fc ON fc.id = t.category_id
        LEFT JOIN bank_accounts         ba ON ba.id = t.bank_account_id
        LEFT JOIN clients                c  ON c.id  = t.client_id
        LEFT JOIN users                  u  ON u.id  = t.created_by
        ${where}
        ORDER BY t.due_date DESC, t.created_at DESC
        LIMIT ? OFFSET ?`
      )
      .bind(...params, PAGE_SIZE, offset)
      .all();

    return NextResponse.json({
      data: rows.results,
      pagination: {
        page,
        page_size: PAGE_SIZE,
        total,
        total_pages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (error) {
    console.error('[GET /api/finance]', error);
    return NextResponse.json({ error: String(error) + String((error as any)?.stack) }, { status: 500 });
  }
}

// POST /api/finance — create transaction (admin only)
export async function POST(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { description, amount, type, due_date, status, client_id, bank_account_id, category_id, category_name, notes, partner_id, paid_at } = body;

    if (!description || amount == null || isNaN(Number(amount)) || !type || !due_date) {
      return NextResponse.json(
        { error: 'Preencha os campos obrigatórios: descrição, valor, tipo e vencimento.' },
        { status: 400 }
      );
    }

    if (!['Entrada', 'Saída'].includes(type)) {
      return NextResponse.json({ error: 'O tipo deve ser Entrada ou Saída.' }, { status: 400 });
    }

    const id = 'fin_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const now = new Date().toISOString();
    const txStatus = status ?? 'Pendente';
    const finalPaidAt = txStatus === 'Pago' ? (paid_at || now.split('T')[0]) : null;

    const wsId = user.workspace_id || 'ws_default';
    const db = getDb();

    // Resolve category_id safely (or auto-create if category_name was provided)
    let resolvedCategoryId: string | null = category_id && String(category_id).trim() ? String(category_id).trim() : null;
    if (resolvedCategoryId) {
      const catExists = await db.prepare('SELECT id FROM financial_categories WHERE id = ?').bind(resolvedCategoryId).first<{ id: string }>();
      if (!catExists) {
        resolvedCategoryId = null;
      }
    }
    if (!resolvedCategoryId && category_name && String(category_name).trim()) {
      const cleanCatName = String(category_name).trim();
      const existingByName = await db
        .prepare('SELECT id FROM financial_categories WHERE LOWER(name) = LOWER(?)')
        .bind(cleanCatName)
        .first<{ id: string }>();
      if (existingByName) {
        resolvedCategoryId = existingByName.id;
      } else {
        const newCatId = 'fcat_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        try {
          await db
            .prepare(`INSERT INTO financial_categories (id, name, type, is_active, workspace_id, created_at) VALUES (?, ?, ?, 1, ?, datetime('now'))`)
            .bind(newCatId, cleanCatName, type, wsId)
            .run();
          resolvedCategoryId = newCatId;
        } catch {
          try {
            await db
              .prepare(`INSERT INTO financial_categories (id, name, type, is_active, created_at) VALUES (?, ?, ?, 1, datetime('now'))`)
              .bind(newCatId, cleanCatName, type)
              .run();
            resolvedCategoryId = newCatId;
          } catch {}
        }
      }
    }

    // Validate foreign keys to prevent SQLite/D1 FOREIGN KEY constraint failures
    let resolvedClientId: string | null = client_id && String(client_id).trim() ? String(client_id).trim() : null;
    if (resolvedClientId) {
      const cliExists = await db.prepare('SELECT id FROM clients WHERE id = ?').bind(resolvedClientId).first();
      if (!cliExists) resolvedClientId = null;
    }

    let resolvedBankId: string | null = bank_account_id && String(bank_account_id).trim() ? String(bank_account_id).trim() : null;
    if (resolvedBankId) {
      const bankExists = await db.prepare('SELECT id FROM bank_accounts WHERE id = ?').bind(resolvedBankId).first();
      if (!bankExists) resolvedBankId = null;
    }

    let resolvedPartnerId: string | null = partner_id && String(partner_id).trim() ? String(partner_id).trim() : user.id;
    if (resolvedPartnerId) {
      const partExists = await db.prepare('SELECT id FROM users WHERE id = ?').bind(resolvedPartnerId).first();
      if (!partExists) resolvedPartnerId = null;
    }

    const insertRes = await db
      .prepare(
        `INSERT INTO financial_transactions
          (id, description, amount, type, status, due_date, client_id, bank_account_id, category_id, partner_id, notes, created_by, workspace_id, paid_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        description.trim(),
        Number(amount),
        type,
        txStatus,
        due_date,
        resolvedClientId,
        resolvedBankId,
        resolvedCategoryId,
        resolvedPartnerId,
        notes ?? null,
        user.id,
        wsId,
        finalPaidAt,
        now,
        now
      )
      .run();

    if (insertRes && insertRes.success === false) {
      throw new Error(insertRes.error || 'Erro ao gravar transação no banco de dados.');
    }

    await logAudit({
      user_id: user.id,
      action: 'CREATE',
      entity: 'transaction',
      entity_id: id,
      details: `Created ${type} transaction: ${description} — R$ ${amount}`,
    });

    const created = await db.prepare('SELECT * FROM financial_transactions WHERE id = ?').bind(id).first();
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/finance]', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

