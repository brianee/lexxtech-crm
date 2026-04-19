-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Link Billing Transactions to Tasks
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add optional task_id foreign key to billing_transactions
ALTER TABLE billing_transactions
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- 2. Optional: index for fast lookups by task
CREATE INDEX IF NOT EXISTS idx_billing_transactions_task_id
  ON billing_transactions (task_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Done. Existing rows are unaffected (task_id defaults to NULL).
-- ─────────────────────────────────────────────────────────────────────────────
