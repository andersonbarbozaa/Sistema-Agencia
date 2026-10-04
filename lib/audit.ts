import { getAdminFirestore } from './firebase-admin';

export interface AuditParams {
  userId?: string | null;
  user_id?: string | null;
  action: string;
  module?: string;
  resource?: string;
  entity?: string;
  recordId?: string | null;
  record_id?: string | null;
  resourceId?: string | null;
  resource_id?: string | null;
  entity_id?: string | null;
  details?: any;
  beforeData?: any;
  before_data?: any;
  afterData?: any;
  after_data?: any;
  ipAddress?: string | null;
  ip_address?: string | null;
  [key: string]: any;
}

export async function logAudit(
  paramOrUserId: AuditParams | string,
  moduleOrResource?: string,
  action?: string,
  recordId?: string | null,
  afterData?: any,
  ipAddress?: string | null
): Promise<void> {
  try {
    const firestore = getAdminFirestore();
    const id = 'aud_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    let finalUserId: string | null = null;
    let finalModule = 'SYSTEM';
    let finalAction = 'ACTION';
    let finalRecordId: string | null = null;
    let beforeStr: string | null = null;
    let afterStr: string | null = null;
    let finalIp: string | null = null;

    if (typeof paramOrUserId === 'object' && paramOrUserId !== null) {
      finalUserId = paramOrUserId.userId || paramOrUserId.user_id || null;
      finalAction = paramOrUserId.action || 'ACTION';
      finalModule = paramOrUserId.module || paramOrUserId.resource || paramOrUserId.entity || 'SYSTEM';
      finalRecordId = paramOrUserId.recordId || paramOrUserId.record_id || paramOrUserId.resourceId || paramOrUserId.resource_id || paramOrUserId.entity_id || null;
      const bData = paramOrUserId.beforeData ?? paramOrUserId.before_data;
      const aData = paramOrUserId.afterData ?? paramOrUserId.after_data ?? paramOrUserId.details;
      beforeStr = bData ? JSON.stringify(bData) : null;
      afterStr = aData ? (typeof aData === 'string' ? aData : JSON.stringify(aData)) : null;
      finalIp = paramOrUserId.ipAddress || paramOrUserId.ip_address || null;
    } else {
      finalUserId = paramOrUserId || null;
      finalModule = moduleOrResource || 'SYSTEM';
      finalAction = action || 'ACTION';
      finalRecordId = recordId || null;
      afterStr = afterData ? (typeof afterData === 'string' ? afterData : JSON.stringify(afterData)) : null;
      finalIp = ipAddress || null;
    }

    if (firestore) {
      await firestore.collection('audit_logs').doc(id).set({
        id,
        user_id: finalUserId,
        action: finalAction,
        module: finalModule,
        record_id: finalRecordId,
        before_data: beforeStr,
        after_data: afterStr,
        ip_address: finalIp,
        created_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('[Audit Log Error]:', err);
  }
}
