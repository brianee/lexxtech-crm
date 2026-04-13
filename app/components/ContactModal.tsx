'use client';

import React from 'react';
import {
  X, Mail, Phone, MapPin, Home, Linkedin, FileText,
  ChevronRight, Phone as PhoneIcon, AtSign, Handshake,
  StickyNote, Zap, Folder, CheckCircle2, Plus,
  Trash2, Calendar, AlertCircle, Clock, CreditCard, Receipt, TrendingUp, Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  Contact, ContactInteraction, Task, Project, BillingTransaction,
  RelationshipStatus, InteractionType, Priority, Status,
} from '@/lib/types';
import {
  updateContact,
  deleteContact,
  createContactInteraction,
  deleteContactInteraction,
  getContactInteractions,
} from '@/lib/actions/contacts';
import { createTask } from '@/lib/actions/tasks';
import { createBillingTransaction, updateBillingTransaction, deleteBillingTransaction } from '@/lib/actions/billing';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INTERACTION_CONFIG: Record<InteractionType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  call:    { label: 'Call',    color: 'text-primary',   bg: 'bg-primary/10',   icon: PhoneIcon },
  email:   { label: 'Email',   color: 'text-secondary', bg: 'bg-secondary/10', icon: AtSign },
  meeting: { label: 'Meeting', color: 'text-tertiary',  bg: 'bg-tertiary/10',  icon: Handshake },
  note:    { label: 'Note',    color: 'text-on-surface-variant', bg: 'bg-surface-container-highest', icon: StickyNote },
  system:  { label: 'System',  color: 'text-on-surface-variant', bg: 'bg-surface-container-high', icon: Zap },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: 'text-error',              bg: 'bg-error/10' },
  high:     { label: 'High',     color: 'text-tertiary',           bg: 'bg-tertiary/10' },
  medium:   { label: 'Medium',   color: 'text-primary',            bg: 'bg-primary/10' },
  low:      { label: 'Low',      color: 'text-on-surface-variant', bg: 'bg-surface-container-highest' },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  'pending':     { label: 'Pending',     color: 'text-tertiary' },
  'in-progress': { label: 'In Progress', color: 'text-primary' },
  'blocked':     { label: 'Blocked',     color: 'text-tertiary' },
  'dispatched':  { label: 'Dispatched',  color: 'text-[#34d399]' },
  'completed':   { label: 'Completed',   color: 'text-on-surface-variant' },
  'overdue':     { label: 'Overdue',     color: 'text-error' },
};

function formatDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' • ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return formatDate(iso) ?? '';
}

// ─── Editable Field ───────────────────────────────────────────────────────────

function EditableField({
  label, value, onChange, placeholder, icon: Icon, multiline = false, type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
  multiline?: boolean;
  type?: string;
}) {
  const base = cn(
    'w-full bg-surface-container border border-outline/20 rounded-xl px-4 text-sm font-medium',
    'text-on-surface outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40',
    'transition-all placeholder-on-surface-variant/40',
    Icon ? 'pl-10' : '',
    multiline ? 'py-3 min-h-[80px] resize-none' : 'py-3 h-11',
  );

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-70">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none" />
        )}
        {multiline ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={base}
            style={{ top: 'auto', transform: 'none' }}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={base}
          />
        )}
      </div>
    </div>
  );
}

// ─── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab({
  form, setForm,
}: {
  form: Partial<Contact>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Contact>>>;
}) {
  const set = (key: keyof Contact) => (v: string) => setForm(f => ({ ...f, [key]: v }));

  return (
    <div className="space-y-5 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: 'calc(70vh - 220px)' }}>
      {/* 2-col row */}
      <div className="grid grid-cols-2 gap-4">
        <EditableField label="Full Name" value={form.name ?? ''} onChange={set('name')} placeholder="Jane Smith" />
        <EditableField label="Role / Title" value={form.role ?? ''} onChange={set('role')} placeholder="CEO" />
        <EditableField label="Company" value={form.company ?? ''} onChange={set('company')} placeholder="Acme Corp" />
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-70">Relationship Status</label>
          <select
            value={form.status ?? 'warm'}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as RelationshipStatus }))}
            className="w-full h-11 bg-surface-container border border-outline/20 rounded-xl px-4 text-sm font-medium text-on-surface outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
          >
            <option value="warm">🟢 Warm</option>
            <option value="cold">🔵 Cold</option>
            <option value="dormant">⚫ Dormant</option>
          </select>
        </div>
        <EditableField label="Email" value={form.email ?? ''} onChange={set('email')} placeholder="jane@example.com" icon={Mail} type="email" />
        <EditableField label="Phone" value={form.phone ?? ''} onChange={set('phone')} placeholder="+1 212 555 0192" icon={Phone} type="tel" />
        <EditableField label="Location" value={form.location ?? ''} onChange={set('location')} placeholder="New York, USA" icon={MapPin} />
        <EditableField label="LinkedIn" value={form.linkedin ?? ''} onChange={set('linkedin')} placeholder="linkedin.com/in/name" icon={Linkedin} />
      </div>
      <EditableField label="Address" value={form.address ?? ''} onChange={set('address')} placeholder="340 Park Ave, Suite 12, NY 10022" icon={Home} />
      <EditableField label="Next Step" value={form.next_step ?? ''} onChange={set('next_step')} placeholder="e.g. Send revised proposal" icon={ChevronRight} />
      <EditableField label="Notes" value={form.notes ?? ''} onChange={set('notes')} placeholder="Context, meeting notes, anything relevant..." icon={FileText} multiline />
    </div>
  );
}

// ─── Tab: Activity ────────────────────────────────────────────────────────────

function ActivityTab({
  contact, interactions, onInteractionAdded, onInteractionDeleted,
}: {
  contact: Contact;
  interactions: ContactInteraction[];
  onInteractionAdded: (i: ContactInteraction) => void;
  onInteractionDeleted: (id: string) => void;
}) {
  const [showForm, setShowForm] = React.useState(false);
  const [type, setType] = React.useState<InteractionType>('meeting');
  const [note, setNote] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleLog = async () => {
    setSaving(true);
    try {
      const newInteraction = await createContactInteraction(contact.id, type, note);
      onInteractionAdded(newInteraction);
      setNote('');
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    onInteractionDeleted(id);
    try { await deleteContactInteraction(id); } catch { /* revert handled by parent */ }
  };

  return (
    <div className="flex flex-col gap-5" style={{ maxHeight: 'calc(70vh - 220px)', overflow: 'hidden' }}>
      {/* Stats row */}
      <div className="flex gap-4 shrink-0">
        <div className="flex-1 bg-surface-container-low rounded-2xl p-5 border border-outline/10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Zap size={18} />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-on-surface">{interactions.length}</p>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">Total Interactions</p>
          </div>
        </div>
        <div className="flex-1 bg-surface-container-low rounded-2xl p-5 border border-outline/10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">
              {contact.last_interaction ? timeAgo(contact.last_interaction) : 'Never'}
            </p>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">Last Seen</p>
          </div>
        </div>
      </div>

      {/* Log interaction form */}
      {showForm ? (
        <div className="bg-surface-container-low border border-primary/20 rounded-2xl p-5 space-y-4 shrink-0">
          <p className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest">Log Interaction</p>
          {/* Type selector */}
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(INTERACTION_CONFIG) as InteractionType[])
              .filter(t => t !== 'system')
              .map(t => {
              const cfg = INTERACTION_CONFIG[t];
              const IconC = cfg.icon;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 rounded-xl border text-[10px] font-extrabold uppercase tracking-widest transition-all',
                    type === t
                      ? `${cfg.bg} ${cfg.color} border-current/30`
                      : 'bg-surface-container border-outline/10 text-on-surface-variant hover:border-outline/30'
                  )}
                >
                  <IconC size={16} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="What happened? (optional)"
            className="w-full bg-surface-container border border-outline/20 rounded-xl p-4 text-sm font-medium text-on-surface outline-none focus:ring-1 focus:ring-primary/40 resize-none min-h-[80px] placeholder-on-surface-variant/40 custom-scrollbar"
          />
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-surface-container border border-outline/20 text-on-surface-variant font-bold rounded-xl text-sm hover:bg-surface-container-high transition-colors">
              Cancel
            </button>
            <button onClick={handleLog} disabled={saving} className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-sm shadow-lg shadow-primary/20 hover:bg-primary-dim transition-all disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border-outline/20 rounded-2xl text-sm font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={16} />
          Log Interaction
        </button>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0 relative pl-5">
        {interactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Zap size={32} className="text-on-surface-variant opacity-20" />
            <p className="text-sm font-medium text-on-surface-variant opacity-50 text-center">
              No interactions yet.<br />Log your first one above.
            </p>
          </div>
        ) : (
          <>
            {/* Vertical line */}
            <div className="absolute left-[9px] top-0 bottom-0 w-px bg-outline/20" />
            {interactions.map((interaction, i) => {
              const cfg = INTERACTION_CONFIG[interaction.type];
              const IconC = cfg.icon;
              return (
                <div key={interaction.id} className={cn('relative flex gap-4 group pb-5', i === interactions.length - 1 ? 'pb-0' : '')}>
                  {/* Dot */}
                  <div className={cn('absolute -left-5 mt-0.5 w-4 h-4 rounded-full border-2 border-surface-container-low flex items-center justify-center shrink-0 z-10', cfg.bg)}>
                    <div className={cn('w-1.5 h-1.5 rounded-full', cfg.color.replace('text-', 'bg-'))} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 bg-surface-container-low rounded-2xl p-4 border border-outline/10 group-hover:border-outline/20 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn('flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md border', cfg.bg, cfg.color, 'border-current/20')}>
                          <IconC size={11} />
                          {cfg.label}
                        </span>
                        <span className="text-[10px] font-bold text-on-surface-variant opacity-50">
                          {formatDateTime(interaction.interacted_at)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(interaction.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {interaction.note && (
                      <p className="text-[13px] font-medium text-on-surface leading-relaxed">
                        {interaction.note}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Tasks ───────────────────────────────────────────────────────────────

function TasksTab({
  contact, tasks, onTaskAdded,
}: {
  contact: Contact;
  tasks: Task[];
  onTaskAdded: (t: Task) => void;
}) {
  const [showAdd, setShowAdd] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState<Priority>('medium');
  const [dueDate, setDueDate] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const contactTasks = tasks.filter(t => t.contact_id === contact.id);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const task = await createTask({
        title: title.trim(),
        contact_id: contact.id,
        priority,
        status: 'pending',
        due_date: dueDate || null,
      });
      onTaskAdded(task);
      setTitle('');
      setDueDate('');
      setPriority('medium');
      setShowAdd(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4" style={{ maxHeight: 'calc(70vh - 220px)', overflow: 'hidden' }}>
      {/* Task list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
        {contactTasks.length === 0 && !showAdd ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckCircle2 size={32} className="text-on-surface-variant opacity-20" />
            <p className="text-sm font-medium text-on-surface-variant opacity-50 text-center">
              No tasks linked yet.<br />Add one below.
            </p>
          </div>
        ) : (
          contactTasks.map(task => {
            const p = PRIORITY_CONFIG[task.priority];
            const s = STATUS_CONFIG[task.status];
            return (
              <div key={task.id} className="flex items-center gap-3 p-4 bg-surface-container-low rounded-2xl border border-outline/10 hover:border-outline/20 transition-colors group">
                <div className="w-5 h-5 rounded-full border-2 border-outline/30 flex items-center justify-center shrink-0 group-hover:border-primary/40 transition-colors">
                  {task.status === 'completed' && <CheckCircle2 size={12} className="text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[13px] font-bold text-on-surface truncate', task.status === 'completed' && 'line-through opacity-50')}>
                    {task.title}
                  </p>
                  {task.due_date && (
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(task.due_date)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded', p.bg, p.color)}>
                    {p.label}
                  </span>
                  <span className={cn('text-[10px] font-bold', s.color)}>{s.label}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add task form */}
      {showAdd ? (
        <div className="bg-surface-container-low border border-primary/20 rounded-2xl p-4 space-y-3 shrink-0">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Task description..."
            className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-2.5 text-sm font-medium text-on-surface outline-none focus:ring-1 focus:ring-primary/40 placeholder-on-surface-variant/40"
          />
          <div className="flex gap-2">
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
              className="flex-1 bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-[11px] font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="flex-1 bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-[11px] font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-surface-container border border-outline/20 text-on-surface-variant font-bold rounded-xl text-xs hover:bg-surface-container-high transition-colors">
              Cancel
            </button>
            <button onClick={handleAdd} disabled={saving || !title.trim()} className="flex-1 py-2 bg-primary text-on-primary font-bold rounded-xl text-xs shadow-lg shadow-primary/20 hover:bg-primary-dim transition-all disabled:opacity-50">
              {saving ? '...' : 'Add Task'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-3 border-2 border-dashed border-outline/20 rounded-2xl text-sm font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={16} />
          Add Task
        </button>
      )}
    </div>
  );
}

// ─── Tab: Projects ────────────────────────────────────────────────────────────

function ProjectsTab({ contact, tasks, projects }: { contact: Contact; tasks: Task[]; projects: Project[] }) {
  // Surface projects linked to this contact via their tasks
  const linkedProjectIds = new Set(
    tasks.filter(t => t.contact_id === contact.id && t.project_id).map(t => t.project_id!)
  );
  const linkedProjects = projects.filter(p => linkedProjectIds.has(p.id));

  return (
    <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(70vh - 220px)' }}>
      {linkedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Folder size={32} className="text-on-surface-variant opacity-20" />
          <p className="text-sm font-medium text-on-surface-variant opacity-50 text-center">
            No projects linked yet.<br />Link a task to a project to see it here.
          </p>
        </div>
      ) : (
        linkedProjects.map(project => (
          <div key={project.id} className="p-5 bg-surface-container-low rounded-2xl border border-outline/10 hover:border-outline/20 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {project.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/10 uppercase tracking-widest">
                      {tag}
                    </span>
                  ))}
                </div>
                <h4 className="text-[15px] font-bold text-on-surface">{project.name}</h4>
              </div>
              <span className={cn(
                'text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded',
                project.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-surface-container-highest text-on-surface-variant'
              )}>
                {project.status}
              </span>
            </div>
            {project.description && (
              <p className="text-xs text-on-surface-variant font-medium mb-3 leading-relaxed">{project.description}</p>
            )}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1.5 tracking-wider">
                <span>PROGRESS</span>
                <span className="text-primary">{project.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(33,178,37,0.3)]"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Tab: Billing ─────────────────────────────────────────────────────────────

function BillingTab({ contact, projects: initialProjects }: { contact: Contact; projects: Project[] }) {
  const [projects, setProjects] = React.useState(initialProjects);
  const [addingForProject, setAddingForProject] = React.useState<string | null>(null);
  const [bLines, setBLines] = React.useState([{ desc: '', amount: '' }]);
  const [bStatus, setBStatus] = React.useState<'pending' | 'paid' | 'overdue'>('pending');
  const [bDate, setBDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [editingTxId, setEditingTxId] = React.useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<{ lines: { desc: string; amount: string }[]; status: 'pending' | 'paid' | 'overdue'; date: string }>({
    lines: [], status: 'pending', date: '',
  });

  const linkedProjects = projects.filter(p => p.contact_id === contact.id);

  const allTx = linkedProjects.flatMap(p =>
    (p.transactions ?? []).map(t => ({ ...t, projectName: p.name, projectId: p.id }))
  ).sort((a, b) => b.date.localeCompare(a.date));

  const totalBilled  = allTx.reduce((s, t) => s + Number(t.amount), 0);
  const totalPaid    = allTx.filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0);
  const totalPending = allTx.filter(t => t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0);
  const totalOverdue = allTx.filter(t => t.status === 'overdue').reduce((s, t) => s + Number(t.amount), 0);

  const patchProjectTx = (projectId: string, updater: (txs: BillingTransaction[]) => BillingTransaction[]) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, transactions: updater(p.transactions ?? []) } : p
    ));
  };

  const handleAdd = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    const validLines = bLines.filter(l => l.desc.trim() && parseFloat(l.amount) > 0);
    if (validLines.length === 0) return;
    const description = validLines.length === 1
      ? validLines[0].desc.trim()
      : JSON.stringify(validLines.map(l => ({ desc: l.desc.trim(), amount: parseFloat(l.amount) })));
    const totalAmount = validLines.reduce((s, l) => s + parseFloat(l.amount), 0);
    try {
      const newTx = await createBillingTransaction({ project_id: projectId, description, amount: totalAmount, status: bStatus, date: bDate });
      patchProjectTx(projectId, txs => [newTx, ...txs]);
      setAddingForProject(null);
      setBLines([{ desc: '', amount: '' }]);
      setBStatus('pending');
      setBDate(new Date().toISOString().split('T')[0]);
    } catch { alert('Failed to add transaction'); }
  };

  const handleToggleStatus = async (tx: BillingTransaction & { projectId: string }) => {
    const cycle: Record<string, 'pending' | 'paid' | 'overdue'> = { pending: 'paid', paid: 'overdue', overdue: 'pending' };
    const newStatus = cycle[tx.status];
    try {
      await updateBillingTransaction(tx.id, { status: newStatus });
      patchProjectTx(tx.projectId, txs => txs.map(t => t.id === tx.id ? { ...t, status: newStatus } : t));
    } catch { alert('Failed to update status'); }
  };

  const handleDelete = async (tx: BillingTransaction & { projectId: string }) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await deleteBillingTransaction(tx.id);
      patchProjectTx(tx.projectId, txs => txs.filter(t => t.id !== tx.id));
    } catch { alert('Failed to delete'); }
  };

  const startEdit = (tx: BillingTransaction & { projectId: string }) => {
    let lines: { desc: string; amount: string }[];
    try {
      const parsed = JSON.parse(tx.description) as { desc: string; amount: number }[];
      lines = parsed.map(l => ({ desc: l.desc, amount: l.amount.toString() }));
    } catch { lines = [{ desc: tx.description, amount: tx.amount.toString() }]; }
    setEditingTxId(tx.id);
    setEditingProjectId(tx.projectId);
    setEditForm({ lines, status: tx.status, date: tx.date });
  };

  const handleSaveEdit = async () => {
    if (!editingTxId || !editingProjectId) return;
    const validLines = editForm.lines.filter(l => l.desc.trim());
    if (validLines.length === 0) return;
    const description = validLines.length === 1
      ? validLines[0].desc.trim()
      : JSON.stringify(validLines.map(l => ({ desc: l.desc.trim(), amount: parseFloat(l.amount) || 0 })));
    const amount = validLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const updates = { description, amount, status: editForm.status, date: editForm.date };
    try {
      await updateBillingTransaction(editingTxId, updates);
      patchProjectTx(editingProjectId, txs => txs.map(t => t.id === editingTxId ? { ...t, ...updates } : t));
      setEditingTxId(null);
    } catch { alert('Failed to save changes'); }
  };

  const handleDownloadReceipt = (tx: BillingTransaction & { projectName: string }) => {
    const receiptDate = new Date(tx.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const receiptNumber = `RCP-${tx.id.slice(0, 8).toUpperCase()}`;
    let lineItems: { desc: string; amount: number }[];
    try { lineItems = JSON.parse(tx.description); } catch { lineItems = [{ desc: tx.description, amount: Number(tx.amount) }]; }

    const lineItemsHtml = lineItems.map((l, i) => `
      <tr>
        <td>${l.desc}</td>
        ${i === 0 ? `<td rowspan="${lineItems.length}">${receiptDate}</td><td rowspan="${lineItems.length}"><span class="status-badge">${tx.status}</span></td>` : ''}
        <td>&#x20B1;${l.amount.toFixed(2)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt &#x2013; ${tx.projectName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #111; padding: 60px 80px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 2px solid #111; }
    .brand { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
    .brand span { color: #22b225; }
    .receipt-label { font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #666; margin-top: 4px; }
    .meta { text-align: right; }
    .meta .receipt-num { font-size: 22px; font-weight: 900; }
    .meta .receipt-date { font-size: 13px; color: #555; margin-top: 4px; }
    .section { margin-bottom: 36px; }
    .section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #888; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .info-item p { font-size: 13px; color: #555; margin-bottom: 2px; font-weight: 600; }
    .info-item strong { font-size: 15px; color: #111; font-weight: 700; }
    .line-items { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    .line-items thead tr { border-bottom: 2px solid #111; }
    .line-items th { text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #888; padding: 8px 0 12px; }
    .line-items th:last-child, .line-items td:last-child { text-align: right; }
    .line-items td { padding: 16px 0; font-size: 14px; border-bottom: 1px solid #eee; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-top: 2px solid #111; margin-top: 4px; }
    .total-row .label { font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
    .total-row .amount { font-size: 28px; font-weight: 900; color: #22b225; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; background: #dcfce7; color: #16a34a; }
    .footer { margin-top: 56px; padding-top: 24px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 12px; color: #999; }
    @media print { body { padding: 40px 60px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Lexx<span>Tech</span></div>
      <div class="receipt-label">Official Receipt</div>
    </div>
    <div class="meta">
      <div class="receipt-num">${receiptNumber}</div>
      <div class="receipt-date">${receiptDate}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-label">Billed To</div>
    <div class="info-grid">
      <div class="info-item"><p>Client Name</p><strong>${contact.name}</strong></div>
      <div class="info-item"><p>Company</p><strong>${contact.company || 'N/A'}</strong></div>
      <div class="info-item"><p>Email</p><strong>${contact.email || 'N/A'}</strong></div>
      <div class="info-item"><p>Phone</p><strong>${contact.phone || 'N/A'}</strong></div>
    </div>
  </div>
  <div class="section">
    <div class="section-label">Project</div>
    <div class="info-grid">
      <div class="info-item"><p>Project Name</p><strong style="font-size:16px">${tx.projectName}</strong></div>
    </div>
  </div>
  <div class="section">
    <div class="section-label">Transaction Details</div>
    <table class="line-items">
      <thead><tr><th>Description</th><th>Date</th><th>Status</th><th>Amount</th></tr></thead>
      <tbody>${lineItemsHtml}</tbody>
    </table>
    <div class="total-row">
      <span class="label">Total Due</span>
      <span class="amount">&#x20B1;${Number(tx.amount).toFixed(2)}</span>
    </div>
  </div>
  <div class="footer">
    <span>Thank you for your business!</span>
    <span>Generated by LexxTech CRM &nbsp;&middot;&nbsp; ${new Date().toLocaleDateString()}</span>
  </div>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };

  return (
    <div className="flex flex-col gap-4" style={{ maxHeight: 'calc(70vh - 220px)', overflow: 'hidden' }}>
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        <div className="bg-surface-container-low rounded-2xl p-4 border border-outline/10">
          <div className="flex items-center gap-2 text-on-surface-variant mb-1">
            <Receipt size={13} className="opacity-60" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest opacity-60">Total Billed</span>
          </div>
          <p className="text-xl font-black text-on-surface">₱{totalBilled.toFixed(2)}</p>
        </div>
        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/15">
          <div className="flex items-center gap-2 text-primary mb-1">
            <CheckCircle2 size={13} />
            <span className="text-[9px] font-extrabold uppercase tracking-widest">Paid</span>
          </div>
          <p className="text-xl font-black text-on-surface">₱{totalPaid.toFixed(2)}</p>
        </div>
        <div className={cn('rounded-2xl p-4 border', totalOverdue > 0 ? 'bg-error/5 border-error/20' : 'bg-surface-container-low border-outline/10')}>
          <div className={cn('flex items-center gap-2 mb-1', totalOverdue > 0 ? 'text-error' : 'text-on-surface-variant')}>
            <AlertCircle size={13} />
            <span className="text-[9px] font-extrabold uppercase tracking-widest">Outstanding</span>
          </div>
          <p className={cn('text-xl font-black', totalOverdue > 0 ? 'text-error' : 'text-on-surface')}>₱{(totalPending + totalOverdue).toFixed(2)}</p>
        </div>
      </div>

      {totalBilled > 0 && (
        <div className="shrink-0">
          <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1.5 tracking-wider">
            <span>PAYMENT PROGRESS</span>
            <span className="text-primary">{Math.round((totalPaid / totalBilled) * 100)}% collected</span>
          </div>
          <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden flex">
            <div className="h-full bg-primary" style={{ width: `${(totalPaid / totalBilled) * 100}%` }} />
            <div className="h-full bg-tertiary/50" style={{ width: `${(totalPending / totalBilled) * 100}%` }} />
            <div className="h-full bg-error/60" style={{ width: `${(totalOverdue / totalBilled) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Per-project sections */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
        {linkedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CreditCard size={32} className="text-on-surface-variant opacity-20" />
            <p className="text-sm font-medium text-on-surface-variant opacity-50 text-center">
              No projects linked to this contact yet.
            </p>
          </div>
        ) : (
          linkedProjects.map(project => {
            const txs = (project.transactions ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));
            const isAdding = addingForProject === project.id;
            return (
              <div key={project.id} className="bg-surface-container rounded-2xl border border-outline/10 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-outline/10 bg-surface-container-lowest">
                  <div>
                    <p className="text-[13px] font-extrabold text-on-surface">{project.name}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant opacity-50 capitalize">{project.status}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (isAdding) { setAddingForProject(null); return; }
                      setAddingForProject(project.id);
                      setBLines([{ desc: '', amount: '' }]);
                      setBStatus('pending');
                      setBDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="text-primary text-[11px] font-bold uppercase tracking-widest hover:underline"
                  >
                    {isAdding ? 'Cancel' : '+ Add Record'}
                  </button>
                </div>

                {isAdding && (
                  <form onSubmit={e => handleAdd(e, project.id)} className="p-4 border-b border-outline/10 space-y-3 bg-surface-container-low">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Line Items</label>
                    {bLines.map((line, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input required value={line.desc}
                          onChange={e => setBLines(ls => ls.map((l, i) => i === idx ? { ...l, desc: e.target.value } : l))}
                          className="flex-1 bg-surface-container border border-outline/10 rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
                          placeholder={`Description ${idx + 1}`} />
                        <input required type="number" step="0.01" min="0" value={line.amount}
                          onChange={e => setBLines(ls => ls.map((l, i) => i === idx ? { ...l, amount: e.target.value } : l))}
                          className="w-28 bg-surface-container border border-outline/10 rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
                          placeholder="0.00" />
                        {bLines.length > 1 && (
                          <button type="button" onClick={() => setBLines(ls => ls.filter((_, i) => i !== idx))} className="p-1.5 text-on-surface-variant hover:text-error transition-colors"><X size={13} /></button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => setBLines(ls => [...ls, { desc: '', amount: '' }])} className="text-primary text-xs font-bold hover:underline">+ Add Line</button>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Status</label>
                        <select value={bStatus} onChange={e => setBStatus(e.target.value as any)} className="w-full bg-surface-container border border-outline/10 rounded-lg px-3 py-2 text-sm text-on-surface outline-none cursor-pointer">
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Date</label>
                        <input required type="date" value={bDate} onChange={e => setBDate(e.target.value)} className="w-full bg-surface-container border border-outline/10 rounded-lg px-3 py-2 text-sm text-on-surface outline-none [color-scheme:dark]" />
                      </div>
                      <div className="shrink-0 pt-5">
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Total</p>
                        <p className="font-black text-on-surface">₱{bLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" className="px-5 py-2 bg-primary text-on-primary font-bold text-xs rounded-lg uppercase tracking-wide hover:bg-primary-dim transition-all">Save Transaction</button>
                    </div>
                  </form>
                )}

                <div className="divide-y divide-outline/5">
                  {txs.length === 0 ? (
                    <p className="text-center text-[11px] text-on-surface-variant opacity-40 py-5 font-medium">No transactions yet</p>
                  ) : (
                    txs.map(tx => {
                      const txM = { ...tx, projectId: project.id, projectName: project.name };
                      const icon = tx.status === 'paid' ? <CheckCircle2 size={15} /> : tx.status === 'overdue' ? <AlertCircle size={15} /> : <Circle size={15} />;
                      const sc = tx.status === 'paid' ? 'bg-primary/10 border-primary/20 text-primary' : tx.status === 'overdue' ? 'bg-error/10 border-error/20 text-error' : 'bg-surface-container-high border-outline/10 text-on-surface-variant';
                      let desc: React.ReactNode;
                      try {
                        const items = JSON.parse(tx.description) as { desc: string; amount: number }[];
                        desc = <div className="space-y-0.5">{items.map((l, i) => <p key={i} className="text-sm text-on-surface"><span className="font-bold">{l.desc}</span> <span className="text-on-surface-variant font-medium">₱{l.amount.toFixed(2)}</span></p>)}</div>;
                      } catch { desc = <p className="font-bold text-on-surface text-sm">{tx.description}</p>; }
                      return (
                        <div key={tx.id} className="flex items-center gap-3 px-5 py-4 hover:bg-surface-container-low transition-colors group">
                          <button onClick={() => handleToggleStatus(txM)} title="Click to cycle status" className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-transform hover:scale-110 active:scale-95', sc)}>{icon}</button>
                          <div className="flex-1 min-w-0">
                            {desc}
                            <p className="text-[10px] text-on-surface-variant mt-0.5">{new Date(tx.date).toLocaleDateString()} · <span className="capitalize font-semibold">{tx.status}</span></p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={cn('font-black text-base', tx.status === 'paid' ? 'text-primary' : tx.status === 'overdue' ? 'text-error' : 'text-on-surface')}>₱{Number(tx.amount).toFixed(2)}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {tx.status === 'paid' && (
                                <button onClick={() => handleDownloadReceipt(txM)} title="Download receipt" className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"><Receipt size={13} /></button>
                              )}
                              <button onClick={() => startEdit(txM)} className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors" title="Edit"><FileText size={13} /></button>
                              <button onClick={() => handleDelete(txM)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-colors" title="Delete"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit drawer */}
      {editingTxId && (
        <div className="fixed inset-0 z-[70] flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setEditingTxId(null)} />
          <div className="w-full max-w-sm bg-surface-container-low border-l border-outline/20 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline/10 shrink-0">
              <h3 className="font-extrabold text-on-surface font-headline">Edit Transaction</h3>
              <button onClick={() => setEditingTxId(null)} className="p-2 hover:bg-surface-container rounded-xl transition-colors text-on-surface-variant"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-3">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest block">Line Items</label>
                {editForm.lines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input value={line.desc} onChange={e => setEditForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, desc: e.target.value } : l) }))}
                      className="flex-1 bg-surface-container border border-outline/10 rounded-lg px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40" placeholder={`Item ${idx + 1}`} />
                    <input type="number" step="0.01" min="0" value={line.amount} onChange={e => setEditForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, amount: e.target.value } : l) }))}
                      className="w-28 bg-surface-container border border-outline/10 rounded-lg px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40" placeholder="0.00" />
                    {editForm.lines.length > 1 && (
                      <button type="button" onClick={() => setEditForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))} className="p-1.5 text-on-surface-variant hover:text-error transition-colors"><X size={13} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setEditForm(f => ({ ...f, lines: [...f.lines, { desc: '', amount: '' }] }))} className="text-primary text-xs font-bold hover:underline">+ Add Line</button>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest block mb-2">Status</label>
                <div className="flex gap-2">
                  {(['pending', 'paid', 'overdue'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setEditForm(f => ({ ...f, status: s }))}
                      className={cn('flex-1 py-2 rounded-lg text-xs font-bold capitalize border transition-colors',
                        editForm.status === s
                          ? s === 'paid' ? 'bg-primary text-on-primary border-primary' : s === 'overdue' ? 'bg-error text-white border-error' : 'bg-surface-container-high text-on-surface border-outline/30'
                          : 'bg-transparent text-on-surface-variant border-outline/10 hover:border-outline/30'
                      )}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest block mb-2">Date</label>
                <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-surface-container border border-outline/10 rounded-lg px-3 py-2.5 text-sm text-on-surface outline-none [color-scheme:dark]" />
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total</p>
                <p className="font-black text-on-surface text-lg">₱{editForm.lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="px-6 py-5 border-t border-outline/10 shrink-0">
              <button onClick={handleSaveEdit} className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl text-sm hover:bg-primary-dim transition-all shadow-lg shadow-primary/20">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────


type Tab = 'profile' | 'activity' | 'tasks' | 'projects' | 'billing';

interface ContactModalProps {
  contact: Contact;
  tasks: Task[];
  projects: Project[];
  onClose: () => void;
  onUpdated: (c: Contact) => void;
  onDeleted: (id: string) => void;
  onTaskAdded: (t: Task) => void;
  isAdmin?: boolean;
}

export default function ContactModal({
  contact, tasks, projects, onClose, onUpdated, onDeleted, onTaskAdded, isAdmin = false,
}: ContactModalProps) {
  const [activeTab, setActiveTab] = React.useState<Tab>('profile');
  const [form, setForm] = React.useState<Partial<Contact>>(contact);
  const [interactions, setInteractions] = React.useState<ContactInteraction[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  // Load interactions on mount
  React.useEffect(() => {
    getContactInteractions(contact.id).then(setInteractions);
  }, [contact.id]);

  // Track form changes
  React.useEffect(() => {
    setDirty(JSON.stringify(form) !== JSON.stringify(contact));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateContact(contact.id, form);
      onUpdated(updated);
      setDirty(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${contact.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteContact(contact.id);
      onDeleted(contact.id);
      onClose();
    } catch {
      setDeleting(false);
    }
  };

  const statusDot = contact.status === 'warm' ? 'bg-primary' : contact.status === 'cold' ? 'bg-secondary' : 'bg-on-surface-variant';
  const statusLabel = contact.status === 'warm' ? 'Warm' : contact.status === 'cold' ? 'Cold' : 'Dormant';
  const statusColor = contact.status === 'warm' ? 'text-primary bg-primary/10 border-primary/20' : contact.status === 'cold' ? 'text-secondary bg-secondary/10 border-secondary/20' : 'text-on-surface-variant bg-surface-container-highest border-outline/20';

  const TABS: { id: Tab; label: string }[] = [
    { id: 'profile',   label: 'Profile' },
    { id: 'activity',  label: 'Activity' },
    { id: 'tasks',     label: `Tasks${tasks.filter(t => t.contact_id === contact.id).length > 0 ? ` (${tasks.filter(t => t.contact_id === contact.id).length})` : ''}` },
    { id: 'projects',  label: 'Projects' },
    ...(isAdmin ? [{ id: 'billing' as Tab, label: 'Billing' }] : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-container-low border border-outline/20 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '90vh', boxShadow: '0 0 0 1px rgba(33,178,37,0.08), 0 32px 64px rgba(0,0,0,0.5)' }}
      >
        {/* ── Header ── */}
        <div className="px-8 pt-8 pb-6 border-b border-outline/10 shrink-0">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={contact.avatar || `https://picsum.photos/seed/${encodeURIComponent(contact.name)}/100/100`}
                alt={contact.name}
                className="w-16 h-16 rounded-2xl object-cover ring-4 ring-surface-container-low"
              />
              <div>
                <h2 className="text-2xl font-extrabold text-on-surface font-headline leading-tight">{contact.name}</h2>
                <p className="text-sm text-on-surface-variant font-medium mt-0.5">
                  {[contact.role, contact.company].filter(Boolean).join(' @ ') || 'No details yet'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn('flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border', statusColor)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', statusDot)} />
                    {statusLabel}
                  </span>
                  {contact.location && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant opacity-60">
                      <MapPin size={11} />
                      {contact.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-container rounded-xl transition-colors text-on-surface-variant hover:text-on-surface shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-surface-container-lowest p-1 rounded-xl border border-outline/20">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-[11px] font-extrabold uppercase tracking-widest transition-all',
                  activeTab === tab.id
                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/20'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 px-8 py-6 overflow-hidden">
          {activeTab === 'profile' && (
            <ProfileTab form={form} setForm={(updater) => {
              setForm(updater);
            }} />
          )}
          {activeTab === 'activity' && (
            <ActivityTab
              contact={contact}
              interactions={interactions}
              onInteractionAdded={i => setInteractions(prev => [i, ...prev])}
              onInteractionDeleted={id => setInteractions(prev => prev.filter(x => x.id !== id))}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksTab
              contact={contact}
              tasks={tasks}
              onTaskAdded={t => { onTaskAdded(t); }}
            />
          )}
          {activeTab === 'projects' && (
            <ProjectsTab contact={contact} tasks={tasks} projects={projects} />
          )}
          {activeTab === 'billing' && isAdmin && (
            <BillingTab contact={contact} projects={projects} />
          )}
        </div>

        {/* ── Footer ── */}
        {activeTab === 'profile' && (
          <div className="px-8 pb-8 pt-2 border-t border-outline/10 shrink-0 flex items-center justify-between gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 text-sm font-bold text-error hover:text-error/80 transition-colors disabled:opacity-50 px-3 py-2 rounded-xl hover:bg-error/5"
            >
              <Trash2 size={15} />
              {deleting ? 'Deleting...' : 'Delete Contact'}
            </button>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-6 py-2.5 bg-surface-container border border-outline/20 text-on-surface-variant font-bold rounded-xl text-sm hover:bg-surface-container-high transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-sm shadow-xl shadow-primary/20 hover:bg-primary-dim transition-all disabled:opacity-40 min-w-[120px]"
              >
                {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
