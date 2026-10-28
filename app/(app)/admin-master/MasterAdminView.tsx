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
  Globe,
  Laptop,
  Smartphone,
  Tablet,
  Activity,
  History,
  KeyRound,
  CheckSquare,
  DollarSign,
  FileText,
  MapPin,
  ChevronDown,
  ChevronUp,
  Info,
  Filter,
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
  capacity: {
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
    avatar_url: string | null;
    phone: string | null;
    job_title: string | null;
    is_partner: boolean;
    created_at: string;
    days_in_system: number;
    formatted_age: string;
    is_master: boolean;
    workspace: {
      id: string;
      name: string;
      plan_type: string;
      subscription_status: string;
      trial_ends_at: string | null;
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
  workspaces: Array<{
    id: string;
    name: string;
    description: string;
    owner_id: string;
    owner_name: string;
    owner_email: string;
    plan_type: string;
    subscription_status: string;
    trial_ends_at: string | null;
    trial_days_remaining: number | null;
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

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Não registrado';
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  if (isNaN(date)) return dateStr;
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Agora mesmo';
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `Há ${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `Há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  if (diffSec < 2592000) {
    const days = Math.floor(diffSec / 86400);
    return `Há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
  const months = Math.floor(diffSec / 2592000);
  return `Há ${months} ${months === 1 ? 'mês' : 'meses'}`;
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
  const [modalTab, setModalTab] = useState<'history' | 'access' | 'account'>('history');
  const [userActivity, setUserActivity] = useState<any | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

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

  // Quando um usuário é selecionado, busca o histórico completo de acessos e ações
  useEffect(() => {
    if (!selectedUser) {
      setUserActivity(null);
      setModalTab('history');
      setActivityFilter('all');
      setExpandedEventId(null);
      return;
    }

    const fetchUserActivity = async () => {
      try {
        setActivityLoading(true);
        const res = await fetch(`/api/admin-master/user-activity/${selectedUser.id}`);
        if (!res.ok) {
          throw new Error('Falha ao carregar histórico de acessos');
        }
        const json = await res.json();
        setUserActivity(json);
      } catch (err) {
        console.error('Error fetching user activity:', err);
      } finally {
        setActivityLoading(false);
      }
    };

    fetchUserActivity();
  }, [selectedUser?.id]);

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

      // Recarrega o histórico de atividades se o usuário estiver aberto
      if (selectedUser?.id) {
        const actRes = await fetch(`/api/admin-master/user-activity/${selectedUser.id}`);
        if (actRes.ok) {
          const actJson = await actRes.json();
          setUserActivity(actJson);
        }
      }
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

  // Filtragem da Timeline de Atividades do Usuário
  const filteredTimeline = useMemo(() => {
    if (!userActivity?.timeline) return [];
    if (activityFilter === 'all') return userActivity.timeline;
    if (activityFilter === 'login') return userActivity.timeline.filter((e: any) => e.type === 'login' || e.type === 'access');
    if (activityFilter === 'task') return userActivity.timeline.filter((e: any) => e.type === 'task' || e.module === 'TASKS');
    if (activityFilter === 'client') return userActivity.timeline.filter((e: any) => e.type === 'client' || e.module === 'CLIENTS' || e.type === 'crm' || e.module === 'CRM');
    if (activityFilter === 'finance') return userActivity.timeline.filter((e: any) => e.type === 'finance' || e.module === 'FINANCE' || e.type === 'contract' || e.module === 'CONTRACTS');
    if (activityFilter === 'ai') return userActivity.timeline.filter((e: any) => e.type === 'ai' || e.module === 'AI');
    return userActivity.timeline;
  }, [userActivity?.timeline, activityFilter]);

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
                  <th className="py-3 px-4 text-right">Ações & Histórico</th>
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

                      {/* Ações e Histórico */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedUser(item);
                              setModalTab('history');
                            }}
                            title="Ver histórico de acessos, dispositivos e atividades"
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1"
                          >
                            <History size={12} />
                            <span>Histórico</span>
                          </button>

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
                            className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1"
                          >
                            <CalendarPlus size={12} />
                            <span>+15d</span>
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

      {/* MODAL DE HISTÓRICO COMPLETO DE ACESSO E GESTÃO DO USUÁRIO */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-xs">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-gray-900 truncate">{selectedUser.name}</h3>
                    {selectedUser.finance.status === 'Pago' && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                        Pago
                      </span>
                    )}
                    {selectedUser.finance.status === 'Trial Ativo' && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                        Trial ({selectedUser.finance.trial_days_remaining}d)
                      </span>
                    )}
                    {selectedUser.finance.status === 'Trial Expirado' && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-[10px] font-bold">
                        Expirado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {selectedUser.email} &bull; {selectedUser.workspace.name} ({selectedUser.role})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
                title="Fechar Modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Submenus dentro do Modal */}
            <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setModalTab('history')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2',
                  modalTab === 'history'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200/60'
                )}
              >
                <History size={14} />
                <span>Histórico & Atividades</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  modalTab === 'history' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'
                )}>
                  {userActivity?.summary?.totalRecords ?? '...'}
                </span>
              </button>

              <button
                onClick={() => setModalTab('access')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2',
                  modalTab === 'access'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200/60'
                )}
              >
                <ShieldCheck size={14} />
                <span>Gerenciar Acesso & Trial</span>
              </button>

              <button
                onClick={() => setModalTab('account')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2',
                  modalTab === 'account'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200/60'
                )}
              >
                <Users size={14} />
                <span>Dados da Conta</span>
              </button>
            </div>

            {/* Modal Body com Scroll Suave */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* ABA 1: HISTÓRICO DE ACESSO, DISPOSITIVOS E ATIVIDADES */}
              {modalTab === 'history' && (
                <div className="space-y-4">
                  {/* Resumo de Conexão e Último Acesso */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Card 1: Último Acesso */}
                    <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-gray-500 text-[11px] font-semibold uppercase">
                        <span>Último Acesso</span>
                        <Clock size={13} className="text-blue-600" />
                      </div>
                      <p className="text-xs font-bold text-gray-900">
                        {formatRelativeTime(userActivity?.summary?.lastSeen)}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 pt-0.5 truncate">
                        <MapPin size={11} className="text-gray-400 shrink-0" />
                        <span className="truncate">{userActivity?.summary?.lastLocation || 'Localização não identificada'}</span>
                      </div>
                    </div>

                    {/* Card 2: Dispositivo & Navegador Mais Usado */}
                    <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-gray-500 text-[11px] font-semibold uppercase">
                        <span>Dispositivo & Navegador</span>
                        <Laptop size={13} className="text-indigo-600" />
                      </div>
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {userActivity?.summary?.lastDevice || 'PC Windows • Google Chrome'}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 pt-0.5 truncate">
                        <Globe size={11} className="text-gray-400 shrink-0" />
                        <span className="font-mono text-[10px] text-gray-700">{userActivity?.summary?.lastIp || '127.0.0.1'}</span>
                      </div>
                    </div>

                    {/* Card 3: Estatísticas Totais */}
                    <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-gray-500 text-[11px] font-semibold uppercase">
                        <span>Volume de Atividades</span>
                        <Activity size={13} className="text-emerald-600" />
                      </div>
                      <p className="text-xs font-bold text-gray-900">
                        {userActivity?.summary?.totalRecords || 0} registros catalogados
                      </p>
                      <p className="text-[11px] text-gray-500 pt-0.5">
                        {userActivity?.summary?.totalLogins || 0} logins &bull; {userActivity?.summary?.totalActions || 0} ações de negócio
                      </p>
                    </div>
                  </div>

                  {/* Barra de Filtros da Timeline */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setActivityFilter('all')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all',
                          activityFilter === 'all'
                            ? 'bg-gray-900 text-white shadow-2xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        Todos ({userActivity?.timeline?.length || 0})
                      </button>

                      <button
                        onClick={() => setActivityFilter('login')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1',
                          activityFilter === 'login'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        <KeyRound size={11} />
                        <span>Logins & Acessos</span>
                      </button>

                      <button
                        onClick={() => setActivityFilter('task')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1',
                          activityFilter === 'task'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        <CheckSquare size={11} />
                        <span>Tarefas</span>
                      </button>

                      <button
                        onClick={() => setActivityFilter('client')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1',
                          activityFilter === 'client'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        <UserPlus size={11} />
                        <span>Clientes / CRM</span>
                      </button>

                      <button
                        onClick={() => setActivityFilter('finance')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1',
                          activityFilter === 'finance'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        <DollarSign size={11} />
                        <span>Financeiro</span>
                      </button>

                      <button
                        onClick={() => setActivityFilter('ai')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1',
                          activityFilter === 'ai'
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        <Sparkles size={11} />
                        <span>IA</span>
                      </button>
                    </div>

                    <span className="text-[11px] text-gray-400 font-medium">
                      Exibindo {filteredTimeline.length} eventos
                    </span>
                  </div>

                  {/* Estado de Carregamento do Histórico */}
                  {activityLoading && (
                    <div className="py-12 flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-gray-500 font-semibold">Carregando histórico de acessos e ações...</p>
                    </div>
                  )}

                  {/* TIMELINE DE REGISTROS COMPLETOS */}
                  {!activityLoading && filteredTimeline.length === 0 && (
                    <div className="py-12 text-center space-y-2 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <History className="w-8 h-8 text-gray-400 mx-auto" />
                      <p className="text-xs font-semibold text-gray-700">Nenhum registro encontrado para este filtro.</p>
                      <p className="text-[11px] text-gray-400">
                        Os acessos e ações serão catalogados automaticamente em tempo real.
                      </p>
                    </div>
                  )}

                  {!activityLoading && filteredTimeline.length > 0 && (
                    <div className="space-y-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-gray-200 before:pointer-events-none pl-1">
                      {filteredTimeline.map((item: any) => {
                        const isExpanded = expandedEventId === item.id;
                        const isLogin = item.type === 'login';
                        const isTask = item.type === 'task' || item.module === 'TASKS';
                        const isClient = item.type === 'client' || item.module === 'CLIENTS' || item.type === 'crm' || item.module === 'CRM';
                        const isFinance = item.type === 'finance' || item.module === 'FINANCE' || item.type === 'contract' || item.module === 'CONTRACTS';
                        const isAi = item.type === 'ai' || item.module === 'AI';

                        return (
                          <div key={item.id} className="relative flex items-start gap-3 pl-1 group">
                            {/* Ícone Indicador na Linha da Timeline */}
                            <div className={cn(
                              'w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 shadow-2xs border-2 border-white',
                              isLogin && 'bg-blue-600 text-white',
                              isTask && 'bg-indigo-600 text-white',
                              isClient && 'bg-emerald-600 text-white',
                              isFinance && 'bg-amber-500 text-white',
                              isAi && 'bg-purple-600 text-white',
                              !isLogin && !isTask && !isClient && !isFinance && !isAi && 'bg-gray-700 text-white'
                            )}>
                              {isLogin && <KeyRound size={12} />}
                              {isTask && <CheckSquare size={12} />}
                              {isClient && <UserPlus size={12} />}
                              {isFinance && <DollarSign size={12} />}
                              {isAi && <Sparkles size={12} />}
                              {!isLogin && !isTask && !isClient && !isFinance && !isAi && <Activity size={12} />}
                            </div>

                            {/* Card do Evento */}
                            <div className="flex-1 bg-white border border-gray-200 rounded-xl p-3.5 space-y-2 hover:border-blue-300 transition-colors shadow-2xs">
                              {/* Header do Card */}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-gray-900">{item.title}</span>
                                    <span className={cn(
                                      'px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider',
                                      isLogin && 'bg-blue-50 text-blue-700',
                                      isTask && 'bg-indigo-50 text-indigo-700',
                                      isClient && 'bg-emerald-50 text-emerald-700',
                                      isFinance && 'bg-amber-50 text-amber-700',
                                      isAi && 'bg-purple-50 text-purple-700',
                                      !isLogin && !isTask && !isClient && !isFinance && !isAi && 'bg-gray-100 text-gray-700'
                                    )}>
                                      {item.module || 'SISTEMA'}
                                    </span>
                                  </div>

                                  {item.description && (
                                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                                      {item.description}
                                    </p>
                                  )}
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="text-[11px] font-semibold text-gray-700 block">
                                    {formatRelativeTime(item.timestamp)}
                                  </span>
                                  <span className="text-[10px] text-gray-400 block font-mono">
                                    {new Date(item.timestamp).toLocaleDateString('pt-BR')}{' '}
                                    {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                </div>
                              </div>

                              {/* Badges de Conexão: Por onde acessou, Navegador e Dispositivo */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100/80">
                                {/* Navegador */}
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200/80 rounded-md text-[10px] font-semibold text-gray-700">
                                  <Globe size={11} className="text-blue-600" />
                                  <span>{item.browser || 'Navegador Web'}</span>
                                </span>

                                {/* Dispositivo e Sistema Operacional */}
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200/80 rounded-md text-[10px] font-semibold text-gray-700">
                                  {item.device === 'Mobile' ? (
                                    <Smartphone size={11} className="text-emerald-600" />
                                  ) : item.device === 'Tablet' ? (
                                    <Tablet size={11} className="text-purple-600" />
                                  ) : (
                                    <Laptop size={11} className="text-indigo-600" />
                                  )}
                                  <span>
                                    {item.deviceModel || item.device || 'Desktop'} ({item.os || 'Windows/Desktop'})
                                  </span>
                                </span>

                                {/* IP e Localização */}
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200/80 rounded-md text-[10px] font-semibold text-gray-700">
                                  <MapPin size={11} className="text-red-500" />
                                  <span className="font-mono text-gray-900">{item.ip || '127.0.0.1'}</span>
                                  <span className="text-gray-400">&bull;</span>
                                  <span>{item.location || 'Rede Local'}</span>
                                </span>

                                {/* Rota se houver */}
                                {item.route && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200/80 rounded-md text-[10px] font-mono text-gray-500">
                                    <span>{item.route}</span>
                                  </span>
                                )}

                                {/* Botão para expandir payload/detalhes técnicos */}
                                {item.details && (
                                  <button
                                    onClick={() => setExpandedEventId(isExpanded ? null : item.id)}
                                    className="ml-auto text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 py-0.5 px-1.5 rounded hover:bg-blue-50 transition-colors"
                                  >
                                    <span>{isExpanded ? 'Ocultar Detalhes' : 'Ver Detalhes'}</span>
                                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                  </button>
                                )}
                              </div>

                              {/* Painel Expansível de Detalhes Técnicos */}
                              {isExpanded && item.details && (
                                <div className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-lg text-[11px] font-mono overflow-x-auto border border-gray-800 animate-in fade-in duration-150">
                                  <div className="flex items-center justify-between text-gray-400 text-[10px] pb-1 border-b border-gray-800 mb-2">
                                    <span>PAYLOAD / DADOS DO REGISTRO:</span>
                                    {item.userAgent && (
                                      <span className="truncate max-w-[300px] text-[9px] text-gray-500" title={item.userAgent}>
                                        UA: {item.userAgent}
                                      </span>
                                    )}
                                  </div>
                                  <pre className="whitespace-pre-wrap leading-relaxed text-emerald-400">
                                    {JSON.stringify(item.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 2: GERENCIAMENTO DE ASSINATURA & ACESSO */}
              {modalTab === 'access' && (
                <div className="space-y-4">
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
                </div>
              )}

              {/* ABA 3: DADOS DA CONTA */}
              {modalTab === 'account' && (
                <div className="space-y-4">
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
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                Painel Master Admin &bull; Titular do Sistema
              </span>
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
