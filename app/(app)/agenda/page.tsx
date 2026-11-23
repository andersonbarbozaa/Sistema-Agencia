'use client';

import { useState, useEffect } from 'react';
import ModalPortal from '@/components/ModalPortal';
import SafeModalBackdrop from '@/components/SafeModalBackdrop';
import ConfirmModal from '@/components/ConfirmModal';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
  CalendarCheck,
  User,
  Check,
  CheckSquare,
} from 'lucide-react';
import { CalendarEvent } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import { useSessionState } from '@/lib/useSessionState';

export default function AgendaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  // Custom Calendars State (Plano Corporativo)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [customCalendars, setCustomCalendars] = useState<any[]>([]);
  // IDs de agendas desmarcadas pelo usuário (por padrão todas começam selecionadas = array vazio)
  const [hiddenCalendarIds, setHiddenCalendarIds] = useSessionState<string[]>('agencia_agenda_hidden_cals', []);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarForm, setCalendarForm] = useState<any>({
    id: '',
    name: '',
    color: '#3b82f6',
    default_visibility: 'grupo',
    description: '',
  });
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useSessionState<'calendar' | 'list'>('agencia_agenda_view_mode', 'calendar');

  const [confirmState, setConfirmState] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Month navigation for Calendar view persisted across F5 / refresh
  const [currentDateISO, setCurrentDateISO] = useSessionState<string>(
    'agencia_agenda_month',
    new Date().toISOString()
  );
  const currentDate = new Date(currentDateISO);
  const setCurrentDate = (d: Date) => setCurrentDateISO(d.toISOString());

  // Create Event / Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createItemType, setCreateItemType] = useState<'event' | 'task'>('event');
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    end_date: '',
    start_time: '10:00',
    end_time: '11:00',
    location: '',
    client_id: '',
    visibility: 'grupo',
    calendar_id: '',
    notes: '',
  });

  const isNewEventDirty = Boolean(newEvent.title.trim() || newEvent.description.trim() || newEvent.location.trim() || newEvent.notes.trim());

  const handleCloseCreateModal = () => {
    const doClose = () => {
      setShowCreateModal(false);
      setNewEvent({
        title: '',
        description: '',
        event_date: new Date().toISOString().split('T')[0],
        end_date: '',
        start_time: '10:00',
        end_time: '11:00',
        location: '',
        client_id: '',
        visibility: 'grupo',
        calendar_id: '',
        notes: '',
      });
    };

    if (isNewEventDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar compromisso?',
        message: 'Você possui dados preenchidos no compromisso. Se fechar agora, todas as informações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          doClose();
        },
      });
      return;
    }
    doClose();
  };

  const isCalendarFormDirty = Boolean((calendarForm.name || '').trim() || (calendarForm.description || '').trim());

  const handleCloseCalendarModal = () => {
    if (isCalendarFormDirty) {
      setConfirmState({
        isOpen: true,
        title: 'Descartar agenda?',
        message: 'Você possui dados preenchidos na agenda personalizada. Se fechar agora, as informações serão perdidas.',
        type: 'warning',
        confirmText: 'Descartar e Fechar',
        cancelText: 'Continuar Editando',
        onConfirm: () => {
          setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
          setShowCalendarModal(false);
        },
      });
      return;
    }
    setShowCalendarModal(false);
  };

  // Edit / View Event Modal
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedTaskPreview, setSelectedTaskPreview] = useState<any | null>(null);
  const [savingTaskDates, setSavingTaskDates] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    event_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    client_id: '',
    visibility: 'grupo',
    calendar_id: '',
    notes: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleCalendarSelection = (calId: string) => {
    setHiddenCalendarIds((prev) =>
      prev.includes(calId) ? prev.filter((id) => id !== calId) : [...prev, calId]
    );
  };

  const isCalendarVisible = (calId?: string | null) => {
    const key = calId || '__none__';
    return !hiddenCalendarIds.includes(key);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userRes, evtRes, tasksRes, clientsRes, calRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/calendar', { cache: 'no-store' }),
        fetch('/api/tasks', { cache: 'no-store' }),
        fetch('/api/clients', { cache: 'no-store' }),
        fetch('/api/custom-calendars', { cache: 'no-store' }),
      ]);

      if (userRes && userRes.ok) {
        const ud = await userRes.json();
        setCurrentUser(ud.user);
      }

      if (evtRes.ok) {
        const d = await evtRes.json();
        setEvents(d.events || d.data || []);
      }
      if (tasksRes.ok) {
        const t = await tasksRes.json();
        setTasks(t.tasks || t.data || []);
      }
      if (clientsRes.ok) {
        const c = await clientsRes.json();
        setClients(c.clients || c.data || []);
      }
      if (calRes.ok) {
        const cd = await calRes.json();
        setCustomCalendars(cd.calendars || cd.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleOpenCreate = () => setShowCreateModal(true);
    window.addEventListener('open-create-event', handleOpenCreate);
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === 'true') {
      setShowCreateModal(true);
    }
    return () => window.removeEventListener('open-create-event', handleOpenCreate);
  }, []);

    const openCreateCalendarModal = () => {
    setCalendarForm({ id: '', name: '', color: '#3b82f6', default_visibility: 'grupo', description: '' });
    setShowCalendarModal(true);
  };

  const openEditCalendarModal = (cal: any) => {
    setCalendarForm({
      id: cal.id,
      name: cal.name,
      color: cal.color || '#3b82f6',
      default_visibility: cal.default_visibility || 'grupo',
      description: cal.description || '',
    });
    setShowCalendarModal(true);
  };

  const handleSaveCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calendarForm.name) return;

    try {
      setIsSavingCalendar(true);
      const url = calendarForm.id ? `/api/custom-calendars/${calendarForm.id}` : '/api/custom-calendars';
      const method = calendarForm.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calendarForm),
      });

      if (res.ok) {
        setShowCalendarModal(false);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao salvar agenda.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingCalendar(false);
    }
  };

  const handleDeleteCalendar = async () => {
    if (!calendarForm.id) return;
    setConfirmState({
      isOpen: true,
      title: 'Excluir Agenda',
      message: `Deseja realmente excluir a agenda "${calendarForm.name}"? Tarefas e compromissos vinculados não serão apagados.`,
      onConfirm: async () => {
        setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/custom-calendars/${calendarForm.id}`, { method: 'DELETE' });
          if (res.ok) {
            setShowCalendarModal(false);
            setHiddenCalendarIds((prev) => prev.filter((id) => id !== calendarForm.id));
            await fetchData();
          }
        } catch (err) {
          console.error(err);
        }
      },
      onCancel: () => setConfirmState((prev: any) => ({ ...prev, isOpen: false })),
      type: 'danger',
    });
  };

  useEffect(() => {
    const handler = () => setShowCreateModal(true);
    window.addEventListener('open-new-event', handler);
    return () => window.removeEventListener('open-new-event', handler);
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.event_date) return;

    try {
      setIsSaving(true);
      if (createItemType === 'task') {
        if (!newEvent.client_id) {
          alert('Selecione um cliente para criar a tarefa.');
          setIsSaving(false);
          return;
        }
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            name: newEvent.title,
            description: newEvent.description,
            start_date: newEvent.event_date,
            delivery_date: newEvent.end_date && newEvent.end_date >= newEvent.event_date ? newEvent.end_date : newEvent.event_date,
            client_id: newEvent.client_id,
            visibility: newEvent.visibility,
            calendar_id: newEvent.calendar_id,
          }),
        });
        if (res.ok) {
          setShowCreateModal(false);
          setNewEvent({
            title: '',
            description: '',
            event_date: new Date().toISOString().split('T')[0],
            end_date: '',
            start_time: '10:00',
            end_time: '11:00',
            location: '',
            client_id: '',
            visibility: 'grupo',
            calendar_id: '',
            notes: '',
          });
          await fetchData();
        } else {
          const err = await res.json().catch(() => ({}));
          if (res.status === 401) {
            alert('Sua sessão expirou. Redirecionando para o login...');
            window.location.href = '/login';
            return;
          }
          alert(err.error || 'Erro ao criar tarefa na agenda.');
        }
        return;
      }

      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvent,
          end_date: newEvent.end_date && newEvent.end_date >= newEvent.event_date ? newEvent.end_date : newEvent.event_date,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewEvent({
          title: '',
          description: '',
          event_date: new Date().toISOString().split('T')[0],
          end_date: '',
          start_time: '10:00',
          end_time: '11:00',
          location: '',
          client_id: '',
          visibility: 'grupo',
          calendar_id: '',
          notes: '',
        });
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao criar compromisso.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (evt: any) => {
    setSelectedEvent(evt);
    const startDt = (evt.event_date || '').split('T')[0];
    const endDt = (evt.end_date || evt.event_date || '').split('T')[0];
    setEditForm({
      title: evt.title || '',
      description: evt.description || '',
      event_date: startDt,
      end_date: endDt && endDt >= startDt ? endDt : startDt,
      start_time: evt.start_time || '',
      end_time: evt.end_time || '',
      location: evt.location || '',
      client_id: evt.client_id || '',
      visibility: evt.visibility || 'grupo',
      calendar_id: evt.calendar_id || '',
      notes: evt.notes || '',
    });
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !editForm.title || !editForm.event_date) return;

    try {
      setIsSaving(true);
      const res = await fetch(`/api/calendar/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setSelectedEvent(null);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao atualizar evento.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    setConfirmState({
      isOpen: true,
      title: 'Confirmar Exclusão',
      message: `Tem certeza que deseja excluir o evento "${selectedEvent.title}"?`,
      onConfirm: async () => {
        setConfirmState((prev: any) => ({ ...prev, isOpen: false }));

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/calendar/${selectedEvent.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSelectedEvent(null);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao excluir evento.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
      },
      onCancel: () => setConfirmState((prev: any) => ({ ...prev, isOpen: false })),
      type: 'danger'
    });
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'MarÃ§o', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build grid days
  const calendarDays: { day: number; currentMonth: boolean; dateStr: string }[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ day: d, currentMonth: false, dateStr });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarDays.push({ day: i, currentMonth: true, dateStr });
  }

  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarDays.push({ day: i, currentMonth: false, dateStr });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Agendas exibidas em forma de botão (todas selecionadas de início; clique remove/ativa a exibição)
  const hasGeneralItems =
    events.some((e) => !e.calendar_id) ||
    tasks.some((t) => !t.calendar_id) ||
    customCalendars.length === 0;

  const agendaFilterButtons = [
    ...(hasGeneralItems
      ? [
          {
            id: '__none__',
            name: 'Geral',
            color: '#2563eb',
            default_visibility: 'grupo',
          },
        ]
      : []),
    ...customCalendars,
  ];

  const visibleEvents = events.filter((e) => isCalendarVisible(e.calendar_id));
  const visibleTasks = tasks.filter((t) => isCalendarVisible(t.calendar_id));

  const getStatusHexColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('conclu') || s.includes('finaliz')) return '#059669';
    if (s.includes('atrasad')) return '#e11d48';
    if (s.includes('aprovad')) return '#2563eb';
    if (s.includes('aprov')) return '#9333ea';
    if (s.includes('altera')) return '#f59e0b';
    if (s.includes('produ')) return '#eab308';
    return '#475569';
  };

  const getStatusPillColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('conclu') || s.includes('finaliz')) return 'bg-emerald-600 hover:bg-emerald-700';
    if (s.includes('atrasad')) return 'bg-rose-600 hover:bg-rose-700';
    if (s.includes('aprovad')) return 'bg-blue-600 hover:bg-blue-700';
    if (s.includes('aprov')) return 'bg-purple-600 hover:bg-purple-700';
    if (s.includes('altera')) return 'bg-amber-500 hover:bg-amber-600';
    if (s.includes('produ')) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-slate-600 hover:bg-slate-700';
  };

  // Normaliza todos os compromissos e tarefas visíveis com startDate e endDate (YYYY-MM-DD)
  const normalizedAgendaItems = [
    ...visibleEvents.map((evt) => {
      const sDate = (evt.event_date || '').split('T')[0];
      const rawEnd = (evt.end_date || evt.event_date || '').split('T')[0];
      const eDate = rawEnd && rawEnd >= sDate ? rawEnd : sDate;
      const cal = customCalendars.find((c) => c.id === evt.calendar_id);
      return {
        id: `evt-${evt.id}`,
        type: 'event' as const,
        title: evt.title,
        startDate: sDate,
        endDate: eDate,
        isMultiDay: Boolean(sDate && eDate && eDate > sDate),
        startTime: evt.start_time ? evt.start_time.substring(0, 5) : '',
        location: evt.location,
        status: evt.visibility,
        calendarId: evt.calendar_id,
        clientName: evt.client_name || '',
        hexColor: cal?.color || '#2563eb',
        raw: evt,
      };
    }),
    ...visibleTasks
      .filter((task) => task.delivery_date || task.start_date)
      .map((task) => {
        const rawDelivery = (task.delivery_date || '').split('T')[0];
        const rawStart = (task.start_date || '').split('T')[0];
        const sDate = rawStart && rawDelivery && rawStart <= rawDelivery ? rawStart : (rawDelivery || rawStart);
        const eDate = rawDelivery && rawStart && rawDelivery >= rawStart ? rawDelivery : (rawDelivery || rawStart);
        let taskTime = '';
        if (task.delivery_date && task.delivery_date.includes('T')) {
          taskTime = task.delivery_date.split('T')[1].substring(0, 5);
        }
        let checklistTotal = 0;
        let checklistCompleted = 0;
        if (Array.isArray(task.checklist)) {
          checklistTotal = task.checklist.length;
          checklistCompleted = task.checklist.filter((i: any) => i && i.completed).length;
        } else if (typeof task.checklist === 'string' && task.checklist.trim()) {
          try {
            const parsed = JSON.parse(task.checklist);
            if (Array.isArray(parsed)) {
              checklistTotal = parsed.length;
              checklistCompleted = parsed.filter((i: any) => i && i.completed).length;
            }
          } catch {}
        }
        return {
          id: `task-${task.id}`,
          type: 'task' as const,
          title: task.name,
          startDate: sDate,
          endDate: eDate,
          isMultiDay: Boolean(sDate && eDate && eDate > sDate),
          startTime: taskTime,
          location: task.client_name,
          status: task.status,
          calendarId: task.calendar_id,
          categoryName: task.category_name,
          categoryColor: task.category_color,
          clientName: task.client_name,
          checklistTotal,
          checklistCompleted,
          hexColor: getStatusHexColor(task.status),
          raw: task,
        };
      }),
  ];

  const handleAgendaItemClick = (item: any) => {
    if (item.type === 'event') {
      openEditModal(item.raw);
    } else {
      const t = item.raw || item;
      const cleanId = (t.id || item.id || '').toString().replace(/^task-/, '');
      const sDate = (t.start_date || '').split('T')[0];
      const dDate = (t.delivery_date || item.endDate || '').split('T')[0];
      setSelectedTaskPreview({
        ...t,
        id: cleanId,
        title: t.name || t.title || item.title,
        client_name: t.client_name || item.clientName || item.location,
        start_date: sDate || dDate,
        delivery_date: dDate || sDate,
        event_date: dDate || sDate,
      });
    }
  };

  // Divide os 42 dias do calendário em 6 linhas de semana (7 dias cada)
  const calendarWeeks: { day: number; currentMonth: boolean; dateStr: string }[][] = [];
  for (let w = 0; w < calendarDays.length; w += 7) {
    calendarWeeks.push(calendarDays.slice(w, w + 7));
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ======================================================== */}
      {/* BARRA DE AGENDAS (Botões de filtro: todas selecionadas de início, clique para exibir/ocultar) */}
      {/* ======================================================== */}
      {agendaFilterButtons.length > 0 && (
        <div className="bg-white dark:bg-gray-850 p-3 rounded-2xl border border-gray-200 dark:border-gray-750 shadow-xs flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
            Agendas:
          </span>
          {agendaFilterButtons.map((cal) => {
            const isSelected = !hiddenCalendarIds.includes(cal.id);
            const dotColor = cal.color || '#3b82f6';
            return (
              <button
                key={cal.id}
                type="button"
                onClick={() => toggleCalendarSelection(cal.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none',
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-90'
                )}
                title={isSelected ? `Clique para ocultar "${cal.name}" do calendário` : `Clique para exibir "${cal.name}" no calendário`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0 border border-white/40"
                  style={{ backgroundColor: dotColor }}
                />
                <span>{cal.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5] ml-0.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Top Navigation & View Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Calendário
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              <ListIcon className="w-3.5 h-3.5" />
              Lista
            </button>
          </div>

          <h2 className="text-base font-bold text-gray-900 capitalize">
            {monthNames[month]} <span className="text-gray-500 font-normal">{year}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors shadow-xs"
          >
            Hoje
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          Carregando compromissos...
        </div>
      ) : viewMode === 'calendar' ? (
        /* CALENDAR VIEW */
        <div className="bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-750 rounded-2xl overflow-hidden shadow-sm">
          <div className="w-full">
            {/* Weekday Headers (DOM a SÁB) */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-750 bg-gray-50/80 dark:bg-gray-800 text-center py-1.5 sm:py-2.5 text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider select-none">
              <div><span className="hidden sm:inline">DOM</span><span className="inline sm:hidden">D</span></div>
              <div><span className="hidden sm:inline">SEG</span><span className="inline sm:hidden">S</span></div>
              <div><span className="hidden sm:inline">TER</span><span className="inline sm:hidden">T</span></div>
              <div><span className="hidden sm:inline">QUA</span><span className="inline sm:hidden">Q</span></div>
              <div><span className="hidden sm:inline">QUI</span><span className="inline sm:hidden">Q</span></div>
              <div><span className="hidden sm:inline">SEX</span><span className="inline sm:hidden">S</span></div>
              <div><span className="hidden sm:inline">SÁB</span><span className="inline sm:hidden">S</span></div>
            </div>

            {/* Weeks Grid (Renderiza cada semana com suporte a linha contínua do card até a data final) */}
            <div className="divide-y divide-gray-100 dark:divide-gray-750">
              {calendarWeeks.map((weekDays, weekIdx) => {
                const weekStart = weekDays[0].dateStr;
                const weekEnd = weekDays[6].dateStr;

                // Itens de múltiplos dias (Data Início -> Data Fim) que cruzam esta semana
                const weekMultiDayItems = normalizedAgendaItems.filter(
                  (item) => item.isMultiDay && item.startDate <= weekEnd && item.endDate >= weekStart
                );

                return (
                  <div key={weekIdx} className="relative min-h-[82px] sm:min-h-[120px] flex flex-col">
                    {/* Fundo das 7 colunas da semana com bordas verticais contínuas */}
                    <div className="absolute inset-0 grid grid-cols-7 divide-x divide-gray-100 dark:divide-gray-750 pointer-events-none">
                      {weekDays.map((cell, cIdx) => {
                        const isToday = cell.dateStr === todayStr;
                        return (
                          <div
                            key={cIdx}
                            className={cn(
                              'h-full transition-colors',
                              cell.currentMonth
                                ? isToday
                                  ? 'bg-blue-50/25'
                                  : 'bg-white dark:bg-gray-850'
                                : 'bg-gray-50/40 dark:bg-gray-900/40 opacity-40'
                            )}
                          />
                        );
                      })}
                    </div>

                    {/* Linha 1: Cabeçalho com número do dia e botão + */}
                    <div className="relative z-10 grid grid-cols-7">
                      {weekDays.map((cell, cIdx) => {
                        const isToday = cell.dateStr === todayStr;
                        return (
                          <div
                            key={cIdx}
                            className={cn(
                              'px-1 sm:px-2 pt-1 sm:pt-1.5 flex items-center justify-between group',
                              !cell.currentMonth && 'opacity-40'
                            )}
                          >
                            <span
                              className={cn(
                                'text-[10px] sm:text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full',
                                isToday
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : cell.currentMonth
                                  ? 'text-gray-800 dark:text-gray-200'
                                  : 'text-gray-400 dark:text-gray-600'
                              )}
                            >
                              {cell.day}
                            </span>
                            {cell.currentMonth && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewEvent((prev) => ({
                                    ...prev,
                                    event_date: cell.dateStr,
                                    end_date: cell.dateStr,
                                  }));
                                  setShowCreateModal(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 text-gray-400 hover:text-blue-600 transition-opacity"
                                title="Adicionar neste dia"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Linha 2: Tarefas / Compromissos com mais de 1 dia (Card no início + Linha contínua até a data final) */}
                    {weekMultiDayItems.length > 0 && (
                      <div className="relative z-10 grid grid-cols-7 gap-y-1 mt-1">
                        {weekMultiDayItems.map((item) => {
                          let startCol = weekDays.findIndex((d) => d.dateStr >= item.startDate);
                          if (startCol < 0) startCol = 0;
                          let endCol = 6;
                          for (let i = 0; i < 7; i++) {
                            if (weekDays[i].dateStr <= item.endDate) endCol = i;
                          }
                          const span = Math.max(1, endCol - startCol + 1);
                          const isActualEnd = item.endDate <= weekEnd;
                          const isEvent = item.type === 'event';
                          const cal = customCalendars.find((c) => c.id === item.calendarId);
                          const lineColor = isEvent ? (cal?.color || '#2563eb') : item.hexColor;
                          const endDayFormatted = item.endDate.split('-').slice(1).reverse().join('/');

                          return (
                            <div
                              key={`${item.id}-w${weekIdx}`}
                              style={{ gridColumn: `${startCol + 1} / span ${span}` }}
                              onClick={() => handleAgendaItemClick(item)}
                              className="px-1 sm:px-1.5 flex items-center cursor-pointer group/span min-w-0"
                              title={`${item.title} (${formatDate(item.startDate)} até ${formatDate(item.endDate)})`}
                            >
                              {/* Card Principal na coluna inicial */}
                              <div
                                style={{ backgroundColor: lineColor }}
                                className="px-1.5 py-0.5 rounded text-left shadow-2xs text-white flex flex-col gap-0.5 min-w-0 max-w-[135px] sm:max-w-[185px] shrink-0 group-hover/span:brightness-110 transition-all"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <p className="font-bold text-[9px] sm:text-[10px] leading-tight truncate text-white">
                                    {item.title}
                                  </p>
                                  {(item as any).checklistTotal > 0 && (
                                    <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-black/25 text-white text-[8px] sm:text-[9px] font-bold shrink-0 leading-none">
                                      <CheckSquare size={8} className="shrink-0" />
                                      {(item as any).checklistCompleted}/{(item as any).checklistTotal}
                                    </span>
                                  )}
                                </div>
                                {(item.clientName || item.location) && (
                                  <p className="text-[8px] sm:text-[9px] text-white/85 truncate leading-none">
                                    {item.clientName || item.location}
                                  </p>
                                )}
                              </div>

                              {/* Linha estendida do Card até a Coluna da Data Final */}
                              <div className="flex-1 flex items-center min-w-[12px]">
                                <div
                                  style={{ backgroundColor: lineColor }}
                                  className="h-1 sm:h-1.5 flex-1 rounded-r-full opacity-90 group-hover/span:opacity-100 transition-opacity"
                                />
                                {isActualEnd ? (
                                  <div
                                    style={{ backgroundColor: lineColor }}
                                    className="px-1.5 py-0.2 rounded-full text-[8px] sm:text-[9px] font-bold text-white shadow-2xs shrink-0 -ml-1 flex items-center gap-1"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                                    <span>até {endDayFormatted}</span>
                                  </div>
                                ) : (
                                  <span
                                    style={{ color: lineColor }}
                                    className="text-[10px] font-extrabold leading-none ml-0.5"
                                  >
                                    →
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Linha 3: Tarefas e Compromissos de 1 único dia dentro de cada célula */}
                    <div className="relative z-10 grid grid-cols-7 flex-1 mt-1 pb-1 sm:pb-1.5">
                      {weekDays.map((cell, cIdx) => {
                        const singleDayItems = normalizedAgendaItems
                          .filter((item) => !item.isMultiDay && item.startDate === cell.dateStr)
                          .sort((a, b) => {
                            if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
                            if (a.startTime) return -1;
                            if (b.startTime) return 1;
                            return 0;
                          });

                        return (
                          <div
                            key={cIdx}
                            className={cn(
                              'px-1 sm:px-1.5 space-y-1 overflow-y-auto max-h-28 sm:max-h-36 scrollbar-none',
                              !cell.currentMonth && 'opacity-40'
                            )}
                          >
                            {singleDayItems.map((item) => {
                              const isEvent = item.type === 'event';
                              const cal = customCalendars.find((c) => c.id === item.calendarId);

                              return (
                                <div
                                  key={item.id}
                                  onClick={() => handleAgendaItemClick(item)}
                                  style={isEvent && cal?.color ? { backgroundColor: cal.color } : undefined}
                                  className={cn(
                                    'px-1.5 py-0.5 rounded text-left cursor-pointer transition-all shadow-2xs text-white flex flex-col gap-0.5 min-w-0 overflow-hidden',
                                    isEvent
                                      ? (!cal?.color && 'bg-blue-600 hover:bg-blue-700')
                                      : getStatusPillColor(item.status)
                                  )}
                                  title={`${item.title}${item.clientName || item.location ? ` | ${item.clientName || item.location}` : ''}`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="font-bold text-[9px] sm:text-[10px] leading-tight truncate text-white">
                                      {item.title}
                                    </p>
                                    {(item as any).checklistTotal > 0 && (
                                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-black/25 text-white text-[8px] sm:text-[9px] font-bold shrink-0 leading-none">
                                        <CheckSquare size={8} className="shrink-0" />
                                        {(item as any).checklistCompleted}/{(item as any).checklistTotal}
                                      </span>
                                    )}
                                  </div>
                                  {(item.clientName || item.location) && (
                                    <p className="text-[8px] sm:text-[9px] text-white/80 truncate leading-none">
                                      {item.clientName || item.location}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex justify-between items-center">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Todos os Compromissos e Tarefas ({normalizedAgendaItems.length})
            </h3>
            <span className="text-xs text-gray-400">Clique para editar ou excluir</span>
          </div>

          {normalizedAgendaItems.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              Nenhum compromisso ou tarefa exibida para as agendas selecionadas.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {[...normalizedAgendaItems]
                .sort((a, b) => (a.startDate > b.startDate ? 1 : -1))
                .map((entry) => {
                  const item = entry.raw;
                  return (
                    <div
                      key={entry.id}
                      onClick={() => handleAgendaItemClick(entry)}
                      className="py-2.5 px-3 sm:px-4 transition-colors cursor-pointer flex flex-col gap-1 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      {/* Top Row: Data Início / Fim -> Botão Ver Tarefa / Editar -> Status -> Categoria */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
                        <span className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 text-[11px] shrink-0">
                          <CalendarIcon className="w-3 h-3" />
                          {entry.isMultiDay
                            ? `${formatDate(entry.startDate)} até ${formatDate(entry.endDate)}`
                            : formatDate(entry.startDate)}
                        </span>

                        {entry.type === 'task' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const cleanId = (item.id || '').toString().replace(/^task-/, '');
                              window.location.href = `/tasks?id=${cleanId}`;
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition-colors shrink-0"
                          >
                            <ListIcon className="w-3 h-3" />
                            Ver Tarefa
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(item);
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 flex items-center gap-1 transition-colors shrink-0"
                          >
                            <Edit3 className="w-3 h-3" />
                            Editar
                          </button>
                        )}

                        {entry.type === 'task' ? (
                          <span
                            className={cn(
                              'text-[10px] font-bold px-1.5 py-0.2 rounded border leading-none shrink-0',
                              item.status === 'Concluída' || (item.status as any) === 'Finalizada'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : item.status === 'Aprovada'
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                                : item.status === 'Em aprovação'
                                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                                : item.status === 'Em alteração'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                : item.status === 'Em produção'
                                ? 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            )}
                          >
                            {item.status || 'Não iniciada'}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shrink-0">
                            Compromisso
                          </span>
                        )}

                        {item.category_name && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-1 shrink-0">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: item.category_color || '#3B82F6' }}
                            />
                            {item.category_name}
                          </span>
                        )}

                        {(entry as any).checklistTotal > 0 && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.2 rounded border text-[10px] font-bold shrink-0",
                              (entry as any).checklistCompleted === (entry as any).checklistTotal
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                                : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                            )}
                          >
                            <CheckSquare size={10} className="shrink-0" />
                            {(entry as any).checklistCompleted}/{(entry as any).checklistTotal}
                          </span>
                        )}

                        {entry.type === 'event' && item.start_time && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium ml-auto">
                            <Clock className="w-3 h-3" />
                            {item.start_time.substring(0, 5)}
                            {item.end_time ? ` - ${item.end_time.substring(0, 5)}` : ''}
                          </span>
                        )}
                      </div>

                      {/* Middle Row: Título */}
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug truncate">
                        {entry.title}
                      </h4>

                      {/* Bottom Row: Empresa */}
                      {(entry.clientName || entry.location) && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1 leading-none truncate">
                          <User size={11} className="text-gray-400 shrink-0" />
                          {entry.clientName || entry.location}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* CREATE EVENT / TASK MODAL */}
      {showCreateModal && (<ModalPortal>
        <SafeModalBackdrop
          onClose={handleCloseCreateModal}
          isDirty={isNewEventDirty}
          confirmMessage="Você possui dados preenchidos. Deseja realmente descartar e fechar?"
          className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={handleCloseCreateModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              {createItemType === 'task' ? 'Nova Tarefa na Agenda' : 'Novo Compromisso na Agenda'}
            </h2>

            {/* Seletor: Compromisso ou Tarefa */}
            <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200 mb-4">
              <button
                type="button"
                onClick={() => setCreateItemType('event')}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all',
                  createItemType === 'event'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Compromisso
              </button>
              <button
                type="button"
                onClick={() => setCreateItemType('task')}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all',
                  createItemType === 'task'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Tarefa
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {createItemType === 'task' ? 'Nome da Tarefa *' : 'Título do Compromisso *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={createItemType === 'task' ? 'Ex: Edição de campanha, Roteiro...' : 'Ex: Gravação externa, Reunião de Alinhamento...'}
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Data Início *</label>
                  <input
                    type="date"
                    required
                    value={newEvent.event_date}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewEvent((prev) => ({
                        ...prev,
                        event_date: val,
                        end_date: prev.end_date && prev.end_date < val ? val : prev.end_date,
                      }));
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Data Fim <span className="text-[10px] text-gray-400 font-normal">(Mais de 1 dia)</span>
                  </label>
                  <input
                    type="date"
                    min={newEvent.event_date}
                    value={newEvent.end_date || newEvent.event_date}
                    onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {createItemType === 'event' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Horário Início</label>
                    <input
                      type="time"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Horário Fim</label>
                    <input
                      type="time"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {createItemType === 'event' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Local / Link</label>
                  <input
                    type="text"
                    placeholder="Ex: Estúdio A, Google Meet..."
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {createItemType === 'task' ? 'Cliente *' : 'Cliente Vinculado'}
                </label>
                <select
                  required={createItemType === 'task'}
                  value={newEvent.client_id}
                  onChange={(e) => setNewEvent({ ...newEvent, client_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{createItemType === 'task' ? 'Selecione o Cliente' : 'Nenhum (Compromisso Interno)'}</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name || c.trade_name || c.corporate_name || c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Controle de Visibilidade (Plano Equipe Pro) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Visibilidade (Plano Equipe Pro)
                </label>
                <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, visibility: 'grupo' })}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      newEvent.visibility !== 'privado'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Grupo
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, visibility: 'privado' })}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      newEvent.visibility === 'privado'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    Privado
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {newEvent.visibility === 'privado'
                    ? 'Privado: Visível exclusivamente para o administrador.'
                    : 'Grupo: Visível para toda a equipe.'}
                </p>
              </div>

              {/* Agenda Personalizada (Plano Corporativo) */}
              {customCalendars.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Agenda Vinculada (Plano Corporativo)
                  </label>
                  <select
                    value={newEvent.calendar_id || ''}
                    onChange={(e) => {
                      const calId = e.target.value;
                      const cal = customCalendars.find((c) => c.id === calId);
                      setNewEvent({
                        ...newEvent,
                        calendar_id: calId,
                        ...(cal?.default_visibility ? { visibility: cal.default_visibility } : {}),
                      });
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Criação Global (Sem vínculo a agenda)</option>
                    {customCalendars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.default_visibility === 'privado' ? 'Privada' : 'Grupo'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição / Pauta</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais, roteiro ou tópicos..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isSaving ? 'Salvando...' : createItemType === 'task' ? 'Salvar Tarefa' : 'Salvar Compromisso'}
                </button>
              </div>
            </form>
          </div>
        </SafeModalBackdrop>
      </ModalPortal>)}

      {/* Modal de Pré-visualização e Edição de Datas da Tarefa na Agenda */}
      {selectedTaskPreview && (<ModalPortal>
        <SafeModalBackdrop
          onClose={() => setSelectedTaskPreview(null)}
          className="fixed inset-0 !m-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-850 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Detalhes da Tarefa</h3>
              <button
                onClick={() => setSelectedTaskPreview(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {(selectedTaskPreview.status || selectedTaskPreview.category_name) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedTaskPreview.status && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border leading-none bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                      {selectedTaskPreview.status}
                    </span>
                  )}
                  {selectedTaskPreview.category_name && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {selectedTaskPreview.category_name}
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Título</label>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedTaskPreview.title || selectedTaskPreview.name}</p>
              </div>
              
              {(selectedTaskPreview.client_name || selectedTaskPreview.clientName) && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Cliente</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{selectedTaskPreview.client_name || selectedTaskPreview.clientName}</p>
                </div>
              )}

              {selectedTaskPreview.description && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                  <div
                    className="p-3 bg-gray-50 dark:bg-gray-800/70 rounded-xl text-xs text-gray-800 dark:text-gray-200 leading-relaxed border border-gray-100 dark:border-gray-700/60 break-words prose prose-xs dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedTaskPreview.description }}
                  />
                </div>
              )}

              {/* Edição rápida de Data Início e Data Fim da Tarefa direto na Agenda */}
              {currentUser?.role !== 'CLIENTE' ? (
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 rounded-xl space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Data Início</label>
                      <input
                        type="date"
                        value={(selectedTaskPreview.start_date || selectedTaskPreview.delivery_date || '').split('T')[0]}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedTaskPreview((prev: any) => ({
                            ...prev,
                            start_date: val,
                            delivery_date: prev.delivery_date && prev.delivery_date < val ? val : prev.delivery_date,
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Data Fim / Entrega</label>
                      <input
                        type="date"
                        min={(selectedTaskPreview.start_date || '').split('T')[0]}
                        value={(selectedTaskPreview.delivery_date || selectedTaskPreview.start_date || '').split('T')[0]}
                        onChange={(e) =>
                          setSelectedTaskPreview((prev: any) => ({
                            ...prev,
                            delivery_date: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={savingTaskDates}
                    onClick={async () => {
                      const cleanId = (selectedTaskPreview.id || '').toString().replace(/^task-/, '');
                      try {
                        setSavingTaskDates(true);
                        const res = await fetch(`/api/tasks/${cleanId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            start_date: selectedTaskPreview.start_date || null,
                            delivery_date: selectedTaskPreview.delivery_date || selectedTaskPreview.start_date || null,
                          }),
                        });
                        if (res.ok) {
                          await fetchData();
                          setSelectedTaskPreview(null);
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setSavingTaskDates(false);
                      }
                    }}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                  >
                    {savingTaskDates ? 'Salvando datas...' : 'Salvar Período na Agenda'}
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Período / Entrega</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {selectedTaskPreview.start_date && selectedTaskPreview.delivery_date && selectedTaskPreview.start_date !== selectedTaskPreview.delivery_date
                      ? `${formatDate(selectedTaskPreview.start_date)} até ${formatDate(selectedTaskPreview.delivery_date)}`
                      : selectedTaskPreview.delivery_date || selectedTaskPreview.event_date
                      ? formatDate(selectedTaskPreview.delivery_date || selectedTaskPreview.event_date)
                      : 'Sem data'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedTaskPreview(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Fechar
              </button>
              
              <button
                onClick={() => {
                  const cleanId = (selectedTaskPreview.id || '').toString().replace(/^task-/, '');
                  window.location.href = `/tasks?id=${cleanId}`;
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors flex-1 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ListIcon className="w-4 h-4" />
                Ver Tarefa Completa
              </button>
            </div>
          </div>
        </SafeModalBackdrop>
      </ModalPortal>)}

      {selectedEvent && (<ModalPortal>
        <SafeModalBackdrop
          onClose={() => setSelectedEvent(null)}
          className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              {currentUser?.role === 'CLIENTE' ? 'Detalhes do Compromisso' : 'Editar Compromisso'}
            </h2>

            {currentUser?.role === 'CLIENTE' ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-gray-400 font-semibold block mb-0.5">Título:</span>
                  <p className="text-sm font-bold text-gray-900">{selectedEvent.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-400 font-semibold block mb-0.5">Período:</span>
                    <p className="font-semibold text-gray-800">
                      {selectedEvent.end_date && selectedEvent.end_date > selectedEvent.event_date
                        ? `${formatDate(selectedEvent.event_date)} até ${formatDate(selectedEvent.end_date)}`
                        : formatDate(selectedEvent.event_date)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-semibold block mb-0.5">Horário:</span>
                    <p className="font-semibold text-gray-800">
                      {selectedEvent.start_time || 'Horário flexível'} {selectedEvent.end_time ? `até ${selectedEvent.end_time}` : ''}
                    </p>
                  </div>
                </div>
                {selectedEvent.location && (
                  <div>
                    <span className="text-gray-400 font-semibold block mb-0.5">Local / Link:</span>
                    <p className="text-gray-800 font-medium">{selectedEvent.location}</p>
                  </div>
                )}
                {selectedEvent.description && (
                  <div>
                    <span className="text-gray-400 font-semibold block mb-0.5">Descrição:</span>
                    <div
                      className="p-3 bg-gray-50 dark:bg-gray-800/70 rounded-xl text-xs text-gray-700 dark:text-gray-200 leading-relaxed border border-gray-100 dark:border-gray-700/60 break-words prose prose-xs dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEvent.description }}
                    />
                  </div>
                )}
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Título do Compromisso *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Data Início *</label>
                  <input
                    type="date"
                    required
                    value={editForm.event_date}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditForm((prev) => ({
                        ...prev,
                        event_date: val,
                        end_date: prev.end_date && prev.end_date < val ? val : prev.end_date,
                      }));
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Data Fim <span className="text-[10px] text-gray-400 font-normal">(Mais de 1 dia)</span>
                  </label>
                  <input
                    type="date"
                    min={editForm.event_date}
                    value={editForm.end_date || editForm.event_date}
                    onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Horário Início</label>
                  <input
                    type="time"
                    value={editForm.start_time}
                    onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Horário Fim</label>
                  <input
                    type="time"
                    value={editForm.end_time}
                    onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Local / Link</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente Vinculado</label>
                <select
                  value={editForm.client_id}
                  onChange={(e) => setEditForm({ ...editForm, client_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhum (Compromisso Interno)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name || c.trade_name || c.corporate_name || c.name}
                    </option>
                  ))}
                </select>
              </div>

                            {/* Controle de Visibilidade (Plano Equipe Pro) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Visibilidade (Plano Equipe Pro)
                </label>
                <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, visibility: 'grupo' })}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      editForm.visibility !== 'privado'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Grupo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, visibility: 'privado' })}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      editForm.visibility === 'privado'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    Privado
                  </button>
                </div>
              </div>

              {/* Agenda Personalizada (Plano Corporativo) */}
              {customCalendars.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Agenda Vinculada (Plano Corporativo)
                  </label>
                  <select
                    value={editForm.calendar_id || ''}
                    onChange={(e) => {
                      const calId = e.target.value;
                      const cal = customCalendars.find((c) => c.id === calId);
                      setEditForm({
                        ...editForm,
                        calendar_id: calId,
                        ...(cal?.default_visibility ? { visibility: cal.default_visibility } : {}),
                      });
                    }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Criação Global (Sem vínculo a agenda)</option>
                    {customCalendars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.default_visibility === 'privado' ? 'Privada' : 'Grupo'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

<div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">DescriÃ§Ã£o / Pauta</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={isDeleting}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {isSaving ? 'Salvando...' : 'Salvar AlteraÃ§Ãµes'}
                  </button>
                </div>
              </div>
            </form>
            )}
          </div>
        </SafeModalBackdrop>
      </ModalPortal>)}

      {/* ======================================================== */}
      {/* MODAL: CRIAR / EDITAR AGENDA PERSONALIZADA               */}
      {/* ======================================================== */}
      {showCalendarModal && (
        <ModalPortal>
          <SafeModalBackdrop
            onClose={handleCloseCalendarModal}
            isDirty={isCalendarFormDirty}
            confirmMessage="Você possui dados preenchidos na agenda. Deseja realmente descartar e fechar?"
            className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          >
            <div onClick={(e) => e.stopPropagation()} className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={handleCloseCalendarModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                {calendarForm.id ? 'Editar Agenda Personalizada' : 'Nova Agenda Personalizada'}
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Configure calendários específicos (particular, empresa, reuniões) com visibilidade padrão.
              </p>

              <form onSubmit={handleSaveCalendar} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nome da Agenda *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Particular, Empresa, Reuniões..."
                    value={calendarForm.name}
                    onChange={(e) => setCalendarForm({ ...calendarForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cor Identificadora
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={calendarForm.color}
                      onChange={(e) => setCalendarForm({ ...calendarForm, color: e.target.value })}
                      className="w-10 h-9 p-0.5 border border-gray-200 rounded-xl cursor-pointer"
                    />
                    <span className="text-xs font-mono text-gray-600 uppercase">{calendarForm.color}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Visibilidade Padrão (Plano Corporativo)
                  </label>
                  <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setCalendarForm({ ...calendarForm, default_visibility: 'grupo' })}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                        calendarForm.default_visibility !== 'privado'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Grupo
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarForm({ ...calendarForm, default_visibility: 'privado' })}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                        calendarForm.default_visibility === 'privado'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      Privada
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {calendarForm.default_visibility === 'privado'
                      ? 'Eventos criados nesta agenda serão privados para você e administradores por padrão.'
                      : 'Eventos criados nesta agenda serão visíveis para toda a equipe por padrão.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Descrição (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Finalidade desta agenda..."
                    value={calendarForm.description}
                    onChange={(e) => setCalendarForm({ ...calendarForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  {calendarForm.id ? (
                    <button
                      type="button"
                      onClick={handleDeleteCalendar}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  ) : <div />}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCloseCalendarModal}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingCalendar}
                      className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {isSavingCalendar ? 'Salvando...' : 'Salvar Agenda'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </SafeModalBackdrop>
        </ModalPortal>
      )}
    </div>
  );
}
