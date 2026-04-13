-- LexxTech Kanban Pipeline Migration
-- Run this in the Supabase SQL Editor

-- 1. Drop the restrictive status constraint on the tasks table
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- 2. Add the expanded status constraint to allow Dispatch and Blocked states
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status in ('pending', 'in-progress', 'blocked', 'dispatched', 'completed', 'overdue'));

-- Note: No existing rows are modified, their current status is untouched.
