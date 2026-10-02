'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  FolderOpen,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  PlusCircle,
  FileCheck2,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import MediaViewer from '@/components/MediaViewer';
import { TaskMediaLink } from '@/types';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ list: TaskMediaLink[]; index: number } | null>(null);

  // Dashboard Lead Modal
  const [selectedDashboardLead, setSelectedDashboardLead] = useState<any | null>(null);
  const [editLeadForm, setEditLeadForm] = useState<any>({
    contact_name: '',
    company: '',
    phone: '',
    email: '',
    status: 'Novo',
    platform: 'WhatsApp',
    notes: '',
  });

  const openLeadEdit = (lead: any) => {
    setSelectedDashboardLead(lead);
    setEditLeadForm({
      contact_name: lead.contact_name || '',
      company: lead.company || '',
      phone: lead.phone || '',
      email: lead.email || '',
      status: lead.status || 'Novo',
      platform: lead.platform || lead.source || 'WhatsApp',
      notes: lead.notes || '',
    });
  };

  const handleUpdateDashboardLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDashboardLead) return;
    try {
      const res = await fetch(`/api/crm/${selectedDashboardLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editLeadForm),
      });
      if (res.ok) {
        setSelectedDashboardLead(null);
        fetchDashboard();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar lead');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDashboardLead = async () => {
    if (!selectedDashboardLead) return;
    if (!confirm(`Deseja realmente excluir o lead "${selectedDashboardLead.contact_name}"?`)) return;
    try {
      const res = await fetch(`/api/crm/${selectedDashboardLead.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedDashboardLead(null);
        fetchDashboard();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao excluir lead');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dashboard Event Modal
  const [selectedDashboardEvent, setSelectedDashboardEvent] = useState<any | null>(null);
  const [editEventForm, setEditEventForm] = useState<any>({
    title: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    notes: '',
  });

  const openEventEdit = (evt: any) => {
    setSelectedDashboardEvent(evt);
    setEditEventForm({
      title: evt.title || '',
      event_date: evt.event_date || '',
      start_time: evt.start_time || '',
      end_time: evt.end_time || '',
      location: evt.location || '',
      notes: evt.notes || '',
    });
  };

  const handleUpdateDashboardEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDashboardEvent) return;
    try {
      const res = await fetch(`/api/calendar/${selectedDashboardEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editEventForm),
      });
      if (res.ok) {
        setSelectedDashboardEvent(null);
        fetchDashboard();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar compromisso');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDashboardEvent = async () => {
    if (!selectedDashboardEvent) return;
    if (!confirm(`Deseja excluir o compromisso "${selectedDashboardEvent.title}"?`)) return;
    try {
      const res = await fetch(`/api/calendar/${selectedDashboardEvent.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedDashboardEvent(null);
        fetchDashboard();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao excluir compromisso');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Falha ao carregar dashboard');
      const json = await res.json();
      setData(json.data || json);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Carregando painel de controle...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-lg mx-auto mt-12">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-red-800">Não foi possível carregar o dashboard</h3>
        <p className="text-sm text-red-600 mt-1">{error || 'Tente recarregar a página.'}</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // ==========================================
  // CLIENT PORTAL VIEW
  // ==========================================
  if (data.role === 'CLIENTE') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Aguardando Sua Aprovação</span>
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <FileCheck2 size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-600 mt-3">{data.counts?.awaiting_approval || 0}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Em Produção</span>
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <Clock size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-600 mt-3">{data.counts?.pending_tasks || 0}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Concluídas</span>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <CheckSquare size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-600 mt-3">{data.counts?.completed_tasks || 0}</p>
          </div>
        </div>

        {/* Client tasks list */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-base text-gray-900">Tarefas e Entregas Recentes</h3>
            <Link href="/tasks" className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {data.tasks?.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Nenhuma tarefa ativa no momento.
              </div>
            ) : (
              data.tasks.map((task: any) => (
                <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: task.category_color || '#3b82f6' }}
                      />
                      <h4 className="font-semibold text-sm text-gray-900 truncate">{task.name}</h4>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {task.category_name ? `Categoria: ${task.category_name} • ` : ''}
                      Prazo: <span className="font-medium text-gray-700">{formatDate(task.delivery_date)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      task.status === 'Em aprovação' ? 'bg-amber-100 text-amber-800' :
                      task.status === 'Aprovada' ? 'bg-emerald-100 text-emerald-800' :
                      task.status === 'Em alteração' ? 'bg-orange-100 text-orange-800' :
                      task.status === 'Concluída' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {task.status}
                    </span>
                    <Link
                      href={`/tasks?id=${task.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Detalhes
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ADMINISTRATOR / COLLABORATOR VIEW
  // ==========================================
  const { task_stats, urgent_tasks, upcoming_events, recent_leads, financial, partner_expenses } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Task Metric Cards - Clickable to filter on /tasks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/tasks?filter=abertas"
          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group block"
          title="Ver tarefas abertas"
        >
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase group-hover:text-blue-600 transition-colors">
            <span>Tarefas Abertas</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{task_stats.pending_tasks}</p>
          <p className="text-xs text-gray-500 mt-1">{task_stats.in_production_tasks} em produção &bull; Clique para filtrar</p>
        </Link>

        <Link
          href="/tasks?filter=aprovacao"
          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-amber-300 hover:shadow-md transition-all group block"
          title="Ver tarefas em aprovação"
        >
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase group-hover:text-amber-600 transition-colors">
            <span>Em Aprovação</span>
            <FileCheck2 size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{task_stats.in_approval_tasks}</p>
          <p className="text-xs text-gray-500 mt-1">Aguardando cliente &bull; Clique para filtrar</p>
        </Link>

        <Link
          href="/tasks?filter=atrasadas"
          className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-red-300 hover:shadow-md transition-all group block"
          title="Ver tarefas atrasadas"
        >
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase group-hover:text-red-600 transition-colors">
            <span>Atrasadas</span>
            <ShieldAlert size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{task_stats.overdue_tasks}</p>
          <p className="text-xs text-gray-500 mt-1">Necessitam atenção &bull; Clique para filtrar</p>
        </Link>
      </div>

      {/* Financial Overview (If Admin) */}
      {financial && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-base text-gray-900">Painel Financeiro do Mês</h3>
              <p className="text-xs text-gray-500">Saldo consolidado, meta e fluxo de caixa</p>
            </div>
            <Link href="/finance" className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
              Ver Financeiro <ArrowRight size={14} />
            </Link>
          </div>

          {/* Meta de Receita (Barra de porcentagem, quanto falta, e valor que já entrou em negrito) */}
          {(() => {
            const goal = financial.monthly_revenue_goal || 50000;
            const entries = financial.current_month?.entries || 0;
            const pct = goal > 0 ? Math.min(100, Math.round((entries / goal) * 100)) : 0;
            const remaining = Math.max(0, goal - entries);

            return (
              <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/40 rounded-2xl border border-blue-100 mb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <div>
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Meta de Receita Mensal</span>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Já arrecadado:{' '}
                      <strong className="text-sm font-extrabold text-gray-900">
                        {formatCurrency(entries)}
                      </strong>
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-semibold text-gray-600">
                      Falta para a meta:{' '}
                      <span className="font-bold text-blue-700">{formatCurrency(remaining)}</span>
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">Meta Total: {formatCurrency(goal)}</p>
                  </div>
                </div>

                {/* Barra de porcentagem */}
                <div className="w-full bg-gray-200/80 h-3.5 rounded-full overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1 text-[9px] font-bold text-white leading-none shadow-sm"
                    style={{ width: `${Math.max(5, pct)}%` }}
                  >
                    {pct > 12 && `${pct}%`}
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500 mt-2 font-medium">
                  <span>Progresso: {pct}% atingido</span>
                  <span>{remaining === 0 ? '🎉 Parabéns, meta batida!' : `Restam ${formatCurrency(remaining)}`}</span>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xs text-gray-500 font-medium">Saldo em Contas</span>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(financial.total_balance)}</p>
              <div className="mt-2 text-[11px] text-gray-500 space-y-0.5">
                {financial.accounts?.map((acc: any) => (
                  <div key={acc.id} className="flex justify-between">
                    <span>{acc.name}:</span>
                    <span className="font-medium text-gray-700">{formatCurrency(acc.balance)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-800 font-medium">Entradas do Mês</span>
                <TrendingUp size={16} className="text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(financial.current_month?.entries)}</p>
              <p className="text-[11px] text-emerald-600/80 mt-1">
                A receber: <span className="font-semibold">{formatCurrency(financial.to_receive)}</span>
              </p>
            </div>

            <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-800 font-medium">Saídas do Mês</span>
                <TrendingDown size={16} className="text-red-600" />
              </div>
              <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(financial.current_month?.exits)}</p>
              <p className="text-[11px] text-red-600/80 mt-1">
                A pagar: <span className="font-semibold">{formatCurrency(financial.to_pay)}</span>
              </p>
            </div>

            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-800 font-medium">Resultado Líquido</span>
                <DollarSign size={16} className="text-blue-600" />
              </div>
              <p className={`text-xl font-bold mt-1 ${financial.current_month?.result >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatCurrency(financial.current_month?.result)}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Mês anterior: {formatCurrency(financial.previous_month?.result)}
              </p>
            </div>
          </div>

          {/* Partner Analytical Comparison (Sem ranking - Requisito 14 & 28) */}
          {partner_expenses && partner_expenses.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Movimentação por Sócio / Parceiro
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {partner_expenses.map((partner: any) => (
                  <div key={partner.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                    <p className="font-semibold text-gray-800">{partner.name}</p>
                    <div className="mt-2 flex justify-between text-gray-600">
                      <span>Despesas no mês:</span>
                      <span className="font-semibold text-red-600">{formatCurrency(partner.month_expenses)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 mt-0.5">
                      <span>Receitas atribuídas:</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(partner.month_entries)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Urgent Tasks + Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Urgent Tasks */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-gray-900">Próximas Entregas (Tarefas)</h3>
              <p className="text-xs text-gray-500">Listagem progressiva inicial (5 registros)</p>
            </div>
            <Link href="/tasks" className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
              Ver Kanban / Lista <ArrowRight size={14} />
            </Link>
          </div>

          <div className="divide-y divide-gray-100 flex-1">
            {urgent_tasks?.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Nenhuma tarefa pendente no momento!
              </div>
            ) : (
              urgent_tasks.map((task: any) => (
                <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: task.category_color || '#3b82f6' }}
                      />
                      <h4 className="font-semibold text-sm text-gray-900 truncate">{task.name}</h4>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium text-gray-700">{task.client_name || 'Sem cliente'}</span>
                      {task.category_name ? ` • ${task.category_name}` : ''}
                      {' • '}Prazo: <span className="font-medium text-gray-800">{formatDate(task.delivery_date)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      task.status === 'Em aprovação' ? 'bg-amber-100 text-amber-800' :
                      task.status === 'Em produção' ? 'bg-blue-100 text-blue-800' :
                      task.status === 'Em alteração' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                    <Link
                      href={`/tasks?id=${task.id}`}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Abrir tarefa"
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
            <Link href="/tasks" className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
              Carregar mais tarefas &rarr;
            </Link>
          </div>
        </div>

        {/* Right Col: Active Projects & Upcoming Agenda */}
        <div className="space-y-6">
          {/* Leads Recentes do CRM */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <Users size={16} className="text-blue-600" />
                Leads Recentes (CRM)
              </h3>
              <Link href="/crm" className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                Ver funil
              </Link>
            </div>

            <div className="space-y-3">
              {recent_leads?.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Nenhum lead no funil.</p>
              ) : (
                recent_leads.slice(0, 5).map((lead: any) => (
                  <button
                    key={lead.id}
                    onClick={() => openLeadEdit(lead)}
                    className="w-full text-left block p-3 bg-gray-50 hover:bg-blue-50/70 hover:border-blue-200 rounded-xl border border-gray-100 text-xs transition-all group"
                    title="Clique para ver ou editar lead"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900 truncate max-w-[180px] group-hover:text-blue-600 transition-colors">
                        {lead.contact_name}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {lead.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">
                      {lead.company || 'Pessoa Física'} • {lead.source || lead.platform || 'WhatsApp'}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Agenda Events - Click to edit or delete */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-gray-900">Agenda / Compromissos</h3>
              <Link href="/agenda" className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                Ver agenda
              </Link>
            </div>

            <div className="space-y-3">
              {upcoming_events?.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Nenhum compromisso próximo.</p>
              ) : (
                upcoming_events.map((evt: any) => (
                  <button
                    key={evt.id}
                    onClick={() => openEventEdit(evt)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50/70 hover:border-blue-200 rounded-xl border border-gray-100 text-xs flex items-start gap-3 transition-all group"
                    title="Clique para ver ou editar compromisso"
                  >
                    <div className="p-2 bg-blue-100 text-blue-800 rounded-lg font-bold text-center leading-none group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <span className="block text-[10px]">{evt.start_time}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {evt.title}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {formatDate(evt.event_date)} {evt.location ? `• ${evt.location}` : ''}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD: MODAL EDITAR LEAD */}
      {selectedDashboardLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Edit2 size={16} className="text-blue-600" />
                Editar Lead (CRM)
              </h3>
              <button
                onClick={() => setSelectedDashboardLead(null)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateDashboardLead} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Nome do Contato *</label>
                  <input
                    type="text"
                    required
                    value={editLeadForm.contact_name}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Empresa / Negócio</label>
                  <input
                    type="text"
                    value={editLeadForm.company}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={editLeadForm.phone}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Status do Funil</label>
                  <select
                    value={editLeadForm.status}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                  >
                    <option value="Novo">Novo</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Aguardando resposta">Aguardando resposta</option>
                    <option value="Sem resposta">Sem resposta</option>
                    <option value="Finalizado positivo">Finalizado positivo</option>
                    <option value="Finalizado negativo">Finalizado negativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Observações Internas</label>
                <textarea
                  rows={2}
                  value={editLeadForm.notes}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, notes: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleDeleteDashboardLead}
                  className="px-3 py-2 font-semibold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={14} />
                  Excluir Lead
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDashboardLead(null)}
                    className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition-colors"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DASHBOARD: MODAL EDITAR COMPROMISSO */}
      {selectedDashboardEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Edit2 size={16} className="text-blue-600" />
                Editar Compromisso da Agenda
              </h3>
              <button
                onClick={() => setSelectedDashboardEvent(null)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateDashboardEvent} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Título do Compromisso *</label>
                <input
                  type="text"
                  required
                  value={editEventForm.title}
                  onChange={(e) => setEditEventForm({ ...editEventForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={editEventForm.event_date}
                    onChange={(e) => setEditEventForm({ ...editEventForm, event_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Início *</label>
                  <input
                    type="time"
                    required
                    value={editEventForm.start_time}
                    onChange={(e) => setEditEventForm({ ...editEventForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Fim</label>
                  <input
                    type="time"
                    value={editEventForm.end_time}
                    onChange={(e) => setEditEventForm({ ...editEventForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Local / Link</label>
                <input
                  type="text"
                  value={editEventForm.location}
                  onChange={(e) => setEditEventForm({ ...editEventForm, location: e.target.value })}
                  placeholder="Ex: Estúdio A, Google Meet..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={editEventForm.notes}
                  onChange={(e) => setEditEventForm({ ...editEventForm, notes: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleDeleteDashboardEvent}
                  className="px-3 py-2 font-semibold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={14} />
                  Excluir Compromisso
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDashboardEvent(null)}
                    className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition-colors"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <MediaViewer
          isOpen={true}
          mediaList={selectedMedia.list}
          initialIndex={selectedMedia.index}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
}
