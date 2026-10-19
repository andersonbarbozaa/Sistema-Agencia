-- ============================================================
-- 0003: ADD SUBSCRIPTIONS COLUMNS TO WORKSPACES
-- ============================================================

ALTER TABLE workspaces ADD COLUMN plan_type TEXT DEFAULT 'individual';
ALTER TABLE workspaces ADD COLUMN subscription_status TEXT DEFAULT 'trial';
ALTER TABLE workspaces ADD COLUMN trial_ends_at TEXT;
