'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User as UserIcon,
  FolderTree,
  Coins,
  Bot,
  X,
  LogOut,
} from 'lucide-react';
import { User } from '@/types';
import { cn } from '@/lib/utils';
import { signOutClient } from '@/lib/firebase';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { href: '/clients', label: 'Clientes', icon: Users, roles: ['ADMINISTRADOR', 'COLABORADOR'] },
  { href: '/crm', label: 'CRM', icon: TrendingUp, roles: ['ADMINISTRADOR', 'COLABORADOR'] },
  { href: '/finance', label: 'Financeiro', icon: DollarSign, roles: ['ADMINISTRADOR'] },
  { href: '/agenda', label: 'Agenda & Calendário', icon: Calendar },
  { href: '/settings', label: 'Configurações', icon: Settings, roles: ['ADMINISTRADOR'] },
];

interface SidebarProps {
  user: User;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);
    window.addEventListener('toggle-mobile-sidebar', handleToggle);
    window.addEventListener('close-mobile-sidebar', handleClose);
    return () => {
      window.removeEventListener('toggle-mobile-sidebar', handleToggle);
      window.removeEventListener('close-mobile-sidebar', handleClose);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await signOutClient();
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
    }
  };

  const companyName = user.workspace_name || 'PixelCraft Studio';
  const companyDescription = user.workspace_description;

  const formatUserName = (fullName: string) => {
    if (!fullName) return { first: '', rest: '' };
    const parts = fullName.trim().split(/\s+/);
    return {
      first: parts[0] || '',
      rest: parts.slice(1).join(' '),
    };
  };

  const { first: userFirstName, rest: userRestName } = formatUserName(user.name);
  const userRoleDisplay = user.job_title || user.position_name || 'Administrador';

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
          'fixed inset-y-0 left-0 z-50 w-72 bg-gray-950 flex flex-col border-r border-gray-800 transition-transform duration-300 md:hidden shadow-2xl select-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Header: Área 1 - Dados da Empresa */}
        <div className="flex items-center justify-between h-16 border-b border-gray-800/80 px-4">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
              <span className="text-white font-extrabold text-base tracking-wider">
                {companyName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm tracking-tight truncate">{companyName}</p>
              {companyDescription && (
                <p className="text-gray-400 text-[11px] truncate">{companyDescription}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-900 transition-colors flex-shrink-0"
            title="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                )}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile User Profile: Área 2 - Dados do Utilizador */}
        <div className="border-t border-gray-800/80 p-3.5 bg-gray-950/60">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/settings?tab=profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 min-w-0 flex-1 p-1 rounded-xl hover:bg-gray-900 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ring-2 ring-blue-500/20">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs truncate">
                  <strong className="font-bold">{userFirstName}</strong>
                  {userRestName ? ` ${userRestName}` : ''}
                </p>
                <p className="text-gray-400 text-[10px] truncate flex items-center gap-1">
                  <span>{userRoleDisplay}</span>
                  {user.is_partner === 1 && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-medium">
                      Sócio
                    </span>
                  )}
                </p>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              title="Sair do sistema"
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-900 rounded-xl transition-colors flex-shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex relative flex-shrink-0 bg-gray-950 flex-col transition-all duration-300 border-r border-gray-800 select-none z-30',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Brand / Logo: Área 1 - Dados da Empresa */}
        <div className={cn('flex items-center h-16 border-b border-gray-800/80 px-4', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
            <span className="text-white font-extrabold text-base tracking-wider">
              {companyName.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-bold text-sm tracking-tight truncate">{companyName}</p>
              {companyDescription && (
                <p className="text-gray-400 text-[11px] truncate">{companyDescription}</p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1 scrollbar-thin scrollbar-thumb-gray-800">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-gray-900 hover:text-white',
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
        <div className="border-t border-gray-800/80 p-3 bg-gray-950/60">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                title={`${user.name} (${userRoleDisplay})`}
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <button
                onClick={handleLogout}
                title="Sair do sistema"
                className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-900 transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/settings?tab=profile"
                className="flex items-center gap-2.5 min-w-0 flex-1 p-1 rounded-xl hover:bg-gray-900 transition-colors group"
                title="Configurar meu perfil"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ring-2 ring-blue-500/20">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs truncate group-hover:text-blue-400 transition-colors">
                    <strong className="font-bold">{userFirstName}</strong>
                    {userRestName ? ` ${userRestName}` : ''}
                  </p>
                  <p className="text-gray-400 text-[10px] truncate flex items-center gap-1">
                    <span>{userRoleDisplay}</span>
                    {user.is_partner === 1 && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-medium">
                        Sócio
                      </span>
                    )}
                  </p>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                title="Sair do sistema"
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-900 rounded-xl transition-colors flex-shrink-0"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-gray-900 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors z-20 shadow-md"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </>
  );
}
