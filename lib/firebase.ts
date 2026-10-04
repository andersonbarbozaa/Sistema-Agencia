import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ============================================================
// CLIENT-SIDE FIREBASE SDK
// Configuração do projeto: sistema-agencia-5603f
// ============================================================

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyPlaceholderClientKey',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'sistema-agencia-5603f.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sistema-agencia-5603f',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'sistema-agencia-5603f.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1234567890:web:abcdef',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = typeof window !== 'undefined' ? getAuth(app) : null;
export const db = typeof window !== 'undefined' ? getFirestore(app) : null;

export async function signInClientWithCustomToken(token: string): Promise<FirebaseUser | null> {
  if (!auth || !token) return null;
  try {
    const credential = await signInWithCustomToken(auth, token);
    return credential.user;
  } catch (err) {
    console.warn('[Firebase Client Auth] Falha ao autenticar com token customizado:', err);
    return null;
  }
}

export async function signOutClient(): Promise<void> {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('[Firebase Client Auth] Falha ao deslogar:', err);
  }
}

export { onAuthStateChanged };
export default app;
