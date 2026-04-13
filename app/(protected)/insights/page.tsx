import Insights from '@/app/components/Insights';
import { getTasks } from '@/lib/actions/tasks';
import { getContacts } from '@/lib/actions/contacts';
import { getProjects } from '@/lib/actions/projects';

export const metadata = { title: 'Insights — LexxTech' };

export default async function InsightsPage() {
  const [tasks, contacts, projects] = await Promise.all([
    getTasks(),
    getContacts(),
    getProjects(),
  ]);

  return <Insights initialTasks={tasks} initialContacts={contacts} initialProjects={projects} />;
}
