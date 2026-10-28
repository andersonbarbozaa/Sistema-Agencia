'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  Server,
  Database,
  Users,
  CreditCard,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Copy,
  Check,
  Crown,
  HardDrive,
  BarChart3,
  Layers,
  Zap,
} from 'lucide-react';
import { User } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';

interface MasterAdminViewProps {
  user: User;
}

interface OverviewData {
  success: boolean;
  masterEmail: string;
  stats: {
    totalUsers: number;
    totalWorkspaces: number;
    activePaidCount: number;
    activeTrialCount: number;
    expiredOrPastDueCount: number;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    avatar_url?: string;
    phone?: string;
    job_title?: string;
    created_at: string;
    days_in_system: number;
    formatted_age: string;
    is_master: boolean;
    workspace: {
      id: string;
      name: string;
      plan_type: string;
      subscription_status: string;
      trial_ends_at?: string;
      created_at: string;
    };
    finance: {
      status: 'Vitalício' | 'Pago' | 'Trial Ativo' | 'Trial Expirado' | 'Inadimplente' | 'Atrasado';
      badge_color: 'emerald' | 'blue' | 'rose' | 'amber' | 'purple';
      trial_days_remaining: number | null;
      mercadopago_payment_id: string | null;
      last_payment_amount: number | null;
      last_payment_date: string | null;
    };
  }>;
  cloudflareHealth: {
    overallStatus: 'healthy' | 'warning' | 'critical';
    healthScore: number;
    statusLabel: 'Saudável' | 'Alerta' | 'Crítico';
    isLiveApi: boolean;
    accountId: string;
    d1: {
      databaseId: string;
      databaseName: string;
      queries: any;
      rowsRead: any;
      rowsWritten: any;
      storage: any;
      totalTables: number;
      totalRowsRecorded: number;
      status: 'healthy' | 'warning' | 'critical';
    };
    pages: {
      projectName: string;
      requests: any;
      status: 'healthy' | 'warning' | 'critical';
    };
    lastChecked: string;
    notes: string;
  };
}

export default function MasterAdminView({ user }: MasterAdminViewProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros de Tabela
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const res = await fetch('/api/admin-master/overview');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setError(errorData.error || 'Acesso negado: Rota restrita exclusivamente ao titular do sistema.');
          return;
        }
        throw new Error(errorData.error || 'Falha ao carregar dados do painel Master Admin');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCopyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtragem de Usuários
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    return data.users.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.workspace.name.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'pago') return item.finance.status === 'Pago' || item.finance.status === 'Vitalício';
      if (statusFilter === 'trial') return item.finance.status === 'Trial Ativo';
      if (statusFilter === 'expirado') return item.finance.status === 'Trial Expirado';
      if (statusFilter === 'inadimplente') return item.finance.status === 'Inadimplente';
      if (statusFilter === 'atrasado') return item.finance.status === 'Atrasado';

      return true;
    });
  }, [data?.users, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-600">Autenticando titular Master e carregando telemetria...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 mt-12 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-rose-600 shrink-0" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-rose-950">Aviso do Painel Master Admin</h3>
            <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
          </div>
        </div>
        <div className="pt-2 border-t border-rose-200/60 flex items-center justify-end">
          <button
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 active:scale-95"
          >
            <RefreshCw size={13} />
            <span>Tentar Novamente</span>
          </button>
        </div>
      </div>
    );
  }

  const cf = data?.cloudflareHealth;

  const getStatusBadge = (status: 'healthy' | 'warning' | 'critical') => {
    if (status === 'healthy') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Saudável (Verde)
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Alerta (Amarelo)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        Crítico (Vermelho)
      </span>
    );
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-rose-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto select-none">
      {/* Top Header do Painel Master Admin */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Crown size={14} className="text-amber-400" />
                Backoffice Master Exclusivo
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-400" />
                Acesso Vitalício sem Assinatura
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              Painel Master Admin
              <ShieldCheck className="text-blue-400 w-7 h-7" />
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Controle central restrito ao titular do sistema (<strong>{user.email}</strong>). Gestão unificada de clientes, assinaturas do Mercado Pago e monitoramento de infraestrutura Cloudflare.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold transition-all border border-white/15 flex items-center gap-2 shadow-sm"
              title="Atualizar dados em tempo real"
            >
              <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
              <span>{refreshing ? 'Atualizando...' : 'Atualizar Dados'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Total de Usuários</span>
            <Users size={18} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{data?.stats.totalUsers || 0}</div>
          <span className="text-[11px] text-gray-400 mt-1">Registros no sistema</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Workspaces</span>
            <Layers size={18} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{data?.stats.totalWorkspaces || 0}</div>
          <span className="text-[11px] text-gray-400 mt-1">Agências e estúdios</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Assinaturas Ativas</span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{data?.stats.activePaidCount || 0}</div>
          <span className="text-[11px] text-emerald-700 font-medium mt-1">Mercado Pago / Vitalício</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Em Teste (Trial)</span>
            <Clock size={18} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600">{data?.stats.activeTrialCount || 0}</div>
          <span className="text-[11px] text-blue-700 font-medium mt-1">Período de 30 dias</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold">Vencidos / Inadimplentes</span>
            <AlertTriangle size={18} className="text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{data?.stats.expiredOrPastDueCount || 0}</div>
          <span className="text-[11px] text-rose-700 font-medium mt-1">Acesso sob Paywall</span>
        </div>
      </div>

      {/* SEÇÃO 1: MONITORAMENTO DE SAÚDE DA INFRAESTRUTURA (CLOUDFLARE) */}
      <section className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Server size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  Saúde da Infraestrutura (Cloudflare D1 & Pages)
                </h2>
                <p className="text-xs text-gray-500">
                  Consumo em tempo real comparado matematicamente com os limites do <strong>Plano Free da Cloudflare</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200/80 px-3.5 py-2 rounded-2xl">
              <span className="text-xs font-bold text-gray-700">Índice Geral:</span>
              {cf && getStatusBadge(cf.overallStatus)}
              <span className="text-xs font-black text-gray-900 bg-white border border-gray-200 px-2 py-0.5 rounded-lg shadow-2xs">
                {cf?.healthScore || 100}%
              </span>
            </div>
          </div>
        </div>

        {/* Banner de Status e Informações da API Cloudflare */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Zap size={16} className={cn(cf?.isLiveApi ? 'text-emerald-600' : 'text-blue-600')} />
            <span className="text-gray-700">
              <strong>Database D1 ID:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-900 font-mono text-[11px]">{cf?.d1.databaseId}</code>
              <span className="mx-2">•</span>
              <strong>Projeto Pages:</strong> <span className="font-semibold text-gray-900">{cf?.pages.projectName}</span>
            </span>
          </div>
          <div className="text-gray-500 italic">
            {cf?.notes}
          </div>
        </div>

        {/* Grid de Cards de Consumo vs Limites do Plano Free */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: D1 Queries / Dia */}
          <div className="p-5 bg-gray-50/70 border border-gray-200 rounded-2xl space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Database size={15} className="text-blue-600" />
                  D1 • Requisições / Queries
                </span>
                {cf && getStatusBadge(cf.d1.queries.status)}
              </div>
              <p className="text-[11px] text-gray-500">Limite Free: 100 mil requisições/dia</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-900 font-bold">{cf?.d1.queries.formattedCurrent} req</span>
                <span className="text-gray-500">de {cf?.d1.queries.formattedLimit} ({cf?.d1.queries.percentage}%)</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn('h-full transition-all duration-500 rounded-full', getProgressColor(cf?.d1.queries.percentage || 0))}
                  style={{ width: `${Math.max(2, cf?.d1.queries.percentage || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: D1 Linhas Lidas / Dia */}
          <div className="p-5 bg-gray-50/70 border border-gray-200 rounded-2xl space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <BarChart3 size={15} className="text-indigo-600" />
                  D1 • Linhas Lidas (Rows Read)
                </span>
                {cf && getStatusBadge(cf.d1.rowsRead.status)}
              </div>
              <p className="text-[11px] text-gray-500">Limite Free: 5 milhões de linhas/dia</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-900 font-bold">{cf?.d1.rowsRead.formattedCurrent} linhas</span>
                <span className="text-gray-500">de {cf?.d1.rowsRead.formattedLimit} ({cf?.d1.rowsRead.percentage}%)</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn('h-full transition-all duration-500 rounded-full', getProgressColor(cf?.d1.rowsRead.percentage || 0))}
                  style={{ width: `${Math.max(2, cf?.d1.rowsRead.percentage || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: D1 Linhas Gravadas / Dia */}
          <div className="p-5 bg-gray-50/70 border border-gray-200 rounded-2xl space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <HardDrive size={15} className="text-emerald-600" />
                  D1 • Linhas Gravadas (Writes)
                </span>
                {cf && getStatusBadge(cf.d1.rowsWritten.status)}
              </div>
              <p className="text-[11px] text-gray-500">Limite Free: 100 mil gravações/dia</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-900 font-bold">{cf?.d1.rowsWritten.formattedCurrent} linhas</span>
                <span className="text-gray-500">de {cf?.d1.rowsWritten.formattedLimit} ({cf?.d1.rowsWritten.percentage}%)</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn('h-full transition-all duration-500 rounded-full', getProgressColor(cf?.d1.rowsWritten.percentage || 0))}
                  style={{ width: `${Math.max(2, cf?.d1.rowsWritten.percentage || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 4: D1 Armazenamento Total */}
          <div className="p-5 bg-gray-50/70 border border-gray-200 rounded-2xl space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Database size={15} className="text-amber-600" />
                  D1 • Espaço em Disco
                </span>
                {cf && getStatusBadge(cf.d1.storage.status)}
              </div>
              <p className="text-[11px] text-gray-500">Limite Free: 500 MB por banco de dados</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-900 font-bold">{cf?.d1.storage.formattedCurrent} MB</span>
                <span className="text-gray-500">de {cf?.d1.storage.formattedLimit} MB ({cf?.d1.storage.percentage}%)</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn('h-full transition-all duration-500 rounded-full', getProgressColor(cf?.d1.storage.percentage || 0))}
                  style={{ width: `${Math.max(2, cf?.d1.storage.percentage || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 5: Pages / Workers Invocations */}
          <div className="p-5 bg-gray-50/70 border border-gray-200 rounded-2xl space-y-3 flex flex-col justify-between md:col-span-2 lg:col-span-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Server size={15} className="text-purple-600" />
                  Cloudflare Pages • Requisições Web
                </span>
                {cf && getStatusBadge(cf.pages.requests.status)}
              </div>
              <p className="text-[11px] text-gray-500">Limite Free: 100 mil requisições/dia (Invocations)</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-900 font-bold">{cf?.pages.requests.formattedCurrent} requisições</span>
                <span className="text-gray-500">de {cf?.pages.requests.formattedLimit} ({cf?.pages.requests.percentage}%)</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn('h-full transition-all duration-500 rounded-full', getProgressColor(cf?.pages.requests.percentage || 0))}
                  style={{ width: `${Math.max(2, cf?.pages.requests.percentage || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: DASHBOARD DE CLIENTES, WORKSPACES E STATUS MERCADO PAGO */}
      <section className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-7 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <CreditCard size={20} className="text-blue-600" />
              Gestão de Clientes e Assinaturas (Mercado Pago)
            </h2>
            <p className="text-xs text-gray-500">
              Cruzamento de dados cadastrais, tempo de permanência no sistema e situação financeira em tempo real.
            </p>
          </div>

          {/* Barra de Busca e Filtro */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou estúdio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os Status</option>
              <option value="pago">Pago / Vitalício</option>
              <option value="trial">Trial Ativo</option>
              <option value="expirado">Trial Expirado</option>
              <option value="atrasado">Atrasado</option>
              <option value="inadimplente">Inadimplente</option>
            </select>
          </div>
        </div>

        {/* Tabela de Clientes e Pagamentos */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Workspace / Estúdio</th>
                <th className="py-3 px-4">Data de Cadastro</th>
                <th className="py-3 px-4">Tempo no Sistema</th>
                <th className="py-3 px-4">Status Financeiro (MP)</th>
                <th className="py-3 px-4">Último Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Nenhum usuário ou workspace encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((item) => {
                  const isMasterUser = item.is_master;

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'hover:bg-gray-50/80 transition-colors',
                        isMasterUser && 'bg-amber-50/40 font-medium'
                      )}
                    >
                      {/* Usuário */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ring-2',
                            isMasterUser
                              ? 'bg-amber-600 text-white ring-amber-400/40'
                              : 'bg-blue-600 text-white ring-blue-500/20'
                          )}>
                            {isMasterUser ? <Crown size={14} /> : item.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 truncate">{item.name}</span>
                              {isMasterUser && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-extrabold uppercase tracking-wider">
                                  Master
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 text-[11px] truncate">
                              <span>{item.email}</span>
                              <button
                                onClick={() => handleCopyEmail(item.email, item.id)}
                                className="text-gray-400 hover:text-gray-700"
                                title="Copiar e-mail"
                              >
                                {copiedId === item.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Workspace */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-gray-900 block truncate">{item.workspace.name}</span>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                            {item.workspace.plan_type}
                          </span>
                        </div>
                      </td>

                      {/* Data de Cadastro */}
                      <td className="py-3 px-4 text-gray-600">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-'}
                      </td>

                      {/* Tempo no Sistema */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-gray-700 font-semibold bg-gray-100 px-2 py-0.5 rounded-lg text-[11px]">
                          <Clock size={11} className="text-gray-400" />
                          {item.formatted_age}
                        </span>
                      </td>

                      {/* Status Financeiro Mercado Pago */}
                      <td className="py-3 px-4">
                        {item.finance.status === 'Vitalício' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">
                            <Sparkles size={12} className="text-purple-600" />
                            Vitalício (Master)
                          </span>
                        )}

                        {item.finance.status === 'Pago' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            Pago (Ativo)
                          </span>
                        )}

                        {item.finance.status === 'Trial Ativo' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <Clock size={12} className="text-blue-600" />
                            Trial Ativo ({item.finance.trial_days_remaining}d)
                          </span>
                        )}

                        {item.finance.status === 'Trial Expirado' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle size={12} className="text-rose-600" />
                            Trial Expirado
                          </span>
                        )}

                        {item.finance.status === 'Atrasado' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle size={12} className="text-amber-600" />
                            Atrasado
                          </span>
                        )}

                        {item.finance.status === 'Inadimplente' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle size={12} className="text-rose-600" />
                            Inadimplente
                          </span>
                        )}
                      </td>

                      {/* Último Pagamento */}
                      <td className="py-3 px-4 text-gray-600 text-[11px]">
                        {isMasterUser ? (
                          <span className="text-purple-700 font-bold">Isento Vitalício</span>
                        ) : item.finance.last_payment_amount ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-gray-900 block">
                              {formatCurrency(item.finance.last_payment_amount)}
                            </span>
                            {item.finance.last_payment_date && (
                              <span className="text-gray-400 text-[10px]">
                                {new Date(item.finance.last_payment_date).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Nenhum pagamento registrado</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
