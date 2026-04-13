'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Contact, ContactInteraction } from '@/lib/types';

export async function getContacts(): Promise<Contact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching contacts:', error);
    return [];
  }
  return data as Contact[];
}

export async function getContactById(id: string): Promise<Contact | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching contact:', error);
    return null;
  }
  return data as Contact;
}

export async function createContact(contactData: Partial<Contact>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthenticated');

  const { data, error } = await supabase
    .from('contacts')
    .insert([{ ...contactData, user_id: user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  return data as Contact;
}

export async function updateContact(id: string, updates: Partial<Contact>) {
  const supabase = await createClient();

  // Strip out relational/read-only fields before sending to DB
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, ...safeUpdates } = updates as Contact;

  const { data, error } = await supabase
    .from('contacts')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  return data as Contact;
}

export async function deleteContact(id: string) {
  const supabase = await createClient();

  // Auth check — defense in depth alongside RLS
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  return true;
}

// ─── Interaction Timeline Actions ─────────────────────────────────────────────

export async function getContactInteractions(contactId: string): Promise<ContactInteraction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contact_interactions')
    .select('*')
    .eq('contact_id', contactId)
    .order('interacted_at', { ascending: false });

  if (error) {
    console.error('Error fetching interactions:', error);
    return [];
  }
  return data as ContactInteraction[];
}

export async function createContactInteraction(
  contactId: string,
  type: ContactInteraction['type'],
  note: string,
  interactedAt?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthenticated');

  const timestamp = interactedAt || new Date().toISOString();

  const { data, error } = await supabase
    .from('contact_interactions')
    .insert([{
      contact_id: contactId,
      user_id: user.id,
      type,
      note: note.trim() || null,
      interacted_at: timestamp,
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Mirror the latest interaction date back onto the contact row
  // and increment the interactions counter via the DB function
  // (see supabase-migration.sql for the increment_contact_interactions RPC definition)
  await Promise.all([
    supabase
      .from('contacts')
      .update({ last_interaction: timestamp })
      .eq('id', contactId),
    supabase.rpc('increment_contact_interactions', { contact_id_param: contactId }),
  ]);

  revalidatePath('/contacts');
  return data as ContactInteraction;
}

export async function deleteContactInteraction(id: string) {
  const supabase = await createClient();

  // Auth check — defense in depth alongside RLS
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { error } = await supabase
    .from('contact_interactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/contacts');
  return true;
}

export async function recordContactInteraction(contactId: string, timestamp?: string) {
  const supabase = await createClient();
  const time = timestamp || new Date().toISOString();

  await supabase.rpc('record_contact_interaction', {
    contact_id_param: contactId,
    interaction_time: time,
  });

  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  revalidatePath('/kanban');
}
