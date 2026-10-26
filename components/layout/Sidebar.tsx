'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User as UserIcon,
  Building2,
  FolderTree,
  Coins,
  Bot,
  Sun,
  Type,
  CreditCard,
  X,
  LogOut,
} from 'lucide-react';
import { User } from '@/types';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

interface SubMenuItem {
  tab: string;
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { href: '/clients', label: 'Clientes', icon: Users, roles: ['ADMINISTRADOR', 'COLABORADOR'] },
  { href: '/crm', label: 'CRM', icon: TrendingUp, roles: ['ADMINISTRADOR', 'COLABORADOR'] },
  { href: '/finance', label: 'Financeiro', icon: DollarSign, roles: ['ADMINISTRADOR'] },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

const settingsSubItems: SubMenuItem[] = [
  { tab: 'profile', href: '/settings?tab=profile', label: 'Meu Perfil', icon: UserIcon },
  { tab: 'company', href: '/settings?tab=company', label: 'Perfil da Empresa', icon: Building2 },
  { tab: 'plans', href: '/settings?tab=plans', label: 'Assinaturas e Planos', icon: CreditCard },
  { tab: 'users', href: '/settings?tab=users', label: 'Usuários', icon: Users },
  { tab: 'categories', href: '/settings?tab=categories', label: 'Categorias do Sistema', icon: FolderTree },
  { tab: 'finance', href: '/settings?tab=finance', label: 'Categoria Financeiro', icon: Coins },
  { tab: 'ai', href: '/settings?tab=ai', label: 'IA', icon: Bot },
  { tab: 'appearance', href: '/settings?tab=appearance', label: 'Tema', icon: Sun },
  { tab: 'formatting', href: '/settings?tab=formatting', label: 'Padrões de Roteiro', icon: Type },
];

interface SidebarProps {
  user: User;
}

function SidebarInner({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [liveUser, setLiveUser] = useState<User>(user);

  useEffect(() => {
    setLiveUser(user);
  }, [user]);

  useEffect(() => {
    const refreshUser = async (e?: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt?.detail) {
        setLiveUser((prev) => ({
          ...prev,
          ...customEvt.detail,
        }));
      }
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setLiveUser(data.user);
          }
        }
      } catch {}
    };

    window.addEventListener('workspace-updated', refreshUser);
    window.addEventListener('user-updated', refreshUser);
    return () => {
      window.removeEventListener('workspace-updated', refreshUser);
      window.removeEventListener('user-updated', refreshUser);
    };
  }, []);

  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);
    const handleToggleDesktop = () => setCollapsed((prev) => !prev);

    window.addEventListener('toggle-mobile-sidebar', handleToggle);
    window.addEventListener('close-mobile-sidebar', handleClose);
    window.addEventListener('toggle-desktop-sidebar', handleToggleDesktop);
    return () => {
      window.removeEventListener('toggle-mobile-sidebar', handleToggle);
      window.removeEventListener('close-mobile-sidebar', handleClose);
      window.removeEventListener('toggle-desktop-sidebar', handleToggleDesktop);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, currentTab]);

  const visibleItems = navItems.filter((item) => {
    if (liveUser.role === 'CLIENTE') {
      return ['/dashboard', '/tasks', '/agenda', '/settings'].includes(item.href);
    }
    return !item.roles || item.roles.includes(liveUser.role);
  });

  const visibleSubItems = settingsSubItems.filter((sub) => {
    if (liveUser.role === 'CLIENTE') {
      return ['company', 'profile', 'appearance'].includes(sub.tab);
    }
    return true;
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
    }
  };

  const companyName = liveUser.workspace_name || 'PixelCraft Studio';
  const companyDescription = liveUser.workspace_description;
  const companyLogo = liveUser.workspace_logo;

  const formatUserName = (fullName: string) => {
    if (!fullName) return { first: '', rest: '' };
    const parts = fullName.trim().split(/\s+/);
    return {
      first: parts[0] || '',
      rest: parts.slice(1).join(' '),
    };
  };

  const { first: userFirstName, rest: userRestName } = formatUserName(liveUser.name);
  const userRoleDisplay = liveUser.job_title || liveUser.position_name || 'Administrador';

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 md:hidden shadow-2xl select-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Header: Área 1 - Dados da Empresa */}
        <div className="flex items-center justify-between h-16 border-b border-gray-200 px-4">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30 overflow-hidden ring-2 ring-blue-500/20">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-extrabold text-base tracking-wider">
                  {companyName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-gray-900 font-bold text-sm tracking-tight truncate">{companyName}</p>
              {companyDescription && (
                <p className="text-gray-500 text-[11px] truncate">{companyDescription}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            title="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isSettings = item.href === '/settings';
            const isActive = isSettings ? pathname.startsWith('/settings') && currentTab === 'overview' : pathname === item.href;
            const isSectionActive = isSettings && pathname.startsWith('/settings');

            if (isSettings) {
              return (
                <div key={item.href} className="space-y-1">
                  <Link
                    href="/settings?tab=overview"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isSectionActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>

                  {isSectionActive && (
                    <div className="ml-5 pl-2.5 border-l border-gray-200 space-y-1 py-1">
                      {visibleSubItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = pathname.startsWith('/settings') && currentTab === sub.tab;
                        return (
                          <Link
                            key={sub.tab}
                            href={sub.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all duration-150',
                              isSubActive
                                ? 'bg-blue-50 text-blue-600 font-semibold'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            )}
                          >
                            <SubIcon size={14} className="flex-shrink-0" />
                            <span className="truncate">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile User Profile: Área 2 - Dados do Utilizador */}
        <div className="border-t border-gray-200 p-3.5 pb-8 bg-gray-50">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/settings?tab=profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 min-w-0 flex-1 p-1 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ring-2 ring-blue-500/20 overflow-hidden">
                {liveUser.avatar_url ? (
                  <img src={liveUser.avatar_url} alt={liveUser.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  liveUser.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-gray-900 text-xs truncate">
                  <strong className="font-bold">{userFirstName}</strong>
                  {userRestName ? ` ${userRestName}` : ''}
                </p>
                <p className="text-gray-500 text-[10px] truncate flex items-center gap-1">
                  <span>{userRoleDisplay}</span>
                  {liveUser.is_partner === 1 && (
                    <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.2 rounded font-semibold">
                      Sócio
                    </span>
                  )}
                </p>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              title="Sair do sistema"
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex relative flex-shrink-0 bg-white flex-col transition-all duration-300 border-r border-gray-200 select-none z-30',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Brand / Logo: Área 1 - Dados da Empresa */}
        <div className={cn('flex items-center h-16 border-b border-gray-200 px-4', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30 overflow-hidden ring-2 ring-blue-500/20">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-extrabold text-base tracking-wider">
                {companyName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-gray-900 font-bold text-sm tracking-tight truncate">{companyName}</p>
              {companyDescription && (
                <p className="text-gray-500 text-[11px] truncate">{companyDescription}</p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1 scrollbar-thin">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isSettings = item.href === '/settings';
            const isActive = isSettings ? pathname.startsWith('/settings') && currentTab === 'overview' : pathname === item.href;
            const isSectionActive = isSettings && pathname.startsWith('/settings');

            if (isSettings) {
              return (
                <div key={item.href} className="space-y-1">
                  <Link
                    href="/settings?tab=overview"
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group',
                      collapsed ? 'justify-center px-2' : '',
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isSectionActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>

                  {!collapsed && isSectionActive && (
                    <div className="ml-4 pl-2.5 border-l border-gray-200 space-y-0.5 py-1">
                      {visibleSubItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = pathname.startsWith('/settings') && currentTab === sub.tab;
                        return (
                          <Link
                            key={sub.tab}
                            href={sub.href}
                            className={cn(
                              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150',
                              isSubActive
                                ? 'bg-blue-50 text-blue-600 font-semibold'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            )}
                          >
                            <SubIcon size={14} className="flex-shrink-0" />
                            <span className="truncate">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  collapsed ? 'justify-center px-2' : ''
                )}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User profile at bottom-left: Área 2 - Dados do Utilizador */}
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                title={`${liveUser.name} (${userRoleDisplay})`}
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden"
              >
                {liveUser.avatar_url ? (
                  <img src={liveUser.avatar_url} alt={liveUser.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  liveUser.name.charAt(0).toUpperCase()
                )}
              </div>
              <button
                onClick={handleLogout}
                title="Sair do sistema"
                className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/settings?tab=profile"
                className="flex items-center gap-2.5 min-w-0 flex-1 p-1 rounded-xl hover:bg-gray-100 transition-colors group"
                title="Configurar meu perfil"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ring-2 ring-blue-500/20 overflow-hidden">
                  {liveUser.avatar_url ? (
                    <img src={liveUser.avatar_url} alt={liveUser.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    liveUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-gray-900 text-xs truncate group-hover:text-blue-600 transition-colors">
                    <strong className="font-bold">{userFirstName}</strong>
                    {userRestName ? ` ${userRestName}` : ''}
                  </p>
                  <p className="text-gray-500 text-[10px] truncate flex items-center gap-1">
                    <span>{userRoleDisplay}</span>
                    {liveUser.is_partner === 1 && (
                      <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.2 rounded font-semibold">
                        Sócio
                      </span>
                    )}
                  </p>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                title="Sair do sistema"
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors z-20 shadow-md"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </>
  );
}

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={null}>
      <SidebarInner {...props} />
    </Suspense>
  );
}

