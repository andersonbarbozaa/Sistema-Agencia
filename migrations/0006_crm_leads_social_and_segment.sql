-- ============================================================
-- 0006: ADD SOCIAL LINKS, SEGMENT AND DESCRIPTION TO CRM LEADS
-- ============================================================

ALTER TABLE crm_leads ADD COLUMN website TEXT;
ALTER TABLE crm_leads ADD COLUMN facebook TEXT;
ALTER TABLE crm_leads ADD COLUMN linkedin TEXT;
ALTER TABLE crm_leads ADD COLUMN instagram TEXT;
ALTER TABLE crm_leads ADD COLUMN segment TEXT;
ALTER TABLE crm_leads ADD COLUMN description TEXT;
