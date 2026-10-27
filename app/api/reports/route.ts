import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getApiUser, isAdmin } from '@/lib/auth';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user || (!isAdmin(user) && user.is_partner !== 1)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores e sócios.' }, { status: 403 });
    }

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const yearParam = searchParams.get('year') || now.getFullYear().toString();
    const monthParam = searchParams.get('month'); // '1'..'12' or 'all' or null

    const wsId = user.workspace_id || 'ws_default';
    const isAllMonths = !monthParam || monthParam === 'all';
    const selectedYear = parseInt(yearParam, 10);
    const selectedMonth = !isAllMonths ? parseInt(monthParam, 10) : null;

    // --------------------------------------------------------------------------
    // 1. Definição do Período Atual, Anterior e Próximo (para comparativo e previsão)
    // --------------------------------------------------------------------------
    let currentPeriodFilter = '';
    let currentPeriodParams: (string | number)[] = [];
    let currentPeriodLabel = '';
    let previousPeriodFilter = '';
    let previousPeriodParams: (string | number)[] = [];
    let previousPeriodLabel = '';
    let comparisonTitle = '';
    let nextPeriodLabel = '';
    let predictionTitle = '';
    let predictionSubtitle = '';

    if (!isAllMonths && selectedMonth && selectedMonth >= 1 && selectedMonth <= 12) {
      const curMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      currentPeriodFilter = "strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ?";
      currentPeriodParams = [curMonthKey];
      currentPeriodLabel = MONTH_NAMES[selectedMonth - 1];

      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
      const prevMonthKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
      previousPeriodFilter = "strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ?";
      previousPeriodParams = [prevMonthKey];
      previousPeriodLabel = MONTH_NAMES[prevMonth - 1];

      const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
      const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
      nextPeriodLabel = MONTH_NAMES[nextMonth - 1];

      comparisonTitle = `Comparativo: ${currentPeriodLabel} vs ${previousPeriodLabel}`;
      predictionTitle = `Previsão para ${nextPeriodLabel}`;
      predictionSubtitle = 'Baseado na média dos últimos 3 meses';
    } else {
      const curYearStr = String(selectedYear);
      currentPeriodFilter = "strftime('%Y', COALESCE(paid_at, due_date, created_at)) = ?";
      currentPeriodParams = [curYearStr];
      currentPeriodLabel = curYearStr;

      const prevYearStr = String(selectedYear - 1);
      previousPeriodFilter = "strftime('%Y', COALESCE(paid_at, due_date, created_at)) = ?";
      previousPeriodParams = [prevYearStr];
      previousPeriodLabel = prevYearStr;

      const nextYearStr = String(selectedYear + 1);
      nextPeriodLabel = nextYearStr;

      comparisonTitle = `Comparativo: ${selectedYear} vs ${selectedYear - 1}`;
      predictionTitle = `Previsão para ${selectedYear + 1}`;
      predictionSubtitle = 'Baseado na projeção anual';
    }

    // --------------------------------------------------------------------------
    // 2. Query de Comparativo (Atual vs Anterior)
    // --------------------------------------------------------------------------
    const curEntriesRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as val
      FROM financial_transactions
      WHERE type = 'Entrada'
        AND (LOWER(COALESCE(status, '')) IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida') OR paid_at IS NOT NULL)
        AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
        AND ${currentPeriodFilter}
    `).bind(wsId, wsId, ...currentPeriodParams).first<{ val: number }>();

    const curExitsRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as val
      FROM financial_transactions
      WHERE type = 'Saída'
        AND (LOWER(COALESCE(status, '')) IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida') OR paid_at IS NOT NULL)
        AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
        AND ${currentPeriodFilter}
    `).bind(wsId, wsId, ...currentPeriodParams).first<{ val: number }>();

    const prevEntriesRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as val
      FROM financial_transactions
      WHERE type = 'Entrada'
        AND (LOWER(COALESCE(status, '')) IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida') OR paid_at IS NOT NULL)
        AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
        AND ${previousPeriodFilter}
    `).bind(wsId, wsId, ...previousPeriodParams).first<{ val: number }>();

    const prevExitsRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as val
      FROM financial_transactions
      WHERE type = 'Saída'
        AND (LOWER(COALESCE(status, '')) IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida') OR paid_at IS NOT NULL)
        AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
        AND ${previousPeriodFilter}
    `).bind(wsId, wsId, ...previousPeriodParams).first<{ val: number }>();

    const currentEntries = curEntriesRow?.val || 0;
    const currentExits = curExitsRow?.val || 0;
    const currentBalance = currentEntries - currentExits;

    const previousEntries = prevEntriesRow?.val || 0;
    const previousExits = prevExitsRow?.val || 0;
    const previousBalance = previousEntries - previousExits;

    // Variações percentuais
    let entriesVarPct = 0;
    if (previousEntries > 0) {
      entriesVarPct = Math.round(((currentEntries - previousEntries) / previousEntries) * 100);
    } else if (currentEntries > 0) {
      entriesVarPct = 100;
    }

    let exitsVarPct = 0;
    if (previousExits > 0) {
      exitsVarPct = Math.round(((currentExits - previousExits) / previousExits) * 100);
    } else if (currentExits > 0) {
      exitsVarPct = 100;
    }

    // --------------------------------------------------------------------------
    // 3. Previsão para o Próximo Período
    // --------------------------------------------------------------------------
    let projectedRevenue = 0;
    let projectedExpenses = 0;

    if (!isAllMonths && selectedMonth) {
      // Média dos últimos 3 meses
      const monthOffsets = [-2, -1, 0];
      let sum3Rev = 0;
      let sum3Exp = 0;
      let count3 = 0;

      for (const offset of monthOffsets) {
        const d = new Date(selectedYear, selectedMonth - 1 + offset, 1);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const rEnt = await db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as val FROM financial_transactions
          WHERE type = 'Entrada' AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
            AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ?
        `).bind(wsId, wsId, k).first<{ val: number }>();
        const rExt = await db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as val FROM financial_transactions
          WHERE type = 'Saída' AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
            AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ?
        `).bind(wsId, wsId, k).first<{ val: number }>();

        const entVal = rEnt?.val || 0;
        const extVal = rExt?.val || 0;
        if (entVal > 0 || extVal > 0 || offset === 0) {
          sum3Rev += entVal;
          sum3Exp += extVal;
          count3++;
        }
      }

      const div = Math.max(1, count3);
      projectedRevenue = Math.round(sum3Rev / div);
      projectedExpenses = Math.round(sum3Exp / div);
    } else {
      // Projeção Anual
      const monthsInYear = await db.prepare(`
        SELECT 
          strftime('%m', COALESCE(paid_at, due_date, created_at)) as m,
          SUM(CASE WHEN type = 'Entrada' THEN amount ELSE 0 END) as ent,
          SUM(CASE WHEN type = 'Saída' THEN amount ELSE 0 END) as ext
        FROM financial_transactions
        WHERE strftime('%Y', COALESCE(paid_at, due_date, created_at)) = ?
          AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
        GROUP BY m
      `).bind(String(selectedYear), wsId, wsId).all<any>();

      const mRows = monthsInYear.results || [];
      let totalYrRev = 0;
      let totalYrExp = 0;
      let activeMonths = 0;
      for (const r of mRows) {
        const ent = Number(r.ent) || 0;
        const ext = Number(r.ext) || 0;
        if (ent > 0 || ext > 0) {
          totalYrRev += ent;
          totalYrExp += ext;
          activeMonths++;
        }
      }
      const divYr = Math.max(1, activeMonths);
      projectedRevenue = Math.round((totalYrRev / divYr) * 12);
      projectedExpenses = Math.round((totalYrExp / divYr) * 12);
    }

    const projectedBalance = projectedRevenue - projectedExpenses;

    // --------------------------------------------------------------------------
    // 4. Maiores Gastos (Geral) & Maiores Retornos (Geral) - Imagem 1
    // --------------------------------------------------------------------------
    const topExpensesRows = await db.prepare(`
      SELECT 
        t.id,
        t.description,
        t.amount,
        COALESCE(fc.name, 'Despesa') as category_name,
        COALESCE(u.name, '—') as user_name,
        strftime('%d/%m/%Y', COALESCE(t.paid_at, t.due_date, t.created_at)) as formatted_date
      FROM financial_transactions t
      LEFT JOIN financial_categories fc ON fc.id = t.category_id
      LEFT JOIN users u ON u.id = COALESCE(t.partner_id, t.created_by)
      WHERE t.type = 'Saída'
        AND (t.workspace_id = ? OR (t.workspace_id IS NULL AND ? = 'ws_default'))
        AND ${currentPeriodFilter.replace(/\b(paid_at|due_date|created_at)\b/g, 't.$1')}
      ORDER BY t.amount DESC
      LIMIT 10
    `).bind(wsId, wsId, ...currentPeriodParams).all<any>();

    const topRevenuesRows = await db.prepare(`
      SELECT 
        t.id,
        t.description,
        t.amount,
        COALESCE(fc.name, 'Receita') as category_name,
        COALESCE(u.name, '—') as user_name,
        strftime('%d/%m/%Y', COALESCE(t.paid_at, t.due_date, t.created_at)) as formatted_date
      FROM financial_transactions t
      LEFT JOIN financial_categories fc ON fc.id = t.category_id
      LEFT JOIN users u ON u.id = COALESCE(t.partner_id, t.created_by)
      WHERE t.type = 'Entrada'
        AND (t.workspace_id = ? OR (t.workspace_id IS NULL AND ? = 'ws_default'))
        AND ${currentPeriodFilter.replace(/\b(paid_at|due_date|created_at)\b/g, 't.$1')}
      ORDER BY t.amount DESC
      LIMIT 10
    `).bind(wsId, wsId, ...currentPeriodParams).all<any>();

    // --------------------------------------------------------------------------
    // 5. Comparativo Conjunto por Usuário / Parceiro - Imagem 2
    // --------------------------------------------------------------------------
    // Lista de usuários para a barra comparativa
    const partnerUsers = await db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.avatar_url,
        COALESCE(SUM(CASE WHEN t.type = 'Entrada' THEN t.amount ELSE 0 END), 0) as total_received,
        COALESCE(SUM(CASE WHEN t.type = 'Saída' THEN t.amount ELSE 0 END), 0) as total_spent
      FROM users u
      LEFT JOIN financial_transactions t ON (t.partner_id = u.id OR (t.partner_id IS NULL AND t.created_by = u.id))
        AND (t.workspace_id = ? OR (t.workspace_id IS NULL AND ? = 'ws_default'))
        AND ${currentPeriodFilter.replace(/\b(paid_at|due_date|created_at)\b/g, 't.$1')}
      WHERE (u.is_partner = 1 OR u.role IN ('ADMINISTRADOR', 'COLABORADOR'))
        AND u.status = 'ativo'
        AND (u.workspace_id = ? OR (u.workspace_id IS NULL AND ? = 'ws_default'))
      GROUP BY u.id, u.name, u.avatar_url
      ORDER BY (total_spent + total_received) DESC, u.name ASC
    `).bind(wsId, wsId, ...currentPeriodParams, wsId, wsId).all<any>();

    const partnerList = (partnerUsers.results || []).map((p: any) => {
      const rec = Number(p.total_received) || 0;
      const spent = Number(p.total_spent) || 0;
      return {
        id: p.id,
        name: p.name,
        avatar_url: p.avatar_url,
        total_received: rec,
        total_spent: spent,
        net_balance: rec - spent,
      };
    });

    // Quem mais recebeu e Quem mais gastou
    let topReceiver = { name: '—', amount: 0 };
    let topSpender = { name: '—', amount: 0 };

    for (const p of partnerList) {
      if (p.total_received > topReceiver.amount) {
        topReceiver = { name: p.name, amount: p.total_received };
      }
      if (p.total_spent > topSpender.amount) {
        topSpender = { name: p.name, amount: p.total_spent };
      }
    }

    // --------------------------------------------------------------------------
    // 6. Dados Clássicos de Suporte (Mensalidades, Categorias, Clientes)
    // --------------------------------------------------------------------------
    const monthlyData = await db.prepare(`
      SELECT 
        strftime('%m', COALESCE(paid_at, due_date)) as month,
        SUM(CASE WHEN type = 'Entrada' AND (LOWER(COALESCE(status, '')) IN ('pago', 'recebido', 'concluido') OR paid_at IS NOT NULL) THEN amount ELSE 0 END) as entries_paid,
        SUM(CASE WHEN type = 'Saída' AND (LOWER(COALESCE(status, '')) IN ('pago', 'recebido', 'concluido') OR paid_at IS NOT NULL) THEN amount ELSE 0 END) as exits_paid,
        SUM(CASE WHEN type = 'Entrada' AND (LOWER(COALESCE(status, '')) IN ('pendente', 'a receber') OR paid_at IS NULL) THEN amount ELSE 0 END) as entries_pending,
        SUM(CASE WHEN type = 'Saída' AND (LOWER(COALESCE(status, '')) IN ('pendente', 'a pagar') OR paid_at IS NULL) THEN amount ELSE 0 END) as exits_pending
      FROM financial_transactions
      WHERE strftime('%Y', COALESCE(paid_at, due_date, created_at)) = ?
        AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
      GROUP BY strftime('%m', COALESCE(paid_at, due_date))
      ORDER BY month ASC
    `).bind(String(selectedYear), wsId, wsId).all<any>();

    const categorySpending = await db.prepare(`
      SELECT fc.name, fc.id, SUM(ft.amount) as total_amount, COUNT(ft.id) as count
      FROM financial_transactions ft
      JOIN financial_categories fc ON ft.category_id = fc.id
      WHERE ft.type = 'Saída'
        AND (LOWER(COALESCE(ft.status, '')) IN ('pago', 'recebido', 'concluido') OR ft.paid_at IS NOT NULL)
        AND (ft.workspace_id = ? OR (ft.workspace_id IS NULL AND ? = 'ws_default'))
      GROUP BY fc.id, fc.name
      ORDER BY total_amount DESC
    `).bind(wsId, wsId).all<any>();

    const clientBilling = await db.prepare(`
      SELECT 
        c.id, c.name,
        COALESCE(SUM(CASE WHEN ft.type = 'Entrada' AND (LOWER(COALESCE(ft.status, '')) IN ('pago', 'recebido', 'concluido') OR ft.paid_at IS NOT NULL) THEN ft.amount ELSE 0 END), 0) as total_received,
        COALESCE(SUM(CASE WHEN ft.type = 'Entrada' AND (LOWER(COALESCE(ft.status, '')) IN ('pendente', 'a receber') OR ft.paid_at IS NULL) THEN ft.amount ELSE 0 END), 0) as total_pending,
        COUNT(ft.id) as transaction_count
      FROM clients c
      LEFT JOIN financial_transactions ft ON ft.client_id = c.id AND (ft.workspace_id = ? OR (ft.workspace_id IS NULL AND ? = 'ws_default'))
      WHERE (c.workspace_id = ? OR (c.workspace_id IS NULL AND ? = 'ws_default'))
      GROUP BY c.id, c.name
      ORDER BY total_received DESC
    `).bind(wsId, wsId, wsId, wsId).all<any>();

    return NextResponse.json({
      year: String(selectedYear),
      month: isAllMonths ? 'all' : String(selectedMonth),
      filter: {
        year: selectedYear,
        month: isAllMonths ? null : selectedMonth,
        is_all_months: isAllMonths,
        current_period_label: currentPeriodLabel,
        previous_period_label: previousPeriodLabel,
      },
      // Dados para o Relatório (Imagem 1)
      report: {
        top_expenses: topExpensesRows.results || [],
        top_revenues: topRevenuesRows.results || [],
        comparison: {
          title: comparisonTitle,
          current_period_label: currentPeriodLabel,
          previous_period_label: previousPeriodLabel,
          entries: currentEntries,
          entries_previous: previousEntries,
          entries_var_pct: entriesVarPct,
          exits: currentExits,
          exits_previous: previousExits,
          exits_var_pct: exitsVarPct,
          balance: currentBalance,
          balance_previous: previousBalance,
        },
        prediction: {
          title: predictionTitle,
          subtitle: predictionSubtitle,
          next_period_label: nextPeriodLabel,
          projected_revenue: projectedRevenue,
          projected_expenses: projectedExpenses,
          projected_balance: projectedBalance,
        },
      },
      // Dados para o Comparativo / Conjunta (Imagem 2)
      comparative: {
        title: 'Conjunta',
        subtitle: 'Comparativo de gastos e receitas entre usuários',
        users: partnerList,
        top_receiver: topReceiver,
        top_spender: topSpender,
        top_expenses: topExpensesRows.results || [],
        top_revenues: topRevenuesRows.results || [],
      },
      // Legado / compatibilidade
      monthly: monthlyData.results || [],
      by_category: categorySpending.results || [],
      by_client: clientBilling.results || [],
      by_partner: partnerList,
    });
  } catch (err: any) {
    console.error('[Reports Error]:', err);
    return NextResponse.json({ error: 'Erro ao gerar relatórios.' }, { status: 500 });
  }
}
