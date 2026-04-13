-- supabase-migration-projects-update.sql

-- 1. Add contact_id to projects to link to Client
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- 2. Update the status check constraint to include 'completed'
-- Supabase might not have named the check constraint predictably if we used a simple inline CHECK
-- but we can just drop the old constraint if we find it, or simply alter the column type if it's an enum.
-- Assuming status is currently TEXT with a CHECK constraint.
-- Safe way to drop existing status check constraints on public.projects:
DO $$
DECLARE
    row record;
BEGIN
    FOR row IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'projects'
        AND tc.constraint_type = 'CHECK'
        AND tc.constraint_name LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.projects DROP CONSTRAINT "' || row.constraint_name || '"';
    END LOOP;
END;
$$;

-- Add new expanded check constraint
ALTER TABLE public.projects
ADD CONSTRAINT projects_status_check
CHECK (status IN ('active', 'completed', 'archived', 'template'));
