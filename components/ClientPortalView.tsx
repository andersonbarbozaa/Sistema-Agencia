'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  FileCheck2,
  Clock,
  CheckSquare,
  AlertTriangle,
  Search,
  Filter,
  LayoutList,
  LayoutGrid,
  Calendar,
  MessageSquare,
  Send,
  X,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Image as ImageIcon,
  PlayCircle,
  Paperclip,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Loader2,
  Building,
  ArrowLeftRight,
  User as UserIcon,
} from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import ModalPortal from '@/components/ModalPortal';

interface ClientPortalViewProps {
  initialTasks?: any[];
  user: any;
  counts?: {
    pending_tasks: number;
    awaiting_approval: number;
    completed_tasks: number;
  };
  onRefresh?: () => void;
}

export default function ClientPortalView({ initialTasks = [], user, counts }: ClientPortalViewProps) {
  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [monthFilter, setMonthFilter] = useState<string>('todos');
  const [yearFilter, setYearFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected task detail modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDetail, setTaskDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Comments
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [linkedClients, setLinkedClients] = useState<any[]>([]);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchingClient, setSwitchingClient] = useState(false);

  // Approval / Rejection / Change prompt
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | 'request_change';
    reason: string;
    submitting: boolean;
  }>({
    isOpen: false,
    type: 'approve',
    reason: '',
    submitting: false,
  });

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch / refresh all client tasks
  const refreshTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const d = await res.json();
        setTasks(d.tasks || d.data || []);
      }
    } catch (err) {
      console.error('Erro ao atualizar tarefas:', err);
    }
  };

  useEffect(() => {
    refreshTasks();
  }, []);

  // Load linked clients sharing the user's email
  useEffect(() => {
    async function loadLinkedClients() {
      try {
        const res = await fetch('/api/auth/switch-client');
        if (res.ok) {
          const json = await res.json();
          if (json.clients && json.clients.length > 1) {
            setLinkedClients(json.clients);
          }
        }
      } catch (err) {
        console.error('Error loading linked clients:', err);
      }
    }
    loadLinkedClients();
  }, []);

  const handleSwitchClient = async (clientId: string) => {
    try {
      setSwitchingClient(true);
      const res = await fetch('/api/auth/switch-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const json = await res.json();
        showToast(json.error || 'Erro ao trocar de empresa.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao comunicar com o servidor.', 'error');
    } finally {
      setSwitchingClient(false);
    }
  };

  // Fetch full task details when selected
  const openTask = async (id: string) => {
    setSelectedTaskId(id);
    setLoadingDetail(true);
    setCommentText('');
    try {
      const res = await fetch(`/api/tasks/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTaskDetail(data.task || data.data);
      } else {
        showToast('Não foi possível carregar os detalhes da tarefa.', 'error');
        setSelectedTaskId(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de conexão ao carregar tarefa.', 'error');
      setSelectedTaskId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Submit comment
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !commentText.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await fetch(`/api/tasks/${selectedTaskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      });

      if (res.ok) {
        const commentData = await res.json();
        const createdComment = commentData.comment || commentData.data || {
          id: 'c_' + Date.now(),
          user_name: user?.name || 'Você',
          content: commentText.trim(),
          type: 'general',
          created_at: new Date().toISOString(),
        };

        setTaskDetail((prev: any) =>
          prev
            ? {
                ...prev,
                comments: [...(prev.comments || []), createdComment],
              }
            : null
        );
        setCommentText('');
        showToast('Comentário enviado com sucesso!');
        refreshTasks();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao enviar comentário.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de conexão ao enviar comentário.', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle workflow action (Approve / Reject / Request Change)
  const handleExecuteAction = async () => {
    if (!selectedTaskId) return;

    if (actionModal.type === 'request_change' && !actionModal.reason.trim()) {
      showToast('Por favor, descreva detalhadamente as alterações necessárias.', 'error');
      return;
    }

    try {
      setActionModal((prev) => ({ ...prev, submitting: true }));

      const res = await fetch(`/api/tasks/${selectedTaskId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionModal.type,
          description: actionModal.reason.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const updatedStatus = data.status || (actionModal.type === 'approve' ? 'Aprovada' : 'Em alteração');

        // Update local task detail
        setTaskDetail((prev: any) =>
          prev ? { ...prev, status: updatedStatus } : null
        );

        // Update tasks list
        setTasks((prev) =>
          prev.map((t) => (t.id === selectedTaskId ? { ...t, status: updatedStatus } : t))
        );

        setActionModal({ isOpen: false, type: 'approve', reason: '', submitting: false });

        if (actionModal.type === 'approve') {
          showToast('🎉 Tarefa aprovada com sucesso!');
        } else if (actionModal.type === 'reject') {
          showToast('Tarefa reprovada e devolvida para a agência.');
        } else {
          showToast('Solicitação de alteração enviada para a agência!');
        }

        // Reload full details to bring updated timeline and comments
        openTask(selectedTaskId);
      } else {
        showToast(data.error || 'Erro ao processar ação na tarefa.', 'error');
        setActionModal((prev) => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de comunicação com o servidor.', 'error');
      setActionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Derived filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (task.name || '').toLowerCase().includes(q);
        const matchesDesc = (task.description || '').toLowerCase().includes(q);
        const matchesCat = (task.category_name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'todos') {
        const s = (task.status || '').toLowerCase();
        if (statusFilter === 'pendentes' && !s.includes('não iniciada') && !s.includes('pendente')) return false;
        if (statusFilter === 'em_producao' && !s.includes('produ')) return false;
        if (statusFilter === 'para_aprovacao' && (!s.includes('aprova') || s.includes('altera'))) return false;
        if (statusFilter === 'em_alteracao' && !s.includes('altera')) return false;
        if (statusFilter === 'concluidas' && !s.includes('conclu') && !s.includes('aprovad')) return false;
      }

      // 3. Month & Year Filter (based on delivery_date or created_at)
      const dateStr = task.delivery_date || task.created_at;
      if (dateStr) {
        const d = new Date(dateStr);
        if (monthFilter !== 'todos') {
          const taskMonth = String(d.getMonth() + 1).padStart(2, '0');
          if (taskMonth !== monthFilter) return false;
        }
        if (yearFilter !== 'todos') {
          const taskYear = String(d.getFullYear());
          if (taskYear !== yearFilter) return false;
        }
      } else if (monthFilter !== 'todos' || yearFilter !== 'todos') {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, statusFilter, monthFilter, yearFilter]);

  // Dynamic status badges
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('aprovad') || s === 'aprovada') {
      return { label: 'Aprovada', bg: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' };
    }
    if (s.includes('conclu') || s === 'concluída') {
      return { label: 'Concluída', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold', dot: 'bg-emerald-500' };
    }
    if (s.includes('altera')) {
      return { label: 'Em alteração', bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' };
    }
    if (s.includes('aprova')) {
      return { label: 'Para aprovação', bg: 'bg-amber-50 text-amber-700 border-amber-200 font-bold', dot: 'bg-amber-500' };
    }
    if (s.includes('produ')) {
      return { label: 'Em produção', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
    }
    return { label: status || 'Pendente', bg: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400' };
  };

  // Helper to extract clean image or preview URL
  const getTaskCoverUrl = (task: any) => {
    if (task.cover_image_url) {
      const url = task.cover_image_url;
      if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url) || url.startsWith('data:image')) {
        return url;
      }
      // If it's a YouTube link, generate standard high-res thumbnail
      const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (ytMatch) {
        return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-semibold mb-3 backdrop-blur-xs">
              <Sparkles size={14} className="text-yellow-300" />
              <span>Portal do Cliente • {user.client_name || user.workspace_name || 'Agência'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Olá, {user.name}!
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Acompanhe suas demandas criativas em tempo real, aprove conteúdos para publicação e solicite alterações diretamente com a equipe.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {linkedClients.length > 1 && (
              <button
                type="button"
                onClick={() => setShowSwitchModal(true)}
                className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-2xl text-xs font-bold border border-white/25 backdrop-blur-sm transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                title="Trocar de empresa ou conta vinculada"
              >
                <ArrowLeftRight size={15} />
                <span>Trocar Empresa ({linkedClients.length})</span>
              </button>
            )}

            <button
              onClick={() => {
                setStatusFilter('para_aprovacao');
              }}
              className="px-4 py-2.5 bg-white text-blue-800 hover:bg-blue-50 rounded-2xl text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
              <FileCheck2 size={16} className="text-amber-600" />
              <span>Aprovações Pendentes ({counts?.awaiting_approval || 0})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setStatusFilter(statusFilter === 'para_aprovacao' ? 'todos' : 'para_aprovacao')}
          className={cn(
            'p-5 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md bg-white',
            statusFilter === 'para_aprovacao' ? 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/30' : 'border-gray-200'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Aguardando Sua Aprovação</span>
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <FileCheck2 size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 mt-3">{counts?.awaiting_approval || 0}</p>
          <p className="text-[11px] text-gray-400 mt-1">Materiais prontos para sua revisão</p>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'em_producao' ? 'todos' : 'em_producao')}
          className={cn(
            'p-5 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md bg-white',
            statusFilter === 'em_producao' ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50/30' : 'border-gray-200'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Em Produção</span>
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <Clock size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-blue-600 mt-3">{counts?.pending_tasks || 0}</p>
          <p className="text-[11px] text-gray-400 mt-1">Demandas em criação pela equipe</p>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'concluidas' ? 'todos' : 'concluidas')}
          className={cn(
            'p-5 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md bg-white',
            statusFilter === 'concluidas' ? 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/30' : 'border-gray-200'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Concluídas & Aprovadas</span>
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckSquare size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 mt-3">{counts?.completed_tasks || 0}</p>
          <p className="text-[11px] text-gray-400 mt-1">Histórico completo de entregas</p>
        </div>
      </div>

      {/* Superior Controls & Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar por título, briefing ou categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Toggle View: Lista vs Cards (Estilo Trello) */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">Visualização:</span>
            <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 border border-gray-200/60">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                )}
                title="Visualização em Lista"
              >
                <LayoutList size={15} />
                <span>Lista</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                  viewMode === 'cards'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                )}
                title="Visualização em Cards (Estilo Trello)"
              >
                <LayoutGrid size={15} />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown Filters: Status, Mês, Ano */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-gray-400" />
            <span className="text-gray-500 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos os status</option>
              <option value="para_aprovacao">Aguardando Aprovação</option>
              <option value="em_producao">Em Produção</option>
              <option value="em_alteracao">Em Alteração</option>
              <option value="pendentes">Não Iniciadas / Pendentes</option>
              <option value="concluidas">Concluídas / Aprovadas</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-semibold">Mês:</span>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos os meses</option>
              <option value="01">Janeiro</option>
              <option value="02">Fevereiro</option>
              <option value="03">Março</option>
              <option value="04">Abril</option>
              <option value="05">Maio</option>
              <option value="06">Junho</option>
              <option value="07">Julho</option>
              <option value="08">Agosto</option>
              <option value="09">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-semibold">Ano:</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos os anos</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {(statusFilter !== 'todos' || monthFilter !== 'todos' || yearFilter !== 'todos' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('todos');
                setMonthFilter('todos');
                setYearFilter('todos');
                setSearchQuery('');
              }}
              className="px-2.5 py-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl font-semibold transition-colors"
            >
              Limpar filtros
            </button>
          )}

          <span className="ml-auto text-xs text-gray-400 font-medium">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'tarefa encontrada' : 'tarefas encontradas'}
          </span>
        </div>
      </div>

      {/* Main Content: Lista or Cards View */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <FileCheck2 size={32} />
          </div>
          <h3 className="text-base font-bold text-gray-900">Nenhuma tarefa encontrada</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Não foram encontradas demandas com os filtros selecionados. Tente ajustar o status, mês ou ano.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* ======================================================== */
        /* VISUALIZAÇÃO EM LISTA (Padrão)                           */
        /* ======================================================== */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredTasks.map((task) => {
              const badge = getStatusBadge(task.status);
              const coverUrl = getTaskCoverUrl(task);
              const isAwaitingApproval = (task.status || '').toLowerCase().includes('aprova') && !(task.status || '').toLowerCase().includes('altera');

              return (
                <div
                  key={task.id}
                  onClick={() => openTask(task.id)}
                  className={cn(
                    'p-4 sm:p-5 hover:bg-gray-50/80 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group',
                    isAwaitingApproval ? 'bg-amber-50/25 border-l-4 border-amber-500' : ''
                  )}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Thumbnail preview */}
                    <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                      {coverUrl ? (
                        <img src={coverUrl} alt={task.name} className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white font-bold text-base"
                          style={{ backgroundColor: task.category_color || '#3b82f6' }}
                        >
                          {(task.name || 'T').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: task.category_color || '#3b82f6' }}
                        />
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          {task.category_name || 'Geral'}
                        </span>
                        {task.media_links_count ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold">
                            <Paperclip size={11} /> {task.media_links_count} {task.media_links_count === 1 ? 'mídia' : 'mídias'}
                          </span>
                        ) : null}
                      </div>

                      <h4 className="font-bold text-sm sm:text-base text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                        {task.name}
                      </h4>

                      {task.description && (
                        <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                        <span className="flex items-center gap-1 font-medium text-gray-600">
                          <Calendar size={13} className="text-gray-400" />
                          Entrega: <strong className="text-gray-900">{formatDate(task.delivery_date)}</strong>
                        </span>
                        {task.comments_count ? (
                          <span className="flex items-center gap-1 text-gray-500">
                            <MessageSquare size={13} /> {task.comments_count}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    <span className={cn('px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border', badge.bg)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
                      {badge.label}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTask(task.id);
                      }}
                      className={cn(
                        'px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95',
                        isAwaitingApproval
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      )}
                    >
                      <span>{isAwaitingApproval ? 'Revisar & Aprovar' : 'Ver Detalhes'}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* VISUALIZAÇÃO EM CARDS (Estilo Trello)                     */
        /* ======================================================== */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredTasks.map((task) => {
            const badge = getStatusBadge(task.status);
            const coverUrl = getTaskCoverUrl(task);
            const isAwaitingApproval = (task.status || '').toLowerCase().includes('aprova') && !(task.status || '').toLowerCase().includes('altera');

            return (
              <div
                key={task.id}
                onClick={() => openTask(task.id)}
                className={cn(
                  'bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col overflow-hidden group hover:-translate-y-1',
                  isAwaitingApproval ? 'ring-2 ring-amber-400' : ''
                )}
              >
                {/* Imagem / Capa de Vídeo em Destaque */}
                <div className="w-full h-44 bg-gray-100 relative overflow-hidden border-b border-gray-100">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={task.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center text-white p-4 text-center"
                      style={{ backgroundColor: task.category_color || '#3b82f6' }}
                    >
                      <ImageIcon size={36} className="opacity-60 mb-2" />
                      <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                        {task.category_name || 'Arte Criativa'}
                      </span>
                    </div>
                  )}

                  {/* Top Overlay Badge */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md">
                      {task.category_name || 'Geral'}
                    </span>
                    <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-md shadow-sm', badge.bg)}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                      {task.name}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1 font-medium text-gray-700">
                      <Calendar size={13} className="text-gray-400" />
                      {formatDate(task.delivery_date)}
                    </span>

                    <div className="flex items-center gap-2">
                      {task.media_links_count ? (
                        <span className="flex items-center gap-0.5 text-blue-600 font-bold text-[11px]" title="Mídias anexadas">
                          <Paperclip size={12} /> {task.media_links_count}
                        </span>
                      ) : null}
                      {task.comments_count ? (
                        <span className="flex items-center gap-0.5 text-gray-400 font-medium text-[11px]" title="Comentários">
                          <MessageSquare size={12} /> {task.comments_count}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DETALHES DA TAREFA EXCLUSIVO DO CLIENTE             */}
      {/* ======================================================== */}
      {selectedTaskId && (
        <ModalPortal>
          <div
            onClick={() => setSelectedTaskId(null)}
            className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            >
              {loadingDetail || !taskDetail ? (
                <div className="p-16 text-center space-y-3">
                  <Loader2 size={36} className="animate-spin text-blue-600 mx-auto" />
                  <p className="text-xs text-gray-500 font-medium">Carregando detalhes e mídias da tarefa...</p>
                </div>
              ) : (
                <>
                  {/* Header do Modal */}
                  <div className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50/80 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider"
                          style={{ backgroundColor: taskDetail.category_color || '#3b82f6' }}
                        >
                          {taskDetail.category_name || 'Geral'}
                        </span>
                        <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold border', getStatusBadge(taskDetail.status).bg)}>
                          {getStatusBadge(taskDetail.status).label}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-snug">
                        {taskDetail.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <span>Prazo de Entrega: <strong className="text-gray-800">{formatDate(taskDetail.delivery_date)}</strong></span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(null)}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors"
                      title="Fechar janela"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Body do Modal */}
                  <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                    {/* Descrição / Briefing */}
                    {taskDetail.description && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                          Descrição / Briefing
                        </h4>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {taskDetail.description}
                        </div>
                      </div>
                    )}

                    {/* Galeria de Mídias / Links de Entrega */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1.5">
                        <Paperclip size={13} className="text-blue-600" />
                        <span>Mídias & Entregáveis Anexados ({taskDetail.media_links?.length || 0})</span>
                      </h4>

                      {!taskDetail.media_links || taskDetail.media_links.length === 0 ? (
                        <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                          Nenhum link ou arquivo anexado a esta tarefa até o momento.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {taskDetail.media_links.map((media: any) => {
                            const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(media.url) || media.url.startsWith('data:image');
                            const isYt = /(?:youtu\.be\/|youtube\.com)/i.test(media.url);

                            return (
                              <div
                                key={media.id}
                                className="p-3 bg-gray-50 hover:bg-blue-50/40 rounded-2xl border border-gray-200/80 transition-all flex items-center justify-between gap-3 group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 text-blue-600 shadow-2xs">
                                    {isImg ? <ImageIcon size={18} /> : isYt ? <PlayCircle size={18} className="text-red-600" /> : <Paperclip size={18} />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-xs text-gray-900 truncate">
                                      {media.description || media.media_type || 'Mídia da Tarefa'}
                                    </p>
                                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                      {media.url}
                                    </p>
                                  </div>
                                </div>

                                <a
                                  href={media.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-white group-hover:bg-blue-600 group-hover:text-white text-gray-700 border border-gray-200 group-hover:border-blue-600 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 flex items-center gap-1"
                                >
                                  <span>Abrir</span>
                                  <ExternalLink size={12} />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Timeline de Comentários e Alterações */}
                    <div className="pt-4 border-t border-gray-100">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                        <MessageSquare size={13} className="text-blue-600" />
                        <span>Histórico & Comentários da Tarefa ({taskDetail.comments?.length || 0})</span>
                      </h4>

                      <div className="space-y-3 max-h-56 overflow-y-auto pr-1 mb-4">
                        {!taskDetail.comments || taskDetail.comments.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">
                            Nenhum comentário registrado ainda. Envie uma mensagem abaixo para falar com a equipe.
                          </p>
                        ) : (
                          taskDetail.comments.map((comment: any) => {
                            const isChangeReq = comment.type === 'change_request' || comment.type === 'rejection';
                            const isApproval = comment.type === 'approval';

                            return (
                              <div
                                key={comment.id}
                                className={cn(
                                  'p-3 rounded-2xl text-xs border leading-relaxed',
                                  isApproval
                                    ? 'bg-teal-50 border-teal-200 text-teal-900'
                                    : isChangeReq
                                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                                    : 'bg-gray-50 border-gray-200 text-gray-800'
                                )}
                              >
                                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mb-1">
                                  <span className="flex items-center gap-1">
                                    <UserIcon size={12} />
                                    {comment.user_name || 'Usuário'}
                                  </span>
                                  <span>{formatDate(comment.created_at)}</span>
                                </div>
                                <p className="whitespace-pre-wrap">{comment.content}</p>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Campo para o Cliente Comentar */}
                      <form onSubmit={handleSendComment} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Adicione um comentário ou dúvida para a equipe da agência..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="flex-1 px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                        <button
                          type="submit"
                          disabled={submittingComment || !commentText.trim()}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                        >
                          {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          <span>Enviar</span>
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Footer com Ações Permitidas para o Cliente */}
                  <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <span className="text-xs text-gray-500 text-center sm:text-left">
                      Revise o material com atenção antes de aprovar.
                    </span>

                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {/* Botão Reprovar */}
                      <button
                        type="button"
                        onClick={() =>
                          setActionModal({
                            isOpen: true,
                            type: 'reject',
                            reason: '',
                            submitting: false,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors flex items-center gap-1.5"
                      >
                        <XCircle size={15} />
                        <span>Reprovar</span>
                      </button>

                      {/* Botão Solicitar Alteração */}
                      <button
                        type="button"
                        onClick={() =>
                          setActionModal({
                            isOpen: true,
                            type: 'request_change',
                            reason: '',
                            submitting: false,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors flex items-center gap-1.5"
                      >
                        <AlertTriangle size={15} />
                        <span>Solicitar Alteração</span>
                      </button>

                      {/* Botão Aprovar */}
                      <button
                        type="button"
                        onClick={() =>
                          setActionModal({
                            isOpen: true,
                            type: 'approve',
                            reason: '',
                            submitting: false,
                          })
                        }
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={16} />
                        <span>Aprovar Tarefa</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ======================================================== */}
      {/* MODAL DE CONFIRMAÇÃO DE AÇÃO (Aprovar / Alteração / Reprovar) */}
      {/* ======================================================== */}
      {actionModal.isOpen && (
        <ModalPortal>
          <div
            onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
            className="fixed inset-0 !m-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
                      actionModal.type === 'approve'
                        ? 'bg-emerald-100 text-emerald-700'
                        : actionModal.type === 'reject'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {actionModal.type === 'approve' ? (
                      <CheckCircle2 size={22} />
                    ) : actionModal.type === 'reject' ? (
                      <XCircle size={22} />
                    ) : (
                      <AlertTriangle size={22} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900">
                      {actionModal.type === 'approve'
                        ? 'Confirmar Aprovação'
                        : actionModal.type === 'reject'
                        ? 'Reprovar Tarefa'
                        : 'Solicitar Alterações'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {actionModal.type === 'approve'
                        ? 'O material será marcado como aprovado.'
                        : 'Descreva os motivos para a equipe de criação.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {actionModal.type === 'approve' ? (
                <p className="text-xs text-gray-600 mb-6 leading-relaxed">
                  Tem certeza que deseja aprovar este material? A equipe será notificada e a demanda será finalizada para veiculação/entrega.
                </p>
              ) : (
                <div className="space-y-2 mb-5">
                  <label className="block text-xs font-semibold text-gray-700">
                    O que precisa ser corrigido ou ajustado? *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Ex: Gostaria de alterar o texto do segundo parágrafo e trocar a imagem principal por uma foto mais clara..."
                    value={actionModal.reason}
                    onChange={(e) => setActionModal({ ...actionModal, reason: e.target.value })}
                    className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={handleExecuteAction}
                  disabled={actionModal.submitting}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50',
                    actionModal.type === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : actionModal.type === 'reject'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-amber-600 hover:bg-amber-500'
                  )}
                >
                  {actionModal.submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : actionModal.type === 'approve' ? (
                    'Sim, Aprovar'
                  ) : actionModal.type === 'reject' ? (
                    'Reprovar e Enviar'
                  ) : (
                    'Enviar Alterações'
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Toast Feedback */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200 backdrop-blur-md border text-white',
            toast.type === 'success' ? 'bg-emerald-600 border-emerald-500' : 'bg-red-600 border-red-500'
          )}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
      {/* ======================================================== */}
      {/* MODAL: TROCAR DE EMPRESA / CONTA                          */}
      {/* ======================================================== */}
      {showSwitchModal && (
        <ModalPortal>
          <div
            onClick={() => setShowSwitchModal(false)}
            className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200"
            >
              <button
                onClick={() => setShowSwitchModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <ArrowLeftRight size={22} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Trocar de Empresa / Conta</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Seu e-mail está vinculado a múltiplas empresas. Selecione qual conta deseja gerenciar agora:
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 my-4 max-h-[60vh] overflow-y-auto p-1">
                {linkedClients.map((c) => {
                  const isActive = c.id === user.client_id || c.name === user.client_name;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={switchingClient}
                      onClick={() => handleSwitchClient(c.id)}
                      className={`flex flex-col items-center p-3.5 rounded-2xl border-2 transition-all group text-center relative active:scale-95 ${
                        isActive
                          ? 'border-indigo-600 bg-indigo-50/60 shadow-sm'
                          : 'border-gray-100 hover:border-indigo-300 hover:bg-gray-50 bg-white'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-600" title="Conta ativa" />
                      )}
                      <div className={`w-16 h-16 rounded-full overflow-hidden border-2 mb-2 flex items-center justify-center shadow-xs transition-colors ${
                        isActive ? 'border-indigo-600 bg-indigo-100' : 'border-gray-200 group-hover:border-indigo-400 bg-gray-100'
                      }`}>
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-indigo-700">
                            {c.name?.charAt(0).toUpperCase() || 'C'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-700 line-clamp-2 leading-tight">
                        {c.name}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-semibold text-indigo-700 mt-1 bg-indigo-100 px-2 py-0.2 rounded-full">
                          Ativa
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowSwitchModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
