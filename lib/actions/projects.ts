'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Project } from '@/lib/types';

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const query = supabase
    .from('projects')
    .select('*, transactions:billing_transactions (*), contact:contacts (id, name)')
    .order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
  return data as Project[];
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      tasks (*),
      transactions:billing_transactions (*),
      interactions:project_interactions (*),
      contact:contacts (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching project details:', error);
    return null;
  }

  // Fetch project members mapped with profiles
  const { data: membersData } = await supabase
    .from('project_members_with_profiles')
    .select('*')
    .eq('project_id', id);

  const project = data as Project;
  project.members = membersData || [];

  return project;
}

function generateProjectNumber() {
  const d = new Date();
  const datePart = d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  const randomPart = Math.floor(100 + Math.random() * 900);
  return `PRJ-${datePart}-${randomPart}`;
}

export async function createProject(projectData: Partial<Project>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthenticated');

  // Strip any relational/read-only fields before inserting
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, tasks: _t, transactions: _tx, interactions: _i, contact: _c, assignee: _a, ...safeData } = projectData as Project;
  
  const insertData = { ...safeData, user_id: user.id };
  if (!insertData.project_number) {
    insertData.project_number = generateProjectNumber();
  }

  const { data, error } = await supabase
    .from('projects')
    .insert([insertData])
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/projects');
  revalidatePath('/dashboard');
  return data as Project;
}

export async function updateProject(id: string, updates: Partial<Project>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  // Admins can edit any project; members cannot edit project metadata
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Forbidden: only admins can edit project details');

  // Strip read-only and relational fields
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, tasks: _t, transactions: _tx, interactions: _i, contact: _c, assignee: _a, ...safeUpdates } = updates as Project;

  const { data, error } = await supabase
    .from('projects')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/projects');
  revalidatePath('/dashboard');
  return data as Project;
}

export async function deleteProject(id: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  // Admin-only action
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Forbidden: only admins can delete projects');

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/projects');
  revalidatePath('/dashboard');
  return true;
}

export async function recalculateProjectProgress(projectId: string) {
  const supabase = await createClient();

  await supabase.rpc('recalculate_project_progress', {
    project_id_param: projectId,
  });

  revalidatePath('/projects');
  revalidatePath('/dashboard');
  revalidatePath('/kanban');
}
