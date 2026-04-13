'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ProjectInteraction } from '@/lib/types';
import { createNotification } from './notifications';

export async function createProjectInteraction(projectId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthenticated');

  const { data, error } = await supabase
    .from('project_interactions')
    .insert([{ user_id: user.id, project_id: projectId, content }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Notify project members
  const { data: members } = await supabase.from('project_members').select('user_id').eq('project_id', projectId);
  if (members && members.length > 0) {
    for (const m of members) {
      if (m.user_id !== user.id) {
        createNotification({
          userId: m.user_id,
          actorId: user.id,
          title: 'Project Update',
          message: 'A new comment was posted on your project.',
          type: 'comment',
          entityType: 'project',
          entityId: projectId,
        }).catch(console.error);
      }
    }
  }

  revalidatePath('/projects');
  return data as ProjectInteraction;
}

export async function deleteProjectInteraction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthenticated');

  const { error } = await supabase
    .from('project_interactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/projects');
}
