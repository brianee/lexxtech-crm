import Insights from '@/app/components/Insights';
import { getTasks } from '@/lib/actions/tasks';
import { getContacts } from '@/lib/actions/contacts';
import { getProjects } from '@/lib/actions/projects';

import { getProfiles } from '@/lib/actions/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Insights — LexxTech' };

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const [tasks, contacts, projects, profiles] = await Promise.all([
    getTasks(),
    getContacts(),
    getProjects(),
    getProfiles(),
  ]);

  const profile = profiles.find(p => p.id === user?.id);
  const isAdmin = profile?.role === 'admin';
  const features = profile?.features || ['kanban', 'contacts', 'projects', 'insights'];

  if (!isAdmin && !features.includes('insights')) {
    redirect('/dashboard');
  }

  return <Insights initialTasks={tasks} initialContacts={contacts} initialProjects={projects} />;
}
