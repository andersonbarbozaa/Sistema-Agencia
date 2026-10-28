'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  Menu,
  Search,
  X,
  User as UserIcon,
  Settings,
  LogOut,
  Plus,
  CheckSquare,
  Users,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  FileCheck2,
  Trash2,
  ChevronDown,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import { User, Notification } from '@/types';
import { isMasterAdmin } from '@/lib/auth-constants';
import { cn, formatCurrency } from '@/lib/utils';

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // User Profile Dropdown State
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    tasks: any[];
    clients: any[];
    events: any[];
    finance: any[];
  }>({ tasks: [], clients: [], events: [], finance: [] });
  const [isSearching, setIsSearching] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const list: Notification[] = data.notifications || data.data || [];
        setNotifications(list);
        const count = list.filter((n) => !n.read_at).length;
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

  // Linked clients for switching company in profile dropdown
  const [linkedClients, setLinkedClients] = useState<any[]>([]);

  // Active client identification for client logins / multi-company
  const isClientLogin = user?.role === 'CLIENTE' || !!user?.client_id || linkedClients.length > 0;
  const activeClient = linkedClients.find((c) => c.id === user?.client_id) || (user?.role === 'CLIENTE' && linkedClients.length > 0 ? linkedClients[0] : null);

  // Foto e nome seguem a empresa ativa que o cliente está visualizando
  const headerAvatarUrl = (isClientLogin && activeClient)
    ? activeClient.avatar_url
    : user?.avatar_url;

  const headerFallback = (isClientLogin && activeClient)
    ? ((activeClient.company_name || activeClient.trade_name || activeClient.name || 'C').charAt(0).toUpperCase())
    : ((user?.name || 'U').charAt(0).toUpperCase());

  const headerDisplayName = (isClientLogin && activeClient)
    ? (activeClient.company_name || activeClient.trade_name || activeClient.corporate_name || activeClient.name || user?.name)
    : user?.name;

  useEffect(() => {
    async function loadLinkedClients() {
      try {
        const res = await fetch('/api/auth/switch-client');
        if (res.ok) {
          const json = await res.json();
          if (json.clients && json.clients.length > 0) {
            setLinkedClients(json.clients);
          }
        }
      } catch (err) {
        console.error('Error loading linked clients in header:', err);
      }
    }
    loadLinkedClients();

    const handleUpdate = () => {
      loadLinkedClients();
    };
    window.addEventListener('workspace-updated', handleUpdate);
    window.addEventListener('user-updated', handleUpdate);
    return () => {
      window.removeEventListener('workspace-updated', handleUpdate);
      window.removeEventListener('user-updated', handleUpdate);
    };
  }, []);

  // Creation button config before notification icon
  const getCreateButtonConfig = () => {
    if (user?.role === 'CLIENTE') return null;
    if (pathname.startsWith('/settings')) return null;

    if (pathname.startsWith('/tasks')) {
      return {
        label: 'Nova Tarefa',
        action: () => window.dispatchEvent(new CustomEvent('open-new-task')),
      };
    }
    if (pathname.startsWith('/crm')) {
      return {
        label: 'Novo Lead',
        action: () => window.dispatchEvent(new CustomEvent('open-new-lead')),
      };
    }
    if (pathname.startsWith('/clients')) {
      return {
        label: 'Novo Cliente',
        action: () => window.dispatchEvent(new CustomEvent('open-new-client')),
      };
    }
    if (pathname.startsWith('/agenda')) {
      return {
        label: 'Novo Compromisso',
        action: () => window.dispatchEvent(new CustomEvent('open-new-event')),
      };
    }
    if (pathname.startsWith('/finance')) {
      return {
        label: 'Nova Transação',
        action: () => window.dispatchEvent(new CustomEvent('open-new-transaction')),
      };
    }
    if (pathname.startsWith('/projects')) {
      return {
        label: 'Novo Projeto',
        action: () => window.dispatchEvent(new CustomEvent('open-new-project')),
      };
    }
    if (pathname === '/dashboard') {
      return {
        label: 'Nova Tarefa',
        action: () => router.push('/tasks?new=true'),
      };
    }
    return null;
  };

  const createConfig = getCreateButtonConfig();

  // Search Handler with Debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults({ tasks: [], clients: [], events: [], finance: [] });
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for all dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setSearchQuery('');
        setShowNotifications(false);
        setShowUserDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Menu button click
  const handleMenuClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'));
    } else {
      window.dispatchEvent(new CustomEvent('toggle-desktop-sidebar'));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
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
    if (!n.read_at) {
      try {
        await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' });
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification as read', err);
      }
    }
    setShowNotifications(false);

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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
    }
  };

  const companyName = user.workspace_name || 'PixelCraft Studio';
  const companyLogo = user.workspace_logo;

  const totalResults =
    searchResults.tasks.length +
    searchResults.clients.length +
    searchResults.events.length +
    searchResults.finance.length;

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3.5 sm:px-6 flex items-center justify-between z-20 flex-shrink-0 transition-colors">
      {/* 1. LADO ESQUERDO: Botão de Menu + Logo da Empresa (Oculto em Web / Desktop) */}
      <div className="flex md:hidden items-center gap-3 min-w-0 pr-3">
        <button
          type="button"
          onClick={handleMenuClick}
          className="p-2 -ml-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Alternar menu lateral"
        >
          <Menu size={20} />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              className="w-8 h-8 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="hidden sm:flex flex-col min-w-0">
            <span className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight truncate group-hover:text-blue-600 transition-colors">
              {companyName}
            </span>
            <span className="text-[10px] text-gray-400 font-medium truncate">
              {user.workspace_description || 'Agência Digital'}
            </span>
          </div>
        </Link>
      </div>

      {/* 2. CENTRO: Busca Retrátil com Listagem Suspensa de Resultados */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4 md:ml-0 md:mr-4 relative" ref={searchRef}>
        <div
          className={cn(
            'flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border rounded-xl px-3 py-1.5 transition-all',
            isSearchOpen
              ? 'border-blue-500 ring-2 ring-blue-500/10 bg-white dark:bg-gray-800 shadow-sm'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          )}
        >
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar tarefas, clientes, finanças... (Ctrl+K)"
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            className="w-full bg-transparent text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="p-0.5 text-gray-400 hover:text-gray-600 rounded-md shrink-0"
              title="Limpar busca (X)"
            >
              <X size={14} />
            </button>
          )}

          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shrink-0">
            ⌘K
          </kbd>
        </div>

        {/* Dropdown de Resultados da Busca */}
        {isSearchOpen && searchQuery.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[75vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/80 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 dark:text-gray-200">
                {isSearching ? 'Pesquisando...' : `Resultados para "${searchQuery}" (${totalResults})`}
              </span>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X size={14} />
              </button>
            </div>

            {totalResults === 0 && !isSearching ? (
              <div className="p-8 text-center text-xs text-gray-400">
                Nenhum resultado encontrado para &quot;{searchQuery}&quot;.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/60 p-2 space-y-2">
                {/* Tarefas */}
                {searchResults.tasks.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1 block">
                      Tarefas
                    </span>
                    {searchResults.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          router.push(`/tasks?id=${task.id}`);
                        }}
                        className="flex items-center justify-between p-2 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 rounded-xl cursor-pointer text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <CheckSquare size={14} className="text-blue-500 shrink-0" />
                          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {task.title}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 shrink-0">
                          {task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Clientes */}
                {searchResults.clients.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1 block">
                      Clientes
                    </span>
                    {searchResults.clients.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          router.push(`/clients`);
                        }}
                        className="flex items-center justify-between p-2 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 rounded-xl cursor-pointer text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <Users size={14} className="text-emerald-500 shrink-0" />
                          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {client.title}
                          </span>
                        </div>
                        {client.subtitle && (
                          <span className="text-[11px] text-gray-400 truncate max-w-[150px]">
                            {client.subtitle}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Agenda */}
                {searchResults.events.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1 block">
                      Agenda & Eventos
                    </span>
                    {searchResults.events.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          router.push(`/agenda`);
                        }}
                        className="flex items-center justify-between p-2 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 rounded-xl cursor-pointer text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <Calendar size={14} className="text-indigo-500 shrink-0" />
                          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {evt.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 shrink-0">
                          {evt.date ? new Date(evt.date).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Financeiro */}
                {searchResults.finance.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1 block">
                      Financeiro
                    </span>
                    {searchResults.finance.map((tx) => (
                      <div
                        key={tx.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          router.push(`/finance`);
                        }}
                        className="flex items-center justify-between p-2 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 rounded-xl cursor-pointer text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <DollarSign size={14} className="text-amber-500 shrink-0" />
                          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {tx.title}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'font-bold text-xs shrink-0',
                            tx.sub_type === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'
                          )}
                        >
                          {tx.sub_type === 'Entrada' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. LADO DIREITO: Notificações + Perfil do Usuário */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Notificações (com badge numérico e botão "Ver todas") */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              const nextState = !showNotifications;
              setShowNotifications(nextState);
              setShowUserDropdown(false);
              if (nextState) fetchNotifications();
            }}
            className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            title="Notificações"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white leading-none shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown de Notificações */}
          {showNotifications && (
            <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-24px)] sm:w-96 max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/90 dark:bg-gray-800/90 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                    Notificações
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 px-1.5 py-0.5 rounded-full font-bold">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold transition-colors"
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
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60">
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
                        className="p-3.5 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors text-xs cursor-pointer flex items-start gap-3 bg-blue-50/30 dark:bg-blue-950/10 group relative"
                      >
                        <div
                          className={cn(
                            'p-2 rounded-xl flex-shrink-0 mt-0.5',
                            n.type === 'client_approval'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : n.type === 'change_request'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : n.type === 'bill_due'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
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
                            <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                              {n.title}
                            </p>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                              {n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR') : ''}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                            {n.message}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotification(e, n.id)}
                          className="absolute right-2 top-2 p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors opacity-70 group-hover:opacity-100"
                          title="Remover notificação"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                )}
              </div>

              {/* Botão "Ver todas" */}
              <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-center">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Ver todas as notificações &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Perfil do Usuário (dropdown com Perfil, Configurações e Sair) */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
          >
            {headerAvatarUrl ? (
              <img
                src={headerAvatarUrl}
                alt={headerDisplayName}
                className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {headerFallback}
              </div>
            )}
            <div className="hidden lg:flex flex-col text-left">
              <span
                className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight max-w-[140px] sm:max-w-[180px] lg:max-w-[220px] truncate block"
                title={headerDisplayName}
              >
                {headerDisplayName}
              </span>
              <span className="text-[10px] text-gray-400 leading-none">
                {isClientLogin ? 'Cliente' : (user.job_title || (user.role === 'ADMINISTRADOR' ? 'Admin' : 'Equipe'))}
              </span>
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </button>

          {/* User Profile Dropdown Menu */}
          {showUserDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {isClientLogin && activeClient ? (activeClient.company_name || activeClient.trade_name || user.name) : user.name}
                </p>
                {isClientLogin && activeClient && activeClient.name && (activeClient.company_name || activeClient.trade_name) && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5">
                    Cliente: {activeClient.name}
                  </p>
                )}
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.email}</p>
                <span className="mt-1.5 inline-block px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  {isClientLogin ? 'Painel do Cliente' : (user.job_title || user.role)}
                </span>
              </div>

              {/* Seção de Trocar de Empresa/Conta (quando há mais de uma conta no mesmo email) */}
              {linkedClients.length > 1 && (
                <div className="border-b border-gray-100 dark:border-gray-700 py-1.5 bg-gray-50/70 dark:bg-gray-800/80">
                  <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Minhas Empresas ({linkedClients.length})
                  </p>
                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
                    {linkedClients.map((client) => {
                      const isCurrent = client.id === user.client_id;
                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={async () => {
                            if (isCurrent) return;
                            try {
                              await fetch('/api/auth/switch-client', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ client_id: client.id }),
                              });
                              window.location.reload();
                            } catch (err) {
                              console.error('Error switching client:', err);
                            }
                          }}
                          className={cn(
                            'w-full flex items-center justify-between px-4 py-2 text-xs transition-colors text-left group/item',
                            isCurrent
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-750'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 overflow-hidden font-bold">
                              {client.avatar_url ? (
                                <img src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
                              ) : (
                                (client.name || 'C').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="truncate font-semibold">{client.company_name || client.trade_name || client.corporate_name || client.name}</span>
                              {client.name && (client.company_name || client.corporate_name) && (client.company_name || client.corporate_name) !== client.name && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-none">Cliente: {client.name}</span>
                              )}
                            </div>
                          </div>
                          {isCurrent ? (
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">Ativo</span>
                          ) : (
                            <span className="text-[10px] text-gray-400 group-hover/item:text-blue-600 shrink-0 font-medium">Trocar &rarr;</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="py-1">
                {isMasterAdmin(user) && (
                  <Link
                    href="/admin-master"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <ShieldCheck size={15} className="text-gray-400" />
                    Master Admin
                  </Link>
                )}

                <Link
                  href="/settings?tab=profile"
                  onClick={() => setShowUserDropdown(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
                >
                  <UserIcon size={15} className="text-gray-400" />
                  Meu Perfil
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setShowUserDropdown(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
                >
                  <Settings size={15} className="text-gray-400" />
                  Configurações
                </Link>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left font-semibold"
                >
                  <LogOut size={15} />
                  Sair do Sistema
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
