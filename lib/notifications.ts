import { getAdminFirestore } from './firebase-admin';
import { NotificationType } from '@/types';

export interface NotificationParams {
  userId?: string;
  user_id?: string;
  title?: string;
  message?: string;
  type?: NotificationType | string;
  referenceModule?: string;
  reference_module?: string;
  referenceId?: string;
  reference_id?: string;
  [key: string]: any;
}

export async function createNotification(
  paramOrUserId: NotificationParams | string,
  titleOrType?: string,
  message?: string,
  referenceId?: string,
  referenceModule?: string
): Promise<void> {
  try {
    const firestore = getAdminFirestore();
    if (!firestore) return;

    const id = 'notif_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    let finalUserId = '';
    let finalTitle = 'Notificação';
    let finalMessage = '';
    let finalType = 'info';
    let finalRefModule: string | null = null;
    let finalRefId: string | null = null;

    if (typeof paramOrUserId === 'object' && paramOrUserId !== null) {
      finalUserId = paramOrUserId.userId || paramOrUserId.user_id || '';
      finalTitle = paramOrUserId.title || 'Notificação';
      finalMessage = paramOrUserId.message || '';
      finalType = (paramOrUserId.type as string) || 'info';
      finalRefModule = paramOrUserId.referenceModule || paramOrUserId.reference_module || null;
      finalRefId = paramOrUserId.referenceId || paramOrUserId.reference_id || null;
    } else {
      finalUserId = paramOrUserId;
      finalTitle = titleOrType || 'Notificação';
      finalMessage = message || '';
      finalType = 'info';
      finalRefId = referenceId || null;
      finalRefModule = referenceModule || null;
    }

    await firestore.collection('notifications').doc(id).set({
      id,
      user_id: finalUserId,
      title: finalTitle,
      message: finalMessage,
      type: finalType,
      reference_module: finalRefModule,
      reference_id: finalRefId,
      read_at: null,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Notification Error]:', err);
  }
}

export async function notifyAdmins(params: Omit<NotificationParams, 'userId'>): Promise<void> {
  try {
    const firestore = getAdminFirestore();
    if (!firestore) return;

    const adminsSnap = await firestore.collection('users').where('role', '==', 'ADMINISTRADOR').get();

    for (const doc of adminsSnap.docs) {
      const u = doc.data();
      if (u.status !== 'inativo') {
        await createNotification({
          ...params,
          userId: doc.id || u.id,
        });
      }
    }
  } catch (err) {
    console.error('[Notify Admins Error]:', err);
  }
}
