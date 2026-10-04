import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAdminFirestore, getAdminAuth, getFirebaseAdminApp } from '@/lib/firebase-admin';

export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    env: {
      has_service_account_env: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      has_service_account_key_env: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      has_google_credentials_env: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      has_firebase_api_key: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    },
    database: { status: 'unknown' },
    firebase: { status: 'unknown' },
  };

  // 1. Testar SQLite
  try {
    const db = getDb();
    const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
    const wsCount = await db.prepare('SELECT COUNT(*) as count FROM workspaces').first<{ count: number }>();
    result.database = {
      status: 'connected',
      users_count: userCount?.count ?? 0,
      workspaces_count: wsCount?.count ?? 0,
    };
  } catch (dbErr: any) {
    result.database = {
      status: 'error',
      error: dbErr?.message,
    };
  }

  // 2. Testar Firebase Admin e Firestore
  try {
    const app = getFirebaseAdminApp();
    const firestore = getAdminFirestore();
    const auth = getAdminAuth();

    result.firebase = {
      app_name: app.name,
      project_id: app.options.projectId,
    };

    // Testar leitura leve no Firestore
    const testDoc = await firestore.collection('system').doc('health').get();
    result.firebase.firestore = {
      status: 'connected',
      can_read: true,
      exists: testDoc.exists,
    };

    // Testar escrita no Firestore
    await firestore.collection('system').doc('health').set({
      last_health_check: new Date().toISOString(),
      node_version: process.version,
    }, { merge: true });
    result.firebase.firestore.can_write = true;

  } catch (fbErr: any) {
    result.firebase = {
      status: 'error',
      error: fbErr?.message,
    };
  }

  return NextResponse.json(result);
}
