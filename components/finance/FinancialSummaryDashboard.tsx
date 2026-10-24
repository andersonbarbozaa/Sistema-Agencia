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
}

export default function FinancialSummaryDashboard({ onRefresh, className }: FinancialSummaryDashboardProps) {
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

  return (
    <div className={cn('space-y-4', className)}>
      {/* ======================================================== */}
      {/* FILTRO DE PERÍODO SUPERIOR                                */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Período de Análise
            </span>
            <div className="flex items-center gap-1 font-bold text-gray-900 dark:text-gray-100 text-sm">
              <span>{currentMonthName}</span>
              <span className="text-gray-400 font-normal">/</span>
              <span>{selectedYear}</span>
            </div>
          </div>
        </div>

        {/* Navegação < > e Seletores de Mês / Ano */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 dark:text-gray-200 shadow-xs cursor-pointer"
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
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 dark:text-gray-200 shadow-xs cursor-pointer"
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
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CARDS CONSOLIDADOS (2 CARDS PRINCIPAIS + LUCRO AUDITADO) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: RECEITAS (Consolidado) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Receitas
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Recebido
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

            {/* Destaque Principal: Total Recebido (Já pago) */}
            <div className="mb-4">
              <span className="text-[11px] text-gray-400 font-medium">Total de Receitas Recebidas</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                {formatCurrency(receivedVal)}
              </p>
            </div>

            {/* Dentro do mesmo card: Total a Receber */}
            <div className="space-y-2 py-2 border-t border-gray-100 dark:border-gray-700/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  A Receber (Pendentes):
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(toReceiveVal)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <hr className="my-3 border-gray-100 dark:border-gray-700/60" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Total Previsto ({currentMonthName}):</span>
              <span className="font-black text-gray-900 dark:text-gray-100 text-sm">
                {formatCurrency(totalReceitas)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: DESPESAS (Consolidado) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-xs flex flex-col justify-between hover:border-rose-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Despesas
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  Pago
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

            {/* Destaque Principal: Total Pago */}
            <div className="mb-4">
              <span className="text-[11px] text-gray-400 font-medium">Total de Despesas Pagas</span>
              <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 leading-tight">
                {formatCurrency(paidVal)}
              </p>
            </div>

            {/* Dentro do mesmo card: Total a Pagar */}
            <div className="space-y-2 py-2 border-t border-gray-100 dark:border-gray-700/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  A Pagar (Pendentes):
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(toPayVal)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <hr className="my-3 border-gray-100 dark:border-gray-700/60" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Total Previsto ({currentMonthName}):</span>
              <span className="font-black text-gray-900 dark:text-gray-100 text-sm">
                {formatCurrency(totalDespesas)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: LUCRO POR PERÍODO (Auditado) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Lucro por Período
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                    profitVal >= 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                  )}
                >
                  {profitVal >= 0 ? 'Superávit' : 'Déficit'}
                </span>
              </div>
              <div
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center',
                  profitVal >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                )}
              >
                <DollarSign className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

            {/* Destaque Principal: Lucro Realizado (Recebido - Pago) */}
            <div className="mb-4">
              <span className="text-[11px] text-gray-400 font-medium">Lucro Realizado em {currentMonthName}</span>
              <p
                className={cn(
                  'text-2xl sm:text-3xl font-black leading-tight',
                  profitVal >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {formatCurrency(profitVal)}
              </p>
            </div>

            {/* Detalhamento do Cálculo Auditado */}
            <div className="space-y-1.5 py-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Receitas Realizadas:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  + {formatCurrency(receivedVal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Despesas Pagas:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  - {formatCurrency(paidVal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Margem Realizada:</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  {marginRealized}%
                </span>
              </div>
            </div>
          </div>

          <div>
            <hr className="my-3 border-gray-100 dark:border-gray-700/60" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Resultado Projetado:</span>
              <span
                className={cn(
                  'font-black text-sm',
                  projectedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {formatCurrency(projectedProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
