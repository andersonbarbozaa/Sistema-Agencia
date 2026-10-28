import { User, UserRole } from '@/types';

export const MASTER_ADMIN_EMAIL = 'anderson.barbozaa@gmail.com';
export const MASTER_ADMIN_EMAILS = [
  'anderson.barbozaa@gmail.com',
  'anderson@agencia.com',
];

/**
 * Validação estrita do Titular Master do Sistema
 * Reconhece o e-mail do titular (anderson.barbozaa@gmail.com ou anderson@agencia.com)
 */
export function isMasterAdmin(user: { email?: string | null } | null | undefined): boolean {
  if (!user || !user.email) return false;
  const email = user.email.toLowerCase().trim();
  return (
    email === MASTER_ADMIN_EMAIL.toLowerCase().trim() ||
    MASTER_ADMIN_EMAILS.some((m) => m.toLowerCase().trim() === email)
  );
}

/**
 * Validação global de assinatura e trial do Mercado Pago
 * Usuário Master tem bypass vitalício 100% liberado para sempre
 */
export function hasActiveSubscription(workspace: any, user?: { email?: string | null } | null): boolean {
  if (isMasterAdmin(user)) return true; // Bypass vitalício irrestrito para o titular master
  if (!workspace) return false;
  if (workspace.subscription_status === 'active') return true;
  if (workspace.trial_ends_at) {
    const trialEnd = new Date(workspace.trial_ends_at).getTime();
    if (!isNaN(trialEnd) && trialEnd > Date.now()) return true;
  }
  return false;
}

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'ADMINISTRADOR';
}

export function isCollaborator(user: User | null | undefined): boolean {
  return user?.role === 'COLABORADOR';
}

export function isClient(user: User | null | undefined): boolean {
  return user?.role === 'CLIENTE';
}
