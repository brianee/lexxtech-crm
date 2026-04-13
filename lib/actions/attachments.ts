'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Attachment } from '@/lib/types';

export async function getAttachments(entityType: 'task' | 'project', entityId: string): Promise<Attachment[]> {
  const supabase = await createClient();
  const column = entityType === 'task' ? 'task_id' : 'project_id';
  
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq(column, entityId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching attachments:', error);
    return [];
  }
  return data as Attachment[];
}

export async function saveAttachmentRecord(attachment: Omit<Attachment, 'id' | 'created_at'>): Promise<Attachment> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data, error } = await supabase
    .from('attachments')
    .insert([attachment])
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/tasks');
  revalidatePath('/projects');
  return data as Attachment;
}

export async function deleteAttachment(attachmentId: string, filePath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  // 1. Delete from storage first
  const { error: storageError } = await supabase.storage.from('attachments').remove([filePath]);
  if (storageError) {
    console.error('Storage deletion error:', storageError);
    // proceed anyway if storage fails (e.g. file already gone)
  }

  // 2. Delete from database
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId);

  if (error) throw new Error(error.message);

  revalidatePath('/tasks');
  revalidatePath('/projects');
  return true;
}
