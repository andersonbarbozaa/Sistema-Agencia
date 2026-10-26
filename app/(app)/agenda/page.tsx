'use client';

import { useState, useEffect } from 'react';
import ModalPortal from '@/components/ModalPortal';
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
} from 'lucide-react';
import { CalendarEvent } from '@/types';
import { formatDate, cn } from '@/lib/utils';

export default function AgendaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  // Custom Calendars State (Plano Corporativo)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [customCalendars, setCustomCalendars] = useState<any[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('all');
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
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const [confirmState, setConfirmState] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Month navigation for Calendar view
  const [currentDate, setCurrentDate] = useState(new Date());

  // Create Event Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '11:00',
    location: '',
    client_id: '',
    visibility: 'grupo',
    calendar_id: '',
    notes: '',
  });

  // Edit / View Event Modal
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedTaskPreview, setSelectedTaskPreview] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    event_date: '',
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const calQuery = selectedCalendarId && selectedCalendarId !== 'all' ? `?calendar_id=${selectedCalendarId}` : '';
      const [userRes, evtRes, tasksRes, clientsRes, calRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch(`/api/calendar${calQuery}`, { cache: 'no-store' }),
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
    fetchData(); // re-fetch on calendar filter
  }, [selectedCalendarId]);

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
            if (selectedCalendarId === calendarForm.id) setSelectedCalendarId('all');
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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.event_date || !newEvent.start_time) return;

    try {
      setIsSaving(true);
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewEvent({
          title: '',
          description: '',
          event_date: new Date().toISOString().split('T')[0],
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
    setEditForm({
      title: evt.title || '',
      description: evt.description || '',
      event_date: evt.event_date || '',
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ======================================================== */}
      {/* BARRA DE MÚLTIPLAS AGENDAS (Plano Corporativo)            */}
      {/* ======================================================== */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCalendarId('all')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
              selectedCalendarId === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Todas
          </button>

          {customCalendars.map((cal) => (
            <div
              key={cal.id}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer group',
                selectedCalendarId === cal.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
              onClick={() => setSelectedCalendarId(cal.id)}
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: cal.color || '#3b82f6' }}
              />
              <span>{cal.name}</span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1',
                  cal.default_visibility === 'privado'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                )}
              >
                {cal.default_visibility === 'privado' ? 'Privada' : 'Grupo'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditCalendarModal(cal);
                }}
                className="opacity-70 hover:opacity-100 p-0.5 ml-1 rounded hover:bg-black/10 transition-opacity"
                title="Editar Configurações da Agenda"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {currentUser?.role !== 'CLIENTE' && (
          <button
            type="button"
            onClick={openCreateCalendarModal}
            className="px-3.5 py-1.5 bg-gray-50 hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Agenda
          </button>
        )}
      </div>

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
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Contêiner com rolagem horizontal fluida para manter grade legível no mobile */}
          <div className="overflow-x-auto scrollbar-thin overscroll-x-contain">
            <div className="min-w-[680px] md:min-w-full">
              {/* Weekday Headers (DOM a SÁB) */}
              <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80 text-center py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider select-none">
                <div>DOM</div>
                <div>SEG</div>
                <div>TER</div>
                <div>QUA</div>
                <div>QUI</div>
                <div>SEX</div>
                <div>SÁB</div>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-100 min-h-[500px] md:min-h-[560px]">
                {calendarDays.map((cell, idx) => {
                  const dayEvents = (selectedCalendarId === 'all'
                    ? events
                    : events.filter((e) => e.calendar_id === selectedCalendarId)
                  ).filter((e) => e.event_date === cell.dateStr);

                  const dayTasks = (selectedCalendarId === 'all'
                    ? tasks
                    : tasks.filter((t) => t.calendar_id === selectedCalendarId)
                  ).filter((t) => t.delivery_date && t.delivery_date.startsWith(cell.dateStr));

                  const isToday = cell.dateStr === todayStr;

                  // Agrupa compromissos e tarefas cronologicamente por horário
                  const dayItems = [
                    ...dayEvents.map((evt) => ({
                      id: `evt-${evt.id}`,
                      type: 'event' as const,
                      title: evt.title,
                      startTime: evt.start_time ? evt.start_time.substring(0, 5) : '',
                      location: evt.location,
                      status: evt.visibility,
                      calendarId: evt.calendar_id,
                      raw: evt,
                    })),
                    ...dayTasks.map((task) => {
                      let taskTime = '';
                      if (task.delivery_date && task.delivery_date.includes('T')) {
                        taskTime = task.delivery_date.split('T')[1].substring(0, 5);
                      }
                      return {
                        id: `task-${task.id}`,
                        type: 'task' as const,
                        title: task.name,
                        startTime: taskTime,
                        location: task.client_name,
                        status: task.status,
                        calendarId: task.calendar_id,
                        raw: task,
                      };
                    }),
                  ].sort((a, b) => {
                    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
                    if (a.startTime) return -1;
                    if (b.startTime) return 1;
                    return 0;
                  });

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'p-1.5 sm:p-2 transition-colors relative flex flex-col justify-between min-h-[95px] sm:min-h-[110px] group',
                        cell.currentMonth
                          ? isToday
                            ? 'bg-blue-50/25 hover:bg-blue-50/40'
                            : 'bg-white hover:bg-gray-50/60'
                          : 'bg-gray-50/40 opacity-40'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            'text-[11px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full',
                            isToday
                              ? 'bg-blue-600 text-white shadow-xs'
                              : cell.currentMonth
                              ? 'text-gray-800'
                              : 'text-gray-400'
                          )}
                        >
                          {cell.day}
                        </span>
                        {cell.currentMonth && (
                          <button
                            onClick={() => {
                              setNewEvent((prev) => ({ ...prev, event_date: cell.dateStr }));
                              setShowCreateModal(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 text-gray-400 hover:text-blue-600 transition-opacity"
                            title="Adicionar compromisso neste dia"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Compromissos e Tarefas como Pílulas Compactas Cronológicas */}
                      <div className="space-y-1 overflow-y-auto max-h-24 sm:max-h-28 flex-1 scrollbar-none">
                        {dayItems.map((item) => {
                          const isEvent = item.type === 'event';
                          const cal = customCalendars.find((c) => c.id === item.calendarId);

                          // Cores e estilos por tipo e status - Texto sempre branco para máxima legibilidade
                          let pillBg = 'bg-blue-600 hover:bg-blue-700';

                          if (!isEvent) {
                            if (item.status === 'Concluída' || item.status === 'Aprovada') {
                              pillBg = 'bg-emerald-600 hover:bg-emerald-700';
                            } else if (item.raw.delivery_date && item.raw.delivery_date < todayStr) {
                              pillBg = 'bg-rose-600 hover:bg-rose-700';
                            } else if (item.status === 'Em alteração') {
                              pillBg = 'bg-orange-600 hover:bg-orange-700';
                            } else if (item.status === 'Em aprovação') {
                              pillBg = 'bg-amber-600 hover:bg-amber-700';
                            } else {
                              pillBg = 'bg-blue-600 hover:bg-blue-700';
                            }
                          } else if (cal?.color) {
                            pillBg = '';
                          }

                          return (
                            <div
                              key={item.id}
                              onClick={() =>
                                isEvent ? openEditModal(item.raw) : setSelectedTaskPreview(item.raw)
                              }
                              style={isEvent && cal?.color ? { backgroundColor: cal.color } : undefined}
                              className={cn(
                                'px-2 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] cursor-pointer transition-all flex flex-col items-start gap-0.5 min-w-0 shadow-xs group/pill text-white',
                                pillBg
                              )}
                              title={
                                isEvent
                                  ? `${item.startTime ? item.startTime + ' - ' : ''}${item.title} (${item.location || 'Sem local'})`
                                  : `Tarefa: ${item.title}${item.location ? ` (${item.location})` : ''}`
                              }
                            >
                              <div className="flex items-center gap-1.5 w-full">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-white" />
                                {item.startTime && (
                                  <span className="font-bold text-[9px] sm:text-[10px] shrink-0 leading-none text-white/90">
                                    {item.startTime}
                                  </span>
                                )}
                                {!isEvent && (
                                  <span className="text-[9px] font-semibold text-white/90 truncate">
                                    {item.status}
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-white line-clamp-2 break-words leading-tight w-full">
                                {item.title}
                              </span>
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
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex justify-between items-center">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Todos os Compromissos Agendados ({events.length})
            </h3>
            <span className="text-xs text-gray-400">Clique para editar ou excluir</span>
          </div>

          {events.length === 0 && tasks.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              Nenhum compromisso ou tarefa cadastrada na agenda.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {[(selectedCalendarId === 'all' ? events : events.filter(e => e.calendar_id === selectedCalendarId)).map(e => ({ ...e, type: 'event' })), ...(selectedCalendarId === 'all' ? tasks : tasks.filter(t => t.calendar_id === selectedCalendarId)).filter(t => t.delivery_date).map(t => ({ ...t, type: 'task', event_date: t.delivery_date }))]
                .sort((a, b) => (a.event_date > b.event_date ? 1 : -1))
                .map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => item.type === 'event' ? openEditModal(item) : setSelectedTaskPreview(item)}
                    className="p-4 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{item.title || item.name}</span>
                        {item.type === 'task' && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-semibold">
                            Tarefa
                          </span>
                        )}
                        {item.client_name && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
                            {item.client_name}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
                        <span className="flex items-center gap-1 font-semibold text-blue-600">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {formatDate(item.event_date)}
                        </span>
                        {item.type === 'event' && item.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {item.start_time.substring(0, 5)}
                            {item.end_time ? ` - ${item.end_time.substring(0, 5)}` : ''}
                          </span>
                        )}
                        {item.type === 'event' && item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {item.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.type === 'event') {
                            openEditModal(item);
                          } else {
                            setSelectedTaskPreview(item);
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1.5 transition-colors"
                      >
                        {item.type === 'event' ? <Edit3 className="w-3.5 h-3.5" /> : <ListIcon className="w-3.5 h-3.5" />}
                        {item.type === 'event' ? 'Editar' : 'Ver Tarefa'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (<ModalPortal>
        <div onClick={() => setShowCreateModal(false)} className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div onClick={(e) => e.stopPropagation()} className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              Novo Compromisso na Agenda
            </h2>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  TÃ­tulo do Compromisso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: GravaÃ§Ã£o externa, ReuniÃ£o de Alinhamento..."
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">InÃ­cio *</label>
                  <input
                    type="time"
                    required
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fim</label>
                  <input
                    type="time"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Local / Link</label>
                <input
                  type="text"
                  placeholder="Ex: EstÃºdio A, Google Meet..."
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente Vinculado</label>
                <select
                  value={newEvent.client_id}
                  onChange={(e) => setNewEvent({ ...newEvent, client_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhum (Compromisso Interno)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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
                  placeholder="InformaÃ§Ãµes adicionais, roteiro ou tÃ³picos..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Compromisso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>)}

      {/* EDIT / DELETE EVENT MODAL */}
      
      {/* Modal de Pré-visualização de Tarefa */}
      {selectedTaskPreview && (<ModalPortal>
        <div onClick={() => setSelectedTaskPreview(null)} className="fixed inset-0 !m-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center sm:p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white sm:rounded-2xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-sm font-bold text-gray-900">Detalhes da Tarefa</h3>
              <button
                onClick={() => setSelectedTaskPreview(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título</label>
                <p className="text-sm text-gray-900">{selectedTaskPreview.title}</p>
              </div>
              
              {selectedTaskPreview.client_name && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente</label>
                  <p className="text-sm text-gray-900">{selectedTaskPreview.client_name}</p>
                </div>
              )}

              {selectedTaskPreview.project_name && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Projeto</label>
                  <p className="text-sm text-gray-900">{selectedTaskPreview.project_name}</p>
                </div>
              )}

              {selectedTaskPreview.description && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedTaskPreview.description}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Data de Entrega</label>
                <p className="text-sm text-gray-900">
                  {selectedTaskPreview.event_date ? new Date(selectedTaskPreview.event_date).toLocaleDateString('pt-BR') : 'Sem data'}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
              <button
                onClick={async () => {
                  if (!confirm(`Tem certeza que deseja excluir a tarefa "${selectedTaskPreview.title}"?`)) return;
                  try {
                    const res = await fetch(`/api/tasks/${selectedTaskPreview.id}`, { method: 'DELETE' });
                    if (res.ok) {
                      setSelectedTaskPreview(null);
                      await fetchData();
                    } else {
                      const err = await res.json();
                      alert(err.error || 'Erro ao excluir tarefa.');
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-semibold transition-colors"
              >
                Excluir
              </button>
              
              <button
                onClick={() => window.location.href = `/tasks?id=${selectedTaskPreview.id}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex-1 text-center"
              >
                Editar Completo
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {selectedEvent && (<ModalPortal>
        <div onClick={() => setSelectedEvent(null)} className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                    <span className="text-gray-400 font-semibold block mb-0.5">Data:</span>
                    <p className="font-semibold text-gray-800">{formatDate(selectedEvent.event_date)}</p>
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
                    <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-xl border border-gray-100">{selectedEvent.description}</p>
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
                  TÃ­tulo do Compromisso *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={editForm.event_date}
                    onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">InÃ­cio *</label>
                  <input
                    type="time"
                    required
                    value={editForm.start_time}
                    onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fim</label>
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
                      {c.name}
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
        </div>
      </ModalPortal>)}

      {/* ======================================================== */}
      {/* MODAL: CRIAR / EDITAR AGENDA PERSONALIZADA               */}
      {/* ======================================================== */}
      {showCalendarModal && (
        <ModalPortal>
          <div onClick={() => setShowCalendarModal(false)} className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div onClick={(e) => e.stopPropagation()} className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
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
                      onClick={() => setShowCalendarModal(false)}
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
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
