import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const paths = ['data/local.sqlite', '.data/local.db'];

for (const p of paths) {
  if (!fs.existsSync(p)) {
    console.log(`File not found: ${p}`);
    continue;
  }
  console.log(`Migrating ${p}...`);
  const db = new DatabaseSync(p);

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_time_logs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration_seconds INTEGER,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id ON task_time_logs(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_id ON task_time_logs(user_id);

      CREATE TABLE IF NOT EXISTS custom_calendars (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL DEFAULT 'ws_default',
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#3B82F6',
        visibility TEXT NOT NULL DEFAULT 'group',
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_custom_calendars_workspace ON custom_calendars(workspace_id);
    `);
    console.log(`Tables created/verified in ${p}`);
  } catch (e) {
    console.error(`Error creating tables in ${p}:`, e.message);
  }

  const columns = [
    { table: 'tasks', col: 'visibility', type: 'TEXT DEFAULT "group"' },
    { table: 'tasks', col: 'calendar_id', type: 'TEXT' },
    { table: 'calendar_events', col: 'visibility', type: 'TEXT DEFAULT "group"' },
    { table: 'calendar_events', col: 'calendar_id', type: 'TEXT' },
    { table: 'workspaces', col: 'plan_type', type: 'TEXT DEFAULT "individual"' },
    { table: 'workspaces', col: 'subscription_status', type: 'TEXT DEFAULT "trial"' },
    { table: 'workspaces', col: 'trial_ends_at', type: 'TEXT' },
  ];

  for (const item of columns) {
    try {
      db.exec(`ALTER TABLE ${item.table} ADD COLUMN ${item.col} ${item.type};`);
      console.log(`Added ${item.table}.${item.col}`);
    } catch (e) {
      // Column might already exist
    }
  }

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(`${p} tables:`, tables.map(t => t.name).join(', '));
}
