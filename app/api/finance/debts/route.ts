import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser } from '@/lib/auth';
import { ensureDebtTables } from '@/lib/debts-db';

// GET /api/finance/debts — lista todas as dívidas com métricas
export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const userId = searchParams.get('user_id');
  const search = searchParams.get('search');

  const db = getDb();
  await ensureDebtTables(db);
  const wsId = user.workspace_id || 'ws_default';

  const conditions: string[] = [
    "(d.workspace_id = ? OR (d.workspace_id IS NULL AND ? = 'ws_default'))"
  ];
  const params: any[] = [wsId, wsId];

  if (status && status !== 'todos') {
    if (status === 'aberto') {
      conditions.push("d.status != 'paga'");
    } else {
      conditions.push('d.status = ?');
      params.push(status);
    }
  }

  if (userId && userId !== 'todos') {
    conditions.push('d.user_id = ?');
    params.push(userId);
  }

  if (search) {
    conditions.push('(d.title LIKE ? OR d.company_name LIKE ? OR d.notes LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  try {
    // 1. Busca dívidas com usuário relacionado
    const query = `
      SELECT 
        d.*,
        u.name AS user_name,
        u.email AS user_email,
        u.avatar_url AS user_avatar_url,
        creator.name AS created_by_name
      FROM debts d
      LEFT JOIN users u ON u.id = d.user_id
      LEFT JOIN users creator ON creator.id = d.created_by
      ${where}
      ORDER BY 
        CASE WHEN d.status = 'paga' THEN 1 ELSE 0 END ASC,
        d.due_date ASC,
        d.created_at DESC
    `;

    const result = await db.prepare(query).bind(...params).all();
    const debts = result.results || [];

    // 2. Métricas gerais do workspace
    const metricsResult = await db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_amount,
        COALESCE(SUM(remaining_amount), 0) AS remaining_amount,
        COALESCE(SUM(paid_amount), 0) AS paid_amount,
        COUNT(*) AS total_count,
        SUM(CASE WHEN status != 'paga' THEN 1 ELSE 0 END) AS active_count,
        SUM(CASE WHEN status = 'paga' THEN 1 ELSE 0 END) AS paid_count
      FROM debts
      WHERE workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default')
    `).bind(wsId, wsId).first<any>();

    return NextResponse.json({
      debts,
      metrics: {
        total_amount: Number(metricsResult?.total_amount || 0),
        remaining_amount: Number(metricsResult?.remaining_amount || 0),
        paid_amount: Number(metricsResult?.paid_amount || 0),
        total_count: Number(metricsResult?.total_count || 0),
        active_count: Number(metricsResult?.active_count || 0),
        paid_count: Number(metricsResult?.paid_count || 0),
      }
    });
  } catch (error: any) {
    console.error('[GET /api/finance/debts]', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar dívidas' }, { status: 500 });
  }
}

// POST /api/finance/debts — cadastra uma nova dívida
export async function POST(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'CLIENTE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
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
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Informe a descrição/título da dívida.' }, { status: 400 });
    }

    const amountNum = Number(total_amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Informe um valor válido maior que zero.' }, { status: 400 });
    }

    const db = getDb();
    await ensureDebtTables(db);
    const wsId = user.workspace_id || 'ws_default';
    const debtId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const installments = Math.max(1, parseInt(total_installments || '1', 10));
    const targetUserId = user_id || user.id;

    // Se informou client_id e não colocou company_name, puxa o nome do cliente
    let finalCompanyName = (company_name || '').trim();
    if (!finalCompanyName && client_id) {
      const client = await db.prepare('SELECT name, company_name FROM clients WHERE id = ?').bind(client_id).first<any>();
      if (client) {
        finalCompanyName = client.company_name || client.name || '';
      }
    }

    await db.prepare(`
      INSERT INTO debts (
        id,
        workspace_id,
        title,
        total_amount,
        remaining_amount,
        paid_amount,
        due_date,
        company_name,
        user_id,
        client_id,
        status,
        total_installments,
        paid_installments,
        notes,
        created_by,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'pendente', ?, 0, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      debtId,
      wsId,
      title.trim(),
      amountNum,
      amountNum, // Saldo inicial restante é o total
      due_date || null,
      finalCompanyName || null,
      targetUserId,
      client_id || null,
      installments,
      notes ? notes.trim() : null,
      user.id
    ).run();

    const created = await db.prepare(`
      SELECT 
        d.*,
        u.name AS user_name,
        u.email AS user_email,
        u.avatar_url AS user_avatar_url
      FROM debts d
      LEFT JOIN users u ON u.id = d.user_id
      WHERE d.id = ?
    `).bind(debtId).first<any>();

    return NextResponse.json({ success: true, debt: created }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/finance/debts]', error);
    return NextResponse.json({ error: error.message || 'Erro ao cadastrar dívida' }, { status: 500 });
  }
}
