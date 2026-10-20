-- ============================================================
-- 0004: CREATE TASK TIME LOGS, CUSTOM CALENDARS & VISIBILITY
-- ============================================================

-- Table for Task Time Tracker Logs
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

-- Table for Multiple Agendas / Custom Calendars (Plano Corporativo)
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

-- Add visibility and calendar_id to tasks
ALTER TABLE tasks ADD COLUMN visibility TEXT DEFAULT 'group';
ALTER TABLE tasks ADD COLUMN calendar_id TEXT REFERENCES custom_calendars(id) ON DELETE SET NULL;

-- Add visibility and calendar_id to calendar_events
ALTER TABLE calendar_events ADD COLUMN visibility TEXT DEFAULT 'group';
ALTER TABLE calendar_events ADD COLUMN calendar_id TEXT REFERENCES custom_calendars(id) ON DELETE SET NULL;
