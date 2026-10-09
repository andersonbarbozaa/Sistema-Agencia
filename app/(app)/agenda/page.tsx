'use client';

import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

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
    notes: '',
  });

  // Edit / View Event Modal
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    client_id: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [evtRes, tasksRes, clientsRes] = await Promise.all([
        fetch('/api/calendar'),
        fetch('/api/tasks'),
        fetch('/api/clients'),
      ]);

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
    if (!confirm(`Tem certeza que deseja excluir o evento "${selectedEvent.title}"?`)) return;

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
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
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
          <div className="overflow-x-auto">
            <div className="min-w-[650px]">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80 text-center py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <div>Dom</div>
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sáb</div>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-100 min-h-[560px]">
            {calendarDays.map((cell, idx) => {
              const dayEvents = events.filter((e) => e.event_date === cell.dateStr);
              const dayTasks = tasks.filter((t) => t.delivery_date && t.delivery_date.startsWith(cell.dateStr));
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  className={`p-2 transition-colors relative flex flex-col justify-between ${
                    cell.currentMonth
                      ? 'bg-white hover:bg-blue-50/20'
                      : 'bg-gray-50/40 opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={cn(
                        'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full',
                        isToday
                          ? 'bg-blue-600 text-white'
                          : cell.currentMonth
                          ? 'text-gray-700'
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
                        className="opacity-0 hover:opacity-100 p-0.5 text-gray-400 hover:text-blue-600 transition-opacity"
                        title="Adicionar compromisso neste dia"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Day Event & Task Chips */}
                  <div className="space-y-1 overflow-y-auto max-h-24 flex-1">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => openEditModal(evt)}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-[11px] cursor-pointer transition-all truncate text-blue-900 font-medium"
                        title={`${evt.start_time || ''} - ${evt.title} (${evt.location || 'Sem local'})`}
                      >
                        <span className="font-bold text-blue-700 mr-1">
                          {evt.start_time?.substring(0, 5)}
                        </span>
                        <span>{evt.title}</span>
                      </div>
                    ))}
                    {dayTasks.map((task) => (
                      <div
                        key={`task-${task.id}`}
                        onClick={() => window.location.href = `/tasks?id=${task.id}`}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-[11px] cursor-pointer transition-all truncate text-amber-900 font-medium"
                        title={`Tarefa: ${task.name}`}
                      >
                        <span className="font-bold text-amber-700 mr-1">
                          Tarefa
                        </span>
                        <span>{task.name}</span>
                      </div>
                    ))}
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
              {[...events.map(e => ({ ...e, type: 'event' })), ...tasks.filter(t => t.delivery_date).map(t => ({ ...t, type: 'task', event_date: t.delivery_date }))]
                .sort((a, b) => (a.event_date > b.event_date ? 1 : -1))
                .map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => item.type === 'event' ? openEditModal(item) : window.location.href = `/tasks?id=${item.id}`}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
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
                            window.location.href = `/tasks?id=${item.id}`;
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
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
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
                  Título do Compromisso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gravação externa, Reunião de Alinhamento..."
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Início *</label>
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
                  placeholder="Ex: Estúdio A, Google Meet..."
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
      )}

      {/* EDIT / DELETE EVENT MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" />
              Editar Compromisso
            </h2>

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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Início *</label>
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição / Pauta</label>
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
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
