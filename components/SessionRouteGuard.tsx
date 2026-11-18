'use client';

import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const SESSION_ACTIVE_KEY = 'agencia_session_active';
const LAST_PATH_KEY = 'agencia_last_path';

const PAGE_STATE_KEYS = [
  'agencia_tasks_view_mode',
  'agencia_tasks_filters',
  'agencia_tasks_open_id',
  'agencia_client_view_mode',
  'agencia_client_status_filter',
  'agencia_client_open_task_id',
  'agencia_finance_active_tab',
  'agencia_finance_filters',
  'agencia_clients_selected_id',
  'agencia_clients_active_tab',
  'agencia_crm_selected_lead_id',
  'agencia_crm_filters',
  'crm_view_mode',
  'agencia_agenda_view_mode',
  'agencia_agenda_calendar_id',
  'agencia_settings_active_tab',
  'agencia_master_sub_tab',
];

function SessionRouteGuardInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchStr = searchParams?.toString() ? `?${searchParams.toString()}` : '';
    const currentFullPath = `${pathname}${searchStr}`;

    if (!initializedRef.current) {
      initializedRef.current = true;

      try {
        const isSessionActive = sessionStorage.getItem(SESSION_ACTIVE_KEY) === '1';
        const navEntries = typeof performance !== 'undefined' && performance.getEntriesByType
          ? (performance.getEntriesByType('navigation') as PerformanceNavigationTiming[])
          : [];
        const navType = navEntries[0]?.type;
        const isReload = navType === 'reload';

        if (!isSessionActive && !isReload) {
          // Nova sessão (fechou o navegador/aba/app e abriu novamente): limpa estados temporários e inicia no Dashboard
          PAGE_STATE_KEYS.forEach((k) => {
            try {
              sessionStorage.removeItem(k);
            } catch {}
          });
          sessionStorage.setItem(SESSION_ACTIVE_KEY, '1');
          sessionStorage.setItem(LAST_PATH_KEY, '/dashboard');

          if (pathname !== '/dashboard') {
            router.replace('/dashboard');
            return;
          }
        } else {
          // Sessão já ativa ou atualização de página (F5 / Reload)
          sessionStorage.setItem(SESSION_ACTIVE_KEY, '1');
          const lastPath = sessionStorage.getItem(LAST_PATH_KEY);

          // Caso um container PWA recarregue a rota raiz (que redireciona para /dashboard) durante um reload
          if (isReload && pathname === '/dashboard' && lastPath && lastPath !== '/dashboard') {
            router.replace(lastPath);
            return;
          }
        }
      } catch {}
    }

    try {
      sessionStorage.setItem(LAST_PATH_KEY, currentFullPath);
    } catch {}
  }, [pathname, searchParams, router]);

  return null;
}

export default function SessionRouteGuard() {
  return (
    <Suspense fallback={null}>
      <SessionRouteGuardInner />
    </Suspense>
  );
}
