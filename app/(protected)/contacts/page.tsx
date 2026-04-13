import Contacts from '@/app/components/Contacts';
import { getContacts } from '@/lib/actions/contacts';
import { getTasks } from '@/lib/actions/tasks';
import { getProjects } from '@/lib/actions/projects';
import { getProfiles } from '@/lib/actions/admin';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Network — LexxTech CRM' };

export default async function ContactsPage() {
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

  return (
    <Contacts
      initialContacts={contacts}
      initialTasks={tasks}
      initialProjects={projects}
      isAdmin={isAdmin}
    />
  );
}
