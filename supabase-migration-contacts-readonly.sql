-- supabase-migration-contacts-readonly.sql

-- Drop the previous strict read-only policy if we want all authenticated users to see the directory
-- In Phase 1, we likely created:
-- CREATE POLICY "Users can manage their own contacts" ON public.contacts FOR ALL USING (auth.uid() = user_id);

-- Instead of dropping the old one (which handles ALL actions like UPDATE/DELETE/INSERT), 
-- we can just add a specific SELECT policy that grants broader read access.
-- Supabase merges policies with an OR condition, so this will allow everyone to read, 
-- but only the owner/admin to modify.

CREATE POLICY "All authenticated users can read contacts"
    ON public.contacts
    FOR SELECT
    TO authenticated
    USING (true);
