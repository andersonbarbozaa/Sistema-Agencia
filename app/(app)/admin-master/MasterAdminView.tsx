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
  Crown,
  HardDrive,
  BarChart3,
  Layers,
  X,
  Phone,
  Mail,
  Building2,
  Gauge,
  ChevronRight,
  UserPlus,
  CalendarPlus,
  Unlock,
  Ban,
  Check,
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
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Submenu ativo: 'users' ou 'workspaces'
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'workspaces'>('users');

  // Filtros de busca e status
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal de Detalhes do Usuário Selecionado
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [customDays, setCustomDays] = useState<number>(30);

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

      // Se o modal de usuário estiver aberto, sincroniza os dados dele
      if (selectedUser) {
        const updatedUser = json.users?.find((u: any) => u.id === selectedUser.id);
        if (updatedUser) {
          setSelectedUser(updatedUser);
        }
      }
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

  // Ações administrativas: Liberar acesso integral ou dar mais tempo de trial
  const handleAdminAction = async (action: 'grant_access' | 'extend_trial' | 'suspend_access', targetUser: any, daysToAdd = 30) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/admin-master/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: targetUser.id,
          workspaceId: targetUser.workspace?.id,
          days: daysToAdd,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        alert(resJson.error || 'Erro ao executar ação.');
        return;
      }

      setActionSuccess(resJson.message || 'Ação executada com sucesso!');
      setTimeout(() => setActionSuccess(null), 5000);

      // Recarrega os dados imediatamente
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao processar ação administrativa.');
    } finally {
      setActionLoading(false);
    }
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

  // Filtragem de Usuários (Master já foi excluído na rota)
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-gray-500">Carregando painel Master...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-lg mx-auto mt-12 space-y-3 shadow-sm">
        <ShieldAlert className="w-9 h-9 text-red-500 mx-auto" />
        <h3 className="text-base font-bold text-red-900">Aviso do Painel Master Admin</h3>
        <p className="text-xs text-red-600 leading-relaxed">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const cf = data?.cloudflareHealth;
  const capacity = data?.capacity;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-rose-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-blue-600';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast de Feedback de Ação Administrativa */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Padronizado do Sistema */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Master Admin
            </h1>
            <ShieldCheck className="text-blue-600 w-5 h-5 shrink-0" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gestão central de assinantes, controle de acessos e monitoramento de infraestrutura.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="self-start sm:self-auto px-4 py-2 bg-white hover:bg-gray-50 active:scale-95 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-2"
          title="Atualizar dados em tempo real"
        >
          <RefreshCw size={14} className={cn(refreshing && 'animate-spin text-blue-600')} />
          <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>

      {/* KPI Cards Interativos no Padrão do Sistema */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Usuários */}
        <button
          onClick={() => handleCardClick('all')}
          className={cn(
            'bg-white p-4 rounded-2xl border text-left transition-all group block shadow-sm',
            activeSubTab === 'users' && statusFilter === 'all'
              ? 'border-blue-500 ring-2 ring-blue-500/10'
              : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
          )}
        >
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase group-hover:text-blue-600 transition-colors">
            <span>Usuários</span>
            <Users size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{data?.stats.totalUsers || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Cadastros &bull; Clique para listar</p>
        </button>

        {/* Workspaces */}
        <button
          onClick={() => handleCardClick('workspaces')}
          className={cn(
            'bg-white p-4 rounded-2xl border text-left transition-all group block shadow-sm',
            activeSubTab === 'workspaces'
              ? 'border-blue-500 ring-2 ring-blue-500/10'
              : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
          )}
        >
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase group-hover:text-blue-600 transition-colors">
            <span>Workspaces</span>
            <Layers size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{data?.stats.totalWorkspaces || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Estúdios &bull; Clique para listar</p>
        </button>

        {/* Assinaturas Ativas */}
        <button
          onClick={() => handleCardClick('pago')}
          className={cn(
            'bg-white p-4 rounded-2xl border text-left transition-all group block shadow-sm',
            activeSubTab === 'users' && statusFilter === 'pago'
              ? 'border-emerald-500 ring-2 ring-emerald-500/10'
              : 'border-gray-200 hover:border-emerald-300 hover:shadow-md'
          )}
        >
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase group-hover:text-emerald-600 transition-colors">
            <span>Assinaturas</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{data?.stats.activePaidCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Pagas &bull; Clique para filtrar</p>
        </button>

        {/* Em Teste Trial */}
        <button
          onClick={() => handleCardClick('trial')}
          className={cn(
            'bg-white p-4 rounded-2xl border text-left transition-all group block shadow-sm',
            activeSubTab === 'users' && statusFilter === 'trial'
              ? 'border-blue-500 ring-2 ring-blue-500/10'
              : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
          )}
        >
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase group-hover:text-blue-600 transition-colors">
            <span>Em Teste</span>
            <Clock size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{data?.stats.activeTrialCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Trial 30d &bull; Clique para filtrar</p>
        </button>

        {/* Vencidos */}
        <button
          onClick={() => handleCardClick('expirado')}
          className={cn(
            'bg-white p-4 rounded-2xl border text-left transition-all group block shadow-sm col-span-2 sm:col-span-1',
            activeSubTab === 'users' && statusFilter === 'expirado'
              ? 'border-red-500 ring-2 ring-red-500/10'
              : 'border-gray-200 hover:border-red-300 hover:shadow-md'
          )}
        >
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase group-hover:text-red-600 transition-colors">
            <span>Vencidos</span>
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{data?.stats.expiredOrPastDueCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Expirados &bull; Clique para filtrar</p>
        </button>
      </div>

      {/* SEÇÃO 1: SAÚDE DA INFRAESTRUTURA (SIMPLIFICADA NO PADRÃO DO SISTEMA) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-gray-900">Saúde da Infraestrutura</h3>
            <p className="text-xs text-gray-500 mt-0.5">Consumo atual em relação aos limites matemáticos do plano Free.</p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Operação Saudável
          </span>
        </div>

        {/* Grid de 4 Cards de Consumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Card 1: Capacidade de Usuários */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Capacidade de Usuários</span>
              <Gauge size={14} className="text-blue-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-lg font-bold text-gray-900">
                {capacity?.currentUsers || 0}{' '}
                <span className="text-xs font-normal text-gray-500">/ ~3.500 usuários</span>
              </p>
              <span className="text-[11px] font-semibold text-emerald-600">
                {capacity?.capacityUsagePercent || 0.1}%
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, capacity?.capacityUsagePercent || 1)}%` }}
              />
            </div>
          </div>

          {/* Card 2: D1 Queries */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">D1 • Requisições / Dia</span>
              <Database size={14} className="text-blue-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-lg font-bold text-gray-900">
                {cf?.d1.queries.formattedCurrent || '0'}{' '}
                <span className="text-xs font-normal text-gray-500">/ 100k</span>
              </p>
              <span className="text-[11px] font-semibold text-gray-500">
                {cf?.d1.queries.percentage || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', getProgressColor(cf?.d1.queries.percentage || 0))}
                style={{ width: `${Math.max(2, cf?.d1.queries.percentage || 0)}%` }}
              />
            </div>
          </div>

          {/* Card 3: D1 Linhas Lidas */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">D1 • Linhas Lidas / Dia</span>
              <BarChart3 size={14} className="text-indigo-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-lg font-bold text-gray-900">
                {cf?.d1.rowsRead.formattedCurrent || '0'}{' '}
                <span className="text-xs font-normal text-gray-500">/ 5M</span>
              </p>
              <span className="text-[11px] font-semibold text-gray-500">
                {cf?.d1.rowsRead.percentage || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', getProgressColor(cf?.d1.rowsRead.percentage || 0))}
                style={{ width: `${Math.max(2, cf?.d1.rowsRead.percentage || 0)}%` }}
              />
            </div>
          </div>

          {/* Card 4: D1 Armazenamento */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">D1 • Armazenamento</span>
              <HardDrive size={14} className="text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-lg font-bold text-gray-900">
                {cf?.d1.storage.formattedCurrent || '0'} MB{' '}
                <span className="text-xs font-normal text-gray-500">/ 500 MB</span>
              </p>
              <span className="text-[11px] font-semibold text-gray-500">
                {cf?.d1.storage.percentage || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', getProgressColor(cf?.d1.storage.percentage || 0))}
                style={{ width: `${Math.max(2, cf?.d1.storage.percentage || 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: SUBMENUS E TABELA DE GESTÃO (USUÁRIOS E WORKSPACES) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
        {/* Submenus (Tabs) e Barra de Filtros */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('users')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2',
                activeSubTab === 'users'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              )}
            >
              <Users size={14} />
              <span>Usuários</span>
              <span className={cn(
                'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                activeSubTab === 'users' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'
              )}>
                {data?.users.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('workspaces')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2',
                activeSubTab === 'workspaces'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              )}
            >
              <Layers size={14} />
              <span>Workspaces</span>
              <span className={cn(
                'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                activeSubTab === 'workspaces' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'
              )}>
                {data?.workspaces?.length || data?.stats.totalWorkspaces || 0}
              </span>
            </button>
          </div>

          {/* Busca e Filtro de Status */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={activeSubTab === 'users' ? 'Buscar usuário ou estúdio...' : 'Buscar workspace ou dono...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {activeSubTab === 'users' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-2.5 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os Status</option>
                <option value="pago">Pago / Ativo</option>
                <option value="trial">Trial Ativo</option>
                <option value="expirado">Trial Expirado</option>
                <option value="atrasado">Atrasado</option>
                <option value="inadimplente">Inadimplente</option>
              </select>
            )}
          </div>
        </div>

        {/* TABELA: USUÁRIOS */}
        {activeSubTab === 'users' && (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Workspace / Agência</th>
                  <th className="py-3 px-4">Tempo no Sistema</th>
                  <th className="py-3 px-4">Status Financeiro</th>
                  <th className="py-3 px-4">Último Pagamento</th>
                  <th className="py-3 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      Nenhum usuário encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedUser(item)}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                    >
                      {/* Usuário */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs">
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 block truncate group-hover:text-blue-600 transition-colors">
                              {item.name}
                            </span>
                            <span className="text-gray-500 text-[11px] truncate block">{item.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Workspace */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-gray-900 block truncate">{item.workspace.name}</span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase">{item.workspace.plan_type}</span>
                      </td>

                      {/* Tempo no Sistema */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-gray-700 font-medium bg-gray-100 px-2 py-0.5 rounded-lg text-[11px]">
                          <Clock size={11} className="text-gray-400" />
                          {item.formatted_age}
                        </span>
                      </td>

                      {/* Status Financeiro */}
                      <td className="py-3.5 px-4">
                        {item.finance.status === 'Pago' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            Pago (Ativo)
                          </span>
                        )}

                        {item.finance.status === 'Trial Ativo' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock size={12} className="text-blue-600" />
                            Trial ({item.finance.trial_days_remaining}d restantes)
                          </span>
                        )}

                        {item.finance.status === 'Trial Expirado' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <XCircle size={12} className="text-red-600" />
                            Trial Expirado
                          </span>
                        )}

                        {item.finance.status === 'Atrasado' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle size={12} className="text-amber-600" />
                            Atrasado
                          </span>
                        )}

                        {item.finance.status === 'Inadimplente' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <XCircle size={12} className="text-red-600" />
                            Inadimplente
                          </span>
                        )}
                      </td>

                      {/* Último Pagamento */}
                      <td className="py-3.5 px-4 text-gray-600 text-xs">
                        {item.finance.last_payment_amount ? (
                          <span className="font-bold text-gray-900 block">
                            {formatCurrency(item.finance.last_payment_amount)}
                          </span>
                        ) : (
                          <span className="text-gray-400">R$ 0,00</span>
                        )}
                      </td>

                      {/* Ações Rápidas (Liberar Acesso / +Dias) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleAdminAction('grant_access', item)}
                            disabled={actionLoading}
                            title="Liberar Acesso Integral (Ativar Assinatura)"
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1"
                          >
                            <Unlock size={12} />
                            <span>Liberar</span>
                          </button>

                          <button
                            onClick={() => handleAdminAction('extend_trial', item, 15)}
                            disabled={actionLoading}
                            title="Dar +15 dias de teste grátis"
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1"
                          >
                            <CalendarPlus size={12} />
                            <span>+15d</span>
                          </button>

                          <button
                            onClick={() => setSelectedUser(item)}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-semibold transition-all"
                          >
                            Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TABELA: WORKSPACES */}
        {activeSubTab === 'workspaces' && (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Estúdio / Workspace</th>
                  <th className="py-3 px-4">Proprietário (Owner)</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4">Membros</th>
                  <th className="py-3 px-4">Situação / Trial</th>
                  <th className="py-3 px-4">Data de Cadastro</th>
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
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
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

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-gray-900 block">{ws.owner_name}</span>
                        <span className="text-gray-500 text-[11px]">{ws.owner_email}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                          {ws.plan_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-700 font-semibold">
                        {ws.total_members} {ws.total_members === 1 ? 'membro' : 'membros'}
                      </td>

                      <td className="py-3.5 px-4">
                        {ws.subscription_status === 'Vitalício' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
                            Vitalício
                          </span>
                        )}
                        {ws.subscription_status === 'Pago' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                            Pago (Ativo)
                          </span>
                        )}
                        {ws.subscription_status === 'Trial Ativo' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                            Trial ({ws.trial_days_remaining}d restantes)
                          </span>
                        )}
                        {ws.subscription_status === 'Trial Expirado' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                            Expirado
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-gray-500">
                        {ws.created_at ? new Date(ws.created_at).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE DETALHES E GESTÃO DO USUÁRIO */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-2xs">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">{selectedUser.name}</h3>
                  <p className="text-xs text-gray-500">{selectedUser.job_title || selectedUser.role}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Destaque do Período de Teste Trial / Assinatura */}
              <div className={cn(
                'p-4 rounded-xl border flex items-start gap-3',
                selectedUser.finance.status === 'Trial Ativo'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : selectedUser.finance.status === 'Pago'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              )}>
                {selectedUser.finance.status === 'Trial Ativo' ? (
                  <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                ) : selectedUser.finance.status === 'Pago' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}

                <div className="space-y-0.5 flex-1 text-xs">
                  <h4 className="font-bold uppercase tracking-wider">
                    {selectedUser.finance.status === 'Trial Ativo'
                      ? 'Período de Teste Grátis Ativo'
                      : selectedUser.finance.status === 'Pago'
                      ? 'Assinatura Ativa (Mercado Pago)'
                      : 'Período de Teste Expirado'}
                  </h4>

                  {selectedUser.finance.status === 'Trial Ativo' && (
                    <div className="space-y-0.5 pt-0.5">
                      <p className="font-bold text-blue-900 text-sm">
                        Restam {selectedUser.finance.trial_days_remaining} dias de teste grátis
                      </p>
                      {selectedUser.workspace.trial_ends_at && (
                        <p className="text-[11px] text-blue-700">
                          Vencimento: {new Date(selectedUser.workspace.trial_ends_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedUser.finance.status === 'Pago' && (
                    <p className="text-emerald-800">
                      Assinatura regularizada. Acesso liberado a todas as ferramentas.
                    </p>
                  )}

                  {selectedUser.finance.status === 'Trial Expirado' && (
                    <p className="text-red-700">
                      O teste de 30 dias expirou. O estúdio está sob bloqueio de Paywall.
                    </p>
                  )}
                </div>
              </div>

              {/* PAINEL DE CONTROLE DE ACESSO DO MASTER: LIBERAR ACESSO OU DAR MAIS DIAS */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-blue-600" />
                    Gerenciar Acesso do Usuário
                  </h4>
                  <span className="text-[10px] text-gray-400">Exclusivo Titular</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* Botão Liberar Acesso Total */}
                  <button
                    onClick={() => handleAdminAction('grant_access', selectedUser)}
                    disabled={actionLoading}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Unlock size={14} />
                    <span>Liberar Acesso Total</span>
                  </button>

                  {/* Botão Suspender */}
                  <button
                    onClick={() => handleAdminAction('suspend_access', selectedUser)}
                    disabled={actionLoading}
                    className="p-2.5 bg-white hover:bg-red-50 text-red-700 border border-red-200 active:scale-95 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Ban size={14} />
                    <span>Suspender Acesso</span>
                  </button>
                </div>

                {/* Extensão de Trial */}
                <div className="pt-2 border-t border-gray-200/70 space-y-1.5">
                  <span className="text-[11px] font-semibold text-gray-700 block">
                    Conceder mais tempo de teste grátis (Trial):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAdminAction('extend_trial', selectedUser, 7)}
                      disabled={actionLoading}
                      className="flex-1 py-1.5 bg-white border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 rounded-lg text-xs font-semibold text-gray-700 transition-all shadow-2xs"
                    >
                      +7 dias
                    </button>
                    <button
                      onClick={() => handleAdminAction('extend_trial', selectedUser, 15)}
                      disabled={actionLoading}
                      className="flex-1 py-1.5 bg-white border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 rounded-lg text-xs font-semibold text-gray-700 transition-all shadow-2xs"
                    >
                      +15 dias
                    </button>
                    <button
                      onClick={() => handleAdminAction('extend_trial', selectedUser, 30)}
                      disabled={actionLoading}
                      className="flex-1 py-1.5 bg-white border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 rounded-lg text-xs font-semibold text-gray-700 transition-all shadow-2xs"
                    >
                      +30 dias
                    </button>
                  </div>
                </div>
              </div>

              {/* Informações da Conta */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Dados da Conta
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">E-mail</span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-gray-900 truncate">{selectedUser.email}</span>
                      <button
                        onClick={() => handleCopyEmail(selectedUser.email, selectedUser.id)}
                        className="text-gray-400 hover:text-gray-700"
                        title="Copiar"
                      >
                        {copiedId === selectedUser.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Telefone</span>
                    <span className="font-semibold text-gray-900 block truncate">
                      {selectedUser.phone || 'Não informado'}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Perfil</span>
                    <span className="font-semibold text-gray-900 block">
                      {selectedUser.role} {selectedUser.is_partner && '(Sócio)'}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Tempo no Sistema</span>
                    <span className="font-semibold text-gray-900 block">
                      {selectedUser.formatted_age}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informações do Workspace */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Workspace
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Estúdio / Agência</span>
                    <span className="font-semibold text-gray-900 block truncate">
                      {selectedUser.workspace.name}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Plano</span>
                    <span className="font-bold text-blue-600 capitalize block">
                      {selectedUser.workspace.plan_type}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-xl transition-colors"
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
