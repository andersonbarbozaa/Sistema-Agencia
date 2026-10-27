import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  period: string;
  summary: string;
}

export const MERCADOPAGO_PLANS: Record<string, PlanConfig> = {
  individual: {
    id: 'individual',
    name: 'Plano Individual',
    price: 15.9,
    period: 'monthly',
    summary: 'Ideal para profissionais independentes',
  },
  pro: {
    id: 'pro',
    name: 'Equipe Pro',
    price: 59.9,
    period: 'monthly',
    summary: 'Perfeito para pequenos times e estúdios',
  },
  corporativo: {
    id: 'corporativo',
    name: 'Corporativo',
    price: 119.9,
    period: 'monthly',
    summary: 'Gestão completa para agências maiores',
  },
};

/**
 * Retorna o Access Token do Mercado Pago lido de forma segura do ambiente.
 */
export function getMercadoPagoAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
  return token.trim();
}

/**
 * Retorna a Public Key do Mercado Pago para uso público/frontend.
 */
export function getMercadoPagoPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '';
  return key.trim();
}

/**
 * Cria a instância autenticada do cliente Mercado Pago SDK.
 */
export function getMercadoPagoClient(): MercadoPagoConfig {
  const accessToken = getMercadoPagoAccessToken();
  if (!accessToken) {
    throw new Error(
      'MERCADOPAGO_ACCESS_TOKEN não configurado nas variáveis de ambiente. Defina MERCADOPAGO_ACCESS_TOKEN no arquivo .env ou no painel do Cloudflare.'
    );
  }

  return new MercadoPagoConfig({
    accessToken,
    options: {
      timeout: 10000,
    },
  });
}

export { Preference, Payment };
