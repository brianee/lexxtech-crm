-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Shared trigger function for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;
-- DANGER: This will wipe existing tables to enforce the new strict schema
drop table if exists public.tasks cascade;
drop table if exists public.projects cascade;
drop table if exists public.contacts cascade;

-- 1. Projects Table
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  progress integer default 0,
  tags text[] default '{}',
  status text check (status in ('active', 'archived', 'template')) default 'active' not null,
  milestones jsonb default '[]'::jsonb,
  team jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger update_projects_updated_at
    before update on public.projects
    for each row execute procedure update_updated_at_column();

-- 2. Contacts Table
create table public.contacts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  role text,
  company text,
  avatar text,
  status text check (status in ('warm', 'cold', 'dormant')) default 'warm' not null,
  last_interaction timestamp with time zone,
  next_step text,
  interactions integer default 0,
  rank text,
  context text,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger update_contacts_updated_at
    before update on public.contacts
    for each row execute procedure update_updated_at_column();

-- 3. Tasks Table
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  project_id uuid references public.projects(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  due_date timestamp with time zone,
  priority text check (priority in ('low', 'medium', 'high', 'critical')) default 'medium' not null,
  status text check (status in ('pending', 'in-progress', 'completed', 'overdue')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger update_tasks_updated_at
    before update on public.tasks
    for each row execute procedure update_updated_at_column();


-- Row Level Security (RLS) Setup

-- Enable RLS
alter table public.tasks enable row level security;
alter table public.projects enable row level security;
alter table public.contacts enable row level security;

-- Create Policies (Users can only see/edit their own data)

-- Tasks Policies
create policy "Users can view their own tasks" on public.tasks 
  for select using (auth.uid() = user_id);
create policy "Users can insert their own tasks" on public.tasks 
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own tasks" on public.tasks 
  for update using (auth.uid() = user_id);
create policy "Users can delete their own tasks" on public.tasks 
  for delete using (auth.uid() = user_id);

-- Projects Policies
create policy "Users can view their own projects" on public.projects 
  for select using (auth.uid() = user_id);
create policy "Users can insert their own projects" on public.projects 
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own projects" on public.projects 
  for update using (auth.uid() = user_id);
create policy "Users can delete their own projects" on public.projects 
  for delete using (auth.uid() = user_id);

-- Contacts Policies
create policy "Users can view their own contacts" on public.contacts 
  for select using (auth.uid() = user_id);
create policy "Users can insert their own contacts" on public.contacts 
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own contacts" on public.contacts 
  for update using (auth.uid() = user_id);
create policy "Users can delete their own contacts" on public.contacts 
  for delete using (auth.uid() = user_id);


-- PERFORMANCE INDEXING

-- Tasks
create index idx_tasks_user_id on public.tasks(user_id);
create index idx_tasks_project_id on public.tasks(project_id);
create index idx_tasks_contact_id on public.tasks(contact_id);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_due_date on public.tasks(due_date);

-- Projects
create index idx_projects_user_id on public.projects(user_id);
create index idx_projects_status on public.projects(status);

-- Contacts
create index idx_contacts_user_id on public.contacts(user_id);
create index idx_contacts_status on public.contacts(status);
create index idx_contacts_category on public.contacts(category);
