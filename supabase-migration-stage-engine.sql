-- ============================================================
-- Stage-Aware Workflow Engine — Status Column Migration
-- Run once in Supabase SQL Editor before deploying the
-- updated frontend.
-- ============================================================

-- 1. Rename 'blocked' (was "Pending") → 'awaiting'
UPDATE public.tasks SET status = 'awaiting' WHERE status = 'blocked';

-- 2. Rename 'dispatched' (was "Out for Delivery") → 'ready'
UPDATE public.tasks SET status = 'ready' WHERE status = 'dispatched';

-- 3. Add 'failed' to the status check constraint (if one exists).
--    Check if a constraint named tasks_status_check exists first.
--    If your DB uses an enum type instead, see note below.

-- Option A: If tasks.status is a TEXT column with a CHECK constraint,
--           drop and recreate it to add the new values:
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN (
    'pending',
    'in-progress',
    'awaiting',
    'ready',
    'failed',
    'completed',
    'overdue'
  ));

-- Option B: If tasks.status is a Postgres ENUM type, run instead:
-- ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'awaiting';
-- ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'ready';
-- ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'failed';
-- (And separately remove 'blocked' / 'dispatched' if desired — 
--  Postgres does not support removing enum values without a full
--  type recreation, so it's safe to leave them as unused values.)

-- Verify the migration
SELECT status, COUNT(*) FROM public.tasks GROUP BY status ORDER BY status;
