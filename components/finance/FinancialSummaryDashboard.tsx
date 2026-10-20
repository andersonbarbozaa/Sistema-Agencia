'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

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

  // Accordion states for Overdue alert cards
  const [showOverdueReceiveList, setShowOverdueReceiveList] = useState(false);
  const [showOverduePayList, setShowOverduePayList] = useState(false);

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

  return (
    <div className={cn('space-y-4', className)}>
      {/* ======================================================== */}
      {/* FILTRO DE PERÍODO SUPERIOR                                */}
      {/* ======================================================== */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Período de Análise
            </span>
            <div className="flex items-center gap-1 font-bold text-gray-900 text-sm">
              <span>{currentMonthName}</span>
              <span className="text-gray-400 font-normal">/</span>
              <span>{selectedYear}</span>
            </div>
          </div>
        </div>

        {/* Navigation < > and Dropdown */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 shadow-xs cursor-pointer"
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
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 shadow-xs cursor-pointer"
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
            className="p-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* LINHA 1 (3 CARDS)                                        */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: CONTAS A RECEBER */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Contas a Receber
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

            <div className="mb-3">
              <span className="text-[11px] text-gray-400 font-medium">Receita do mês</span>
              <p className="text-2xl font-black text-gray-900 leading-tight">
                {formatCurrency(summary?.receita_do_mes || 0)}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-500 font-medium">Pendente:</span>
              <span className="font-bold text-blue-600">
                {formatCurrency(summary?.pendente_receber_mes || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-500 font-medium">Vencido:</span>
              <span className="font-bold text-rose-600">
                {formatCurrency(summary?.vencido_receber_mes || 0)}
              </span>
            </div>
          </div>

          <div>
            <hr className="my-3 border-gray-100" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Recebido em {currentMonthName}:</span>
              <span className="font-black text-emerald-600 text-sm">
                {formatCurrency(summary?.recebido_no_mes || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: CONTAS A PAGAR */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Contas a Pagar
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

            <div className="mb-3">
              <span className="text-[11px] text-gray-400 font-medium">Pago em {currentMonthName}</span>
              <p className="text-2xl font-black text-emerald-600 leading-tight">
                {formatCurrency(summary?.pago_no_mes || 0)}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-500 font-medium">Pendente:</span>
              <span className="font-bold text-blue-600">
                {formatCurrency(summary?.pendente_pagar_mes || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-500 font-medium">Vencido:</span>
              <span className="font-bold text-rose-600">
                {formatCurrency(summary?.vencido_pagar_mes || 0)}
              </span>
            </div>
          </div>

          <div>
            <hr className="my-3 border-gray-100" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Total de despesas:</span>
              <span className="font-black text-gray-900 text-sm">
                {formatCurrency(summary?.total_despesas_mes || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: LUCRO DO PERÍODO */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Lucro do Período
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

            <div className="mb-3">
              <span className="text-[11px] text-gray-400 font-medium">Receitas do mês</span>
              <p className="text-2xl font-black text-emerald-600 leading-tight">
                {formatCurrency(summary?.receita_do_mes || summary?.recebido_no_mes || 0)}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-500 font-medium">Despesas do mês:</span>
              <span className="font-bold text-rose-600">
                - {formatCurrency(summary?.total_despesas_mes || summary?.pago_no_mes || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-gray-500 font-medium">Margem Operacional:</span>
              <span className="font-semibold text-gray-700">
                {summary?.receita_do_mes > 0
                  ? `${Math.round(((summary?.lucro_liquido_mes || 0) / summary.receita_do_mes) * 100)}%`
                  : '0%'}
              </span>
            </div>
          </div>

          <div>
            <hr className="my-3 border-gray-100" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Lucro líquido em {currentMonthName}:</span>
              <span
                className={cn(
                  'font-black text-sm',
                  (summary?.lucro_liquido_mes || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {formatCurrency(summary?.lucro_liquido_mes || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* LINHA 2 (2 CARDS DE ALERTA COM DROPDOWN)                 */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ALERTA 1: RECEBIMENTOS VENCIDOS */}
        <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4 shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-gray-900">Recebimentos Vencidos</h4>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                    {summary?.overdue_receive_count || 0}
                  </span>
                </div>
                <p className="text-xs font-semibold text-amber-800 mt-0.5">
                  Total:{' '}
                  <span className="font-black text-rose-600">
                    {formatCurrency(summary?.overdue_receive_total || 0)}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowOverdueReceiveList(!showOverdueReceiveList)}
              className="p-1.5 rounded-xl hover:bg-amber-100/80 text-amber-800 transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <span>{showOverdueReceiveList ? 'Ocultar' : 'Ver lista'}</span>
              {showOverdueReceiveList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Expandable Overdue List */}
          {showOverdueReceiveList && (
            <div className="mt-3 pt-3 border-t border-amber-200/60 space-y-2 animate-in fade-in duration-200">
              {summary?.overdue_receive_items && summary.overdue_receive_items.length > 0 ? (
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {summary.overdue_receive_items.map((item: any) => (
                    <div
                      key={item.id}
                      className="bg-white/90 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 truncate">{item.description}</p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {item.client_name ? `Cliente: ${item.client_name}` : 'Sem cliente'} • Venceu em:{' '}
                          <span className="font-semibold text-rose-600">{formatDate(item.due_date)}</span>
                        </p>
                      </div>
                      <span className="font-black text-rose-600 shrink-0 text-xs">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic py-2 text-center">
                  Nenhum recebimento vencido.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ALERTA 2: PAGAMENTOS VENCIDOS */}
        <div className="bg-rose-50/40 border border-rose-200/80 rounded-2xl p-4 shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-gray-900">Pagamentos Vencidos</h4>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                    {summary?.overdue_pay_count || 0}
                  </span>
                </div>
                <p className="text-xs font-semibold text-rose-800 mt-0.5">
                  Total:{' '}
                  <span className="font-black text-rose-600">
                    {formatCurrency(summary?.overdue_pay_total || 0)}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowOverduePayList(!showOverduePayList)}
              className="p-1.5 rounded-xl hover:bg-rose-100/80 text-rose-800 transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <span>{showOverduePayList ? 'Ocultar' : 'Ver lista'}</span>
              {showOverduePayList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Expandable Overdue List */}
          {showOverduePayList && (
            <div className="mt-3 pt-3 border-t border-rose-200/60 space-y-2 animate-in fade-in duration-200">
              {summary?.overdue_pay_items && summary.overdue_pay_items.length > 0 ? (
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {summary.overdue_pay_items.map((item: any) => (
                    <div
                      key={item.id}
                      className="bg-white/90 border border-rose-200 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 truncate">{item.description}</p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {item.client_name ? `Fornecedor/Favorecido: ${item.client_name}` : 'Sem favorecido'} • Venceu em:{' '}
                          <span className="font-semibold text-rose-600">{formatDate(item.due_date)}</span>
                        </p>
                      </div>
                      <span className="font-black text-rose-600 shrink-0 text-xs">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic py-2 text-center">
                  Nenhum pagamento vencido.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
