'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  List,
  Kanban,
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Film,
  Image as ImageIcon,
  FileText,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  X,
  UserPlus,
  Send,
  Sparkles,
} from 'lucide-react';
import { Task, TaskMediaLink, TaskComment, TaskStatus } from '@/types';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import MediaViewer from '@/components/MediaViewer';

const STATUS_COLUMNS: TaskStatus[] = [
  'Não iniciada',
  'Em produção',
  'Em aprovação',
  'Em alteração',
  'Aprovada',
  'Concluída',
];

export default function TasksPage() {
  const searchParams = useSearchParams();
  const initialTaskId = searchParams.get('id');

  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Task for Detail Modal
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Media Viewer state
  const [mediaViewerState, setMediaViewerState] = useState<{ list: TaskMediaLink[]; index: number } | null>(null);

  // New Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    client_id: '',
    category_id: '',
    delivery_date: '',
    value: 0,
    assignee_ids: [] as string[],
  });

  // Edit Task Modal
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editTaskForm, setEditTaskForm] = useState({
    name: '',
    description: '',
    client_id: '',
    category_id: '',
    delivery_date: '',
    value: 0,
    status: 'Não iniciada',
    assignee_ids: [] as string[],
  });

  // Change request description modal
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeDescription, setChangeDescription] = useState('');

  // New media modal inside task detail
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [newMedia, setNewMedia] = useState({ title: '', url: '', description: '', media_type: 'other' });

  // New comment input
  const [commentText, setCommentText] = useState('');

  // Initial load
  useEffect(() => {
    fetchInitialData();
    const handleOpenCreate = () => setShowCreateModal(true);
    window.addEventListener('open-create-task', handleOpenCreate);
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === 'true') {
      setShowCreateModal(true);
    }
    return () => window.removeEventListener('open-create-task', handleOpenCreate);
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [userRes, tasksRes, clientsRes, catRes, usersRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/tasks'),
        fetch('/api/clients'),
        fetch('/api/categories?type=tasks'),
        fetch('/api/users'),
      ]);

      if (userRes.ok) {
        const u = await userRes.json();
        setCurrentUser(u.user);
      }
      if (tasksRes.ok) {
        const t = await tasksRes.json();
        setTasks(t.tasks || t.data || []);
      }
      if (clientsRes.ok) {
        const c = await clientsRes.json();
        setClients(c.clients || c.data || []);
      }
      if (catRes.ok) {
        const ct = await catRes.json();
        setCategories(ct.task_categories || []);
      }
      if (usersRes.ok) {
        const usr = await usersRes.json();
        setUsers(usr.users || usr.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // If initialTaskId provided in URL, open it
  useEffect(() => {
    if (initialTaskId) {
      openTaskDetail(initialTaskId);
    }
  }, [initialTaskId]);

  const openTaskDetail = async (taskId: string) => {
    try {
      setLoadingDetail(true);
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTask(data.task || data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        if (selectedTask?.id === taskId) {
          openTaskDetail(taskId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.name || !newTask.client_id) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewTask({
          name: '',
          description: '',
          client_id: '',
          category_id: '',
          delivery_date: '',
          value: 0,
          assignee_ids: [],
        });
        // Reload tasks
        const tRes = await fetch('/api/tasks');
        if (tRes.ok) {
          const t = await tRes.json();
          setTasks(t.tasks || t.data || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditTask = (task: any) => {
    setEditTaskForm({
      name: task.name || task.title || '',
      description: task.description || '',
      client_id: task.client_id || '',
      category_id: task.category_id || '',
      delivery_date: task.delivery_date || task.due_date || '',
      value: task.value || 0,
      status: task.status || 'Não iniciada',
      assignee_ids: task.assignees ? task.assignees.map((a: any) => a.id) : [],
    });
    setShowEditTaskModal(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !editTaskForm.name || !editTaskForm.client_id) return;

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTaskForm),
      });

      if (res.ok) {
        setShowEditTaskModal(false);
        await openTaskDetail(selectedTask.id);
        const tRes = await fetch('/api/tasks');
        if (tRes.ok) {
          const t = await tRes.json();
          setTasks(t.tasks || t.data || []);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar tarefa.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async () => {
    if (!selectedTask) return;
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (res.ok) {
        openTaskDetail(selectedTask.id);
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, status: 'Aprovada' } : t));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestChange = async () => {
    if (!selectedTask || !changeDescription.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_change', description: changeDescription }),
      });
      if (res.ok) {
        setShowChangeRequestModal(false);
        setChangeDescription('');
        openTaskDetail(selectedTask.id);
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, status: 'Em alteração' } : t));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    const isCollab = currentUser?.role === 'COLABORADOR';

    if (isCollab) {
      const reason = prompt('Informe o motivo da solicitação de exclusão para o Administrador:');
      if (!reason) return;

      const res = await fetch(`/api/tasks/${selectedTask.id}/deletion-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', reason }),
      });
      if (res.ok) {
        alert('Solicitação de exclusão enviada ao Administrador.');
        openTaskDetail(selectedTask.id);
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, deletion_request_status: 'pending' } : t));
      }
    } else {
      if (!confirm('Deseja realmente excluir esta tarefa permanentemente?')) return;
      const res = await fetch(`/api/tasks/${selectedTask.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedTask(null);
        setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
      }
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newMedia.title || !newMedia.url) return;

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMedia),
      });
      if (res.ok) {
        setShowAddMediaModal(false);
        setNewMedia({ title: '', url: '', description: '', media_type: 'other' });
        openTaskDetail(selectedTask.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !commentText.trim()) return;

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText, type: 'comment' }),
      });
      if (res.ok) {
        setCommentText('');
        openTaskDetail(selectedTask.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calendar View month state
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const prevMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  };

  const todayMonth = () => {
    setCurrentMonthDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em produção':
        return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' };
      case 'Em aprovação':
        return { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' };
      case 'Em alteração':
        return { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' };
      case 'Aprovada':
        return { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' };
      case 'Concluída':
        return { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-700' };
      default:
        return { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-800' };
    }
  };

  const filterParam = searchParams.get('filter'); // 'abertas' | 'aprovacao' | 'atrasadas'
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filterParam === 'abertas') {
      if (t.status === 'Concluída' || t.status === 'Aprovada') return false;
    } else if (filterParam === 'aprovacao') {
      if (t.status !== 'Em aprovação') return false;
    } else if (filterParam === 'atrasadas') {
      if (t.status === 'Concluída' || t.status === 'Aprovada' || !t.delivery_date || t.delivery_date >= todayStr) return false;
    }

    if (statusFilter && t.status !== statusFilter) return false;
    if (clientFilter && t.client_id !== clientFilter) return false;
    if (categoryFilter && t.category_id !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || (t.client_name && t.client_name.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Quick Filter Active Banner */}
      {filterParam && (
        <div className="bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-blue-900 shadow-sm animate-in fade-in duration-150">
          <span className="font-semibold flex items-center gap-1.5">
            <Filter size={14} className="text-blue-600" />
            Filtro ativo do Dashboard:{' '}
            <strong className="underline">
              {filterParam === 'abertas' && 'Tarefas Abertas'}
              {filterParam === 'aprovacao' && 'Tarefas Em Aprovação'}
              {filterParam === 'atrasadas' && 'Tarefas Atrasadas'}
            </strong>
          </span>
          <Link
            href="/tasks"
            className="text-xs bg-blue-600 text-white font-bold px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
          >
            Ver Todas Sem Filtro
          </Link>
        </div>
      )}
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none text-gray-700"
          >
            <option value="">Todos os Status</option>
            {STATUS_COLUMNS.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* Client Filter (Admin/Collaborator) */}
          {currentUser?.role !== 'CLIENTE' && (
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none text-gray-700 max-w-[180px]"
            >
              <option value="">Todos os Clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none text-gray-700"
          >
            <option value="">Todas as Categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'tarefa' : 'tarefas'}
          </span>

          {/* View Mode switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              <List size={14} />
              Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              <Kanban size={14} />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              <CalendarIcon size={14} />
              Calendário
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: LIST VIEW (Default - Requisito 19 & 20) */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Tarefa</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Entrega</th>
                  <th className="py-3.5 px-4">Mídias</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      Nenhuma tarefa encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const isDeletionPending = task.deletion_request_status === 'pending';

                    return (
                      <tr
                        key={task.id}
                        className={cn(
                          'hover:bg-gray-50/80 transition-colors cursor-pointer',
                          isDeletionPending ? 'bg-red-50/60 opacity-60 text-red-900 border-l-4 border-red-500' : ''
                        )}
                        onClick={() => openTaskDetail(task.id)}
                      >
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: task.category_color || '#3b82f6' }}
                            />
                            <span className="truncate max-w-xs">{task.name}</span>
                            {isDeletionPending && (
                              <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">
                                Exclusão solicitada
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 truncate max-w-[140px]">
                          {task.client_name || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            task.status === 'Em aprovação' ? 'bg-amber-100 text-amber-800' :
                            task.status === 'Aprovada' ? 'bg-emerald-100 text-emerald-800' :
                            task.status === 'Em alteração' ? 'bg-orange-100 text-orange-800' :
                            task.status === 'Concluída' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {task.category_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {formatDate(task.delivery_date)}
                        </td>
                        <td className="py-3 px-4">
                          {task.media_links_count ? (
                            <span className="inline-flex items-center gap-1 text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
                              <Film size={12} />
                              {task.media_links_count}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {task.value ? formatCurrency(task.value) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openTaskDetail(task.id);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            Abrir
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: KANBAN VIEW (Requisito 21) */}
      {viewMode === 'kanban' && (
        <div className="flex flex-row gap-4 overflow-x-auto pb-6 items-start w-full">
          {STATUS_COLUMNS.map((colStatus) => {
            const columnTasks = filteredTasks.filter((t) => t.status === colStatus);

            return (
              <div
                key={colStatus}
                className="w-[280px] min-w-[280px] flex-shrink-0 bg-gray-100/80 rounded-2xl p-3.5 border border-gray-200 flex flex-col shadow-xs"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                    {colStatus}
                  </h3>
                  <span className="text-xs bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] pr-0.5">
                  {columnTasks.map((task) => {
                    const isDeletionPending = task.deletion_request_status === 'pending';

                    return (
                      <div
                        key={task.id}
                        onClick={() => openTaskDetail(task.id)}
                        className={cn(
                          'bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group',
                          isDeletionPending ? 'bg-red-50/70 border-red-300 opacity-60' : ''
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-white"
                            style={{ backgroundColor: task.category_color || '#3b82f6' }}
                          >
                            {task.category_name || 'Geral'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {formatDate(task.delivery_date)}
                          </span>
                        </div>

                        <h4 className="font-semibold text-xs text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {task.name}
                        </h4>

                        <p className="text-[11px] text-gray-500 mt-1 truncate">
                          {task.client_name}
                        </p>

                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                          {task.media_links_count ? (
                            <span className="flex items-center gap-1 text-blue-600 font-medium">
                              <Film size={12} /> {task.media_links_count}
                            </span>
                          ) : <span />}

                          {task.comments_count ? (
                            <span className="flex items-center gap-1 text-gray-400">
                              <MessageSquare size={12} /> {task.comments_count}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                      Nenhuma tarefa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900 capitalize">
                {currentMonthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Calendário mensal com prazos de entrega e cores de status
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={todayMonth}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={nextMonth}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Calendar Table Grid */}
          <div className="overflow-x-auto -mx-2 sm:mx-0 pb-2">
            <div className="min-w-[650px] grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="bg-gray-50 py-2.5 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                  {day}
                </div>
              ))}

            {(() => {
              const year = currentMonthDate.getFullYear();
              const month = currentMonthDate.getMonth();
              const firstDayOfWeek = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const daysInPrevMonth = new Date(year, month, 0).getDate();

              const cells = [];

              // Leading blank/prev month days
              for (let i = 0; i < firstDayOfWeek; i++) {
                const prevDayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
                cells.push(
                  <div key={`prev-${i}`} className="bg-gray-50/60 min-h-[110px] p-1.5 opacity-40">
                    <span className="text-[11px] font-medium text-gray-400">{prevDayNum}</span>
                  </div>
                );
              }

              // Days of current month
              for (let day = 1; day <= daysInMonth; day++) {
                const monthStr = String(month + 1).padStart(2, '0');
                const dayStr = String(day).padStart(2, '0');
                const cellDateStr = `${year}-${monthStr}-${dayStr}`;
                const isToday = cellDateStr === todayStr;

                const dayTasks = filteredTasks.filter((t) => {
                  if (!t.delivery_date) return false;
                  return t.delivery_date.startsWith(cellDateStr);
                });

                cells.push(
                  <div
                    key={`day-${day}`}
                    className={cn(
                      'bg-white min-h-[110px] p-2 flex flex-col justify-between transition-colors hover:bg-blue-50/20',
                      isToday ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/10' : ''
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={cn(
                        'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full',
                        isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
                      )}>
                        {day}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-[10px] font-bold text-gray-400">
                          {dayTasks.length} {dayTasks.length === 1 ? 'tarefa' : 'tarefas'}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[120px]">
                      {dayTasks.map((task) => {
                        const style = getStatusColor(task.status);
                        return (
                          <div
                            key={task.id}
                            onClick={() => openTaskDetail(task.id)}
                            className={cn(
                              'p-1.5 rounded-lg border text-left cursor-pointer transition-all hover:shadow-xs',
                              style.bg,
                              style.border
                            )}
                          >
                            <div className="mb-0.5">
                              <span className={cn('text-[9px] font-bold px-1 py-0.2 rounded', style.badge)}>
                                {task.status}
                              </span>
                            </div>
                            <p className="font-semibold text-[11px] text-gray-900 leading-tight line-clamp-1">
                              {task.name}
                            </p>
                            {task.client_name && (
                              <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                {task.client_name}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Trailing padding to complete 7-columns
              const totalCells = cells.length;
              const remaining = (7 - (totalCells % 7)) % 7;
              for (let i = 1; i <= remaining; i++) {
                cells.push(
                  <div key={`next-${i}`} className="bg-gray-50/60 min-h-[110px] p-1.5 opacity-40">
                    <span className="text-[11px] font-medium text-gray-400">{i}</span>
                  </div>
                );
              }

              return cells;
            })()}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TASK DETAIL MODAL / DRAWER                               */}
      {/* ======================================================== */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-gray-50">
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider"
                    style={{ backgroundColor: selectedTask.category_color || '#3b82f6' }}
                  >
                    {selectedTask.category_name || 'Geral'}
                  </span>
                  <span className="text-xs text-gray-500">ID: {selectedTask.id}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  {selectedTask.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Cliente: <span className="font-semibold text-gray-800">{selectedTask.client_name}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditTask(selectedTask)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Edit2 size={13} /> EDITAR TAREFA
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Deletion Pending Alert */}
              {selectedTask.deletion_request_status === 'pending' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-red-800">Exclusão Solicitada</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      Esta tarefa está aguardando revisão do administrador para ser excluída ou mantida.
                    </p>
                    {currentUser?.role === 'ADMINISTRADOR' && (
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={handleDeleteTask}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
                        >
                          Aprovar Exclusão
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status and Action Buttons */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">Status Atual:</span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateStatus(selectedTask.id, e.target.value as TaskStatus)}
                    className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-300 rounded-lg shadow-sm"
                  >
                    {STATUS_COLUMNS.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Client Approval Controls (Requisito 22) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApprove}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    APROVAR
                  </button>
                  <button
                    onClick={() => setShowChangeRequestModal(true)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    SOLICITAR ALTERAÇÃO
                  </button>
                </div>
              </div>

              {/* Task Details Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-500 font-medium">Prazo de Entrega:</span>
                  <p className="font-bold text-gray-900 mt-1">{formatDate(selectedTask.delivery_date)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-500 font-medium">Valor do Serviço:</span>
                  <p className="font-bold text-gray-900 mt-1">
                    {selectedTask.value ? formatCurrency(selectedTask.value) : 'Não informado'}
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Descrição / Briefing</h4>
                  <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedTask.description}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* MEDIA LINKS SECTION (Requisitos 5, 6, 62)                */}
              {/* ======================================================== */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Mídias e Entregáveis
                    </h4>
                    <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                      {selectedTask.media?.length || 0}
                    </span>
                  </div>

                  {currentUser?.role !== 'CLIENTE' && (
                    <button
                      onClick={() => setShowAddMediaModal(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      <Plus size={14} /> Adicionar Link
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {!selectedTask.media || selectedTask.media.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
                      Nenhum link de mídia anexado a esta tarefa.
                    </div>
                  ) : (
                    selectedTask.media.map((med: TaskMediaLink, idx: number) => (
                      <div
                        key={med.id}
                        onClick={() => setMediaViewerState({ list: selectedTask.media, index: idx })}
                        className="p-3.5 bg-gray-50 hover:bg-blue-50/60 border border-gray-200 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 bg-white border border-gray-200 rounded-lg text-blue-600 flex-shrink-0">
                            {med.media_type === 'video' ? <Film size={18} /> : med.media_type === 'image' ? <ImageIcon size={18} /> : <FileText size={18} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                              {med.title}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              {med.url}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 text-[11px] font-semibold rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            Visualizar
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ======================================================== */}
              {/* COMMENTS & TIMELINE (Requisito 22)                       */}
              {/* ======================================================== */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Comentários e Histórico de Alterações
                </h4>

                <div className="space-y-3 mb-4">
                  {selectedTask.comments?.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3 text-center">Nenhum comentário registrado.</p>
                  ) : (
                    selectedTask.comments?.map((c: TaskComment) => (
                      <div
                        key={c.id}
                        className={cn(
                          'p-3.5 rounded-xl border text-xs leading-relaxed',
                          c.type === 'change_request' ? 'bg-amber-50/60 border-amber-200 text-amber-900' :
                          c.type === 'approval' ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' :
                          'bg-gray-50 border-gray-200 text-gray-800'
                        )}
                      >
                        <div className="flex items-center justify-between font-semibold mb-1">
                          <span>{c.user_name || 'Usuário'}</span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            {formatDate(c.created_at)}
                          </span>
                        </div>
                        <p>{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add comment box */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Escreva um comentário ou feedback..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Send size={14} /> Enviar
                  </button>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                onClick={handleDeleteTask}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                {currentUser?.role === 'COLABORADOR' ? 'Solicitar Exclusão' : 'Excluir Tarefa'}
              </button>

              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SOLICITAR ALTERAÇÃO (Obrigatório descrever)       */}
      {/* ======================================================== */}
      {showChangeRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 mb-1">Solicitar Alteração</h3>
            <p className="text-xs text-gray-500 mb-4">
              Descreva detalhadamente o que a equipe da agência precisa ajustar.
            </p>

            <textarea
              rows={4}
              placeholder="Descreva o que precisa ser alterado..."
              value={changeDescription}
              onChange={(e) => setChangeDescription(e.target.value)}
              required
              className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowChangeRequestModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRequestChange}
                disabled={!changeDescription.trim()}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl shadow-sm"
              >
                Enviar Solicitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADICIONAR LINK DE MÍDIA                           */}
      {/* ======================================================== */}
      {showAddMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 mb-1">Adicionar Link de Mídia</h3>
            <p className="text-xs text-gray-500 mb-4">
              Insira o link externo (YouTube, Google Drive, Dropbox, Vimeo, etc.).
            </p>

            <form onSubmit={handleAddMedia} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título do Arquivo</label>
                <input
                  type="text"
                  placeholder="Ex: Vídeo corte 1, Arte de capa..."
                  value={newMedia.title}
                  onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">URL / Link Externo</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newMedia.url}
                  onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Mídia</label>
                <select
                  value={newMedia.media_type}
                  onChange={(e) => setNewMedia({ ...newMedia, media_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="other">Auto-detectar pelo link</option>
                  <option value="video">Vídeo</option>
                  <option value="image">Imagem</option>
                  <option value="document">Documento / PDF</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddMediaModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm"
                >
                  Salvar Mídia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CRIAR NOVA TAREFA                                 */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1 pr-6">Criar Nova Tarefa</h3>
            <p className="text-xs text-gray-500 mb-5">
              Cadastre a demanda criativa. O prazo de entrega é exclusivo da produção.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome da Tarefa *</label>
                <input
                  type="text"
                  placeholder="Ex: Edição vídeo institucional 60s"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente *</label>
                  <select
                    value={newTask.client_id}
                    onChange={(e) => setNewTask({ ...newTask, client_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione o Cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria</label>
                  <select
                    value={newTask.category_id}
                    onChange={(e) => setNewTask({ ...newTask, category_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione Categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Prazo de Entrega</label>
                  <input
                    type="date"
                    value={newTask.delivery_date}
                    onChange={(e) => setNewTask({ ...newTask, delivery_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Valor do Serviço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newTask.value || ''}
                    onChange={(e) => setNewTask({ ...newTask, value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Responsáveis</label>
                <select
                  multiple
                  value={newTask.assignee_ids}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                    setNewTask({ ...newTask, assignee_ids: selected });
                  }}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none h-20"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.position_name || u.role})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-400">Segure Ctrl para selecionar múltiplos responsáveis</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição / Roteiro</label>
                <textarea
                  rows={3}
                  placeholder="Instruções de edição, formato, requisitos..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm"
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDITAR TAREFA                                      */}
      {/* ======================================================== */}
      {showEditTaskModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowEditTaskModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Edit2 size={18} className="text-blue-600" />
              Editar Dados da Tarefa
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              Altere os parâmetros da tarefa, cliente, responsáveis ou prazo de entrega.
            </p>

            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome da Tarefa *</label>
                <input
                  type="text"
                  required
                  value={editTaskForm.name}
                  onChange={(e) => setEditTaskForm({ ...editTaskForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente *</label>
                  <select
                    value={editTaskForm.client_id}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, client_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione o Cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria</label>
                  <select
                    value={editTaskForm.category_id}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione Categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={editTaskForm.status}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {STATUS_COLUMNS.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Prazo de Entrega</label>
                  <input
                    type="date"
                    value={editTaskForm.delivery_date}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, delivery_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editTaskForm.value}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Responsáveis</label>
                <select
                  multiple
                  value={editTaskForm.assignee_ids}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                    setEditTaskForm({ ...editTaskForm, assignee_ids: selected });
                  }}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none h-20"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.position_name || u.role})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-400">Segure Ctrl para selecionar múltiplos responsáveis</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição / Roteiro</label>
                <textarea
                  rows={3}
                  value={editTaskForm.description}
                  onChange={(e) => setEditTaskForm({ ...editTaskForm, description: e.target.value })}
                  className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditTaskModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MediaViewer Overlay */}
      {mediaViewerState && (
        <MediaViewer
          isOpen={true}
          mediaList={mediaViewerState.list}
          initialIndex={mediaViewerState.index}
          onClose={() => setMediaViewerState(null)}
        />
      )}
    </div>
  );
}
