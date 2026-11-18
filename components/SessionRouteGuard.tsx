'use client';

import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const SESSION_ACTIVE_KEY = 'agencia_session_active';
const FRESH_BOOT_KEY = 'agencia_fresh_boot';
const LAST_PATH_KEY = 'agencia_last_path';

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
        sessionStorage.setItem(SESSION_ACTIVE_KEY, '1');
        const isFreshBoot = sessionStorage.getItem(FRESH_BOOT_KEY) === '1';

        if (isFreshBoot) {
          sessionStorage.removeItem(FRESH_BOOT_KEY);
          sessionStorage.setItem(LAST_PATH_KEY, '/dashboard');
          if (pathname !== '/dashboard') {
            router.replace('/dashboard');
            return;
          }
        } else {
          const navEntries =
            typeof performance !== 'undefined' && performance.getEntriesByType
              ? (performance.getEntriesByType('navigation') as PerformanceNavigationTiming[])
              : [];
          const isReload =
            navEntries[0]?.type === 'reload' ||
            (typeof performance !== 'undefined' && (performance as any).navigation?.type === 1);
          const lastPath = sessionStorage.getItem(LAST_PATH_KEY);

          // Caso um container PWA recarregue a rota raiz (que redireciona para /dashboard) durante um F5/reload
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
