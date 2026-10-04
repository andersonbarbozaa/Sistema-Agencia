import { initializeApp, getApps, cert, type App, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

// ============================================================
// INICIALIZAÇÃO SEGURA DO FIREBASE ADMIN SDK
// Suporta credenciais via variável de ambiente (JSON ou Base64)
// Projeto: sistema-agencia-5603f
// Conta de Serviço: firebase-adminsdk-fbsvc@sistema-agencia-5603f.iam.gserviceaccount.com
// ============================================================

const DEFAULT_PROJECT_ID = 'sistema-agencia-5603f';
const DEFAULT_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@sistema-agencia-5603f.iam.gserviceaccount.com';

function parseServiceAccount(): ServiceAccount | null {
  const envAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envAccount && envAccount.trim() !== '') {
    // 1. Tentar parse direto de string JSON
    try {
      const parsed = JSON.parse(envAccount.trim());
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return parsed as ServiceAccount;
    } catch {
      // 2. Tentar decodificar Base64 e depois parse JSON
      try {
        const decoded = Buffer.from(envAccount.trim(), 'base64').toString('utf8');
        const parsed = JSON.parse(decoded);
        if (parsed.private_key) {
          parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
        }
        return parsed as ServiceAccount;
      } catch (err) {
        console.warn('[Firebase Admin] Aviso: FIREBASE_SERVICE_ACCOUNT fornecida não é um JSON válido nem Base64.', err);
      }
    }
  }

  // 3. Fallback para variáveis individuais se fornecidas
  if (process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || DEFAULT_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

export function getFirebaseAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
  }

  const serviceAccount = parseServiceAccount();
  if (serviceAccount) {
    try {
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId || DEFAULT_PROJECT_ID,
      });
    } catch (err) {
      console.warn('[Firebase Admin] Falha ao inicializar com credencial cert, usando padrão:', err);
    }
  }

  // Inicialização padrão (para build ou Application Default Credentials)
  return initializeApp({
    projectId: DEFAULT_PROJECT_ID,
  });
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}
