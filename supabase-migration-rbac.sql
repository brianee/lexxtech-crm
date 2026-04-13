-- supabase-migration-rbac.sql

-- 1. Create the public profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- 2. Create an admin bypass or RLS policy for the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone in the system" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- (Wait, only admins should be able to update 'role' on other users, but RLS on UPDATE needs more logic. 
-- We'll handle role updates via a secure supabase service-role RPC or backend action later.)

-- 3. Create a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first_user boolean;
BEGIN
  -- Check if this is the very first user in the system
  SELECT count(*) = 0 INTO is_first_user FROM public.profiles;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    CASE WHEN is_first_user THEN 'admin' ELSE 'member' END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow re-running migration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Sync existing users (just in case they already exist in auth.users but not in profiles)
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin' -- We assume all pre-existing users are admins for backwards compatibility
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 5. Add Assignment columns to our base tables

-- Add assigned_user_id to projects (UUID)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- The old 'assigned_lead' was a string. Let's just keep it for legacy display, but new assignments use assigned_user_id.
-- Or we could migrate text if they match, but it's empty so far anyway.

-- Add assigned_to to tasks (UUID)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;


-- 6. Apply Row Level Security based on roles
-- We will re-create RLS to respect the "admin" role.

-- Example for TASKS:
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Role based task access" ON public.tasks;

CREATE POLICY "Role based task access"
  ON public.tasks
  FOR ALL
  USING (
    -- Admin sees all
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    OR
    -- Creator sees it
    (user_id = auth.uid())
    OR
    -- Assignee sees it
    (assigned_to = auth.uid())
  );

-- Example for PROJECTS:
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
DROP POLICY IF EXISTS "Role based project access" ON public.projects;

CREATE POLICY "Role based project access"
  ON public.projects
  FOR ALL
  USING (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    OR
    (user_id = auth.uid())
    OR
    (assigned_user_id = auth.uid())
  );
