import { getDb } from './db';

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
    const db = getDb();
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

    await db
      .prepare(`
        INSERT INTO audit_logs (id, user_id, action, module, record_id, before_data, after_data, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      .bind(
        id,
        finalUserId,
        finalAction,
        finalModule,
        finalRecordId,
        beforeStr,
        afterStr,
        finalIp
      )
      .run();
  } catch (err) {
    console.error('[Audit Log Error]:', err);
  }
}
