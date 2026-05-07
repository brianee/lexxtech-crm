-- supabase-migration-billing-no-project.sql
-- Allow billing transactions without a required project
-- This enables billing directly to a contact even if they have no linked project

-- 1. Make project_id nullable (drop the NOT NULL constraint)
ALTER TABLE public.billing_transactions
  ALTER COLUMN project_id DROP NOT NULL;

-- 2. Add optional contact_id so a transaction can be directly linked to a contact
ALTER TABLE public.billing_transactions
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- 3. Index for contact_id lookups
CREATE INDEX IF NOT EXISTS idx_billing_transactions_contact_id
  ON public.billing_transactions (contact_id);
