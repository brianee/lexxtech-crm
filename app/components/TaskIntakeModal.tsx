'use client';

import React from 'react';
import {
  X, Hash, Zap, FileText, Radio, Briefcase, User, FolderOpen,
  Calendar, ChevronDown, Loader2, CheckCircle2, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createTask } from '@/lib/actions/tasks';
import { createContact } from '@/lib/actions/contacts';
import type { Task, Project, Contact, Priority, Profile } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCES = ['Email', 'Phone Call', 'Internal', 'Other'] as const;

const JOB_TYPES = [
  'Repair', 'Installation', 'Maintenance', 'Consultation',
  'Design', 'Development', 'Inspection', 'Delivery', 'Other',
] as const;

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low',      label: 'Low',      color: 'text-on-surface-variant' },
  { value: 'medium',   label: 'Medium',   color: 'text-secondary' },
  { value: 'high',     label: 'High',     color: 'text-tertiary' },
  { value: 'critical', label: 'Critical', color: 'text-error' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2">
      <Icon size={11} className="opacity-60" />
      {children}
    </label>
  );
}

function FieldBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-surface-container border border-outline/20 rounded-xl px-4 py-2.5 focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/40 transition-all', className)}>
      {children}
    </div>
  );
}

// Inline searchable select (contacts / projects)
function SearchSelect<T extends { id: string; name?: string }>({
  items,
  value,
  onChange,
  placeholder,
  renderItem,
  renderSelected,
}: {
  items: T[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  renderItem: (item: T) => React.ReactNode;
  renderSelected: (item: T) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = items.find(i => i.id === value);
  const filtered = items.filter(i =>
    (i.name ?? '').toLowerCase().includes(q.toLowerCase())
  );

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setQ(''); }}
        className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all outline-none"
      >
        <span className={selected ? 'text-on-surface' : 'text-on-surface-variant/40'}>
          {selected ? renderSelected(selected) : placeholder}
        </span>
        <ChevronDown size={14} className={cn('text-on-surface-variant transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-surface-container-high border border-outline/20 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-outline/10">
            <Search size={13} className="text-on-surface-variant/50 shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant placeholder:opacity-50"
            />
          </div>
          <div className="max-h-44 overflow-y-auto custom-scrollbar py-1">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              None
            </button>
            {filtered.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onChange(item.id); setOpen(false); }}
                className={cn(
                  'w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-container',
                  item.id === value ? 'text-primary font-bold bg-primary/5' : 'text-on-surface'
                )}
              >
                {renderItem(item)}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-xs text-on-surface-variant opacity-50">No results</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface TaskIntakeModalProps {
  contacts: Contact[];
  projects: Project[];
  profiles?: Profile[];
  onClose: () => void;
  onCreated: (task: Task) => void;
  initialData?: { projectId?: string; contactId?: string };
  isAdmin?: boolean;
}

export default function TaskIntakeModal({ contacts, projects, profiles = [], isAdmin = false, onClose, onCreated, initialData }: TaskIntakeModalProps) {
  // Form state
  const [title, setTitle]           = React.useState('');
  const [message, setMessage]       = React.useState('');
  const [source, setSource]         = React.useState('');
  const [jobType, setJobType]       = React.useState('');
  const [contactId, setContactId]   = React.useState(initialData?.contactId || '');
  const [projectId, setProjectId]   = React.useState(initialData?.projectId || '');
  const [assignedTo, setAssignedTo] = React.useState('');
  const [priority, setPriority]     = React.useState<Priority>('medium');
  const [dueDate, setDueDate]       = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError]           = React.useState('');

  const [isNewContact, setIsNewContact] = React.useState(false);
  const [newContactName, setNewContactName] = React.useState('');
  const [newContactCompany, setNewContactCompany] = React.useState('');



  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Task title is required.'); return; }
    if (!source)       { setError('Please select a source.'); return; }
    if (!jobType)      { setError('Please select a job type.'); return; }

    setSubmitting(true);
    setError('');

    try {
      let finalContactId = contactId || null;

      if (isNewContact) {
        if (!newContactName.trim()) {
           setError('Please provide a name for the new contact');
           setSubmitting(false);
           return;
        }
        const newContact = await createContact({
          name: newContactName.trim(),
          company: newContactCompany.trim() || undefined,
          status: 'warm'
        });
        finalContactId = newContact.id;
      }

      const newTask = await createTask({
        title:           title.trim(),
        description:     message.trim() || null,
        source:          source || null,
        job_type:        jobType || null,

        contact_id:      finalContactId,
        project_id:      projectId || null,
        assigned_to:     assignedTo || null,
        priority,
        due_date:        dueDate || null,
        status:          'pending',
      });
      onCreated(newTask);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-low border border-outline/20 rounded-3xl w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ boxShadow: '0 0 0 1px rgba(33,178,37,0.08), 0 32px 80px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-outline/10 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-on-surface font-headline tracking-tight">New Task Intake</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Fill in the details to log a new task</p>
          </div>

          {/* Registry Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-extrabold tracking-wider bg-surface-container border-outline/20 text-on-surface-variant">
              <Zap size={12} />
              Auto-generated
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-surface-container rounded-xl transition-colors text-on-surface-variant ml-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-5">

          {/* Title */}
          <div>
            <FieldLabel icon={FileText}>Task Subject</FieldLabel>
            <FieldBox>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Replace AC unit in Unit 3B"
                className="w-full bg-transparent text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant placeholder:opacity-50"
              />
            </FieldBox>
          </div>

          {/* Message */}
          <div>
            <FieldLabel icon={FileText}>Message / Brief</FieldLabel>
            <FieldBox>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe the job request, context, or any relevant details…"
                rows={3}
                className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant placeholder:opacity-50 resize-none leading-relaxed"
              />
            </FieldBox>
          </div>

          {/* Source + Job Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel icon={Radio}>Source</FieldLabel>
              <div className="bg-surface-container border border-outline/20 rounded-xl px-4 py-2.5 focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/40 transition-all relative">
                <select
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  className="w-full bg-transparent text-sm text-on-surface outline-none cursor-pointer [color-scheme:dark]"
                >
                  <option value="" disabled className="bg-surface-container text-on-surface-variant">Select source…</option>
                  {SOURCES.map(s => <option key={s} value={s} className="bg-surface-container text-on-surface">{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <FieldLabel icon={Briefcase}>Job Type</FieldLabel>
              <div className="bg-surface-container border border-outline/20 rounded-xl px-4 py-2.5 focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/40 transition-all relative">
                <select
                  value={jobType}
                  onChange={e => setJobType(e.target.value)}
                  className="w-full bg-transparent text-sm text-on-surface outline-none cursor-pointer [color-scheme:dark]"
                >
                  <option value="" disabled className="bg-surface-container text-on-surface-variant">Select job type…</option>
                  {JOB_TYPES.map(j => <option key={j} value={j} className="bg-surface-container text-on-surface">{j}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Contact + Project */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <FieldLabel icon={User}>Contact Person</FieldLabel>
                <button type="button" onClick={() => setIsNewContact(!isNewContact)} className="text-[10px] font-bold text-primary hover:underline pb-2">
                  {isNewContact ? 'Cancel' : '+ New Contact'}
                </button>
              </div>
              
              {isNewContact ? (
                <div className="flex flex-col gap-2 bg-surface-container-highest p-3 rounded-xl border border-primary/20 animate-in fade-in zoom-in-95 duration-200">
                   <input required={isNewContact} value={newContactName} onChange={e => setNewContactName(e.target.value)}
                     className="w-full bg-surface-container border border-outline/10 rounded-lg p-2.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-on-surface-variant placeholder:opacity-50"
                     placeholder="Contact Name *" />
                   <input value={newContactCompany} onChange={e => setNewContactCompany(e.target.value)}
                     className="w-full bg-surface-container border border-outline/10 rounded-lg p-2.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-on-surface-variant placeholder:opacity-50"
                     placeholder="Company (Optional)" />
                </div>
              ) : (
                <SearchSelect
                  items={contacts.map(c => ({ ...c, name: c.name }))}
                  value={contactId}
                  onChange={setContactId}
                  placeholder="Search contacts…"
                  renderItem={c => (
                    <div>
                      <p className="font-semibold text-on-surface">{c.name}</p>
                      {c.company && <p className="text-[11px] text-on-surface-variant">{c.company}</p>}
                    </div>
                  )}
                  renderSelected={c => c.name}
                />
              )}
            </div>
            <div>
              <FieldLabel icon={FolderOpen}>Project</FieldLabel>
              <SearchSelect
                items={projects.map(p => ({ ...p }))}
                value={projectId}
                onChange={setProjectId}
                placeholder="Search projects…"
                renderItem={p => (
                  <div>
                    <p className="font-semibold text-on-surface">{p.name}</p>
                    <p className="text-[11px] text-on-surface-variant capitalize">{p.status}</p>
                  </div>
                )}
                renderSelected={p => p.name}
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <FieldLabel icon={Zap}>Priority</FieldLabel>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wide border transition-all',
                    priority === p.value
                      ? `${p.color} bg-surface-container-high border-current`
                      : 'text-on-surface-variant border-outline/20 hover:border-outline/50'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned To + Due Date */}
          <div className={cn("grid gap-4", isAdmin ? "grid-cols-2" : "grid-cols-1")}>
            {isAdmin && (
              <div>
                <FieldLabel icon={User}>Assigned To</FieldLabel>
                <SearchSelect
                  items={profiles.map(p => ({ id: p.id, name: p.full_name || 'Unnamed Member' }))}
                  value={assignedTo}
                  onChange={setAssignedTo}
                  placeholder="Assign member…"
                  renderItem={p => <span className="font-semibold text-on-surface">{p.name}</span>}
                  renderSelected={p => <span className="font-semibold text-on-surface text-sm">{p.name}</span>}
                />
              </div>
            )}
            <div>
              <FieldLabel icon={Calendar}>Due Date</FieldLabel>
              <FieldBox>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-transparent text-sm text-on-surface outline-none [color-scheme:dark]"
                />
              </FieldBox>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-error/10 border border-error/20 rounded-xl text-xs font-bold text-error">
              <X size={13} />
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-outline/10 shrink-0">
          <div className="text-[11px] text-on-surface-variant opacity-40">
            Fields marked with * are required
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dim transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 size={15} className="animate-spin" /> Creating…</>
              ) : (
                <><CheckCircle2 size={15} /> Create Task</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
