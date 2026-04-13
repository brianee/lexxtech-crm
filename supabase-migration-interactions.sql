-- supabase-migration-interactions.sql

-- 1. Create the project_interactions table
CREATE TABLE IF NOT EXISTS public.project_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add RLS Policies for project_interactions
ALTER TABLE public.project_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own project interactions"
    ON public.project_interactions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Optionally remove the old milestones column from projects, since it's going obsolete
ALTER TABLE public.projects DROP COLUMN IF EXISTS milestones;
