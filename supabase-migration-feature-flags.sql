-- Add features column to profiles table to support granular access control
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '["kanban", "contacts", "projects", "insights"]'::jsonb;

-- Ensure all existing profiles have the default features if they somehow got NULL
UPDATE public.profiles
SET features = '["kanban", "contacts", "projects", "insights"]'::jsonb
WHERE features IS NULL;
