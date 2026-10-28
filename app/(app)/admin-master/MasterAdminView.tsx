'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
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
  Copy,
  Check,
  Crown,
  HardDrive,
  BarChart3,
  Layers,
  X,
  Phone,
  Mail,
  Building2,
  UserCheck,
  Gauge,
  ChevronRight,
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
  capacity?: {
    currentUsers: number;
    estimatedCapacity: number;
    capacityUsagePercent: number;
    status: 'healthy' | 'warning' | 'critical';
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
    is_partner?: boolean;
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
  workspaces?: Array<{
    id: string;
    name: string;
    description: string;
    owner_id: string;
    owner_name: string;
    owner_email: string;
    plan_type: string;
    subscription_status: string;
    trial_ends_at?: string;
    trial_days_remaining?: number | null;
    total_members: number;
    created_at: string;
  }>;
  cloudflareHealth: {
    overallStatus: 'healthy' | 'warning' | 'critical';
    healthScore: number;
    statusLabel: 'Saudável' | 'Alerta' | 'Crítico';
    isLiveApi: boolean;
    d1: {
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

  // Submenu ativo: 'users' ou 'workspaces'
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'workspaces'>('users');

  // Filtros de busca e status
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal de Detalhes do Usuário Selecionado
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

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

  // Clique em Card de KPI filtra ou troca aba
  const handleCardClick = (type: 'all' | 'workspaces' | 'pago' | 'trial' | 'expirado') => {
    if (type === 'workspaces') {
      setActiveSubTab('workspaces');
    } else {
      setActiveSubTab('users');
      setStatusFilter(type);
    }
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

  // Filtragem de Workspaces
  const filteredWorkspaces = useMemo(() => {
    if (!data?.workspaces) return [];
    return data.workspaces.filter((ws) => {
      const matchesSearch =
        ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.owner_email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [data?.workspaces, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-gray-500">Carregando painel Master...</p>
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
  const capacity = data?.capacity;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-rose-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto select-none">
      {/* Top Header Simplificado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Painel Master Admin
            </h1>
            <ShieldCheck className="text-blue-600 w-5 h-5 shrink-0" />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Acesso exclusivo do titular • <strong>{user.email}</strong>
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="self-start sm:self-auto px-3.5 py-2 bg-white hover:bg-gray-50 active:scale-95 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2"
          title="Atualizar dados"
        >
          <RefreshCw size={14} className={cn(refreshing && 'animate-spin text-blue-600')} />
          <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>

      {/* KPI Cards Interativos (Clique abre a lista do item) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Usuários */}
        <button
          onClick={() => handleCardClick('all')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs',
            activeSubTab === 'users' && statusFilter === 'all'
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20'
              : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50/50'
          )}
        >
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Total Usuários</span>
            <Users size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{data?.stats.totalUsers || 0}</div>
          <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5 mt-1">
            Ver usuários <ChevronRight size={11} />
          </span>
        </button>

        {/* Workspaces */}
        <button
          onClick={() => handleCardClick('workspaces')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs',
            activeSubTab === 'workspaces'
              ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20'
              : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-gray-50/50'
          )}
        >
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Workspaces</span>
            <Layers size={16} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{data?.stats.totalWorkspaces || 0}</div>
          <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5 mt-1">
            Ver estúdios <ChevronRight size={11} />
          </span>
        </button>

        {/* Assinaturas Ativas */}
        <button
          onClick={() => handleCardClick('pago')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs',
            activeSubTab === 'users' && statusFilter === 'pago'
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-gray-50/50'
          )}
        >
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Assinaturas Ativas</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{data?.stats.activePaidCount || 0}</div>
          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-1">
            Ver assinantes <ChevronRight size={11} />
          </span>
        </button>

        {/* Em Teste Trial */}
        <button
          onClick={() => handleCardClick('trial')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs',
            activeSubTab === 'users' && statusFilter === 'trial'
              ? 'bg-sky-50/70 border-sky-400 ring-2 ring-sky-500/20'
              : 'bg-white border-gray-200 hover:border-sky-300 hover:bg-gray-50/50'
          )}
        >
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">Em Teste (Trial)</span>
            <Clock size={16} className="text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-600">{data?.stats.activeTrialCount || 0}</div>
          <span className="text-[10px] text-sky-700 font-semibold flex items-center gap-0.5 mt-1">
            Ver em teste <ChevronRight size={11} />
          </span>
        </button>

        {/* Vencidos / Inadimplentes */}
        <button
          onClick={() => handleCardClick('expirado')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all relative overflow-hidden group shadow-2xs col-span-2 sm:col-span-1',
            activeSubTab === 'users' && statusFilter === 'expirado'
              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-500/20'
              : 'bg-white border-gray-200 hover:border-rose-300 hover:bg-gray-50/50'
          )}
        >
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Vencidos</span>
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{data?.stats.expiredOrPastDueCount || 0}</div>
          <span className="text-[10px] text-rose-700 font-semibold flex items-center gap-0.5 mt-1">
            Ver expirados <ChevronRight size={11} />
          </span>
        </button>
      </div>

      {/* SEÇÃO 1: SAÚDE DA INFRAESTRUTURA (LAYOUT SIMPLIFICADO & CAPACIDADE DE USUÁRIOS) */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server size={17} className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Saúde da Infraestrutura
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sistema Saudável
            </span>
          </div>
        </div>

        {/* Grid de Cards Simplificados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card Principal: Capacidade de Usuários */}
          <div className="p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border border-blue-200/80 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <Gauge size={14} className="text-blue-600" />
                Capacidade de Usuários
              </span>
              <span className="text-[10px] font-bold text-blue-700 bg-white/80 px-2 py-0.5 rounded-md border border-blue-200">
                Plano Free
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-blue-950">
                  {capacity?.currentUsers || data?.stats.totalUsers || 0}
                  <span className="text-xs font-semibold text-blue-700"> / {capacity?.estimatedCapacity?.toLocaleString('pt-BR') || '3.500'}</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700">
                  {capacity?.capacityUsagePercent || 0.2}% em uso
                </span>
              </div>
              <div className="w-full h-2 bg-blue-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, capacity?.capacityUsagePercent || 1)}%` }}
                />
              </div>
            </div>
            <p className="text-[10px] text-blue-800/80 leading-tight">
              Suporta até <strong>~3.500 usuários ativos/dia</strong> no plano Free com escalabilidade serverless ilimitada.
            </p>
          </div>

          {/* D1 Queries / Dia */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Database size={13} className="text-blue-600" />
                D1 • Requisições
              </span>
              <span className="text-[10px] font-semibold text-gray-500">Limite: 100k/dia</span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-bold text-gray-900">{cf?.d1.queries.formattedCurrent || '0'}</span>
              <span className="text-gray-500 text-[11px]">{cf?.d1.queries.percentage || 0}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', getProgressColor(cf?.d1.queries.percentage || 0))}
                style={{ width: `${Math.max(2, cf?.d1.queries.percentage || 0)}%` }}
              />
            </div>
          </div>

          {/* D1 Linhas Lidas */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <BarChart3 size={13} className="text-indigo-600" />
                D1 • Linhas Lidas
              </span>
              <span className="text-[10px] font-semibold text-gray-500">Limite: 5M/dia</span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-bold text-gray-900">{cf?.d1.rowsRead.formattedCurrent || '0'}</span>
              <span className="text-gray-500 text-[11px]">{cf?.d1.rowsRead.percentage || 0}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', getProgressColor(cf?.d1.rowsRead.percentage || 0))}
                style={{ width: `${Math.max(2, cf?.d1.rowsRead.percentage || 0)}%` }}
              />
            </div>
          </div>

          {/* D1 Espaço em Disco */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <HardDrive size={13} className="text-emerald-600" />
                D1 • Armazenamento
              </span>
              <span className="text-[10px] font-semibold text-gray-500">Limite: 500 MB</span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-bold text-gray-900">{cf?.d1.storage.formattedCurrent || '0'} MB</span>
              <span className="text-gray-500 text-[11px]">{cf?.d1.storage.percentage || 0}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', getProgressColor(cf?.d1.storage.percentage || 0))}
                style={{ width: `${Math.max(2, cf?.d1.storage.percentage || 0)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: SUBMENUS DE GESTÃO (USUÁRIOS E WORKSPACES) */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        {/* Barra de Submenus */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-200 bg-gray-50/50">
          {/* Submenus (Tabs) */}
          <div className="flex items-center gap-1.5 bg-gray-200/70 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveSubTab('users')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                activeSubTab === 'users'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Users size={14} className={activeSubTab === 'users' ? 'text-blue-600' : 'text-gray-400'} />
              <span>Usuários</span>
              <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
                {data?.users.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('workspaces')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                activeSubTab === 'workspaces'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Layers size={14} className={activeSubTab === 'workspaces' ? 'text-indigo-600' : 'text-gray-400'} />
              <span>Workspaces</span>
              <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
                {data?.workspaces?.length || data?.stats.totalWorkspaces || 0}
              </span>
            </button>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={activeSubTab === 'users' ? 'Buscar nome, e-mail...' : 'Buscar workspace, dono...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {activeSubTab === 'users' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os Status</option>
                <option value="pago">Pago / Vitalício</option>
                <option value="trial">Trial Ativo</option>
                <option value="expirado">Trial Expirado</option>
                <option value="atrasado">Atrasado</option>
                <option value="inadimplente">Inadimplente</option>
              </select>
            )}
          </div>
        </div>

        {/* CONTEÚDO DA ABA: USUÁRIOS */}
        {activeSubTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Workspace</th>
                  <th className="py-3 px-4">Tempo no Sistema</th>
                  <th className="py-3 px-4">Status Financeiro</th>
                  <th className="py-3 px-4">Último Pagamento</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      Nenhum usuário encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((item) => {
                    const isMasterUser = item.is_master;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedUser(item)}
                        className={cn(
                          'hover:bg-blue-50/40 transition-colors cursor-pointer group',
                          isMasterUser && 'bg-amber-50/30'
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
                                <span className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                  {item.name}
                                </span>
                                {isMasterUser && (
                                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-black uppercase">
                                    Master
                                  </span>
                                )}
                              </div>
                              <span className="text-gray-500 text-[11px] truncate block">{item.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Workspace */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900 block truncate">{item.workspace.name}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">{item.workspace.plan_type}</span>
                        </td>

                        {/* Tempo no Sistema */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-gray-700 font-semibold bg-gray-100 px-2 py-0.5 rounded-lg text-[11px]">
                            <Clock size={11} className="text-gray-400" />
                            {item.formatted_age}
                          </span>
                        </td>

                        {/* Status Financeiro */}
                        <td className="py-3 px-4">
                          {item.finance.status === 'Vitalício' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                              <Sparkles size={12} className="text-purple-600" />
                              Vitalício
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
                              Trial ({item.finance.trial_days_remaining}d restantes)
                            </span>
                          )}

                          {item.finance.status === 'Trial Expirado' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle size={12} className="text-rose-600" />
                              Expirado
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
                            <span className="font-bold text-gray-900 block">
                              {formatCurrency(item.finance.last_payment_amount)}
                            </span>
                          ) : (
                            <span className="text-gray-400">Sem pagamentos</span>
                          )}
                        </td>

                        {/* Ação */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(item);
                            }}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700 rounded-lg text-[11px] font-bold transition-all"
                          >
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CONTEÚDO DA ABA: WORKSPACES */}
        {activeSubTab === 'workspaces' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Estúdio / Workspace</th>
                  <th className="py-3 px-4">Proprietário (Owner)</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4">Membros</th>
                  <th className="py-3 px-4">Status / Trial</th>
                  <th className="py-3 px-4">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredWorkspaces.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      Nenhum workspace encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredWorkspaces.map((ws) => (
                    <tr key={ws.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {ws.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block truncate">{ws.name}</span>
                            {ws.description && (
                              <span className="text-gray-400 text-[10px] truncate block">{ws.description}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-900 block">{ws.owner_name}</span>
                        <span className="text-gray-500 text-[11px]">{ws.owner_email}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                          {ws.plan_type}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-gray-700 font-semibold">
                        {ws.total_members} {ws.total_members === 1 ? 'membro' : 'membros'}
                      </td>

                      <td className="py-3 px-4">
                        {ws.subscription_status === 'Vitalício' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900">
                            Vitalício
                          </span>
                        )}
                        {ws.subscription_status === 'Pago' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            Pago
                          </span>
                        )}
                        {ws.subscription_status === 'Trial Ativo' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            Trial ({ws.trial_days_remaining}d restantes)
                          </span>
                        )}
                        {ws.subscription_status === 'Trial Expirado' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            Expirado
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-gray-500">
                        {ws.created_at ? new Date(ws.created_at).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODAL COM TODAS AS INFORMAÇÕES DO USUÁRIO */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm',
                  selectedUser.is_master ? 'bg-amber-600' : 'bg-blue-600'
                )}>
                  {selectedUser.is_master ? <Crown size={20} /> : selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-base text-gray-900">{selectedUser.name}</h3>
                    {selectedUser.is_master && (
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[10px] font-black rounded uppercase">
                        Master
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{selectedUser.job_title || selectedUser.role}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Destaque do Período de Teste Trial / Assinatura */}
              <div className={cn(
                'p-4 rounded-2xl border flex items-start gap-3.5',
                selectedUser.finance.status === 'Trial Ativo'
                  ? 'bg-blue-50 border-blue-200 text-blue-950'
                  : selectedUser.finance.status === 'Vitalício'
                  ? 'bg-purple-50 border-purple-200 text-purple-950'
                  : selectedUser.finance.status === 'Pago'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              )}>
                {selectedUser.finance.status === 'Trial Ativo' ? (
                  <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                ) : selectedUser.finance.status === 'Vitalício' ? (
                  <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                ) : selectedUser.finance.status === 'Pago' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}

                <div className="space-y-0.5 flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {selectedUser.finance.status === 'Trial Ativo'
                      ? 'Período de Teste Grátis Ativo'
                      : selectedUser.finance.status === 'Vitalício'
                      ? 'Titular Master Vitalício'
                      : selectedUser.finance.status === 'Pago'
                      ? 'Assinatura Mercado Pago Ativa'
                      : 'Período de Teste Expirado'}
                  </h4>

                  {selectedUser.finance.status === 'Trial Ativo' && (
                    <div className="text-xs space-y-1">
                      <p className="font-extrabold text-blue-800 text-sm">
                        Restam {selectedUser.finance.trial_days_remaining} dias de teste grátis
                      </p>
                      {selectedUser.workspace.trial_ends_at && (
                        <p className="text-[11px] text-blue-700/80">
                          Data de término: {new Date(selectedUser.workspace.trial_ends_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedUser.finance.status === 'Vitalício' && (
                    <p className="text-xs text-purple-800 font-medium">
                      Acesso 100% liberado para sempre em todos os módulos e recursos sem cobrança.
                    </p>
                  )}

                  {selectedUser.finance.status === 'Pago' && (
                    <p className="text-xs text-emerald-800 font-medium">
                      Pagamento confirmado via Mercado Pago. Acesso regular e liberado.
                    </p>
                  )}

                  {selectedUser.finance.status === 'Trial Expirado' && (
                    <p className="text-xs text-rose-800 font-medium">
                      O período de avaliação encerrou. O acesso está sujeito ao bloqueio de Paywall.
                    </p>
                  )}
                </div>
              </div>

              {/* Informações Cadastrais */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Informações da Conta
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">E-mail</span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-gray-900 truncate">{selectedUser.email}</span>
                      <button
                        onClick={() => handleCopyEmail(selectedUser.email, selectedUser.id)}
                        className="text-gray-400 hover:text-gray-700 shrink-0"
                        title="Copiar"
                      >
                        {copiedId === selectedUser.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Telefone</span>
                    <span className="font-semibold text-gray-900 block truncate">
                      {selectedUser.phone || 'Não informado'}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Perfil / Função</span>
                    <span className="font-semibold text-gray-900 block truncate">
                      {selectedUser.role} {selectedUser.is_partner && '(Sócio)'}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Tempo no Sistema</span>
                    <span className="font-semibold text-gray-900 block">
                      {selectedUser.formatted_age} ({selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('pt-BR') : '-'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Informações do Workspace / Agência */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Workspace Vinculado
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Estúdio / Agência</span>
                    <span className="font-semibold text-gray-900 block truncate">
                      {selectedUser.workspace.name}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Plano Selecionado</span>
                    <span className="font-bold text-blue-600 capitalize block">
                      {selectedUser.workspace.plan_type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informações de Pagamento Mercado Pago */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Histórico de Pagamento
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Último Valor Pago</span>
                    <span className="font-bold text-gray-900 block">
                      {selectedUser.finance.last_payment_amount ? formatCurrency(selectedUser.finance.last_payment_amount) : 'R$ 0,00 (Gratuito / Teste)'}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">ID Transação Mercado Pago</span>
                    <span className="font-mono text-gray-700 text-[11px] block truncate">
                      {selectedUser.finance.mercadopago_payment_id || 'Nenhum'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
