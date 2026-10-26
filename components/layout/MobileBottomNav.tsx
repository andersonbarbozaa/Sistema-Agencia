'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  Plus,
  DollarSign,
  Calendar,
  X,
  Users,
  TrendingUp,
  Settings,
} from 'lucide-react';
import { User } from '@/types';
import { cn } from '@/lib/utils';
import ModalPortal from '@/components/ModalPortal';

interface MobileBottomNavProps {
  user: User;
}

export default function MobileBottomNav({ user }: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  // Close popup on navigation
  useEffect(() => {
    setShowQuickMenu(false);
  }, [pathname]);

  const handleAction = (eventOrPath: string, isEvent = true) => {
    setShowQuickMenu(false);
    if (isEvent) {
      window.dispatchEvent(new CustomEvent(eventOrPath));
    } else {
      router.push(eventOrPath);
    }
  };

  const navItems = [
    {
      href: '/dashboard',
      label: 'Início',
      icon: LayoutDashboard,
      active: pathname === '/dashboard' || pathname === '/',
    },
    {
      href: '/tasks',
      label: 'Tarefas',
      icon: CheckSquare,
      active: pathname.startsWith('/tasks'),
    },
    {
      href: '/crm',
      label: 'CRM',
      icon: TrendingUp,
      active: pathname.startsWith('/crm'),
    },
    {
      isCenter: true,
      label: 'Criar',
    },
    {
      href: '/finance',
      label: 'Financeiro',
      icon: DollarSign,
      active: pathname.startsWith('/finance'),
      adminOnly: true,
    },
    {
      href: '/agenda',
      label: 'Agenda',
      icon: Calendar,
      active: pathname.startsWith('/agenda'),
    },
    {
      href: '/settings',
      label: 'Configurações',
      icon: Settings,
      active: pathname.startsWith('/settings'),
    },
  ];

  return (
    <>
      {/* Barra de Navegação Inferior Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 md:hidden px-1 py-1 shadow-lg">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item, idx) => {
            if (item.isCenter) {
              return (
                <div key={idx} className="relative flex justify-center items-center w-12 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowQuickMenu(!showQuickMenu)}
                    className={cn(
                      'w-11 h-11 -mt-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center border-3 border-white dark:border-gray-900 active:scale-95 transition-all duration-200',
                      showQuickMenu ? 'rotate-45 bg-gray-800' : ''
                    )}
                    aria-label="Criar novo item"
                  >
                    <Plus size={22} strokeWidth={2.5} />
                  </button>
                </div>
              );
            }

            if (item.adminOnly && user.role !== 'ADMINISTRADOR') {
              return (
                <Link
                  key={idx}
                  href="/clients"
                  className={cn(
                    'flex flex-col items-center justify-center flex-1 py-1 text-[9px] min-[390px]:text-[10px] font-medium transition-colors min-w-0',
                    pathname.startsWith('/clients')
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  )}
                >
                  <Users size={19} strokeWidth={pathname.startsWith('/clients') ? 2.5 : 1.8} />
                  <span className="mt-0.5 truncate max-w-[48px] min-[390px]:max-w-[58px] text-center leading-tight">Clientes</span>
                </Link>
              );
            }

            const Icon = item.icon!;
            const isActive = item.active;

            return (
              <Link
                key={idx}
                href={item.href!}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 py-1 text-[9px] min-[390px]:text-[10px] font-medium transition-colors min-w-0',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                )}
              >
                <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="mt-0.5 truncate max-w-[48px] min-[390px]:max-w-[58px] text-center leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Modal / Menu de Criação Rápida (Botão Central +) */}
      {showQuickMenu && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end p-4 pb-20 md:hidden animate-in fade-in duration-200"
            onClick={() => setShowQuickMenu(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-3 animate-in slide-in-from-bottom-5 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Criar Novo</h3>
                <button
                  type="button"
                  onClick={() => setShowQuickMenu(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* 1. Nova Tarefa */}
                <button
                  type="button"
                  onClick={() => {
                    if (pathname === '/tasks') {
                      handleAction('open-create-task', true);
                    } else {
                      handleAction('/tasks?new=true', false);
                    }
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200/60 dark:border-blue-900 text-left transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <CheckSquare size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Tarefa</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Demanda de produção</span>
                  </div>
                </button>

                {/* 2. Novo Compromisso / Evento */}
                <button
                  type="button"
                  onClick={() => {
                    if (pathname === '/agenda') {
                      handleAction('open-create-event', true);
                    } else {
                      handleAction('/agenda?new=true', false);
                    }
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200/60 dark:border-indigo-900 text-left transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Compromisso</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Reunião ou gravação</span>
                  </div>
                </button>

                {/* 3. Novo Cliente */}
                {user.role !== 'CLIENTE' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (pathname === '/clients') {
                        handleAction('open-create-client', true);
                      } else {
                        handleAction('/clients?new=true', false);
                      }
                    }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200/60 dark:border-emerald-900 text-left transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Users size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">Cliente</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">Novo cadastro</span>
                    </div>
                  </button>
                )}

                {/* 4. Novo Lead CRM */}
                {user.role !== 'CLIENTE' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (pathname === '/crm') {
                        handleAction('open-create-lead', true);
                      } else {
                        handleAction('/crm?new=true', false);
                      }
                    }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200/60 dark:border-purple-900 text-left transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">Lead (CRM)</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">Oportunidade</span>
                    </div>
                  </button>
                )}

                {/* 5. Novo Lançamento Financeiro */}
                {user.role === 'ADMINISTRADOR' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (pathname === '/finance') {
                        handleAction('open-create-transaction', true);
                      } else {
                        handleAction('/finance?new=true', false);
                      }
                    }}
                    className="col-span-2 flex items-center gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/60 dark:border-amber-900 text-left transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">Lançamento Financeiro</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">Receita ou despesa de caixa</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
