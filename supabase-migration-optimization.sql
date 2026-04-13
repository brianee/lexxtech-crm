-- ============================================================
-- Migration: Database Optimizations (Indexes & RPCs)
-- ============================================================

-- 1. FOREIGN KEY & PERFORMANCE INDEXES
-- PostgreSQL does not automatically index foreign keys. We add them here.

-- Tasks Table
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);

-- Projects Table
CREATE INDEX IF NOT EXISTS idx_projects_assigned_user_id ON public.projects(assigned_user_id);

-- Project Members Table (Unique constraint indexes project_id first, we need user_id)
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

-- Task Interactions (Comments)
CREATE INDEX IF NOT EXISTS idx_task_interactions_task_id ON public.task_interactions(task_id);

-- Attachments
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON public.attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_project_id ON public.attachments(project_id);

-- Notifications (Compound index for querying unread notifications per user)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);


-- ============================================================
-- 2. RLS OPTIMIZATION: STABLE ADMIN CHECK
-- ============================================================
-- Reduces the N+1 subqueries when scanning tables.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Refactor existing RLS policies to use the new STABLE function
-- Note: Replace 'Role based task access' and 'Role based project access' if they match your original policy names.

DROP POLICY IF EXISTS "Role based task access" ON public.tasks;
CREATE POLICY "Role based task access"
  ON public.tasks
  FOR ALL
  USING (
    public.is_admin()
    OR (user_id = auth.uid())
    OR (assigned_to = auth.uid())
  );

DROP POLICY IF EXISTS "Role based project access" ON public.projects;
CREATE POLICY "Role based project access"
  ON public.projects
  FOR ALL
  USING (
    public.is_admin()
    OR (user_id = auth.uid())
    OR (assigned_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins manage project members" ON public.project_members;
CREATE POLICY "Admins manage project members"
  ON public.project_members
  FOR ALL
  USING (public.is_admin());


-- ============================================================
-- 3. SERVER-SIDE PROCESSING: MARK OVERDUE TASKS
-- ============================================================
-- Run this directly in the database to prevent heavy client ORM overhead.

CREATE OR REPLACE FUNCTION public.mark_overdue_tasks()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.tasks
  SET status = 'overdue', updated_at = timezone('utc'::text, now())
  WHERE due_date < timezone('utc'::text, now())
    AND status IN ('pending', 'in-progress', 'blocked', 'dispatched');
END;
$$;
