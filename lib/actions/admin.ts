'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { Profile, Role } from '@/lib/types';

const getAdminClient = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.');
  }
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
  return data as Profile[];
}

export async function inviteUser(email: string, full_name: string, role: Role): Promise<{ success: boolean; error?: string }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is missing from environment variables. Cannot invoke Admin API.' };
  }

  const adminClient = getAdminClient();
  
  // 1. Invite the user via Supabase Auth Admin
  const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(email);
  
  if (authError) {
    console.error('Error inviting user:', authError);
    return { success: false, error: authError.message };
  }

  // Note: Depending on timing, the database trigger might have already created a basic profile.
  // We'll run an UPSERT to make sure their name and assigned role are forcibly set correctly.
  
  if (authData?.user) {
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
         id: authData.user.id,
         email: email,
         full_name: full_name,
         role: role
      }, { onConflict: 'id' });

    if (profileError) {
       console.error('Failed to sync profile on invite:', profileError);
       return { success: false, error: 'User invited, but failed to setup initial permissions.' };
    }
  }

  return { success: true };
}

export async function updateUserRole(userId: string, newRole: Role) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing service role key');

  const adminClient = getAdminClient();

  const { error } = await adminClient
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) throw error;
}

export async function removeUser(userId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing service role key');

  const adminClient = getAdminClient();

  // Deleting from auth.users securely wipes all data and cascading profiles.
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) throw error;
}

export async function updateUserName(userId: string, full_name: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing service role key');

  const adminClient = getAdminClient();

  const { error } = await adminClient
    .from('profiles')
    .update({ full_name })
    .eq('id', userId);

  if (error) throw error;
}

export async function updateMyProfileName(new_name: string) {
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: new_name })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }
}
