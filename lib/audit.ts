import { getDb } from './db';
import { extractRequestMeta, RequestMetadata } from './request-meta';

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
  request?: Request | any;
  userAgent?: string | null;
  user_agent?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  location?: string | null;
  route?: string | null;
  [key: string]: any;
}

let tablesEnsured = false;

export async function ensureAuditAndAccessTables(): Promise<void> {
  if (tablesEnsured) return;
  try {
    const db = getDb();
    // 1. Tabela de logs de acesso de sessões detalhada
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS user_access_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          workspace_id TEXT,
          event_type TEXT NOT NULL DEFAULT 'access',
          route TEXT,
          ip_address TEXT,
          location TEXT,
          city TEXT,
          region TEXT,
          country TEXT,
          browser TEXT,
          os TEXT,
          device TEXT,
          device_model TEXT,
          user_agent TEXT,
          details TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();
    } catch {}

    // 2. Colunas de rastreamento estendido em audit_logs
    try { await db.prepare('ALTER TABLE audit_logs ADD COLUMN user_agent TEXT').run(); } catch {}
    try { await db.prepare('ALTER TABLE audit_logs ADD COLUMN browser TEXT').run(); } catch {}
    try { await db.prepare('ALTER TABLE audit_logs ADD COLUMN os TEXT').run(); } catch {}
    try { await db.prepare('ALTER TABLE audit_logs ADD COLUMN device TEXT').run(); } catch {}
    try { await db.prepare('ALTER TABLE audit_logs ADD COLUMN location TEXT').run(); } catch {}
    try { await db.prepare('ALTER TABLE audit_logs ADD COLUMN route TEXT').run(); } catch {}

    // 3. Colunas de último acesso na tabela users
    try { await db.prepare('ALTER TABLE users ADD COLUMN last_login_at TEXT').run(); } catch {}
    try { await db.prepare('ALTER TABLE users ADD COLUMN last_ip TEXT').run(); } catch {}
    try { await db.prepare('ALTER TABLE users ADD COLUMN last_device TEXT').run(); } catch {}
    try { await db.prepare('ALTER TABLE users ADD COLUMN last_location TEXT').run(); } catch {}

    tablesEnsured = true;
  } catch (err) {
    console.warn('[Audit Tables Migration Warning]:', err);
  }
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
    await ensureAuditAndAccessTables();
    const db = getDb();
    const id = 'aud_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    let finalUserId: string | null = null;
    let finalModule = 'SYSTEM';
    let finalAction = 'ACTION';
    let finalRecordId: string | null = null;
    let beforeStr: string | null = null;
    let afterStr: string | null = null;
    let finalIp: string | null = null;
    let finalUserAgent: string | null = null;
    let finalBrowser: string | null = null;
    let finalOs: string | null = null;
    let finalDevice: string | null = null;
    let finalLocation: string | null = null;
    let finalRoute: string | null = null;

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
      finalUserAgent = paramOrUserId.userAgent || paramOrUserId.user_agent || null;
      finalBrowser = paramOrUserId.browser || null;
      finalOs = paramOrUserId.os || null;
      finalDevice = paramOrUserId.device || null;
      finalLocation = paramOrUserId.location || null;
      finalRoute = paramOrUserId.route || null;

      // Se passou o request HTTP, extrai metadados completos do dispositivo e IP
      if (paramOrUserId.request) {
        const meta: RequestMetadata = extractRequestMeta(paramOrUserId.request, finalRoute || undefined);
        finalIp = finalIp || meta.ip;
        finalUserAgent = finalUserAgent || meta.userAgent;
        finalBrowser = finalBrowser || meta.browser;
        finalOs = finalOs || meta.os;
        finalDevice = finalDevice || `${meta.deviceModel} (${meta.device})`;
        finalLocation = finalLocation || meta.location;
        finalRoute = finalRoute || meta.route || null;
      }
    } else {
      finalUserId = paramOrUserId || null;
      finalModule = moduleOrResource || 'SYSTEM';
      finalAction = action || 'ACTION';
      finalRecordId = recordId || null;
      afterStr = afterData ? (typeof afterData === 'string' ? afterData : JSON.stringify(afterData)) : null;
      finalIp = ipAddress || null;
    }

    try {
      await db
        .prepare(`
          INSERT INTO audit_logs (
            id, user_id, action, module, record_id, before_data, after_data, 
            ip_address, user_agent, browser, os, device, location, route, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `)
        .bind(
          id,
          finalUserId,
          finalAction,
          finalModule,
          finalRecordId,
          beforeStr,
          afterStr,
          finalIp,
          finalUserAgent,
          finalBrowser,
          finalOs,
          finalDevice,
          finalLocation,
          finalRoute
        )
        .run();
    } catch {
      // Fallback seguro caso as colunas ainda não estejam ativas
      await db
        .prepare(`
          INSERT INTO audit_logs (id, user_id, action, module, record_id, before_data, after_data, ip_address, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `)
        .bind(id, finalUserId, finalAction, finalModule, finalRecordId, beforeStr, afterStr, finalIp)
        .run();
    }
  } catch (err) {
    console.error('[Audit Log Error]:', err);
  }
}

/**
 * Registra o acesso de um usuário ao sistema com dados detalhados de IP, Navegador,
 * Sistema Operacional, Dispositivo e Localização geográfica.
 */
export async function logUserAccess(
  userId: string,
  request: Request | any,
  eventType: 'login' | 'navigation' | 'session_heartbeat' | 'action' = 'access' as any,
  details?: any,
  workspaceId?: string | null
): Promise<void> {
  try {
    await ensureAuditAndAccessTables();
    const db = getDb();
    const meta = extractRequestMeta(request);
    const id = 'acc_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;

    // 1. Grava no histórico de acessos
    await db
      .prepare(`
        INSERT INTO user_access_logs (
          id, user_id, workspace_id, event_type, route, ip_address, 
          location, city, region, country, browser, os, device, 
          device_model, user_agent, details, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      .bind(
        id,
        userId,
        workspaceId || 'ws_default',
        eventType,
        meta.route,
        meta.ip,
        meta.location,
        meta.city,
        meta.region,
        meta.country,
        meta.browser,
        meta.os,
        meta.device,
        meta.deviceModel,
        meta.userAgent,
        detailsStr
      )
      .run();

    // 2. Atualiza os dados de último acesso do usuário
    try {
      await db
        .prepare(`
          UPDATE users 
          SET last_login_at = datetime('now'),
              last_ip = ?,
              last_device = ?,
              last_location = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `)
        .bind(meta.ip, `${meta.deviceModel} • ${meta.browser}`, meta.location, userId)
        .run();
    } catch {}
  } catch (err) {
    console.warn('[Log User Access Warning]:', err);
  }
}
