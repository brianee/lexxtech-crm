-- ═══════════════════════════════════════════════════════════════════════════
-- LexxTech CRM — Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This script is SAFE to run on existing data — uses ALTER TABLE IF NOT EXISTS
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Add missing columns to contacts table ─────────────────────────────────
-- These columns exist in the TypeScript types but were missing from the DB schema
-- causing data to be silently dropped on insert/update.

alter table public.contacts add column if not exists phone text;
alter table public.contacts add column if not exists email text;
alter table public.contacts add column if not exists location text;
alter table public.contacts add column if not exists address text;
alter table public.contacts add column if not exists linkedin text;
alter table public.contacts add column if not exists notes text;

-- ─── 2. Add missing columns to tasks table ────────────────────────────────────

alter table public.tasks add column if not exists description text;
alter table public.tasks add column if not exists next_action text;
alter table public.tasks add column if not exists registry_number text unique;
alter table public.tasks add column if not exists source text;
alter table public.tasks add column if not exists job_type text;

-- ─── 3. Create contact_interactions table ─────────────────────────────────────
-- This table is used by the app but was never defined in the original schema.

create table if not exists public.contact_interactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  type text check (type in ('call', 'email', 'meeting', 'note')) not null,
  note text,
  interacted_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ─── 4. Enable RLS on contact_interactions ────────────────────────────────────

alter table public.contact_interactions enable row level security;

-- ─── 5. Add RLS policies for contact_interactions ────────────────────────────

create policy "Users can view their own interactions" on public.contact_interactions
  for select using (auth.uid() = user_id);

create policy "Users can insert their own interactions" on public.contact_interactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own interactions" on public.contact_interactions
  for update using (auth.uid() = user_id);

create policy "Users can delete their own interactions" on public.contact_interactions
  for delete using (auth.uid() = user_id);

-- ─── 6. Add indexes for contact_interactions ─────────────────────────────────

create index if not exists idx_contact_interactions_user_id on public.contact_interactions(user_id);
create index if not exists idx_contact_interactions_contact_id on public.contact_interactions(contact_id);
create index if not exists idx_contact_interactions_interacted_at on public.contact_interactions(interacted_at desc);

-- ─── 7. Add increment_contact_interactions RPC function ──────────────────────
-- Used by lib/actions/contacts.ts to atomically increment the contacts.interactions counter
-- so concurrent requests don't cause race conditions on the count.

create or replace function increment_contact_interactions(contact_id_param uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.contacts
  set interactions = interactions + 1
  where id = contact_id_param
    and user_id = auth.uid();
end;
$$;
