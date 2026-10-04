import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getApiUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/notifications/[id] — mark single notification as read
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const firestore = getAdminFirestore();

    const notifRef = firestore.collection('notifications').doc(id);
    const notifDoc = await notifRef.get();

    if (!notifDoc.exists) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const data: any = notifDoc.data();
    if (data.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (data.read_at) {
      return NextResponse.json({ message: 'Already marked as read', data: { id: notifDoc.id, ...data } });
    }

    const now = new Date().toISOString();
    await notifRef.update({ read_at: now });

    return NextResponse.json({ data: { id: notifDoc.id, ...data, read_at: now } });
  } catch (error: any) {
    console.error('[PATCH /api/notifications/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] — delete notification
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const firestore = getAdminFirestore();

    const notifRef = firestore.collection('notifications').doc(id);
    const notifDoc = await notifRef.get();

    if (!notifDoc.exists) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const data: any = notifDoc.data();
    if (data.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await notifRef.delete();
    return NextResponse.json({ message: 'Notification deleted' });
  } catch (error: any) {
    console.error('[DELETE /api/notifications/[id]]', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
