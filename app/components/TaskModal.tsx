'use client';

import React from 'react';
import {
  X,
  ChevronDown,
  Calendar,
  Folder,
  User,
  Clock,
  RefreshCw,
  Trash2,
  Zap,
  ArrowRight,
  Hash,
  Radio,
  Briefcase,
  Paperclip,
  Loader2,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, Project, Contact, Priority, Status, TaskInteraction, Attachment } from '@/lib/types';
import { updateTask, deleteTask, getTaskInteractions, addTaskInteraction } from '@/lib/actions/tasks';
import { getAttachments, saveAttachmentRecord, deleteAttachment } from '@/lib/actions/attachments';
import { createClient } from '@/lib/supabase/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCES = ['Email', 'Phone Call', 'Internal', 'Other'] as const;
const JOB_TYPES = [
  'Repair', 'Installation', 'Maintenance', 'Consultation',
  'Design', 'Development', 'Inspection', 'Delivery', 'Other',
] as const;

const STATUS_OPTIONS: { value: Status; label: string; color: string; bg: string }[] = [
  { value: 'pending',     label: 'Backlog',     color: 'text-on-surface-variant', bg: 'bg-surface-container-highest' },
  { value: 'in-progress', label: 'In Progress', color: 'text-secondary',          bg: 'bg-secondary/10' },
  { value: 'overdue',     label: 'Overdue',     color: 'text-error',              bg: 'bg-error/10' },
  { value: 'completed',   label: 'Done',         color: 'text-primary',            bg: 'bg-primary/10' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string; bg: string }[] = [
  { value: 'low',      label: 'Low',      color: 'text-on-surface-variant', bg: 'bg-surface-container-highest' },
  { value: 'medium',   label: 'Medium',   color: 'text-secondary',          bg: 'bg-secondary/10' },
  { value: 'high',     label: 'High',     color: 'text-tertiary',           bg: 'bg-tertiary/10' },
  { value: 'critical', label: 'Critical', color: 'text-error',              bg: 'bg-error/10' },
];

function formatDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function toInputDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toISOString().split('T')[0];
}

// ─── Inline Pill Select ───────────────────────────────────────────────────────

function PillSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; color: string; bg: string }[];
  onChange: (v: T) => void;
}) {
  const current = options.find(o => o.value === value) ?? options[0];
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className={cn(
          'appearance-none pl-3 pr-7 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest border border-current/20 outline-none cursor-pointer transition-all',
          current.color, current.bg
        )}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={11} className={cn('absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none', current.color)} />
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface TaskModalProps {
  task: Task;
  projects: Project[];
  contacts: Contact[];
  onClose: () => void;
  onUpdated: (t: Task) => void;
  onDeleted: (id: string) => void;
  isReadOnly?: boolean;
}

export default function TaskModal({
  task,
  projects,
  contacts,
  onClose,
  onUpdated,
  onDeleted,
  isReadOnly = false,
}: TaskModalProps) {
  const [form, setForm] = React.useState<Partial<Task>>({
    title:       task.title,
    description: task.description ?? '',
    next_action: task.next_action ?? '',
    status:      task.status,
    priority:    task.priority,
    due_date:    task.due_date,
    project_id:  task.project_id,
    contact_id:  task.contact_id,
    source:      task.source ?? '',
    job_type:    task.job_type ?? '',
  });
  const [saving, setSaving]     = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [dirty, setDirty]       = React.useState(false);

  // Track unsaved changes
  React.useEffect(() => {
    const changed =
      form.title       !== task.title ||
      form.description !== (task.description ?? '') ||
      form.next_action !== (task.next_action ?? '') ||
      form.status      !== task.status ||
      form.priority    !== task.priority ||
      form.due_date    !== task.due_date ||
      form.project_id  !== task.project_id ||
      form.contact_id  !== task.contact_id ||
      form.source      !== (task.source ?? '') ||
      form.job_type    !== (task.job_type ?? '');
    setDirty(changed);
  }, [form, task]);

  // Escape to close
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const [interactions, setInteractions] = React.useState<TaskInteraction[]>([]);
  const [newInteraction, setNewInteraction] = React.useState('');
  const [submittingInteraction, setSubmittingInteraction] = React.useState(false);

  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      getTaskInteractions(task.id),
      getAttachments('task', task.id)
    ]).then(([interactionData, attachmentData]) => {
      if (active) {
        setInteractions(interactionData);
        setAttachments(attachmentData);
      }
    });
    return () => { active = false; };
  }, [task.id]);

  const handleAddInteraction = async () => {
    if (!newInteraction.trim()) return;
    setSubmittingInteraction(true);
    try {
      const added = await addTaskInteraction(task.id, newInteraction.trim());
      setInteractions(prev => [...prev, added]);
      setNewInteraction('');
    } catch {
      alert('Failed to post comment');
    } finally {
      setSubmittingInteraction(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5242880) {
      alert("File exceeds 5MB limit.");
      return;
    }

    setUploadingAttachment(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      const added = await saveAttachmentRecord({
        user_id: user.id,
        task_id: task.id,
        project_id: null,
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        file_url: publicUrl
      });

      setAttachments(prev => [added, ...prev]);
    } catch (err: any) {
      alert(`Failed to upload attachment: ${err.message}`);
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (att: Attachment) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      const urlChunks = att.file_url.split('/');
      const filePath = urlChunks.slice(-2).join('/'); // Extracts user_id/filename.ext
      await deleteAttachment(att.id, filePath);
      setAttachments(prev => prev.filter(a => a.id !== att.id));
    } catch (err) {
      alert('Failed to delete attachment');
    }
  };

  const set = (key: keyof Task) => (val: string) =>
    setForm(f => ({ ...f, [key]: val || null }));

  const handleSave = async () => {
    if (!form.title?.trim()) return;
    setSaving(true);
    try {
      const updated = await updateTask(task.id, form);
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
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Auto-reset after 3 seconds if user doesn't confirm
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    try {
      await deleteTask(task.id);
      onDeleted(task.id);
      onClose();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const linkedProject = projects.find(p => p.id === form.project_id);
  const linkedContact = contacts.find(c => c.id === form.contact_id);
  const currentStatus   = STATUS_OPTIONS.find(o => o.value === form.status)!;
  const currentPriority = PRIORITY_OPTIONS.find(o => o.value === form.priority)!;

  const fieldClass = cn(
    'w-full bg-surface-container border border-outline/15 rounded-xl px-4 py-3 text-sm font-medium text-on-surface',
    'outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30',
    'placeholder-on-surface-variant/30 transition-all resize-none'
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-surface-container-low border border-outline/20 rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl"
        style={{
          maxHeight: '90vh',
          boxShadow: '0 0 0 1px rgba(33,178,37,0.08), 0 32px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* ── Header ── */}
        <div className="px-8 pt-8 pb-5 border-b border-outline/10 shrink-0">
          {/* Breadcrumb */}
          {linkedProject && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant opacity-60 mb-3">
              <Folder size={12} />
              <span>{linkedProject.name}</span>
              <ArrowRight size={11} />
              <span>Task</span>
            </div>
          )}

          {/* Title */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <input
              value={form.title ?? ''}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="flex-1 text-2xl font-extrabold text-on-surface bg-transparent outline-none border-b-2 border-transparent focus:border-primary/40 transition-colors pb-1 font-headline placeholder-on-surface-variant/30"
              placeholder="Task title..."
            />
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-container rounded-xl transition-colors text-on-surface-variant hover:text-on-surface shrink-0 mt-0.5"
            >
              <X size={20} />
            </button>
          </div>

          {/* Status / Priority / Due date pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {task.registry_number && (
              <div className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full border border-outline/20 text-[11px] font-extrabold uppercase tracking-widest text-on-surface-variant bg-surface-container-highest opacity-70">
                <Hash size={12} /> {task.registry_number}
              </div>
            )}
            <PillSelect
              value={form.status as Status}
              options={STATUS_OPTIONS}
              onChange={v => setForm(f => ({ ...f, status: v }))}
            />
            <PillSelect
              value={form.priority as Priority}
              options={PRIORITY_OPTIONS}
              onChange={v => setForm(f => ({ ...f, priority: v }))}
            />
            <div className={cn(
              'flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full border border-outline/20 text-[11px] font-bold text-on-surface-variant bg-surface-container'
            )}>
              <Calendar size={12} />
              <input
                type="date"
                value={toInputDate(form.due_date)}
                onChange={e => setForm(f => ({
                  ...f,
                  due_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                }))}
                className="bg-transparent outline-none text-[11px] font-bold text-on-surface-variant cursor-pointer w-[110px]"
              />
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-5 gap-0 h-full">

            {/* Left — main fields */}
            <div className="col-span-3 px-8 py-6 space-y-6 border-r border-outline/10">

              {/* Next Action — most prominent field */}
              <div>
                <label className="flex items-center gap-2 text-[10px] font-extrabold text-primary uppercase tracking-widest mb-2">
                  <Zap size={12} />
                  Next Action
                </label>
                <input
                  value={form.next_action ?? ''}
                  onChange={e => setForm(f => ({ ...f, next_action: e.target.value }))}
                  placeholder="What's the very next step? (e.g. 'Call Sarah to confirm deadline')"
                  className={cn(fieldClass, 'border-primary/20 focus:ring-primary/40 bg-primary/5 text-on-surface placeholder-on-surface-variant/40')}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2 block opacity-70">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={form.description ?? ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What is this task about? Add context, goals, or acceptance criteria..."
                  className={fieldClass}
                />
              </div>

              {/* Project & Contact selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2 block opacity-70">
                    Project
                  </label>
                  <div className="relative">
                    <select
                      value={form.project_id ?? ''}
                      onChange={e => setForm(f => ({ ...f, project_id: e.target.value || null }))}
                      className={cn(fieldClass, 'pr-8 cursor-pointer')}
                    >
                      <option value="">No project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2 block opacity-70">
                    Contact
                  </label>
                  <div className="relative">
                    <select
                      value={form.contact_id ?? ''}
                      onChange={e => setForm(f => ({ ...f, contact_id: e.target.value || null }))}
                      className={cn(fieldClass, 'pr-8 cursor-pointer')}
                    >
                      <option value="">No contact</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Source & Job Type selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2 opacity-70">
                    <Radio size={12} /> Source
                  </label>
                  <div className="relative">
                    <select
                      value={form.source ?? ''}
                      onChange={e => setForm(f => ({ ...f, source: e.target.value || null }))}
                      className={cn(fieldClass, 'pr-8 cursor-pointer')}
                    >
                      <option value="" disabled>Select...</option>
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2 opacity-70">
                    <Briefcase size={12} /> Job Type
                  </label>
                  <div className="relative">
                    <select
                      value={form.job_type ?? ''}
                      onChange={e => setForm(f => ({ ...f, job_type: e.target.value || null }))}
                      className={cn(fieldClass, 'pr-8 cursor-pointer')}
                    >
                      <option value="" disabled>Select...</option>
                      {JOB_TYPES.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* ── Files & Attachments ── */}
              <div className="pt-6 mt-6 border-t border-outline/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-extrabold text-on-surface font-headline flex items-center gap-2">
                    <Paperclip size={16} className="text-on-surface-variant/50" />
                    Attachments
                  </h4>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAttachment}
                    className="text-xs font-bold text-primary hover:text-primary-dim transition-colors flex items-center gap-1"
                  >
                    {uploadingAttachment ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
                    {uploadingAttachment ? 'Uploading...' : 'Add File'}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                  />
                </div>
                
                {attachments.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-outline/15 rounded-2xl flex flex-col items-center justify-center gap-2">
                    <Paperclip size={20} className="text-on-surface-variant opacity-30" />
                    <p className="text-xs font-medium text-on-surface-variant opacity-50">No attachments. Max size 5MB.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {attachments.map(att => (
                      <div key={att.id} className="relative group p-2 bg-surface-container rounded-xl border border-outline/10 flex items-center gap-2">
                        {att.file_type.startsWith('image/') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={att.file_url} alt={att.file_name} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FileText size={14} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-on-surface truncate">{att.file_name}</p>
                          <p className="text-[9px] font-medium text-on-surface-variant opacity-60">{(att.file_size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 z-0"
                        />
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteAttachment(att); }}
                          className="relative z-10 w-6 h-6 flex items-center justify-center rounded-md bg-error/10 text-error opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/20"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Activity / Comments ── */}
              <div className="pt-6 mt-6 border-t border-outline/10">
                <h4 className="text-sm font-extrabold text-on-surface mb-4 font-headline flex items-center gap-2">
                  <Clock size={16} className="text-on-surface-variant/50" />
                  Activity & Comments
                </h4>
                
                <div className="space-y-4 mb-4">
                  {interactions.length === 0 ? (
                    <p className="text-xs text-on-surface-variant font-medium opacity-60 italic">No comments yet. Leave a note below.</p>
                  ) : (
                    interactions.map(interaction => (
                      <div key={interaction.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden font-bold text-[10px] text-primary">
                          {interaction.user?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={interaction.user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            interaction.user?.full_name?.charAt(0) || <User size={12} />
                          )}
                        </div>
                        <div className="flex-1 bg-surface-container-low border border-outline/10 p-3 rounded-2xl rounded-tl-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-extrabold text-on-surface">{interaction.user?.full_name || 'Team Member'}</span>
                            <span className="text-[9px] font-bold text-on-surface-variant opacity-60">
                              {new Date(interaction.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant whitespace-pre-wrap">{interaction.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2 items-end">
                  <textarea
                    value={newInteraction}
                    onChange={e => setNewInteraction(e.target.value)}
                    placeholder="Add a progress update or comment..."
                    className={cn(fieldClass, 'min-h-[44px] py-2.5 flex-1')}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddInteraction();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddInteraction}
                    disabled={!newInteraction.trim() || submittingInteraction}
                    className="px-4 py-2.5 bg-on-surface text-surface font-bold rounded-xl text-xs hover:opacity-90 transition-all disabled:opacity-40 shrink-0 h-[44px] flex items-center justify-center"
                  >
                    {submittingInteraction ? '...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right — metadata */}
            <div className="col-span-2 px-6 py-6 space-y-5">

              {/* Linked Project card */}
              {linkedProject ? (
                <div>
                  <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2 opacity-60">Project</p>
                  <div className="p-3.5 bg-surface-container rounded-2xl border border-outline/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Folder size={14} className="text-primary shrink-0" />
                      <p className="text-[13px] font-bold text-on-surface truncate">{linkedProject.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${linkedProject.progress}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-primary shrink-0">{linkedProject.progress}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2 opacity-60">Project</p>
                  <div className="p-3.5 bg-surface-container/50 rounded-2xl border border-dashed border-outline/15 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-on-surface-variant opacity-40">No project linked</span>
                  </div>
                </div>
              )}

              {/* Linked Contact card */}
              {linkedContact ? (
                <div>
                  <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2 opacity-60">Contact</p>
                  <div className="p-3.5 bg-surface-container rounded-2xl border border-outline/10 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={linkedContact.avatar || `https://picsum.photos/seed/${encodeURIComponent(linkedContact.name)}/100/100`}
                      alt={linkedContact.name}
                      className="w-9 h-9 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-on-surface truncate">{linkedContact.name}</p>
                      <p className="text-[10px] text-on-surface-variant font-medium opacity-60 truncate">
                        {[linkedContact.role, linkedContact.company].filter(Boolean).join(' @ ')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2 opacity-60">Contact</p>
                  <div className="p-3.5 bg-surface-container/50 rounded-2xl border border-dashed border-outline/15 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-on-surface-variant opacity-40">No contact linked</span>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-2 space-y-2.5 border-t border-outline/10">
                <div className="flex items-center gap-2 text-[11px] font-medium text-on-surface-variant opacity-50">
                  <Clock size={12} />
                  <span>Created {formatDate(task.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-medium text-on-surface-variant opacity-50">
                  <RefreshCw size={12} />
                  <span>Updated {formatDate(task.updated_at)}</span>
                </div>
              </div>

              {/* Next Action recap (read-only reminder) */}
              {form.next_action && (
                <div className="pt-2 border-t border-outline/10">
                  <p className="text-[10px] font-extrabold text-primary uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Zap size={10} /> Next Action
                  </p>
                  <p className="text-[12px] font-semibold text-on-surface-variant leading-relaxed">
                    {form.next_action}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-8 py-5 border-t border-outline/10 shrink-0 flex items-center justify-between gap-3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              'flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50',
              confirmDelete
                ? 'bg-error text-white hover:bg-error/80 animate-pulse'
                : 'text-error hover:text-error/80 hover:bg-error/5'
            )}
          >
            <Trash2 size={15} />
            {deleting ? 'Deleting…' : confirmDelete ? 'Click to confirm delete' : 'Delete Task'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-surface-container border border-outline/20 text-on-surface-variant font-bold rounded-xl text-sm hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !dirty || !form.title?.trim() || isReadOnly}
              className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-sm shadow-xl shadow-primary/20 hover:bg-primary-dim transition-all disabled:opacity-40 min-w-[130px]"
            >
              {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
