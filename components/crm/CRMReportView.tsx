'use client';

import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  List,
  Kanban,
  RotateCcw,
} from 'lucide-react';
import { CRMLead, CRMLeadStatus } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import { renderStatusBadge } from './CRMIcons';

interface CRMReportViewProps {
  filteredLeads: CRMLead[];
  onSelectLead: (lead: CRMLead) => void;
  onViewModeChange: (mode: 'kanban' | 'list') => void;
  isAnyFilterActive: boolean;
  onResetFilters: () => void;
}

export function CRMReportView({
  filteredLeads,
  onSelectLead,
  onViewModeChange,
  isAnyFilterActive,
  onResetFilters,
}: CRMReportViewProps) {
  const total = filteredLeads.length;

  const novos = filteredLeads.filter((l) => l.status === 'Novo lead');
  const emContato = filteredLeads.filter((l) => l.status === 'Em contato');
  const qualificacao = filteredLeads.filter((l) => l.status === 'Qualificação');
  const proposta = filteredLeads.filter((l) => l.status === 'Proposta enviada');
  const negociacao = filteredLeads.filter((l) => l.status === 'Em negociação');
  const ganhos = filteredLeads.filter((l) => l.status === 'Fechado — ganho');
  const perdidos = filteredLeads.filter((l) => l.status === 'Perdido');

  const ativos = [...novos, ...emContato, ...qualificacao, ...proposta, ...negociacao];
  const concluidos = ganhos.length + perdidos.length;

  const totalValor = filteredLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
  const valorGanho = ganhos.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
  const valorEmNegociacao = [...proposta, ...negociacao].reduce(
    (acc, l) => acc + (Number(l.estimated_value) || 0),
    0
  );

  const taxaFechamento = concluidos > 0 ? (ganhos.length / concluidos) * 100 : total > 0 ? (ganhos.length / total) * 100 : 0;
  const taxaPerda = concluidos > 0 ? (perdidos.length / concluidos) * 100 : 0;

  // Acompanhamento de tempo sem contato
  const atrasados = filteredLeads.filter((l) => l.follow_up_status === 'red');
  const atencao = filteredLeads.filter((l) => l.follow_up_status === 'yellow');
  const semContato = filteredLeads.filter((l) => l.follow_up_status === 'none');
  const emDia = filteredLeads.filter((l) => l.follow_up_status === 'green');

  const taxaAtraso = total > 0 ? (atrasados.length / total) * 100 : 0;

  // 7 Etapas do Novo Funil Comercial
  const stages = [
    {
      status: 'Novo lead' as CRMLeadStatus,
      label: 'Novo Lead',
      count: novos.length,
      percentage: total > 0 ? (novos.length / total) * 100 : 0,
      value: novos.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0),
      barColor: 'bg-blue-500',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      description: 'Leads recém-adicionados que aguardam primeiro contato da equipe.',
    },
    {
      status: 'Em contato' as CRMLeadStatus,
      label: 'Em Contato',
      count: emContato.length,
      percentage: total > 0 ? (emContato.length / total) * 100 : 0,
      value: emContato.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0),
      barColor: 'bg-sky-500',
      badgeBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      description: 'Primeiras conversas iniciadas via WhatsApp, ligação ou rede social.',
    },
    {
      status: 'Qualificação' as CRMLeadStatus,
      label: 'Qualificação',
      count: qualificacao.length,
      percentage: total > 0 ? (qualificacao.length / total) * 100 : 0,
      value: qualificacao.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0),
      barColor: 'bg-purple-500',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      description: 'Mapeando orçamento, necessidades e maturidade do cliente para o projeto.',
    },
    {
      status: 'Proposta enviada' as CRMLeadStatus,
      label: 'Proposta Enviada',
      count: proposta.length,
      percentage: total > 0 ? (proposta.length / total) * 100 : 0,
      value: proposta.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0),
      barColor: 'bg-amber-500',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      description: 'Orçamento formal e proposta comercial apresentados ao prospecto.',
    },
    {
      status: 'Em negociação' as CRMLeadStatus,
      label: 'Em Negociação',
      count: negociacao.length,
      percentage: total > 0 ? (negociacao.length / total) * 100 : 0,
      value: negociacao.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0),
      barColor: 'bg-orange-500',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      description: 'Alinhando condições de pagamento, escopo final e minuta de contrato.',
    },
    {
      status: 'Fechado — ganho' as CRMLeadStatus,
      label: 'Fechado — Ganho',
      count: ganhos.length,
      percentage: total > 0 ? (ganhos.length / total) * 100 : 0,
      value: valorGanho,
      barColor: 'bg-emerald-500',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      description: 'Negócios fechados com sucesso e contratos assinados.',
    },
    {
      status: 'Perdido' as CRMLeadStatus,
      label: 'Perdido',
      count: perdidos.length,
      percentage: total > 0 ? (perdidos.length / total) * 100 : 0,
      value: perdidos.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0),
      barColor: 'bg-rose-500',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      description: 'Oportunidades encerradas sem fechamento por preço, timing ou desistência.',
    },
  ];

  // Diagnóstico Inteligente de Situação
  let situationState: 'excelente' | 'bom' | 'atencao' | 'critico' | 'neutro' = 'neutro';
  let situationBadge = '';
  let situationTitle = '';
  let situationDescription = '';
  let situationTip = '';

  if (total === 0) {
    situationState = 'neutro';
    situationBadge = 'Nenhum Lead no Filtro';
    situationTitle = 'Sem contatos para os critérios selecionados';
    situationDescription =
      'Não há leads cadastrados que correspondam aos filtros ativos. Ajuste ou limpe os filtros para visualizar a análise completa.';
    situationTip = 'Dica: Remova filtros de cidade, data ou status para ver o funil completo.';
  } else if (
    (ganhos.length > 0 && ganhos.length >= perdidos.length && atrasados.length <= 1) ||
    (taxaFechamento >= 45 && ganhos.length >= 1)
  ) {
    situationState = 'excelente';
    situationBadge = '🟢 Desempenho Excelente: Conversão em Alta';
    situationTitle = 'Operação comercial com alto índice de sucesso!';
    situationDescription = `O funil está operando com ótimo rendimento! Conquistamos ${ganhos.length} fechamento(s) ganho(s)${
      valorGanho > 0 ? ` totalizando R$ ${valorGanho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em valor ganho` : ''
    }, com taxa de fechamento de ${taxaFechamento.toFixed(0)}%. O acompanhamento da equipe está em dia, com apenas ${atrasados.length} lead(s) sem contato há mais de 5 dias úteis.`;
    situationTip = `Mantenha a agilidade: temos ${proposta.length + negociacao.length} lead(s) entre proposta e negociação prontos para fechar.`;
  } else if (
    (ganhos.length >= perdidos.length && ativos.length >= total * 0.4) ||
    (ganhos.length > 0 && perdidos.length === 0)
  ) {
    situationState = 'bom';
    situationBadge = '🟢 Situação Saudável: Pipeline Aquecido';
    situationTitle = 'Estamos indo bem! Oportunidades em fluxo contínuo';
    situationDescription = `A saúde do funil está positiva. Temos ${ativos.length} oportunidades ativas (${novos.length} novos leads, ${emContato.length} em contato, ${proposta.length} propostas enviadas e ${negociacao.length} em negociação). As conversões estão consistentes e o funil possui volume adequado para novas receitas.`;
    situationTip = `Foque no follow-up dos ${proposta.length} prospectos com "Proposta enviada" para acelerar o avanço para "Em negociação".`;
  } else if (
    atrasados.length >= 2 ||
    (proposta.length > 0 && ganhos.length === 0 && atrasados.length > 0)
  ) {
    situationState = 'atencao';
    situationBadge = '🟡 Ponto de Atenção: Leads Sem Contato Recente';
    situationTitle = 'Atenção necessária: Oportunidades com risco de esfriar';
    situationDescription = `Identificamos que ${atrasados.length} lead(s) (${taxaAtraso.toFixed(0)}% do funil) estão há 5 ou mais dias úteis sem contato registrado pela equipe. Quando o tempo sem contato aumenta, a chance de fechamento cai drasticamente.`;
    situationTip = `Ação recomendada: Utilize o filtro de follow-up "🔴 Atrasado" e acione a ação rápida "Registrar contato" ou WhatsApp para reaquecer esses contatos hoje mesmo.`;
  } else if (perdidos.length > ganhos.length * 1.5 && concluidos >= 2) {
    situationState = 'critico';
    situationBadge = '🔴 Situação Crítica: Alto Volume de Perdas';
    situationTitle = 'Estamos indo mal no momento: Perdas superando ganhos';
    situationDescription = `O número de oportunidades perdidas (${perdidos.length} leads) está significativamente superior aos ganhos (${ganhos.length} fechamentos). Isso indica possíveis desalinhamentos na etapa de proposta, objeções de preço ou demora excessiva no primeiro contato.`;
    situationTip = `Plano de ação: Investigue as observações registradas nas perdas para contornar objeções recorrentes e revise a etapa de Qualificação antes de emitir propostas.`;
  } else {
    situationState = 'neutro';
    situationBadge = '🔵 Funil em Formação';
    situationTitle = 'Leads em fase inicial de prospecção e qualificação';
    situationDescription = `Temos ${total} lead(s) cadastrados no funil comercial. À medida que a equipe registrar contatos e movimentações pelas etapas, o diagnóstico fornecerá projeções e métricas aprofundadas.`;
    situationTip = `Dica: Registre cada ligação, mensagem de WhatsApp e reunião com o botão "Registrar contato" no card de cada lead.`;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. TEXTO DE SITUAÇÃO DO CRM (Lógica de como andam os contatos) */}
      <div
        className={cn(
          'p-5 sm:p-6 rounded-3xl border transition-all shadow-sm space-y-3.5',
          situationState === 'excelente' &&
            'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-100',
          situationState === 'bom' &&
            'bg-teal-50/70 dark:bg-teal-950/30 border-teal-300 dark:border-teal-800/70 text-teal-950 dark:text-teal-100',
          situationState === 'atencao' &&
            'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/70 text-amber-950 dark:text-amber-100',
          situationState === 'critico' &&
            'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/70 text-rose-950 dark:text-rose-100',
          situationState === 'neutro' &&
            'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800/70 text-blue-950 dark:text-blue-100'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-2xs flex items-center gap-1.5',
                situationState === 'excelente' && 'bg-emerald-600 text-white dark:bg-emerald-500',
                situationState === 'bom' && 'bg-teal-600 text-white dark:bg-teal-500',
                situationState === 'atencao' && 'bg-amber-600 text-white dark:bg-amber-500',
                situationState === 'critico' && 'bg-rose-600 text-white dark:bg-rose-500',
                situationState === 'neutro' && 'bg-blue-600 text-white dark:bg-blue-500'
              )}
            >
              <Activity size={13} className="animate-pulse" />
              <span>{situationBadge}</span>
            </span>
            <span className="text-xs font-semibold opacity-75 hidden sm:inline">
              Diagnóstico Automatizado do Funil
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="px-2.5 py-1 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-black/5 dark:border-white/10 shadow-2xs">
              Taxa de Fechamento: <strong>{taxaFechamento.toFixed(1)}%</strong>
            </span>
            <span className="px-2.5 py-1 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-black/5 dark:border-white/10 shadow-2xs">
              Atrasados (5+ dias): <strong>{atrasados.length}</strong>
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base sm:text-lg font-bold">{situationTitle}</h2>
          <p className="text-xs sm:text-sm leading-relaxed opacity-90">{situationDescription}</p>
        </div>

        {situationTip && (
          <div className="p-3 bg-white/70 dark:bg-gray-800/70 border border-black/5 dark:border-white/10 rounded-xl text-xs flex items-start gap-2.5 shadow-2xs">
            <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Estratégia Recomendada: </span>
              <span className="opacity-90">{situationTip}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. CARDS DE RESUMO DO FUNIL COMERCIAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Novos Leads */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Novos Leads
            </span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
              <Sparkles size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {novos.length}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
              {total > 0 ? `${((novos.length / total) * 100).toFixed(0)}% do funil` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
            Leads recém-adicionados que aguardam primeiro contato.
          </p>
        </div>

        {/* Card 2: Propostas & Negociações */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Propostas & Negociações
            </span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs">
              <Activity size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {proposta.length + negociacao.length}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
              R$ {valorEmNegociacao.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
            {proposta.length} propostas enviadas e {negociacao.length} em negociação.
          </p>
        </div>

        {/* Card 3: Fechado — Ganho */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Fechado — Ganho
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {ganhos.length}
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
              {taxaFechamento.toFixed(1)}% taxa
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
            {valorGanho > 0
              ? `R$ ${valorGanho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em receita`
              : 'Negócios fechados com sucesso.'}
          </p>
        </div>

        {/* Card 4: Perdidos & Acompanhamento */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Perdidos / Atrasados
            </span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs">
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {perdidos.length}
            </span>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
              {atrasados.length} atrasados
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
            {atrasados.length > 0
              ? `${atrasados.length} lead(s) sem contato há mais de 5 dias úteis.`
              : 'Nenhum lead com contato atrasado.'}
          </p>
        </div>
      </div>

      {/* 3. DISTRIBUIÇÃO PELAS 7 ETAPAS DO NOVO FUNIL (Requisito 1 & 6) */}
      <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600 dark:text-blue-400" />
              <span>Etapas do Novo Funil Comercial</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total de {total} leads analisados nos filtros aplicados
            </p>
          </div>

          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-750 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
            Valor Total do Pipeline:{' '}
            <strong className="text-gray-900 dark:text-white">
              R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        <div className="space-y-3.5">
          {stages.map((stage) => (
            <div
              key={stage.status}
              className="p-3.5 bg-gray-50/70 dark:bg-gray-750/50 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-2 transition-all hover:border-gray-300 dark:hover:border-gray-600"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={cn('px-2.5 py-0.5 rounded-md text-[11px] font-bold border', stage.badgeBg)}>
                    {stage.label}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 text-[11px] hidden sm:inline">
                    — {stage.description}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-semibold">
                  <span className="text-gray-900 dark:text-white text-sm">
                    {stage.count} {stage.count === 1 ? 'lead' : 'leads'}
                  </span>
                  <span className="text-gray-400 font-mono text-xs">
                    ({stage.percentage.toFixed(1)}%)
                  </span>
                  {stage.value > 0 && (
                    <span className="text-emerald-700 dark:text-emerald-400 text-xs">
                      R$ {stage.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              {/* Barra de Progresso Visual */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', stage.barColor)}
                  style={{ width: `${Math.min(100, Math.max(stage.count > 0 ? 3 : 0, stage.percentage))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. TABELA DE LEADS ANALISADOS */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 border-b border-gray-150 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Leads Analisados ({filteredLeads.length})
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Clique em um lead para visualizar a timeline cronológica e histórico de contatos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewModeChange('list')}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-all flex items-center gap-1"
            >
              <List size={14} /> Abrir na Lista
            </button>
            <button
              onClick={() => onViewModeChange('kanban')}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all flex items-center gap-1"
            >
              <Kanban size={14} /> Abrir no Kanban
            </button>
          </div>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-gray-500 text-xs font-medium">Nenhum lead encontrado com os filtros aplicados.</p>
            {isAnyFilterActive && (
              <button
                onClick={onResetFilters}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/70 dark:bg-gray-750 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-150 dark:border-gray-700">
                  <th className="py-3 px-4">Follow-up</th>
                  <th className="py-3 px-4">Contato / Empresa</th>
                  <th className="py-3 px-4">Cidade</th>
                  <th className="py-3 px-4">Área de Atuação</th>
                  <th className="py-3 px-4">Etapa do Funil</th>
                  <th className="py-3 px-4 text-right">Valor Estimado</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-800 dark:text-gray-200">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition-colors cursor-pointer"
                    onClick={() => onSelectLead(lead)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full inline-block',
                            lead.follow_up_status === 'green' && 'bg-emerald-500',
                            lead.follow_up_status === 'yellow' && 'bg-amber-500',
                            lead.follow_up_status === 'red' && 'bg-rose-500 animate-pulse',
                            (!lead.follow_up_status || lead.follow_up_status === 'none') && 'bg-slate-400',
                            lead.follow_up_status === 'closed' && 'bg-gray-400'
                          )}
                        />
                        <span className="text-[11px] text-gray-500">
                          {lead.follow_up_status === 'green'
                            ? 'Em dia'
                            : lead.follow_up_status === 'yellow'
                            ? 'Atenção'
                            : lead.follow_up_status === 'red'
                            ? 'Atrasado'
                            : lead.follow_up_status === 'closed'
                            ? 'Encerrado'
                            : 'Sem contato'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 dark:text-white">{lead.contact_name}</div>
                      {lead.company && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">{lead.company}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {lead.city || '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {lead.segment || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {renderStatusBadge(lead.status)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {lead.estimated_value && Number(lead.estimated_value) > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          R$ {Number(lead.estimated_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLead(lead);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-all"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
