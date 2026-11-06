'use client';

import { useState, useEffect, useRef } from 'react';
import ModalPortal from '@/components/ModalPortal';
import SafeModalBackdrop from '@/components/SafeModalBackdrop';
import ConfirmModal from '@/components/ConfirmModal';
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
  Check,
} from 'lucide-react';
import { Task, TaskMediaLink, TaskComment, TaskStatus } from '@/types';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { detectMediaType } from '@/lib/media';
import MediaViewer from '@/components/MediaViewer';
import TaskTimeTracker from '@/components/TaskTimeTracker';
import RichTextEditor from '@/components/RichTextEditor';
import ClientPortalView from '@/components/ClientPortalView';

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

  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'danger' as 'danger' | 'warning' });
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [customCalendars, setCustomCalendars] = useState<any[]>([]);

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskCol, setDragOverTaskCol] = useState<string | null>(null);
  const isDraggingTaskRef = useRef<boolean>(false);
  const dragMouseStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handler = () => setShowCreateModal(true);
    window.addEventListener('open-new-task', handler);
    return () => window.removeEventListener('open-new-task', handler);
  }, []);

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

  // Floating Status Dropdown state
  const [statusMenuState, setStatusMenuState] = useState<{
    taskId: string;
    currentStatus: TaskStatus;
    x: number;
    y: number;
    openUpward: boolean;
  } | null>(null);

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
    visibility: 'grupo',
    calendar_id: '',
    media_url: '',
    media_type: 'other',
    media_title: '',
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
    visibility: 'grupo',
    calendar_id: '',
    assignee_ids: [] as string[],
  });

  const isNewTaskDirty = Boolean(
    newTask.name.trim() ||
    newTask.description.trim() ||
    newTask.client_id ||
    newTask.category_id ||
    newTask.delivery_date ||
    newTask.value > 0 ||
    newTask.assignee_ids.length > 0 ||
    newTask.media_url.trim()
  );

  const handleCloseCreateTaskModal = () => {
    const doClose = () => {
      setShowCreateModal(false);
      setNewTask({
        name: '',
        description: '',
        client_id: '',
        category_id: '',
        delivery_date: '',
        value: 0,
        assignee_ids: [],
        visibility: 'grupo',
        calendar_id: '',
        media_url: '',
        media_type: 'other',
        media_title: '',
      });
    };

    if (isNewTaskDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar nova tarefa?',
        message: 'Você possui dados preenchidos para a nova tarefa. Se fechar agora, todas as informações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          doClose();
        },
      } as any);
      return;
    }
    doClose();
  };

  const [initialEditTaskState, setInitialEditTaskState] = useState('');
  const isEditTaskDirty = Boolean(initialEditTaskState && JSON.stringify(editTaskForm) !== initialEditTaskState);

  const handleCloseEditTaskModal = () => {
    if (isEditTaskDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar alterações?',
        message: 'Você possui alterações não salvas na tarefa. Se fechar agora, todas as alterações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          setShowEditTaskModal(false);
        },
      } as any);
      return;
    }
    setShowEditTaskModal(false);
  };

  // Change request description modal
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeDescription, setChangeDescription] = useState('');

  // New media modal inside task detail
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [newMedia, setNewMedia] = useState({ title: '', url: '', description: '', media_type: 'other' });

  // New comment input
  const [commentText, setCommentText] = useState('');

  // Assignees Dropdown States
  const [showCreateAssigneeDropdown, setShowCreateAssigneeDropdown] = useState(false);
  const [showEditAssigneeDropdown, setShowEditAssigneeDropdown] = useState(false);

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
      const [userRes, tasksRes, clientsRes, catRes, usersRes, calRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/tasks'),
        fetch('/api/clients'),
        fetch('/api/categories?type=tasks'),
        fetch('/api/users'),
        fetch('/api/custom-calendars'),
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
      if (calRes && calRes.ok) {
        const cd = await calRes.json();
        setCustomCalendars(cd.data || []);
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
    if (!taskId) return;
    const cleanId = taskId.toString().replace(/^task-/, '');

    // Abre instantaneamente com dados em cache local se existirem
    const cachedTask = tasks.find((t) => t.id === cleanId || t.id === taskId);
    if (cachedTask) {
      const normalizedMedia = (cachedTask as any).media || (cachedTask as any).media_links || [];
      setSelectedTask({
        ...cachedTask,
        media: normalizedMedia,
        media_links: normalizedMedia,
        comments: (cachedTask as any).comments || [],
        assignees: (cachedTask as any).assignees || [],
      });
    }

    try {
      setLoadingDetail(true);
      const res = await fetch(`/api/tasks/${cleanId}`);
      if (res.ok) {
        const data = await res.json();
        const taskData = data.task || data;
        const normalizedMedia = taskData.media || taskData.media_links || [];
        setSelectedTask((prev: any) => ({
          ...(prev || {}),
          ...taskData,
          media: normalizedMedia,
          media_links: normalizedMedia,
        }));
      }
    } catch (err) {
      console.error('Erro ao abrir detalhes da tarefa:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    const previousTasks = tasks;
    // Atualização otimista imediata para resposta visual instantânea ao arrastar
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev: any) => prev ? { ...prev, status: newStatus } : null);
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setTasks(previousTasks);
      } else if (selectedTask?.id === taskId) {
        openTaskDetail(taskId);
      }
    } catch (err) {
      console.error(err);
      setTasks(previousTasks);
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
          visibility: 'grupo',
          calendar_id: '',
          assignee_ids: [],
          media_url: '',
          media_type: 'other',
          media_title: '',
        });
        // Reload tasks
        const tRes = await fetch('/api/tasks');
        if (tRes.ok) {
          const t = await tRes.json();
          setTasks(t.tasks || t.data || []);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Erro ao criar tarefa.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao criar tarefa.');
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
      visibility: task.visibility || 'grupo',
      calendar_id: task.calendar_id || '',
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
      setConfirmState({
        isOpen: true,
        title: 'Confirmar Exclusão',
        message: 'Deseja realmente excluir esta tarefa permanentemente?',
        type: 'danger',
        onConfirm: async () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          const res = await fetch(`/api/tasks/${selectedTask.id}`, { method: 'DELETE' });
          if (res.ok) {
            setSelectedTask(null);
            setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
          }
        }
      });
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newMedia.url?.trim()) return;

    try {
      const detectedType = newMedia.media_type && newMedia.media_type !== 'other'
        ? newMedia.media_type
        : detectMediaType(newMedia.url);

      const titleToSend = newMedia.title?.trim() || (detectedType === 'video' ? 'Vídeo da Tarefa' : detectedType === 'image' ? 'Imagem da Tarefa' : 'Arquivo da Tarefa');

      const cleanId = (selectedTask.id || '').toString().replace(/^task-/, '');
      const res = await fetch(`/api/tasks/${cleanId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMedia,
          url: newMedia.url.trim(),
          title: titleToSend,
          media_type: detectedType,
        }),
      });

      if (res.ok) {
        setShowAddMediaModal(false);
        setNewMedia({ title: '', url: '', description: '', media_type: 'other' });
        await openTaskDetail(cleanId);
        const tRes = await fetch('/api/tasks');
        if (tRes.ok) {
          const t = await tRes.json();
          setTasks(t.tasks || t.data || []);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Erro ao adicionar link de mídia.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o servidor para adicionar mídia.');
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!selectedTask) return;
    if (!confirm('Deseja realmente remover este anexo de mídia?')) return;

    try {
      const cleanId = (selectedTask.id || '').toString().replace(/^task-/, '');
      const res = await fetch(`/api/tasks/${cleanId}/media/${mediaId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await openTaskDetail(cleanId);
        const tRes = await fetch('/api/tasks');
        if (tRes.ok) {
          const t = await tRes.json();
          setTasks(t.tasks || t.data || []);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Erro ao remover mídia.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao excluir mídia.');
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

  const getTaskStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Concluída':
      case 'Finalizada':
        return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold';
      case 'Aprovada':
        return 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-semibold';
      case 'Em aprovação':
        return 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-semibold';
      case 'Em alteração':
        return 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold';
      case 'Em produção':
        return 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800 font-semibold';
      case 'Atrasada':
      case 'Atrasado':
        return 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 font-semibold';
      case 'Não iniciada':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold';
    }
  };

  const getCategoryTextColor = (hexColor?: string) => {
    if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
    try {
      let hex = hexColor.replace('#', '');
      if (hex.length === 3) {
        hex = hex.split('').map((c) => c + c).join('');
      }
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 165 ? '#1e293b' : '#ffffff';
    } catch {
      return '#ffffff';
    }
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'Concluída':
      case 'Finalizada':
        return 'bg-emerald-500 text-white';
      case 'Aprovada':
        return 'bg-blue-500 text-white';
      case 'Em aprovação':
        return 'bg-purple-500 text-white';
      case 'Em alteração':
        return 'bg-amber-500 text-white';
      case 'Em produção':
        return 'bg-yellow-500 text-white';
      case 'Atrasada':
        return 'bg-red-500 text-white';
      case 'Não iniciada':
      default:
        return 'bg-slate-400 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluída':
      case 'Finalizada':
        return { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold' };
      case 'Aprovada':
        return { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold' };
      case 'Em aprovação':
        return { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-300 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 font-bold' };
      case 'Em alteração':
        return { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold' };
      case 'Em produção':
        return { bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-300 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-300', badge: 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200 font-bold' };
      default:
        return { bg: 'bg-slate-50 dark:bg-slate-800/40', border: 'border-slate-300 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold' };
    }
  };

  const filterParam = searchParams.get('filter'); // 'abertas' | 'aprovacao' | 'atrasadas'
  const todayStr = new Date().toISOString().split('T')[0];

  const isTaskOverdue = (t: any) => {
    const s = (t.status || '').toLowerCase();
    if (s.includes('atrasad')) return true;

    const isConcluded = s.includes('conclu') || s.includes('aprovad');

    // Rule: Quando a tarefa é finalizada/concluída e tem valor, se não foi marcado como pago, entra como atrasada
    if (isConcluded) {
      if ((t.value && Number(t.value) > 0) || t.financial_id) {
        if (!t.financial_status || t.financial_status.toLowerCase() !== 'pago') {
          return true;
        }
      }
      return false;
    }

    // Rule: Não concluída e data de vencimento anterior a hoje
    if (!t.delivery_date) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = String(t.delivery_date).split('T')[0].split('-').map(Number);
    if (!y || !m || !d) return false;
    const delivery = new Date(y, m - 1, d);
    return delivery.getTime() < today.getTime();
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const s = (t.status || '').toLowerCase();
    if (filterParam === 'abertas') {
      if (s.includes('conclu') || s.includes('aprovad')) return false;
    } else if (filterParam === 'aprovacao') {
      if (!s.includes('aprova') || s.includes('altera')) return false;
    } else if (filterParam === 'atrasadas') {
      if (!isTaskOverdue(t)) return false;
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

  // Ordenação: Seguir a data de entrega, da mais próxima da data atual para a mais antiga
  filteredTasks.sort((a, b) => {
    const rawDateA = a.delivery_date || (a as any).due_date;
    const rawDateB = b.delivery_date || (b as any).due_date;

    // Tarefas sem data de entrega ficam no final
    if (!rawDateA && !rawDateB) return (a.name || '').localeCompare(b.name || '');
    if (!rawDateA) return 1;
    if (!rawDateB) return -1;

    const timeA = new Date(rawDateA.split('T')[0] + 'T00:00:00').getTime();
    const timeB = new Date(rawDateB.split('T')[0] + 'T00:00:00').getTime();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const ONE_DAY = 1000 * 60 * 60 * 24;

    const diffDaysA = Math.round((timeA - today) / ONE_DAY);
    const diffDaysB = Math.round((timeB - today) / ONE_DAY);

    const getScore = (diff: number, task: any) => {
      const isDone = (task.status || '').toLowerCase().includes('conclu') || (task.status || '').toLowerCase().includes('aprovad');
      // Concluídas com data passada vão para o final
      if (isDone && diff < 0) {
        return 100000 + Math.abs(diff);
      }
      // Atrasadas não concluídas (diff < 0): urgência máxima por proximidade a hoje (ontem = 0.5, anteontem = 1.5)
      if (diff < 0) {
        return Math.abs(diff) - 0.5;
      }
      // Hoje (diff = 0) e datas futuras próximas (diff = 1, 2, 3...): mais próximas primeiro
      return diff;
    };

    const scoreA = getScore(diffDaysA, a);
    const scoreB = getScore(diffDaysB, b);

    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }

    return (a.name || '').localeCompare(b.name || '');
  });

  if (currentUser?.role === 'CLIENTE') {
    return (
      <ClientPortalView
        initialTasks={tasks}
        user={currentUser}
        onRefresh={fetchInitialData}
        mode="tasks"
      />
    );
  }

  return (
    <div className="space-y-6 w-full px-[10px]">
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
                <option key={c.id} value={c.id}>
                  {c.company_name || c.trade_name || c.corporate_name || c.name}
                </option>
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-xs whitespace-nowrap">
              <colgroup>
                <col className="w-[28%] min-w-[200px]" />
                <col className="w-[16%] min-w-[120px]" />
                <col className="w-[20%] min-w-[170px]" />
                <col className="w-[14%] min-w-[110px]" />
                <col className="w-[11%] min-w-[80px]" />
                <col className="w-[11%] min-w-[85px]" />
              </colgroup>
              <thead className="bg-gray-50/90 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 hidden md:table-header-group text-[11px] font-semibold uppercase tracking-wider h-8">
                <tr>
                  <th className="py-2 px-3 align-middle">Tarefa</th>
                  <th className="py-2 px-3 align-middle">Cliente</th>
                  <th className="py-2 px-3 align-middle">Status</th>
                  <th className="py-2 px-3 align-middle">Categorias</th>
                  <th className="py-2 px-3 align-middle">Valor</th>
                  <th className="py-2 px-3 align-middle">Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 flex flex-col md:table-row-group">
                {filteredTasks.length === 0 ? (
                  <tr className="block md:table-row">
                    <td colSpan={6} className="p-8 text-center text-gray-400 block md:table-cell">
                      Nenhuma tarefa encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const isDeletionPending = task.deletion_request_status === 'pending';
                    const isOverdue = Boolean(isTaskOverdue(task));
                    const catObj = categories.find((c) => c.id === task.category_id || c.name === task.category_name);
                    const catColor = task.category_color || catObj?.color || '#3b82f6';
                    const catName = task.category_name || catObj?.name;

                    return (
                      <tr
                        key={task.id}
                        className={cn(
                          'transition-colors cursor-pointer flex flex-col md:table-row h-auto md:h-10 md:max-h-10 border-b border-gray-100 dark:border-gray-800',
                          isDeletionPending
                            ? 'bg-red-50/60 dark:bg-red-950/20 opacity-60 text-red-900 dark:text-red-300 border-l-4 border-red-500 hover:bg-red-100/50'
                            : 'bg-white dark:bg-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-750'
                        )}
                        onClick={() => openTaskDetail(task.id)}
                      >
                        {/* MOBILE VIEW */}
                        <td className="md:hidden flex flex-col gap-1 w-full py-2 px-3">
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {/* Bolinha interativa de status mobile */}
                              <button
                                type="button"
                                title={`Status: ${task.status}. Clique para alterar`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (statusMenuState?.taskId === task.id) {
                                    setStatusMenuState(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const openUpward = rect.bottom + 240 > (typeof window !== 'undefined' ? window.innerHeight : 800);
                                    setStatusMenuState({
                                      taskId: task.id,
                                      currentStatus: task.status,
                                      x: rect.left,
                                      y: openUpward ? rect.top - 8 : rect.bottom + 6,
                                      openUpward,
                                    });
                                  }
                                }}
                                className={cn(
                                  "w-4 h-4 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-transform hover:scale-110 active:scale-95 cursor-pointer",
                                  getStatusDotColor(task.status)
                                )}
                              >
                                {task.status === 'Concluída' && (
                                  <Check size={10} strokeWidth={3} className="text-white shrink-0" />
                                )}
                              </button>

                              {/* Tag de atraso mobile à frente do status */}
                              {isOverdue && (
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0", getTaskStatusBadgeStyle('Atrasado'))}>
                                  Atrasado
                                </span>
                              )}

                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold", getTaskStatusBadgeStyle(task.status))}>
                                {task.status}
                              </span>

                              {catName && (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold truncate max-w-[120px] shadow-2xs border"
                                  style={{
                                    backgroundColor: catColor,
                                    borderColor: catColor,
                                    color: getCategoryTextColor(catColor),
                                  }}
                                >
                                  {catName}
                                </span>
                              )}
                            </div>
                            {task.assignees && task.assignees.length > 0 && (
                              <div className="flex -space-x-1.5 shrink-0">
                                {task.assignees.map((a: any, i: number) => (
                                  <div key={i} className="w-5 h-5 rounded-full bg-blue-600 border border-white dark:border-gray-800 flex items-center justify-center text-[9px] text-white font-bold shadow-xs" title={a.name}>
                                    {a.name.charAt(0).toUpperCase()}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs leading-tight flex items-center gap-1.5 min-w-0">
                            <span className="truncate">{task.name}</span>
                            {isDeletionPending && (
                              <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-bold shrink-0">
                                Exclusão
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-[11px] text-gray-500 dark:text-gray-400 gap-1.5">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(task.delivery_date)}</span>
                            <span>•</span>
                            <span className="truncate">{task.client_name || '-'}</span>
                            {task.value && task.value > 0 ? (
                              <>
                                <span>•</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(task.value)}</span>
                              </>
                            ) : null}
                          </div>
                        </td>

                        {/* DESKTOP VIEW */}
                        {/* 1. Tarefa */}
                        <td className="hidden md:table-cell py-1 px-3 align-middle h-10 max-h-10 overflow-hidden text-ellipsis whitespace-nowrap">
                          <div className="flex items-center gap-2 min-w-0 h-full">
                            {/* Bolinha interativa de status */}
                            <button
                              type="button"
                              title={`Status: ${task.status}. Clique para alterar`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (statusMenuState?.taskId === task.id) {
                                  setStatusMenuState(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const openUpward = rect.bottom + 240 > (typeof window !== 'undefined' ? window.innerHeight : 800);
                                  setStatusMenuState({
                                    taskId: task.id,
                                    currentStatus: task.status,
                                    x: rect.left,
                                    y: openUpward ? rect.top - 8 : rect.bottom + 6,
                                    openUpward,
                                  });
                                }
                              }}
                              className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-110 active:scale-95 shadow-2xs focus:outline-hidden cursor-pointer",
                                getStatusDotColor(task.status)
                              )}
                            >
                              {task.status === 'Concluída' && (
                                <Check size={10} strokeWidth={3} className="text-white shrink-0" />
                              )}
                            </button>

                            {/* Título da tarefa */}
                            <span className="truncate font-medium text-gray-900 dark:text-gray-100 text-xs" title={task.name}>
                              {task.name}
                            </span>

                            {/* Badge de exclusão */}
                            {isDeletionPending && (
                              <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold shrink-0">
                                Exclusão
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Cliente */}
                        <td className="hidden md:table-cell py-1 px-3 align-middle h-10 max-h-10 text-gray-600 dark:text-gray-300 text-xs overflow-hidden text-ellipsis whitespace-nowrap" title={task.client_name || ''}>
                          <span className="truncate block">{task.client_name || '-'}</span>
                        </td>

                        {/* 3. Status */}
                        <td className="hidden md:table-cell py-1 px-3 align-middle h-10 max-h-10 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {isOverdue && (
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 tracking-tight",
                                getTaskStatusBadgeStyle('Atrasado')
                              )}>
                                Atrasado
                              </span>
                            )}
                            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold", getTaskStatusBadgeStyle(task.status))}>
                              {task.status}
                            </span>
                          </div>
                        </td>

                        {/* 4. Categorias */}
                        <td className="hidden md:table-cell py-1 px-3 align-middle h-10 max-h-10 whitespace-nowrap overflow-hidden text-ellipsis" title={catName || ''}>
                          {catName ? (
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold shadow-2xs border truncate max-w-full"
                              style={{
                                backgroundColor: catColor,
                                borderColor: catColor,
                                color: getCategoryTextColor(catColor),
                              }}
                            >
                              <span className="truncate">{catName}</span>
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-xs">-</span>
                          )}
                        </td>

                        {/* 5. Valor */}
                        <td className="hidden md:table-cell py-1 px-3 align-middle h-10 max-h-10 font-medium text-gray-900 dark:text-gray-100 text-xs whitespace-nowrap">
                          {task.value && task.value > 0 ? formatCurrency(task.value) : <span className="text-gray-300 dark:text-gray-600">-</span>}
                        </td>

                        {/* 6. Entrega */}
                        <td className="hidden md:table-cell py-1 px-3 align-middle h-10 max-h-10 text-gray-600 dark:text-gray-300 text-xs font-medium whitespace-nowrap">
                          {formatDate(task.delivery_date)}
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

      {/* MENU FLUTUANTE DE STATUS (PORTAL - Renderizado no body, imune a clipping) */}
      {statusMenuState && (
        <ModalPortal>
          <div
            onClick={() => setStatusMenuState(null)}
            className="fixed inset-0 z-[9999] bg-transparent"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: `${Math.max(8, Math.min(statusMenuState.x, (typeof window !== 'undefined' ? window.innerWidth : 500) - 200))}px`,
                top: statusMenuState.openUpward ? undefined : `${statusMenuState.y}px`,
                bottom: statusMenuState.openUpward ? `${(typeof window !== 'undefined' ? window.innerHeight : 800) - statusMenuState.y}px` : undefined,
              }}
              className="w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 z-[10000]"
            >
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Alterar status
              </div>
              <div className="space-y-0.5">
                {STATUS_COLUMNS.map((colStatus) => {
                  const isCurrent = statusMenuState.currentStatus === colStatus;
                  return (
                    <button
                      key={colStatus}
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const targetId = statusMenuState.taskId;
                        setStatusMenuState(null);
                        if (!isCurrent) {
                          await handleUpdateStatus(targetId, colStatus);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer",
                        isCurrent
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-2.5 h-2.5 rounded-full shrink-0 flex items-center justify-center",
                          getStatusDotColor(colStatus)
                        )}>
                          {colStatus === 'Concluída' && (
                            <Check size={7} strokeWidth={3} className="text-white" />
                          )}
                        </span>
                        <span>{colStatus}</span>
                      </div>
                      {isCurrent && (
                        <Check size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* VIEW 2: KANBAN VIEW (Requisito 21) */}
      {viewMode === 'kanban' && (
        <div className="flex flex-row gap-4 overflow-x-auto pb-6 items-start w-full">
          {STATUS_COLUMNS.map((colStatus) => {
            const columnTasks = filteredTasks.filter((t) => t.status === colStatus);
            const isColOver = dragOverTaskCol === colStatus;

            return (
              <div
                key={colStatus}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverTaskCol !== colStatus) {
                    setDragOverTaskCol(colStatus);
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (dragOverTaskCol === colStatus) {
                    setDragOverTaskCol(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverTaskCol(null);
                  const taskId = e.dataTransfer.getData('taskId') || e.dataTransfer.getData('text/plain') || draggedTaskId;
                  if (taskId) {
                    handleUpdateStatus(taskId, colStatus);
                  }
                  setDraggedTaskId(null);
                }}
                className={cn(
                  "w-[290px] xl:w-[320px] 2xl:flex-1 min-w-[280px] flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl p-3.5 border flex flex-col shadow-sm transition-all duration-150",
                  isColOver
                    ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20"
                    : "border-gray-200 dark:border-gray-700"
                )}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0",
                      colStatus === 'Concluída' ? "bg-emerald-500" :
                      colStatus === 'Aprovada' ? "bg-blue-500" :
                      colStatus === 'Em aprovação' ? "bg-purple-500" :
                      colStatus === 'Em alteração' ? "bg-amber-500" :
                      colStatus === 'Em produção' ? "bg-yellow-500" :
                      "bg-slate-400"
                    )} />
                    <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider truncate">
                      {colStatus}
                    </h3>
                  </div>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full transition-colors shrink-0",
                    isColOver ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                  )}>
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] pr-0.5">
                  {isColOver && draggedTaskId && !columnTasks.some(t => t.id === draggedTaskId) && (
                    <div className="p-3 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/50 text-blue-600 text-center text-xs font-semibold animate-pulse">
                      Soltar tarefa aqui
                    </div>
                  )}

                  {columnTasks.map((task) => {
                    const isDeletionPending = task.deletion_request_status === 'pending';
                    const isDraggingThis = draggedTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('taskId', task.id.toString());
                          e.dataTransfer.setData('text/plain', task.id.toString());
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedTaskId(task.id);
                          dragMouseStartRef.current = { x: e.clientX, y: e.clientY };
                          isDraggingTaskRef.current = false;
                        }}
                        onDrag={(e) => {
                          if (e.clientX !== 0 || e.clientY !== 0) {
                            if (dragMouseStartRef.current && (Math.abs(e.clientX - dragMouseStartRef.current.x) > 6 || Math.abs(e.clientY - dragMouseStartRef.current.y) > 6)) {
                              isDraggingTaskRef.current = true;
                            }
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDragOverTaskCol(null);
                          setTimeout(() => {
                            isDraggingTaskRef.current = false;
                            dragMouseStartRef.current = null;
                          }, 100);
                        }}
                        onClick={() => {
                          if (isDraggingTaskRef.current) {
                            return;
                          }
                          openTaskDetail(task.id);
                        }}
                        className={cn(
                          'p-3.5 rounded-xl border shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none group',
                          isDraggingThis && 'opacity-40 scale-[0.98] border-dashed border-blue-400 shadow-none',
                          isDeletionPending
                            ? 'bg-red-50/70 border-red-300 opacity-60'
                            : 'bg-white border-gray-200'
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
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

                        {isTaskOverdue(task) && (
                          <div className="mb-1.5">
                            {(task.status === 'Concluída' || task.status === 'Aprovada') ? (
                              <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.5 rounded inline-block">
                                Recebimento Pendente
                              </span>
                            ) : (
                              <span className="text-[10px] bg-red-50 text-red-800 border border-red-300 font-bold px-1.5 py-0.5 rounded inline-block">
                                Atrasada
                              </span>
                            )}
                          </div>
                        )}

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
                        let pillBg = 'bg-slate-600 hover:bg-slate-700';
                        if (task.status === 'Concluída' || (task.status as any) === 'Finalizada') {
                          pillBg = 'bg-emerald-600 hover:bg-emerald-700';
                        } else if (isTaskOverdue(task)) {
                          pillBg = 'bg-rose-600 hover:bg-rose-700';
                        } else if (task.status === 'Aprovada') {
                          pillBg = 'bg-blue-600 hover:bg-blue-700';
                        } else if (task.status === 'Em aprovação') {
                          pillBg = 'bg-purple-600 hover:bg-purple-700';
                        } else if (task.status === 'Em alteração') {
                          pillBg = 'bg-amber-500 hover:bg-amber-600';
                        } else if (task.status === 'Em produção') {
                          pillBg = 'bg-yellow-500 hover:bg-yellow-600';
                        }

                        return (
                          <div
                            key={task.id}
                            onClick={() => openTaskDetail(task.id)}
                            className={cn(
                              'px-2 py-1 rounded-md sm:rounded-lg text-left cursor-pointer transition-all shadow-xs text-white flex flex-col gap-0.5',
                              pillBg
                            )}
                            title={`Tarefa: ${task.name}${task.client_name ? ` (${task.client_name})` : ''}`}
                          >
                            <div className="flex items-center gap-1.5 w-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                              <span className="text-[9px] font-bold text-white/90 uppercase tracking-wider truncate">
                                {task.status}
                              </span>
                            </div>
                            <p className="font-bold text-[11px] text-white leading-tight line-clamp-2 break-words">
                              {task.name}
                            </p>
                            {task.client_name && (
                              <p className="text-[10px] text-white/80 truncate">
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
      {loadingDetail && !selectedTask && (
        <ModalPortal>
          <div className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Carregando detalhes da tarefa...</span>
            </div>
          </div>
        </ModalPortal>
      )}

      {selectedTask && (<ModalPortal>
        <SafeModalBackdrop
          onClose={() => setSelectedTask(null)}
          className="fixed inset-0 !m-0 z-50 flex items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-gray-50 sticky top-0 z-10">
              <div className="min-w-0 pr-4">
                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  {selectedTask.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Cliente: <span className="font-semibold text-gray-800">{selectedTask.client_name}</span>
                </p>
                {selectedTask.visibility === 'privado' && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 mt-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Privado (Apenas Administrador)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wider"
                  style={{ backgroundColor: selectedTask.category_color || '#3b82f6' }}
                >
                  {selectedTask.category_name || 'Geral'}
                </span>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Fechar"
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

                {/* Client Approval Controls (Ocultar quando tarefa for concluída) */}
                {selectedTask.status !== 'Concluída' && (
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
                )}
              </div>

              {/* Task Details Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/60">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Prazo de Entrega:</span>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mt-1">{formatDate(selectedTask.delivery_date)}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/60">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Valor do Serviço:</span>
                    {selectedTask.value > 0 && (
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        selectedTask.financial_status === 'Pago'
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                      )}>
                        {selectedTask.financial_status === 'Pago' ? 'Recebido' : 'Recebimento Pendente'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      {selectedTask.value ? formatCurrency(selectedTask.value) : 'Não informado'}
                    </p>
                    {selectedTask.value > 0 && selectedTask.financial_status !== 'Pago' && currentUser?.role !== 'CLIENTE' && (
                      <button
                        onClick={async () => {
                          if (selectedTask.financial_id) {
                            await fetch(`/api/finance/${selectedTask.financial_id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'Pago' }),
                            });
                            setSelectedTask({ ...selectedTask, financial_status: 'Pago' });
                            fetchInitialData();
                          }
                        }}
                        className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-xs"
                        title="Marcar recebimento como pago"
                      >
                        Marcar Pago
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* TIME TRACKER */}
              <TaskTimeTracker taskId={selectedTask.id} currentUser={currentUser} />

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Descrição / Briefing / Roteiro</h4>
                  <div
                    className="p-4 bg-gray-50 dark:bg-gray-800/80 rounded-xl text-xs text-gray-800 dark:text-gray-100 leading-relaxed border border-gray-100 dark:border-gray-700/60 break-words"
                    dangerouslySetInnerHTML={{ __html: selectedTask.description }}
                  />
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
                              {med.title || med.description || 'Mídia da Tarefa'}
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
                          {currentUser?.role !== 'CLIENTE' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMedia(med.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remover anexo"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
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
                onClick={() => openEditTask(selectedTask)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
              >
                <Edit2 size={14} />
                <span>Editar Tarefa</span>
              </button>
            </div>
          </div>
        </SafeModalBackdrop>
      </ModalPortal>)}

      {/* ======================================================== */}
      {/* MODAL: SOLICITAR ALTERAÇÃO (Obrigatório descrever)       */}
      {/* ======================================================== */}
      {showChangeRequestModal && (<ModalPortal>
        <SafeModalBackdrop
          onClose={() => setShowChangeRequestModal(false)}
          className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
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
        </SafeModalBackdrop>
      </ModalPortal>)}

      {/* ======================================================== */}
      {/* MODAL: ADICIONAR LINK DE MÍDIA                           */}
      {/* ======================================================== */}
      {showAddMediaModal && (<ModalPortal>
        <SafeModalBackdrop
          onClose={() => setShowAddMediaModal(false)}
          className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-base font-bold text-gray-900 mb-1">Adicionar Link de Mídia</h3>
            <p className="text-xs text-gray-500 mb-4">
              Insira o link externo (YouTube, Google Drive, Dropbox, Vimeo, etc.).
            </p>

            <form onSubmit={handleAddMedia} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  URL / Link do Vídeo ou Imagem <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newMedia.url}
                  onChange={(e) => {
                    const val = e.target.value;
                    const detected = detectMediaType(val);
                    setNewMedia(prev => ({
                      ...prev,
                      url: val,
                      media_type: prev.media_type === 'other' || !prev.media_type ? detected : prev.media_type,
                    }));
                  }}
                  required
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Título do Arquivo <span className="text-gray-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Vídeo de referência, Arte de capa..."
                  value={newMedia.title}
                  onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
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
        </SafeModalBackdrop>
      </ModalPortal>)}

      {/* ======================================================== */}
      {/* MODAL: CRIAR NOVA TAREFA                                 */}
      {/* ======================================================== */}
      {showCreateModal && (<ModalPortal>
        <SafeModalBackdrop
          onClose={handleCloseCreateTaskModal}
          isDirty={isNewTaskDirty}
          confirmMessage="Você possui informações preenchidas para a nova tarefa. Deseja realmente descartar e fechar?"
          className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-4 sm:p-6 max-w-5xl w-full shadow-2xl relative max-h-[92vh] overflow-y-auto"
          >
            <button
              onClick={handleCloseCreateTaskModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1 pr-6">Criar Nova Tarefa</h3>
            <p className="text-xs text-gray-500 mb-5">
              Cadastre a demanda criativa. O prazo de entrega é exclusivo da produção.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Coluna Esquerda: Dados Principais */}
                <div className="lg:col-span-5 space-y-4">
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
                        <option value="">Selecione a Empresa / Cliente</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company_name || c.trade_name || c.corporate_name || c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria</label>
                      <input
                        list="category-options-new"
                        value={categories.find(c => c.id === newTask.category_id)?.name || newTask.category_id}
                        onChange={(e) => {
                           const val = e.target.value;
                           const match = categories.find(c => c.name === val);
                           if (match) {
                               setNewTask({ ...newTask, category_id: match.id });
                           } else {
                               setNewTask({ ...newTask, category_id: val });
                           }
                        }}
                        onKeyDown={async (e) => {
                           if (e.key === 'Enter') {
                               e.preventDefault();
                               const val = (e.target as HTMLInputElement).value;
                               if (!val || categories.some(c => c.name === val)) return;
                               try {
                                   const res = await fetch('/api/categories?target=tasks', {
                                       method: 'POST',
                                       headers: { 'Content-Type': 'application/json' },
                                       body: JSON.stringify({ name: val })
                                   });
                                   if (res.ok) {
                                       const data = await res.json();
                                       const newCat = { id: data.id, name: val };
                                       setCategories([...categories, newCat]);
                                       setNewTask({ ...newTask, category_id: newCat.id });
                                   }
                               } catch (err) {}
                           }
                        }}
                        placeholder="Selecione ou digite e tecle Enter"
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <datalist id="category-options-new">
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name} />
                        ))}
                      </datalist>
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
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                      <span>Responsáveis</span>
                      {newTask.assignee_ids.length > 0 && (
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">
                          {newTask.assignee_ids.length} selecionado{newTask.assignee_ids.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-gray-750/50 rounded-xl border border-gray-200 dark:border-gray-700 min-h-[42px] items-center">
                      {users.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">Nenhum membro cadastrado</span>
                      ) : (
                        users.map((u) => {
                          const isSelected = newTask.assignee_ids.includes(u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setNewTask({
                                    ...newTask,
                                    assignee_ids: newTask.assignee_ids.filter((id) => id !== u.id),
                                  });
                                } else {
                                  setNewTask({
                                    ...newTask,
                                    assignee_ids: [...newTask.assignee_ids, u.id],
                                  });
                                }
                              }}
                              className={cn(
                                'px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer select-none',
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              )}
                              title={u.position_name || u.role}
                            >
                              <span>{u.name}</span>
                              {isSelected && <Check size={12} className="stroke-[2.5]" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Visibilidade (Plano Equipe Pro)</label>
                    <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setNewTask({ ...newTask, visibility: 'grupo' })}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                          newTask.visibility !== 'privado' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        Grupo
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewTask({ ...newTask, visibility: 'privado' })}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                          newTask.visibility === 'privado' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        Privado
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {newTask.visibility === 'privado' ? 'Privado: Visível exclusivamente para o administrador.' : 'Grupo: Visível para toda a equipe.'}
                    </p>
                  </div>

                  {customCalendars.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Agenda Personalizada (Plano Corporativo)</label>
                      <select
                        value={newTask.calendar_id || ''}
                        onChange={(e) => {
                          const calId = e.target.value;
                          const cal = customCalendars.find((c: any) => c.id === calId);
                          setNewTask({
                            ...newTask,
                            calendar_id: calId,
                            ...(cal?.default_visibility ? { visibility: cal.default_visibility } : {}),
                          });
                        }}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">Criação Global (Sem agenda específica)</option>
                        {customCalendars.map((cal: any) => (
                          <option key={cal.id} value={cal.id}>
                            {cal.name} ({cal.default_visibility === 'privado' ? 'Privada' : 'Grupo'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Link da Mídia (Imagem ou Vídeo) */}
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Film size={14} className="text-blue-600" />
                        <span>Link da Imagem ou Vídeo (Opcional)</span>
                      </label>
                      {newTask.media_url && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {newTask.media_type === 'video' ? 'Vídeo' : newTask.media_type === 'image' ? 'Imagem' : 'Link'}
                        </span>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="Ex: https://youtube.com/..., https://drive.google.com/..., https://.../foto.png"
                      value={newTask.media_url || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const detected = detectMediaType(val);
                        setNewTask({
                          ...newTask,
                          media_url: val,
                          media_type: newTask.media_type === 'other' || !newTask.media_type ? detected : newTask.media_type,
                        });
                      }}
                      className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />

                    {newTask.media_url && (
                      <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-1">Título do Anexo</label>
                          <input
                            type="text"
                            placeholder="Ex: Vídeo de referência / Arte"
                            value={newTask.media_title || ''}
                            onChange={(e) => setNewTask({ ...newTask, media_title: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-1">Tipo de Mídia</label>
                          <select
                            value={newTask.media_type || 'other'}
                            onChange={(e) => setNewTask({ ...newTask, media_type: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="other">Auto-detectar</option>
                            <option value="video">Vídeo</option>
                            <option value="image">Imagem</option>
                            <option value="document">Documento</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Coluna Direita: Descrição / Roteiro */}
                <div className="lg:col-span-7 flex flex-col">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição / Roteiro</label>
                  <div className="flex-1">
                    <RichTextEditor
                      value={newTask.description || ''}
                      onChange={(val) => setNewTask({ ...newTask, description: val })}
                      placeholder="Instruções de edição, formato, requisitos, roteiro..."
                      minHeight="280px"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseCreateTaskModal}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm"
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          </div>
        </SafeModalBackdrop>
      </ModalPortal>)}

      {/* ======================================================== */}
      {/* MODAL: EDITAR TAREFA                                      */}
      {/* ======================================================== */}
      {showEditTaskModal && selectedTask && (<ModalPortal>
        <SafeModalBackdrop
          onClose={handleCloseEditTaskModal}
          isDirty={isEditTaskDirty}
          confirmMessage="Você possui alterações não salvas na tarefa. Deseja realmente descartar as alterações e fechar?"
          className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-4 sm:p-6 max-w-5xl w-full shadow-2xl relative max-h-[92vh] overflow-y-auto"
          >
            <button
              onClick={handleCloseEditTaskModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1"
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Coluna Esquerda: Dados Principais */}
                <div className="lg:col-span-5 space-y-4">
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
                        <option value="">Selecione a Empresa / Cliente</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company_name || c.trade_name || c.corporate_name || c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria</label>
                      <input
                        list="category-options-edit"
                        value={categories.find(c => c.id === editTaskForm.category_id)?.name || editTaskForm.category_id}
                        onChange={(e) => {
                           const val = e.target.value;
                           const match = categories.find(c => c.name === val);
                           if (match) {
                               setEditTaskForm({ ...editTaskForm, category_id: match.id });
                           } else {
                               setEditTaskForm({ ...editTaskForm, category_id: val });
                           }
                        }}
                        onKeyDown={async (e) => {
                           if (e.key === 'Enter') {
                               e.preventDefault();
                               const val = (e.target as HTMLInputElement).value;
                               if (!val || categories.some(c => c.name === val)) return;
                               try {
                                   const res = await fetch('/api/categories?target=tasks', {
                                       method: 'POST',
                                       headers: { 'Content-Type': 'application/json' },
                                       body: JSON.stringify({ name: val })
                                   });
                                   if (res.ok) {
                                       const data = await res.json();
                                       const newCat = { id: data.id, name: val };
                                       setCategories([...categories, newCat]);
                                       setEditTaskForm({ ...editTaskForm, category_id: newCat.id });
                                   }
                               } catch (err) {}
                           }
                        }}
                        placeholder="Selecione ou digite e tecle Enter"
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <datalist id="category-options-edit">
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Visibilidade (Plano Equipe Pro)</label>
                    <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setEditTaskForm({ ...editTaskForm, visibility: 'grupo' })}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                          editTaskForm.visibility !== 'privado' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        Grupo
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditTaskForm({ ...editTaskForm, visibility: 'privado' })}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                          editTaskForm.visibility === 'privado' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        Privado
                      </button>
                    </div>
                  </div>

                  {customCalendars.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Agenda Personalizada (Plano Corporativo)</label>
                      <select
                        value={editTaskForm.calendar_id || ''}
                        onChange={(e) => {
                          const calId = e.target.value;
                          const cal = customCalendars.find((c) => c.id === calId);
                          setEditTaskForm({
                            ...editTaskForm,
                            calendar_id: calId,
                            ...(cal?.default_visibility ? { visibility: cal.default_visibility } : {}),
                          });
                        }}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">Criação Global (Sem agenda específica)</option>
                        {customCalendars.map((cal) => (
                          <option key={cal.id} value={cal.id}>
                            {cal.name} ({cal.default_visibility === 'privado' ? 'Privada' : 'Grupo'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                      <span>Responsáveis</span>
                      {editTaskForm.assignee_ids.length > 0 && (
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">
                          {editTaskForm.assignee_ids.length} selecionado{editTaskForm.assignee_ids.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-gray-750/50 rounded-xl border border-gray-200 dark:border-gray-700 min-h-[42px] items-center">
                      {users.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">Nenhum membro cadastrado</span>
                      ) : (
                        users.map((u) => {
                          const isSelected = editTaskForm.assignee_ids.includes(u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setEditTaskForm({
                                    ...editTaskForm,
                                    assignee_ids: editTaskForm.assignee_ids.filter((id: string) => id !== u.id),
                                  });
                                } else {
                                  setEditTaskForm({
                                    ...editTaskForm,
                                    assignee_ids: [...editTaskForm.assignee_ids, u.id],
                                  });
                                }
                              }}
                              className={cn(
                                'px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer select-none',
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              )}
                              title={u.position_name || u.role}
                            >
                              <span>{u.name}</span>
                              {isSelected && <Check size={12} className="stroke-[2.5]" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Descrição / Roteiro */}
                <div className="lg:col-span-7 flex flex-col">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição / Roteiro</label>
                  <div className="flex-1">
                    <RichTextEditor
                      value={editTaskForm.description || ''}
                      onChange={(val) => setEditTaskForm({ ...editTaskForm, description: val })}
                      placeholder="Instruções de edição, formato, requisitos, roteiro..."
                      minHeight="280px"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseEditTaskModal}
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
        </SafeModalBackdrop>
      </ModalPortal>)}

      {/* MediaViewer Overlay */}
      {mediaViewerState && (
        <MediaViewer
          isOpen={true}
          mediaList={mediaViewerState.list}
          initialIndex={mediaViewerState.index}
          onClose={() => setMediaViewerState(null)}
        />
      )}
    
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
