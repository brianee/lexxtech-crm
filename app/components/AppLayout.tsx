'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  CheckCircle2,
  Users,
  BarChart3,
  PlusCircle,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { useSettings } from '@/lib/hooks/useSettings';
import SettingsPanel from './SettingsPanel';
import NotificationsPanel from './NotificationsPanel';
import SearchDropdown from './SearchDropdown';
import TaskIntakeModal from './TaskIntakeModal';
import { TaskIntakeContext, type TaskIntakeData } from '@/lib/contexts/TaskIntakeContext';
import type { Task, Project, Contact, Profile, Role, Notification } from '@/lib/types';

interface AppLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  userAvatar?: string;
  userName?: string;
  currentRole?: Role;
  currentUserId?: string;
  hasServiceKey?: boolean;
  tasks?: Task[];
  projects?: Project[];
  contacts?: Contact[];
  profiles?: Profile[];
  notifications?: Notification[];
}

export default function AppLayout({
  children,
  userEmail,
  userAvatar,
  userName,
  currentRole = 'member',
  currentUserId,
  hasServiceKey = false,
  tasks = [],
  projects = [],
  contacts = [],
  profiles = [],
  notifications = [],
}: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showTaskIntake, setShowTaskIntake] = React.useState(false);
  const [intakeData, setIntakeData] = React.useState<TaskIntakeData>();
  const [localTasks, setLocalTasks] = React.useState<Task[]>(tasks);
  const pathname = usePathname();
  const router = useRouter();
  const { settings, mounted } = useSettings();
  const [supabase] = React.useState(() => createClient());

  const isAdmin = currentRole === 'admin';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'projects',  label: 'Projects',  icon: FolderOpen,       href: '/projects' },
    { id: 'tasks',     label: 'Tasks',     icon: CheckCircle2,     href: '/tasks' },
    { id: 'kanban',    label: 'Kanban',    icon: LayoutGrid,       href: '/kanban' },
    { id: 'contacts',  label: 'Contacts',  icon: Users,            href: '/contacts' },
    ...(isAdmin ? [{ id: 'insights', label: 'Insights', icon: BarChart3, href: '/insights' }] : []),
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const activeTab = navItems.find(item => pathname.startsWith(item.href))?.id ?? 'dashboard';

  // Use settings profile if set, else fall back to prop
  const displayName = userName || userEmail?.split('@')[0] || 'You';
  const avatarSrc   = userAvatar || `https://picsum.photos/seed/${displayName}/100/100`;
  const crmName     = (mounted && settings.crmName)             || 'lexxtech';

  const handleTaskCreated = React.useCallback((task: Task) => {
    setLocalTasks(prev => [task, ...prev]);
  }, []);

  // Notification count (Combine unread DB hooks + computed tasks/contacts)
  const notifCount = React.useMemo(() => {
    let count = notifications.filter(n => !n.read).length;
    
    // Auto-computed reminders (not in DB)
    const now = new Date();
    const overdue = localTasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < now).length;
    const dueSoon = localTasks.filter(t => {
      if (t.status === 'completed' || !t.due_date) return false;
      const d = new Date(t.due_date);
      const diff = Math.ceil((d.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
      return diff === 0 || diff === 1;
    }).length;
    const dormant = contacts.filter(c => {
      if (!c.last_interaction) return true;
      const diff = (now.getTime() - new Date(c.last_interaction).getTime()) / 86400000;
      return diff > 30;
    }).length;

    return count + (overdue > 0 ? 1 : 0) + (dueSoon > 0 ? 1 : 0) + (dormant > 0 ? 1 : 0);
  }, [localTasks, contacts, notifications]);

  return (
    <TaskIntakeContext.Provider value={{ openIntake: (data) => { setIntakeData(data); setShowTaskIntake(true); } }}>
    <div className="flex min-h-screen bg-surface text-on-surface font-sans">
      {/* Settings Modal */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} userEmail={userEmail} userName={userName} isAdmin={isAdmin} hasServiceKey={hasServiceKey} />
      )}

      {/* Task Intake Modal */}
      {showTaskIntake && (
        <TaskIntakeModal
          contacts={contacts}
          projects={projects}
          profiles={profiles}
          onClose={() => { setShowTaskIntake(false); setIntakeData(undefined); }}
          onCreated={handleTaskCreated}
          initialData={intakeData}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen border-r border-outline/20 bg-surface-container-lowest transition-all duration-300 z-50 flex flex-col py-8 px-4',
          isSidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="mb-10 px-3 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter text-primary font-headline">{crmName}</span>
              <span className="text-[10px] font-bold tracking-[0.25em] text-primary/50 uppercase mt-1">Personal Workspace</span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {isAdmin && (
          <div className="relative group focus-within:ring-1 focus-within:ring-primary/30 mx-1 mb-10 rounded-xl">
            <button className={cn(
              'w-full bg-primary hover:bg-primary-dim text-on-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/10 transition-all hover:-translate-y-0.5 active:translate-y-0 py-3',
              !isSidebarOpen && 'px-0'
            )}
              onClick={() => setShowTaskIntake(true)}
              type="button"
            >
              <PlusCircle size={20} />
              {isSidebarOpen && <span>New Entry</span>}
            </button>

            <div className="absolute top-full left-0 mt-2 w-full bg-surface-container-high border border-outline/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 flex flex-col py-1 overflow-hidden">
              <button
                onClick={() => setShowTaskIntake(true)}
                className="px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-primary/10 hover:text-primary transition-colors text-left flex items-center gap-2"
              >
                <CheckCircle2 size={16} /> New Task
              </button>
              <button
                onClick={() => router.push('/projects')}
                className="px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-primary/10 hover:text-primary transition-colors text-left flex items-center gap-2"
              >
                <FolderOpen size={16} /> New Project
              </button>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1.5 px-1">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 transition-all font-headline text-sm rounded-xl',
                activeTab === item.id
                  ? 'text-primary font-bold bg-primary/10 border border-primary/10'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              )}
            >
              <item.icon size={20} fill={activeTab === item.id ? 'currentColor' : 'none'} />
              {isSidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className={cn(
          'mt-auto px-3 flex items-center gap-3 pt-6 border-t border-outline/20',
          !isSidebarOpen && 'justify-center px-0'
        )}>
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="User profile"
              className="w-10 h-10 rounded-full bg-surface-container-high object-cover ring-2 ring-primary/20"
              src={avatarSrc}
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-surface-container-lowest"></div>
          </div>
          {isSidebarOpen && (
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold truncate">{displayName}</p>
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider">{userEmail}</p>
            </div>
          )}
          {isSidebarOpen && (
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors shrink-0"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn('flex-1 transition-all duration-300', isSidebarOpen ? 'ml-64' : 'ml-20')}>
        {/* Header */}
        <header
          className="fixed top-0 right-0 z-40 bg-surface/80 backdrop-blur-xl flex justify-between items-center h-16 px-10 border-b border-outline/20 transition-all duration-300"
          style={{ left: isSidebarOpen ? '16rem' : '5rem' }}
        >
          {/* Search */}
          <SearchDropdown tasks={tasks} projects={projects} contacts={contacts} />

          {/* Actions */}
          <div className="flex items-center gap-6 ml-6">
            <div className="flex items-center gap-1 relative">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(v => !v)}
                  className="p-2 text-on-surface-variant hover:text-primary transition-colors relative rounded-full hover:bg-surface-container"
                >
                  <Bell size={20} />
                  {notifCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-error rounded-full flex items-center justify-center text-[9px] font-extrabold text-white px-0.5 ring-2 ring-surface">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <NotificationsPanel 
                    tasks={localTasks} 
                    contacts={contacts} 
                    dbNotifications={notifications}
                    onClose={() => setShowNotifications(false)} 
                  />
                )}
              </div>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(true)}
                className={cn(
                  'p-2 transition-colors rounded-full hover:bg-surface-container',
                  showSettings ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-primary'
                )}
              >
                <Settings size={20} />
              </button>
            </div>

            <div className="h-4 w-px bg-outline/30 mx-1"></div>
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">v1.0.0</div>
          </div>
        </header>

        {/* Content Area */}
        <div className="pt-24 px-10 pb-12 max-w-[1500px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
    </TaskIntakeContext.Provider>
  );
}
