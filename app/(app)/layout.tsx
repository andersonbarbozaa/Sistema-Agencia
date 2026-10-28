import { redirect } from 'next/navigation';
import { getSessionUser, isMasterAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import FloatingAIAssistant from '@/components/FloatingAIAssistant';
import PaywallBanner from '@/components/PaywallBanner';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const plainUser = JSON.parse(JSON.stringify(user));
  const isMaster = isMasterAdmin(user);

  // Verificação de Trial / Paywall do Mercado Pago:
  // Titular Master (anderson.barbozaa@gmail.com) tem BYPASS VITALÍCIO 100% liberado para sempre.
  let isExpired = false;
  let trialEndsAt: string | null = null;

  if (!isMaster) {
    try {
      const db = getDb();
      const ws = await db
        .prepare('SELECT subscription_status, trial_ends_at FROM workspaces WHERE id = ?')
        .bind(user.workspace_id || 'ws_default')
        .first<any>();

      if (ws && ws.subscription_status !== 'active') {
        trialEndsAt = ws.trial_ends_at || null;
        if (ws.trial_ends_at && new Date(ws.trial_ends_at).getTime() < Date.now()) {
          isExpired = true;
        }
      }
    } catch {}
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      <Sidebar user={plainUser} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {isExpired && <PaywallBanner trialEndsAt={trialEndsAt} />}
        <Header user={plainUser} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-3.5 sm:p-6 pb-24 md:pb-6">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav user={plainUser} />
      <FloatingAIAssistant user={plainUser} />
    </div>
  );
}
