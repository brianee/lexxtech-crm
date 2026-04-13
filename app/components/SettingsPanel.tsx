'use client';

import React from 'react';
import {
  X, Sun, Moon, Monitor, Palette, Bell, BellOff, User, Globe,
  Download, Trash2, LogOut, ChevronRight, CheckCircle2, AlertTriangle,
  Shield, Database, Zap, Users, Plus, Star, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings, ACCENT_COLORS, type AppSettings, type ThemeMode, type AccentColor } from '@/lib/hooks/useSettings';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getProfiles, inviteUser, updateUserRole, removeUser, updateUserName, updateMyProfileName } from '@/lib/actions/admin';
import type { Profile, Role } from '@/lib/types';

type Section = 'appearance' | 'profile' | 'notifications' | 'workspace' | 'team' | 'account';

const SECTIONS: { id: Section; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'appearance',    label: 'Appearance',    icon: Palette,       desc: 'Theme & colors' },
  { id: 'profile',       label: 'Profile',       icon: User,          desc: 'Name & avatar' },
  { id: 'notifications', label: 'Notifications', icon: Bell,          desc: 'Alert preferences' },
  { id: 'workspace',     label: 'Workspace',     icon: Globe,         desc: 'CRM & export' },
  { id: 'team',          label: 'Team Settings', icon: Users,         desc: 'Admin & invites' },
  { id: 'account',       label: 'Account',       icon: Shield,        desc: 'Auth & danger zone' },
];

interface SettingsPanelProps {
  onClose: () => void;
  userEmail?: string;
  userName?: string;
  isAdmin?: boolean;
  hasServiceKey?: boolean;
}

function SectionNav({ active, onChange, sections = SECTIONS }: { active: Section; onChange: (s: Section) => void; sections?: typeof SECTIONS }) {
  return (
    <nav className="p-3 border-r border-outline/10 flex flex-col gap-1 w-44 shrink-0">
      {sections.map(s => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm',
            active === s.id
              ? 'bg-primary/10 text-primary font-bold border border-primary/15'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          )}
        >
          <s.icon size={15} />
          <div>
            <p className="font-semibold leading-none">{s.label}</p>
            <p className="text-[10px] opacity-50 mt-0.5">{s.desc}</p>
          </div>
        </button>
      ))}
    </nav>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-outline/10 last:border-0">
      <div>
        <p className="text-sm font-semibold text-on-surface">{label}</p>
        {description && <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-all duration-200 shrink-0',
          checked ? 'bg-primary' : 'bg-surface-container-highest'
        )}
      >
        <span className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )} />
      </button>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-4 opacity-60">{children}</h3>;
}

// ─── Appearance ──────────────────────────────────────────────────────────────

function AppearanceSection({ settings, updateSettings }: { settings: AppSettings; updateSettings: (p: Partial<AppSettings>) => void }) {
  const themes: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
    { value: 'dark',   label: 'Dark',   icon: Moon },
    { value: 'light',  label: 'Light',  icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Theme Mode</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(t => (
            <button
              key={t.value}
              onClick={() => updateSettings({ theme: t.value })}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                settings.theme === t.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-outline/20 text-on-surface-variant hover:border-outline/50 hover:bg-surface-container'
              )}
            >
              <t.icon size={22} />
              <span className="text-[11px] font-bold uppercase tracking-wide">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Accent Color</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(ACCENT_COLORS) as [AccentColor, typeof ACCENT_COLORS[AccentColor]][]).map(([key, val]) => (
            <button
              key={key}
              onClick={() => updateSettings({ accentColor: key })}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border-2 transition-all',
                settings.accentColor === key
                  ? 'border-current bg-surface-container-high'
                  : 'border-outline/20 hover:border-outline/50 hover:bg-surface-container'
              )}
              style={{ color: val.swatch, borderColor: settings.accentColor === key ? val.swatch : undefined }}
            >
              <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: val.swatch }} />
              <span className="text-[12px] font-bold text-on-surface">{val.label}</span>
              {settings.accentColor === key && <CheckCircle2 size={14} className="ml-auto" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function ProfileSection({ settings, updateSettings, initialName }: { settings: AppSettings; updateSettings: (p: Partial<AppSettings>) => void; initialName?: string }) {
  const [name, setName] = React.useState(initialName || settings.profile.displayName);
  const [avatar, setAvatar] = React.useState(settings.profile.avatarUrl);
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMyProfileName(name);
      updateSettings({ profile: { displayName: name, avatarUrl: avatar } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Failed to update display name');
    } finally {
      setLoading(false);
    }
  };

  const previewAvatar = avatar || `https://picsum.photos/seed/${name || 'user'}/100/100`;

  return (
    <div className="space-y-6">
      <SectionTitle>Display Profile</SectionTitle>
      <div className="flex items-center gap-5 p-5 bg-surface-container rounded-2xl border border-outline/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewAvatar} alt="Avatar preview" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary/20" />
        <div className="flex-1">
          <p className="text-sm font-bold text-on-surface">{name || 'Your Name'}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">Preview</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2 block">Display Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Alex Lexx"
            className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-2.5 text-sm font-medium text-on-surface outline-none focus:ring-1 focus:ring-primary/40 placeholder-on-surface-variant/40"
          />
        </div>
        <div>
          <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2 block">Avatar URL</label>
          <input
            value={avatar}
            onChange={e => setAvatar(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-2.5 text-sm font-medium text-on-surface outline-none focus:ring-1 focus:ring-primary/40 placeholder-on-surface-variant/40"
          />
          <p className="text-[10px] text-on-surface-variant mt-1.5 opacity-60">Leave blank to use an auto-generated avatar</p>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl text-sm shadow-lg shadow-primary/20 hover:bg-primary-dim transition-all"
      >
        {saved ? '✓ Saved' : 'Save Profile'}
      </button>
    </div>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsSection({ settings, updateSettings }: { settings: AppSettings; updateSettings: (p: Partial<AppSettings>) => void }) {
  const patch = (key: keyof AppSettings['notifications'], val: boolean) =>
    updateSettings({ notifications: { ...settings.notifications, [key]: val } });

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>In-App Alerts</SectionTitle>
        <div className="bg-surface-container rounded-2xl border border-outline/10 px-5 divide-y divide-outline/10">
          <Toggle
            checked={settings.notifications.overdueAlerts}
            onChange={v => patch('overdueAlerts', v)}
            label="Overdue Task Alerts"
            description="Notify when tasks pass their due date"
          />
          <Toggle
            checked={settings.notifications.dormantContactReminders}
            onChange={v => patch('dormantContactReminders', v)}
            label="Dormant Contact Reminders"
            description="Alert when contacts haven't been engaged in 30+ days"
          />
          <Toggle
            checked={settings.notifications.projectMilestoneAlerts}
            onChange={v => patch('projectMilestoneAlerts', v)}
            label="Project Milestone Alerts"
            description="Notify when project milestones are completed"
          />
        </div>
      </div>

      <div className="p-4 bg-surface-container/50 rounded-2xl border border-dashed border-outline/20 flex items-center gap-3">
        <BellOff size={18} className="text-on-surface-variant opacity-40 shrink-0" />
        <p className="text-xs text-on-surface-variant opacity-60">
          Push notification support coming in a future update. Alerts currently appear in the notification panel.
        </p>
      </div>
    </div>
  );
}

// ─── Workspace ────────────────────────────────────────────────────────────────

function WorkspaceSection({ settings, updateSettings }: { settings: AppSettings; updateSettings: (p: Partial<AppSettings>) => void }) {
  const [crmName, setCrmName] = React.useState(settings.crmName);
  const [saved, setSaved] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const handleSave = () => {
    updateSettings({ crmName, kanbanDefaultView: settings.kanbanDefaultView });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const supabase = createClient();
      const [tasks, contacts, projects] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('contacts').select('*'),
        supabase.from('projects').select('*'),
      ]);

      const data = { tasks: tasks.data, contacts: contacts.data, projects: projects.data, exportedAt: new Date().toISOString() };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${crmName}-export.json`; a.click();
        URL.revokeObjectURL(url);
      } else {
        // CSV: flatten tasks
        const headers = ['id', 'title', 'status', 'priority', 'due_date', 'created_at'];
        const rows = (tasks.data ?? []).map(t => headers.map(h => JSON.stringify((t as Record<string, unknown>)[h] ?? '')).join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${crmName}-tasks.csv`; a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Workspace Identity</SectionTitle>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2 block">CRM Name</label>
            <input
              value={crmName}
              onChange={e => setCrmName(e.target.value)}
              className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-2.5 text-sm font-medium text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2 block">Kanban Default View</label>
            <div className="grid grid-cols-2 gap-3">
              {(['status', 'project'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => updateSettings({ kanbanDefaultView: v })}
                  className={cn(
                    'py-2.5 rounded-xl border-2 text-sm font-bold capitalize transition-all',
                    settings.kanbanDefaultView === v
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline/20 text-on-surface-variant hover:border-outline/50'
                  )}
                >
                  By {v === 'status' ? 'Status' : 'Project'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSave} className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl text-sm shadow-lg shadow-primary/20 hover:bg-primary-dim transition-all">
            {saved ? '✓ Saved' : 'Save Workspace'}
          </button>
        </div>
      </div>

      <div>
        <SectionTitle>Data Export</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="flex items-center justify-center gap-2 py-3 bg-surface-container border border-outline/20 rounded-xl text-sm font-bold text-on-surface hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50"
          >
            <Download size={16} /> {exporting ? 'Exporting…' : 'Export JSON'}
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center justify-center gap-2 py-3 bg-surface-container border border-outline/20 rounded-xl text-sm font-bold text-on-surface hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50"
          >
            <Database size={16} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
        <p className="text-[10px] text-on-surface-variant opacity-50 mt-2">JSON exports all data. CSV exports tasks only.</p>
      </div>
    </div>
  );
}

// ─── Team & Admin ─────────────────────────────────────────────────────────────

function TeamAdminSection({ hasServiceKey = false }: { hasServiceKey?: boolean }) {
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Invite Form
  const [showInvite, setShowInvite] = React.useState(false);
  const [invEmail, setInvEmail] = React.useState('');
  const [invName, setInvName] = React.useState('');
  const [invRole, setInvRole] = React.useState<Role>('member');
  const [inviting, setInviting] = React.useState(false);
  const [invMsg, setInvMsg] = React.useState('');

  React.useEffect(() => {
    getProfiles().then(data => { setProfiles(data); setLoading(false); });
  }, []);

  const handleInvite = async () => {
    if (!invEmail || !invName) return;
    setInviting(true); setInvMsg('');
    try {
      const res = await inviteUser(invEmail, invName, invRole);
      if (res.success) {
        setInvMsg('User invited successfully!');
        setInvEmail(''); setInvName(''); setShowInvite(false);
        getProfiles().then(setProfiles);
      } else {
        setInvMsg(res.error || 'Failed to invite user.');
      }
    } catch (err: any) {
      setInvMsg(err.message);
    }
    setInviting(false);
  };

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  const handleRenameMember = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    try {
      await updateUserName(id, trimmed);
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, full_name: trimmed } : p));
      setEditingId(null);
    } catch {
      alert('Failed to rename user — check SUPABASE_SERVICE_ROLE_KEY');
    }
  };

  const handleChangeRole = async (id: string, currentRole: Role) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    if (!confirm(`Change role to ${newRole}?`)) return;
    try {
      await updateUserRole(id, newRole);
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, role: newRole } : p));
    } catch {
      alert('Must configure SUPABASE_SERVICE_ROLE_KEY to change roles');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Permanently remove this user? This revokes auth.')) return;
    try {
      await removeUser(id);
      setProfiles(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('Must configure SUPABASE_SERVICE_ROLE_KEY to remove users');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {!hasServiceKey && (
        <div className="flex justify-between items-center bg-error/10 p-4 rounded-2xl border border-error/20">
          <div className="flex items-center gap-3">
             <ShieldAlert size={20} className="text-error shrink-0" />
             <p className="text-sm font-semibold text-error">Team Management requires the Supabase Service Role Key <br/><span className="font-normal opacity-70">Add SUPABASE_SERVICE_ROLE_KEY to your .env.local to use these functions.</span></p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <SectionTitle>Team Members</SectionTitle>
        <button onClick={() => setShowInvite(!showInvite)} className="px-3 py-1.5 bg-surface-container rounded-lg text-xs font-bold font-on-surface hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1.5">
          <Plus size={14} /> Invite Member
        </button>
      </div>

      {showInvite && (
        <div className="bg-surface-container-high border border-outline/10 p-5 rounded-2xl mb-8 space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <input placeholder="Full Name" value={invName} onChange={e => setInvName(e.target.value)} className="bg-surface-container px-3 py-2 text-sm rounded-lg border border-outline/20 flex-1 outline-none focus:border-primary/50" />
             <input placeholder="Email Address" type="email" value={invEmail} onChange={e => setInvEmail(e.target.value)} className="bg-surface-container px-3 py-2 text-sm rounded-lg border border-outline/20 flex-1 outline-none focus:border-primary/50" />
           </div>
           <div className="flex justify-between items-center">
             <div className="flex gap-2">
               <button onClick={() => setInvRole('member')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all", invRole === 'member' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant')}>Member</button>
               <button onClick={() => setInvRole('admin')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all", invRole === 'admin' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant')}>Admin</button>
             </div>
             <button onClick={handleInvite} disabled={inviting || !invEmail} className="px-5 py-2 bg-primary text-on-primary font-bold rounded-lg text-sm transition-all disabled:opacity-50">
               {inviting ? 'Inviting...' : 'Send Invite'}
             </button>
           </div>
           {invMsg && <p className="text-xs text-error font-bold mt-2">{invMsg}</p>}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant animate-pulse">Loading profiles...</p>
      ) : (
        <div className="space-y-3">
          {profiles.map(p => (
            <div key={p.id} className="flex justify-between items-center p-4 bg-surface-container rounded-2xl border border-outline/10 group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : p.full_name?.charAt(0) || <User size={16} />}
                </div>
                <div>
                  {editingId === p.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameMember(p.id); if (e.key === 'Escape') setEditingId(null); }}
                        className="bg-surface-container-highest border border-primary/40 rounded-lg px-2 py-1 text-sm text-on-surface outline-none w-36"
                      />
                      <button onClick={() => handleRenameMember(p.id)} className="p-1 text-primary hover:text-primary-dim"><CheckCircle2 size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-on-surface-variant hover:text-error"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-on-surface">{p.full_name || 'Unnamed User'}</p>
                      <button
                        onClick={() => { setEditingId(p.id); setEditingName(p.full_name || ''); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-on-surface-variant hover:text-primary"
                        title="Rename"
                      >
                        <Star size={11} />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-on-surface-variant">{p.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => handleChangeRole(p.id, p.role)} className={cn("px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider", p.role === 'admin' ? 'bg-error/10 text-error hover:bg-error/20' : 'bg-surface-container-highest text-on-surface-variant hover:bg-primary/20 hover:text-primary')}>
                  {p.role}
                </button>
                <button onClick={() => handleRemove(p.id)} className="text-on-surface-variant hover:text-error opacity-50 hover:opacity-100 transition-all p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Account ──────────────────────────────────────────────────────────────────

function AccountSection({ userEmail, onClose }: { userEmail?: string; onClose: () => void }) {
  const router = useRouter();
  const [clearing, setClearing] = React.useState(false);
  const [confirmClear, setConfirmClear] = React.useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push('/login');
    router.refresh();
  };

  const handleClearLocalData = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    localStorage.clear();
    setClearing(true);
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Connected Account</SectionTitle>
        <div className="flex items-center gap-4 p-4 bg-surface-container rounded-2xl border border-outline/10">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-on-surface">Google OAuth</p>
            <p className="text-xs text-on-surface-variant truncate">{userEmail || 'Not signed in'}</p>
          </div>
          <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 uppercase tracking-wider">Active</span>
        </div>
      </div>

      <div>
        <SectionTitle>Session</SectionTitle>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-between p-4 bg-surface-container rounded-2xl border border-outline/10 hover:border-error/30 hover:bg-error/5 transition-all group"
        >
          <div className="flex items-center gap-3">
            <LogOut size={18} className="text-on-surface-variant group-hover:text-error transition-colors" />
            <span className="text-sm font-bold text-on-surface group-hover:text-error transition-colors">Sign Out</span>
          </div>
          <ChevronRight size={16} className="text-on-surface-variant/40" />
        </button>
      </div>

      <div>
        <SectionTitle>Danger Zone</SectionTitle>
        <div className="space-y-3">
          <div className="p-4 bg-error/5 border border-error/20 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-error shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-error">Clear Local Settings</p>
                <p className="text-xs text-on-surface-variant mt-1">Resets theme, profile, and preferences stored in this browser. Your cloud data is not affected.</p>
              </div>
            </div>
            <button
              onClick={handleClearLocalData}
              disabled={clearing}
              className={cn(
                'w-full py-2.5 rounded-xl text-sm font-bold transition-all border',
                confirmClear
                  ? 'bg-error text-white border-error hover:bg-error/80'
                  : 'bg-transparent text-error border-error/30 hover:bg-error/10'
              )}
            >
              {clearing ? 'Clearing…' : confirmClear ? 'Click again to confirm' : 'Clear Local Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function SettingsPanel({ onClose, userEmail, userName, isAdmin = false, hasServiceKey = false }: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [activeSection, setActiveSection] = React.useState<Section>('appearance');
  const visibleSections = SECTIONS.filter(s => s.id !== 'team' || isAdmin);

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-surface-container-low border border-outline/20 rounded-3xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 720, maxHeight: '88vh', boxShadow: '0 0 0 1px rgba(33,178,37,0.08), 0 32px 64px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline/10 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-on-surface font-headline">Settings</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Preferences are saved automatically to this browser</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-xl transition-colors text-on-surface-variant">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          <SectionNav active={activeSection} onChange={setActiveSection} sections={visibleSections} />

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {activeSection === 'appearance'    && <AppearanceSection settings={settings} updateSettings={updateSettings} />}
            {activeSection === 'profile'       && <ProfileSection settings={settings} updateSettings={updateSettings} initialName={userName} />}
            {activeSection === 'notifications' && <NotificationsSection settings={settings} updateSettings={updateSettings} />}
            {activeSection === 'workspace'     && <WorkspaceSection settings={settings} updateSettings={updateSettings} />}
            {activeSection === 'team'          && <TeamAdminSection hasServiceKey={hasServiceKey} />}
            {activeSection === 'account'       && <AccountSection userEmail={userEmail} onClose={onClose} />}
          </div>
        </div>
      </div>
    </div>
  );
}
