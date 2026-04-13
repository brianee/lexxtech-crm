-- supabase-migration-collaboration-readonly.sql

-- By default in our original schema, RLS ensures users can ONLY see rows where user_id = auth.uid() OR assigned_to = auth.uid()
-- To enable the team collaboration features (seeing ALL tasks greyed out, or seeing all projects),
-- we need to grant broad SELECT access to authenticated users.

-- Supabase handles multiple RLS policies on the same table with an implicit "OR" statement.
-- This means this simple script will unlock Read-Only access for everyone, while preserving your original Security Policies restricting modifying/deleting to Admins/Owners.

-- 1. Unlock read access for Tasks
CREATE POLICY "All authenticated users can read tasks"
    ON public.tasks
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Unlock read access for Projects
CREATE POLICY "All authenticated users can read projects"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (true);
