-- ============================================================
-- Migration: project_members junction table
-- Run this once in your Supabase SQL Editor
-- ============================================================

-- 1. Create the junction table
CREATE TABLE IF NOT EXISTS public.project_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member'
                 CHECK (role IN ('lead', 'member')),
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

-- 2. Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 3. Admins can do everything
DROP POLICY IF EXISTS "Admins manage project members" ON public.project_members;
CREATE POLICY "Admins manage project members"
  ON public.project_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Members can read their own memberships (so getProjects can filter)
DROP POLICY IF EXISTS "Members view own memberships" ON public.project_members;
CREATE POLICY "Members view own memberships"
  ON public.project_members
  FOR SELECT
  USING (user_id = auth.uid());

-- 5. Grant to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;

-- ============================================================
-- Optional: view to make project + members query easier
-- ============================================================
CREATE OR REPLACE VIEW public.project_members_with_profiles AS
  SELECT
    pm.id,
    pm.project_id,
    pm.user_id,
    pm.role,
    pm.added_at,
    p.full_name,
    p.email,
    p.avatar_url
  FROM public.project_members pm
  JOIN public.profiles p ON p.id = pm.user_id;

GRANT SELECT ON public.project_members_with_profiles TO authenticated;
