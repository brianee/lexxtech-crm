'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { BillingTransaction } from '@/lib/types';

export async function getContactBillingTransactions(contactId: string): Promise<BillingTransaction[]> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];

  const { data, error } = await supabase
    .from('billing_transactions')
    .select('*')
    .eq('contact_id', contactId)
    .is('project_id', null)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching contact billing transactions:', error);
    return [];
  }
  return (data ?? []) as BillingTransaction[];
}

export async function createBillingTransaction(data: Omit<BillingTransaction, 'id' | 'user_id' | 'created_at'>) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    throw new Error('Not authenticated');
  }

  // Billing is admin-only — enforce server-side regardless of UI
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single();
  if (profile?.role !== 'admin') throw new Error('Forbidden: billing management requires admin role');

  const { data: transaction, error } = await supabase
    .from('billing_transactions')
    .insert([{ ...data, user_id: userData.user.id }])
    .select()
    .single();

  if (error) {
    console.error('Error creating transaction:', error);
    throw new Error(error.message || 'Failed to create transaction');
  }

  revalidatePath('/contacts');
  revalidatePath('/projects');
  return transaction as BillingTransaction;
}

export async function updateBillingTransaction(id: string, updates: Partial<Omit<BillingTransaction, 'id' | 'user_id' | 'project_id' | 'created_at'>>) {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error('Not authenticated');

  // Billing is admin-only — enforce server-side regardless of UI
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single();
  if (profile?.role !== 'admin') throw new Error('Forbidden: billing management requires admin role');

  const { data, error } = await supabase
    .from('billing_transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating transaction:', error.message, error.details, error.hint);
    throw new Error(error.message || 'Failed to update transaction');
  }

  revalidatePath('/projects');
  return data as BillingTransaction;
}

export async function deleteBillingTransaction(id: string) {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw new Error('Not authenticated');

  // Billing is admin-only — enforce server-side regardless of UI
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single();
  if (profile?.role !== 'admin') throw new Error('Forbidden: billing management requires admin role');

  const { error } = await supabase
    .from('billing_transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting transaction:', error);
    throw new Error('Failed to delete transaction');
  }

  revalidatePath('/projects');
}
