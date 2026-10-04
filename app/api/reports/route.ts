export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    // 1. Monthly Breakdown for the year (Entradas x Saídas x Resultado)
    const monthlyData = await db
      .prepare(`
        SELECT 
          strftime('%m', COALESCE(paid_at, due_date)) as month,
          SUM(CASE WHEN type = 'Entrada' AND status = 'Pago' THEN amount ELSE 0 END) as entries_paid,
          SUM(CASE WHEN type = 'Saída' AND status = 'Pago' THEN amount ELSE 0 END) as exits_paid,
          SUM(CASE WHEN type = 'Entrada' AND status = 'Pendente' THEN amount ELSE 0 END) as entries_pending,
          SUM(CASE WHEN type = 'Saída' AND status = 'Pendente' THEN amount ELSE 0 END) as exits_pending
        FROM financial_transactions
        WHERE strftime('%Y', COALESCE(paid_at, due_date)) = ?
        GROUP BY strftime('%m', COALESCE(paid_at, due_date))
        ORDER BY month ASC
      `)
      .bind(year)
      .all<any>();

    // 2. Spending by category (Saídas Pagas)
    const categorySpending = await db
      .prepare(`
        SELECT fc.name, fc.id, SUM(ft.amount) as total_amount, COUNT(ft.id) as count
        FROM financial_transactions ft
        JOIN financial_categories fc ON ft.category_id = fc.id
        WHERE ft.type = 'Saída' AND ft.status = 'Pago'
        GROUP BY fc.id, fc.name
        ORDER BY total_amount DESC
      `)
      .all<any>();

    // 3. Billing by Client (Faturamento por Cliente - Requisito 30)
    const clientBilling = await db
      .prepare(`
        SELECT 
          c.id, c.name,
          COALESCE(SUM(CASE WHEN ft.type = 'Entrada' AND ft.status = 'Pago' THEN ft.amount ELSE 0 END), 0) as total_received,
          COALESCE(SUM(CASE WHEN ft.type = 'Entrada' AND ft.status = 'Pendente' THEN ft.amount ELSE 0 END), 0) as total_pending,
          COALESCE(SUM(CASE WHEN ft.type = 'Entrada' AND ft.status = 'Pendente' AND ft.due_date < date('now') THEN ft.amount ELSE 0 END), 0) as total_overdue,
          COUNT(ft.id) as transaction_count
        FROM clients c
        LEFT JOIN financial_transactions ft ON ft.client_id = c.id
        GROUP BY c.id, c.name
        ORDER BY total_received DESC
      `)
      .all<any>();

    // 4. Partner breakdown (Requisito 28: sem ranking, comparação analítica de despesas e receitas por sócio)
    const partnerData = await db
      .prepare(`
        SELECT 
          u.id, u.name,
          COALESCE(SUM(CASE WHEN ft.type = 'Saída' AND ft.status = 'Pago' THEN ft.amount ELSE 0 END), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN ft.type = 'Entrada' AND ft.status = 'Pago' THEN ft.amount ELSE 0 END), 0) as total_entries,
          COUNT(ft.id) as transaction_count
        FROM users u
        LEFT JOIN financial_transactions ft ON ft.partner_id = u.id
        WHERE u.is_partner = 1 AND u.status = 'ativo'
        GROUP BY u.id, u.name
      `)
      .all<any>();

    return NextResponse.json({
      year,
      monthly: monthlyData.results || [],
      by_category: categorySpending.results || [],
      by_client: clientBilling.results || [],
      by_partner: partnerData.results || [],
    });
  } catch (err: any) {
    console.error('[Reports Error]:', err);
    return NextResponse.json({ error: 'Erro ao gerar relatórios.' }, { status: 500 });
  }
}
