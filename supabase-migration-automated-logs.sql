-- ═══════════════════════════════════════════════════════════════════════════
-- LexxTech CRM — Automated Interaction Logging
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 0. Allow 'system' type in contact_interactions ──────────────────────────

DO $$ 
DECLARE 
    constraint_name_val text;
BEGIN
    SELECT tc.constraint_name INTO constraint_name_val
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'contact_interactions' 
      AND tc.constraint_type = 'CHECK'
      AND tc.constraint_name LIKE '%type%';

    IF constraint_name_val IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.contact_interactions DROP CONSTRAINT "' || constraint_name_val || '"';
    END IF;
END $$;

ALTER TABLE public.contact_interactions 
ADD CONSTRAINT contact_interactions_type_check 
CHECK (type in ('call', 'email', 'meeting', 'note', 'system'));

-- ─── 1. Task Activity Trigger ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
DECLARE
  acting_user UUID := coalesce(auth.uid(), NEW.user_id);
  msg TEXT;
BEGIN
  -- Build the message based on the operation
  IF TG_OP = 'INSERT' THEN
    msg := 'Task "' || NEW.title || '" was created.';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      msg := 'Task "' || NEW.title || '" status changed to ' || NEW.status || '.';
    ELSIF OLD.priority IS DISTINCT FROM NEW.priority THEN
      msg := 'Task "' || NEW.title || '" priority changed to ' || NEW.priority || '.';
    ELSE
      -- Don't log minor edits (like title or description changes) to reduce noise
      RETURN NEW;
    END IF;
  END IF;

  -- Log to Project if associated
  IF NEW.project_id IS NOT NULL THEN
    INSERT INTO public.project_interactions (project_id, user_id, content)
    VALUES (NEW.project_id, acting_user, msg);
  END IF;

  -- Log to Contact if associated
  IF NEW.contact_id IS NOT NULL THEN
    INSERT INTO public.contact_interactions (contact_id, user_id, type, note, interacted_at)
    VALUES (NEW.contact_id, acting_user, 'system', msg, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_change ON public.tasks;
CREATE TRIGGER on_task_change
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE PROCEDURE log_task_activity();

-- ─── 2. Project Activity Trigger ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_project_activity()
RETURNS TRIGGER AS $$
DECLARE
  acting_user UUID := coalesce(auth.uid(), NEW.user_id);
  msg TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    msg := 'Project status changed from ' || OLD.status || ' to ' || NEW.status || '.';
    INSERT INTO public.project_interactions (project_id, user_id, content)
    VALUES (NEW.id, acting_user, msg);
  END IF;
  
  -- We only log if it's a difference of at least 5% to avoid micro-logs, 
  -- or if it reaches 100% exactly.
  IF OLD.progress IS DISTINCT FROM NEW.progress THEN
    IF NEW.progress = 100 OR NEW.progress = 0 OR ABS(NEW.progress - OLD.progress) >= 5 THEN
      msg := 'Project progress updated to ' || NEW.progress || '%.';
      INSERT INTO public.project_interactions (project_id, user_id, content)
      VALUES (NEW.id, acting_user, msg);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_change ON public.projects;
CREATE TRIGGER on_project_change
  AFTER UPDATE ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE log_project_activity();

-- ─── 3. Contact Activity Trigger ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_contact_activity()
RETURNS TRIGGER AS $$
DECLARE
  acting_user UUID := coalesce(auth.uid(), NEW.user_id);
  msg TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    msg := 'Relationship status changed from ' || OLD.status || ' to ' || NEW.status || '.';
    INSERT INTO public.contact_interactions (contact_id, user_id, type, note, interacted_at)
    VALUES (NEW.id, acting_user, 'system', msg, NOW());
  END IF;

  IF OLD.category IS DISTINCT FROM NEW.category AND NEW.category IS NOT NULL THEN
    msg := 'Category changed to ' || NEW.category || '.';
    INSERT INTO public.contact_interactions (contact_id, user_id, type, note, interacted_at)
    VALUES (NEW.id, acting_user, 'system', msg, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_contact_change ON public.contacts;
CREATE TRIGGER on_contact_change
  AFTER UPDATE ON public.contacts
  FOR EACH ROW EXECUTE PROCEDURE log_contact_activity();
