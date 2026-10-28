'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, CreditCard, ArrowRight } from 'lucide-react';

interface PaywallBannerProps {
  trialEndsAt?: string | null;
}

export default function PaywallBanner({ trialEndsAt }: PaywallBannerProps) {
  const pathname = usePathname();

  // Se já estiver na tela de planos/configurações, não precisa do banner superior
  if (pathname.includes('/settings')) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 text-white px-4 py-2.5 shadow-md sticky top-0 z-40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <AlertTriangle size={14} className="text-white" />
        </div>
        <p className="font-semibold leading-tight">
          <strong>Período de teste expirado:</strong> Seu acesso de avaliação encerrou. Ative sua assinatura no Mercado Pago para continuar gerenciando sua agência sem interrupções.
        </p>
      </div>

      <Link
        href="/settings?tab=plans"
        className="shrink-0 px-3.5 py-1.5 bg-white text-rose-700 hover:bg-rose-50 font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
      >
        <CreditCard size={13} />
        <span>Regularizar Assinatura</span>
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}
