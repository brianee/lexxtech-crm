-- supabase-migration-phase2.sql

-------------------------------------------------------------------------------
-- 1. TASK INTERACTIONS (Comments/Logs for Tasks)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.task_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own task interactions"
    ON public.task_interactions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read all task interactions"
    ON public.task_interactions
    FOR SELECT
    USING (true);

-------------------------------------------------------------------------------
-- 2. STORAGE BUCKET FOR ATTACHMENTS (5MB Limit, Images Only)
-------------------------------------------------------------------------------
-- Ensure the storage API is available and insert the bucket config:
INSERT INTO storage.buckets (id, name, file_size_limit, allowed_mime_types, public)
VALUES (
  'attachments', 
  'attachments', 
  5242880, -- 5 MB in bytes
  '{"image/jpeg","image/png","image/webp","image/gif"}', 
  true -- Public read access for simplified rendering
)
ON CONFLICT (id) DO UPDATE SET 
  file_size_limit = 5242880,
  allowed_mime_types = '{"image/jpeg","image/png","image/webp","image/gif"}',
  public = true;

-- Storage RLS: Anyone can read, only authenticated can upload
CREATE POLICY "Public Access" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'attachments');

CREATE POLICY "Authenticated Upload" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own attachments" 
    ON storage.objects FOR DELETE 
    USING (bucket_id = 'attachments' AND owner = auth.uid());

-------------------------------------------------------------------------------
-- 3. ATTACHMENTS TABLE (To link files to projects/tasks)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own attachments"
    ON public.attachments
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read all attachments"
    ON public.attachments
    FOR SELECT
    USING (true);

-------------------------------------------------------------------------------
-- 4. NOTIFICATIONS ENGINE
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'assignment', 'mention', 'status'
    entity_type TEXT,   -- 'task' or 'project'
    entity_id UUID,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read and update their own notifications"
    ON public.notifications
    FOR ALL
    USING (auth.uid() = user_id);

-- Cleanup Function: Deletes old read notifications (> 7 days old)
CREATE OR REPLACE FUNCTION purge_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.notifications 
    WHERE read = true AND created_at < now() - interval '7 days';
END;
$$;
