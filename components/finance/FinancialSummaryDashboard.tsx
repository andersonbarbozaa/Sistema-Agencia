'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

interface FinancialSummaryDashboardProps {
  onRefresh?: () => void;
  className?: string;
  monthlyRevenueGoal?: number;
}

export default function FinancialSummaryDashboard({ onRefresh, className, monthlyRevenueGoal = 50000 }: FinancialSummaryDashboardProps) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async (m: number, y: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/finance/summary?month=${m}&year=${y}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setSummary(json.data || null);
      }
    } catch (err) {
      console.error('Erro ao buscar resumo financeiro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const currentMonthName = MONTH_NAMES[selectedMonth - 1];

  const receivedVal = summary?.recebido_no_mes || 0;
  const toReceiveVal = summary?.pendente_receber_mes || 0;
  const totalReceitas = summary?.total_receitas_periodo || (receivedVal + toReceiveVal);

  const paidVal = summary?.pago_no_mes || 0;
  const toPayVal = summary?.pendente_pagar_mes || 0;
  const totalDespesas = summary?.total_despesas_periodo || (paidVal + toPayVal);

  const profitVal = summary?.lucro_realizado_mes ?? (receivedVal - paidVal);
  const projectedProfit = summary?.lucro_projetado_mes ?? (totalReceitas - totalDespesas);
  const marginRealized = summary?.margem_realizada ?? (receivedVal > 0 ? Math.round((profitVal / receivedVal) * 100) : 0);

  const goal = monthlyRevenueGoal || 50000;
  const pct = goal > 0 ? Math.min(100, Math.round((receivedVal / goal) * 100)) : 0;
  const remaining = Math.max(0, goal - receivedVal);

  return (
    <div className={cn('space-y-3', className)}>
      {/* ======================================================== */}
      {/* FILTRO DE PERÍODO SUPERIOR                                */}
      {/* ======================================================== */}
      <div className="bg-gray-50/80 dark:bg-gray-800/80 p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Período de Análise
            </span>
            <div className="flex items-center gap-1 font-bold text-gray-900 dark:text-gray-100 text-xs">
              <span>{currentMonthName}</span>
              <span className="text-gray-400 font-normal">/</span>
              <span>{selectedYear}</span>
            </div>
          </div>
        </div>

        {/* Navegação < > e Seletores de Mês / Ano */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            title="Mês anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 dark:text-gray-200 shadow-2xs cursor-pointer"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 dark:text-gray-200 shadow-2xs cursor-pointer"
          >
            {[selectedYear - 2, selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            title="Próximo mês"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4 CARDS COMPACTOS (PADRÃO MOVIMENTAÇÃO POR SÓCIO)         */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* CARD 1: TOTAL DE RECEITAS */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              Total de Receitas
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Recebido
            </span>
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
              {formatCurrency(receivedVal)}
            </p>
            <span className="text-[10px] text-gray-400 mt-0.5 block">Receitas no período</span>
          </div>
        </div>

        {/* CARD 2: TOTAL DE DESPESAS */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-xs flex flex-col justify-between hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              Total de Despesas
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              Pago
            </span>
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 leading-tight">
              {formatCurrency(paidVal)}
            </p>
            <span className="text-[10px] text-gray-400 mt-0.5 block">Despesas no período</span>
          </div>
        </div>

        {/* CARD 3: LUCRO REALIZADO */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-xs flex flex-col justify-between hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              Lucro Realizado
            </span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[9px] font-bold border',
                profitVal >= 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
              )}
            >
              {profitVal >= 0 ? 'Superávit' : 'Déficit'}
            </span>
          </div>
          <div>
            <p
              className={cn(
                'text-base sm:text-lg font-bold leading-tight',
                profitVal >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {formatCurrency(profitVal)}
            </p>
            <span className="text-[10px] text-gray-400 mt-0.5 block">Resultado líquido</span>
          </div>
        </div>

        {/* CARD 4: META DE RECEITA MENSAL */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-xs flex flex-col justify-between hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              Meta de Receita
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {pct}% atingido
            </span>
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {formatCurrency(receivedVal)}{' '}
              <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">
                / {formatCurrency(goal)}
              </span>
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(4, pct)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block truncate">
              Falta: <strong className="text-gray-700 dark:text-gray-300">{formatCurrency(remaining)}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
