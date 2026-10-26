-- ============================================================
-- 0005: ENSURE CRM_INTERACTIONS COLUMNS ALIGNMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS crm_interactions (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interaction_date TEXT NOT NULL DEFAULT (datetime('now')),
  platform TEXT NOT NULL DEFAULT 'WhatsApp',
  message TEXT NOT NULL DEFAULT '',
  notes TEXT,
  type TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE crm_interactions ADD COLUMN platform TEXT;
ALTER TABLE crm_interactions ADD COLUMN message TEXT;
ALTER TABLE crm_interactions ADD COLUMN type TEXT;
ALTER TABLE crm_interactions ADD COLUMN notes TEXT;
ALTER TABLE crm_interactions ADD COLUMN created_at TEXT;

ALTER TABLE crm_leads ADD COLUMN city TEXT;
ALTER TABLE crm_leads ADD COLUMN platform TEXT;
ALTER TABLE crm_leads ADD COLUMN source TEXT;
ALTER TABLE crm_leads ADD COLUMN whatsapp TEXT;
ALTER TABLE crm_leads ADD COLUMN estimated_value REAL DEFAULT 0;
ALTER TABLE crm_leads ADD COLUMN first_contact_date TEXT;
