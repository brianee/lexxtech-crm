'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Notification, NotificationType } from '@/lib/types';

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  return data as Notification[];
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', user.id); // security

  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

/**
 * Internal helper to trigger a notification. Not typically exposed to client components directly.
 * Instead, called inside other server actions like `updateTask`.
 */
export async function createNotification(params: {
  userId: string;         // recipient
  actorId?: string;       // who did it
  title: string;
  message: string;
  type: NotificationType;
  entityType?: 'task' | 'project';
  entityId?: string;
}) {
  const supabase = await createClient();
  
  // Don't notify oneself
  if (params.userId === params.actorId) return;

  const { error } = await supabase
    .from('notifications')
    .insert([{
      user_id: params.userId,
      actor_id: params.actorId || null,
      title: params.title,
      message: params.message,
      type: params.type,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      read: false
    }]);

  if (error) {
    console.error('Failed to create notification:', error);
  }
}
