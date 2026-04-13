'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ProjectMember } from '@/lib/types';
import { createNotification } from './notifications';

// ─── Guard: ensure caller is admin ─────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') throw new Error('Forbidden: admin only');
  return { supabase, user };
}

// ─── Get all members of a project ──────────────────────────────────────────
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_members_with_profiles') // uses the view we created in migration
    .select('*')
    .eq('project_id', projectId)
    .order('added_at', { ascending: true });

  if (error) {
    console.error('getProjectMembers error:', error);
    return [];
  }
  return data as ProjectMember[];
}

// ─── Get all project IDs a user is a member of ─────────────────────────────
export async function getMyProjectIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id);

  return (data ?? []).map(r => r.project_id);
}

// ─── Add a member to a project (admin only) ────────────────────────────────
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: 'lead' | 'member' = 'member'
) {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from('project_members')
    .upsert({ project_id: projectId, user_id: userId, role }, { onConflict: 'project_id,user_id' })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Fetch project name for the notification
  const { data: project } = await supabase.from('projects').select('name').eq('id', projectId).single();
  const { data: { user } } = await supabase.auth.getUser();

  if (project && user) {
    createNotification({
      userId: userId,
      actorId: user.id,
      title: 'Added to Project',
      message: `You were added to the project: ${project.name} as a ${role}.`,
      type: 'assignment',
      entityType: 'project',
      entityId: projectId,
    }).catch(console.error);
  }

  revalidatePath('/projects');
  return data as ProjectMember;
}

// ─── Update a member's role within a project (admin only) ──────────────────
export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: 'lead' | 'member'
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  revalidatePath('/projects');
}

// ─── Remove a member from a project (admin only) ───────────────────────────
export async function removeProjectMember(projectId: string, userId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  revalidatePath('/projects');
}
