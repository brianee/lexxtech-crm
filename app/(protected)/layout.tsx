import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/app/components/AppLayout';
import { getTasks } from '@/lib/actions/tasks';
import { getProjects } from '@/lib/actions/projects';
import { getContacts } from '@/lib/actions/contacts';
import { getProfiles } from '@/lib/actions/admin';
import { getNotifications } from '@/lib/actions/notifications';
import { ToastProvider } from '@/lib/contexts/ToastContext';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userAvatar = user.user_metadata?.avatar_url as string | undefined;
  const userEmail  = user.email;

  // Fetch lightweight data to power search + notifications in the shared navbar
  const [tasks, projects, contacts, profiles, notifications] = await Promise.all([
    getTasks(),
    getProjects(),
    getContacts(),
    getProfiles(),
    getNotifications(),
  ]);

  // Identify the current user's role from the profiles list
  const currentProfile = profiles.find(p => p.id === user.id);
  const currentRole    = currentProfile?.role ?? 'member';
  const currentUserId  = user.id;
  const userName       = currentProfile?.full_name || user.user_metadata?.full_name as string | undefined;
  const currentFeatures = currentProfile?.features ?? ['kanban', 'contacts', 'projects', 'insights'];

  // SILENT BACKGROUND SYNC: Degrade contact health if neglected
  // Fire and forget, do not await this so it doesn't block rendering
  const now = Date.now();
  const contactsToUpdate = contacts.filter(c => {
    if (!c.last_interaction) return false;
    const days = (now - new Date(c.last_interaction).getTime()) / 86400000;
    if (days >= 30 && c.status !== 'dormant') return true;
    if (days >= 14 && days < 30 && c.status === 'warm') return true;
    return false;
  });

  if (contactsToUpdate.length > 0) {
    Promise.all(contactsToUpdate.map(c => {
      const days = (now - new Date(c.last_interaction!).getTime()) / 86400000;
      const newStatus = days >= 30 ? 'dormant' : 'cold';
      return supabase.from('contacts').update({ status: newStatus }).eq('id', c.id);
    })).catch(console.error);
  }

  return (
    <ToastProvider>
      <AppLayout
        userEmail={userEmail}
        userAvatar={userAvatar}
        userName={userName}
        currentRole={currentRole}
        currentUserId={currentUserId}
        currentFeatures={currentFeatures}
        hasServiceKey={!!process.env.SUPABASE_SERVICE_ROLE_KEY}
        tasks={tasks}
        projects={projects}
        contacts={contacts}
        profiles={profiles}
        notifications={notifications}
      >
        {children}
      </AppLayout>
    </ToastProvider>
  );
}
