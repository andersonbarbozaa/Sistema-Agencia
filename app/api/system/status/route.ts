import { NextResponse } from 'next/server';
import { getAdminFirestore, getFirebaseAdminApp } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const result: any = {
      timestamp: new Date().toISOString(),
      node_version: process.version,
      runtime: 'cloudflare-workers',
      env: {
        has_service_account_env: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        has_service_account_key_env: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
        has_google_credentials_env: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        has_firebase_api_key: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      },
      firebase: { status: 'unknown' },
    };

    try {
      const app = getFirebaseAdminApp();

      if (!app) {
        result.firebase = {
          status: 'warning',
          message: 'Firebase Admin App aguardando configuração de FIREBASE_SERVICE_ACCOUNT.',
        };
      } else {
        const firestore = getAdminFirestore();
        result.firebase = {
          status: 'initialized',
          app_name: app.name,
          project_id: app.options.projectId,
        };

        const usersSnap = await firestore.collection('users').limit(5).get();
        const wsSnap = await firestore.collection('workspaces').limit(5).get();

        result.firebase.firestore = {
          status: 'connected',
          can_read: true,
          users_sample_count: usersSnap.size,
          workspaces_sample_count: wsSnap.size,
        };
      }
    } catch (fbErr: any) {
      result.firebase = {
        status: 'error',
        error: fbErr?.message || 'Falha ao conectar com Firestore',
      };
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || 'Internal Server Error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
