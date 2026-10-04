import { initializeApp, getApps, cert, type App, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { createRequire } from 'module';

// ============================================================
// INICIALIZAÇÃO ROBUSTA E SEGURA DO FIREBASE ADMIN SDK
// Suporta credenciais via variável de ambiente (JSON ou Base64)
// ou arquivo de segredos do Render (/etc/secrets/...)
// Projeto padrão: sistema-agencia-5603f
// Conta de Serviço: firebase-adminsdk-fbsvc@sistema-agencia-5603f.iam.gserviceaccount.com
// ============================================================

const DEFAULT_PROJECT_ID = 'sistema-agencia-5603f';
const DEFAULT_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@sistema-agencia-5603f.iam.gserviceaccount.com';

function getRequire() {
  try {
    return createRequire(import.meta.url);
  } catch {
    return typeof require !== 'undefined' ? require : null;
  }
}

function getCloudflareEnv(): Record<string, any> | null {
  try {
    const req = getRequire();
    if (req) {
      const { getCloudflareContext } = req('@opennextjs/cloudflare');
      if (typeof getCloudflareContext === 'function') {
        const ctx = getCloudflareContext();
        if (ctx && ctx.env) {
          return ctx.env;
        }
      }
    }
  } catch {}
  return null;
}

function getRawCredentialString(): string | null {
  const envCandidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT,
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.env.FIREBASE_CREDENTIALS,
    process.env.SERVICE_ACCOUNT,
  ];

  for (const candidate of envCandidates) {
    if (candidate && candidate.trim()) {
      return candidate.trim();
    }
  }

  // Cloudflare Workers environment fallback
  const cfEnv = getCloudflareEnv();
  if (cfEnv) {
    for (const key of ['FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_SERVICE_ACCOUNT_KEY', 'GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_CREDENTIALS', 'SERVICE_ACCOUNT']) {
      if (cfEnv[key] && typeof cfEnv[key] === 'string' && cfEnv[key].trim()) {
        return cfEnv[key].trim();
      }
    }
  }

  // Verifica se foi enviado como arquivo de segredo no Render ou local
  const secretPaths = [
    '/etc/secrets/serviceAccountKey.json',
    '/etc/secrets/FIREBASE_SERVICE_ACCOUNT',
    '/etc/secrets/firebase-service-account.json',
    './serviceAccountKey.json',
    'serviceAccountKey.json',
  ];

  const req = getRequire();
  if (req) {
    try {
      const fs = req('fs');
      if (fs && typeof fs.existsSync === 'function') {
        for (const p of secretPaths) {
          if (fs.existsSync(p)) {
            console.log(`[Firebase Admin] Encontrado arquivo de credenciais em: ${p}`);
            return fs.readFileSync(p, 'utf8').trim();
          }
        }
      }
    } catch {}
  }

  return null;
}

function parseServiceAccount(): ServiceAccount | null {
  let raw = getRawCredentialString();

  if (!raw) {
    const cfEnv = getCloudflareEnv();
    const privateKeyEnv = process.env.FIREBASE_PRIVATE_KEY || cfEnv?.FIREBASE_PRIVATE_KEY;
    // Fallback para variáveis individuais se fornecidas
    if (privateKeyEnv) {
      console.log('[Firebase Admin] Utilizando credenciais individuais de variáveis de ambiente.');
      return {
        projectId: process.env.FIREBASE_PROJECT_ID || cfEnv?.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || cfEnv?.FIREBASE_CLIENT_EMAIL || DEFAULT_CLIENT_EMAIL,
        privateKey: privateKeyEnv.replace(/\\n/g, '\n'),
      };
    }

    console.warn('[Firebase Admin Warning] Nenhuma credencial encontrada em FIREBASE_SERVICE_ACCOUNT nem em variáveis de ambiente.');
    return null;
  }

  let cleanRaw: string = raw;

  // Se for um caminho de arquivo especificado na variável de ambiente
  const req = getRequire();
  if (req) {
    try {
      const fs = req('fs');
      if (fs.existsSync(cleanRaw)) {
        console.log(`[Firebase Admin] Lendo credenciais do caminho indicado na variável: ${cleanRaw}`);
        cleanRaw = fs.readFileSync(cleanRaw, 'utf8').trim();
      }
    } catch {}
  }

  // Remove aspas envolventes se houver (ex: '{"type":...}' ou "{\"type\":...}")
  if ((cleanRaw.startsWith("'") && cleanRaw.endsWith("'")) || (cleanRaw.startsWith('"') && cleanRaw.endsWith('"'))) {
    cleanRaw = cleanRaw.slice(1, -1).trim();
  }

  let parsed: any = null;

  // 1. Tentar parse direto como JSON
  try {
    parsed = JSON.parse(cleanRaw);
  } catch {
    // 2. Tentar decodificar JSON com aspas escapadas
    try {
      const unescaped = cleanRaw.replace(/\\"/g, '"');
      parsed = JSON.parse(unescaped);
    } catch {
      // 3. Tentar decodificar Base64
      try {
        const decoded = Buffer.from(cleanRaw, 'base64').toString('utf8');
        parsed = JSON.parse(decoded);
      } catch (err: any) {
        console.error('[Firebase Admin Error] Falha ao decodificar FIREBASE_SERVICE_ACCOUNT como JSON ou Base64:', err?.message);
      }
    }
  }

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {}
  }

  if (parsed && typeof parsed === 'object') {
    const projectId = parsed.project_id || parsed.projectId || DEFAULT_PROJECT_ID;
    const clientEmail = parsed.client_email || parsed.clientEmail || DEFAULT_CLIENT_EMAIL;
    let privateKey = parsed.private_key || parsed.privateKey || '';

    if (typeof privateKey === 'string') {
      // Substituir qualquer formato de nova linha escapada por quebras de linha reais
      privateKey = privateKey.replace(/\\n/g, '\n').replace(/\\\\n/g, '\n');
    }

    if (!privateKey) {
      console.error('[Firebase Admin Error] Credencial fornecida não possui a chave "private_key"!');
      return null;
    }

    console.log(`[Firebase Admin] Credenciais do Service Account analisadas com sucesso para ${clientEmail} (Projeto: ${projectId})`);
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  return null;
}

let cachedAdminApp: App | null = null;

export function getFirebaseAdminApp(): App {
  if (cachedAdminApp) {
    return cachedAdminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    cachedAdminApp = existingApps[0];
    return cachedAdminApp;
  }

  const serviceAccount = parseServiceAccount();
  if (serviceAccount) {
    try {
      cachedAdminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId || DEFAULT_PROJECT_ID,
      });
      console.log('[Firebase Admin] Inicializado com sucesso usando credencial cert para:', serviceAccount.projectId);
      return cachedAdminApp;
    } catch (err: any) {
      console.error('[Firebase Admin Critical Error] Falha fatal ao executar cert(serviceAccount):', err?.message);
    }
  }

  // Inicialização padrão como fallback
  console.warn('[Firebase Admin Warning] Inicializando App padrão sem credenciais explícitas.');
  cachedAdminApp = initializeApp({
    projectId: DEFAULT_PROJECT_ID,
  });
  return cachedAdminApp;
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}
