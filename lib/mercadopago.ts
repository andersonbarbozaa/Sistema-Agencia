import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { getCloudflareContext } from '@opennextjs/cloudflare';

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

// Credenciais de teste fornecidas para garantir funcionamento imediato em qualquer ambiente
const FALLBACK_ACCESS_TOKEN = 'TEST-1839849461235533-102715-1a68ae8ab64488d65b2b638dc7b16a05-362004618';
const FALLBACK_PUBLIC_KEY = 'TEST-436b6332-6b65-4be1-b4f3-f8739d659724';

function getCfEnv(): any {
  try {
    const ctx = getCloudflareContext();
    return (ctx?.env as any) || null;
  } catch {
    return null;
  }
}

/**
 * Retorna o Access Token do Mercado Pago:
 * 1) process.env.MERCADOPAGO_ACCESS_TOKEN
 * 2) Cloudflare Workers Context Env (ctx.env.MERCADOPAGO_ACCESS_TOKEN)
 * 3) Fallback com credencial de teste fornecida
 */
export function getMercadoPagoAccessToken(): string {
  const envToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (envToken && envToken.trim() !== '' && !envToken.includes('seu_access_token_aqui')) {
    return envToken.trim();
  }

  const cfEnv = getCfEnv();
  const cfToken = cfEnv?.MERCADOPAGO_ACCESS_TOKEN;
  if (cfToken && cfToken.trim() !== '' && !cfToken.includes('seu_access_token_aqui')) {
    return cfToken.trim();
  }

  return FALLBACK_ACCESS_TOKEN;
}

/**
 * Retorna a Public Key do Mercado Pago:
 * 1) process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
 * 2) Cloudflare Workers Context Env (ctx.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY)
 * 3) Fallback com chave pública de teste fornecida
 */
export function getMercadoPagoPublicKey(): string {
  const envKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
  if (envKey && envKey.trim() !== '' && !envKey.includes('sua_public_key_aqui')) {
    return envKey.trim();
  }

  const cfEnv = getCfEnv();
  const cfKey = cfEnv?.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
  if (cfKey && cfKey.trim() !== '' && !cfKey.includes('sua_public_key_aqui')) {
    return cfKey.trim();
  }

  return FALLBACK_PUBLIC_KEY;
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
