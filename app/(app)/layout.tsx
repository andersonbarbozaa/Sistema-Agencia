import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import FloatingAIAssistant from '@/components/FloatingAIAssistant';

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

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      <Sidebar user={plainUser} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
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
