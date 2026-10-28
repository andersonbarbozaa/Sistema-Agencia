import { redirect } from 'next/navigation';
import { getSessionUser, isMasterAdmin } from '@/lib/auth';
import MasterAdminView from './MasterAdminView';

export const dynamic = 'force-dynamic';

export default async function MasterAdminPage() {
  const user = await getSessionUser();

  // 1. Redireciona para o login se não houver usuário autenticado
  if (!user) {
    redirect('/login?redirect=/admin-master');
  }

  // 2. Barramento estrito: se não for o titular master (anderson.barbozaa@gmail.com), barra com 403 e redireciona
  if (!isMasterAdmin(user)) {
    redirect('/dashboard?error=403_master_only');
  }

  const plainUser = JSON.parse(JSON.stringify(user));

  return <MasterAdminView user={plainUser} />;
}
