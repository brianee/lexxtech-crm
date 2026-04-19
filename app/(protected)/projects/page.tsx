import Projects from '@/app/components/Projects';
import { getProjects } from '@/lib/actions/projects';
import { getContacts } from '@/lib/actions/contacts';
import { getProfiles } from '@/lib/actions/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Projects — LexxTech' };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [projects, contacts, profiles] = await Promise.all([
    getProjects(),
    getContacts(),
    getProfiles()
  ]);

  const currentProfile = profiles.find(p => p.id === user?.id);
  const currentRole    = currentProfile?.role ?? 'member';
  const isAdmin        = currentRole === 'admin';
  const features       = currentProfile?.features || ['kanban', 'contacts', 'projects', 'insights'];

  if (!isAdmin && !features.includes('projects')) {
    redirect('/dashboard');
  }

  return (
    <Projects
      initialProjects={projects}
      contacts={contacts}
      profiles={profiles}
      currentUserId={user?.id}
      isAdmin={isAdmin}
    />
  );
}
