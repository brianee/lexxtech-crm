import Kanban from '@/app/components/Kanban';
import { getTasks } from '@/lib/actions/tasks';
import { getProjects } from '@/lib/actions/projects';
import { getContacts } from '@/lib/actions/contacts';
import { getProfiles } from '@/lib/actions/admin';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Kanban — LexxTech CRM' };

export default async function KanbanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [tasks, projects, contacts, profiles] = await Promise.all([
    getTasks(),
    getProjects(),
    getContacts(),
    getProfiles(),
  ]);

  const currentProfile = profiles.find(p => p.id === user?.id);
  const isAdmin = currentProfile?.role === 'admin';

  return (
    <Kanban
      initialTasks={tasks}
      initialProjects={projects}
      contacts={contacts}
      profiles={profiles}
      currentUserId={user?.id}
      isAdmin={isAdmin}
    />
  );
}
