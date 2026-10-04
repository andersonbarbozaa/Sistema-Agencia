import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser } from '@/lib/auth';

// GET /api/notifications — list notifications for current user
export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';

  try {
    const firestore = getAdminFirestore();
    const snap = await firestore
      .collection('notifications')
      .where('user_id', '==', user.id)
      .get();

    let list = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    const unreadCount = list.filter((n: any) => !n.read_at).length;

    if (unreadOnly) {
      list = list.filter((n: any) => !n.read_at);
    }

    list.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return NextResponse.json({
      notifications: list.slice(0, 100),
      data: list.slice(0, 100),
      unread_count: unreadCount,
    });
  } catch (error: any) {
    console.error('[GET /api/notifications]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const firestore = getAdminFirestore();
    const now = new Date().toISOString();

    const snap = await firestore
      .collection('notifications')
      .where('user_id', '==', user.id)
      .get();

    const batch = firestore.batch();
    let updatedCount = 0;

    snap.docs.forEach((doc: any) => {
      const data = doc.data();
      if (!data.read_at) {
        batch.update(doc.ref, { read_at: now });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      message: 'All notifications marked as read',
      updated: updatedCount,
    });
  } catch (error: any) {
    console.error('[PATCH /api/notifications]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications — clear all notifications for current user
export async function DELETE(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const firestore = getAdminFirestore();
    const snap = await firestore
      .collection('notifications')
      .where('user_id', '==', user.id)
      .get();

    const batch = firestore.batch();
    snap.docs.forEach((doc: any) => batch.delete(doc.ref));
    await batch.commit();

    return NextResponse.json({ message: 'All notifications cleared successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/notifications]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
