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
    const year = searchParams.get('year') || now.getFullYear().toString();

    const wsId = user.workspace_id || 'ws_default';

    // 1. Monthly Breakdown for the year (Entradas x Saídas x Resultado)
    const monthlyData = await db
      .prepare(`
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
      `)
      .bind(year, wsId, wsId)
      .all<any>();

    // 2. Spending by category (Saídas Pagas)
    const categorySpending = await db
      .prepare(`
        SELECT fc.name, fc.id, SUM(ft.amount) as total_amount, COUNT(ft.id) as count
        FROM financial_transactions ft
        JOIN financial_categories fc ON ft.category_id = fc.id
        WHERE ft.type = 'Saída'
          AND (LOWER(COALESCE(ft.status, '')) IN ('pago', 'recebido', 'concluido') OR ft.paid_at IS NOT NULL)
          AND (ft.workspace_id = ? OR (ft.workspace_id IS NULL AND ? = 'ws_default'))
        GROUP BY fc.id, fc.name
        ORDER BY total_amount DESC
      `)
      .bind(wsId, wsId)
      .all<any>();

    // 3. Billing by Client
    const clientBilling = await db
      .prepare(`
        SELECT 
          c.id, c.name,
          COALESCE(SUM(CASE WHEN ft.type = 'Entrada' AND (LOWER(COALESCE(ft.status, '')) IN ('pago', 'recebido', 'concluido') OR ft.paid_at IS NOT NULL) THEN ft.amount ELSE 0 END), 0) as total_received,
          COALESCE(SUM(CASE WHEN ft.type = 'Entrada' AND (LOWER(COALESCE(ft.status, '')) IN ('pendente', 'a receber') OR ft.paid_at IS NULL) THEN ft.amount ELSE 0 END), 0) as total_pending,
          COALESCE(SUM(CASE WHEN ft.type = 'Entrada' AND (LOWER(COALESCE(ft.status, '')) IN ('pendente', 'a receber') OR ft.paid_at IS NULL) AND ft.due_date < date('now') THEN ft.amount ELSE 0 END), 0) as total_overdue,
          COUNT(ft.id) as transaction_count
        FROM clients c
        LEFT JOIN financial_transactions ft ON ft.client_id = c.id AND (ft.workspace_id = ? OR (ft.workspace_id IS NULL AND ? = 'ws_default'))
        WHERE (c.workspace_id = ? OR (c.workspace_id IS NULL AND ? = 'ws_default'))
        GROUP BY c.id, c.name
        ORDER BY total_received DESC
      `)
      .bind(wsId, wsId, wsId, wsId)
      .all<any>();

    // 4. Partner breakdown
    const partnerData = await db
      .prepare(`
        SELECT 
          u.id, u.name,
          COALESCE(SUM(CASE WHEN ft.type = 'Saída' AND (LOWER(COALESCE(ft.status, '')) IN ('pago', 'recebido', 'concluido') OR ft.paid_at IS NOT NULL) THEN ft.amount ELSE 0 END), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN ft.type = 'Entrada' AND (LOWER(COALESCE(ft.status, '')) IN ('pago', 'recebido', 'concluido') OR ft.paid_at IS NOT NULL) THEN ft.amount ELSE 0 END), 0) as total_entries,
          COUNT(ft.id) as transaction_count
        FROM users u
        LEFT JOIN financial_transactions ft ON ft.partner_id = u.id AND (ft.workspace_id = ? OR (ft.workspace_id IS NULL AND ? = 'ws_default'))
        WHERE u.is_partner = 1 AND u.status = 'ativo' AND (u.workspace_id = ? OR (u.workspace_id IS NULL AND ? = 'ws_default'))
        GROUP BY u.id, u.name
      `)
      .bind(wsId, wsId, wsId, wsId)
      .all<any>();

    // --------------------------------------------------------------------------
    // 5. CÁLCULOS DO CONTADOR CONSULTIVO (Mês Passado, Atual, Previsão, Média Anual)
    // --------------------------------------------------------------------------
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    const prevDate = new Date(curYear, curMonth - 2, 1);
    const nextDate = new Date(curYear, curMonth, 1);

    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const curMonthKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    const nextMonthKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    const getMonthFinancials = async (monthKey: string) => {
      const rec = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as val
        FROM financial_transactions
        WHERE type = 'Entrada'
          AND (
            LOWER(COALESCE(status, '')) IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida')
            OR (paid_at IS NOT NULL AND LOWER(COALESCE(status, '')) != 'cancelado')
          )
          AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
          AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ?
      `).bind(wsId, wsId, monthKey).first<{ val: number }>();

      const pag = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as val
        FROM financial_transactions
        WHERE type = 'Saída'
          AND (
            LOWER(COALESCE(status, '')) IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida')
            OR (paid_at IS NOT NULL AND LOWER(COALESCE(status, '')) != 'cancelado')
          )
          AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
          AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = ?
      `).bind(wsId, wsId, monthKey).first<{ val: number }>();

      const aRec = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as val
        FROM financial_transactions
        WHERE type = 'Entrada'
          AND (
            LOWER(COALESCE(status, '')) IN ('pendente', 'a receber')
            OR (paid_at IS NULL AND LOWER(COALESCE(status, '')) NOT IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida', 'cancelado'))
          )
          AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
          AND strftime('%Y-%m', due_date) = ?
      `).bind(wsId, wsId, monthKey).first<{ val: number }>();

      const aPag = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as val
        FROM financial_transactions
        WHERE type = 'Saída'
          AND (
            LOWER(COALESCE(status, '')) IN ('pendente', 'a pagar')
            OR (paid_at IS NULL AND LOWER(COALESCE(status, '')) NOT IN ('pago', 'recebido', 'recebida', 'concluido', 'concluida', 'cancelado'))
          )
          AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
          AND strftime('%Y-%m', due_date) = ?
      `).bind(wsId, wsId, monthKey).first<{ val: number }>();

      const received = rec?.val || 0;
      const spent = pag?.val || 0;
      return {
        received,
        spent,
        result: received - spent,
        pending_receive: aRec?.val || 0,
        pending_pay: aPag?.val || 0,
      };
    };

    const [lastMonthData, curMonthData, nextMonthDirectData] = await Promise.all([
      getMonthFinancials(prevMonthKey),
      getMonthFinancials(curMonthKey),
      getMonthFinancials(nextMonthKey),
    ]);

    // Previsão Mês Seguinte: considerar agendamentos diretos + contratos ativos recorrentes
    const activeContracts = await db.prepare(`
      SELECT COALESCE(SUM(value), 0) as total_val, COUNT(*) as cnt
      FROM contracts
      WHERE status = 'ativo'
        AND (workspace_id = ? OR (workspace_id IS NULL AND ? = 'ws_default'))
    `).bind(wsId, wsId).first<{ total_val: number; cnt: number }>();

    // Contratos anuais divididos por 12 (estimativa mensal recorrente)
    const monthlyContractRevenue = activeContracts?.total_val ? Math.round(activeContracts.total_val / 12) : 0;
    const projectedNextRevenue = Math.max(nextMonthDirectData.received + nextMonthDirectData.pending_receive, monthlyContractRevenue);
    
    // Projeção de despesas: se não houver lançadas, estimar pela média de despesas do mês atual e anterior
    const baselineExpenses = curMonthData.spent > 0 ? curMonthData.spent : (lastMonthData.spent > 0 ? lastMonthData.spent : 2000);
    const projectedNextExpenses = nextMonthDirectData.spent + nextMonthDirectData.pending_pay > 0 
      ? (nextMonthDirectData.spent + nextMonthDirectData.pending_pay) 
      : baselineExpenses;

    const projectedNextResult = projectedNextRevenue - projectedNextExpenses;

    // --------------------------------------------------------------------------
    // 6. MÉDIA ANUAL (Considera os meses com movimentação do ano de exercício)
    // --------------------------------------------------------------------------
    const annualMonths = monthlyData.results || [];
    let sumRevenue = 0;
    let sumExpenses = 0;
    let activeMonthsCount = 0;

    for (const m of annualMonths) {
      const ent = Number(m.entries_paid) || 0;
      const ext = Number(m.exits_paid) || 0;
      if (ent > 0 || ext > 0) {
        sumRevenue += ent;
        sumExpenses += ext;
        activeMonthsCount++;
      }
    }

    const divisor = Math.max(1, activeMonthsCount);
    const avgMonthlyRevenue = Math.round(sumRevenue / divisor);
    const avgMonthlyExpenses = Math.round(sumExpenses / divisor);
    const avgMonthlyProfit = avgMonthlyRevenue - avgMonthlyExpenses;
    const avgMarginPercent = avgMonthlyRevenue > 0 ? Math.round((avgMonthlyProfit / avgMonthlyRevenue) * 100) : 0;

    // --------------------------------------------------------------------------
    // 7. PARECER DINÂMICO DE SAÚDE FINANCEIRA DO CONTADOR
    // --------------------------------------------------------------------------
    let healthStatus: 'excelente' | 'boa' | 'atencao' | 'critica' = 'boa';
    let healthTitle = 'Saúde Financeira Saudável';
    let summaryText = '';
    const recommendedActions: string[] = [];

    const curProfit = curMonthData.result;
    const curReceived = curMonthData.received;
    const curSpent = curMonthData.spent;

    if (curReceived === 0 && curSpent === 0) {
      healthStatus = 'boa';
      healthTitle = 'Aguardando Lançamentos do Mês';
      summaryText = 'Nenhum lançamento financeiro registrado até o momento para o mês corrente. Cadastre recebimentos e despesas para gerar o parecer completo.';
      recommendedActions.push('Lançar as receitas e despesas já ocorridas neste mês.');
      recommendedActions.push('Vincular as faturas pendentes aos clientes cadastrados.');
    } else if (curProfit > 0 && curSpent > 0 && curReceived >= curSpent * 1.35) {
      healthStatus = 'excelente';
      healthTitle = 'Saúde Financeira Excelente (Superávit Alto)';
      summaryText = `A agência opera com alta rentabilidade neste mês (${Math.round((curProfit / curReceived) * 100)}% de margem operacional líquida). As receitas realizadas cobrem as despesas com folga expressiva de capital.`;
      recommendedActions.push('Constituir ou ampliar a reserva de segurança para assegurar no mínimo 3 meses de custos operacionais fixos.');
      recommendedActions.push('Reinvestir parte do superávit em aquisição de clientes (anúncios, inbound e branding) para manter o ritmo de tração.');
      recommendedActions.push('Planejar a distribuição de lucros aos sócios preservando o caixa de giro para o próximo mês.');
    } else if (curProfit >= 0) {
      healthStatus = 'boa';
      healthTitle = 'Saúde Financeira Equilibrada';
      summaryText = `As contas estão no azul, com resultado positivo de R$ ${curProfit.toLocaleString('pt-BR')}. Há equilíbrio entre o faturamento realizado e os custos operacionais.`;
      recommendedActions.push(`Acompanhar a cobrança dos R$ ${curMonthData.pending_receive.toLocaleString('pt-BR')} ainda pendentes de recebimento neste mês.`);
      recommendedActions.push('Buscar elevar o ticket médio de contratos recorrentes para expandir a margem líquida para além de 30%.');
      recommendedActions.push('Auditar despesas administrativas e recorrentes para evitar desperdícios em ferramentas subutilizadas.');
    } else if (curProfit < 0 && (curSpent - curReceived) <= 1500) {
      healthStatus = 'atencao';
      healthTitle = 'Alerta: Margem Pressionada / Déficit Leve';
      summaryText = `Neste mês, as despesas pagas superaram as receitas realizadas em R$ ${Math.abs(curProfit).toLocaleString('pt-BR')}. No entanto, há R$ ${curMonthData.pending_receive.toLocaleString('pt-BR')} previstos a receber que podem reverter o quadro.`;
      recommendedActions.push(`Cobrar imediatamente os recebimentos pendentes (R$ ${curMonthData.pending_receive.toLocaleString('pt-BR')}) para reequilibrar o caixa antes do fim do mês.`);
      recommendedActions.push('Suspender despesas discricionárias e avaliar cortes em custos variáveis não prioritários.');
      recommendedActions.push('Acelerar o fechamento de propostas quentes que estão em fase de negociação no CRM.');
    } else {
      healthStatus = 'critica';
      healthTitle = 'Atenção Crítica: Déficit Operacional Significativo';
      summaryText = `O caixa apresenta déficit de R$ ${Math.abs(curProfit).toLocaleString('pt-BR')} no período. As saídas superaram intensamente as receitas efetivadas, exigindo intervenção rápida na estrutura de custos e cobrança.`;
      recommendedActions.push('Renegociar prazos com fornecedores e terceirizados para postergar saídas de caixa.');
      recommendedActions.push('Oferecer desconto para antecipação de contratos ou pacotes de serviços à vista para injeção rápida de liquidez.');
      recommendedActions.push('Revisar a precificação de tarefas e serviços da agência para estancar projetos deficitários.');
    }

    const accountantConsulting = {
      last_month: {
        label: `${MONTH_NAMES[prevDate.getMonth()]} / ${prevDate.getFullYear()}`,
        received: lastMonthData.received,
        spent: lastMonthData.spent,
        result: lastMonthData.result,
      },
      current_month: {
        label: `${MONTH_NAMES[now.getMonth()]} / ${curYear}`,
        received: curMonthData.received,
        spent: curMonthData.spent,
        result: curMonthData.result,
        pending_receive: curMonthData.pending_receive,
        pending_pay: curMonthData.pending_pay,
        projected_result: (curMonthData.received + curMonthData.pending_receive) - (curMonthData.spent + curMonthData.pending_pay),
      },
      next_month: {
        label: `${MONTH_NAMES[nextDate.getMonth()]} / ${nextDate.getFullYear()}`,
        projected_revenue: projectedNextRevenue,
        projected_expenses: projectedNextExpenses,
        projected_result: projectedNextResult,
      },
      annual_averages: {
        monthly_revenue: avgMonthlyRevenue,
        monthly_expenses: avgMonthlyExpenses,
        monthly_profit: avgMonthlyProfit,
        margin_percent: avgMarginPercent,
      },
      health_status: healthStatus,
      health_title: healthTitle,
      summary_text: summaryText,
      recommended_actions: recommendedActions,
    };

    return NextResponse.json({
      year,
      monthly: monthlyData.results || [],
      by_category: categorySpending.results || [],
      by_client: clientBilling.results || [],
      by_partner: partnerData.results || [],
      accountant_consulting: accountantConsulting,
    });
  } catch (err: any) {
    console.error('[Reports Error]:', err);
    return NextResponse.json({ error: 'Erro ao gerar relatórios.' }, { status: 500 });
  }
}
