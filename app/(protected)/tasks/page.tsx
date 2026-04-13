import Tasks from '@/app/components/Tasks';
import { getTasks } from '@/lib/actions/tasks';
import { getProjects } from '@/lib/actions/projects';
import { getContacts } from '@/lib/actions/contacts';
import { getProfiles } from '@/lib/actions/admin';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Tasks — LexxTech' };

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [tasks, projects, contacts, profiles] = await Promise.all([
    getTasks(),
    getProjects(),
    getContacts(),
    getProfiles(),
  ]);

  const profile = profiles.find(p => p.id === user?.id);
  const isAdmin = profile?.role === 'admin';

  return <Tasks initialTasks={tasks} projects={projects} contacts={contacts} currentUserId={user?.id} isAdmin={isAdmin} />;
}
