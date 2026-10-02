import { getDb } from './db';
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
    const db = getDb();
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

    await db
      .prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, reference_module, reference_id, read_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, datetime('now'))
      `)
      .bind(
        id,
        finalUserId,
        finalTitle,
        finalMessage,
        finalType,
        finalRefModule,
        finalRefId
      )
      .run();
  } catch (err) {
    console.error('[Notification Error]:', err);
  }
}

export async function notifyAdmins(params: Omit<NotificationParams, 'userId'>): Promise<void> {
  try {
    const db = getDb();
    const admins = await db
      .prepare(`SELECT id FROM users WHERE role = 'ADMINISTRADOR' AND status = 'ativo'`)
      .all<{ id: string }>();

    if (admins.results && admins.results.length > 0) {
      for (const admin of admins.results) {
        await createNotification({
          ...params,
          userId: admin.id,
        });
      }
    }
  } catch (err) {
    console.error('[Notify Admins Error]:', err);
  }
}
