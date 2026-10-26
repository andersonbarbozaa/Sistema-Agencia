import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const results: string[] = [];

  // 1. Tables creation
  const tables = [
    `CREATE TABLE IF NOT EXISTS task_time_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds INTEGER,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id ON task_time_logs(task_id)`,
    `CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_id ON task_time_logs(user_id)`,
    `CREATE TABLE IF NOT EXISTS custom_calendars (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL DEFAULT 'ws_default',
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#3B82F6',
      visibility TEXT NOT NULL DEFAULT 'group',
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_custom_calendars_workspace ON custom_calendars(workspace_id)`,
    `CREATE TABLE IF NOT EXISTS crm_interactions (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      interaction_date TEXT NOT NULL DEFAULT (datetime('now')),
      platform TEXT DEFAULT 'WhatsApp',
      message TEXT DEFAULT '',
      notes TEXT,
      type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`
  ];

  for (const sql of tables) {
    try {
      await db.prepare(sql).run();
      results.push(`Executed table SQL: ${sql.substring(0, 40)}...`);
    } catch (e: any) {
      results.push(`Table error: ${e.message}`);
    }
  }

  // 2. Column additions
  const alterStatements = [
    'ALTER TABLE tasks ADD COLUMN visibility TEXT DEFAULT "group"',
    'ALTER TABLE tasks ADD COLUMN calendar_id TEXT',
    'ALTER TABLE calendar_events ADD COLUMN location TEXT',
    'ALTER TABLE calendar_events ADD COLUMN google_event_id TEXT',
    'ALTER TABLE calendar_events ADD COLUMN notes TEXT',
    'ALTER TABLE calendar_events ADD COLUMN workspace_id TEXT',
    'ALTER TABLE calendar_events ADD COLUMN visibility TEXT DEFAULT "group"',
    'ALTER TABLE calendar_events ADD COLUMN calendar_id TEXT',
    'ALTER TABLE workspaces ADD COLUMN plan_type TEXT DEFAULT "individual"',
    'ALTER TABLE workspaces ADD COLUMN subscription_status TEXT DEFAULT "trial"',
    'ALTER TABLE workspaces ADD COLUMN trial_ends_at TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN platform TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN message TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN type TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN notes TEXT',
    'ALTER TABLE crm_interactions ADD COLUMN created_at TEXT',
    'ALTER TABLE crm_leads ADD COLUMN city TEXT',
    'ALTER TABLE crm_leads ADD COLUMN platform TEXT',
    'ALTER TABLE crm_leads ADD COLUMN source TEXT',
    'ALTER TABLE crm_leads ADD COLUMN whatsapp TEXT',
    'ALTER TABLE crm_leads ADD COLUMN estimated_value REAL DEFAULT 0',
    'ALTER TABLE crm_leads ADD COLUMN first_contact_date TEXT',
    'ALTER TABLE crm_leads ADD COLUMN website TEXT',
    'ALTER TABLE crm_leads ADD COLUMN facebook TEXT',
    'ALTER TABLE crm_leads ADD COLUMN linkedin TEXT',
    'ALTER TABLE crm_leads ADD COLUMN instagram TEXT',
    'ALTER TABLE crm_leads ADD COLUMN segment TEXT',
    'ALTER TABLE crm_leads ADD COLUMN description TEXT'
  ];

  for (const stmt of alterStatements) {
    try {
      await db.prepare(stmt).run();
      results.push(`Success: ${stmt}`);
    } catch (e: any) {
      results.push(`Skipped/Already exists (${stmt}): ${e.message}`);
    }
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Database check and updates completed',
    results
  });
}
