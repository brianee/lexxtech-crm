import Contacts from '@/app/components/Contacts';
import { getContacts } from '@/lib/actions/contacts';
import { getTasks } from '@/lib/actions/tasks';
import { getProjects } from '@/lib/actions/projects';
import { getProfiles } from '@/lib/actions/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Network — LexxTech CRM' };

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  const initialContactId = typeof resolvedParams.id === 'string' ? resolvedParams.id : undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [contacts, tasks, projects, profiles] = await Promise.all([
    getContacts(),
    getTasks(),
    getProjects(),
    getProfiles(),
  ]);

  const profile = profiles.find(p => p.id === user?.id);
  const isAdmin = profile?.role === 'admin';
  const features = profile?.features || ['kanban', 'contacts', 'projects', 'insights'];

  if (!isAdmin && !features.includes('contacts')) {
    redirect('/dashboard');
  }

  return (
    <Contacts
      initialContacts={contacts}
      initialTasks={tasks}
      initialProjects={projects}
      isAdmin={isAdmin}
      initialContactId={initialContactId}
    />
  );
}
