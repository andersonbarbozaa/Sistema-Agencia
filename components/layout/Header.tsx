'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  Plus,
  CheckSquare,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  ChevronDown,
  Menu,
  AlertTriangle,
  Clock,
  FileCheck2,
  CheckCircle2,
  X,
  Trash2,
} from 'lucide-react';
import { User, Notification } from '@/types';
import { cn } from '@/lib/utils';

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);

  // Dynamic Route Metadata (Title, Subtitle, Action Label, Action Event)
  const getRouteConfig = () => {
    if (pathname.startsWith('/tasks')) {
      return {
        title: 'Tarefas',
        subtitle: 'Produção audiovisual, aprovação de conteúdos e prazos de entrega.',
        actionLabel: 'Nova Tarefa',
        actionType: 'task',
        actionEvent: 'open-create-task',
        fallbackPath: '/tasks',
      };
    }
    if (pathname.startsWith('/clients')) {
      return {
        title: 'Clientes',
        subtitle: 'Gestão cadastral, contratos, projetos e histórico financeiro de cada conta.',
        actionLabel: 'Novo Cliente',
        actionType: 'client',
        actionEvent: 'open-create-client',
        fallbackPath: '/clients',
      };
    }
    if (pathname.startsWith('/crm')) {
      return {
        title: 'CRM',
        subtitle: 'Funil de novos clientes, histórico de negociações e controle de follow-up.',
        actionLabel: 'Novo Lead',
        actionType: 'lead',
        actionEvent: 'open-create-lead',
        fallbackPath: '/crm',
      };
    }
    if (pathname.startsWith('/finance')) {
      return {
        title: 'Financeiro',
        subtitle: 'Controle de entradas, saídas, conciliação e comparativo de parceiros.',
        actionLabel: 'Novo Lançamento',
        actionType: 'transaction',
        actionEvent: 'open-create-transaction',
        fallbackPath: '/finance',
      };
    }
    if (pathname.startsWith('/agenda')) {
      return {
        title: 'Agenda',
        subtitle: 'Gerenciamento de reuniões, gravações, ensaios e compromissos da agência.',
        actionLabel: 'Novo Compromisso',
        actionType: 'event',
        actionEvent: 'open-create-event',
        fallbackPath: '/agenda',
      };
    }
    if (pathname.startsWith('/notifications')) {
      return {
        title: 'Central de Notificações',
        subtitle: 'Alertas de aprovação, prazos, vencimentos financeiros e novas atribuições.',
        actionLabel: null,
        actionType: null,
        actionEvent: null,
        fallbackPath: null,
      };
    }
    if (pathname.startsWith('/settings')) {
      return {
        title: 'Configurações do Sistema',
        subtitle: 'Administração do seu perfil, equipe e cargos, categorias, parâmetros financeiros e IA.',
        actionLabel: null,
        actionType: null,
        actionEvent: null,
        fallbackPath: null,
      };
    }
    return {
      title: 'Dashboard Geral',
      subtitle: 'Visão geral e indicadores estratégicos da agência.',
      actionLabel: 'Criar Novo',
      actionType: 'dropdown',
      actionEvent: null,
      fallbackPath: null,
    };
  };

  const routeConfig = getRouteConfig();

  // Load unread count & notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const list: Notification[] = data.notifications || data.data || [];
        setNotifications(list);
        const count = typeof data.unread_count === 'number'
          ? data.unread_count
          : list.filter((n) => !n.read_at).length;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (createRef.current && !createRef.current.contains(event.target as Node)) {
        setShowCreateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!confirm('Deseja realmente limpar todas as notificações?')) return;
    try {
      const res = await fetch('/api/notifications', { method: 'DELETE' });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    // If unread, mark as read
    if (!n.read_at) {
      try {
        await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' });
        setNotifications(prev =>
          prev.map(item => (item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification as read', err);
      }
    }
    setShowNotifications(false);

    // Direct routing according to notification module & reference
    if (n.reference_module === 'tasks' && n.reference_id) {
      router.push(`/tasks?id=${n.reference_id}`);
    } else if (n.reference_module === 'tasks') {
      router.push('/tasks');
    } else if (n.reference_module === 'finance') {
      router.push('/finance');
    } else if (n.reference_module === 'crm') {
      router.push('/crm');
    } else if (n.reference_module === 'calendar') {
      router.push('/agenda');
    } else {
      router.push('/notifications');
    }
  };

  // Contextual Action helper
  const handleQuickCreate = (type: string) => {
    setShowCreateDropdown(false);
    if (type === 'task') {
      window.dispatchEvent(new CustomEvent('open-create-task'));
      if (pathname !== '/tasks') router.push('/tasks?new=true');
    } else if (type === 'client') {
      window.dispatchEvent(new CustomEvent('open-create-client'));
      if (pathname !== '/clients') router.push('/clients?new=true');
    } else if (type === 'lead') {
      window.dispatchEvent(new CustomEvent('open-create-lead'));
      if (pathname !== '/crm') router.push('/crm?new=true');
    } else if (type === 'transaction') {
      window.dispatchEvent(new CustomEvent('open-create-transaction'));
      if (pathname !== '/finance') router.push('/finance?new=true');
    } else if (type === 'event') {
      window.dispatchEvent(new CustomEvent('open-create-event'));
      if (pathname !== '/agenda') router.push('/agenda?new=true');
    }
  };

  const handlePrimaryButtonClick = () => {
    if (routeConfig.actionType === 'dropdown') {
      setShowCreateDropdown(!showCreateDropdown);
    } else if (routeConfig.actionEvent) {
      window.dispatchEvent(new CustomEvent(routeConfig.actionEvent));
      if (routeConfig.fallbackPath && pathname !== routeConfig.fallbackPath) {
        router.push(`${routeConfig.fallbackPath}?new=true`);
      }
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-3.5 sm:px-6 flex items-center justify-between z-20 flex-shrink-0">
      {/* Mobile Hamburger & Dynamic Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
          className="p-2 -ml-1 text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors md:hidden flex-shrink-0"
          title="Abrir menu"
        >
          <Menu size={22} />
        </button>

        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 tracking-tight leading-snug truncate">
            {routeConfig.title}
          </h1>
          {routeConfig.subtitle && (
            <p className="hidden sm:block text-xs text-gray-500 truncate leading-tight mt-0.5">
              {routeConfig.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right actions: Contextual Action Button + Notifications */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {user.role !== 'CLIENTE' && routeConfig.actionLabel && (
          <div className="relative" ref={createRef}>
            <button
              onClick={handlePrimaryButtonClick}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span className="hidden sm:inline">{routeConfig.actionLabel}</span>
              <span className="sm:hidden text-xs">
                {routeConfig.actionLabel.replace('Novo ', '').replace('Nova ', '').replace('Criar ', '')}
              </span>
              {routeConfig.actionType === 'dropdown' && (
                <ChevronDown size={13} className={cn('transition-transform duration-200', showCreateDropdown ? 'rotate-180' : '')} />
              )}
            </button>

            {/* Quick Create Dropdown for Dashboard */}
            {routeConfig.actionType === 'dropdown' && showCreateDropdown && (
              <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-auto sm:mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => handleQuickCreate('task')}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
                >
                  <CheckSquare size={14} className="text-blue-500" />
                  Nova Tarefa
                </button>
                <button
                  onClick={() => handleQuickCreate('client')}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
                >
                  <Users size={14} className="text-emerald-500" />
                  Novo Cliente
                </button>
                <button
                  onClick={() => handleQuickCreate('lead')}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
                >
                  <TrendingUp size={14} className="text-purple-500" />
                  Novo Lead (CRM)
                </button>
                {user.role === 'ADMINISTRADOR' && (
                  <button
                    onClick={() => handleQuickCreate('transaction')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
                  >
                    <DollarSign size={14} className="text-amber-500" />
                    Novo Lançamento
                  </button>
                )}
                <button
                  onClick={() => handleQuickCreate('event')}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
                >
                  <Calendar size={14} className="text-indigo-500" />
                  Novo Compromisso
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              const nextState = !showNotifications;
              setShowNotifications(nextState);
              setShowCreateDropdown(false);
              if (nextState) {
                fetchNotifications();
              }
            }}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            title="Notificações"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-24px)] sm:w-96 max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/90 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-xs sm:text-sm text-gray-900 truncate">Notificações</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-bold">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                      title="Marcar todas como lidas"
                    >
                      Marcar todas lidas
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAllNotifications}
                      className="text-[11px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 transition-colors"
                      title="Limpar todas as notificações"
                    >
                      <Trash2 size={12} />
                      Limpar Notificações
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {notifications.filter((n) => !n.read_at).length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">
                    Nenhuma notificação pendente.
                  </div>
                ) : (
                  notifications
                    .filter((n) => !n.read_at)
                    .slice(0, 8)
                    .map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className="p-3.5 hover:bg-blue-50/50 transition-colors text-xs cursor-pointer flex items-start gap-3 bg-blue-50/30 group relative"
                      >
                        <div
                          className={cn(
                            'p-2 rounded-xl flex-shrink-0 mt-0.5',
                            n.type === 'client_approval'
                              ? 'bg-emerald-100 text-emerald-700'
                              : n.type === 'change_request'
                              ? 'bg-amber-100 text-amber-700'
                              : n.type === 'bill_due'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          )}
                        >
                          {n.type === 'client_approval' ? (
                            <FileCheck2 size={15} />
                          ) : n.type === 'change_request' ? (
                            <AlertTriangle size={15} />
                          ) : n.type === 'bill_due' ? (
                            <Clock size={15} />
                          ) : (
                            <Bell size={15} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-start justify-between gap-1.5 mb-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                              <p className="font-bold text-gray-900 truncate">
                                {n.title}
                              </p>
                            </div>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                              {n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR') : ''}
                            </span>
                          </div>
                          <p className="text-gray-600 leading-relaxed line-clamp-2">{n.message}</p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotification(e, n.id)}
                          className="absolute right-2 top-2 p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors opacity-70 group-hover:opacity-100"
                          title="Remover notificação"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                )}
              </div>

              <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Ver todas as notificações &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
