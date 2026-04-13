-- supabase-migration-projects-v2.sql

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS project_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS assigned_lead VARCHAR(255),
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';

-- Add a unique constraint to project_number if we want strict enforcement
-- (Requires that existing null rows don't violate this, so we won't strictly enforce unique yet if there's legacy data)
-- ALTER TABLE public.projects ADD CONSTRAINT projects_project_number_key UNIQUE (project_number);
