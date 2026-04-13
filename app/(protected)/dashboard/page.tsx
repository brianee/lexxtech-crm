import Dashboard from '@/app/components/Dashboard';
import { getTasks } from '@/lib/actions/tasks';
import { getContacts } from '@/lib/actions/contacts';
import { getProjects } from '@/lib/actions/projects';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Dashboard — LexxTech' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: { user } }, tasks, contacts, projects] = await Promise.all([
    supabase.auth.getUser(),
    getTasks(),
    getContacts(),
    getProjects(),
  ]);

  const activeProjectCount = projects.filter(p => p.status === 'active').length;
  const userName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? '';

  return (
    <Dashboard 
      initialTasks={tasks} 
      initialContacts={contacts}
      initialProjects={projects}
      activeProjectCount={activeProjectCount}
      userName={userName}
    />
  );
}
