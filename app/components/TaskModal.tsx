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
  FileText,
  Truck,
  Navigation,
  Package,
  CreditCard,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, Project, Contact, Priority, Status, TaskInteraction, Attachment } from '@/lib/types';
import { updateTask, deleteTask, getTaskInteractions, addTaskInteraction, advanceTaskStage } from '@/lib/actions/tasks';
import { getAttachments, saveAttachmentRecord, deleteAttachment } from '@/lib/actions/attachments';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

// ─── Image Optimization Helper ────────────────────────────────────────────────
const resizeImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max = 1920;
        if (width > max || height > max) {
          if (width > height) {
            height = Math.round((height *= max / width));
            width = max;
          } else {
            width = Math.round((width *= max / height));
            height = max;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name, { type: file.type }));
          else resolve(file);
        }, file.type, 0.85); // 85% quality JPEG
      };
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  });
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCES = ['Email', 'Phone Call', 'Internal', 'Other'] as const;
const JOB_TYPES = [
  'Repair', 'Installation', 'Maintenance', 'Consultation',
  'Design', 'Development', 'Inspection', 'Delivery', 'Other',
] as const;

const STATUS_OPTIONS: { value: Status; label: string; color: string; bg: string }[] = [
  { value: 'pending',     label: 'Backlog',     color: 'text-on-surface-variant', bg: 'bg-surface-container-highest' },
  { value: 'in-progress', label: 'In Progress', color: 'text-secondary',          bg: 'bg-secondary/10' },
  { value: 'awaiting',    label: 'Awaiting',    color: 'text-tertiary',           bg: 'bg-tertiary/10' },
  { value: 'ready',       label: 'Ready',       color: 'text-[#34d399]',          bg: 'bg-[#34d399]/10' },
  { value: 'failed',      label: 'Failed',      color: 'text-[#fb923c]',          bg: 'bg-[#fb923c]/10' },
  { value: 'overdue',     label: 'Overdue',     color: 'text-error',              bg: 'bg-error/10' },
  { value: 'completed',   label: 'Done',        color: 'text-primary',            bg: 'bg-primary/10' },
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

// ─── Stage Action Config ────────────────────────────────────────────────────────────────────
type ProofConfig = {
  title: string;        // e.g. "Proof of Repair Required"
  hint: string;         // e.g. "Upload a photo of the completed repair work."
  confirmLabel: string; // e.g. "Confirm Repair"
  filePrefix: string;   // e.g. "POR" → POR_filename.jpg
};

type StageConfig = {
  label: string;
  icon: React.ElementType;
  colorClass: string;
  description: string;
  requiresOutcome?: boolean;
  outcomeQuestion?: string;
  successLabel?: string;
  failLabel?: string;
  proofConfig?: ProofConfig;
} | null;

function getStageConfig(status: Status, jobType: string | null | undefined): StageConfig {
  const jt = (jobType ?? '').toLowerCase();

  if (jt === 'delivery') {
    switch (status) {
      case 'pending':     return { label: 'Assign Rider & Confirm Pickup', icon: Truck,       colorClass: 'bg-secondary text-on-primary shadow-secondary/20',  description: 'Confirm the rider physically has the package and is ready to go.' };
      case 'in-progress': return { label: 'Mark Out for Delivery',         icon: Navigation,  colorClass: 'bg-tertiary text-on-primary shadow-tertiary/20',    description: 'Rider is on the way to the recipient.' };
      case 'awaiting':    return {
        label: 'Log Delivery Attempt', icon: Package, colorClass: 'bg-[#34d399] text-surface shadow-[#34d399]/20',
        description: 'Record whether the delivery was successful or failed.',
        requiresOutcome: true,
        outcomeQuestion: 'Was this delivery successful?',
        successLabel: 'Delivered ✓',
        failLabel: 'Failed ✗',
        proofConfig: {
          title: 'Proof of Delivery Required',
          hint: 'Upload a photo — signed receipt, package at door, or customer signature.',
          confirmLabel: 'Confirm Delivered',
          filePrefix: 'POD',
        },
      };
      case 'ready':       return { label: 'Confirm Payment Received',      icon: CreditCard,  colorClass: 'bg-primary text-on-primary shadow-primary/20',      description: 'Mark payment as confirmed and close the job.' };
      case 'failed':      return { label: 'Retry Delivery',                icon: RefreshCw,   colorClass: 'bg-[#fb923c] text-white shadow-[#fb923c]/20',       description: 'Move back to Awaiting and schedule another delivery attempt.' };
      default:            return null;
    }
  }

  if (jt === 'repair') {
    switch (status) {
      case 'pending':     return { label: 'Start Repair',               icon: PlayCircle, colorClass: 'bg-error text-white shadow-error/20',                description: 'Begin the repair job.' };
      case 'in-progress': return {
        label: 'Mark Repair Complete', icon: Package, colorClass: 'bg-[#34d399] text-surface shadow-[#34d399]/20',
        description: 'Repair is done — confirm the outcome and attach proof.',
        requiresOutcome: true,
        outcomeQuestion: 'Was the repair completed successfully?',
        successLabel: 'Completed ✓',
        failLabel: 'Could Not Complete ✗',
        proofConfig: {
          title: 'Proof of Repair Required',
          hint: 'Upload a photo of the completed repair work before closing.',
          confirmLabel: 'Confirm Repair Done',
          filePrefix: 'POR',
        },
      };
      case 'awaiting':    return { label: 'Customer Approval Received',   icon: CreditCard, colorClass: 'bg-secondary text-on-primary shadow-secondary/20',  description: 'Customer approved the estimate. Resume repair work.' };
      case 'ready':       return { label: 'Confirm Payment Received',    icon: CreditCard, colorClass: 'bg-primary text-on-primary shadow-primary/20',      description: 'Mark payment as confirmed and close the job.' };
      case 'failed':      return { label: 'Resume Repair',               icon: RefreshCw,  colorClass: 'bg-[#fb923c] text-white shadow-[#fb923c]/20',       description: 'Restart the repair — move back to In Progress.' };
      default:            return null;
    }
  }

  if (jt === 'installation') {
    switch (status) {
      case 'pending':     return { label: 'Begin Installation',         icon: PlayCircle, colorClass: 'bg-primary text-on-primary shadow-primary/20',      description: 'Start the installation job on-site.' };
      case 'in-progress': return {
        label: 'Site Sign-Off Complete', icon: Package, colorClass: 'bg-[#34d399] text-surface shadow-[#34d399]/20',
        description: 'Customer has signed off — attach proof of installation.',
        requiresOutcome: true,
        outcomeQuestion: 'Was the installation completed successfully?',
        successLabel: 'Completed ✓',
        failLabel: 'Could Not Complete ✗',
        proofConfig: {
          title: 'Proof of Installation Required',
          hint: 'Upload a site photo or signed sign-off sheet.',
          confirmLabel: 'Confirm Installation',
          filePrefix: 'POI',
        },
      };
      case 'ready':       return { label: 'Confirm Payment Received',   icon: CreditCard, colorClass: 'bg-primary text-on-primary shadow-primary/20',      description: 'Mark payment as confirmed and close the job.' };
      case 'failed':      return { label: 'Retry Installation',         icon: RefreshCw,  colorClass: 'bg-[#fb923c] text-white shadow-[#fb923c]/20',       description: 'Restart the installation — move back to In Progress.' };
      default:            return null;
    }
  }

  if (jt === 'maintenance') {
    switch (status) {
      case 'pending':     return { label: 'Begin Service',              icon: PlayCircle, colorClass: 'bg-tertiary text-on-primary shadow-tertiary/20',    description: 'Start the maintenance service.' };
      case 'in-progress': return {
        label: 'Submit Service Report', icon: Package, colorClass: 'bg-[#34d399] text-surface shadow-[#34d399]/20',
        description: 'Service complete — attach proof before closing.',
        requiresOutcome: true,
        outcomeQuestion: 'Was the service completed successfully?',
        successLabel: 'Completed ✓',
        failLabel: 'Could Not Complete ✗',
        proofConfig: {
          title: 'Proof of Service Required',
          hint: 'Upload a photo of the serviced equipment or a signed service report.',
          confirmLabel: 'Confirm Service Done',
          filePrefix: 'POS',
        },
      };
      case 'ready':       return { label: 'Confirm Payment Received',   icon: CreditCard, colorClass: 'bg-primary text-on-primary shadow-primary/20',      description: 'Mark payment as confirmed and close the job.' };
      case 'failed':      return { label: 'Retry Service',              icon: RefreshCw,  colorClass: 'bg-[#fb923c] text-white shadow-[#fb923c]/20',       description: 'Restart the service — move back to In Progress.' };
      default:            return null;
    }
  }

  if (jt === 'consultation') {
    switch (status) {
      case 'pending':     return { label: 'Begin Consultation',         icon: PlayCircle, colorClass: 'bg-secondary text-on-primary shadow-secondary/20',  description: 'Start the consultation session.' };
      case 'in-progress': return { label: 'Mark Meeting Complete',      icon: Package,    colorClass: 'bg-[#34d399] text-surface shadow-[#34d399]/20',     description: 'Meeting concluded successfully.' };
      case 'ready':       return { label: 'Confirm Payment Received',   icon: CreditCard, colorClass: 'bg-primary text-on-primary shadow-primary/20',      description: 'Mark payment as confirmed and close the job.' };
      default:            return null;
    }
  }

  if (jt === 'development') {
    switch (status) {
      case 'pending':     return { label: 'Begin Development',          icon: PlayCircle, colorClass: 'bg-[#38bdf8] text-surface shadow-[#38bdf8]/20',    description: 'Start development work.' };
      case 'in-progress': return { label: 'Submit for Client Review',   icon: Package,    colorClass: 'bg-tertiary text-on-primary shadow-tertiary/20',    description: 'Send deliverables to the client for review.' };
      case 'awaiting':    return { label: 'Client Review Approved',     icon: CreditCard, colorClass: 'bg-primary text-on-primary shadow-primary/20',      description: 'Client signed off on the deliverables. Close the project.' };
      default:            return null;
    }
  }

  // Default / Other
  switch (status) {
    case 'pending':     return { label: 'Start Work',      icon: PlayCircle, colorClass: 'bg-secondary text-on-primary shadow-secondary/20',  description: 'Begin work on this task.' };
    case 'in-progress': return { label: 'Mark Complete',   icon: Package,    colorClass: 'bg-[#34d399] text-surface shadow-[#34d399]/20',     description: 'Work is complete — pending final confirmation.' };
    case 'ready':       return { label: 'Confirm & Close', icon: CreditCard, colorClass: 'bg-primary text-on-primary shadow-primary/20',      description: 'Confirm completion and archive this job.' };
    default:            return null;
  }
}

// ─── Stage Action Panel ────────────────────────────────────────────────────────────────────
function StageActionPanel({
  task,
  onAdvanced,
  isReadOnly,
}: {
  task: Task;
  onAdvanced: (updated: Task) => void;
  isReadOnly?: boolean;
}) {
  const [advancing, setAdvancing] = React.useState(false);
  const [showOutcomeForm, setShowOutcomeForm] = React.useState(false);
  const [stageError, setStageError] = React.useState('');
  const [showSuccessUpload, setShowSuccessUpload] = React.useState(false);
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [proofPreview, setProofPreview] = React.useState('');
  const [uploadingProof, setUploadingProof] = React.useState(false);
  const proofInputRef = React.useRef<HTMLInputElement>(null);
  const status = task.status as Status;
  const config = getStageConfig(status, task.job_type);

  if (status === 'completed') {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-primary/10 border border-primary/20">
        <CheckCircle2 size={16} className="text-primary shrink-0" />
        <div>
          <p className="text-[11px] font-extrabold text-primary uppercase tracking-widest">Job Closed</p>
          <p className="text-[11px] text-on-surface-variant opacity-70 mt-0.5">This task has been completed and archived.</p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  const proof = config.proofConfig;

  const handleAdvance = async (outcome?: 'success' | 'failed') => {
    setAdvancing(true);
    setStageError('');
    try {
      const updated = await advanceTaskStage(task.id, outcome ? { outcome } : undefined);
      setShowOutcomeForm(false);
      onAdvanced(updated);
    } catch (err: unknown) {
      setStageError(err instanceof Error ? err.message : 'Failed to advance stage. Please try again.');
    } finally {
      setAdvancing(false);
    }
  };

  const handleSelectProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview((ev.target?.result as string) ?? '');
    reader.readAsDataURL(file);
  };

  const handleSuccessWithProof = async () => {
    if (!proofFile || !proof) return;
    setUploadingProof(true);
    setStageError('');
    try {
      const resized = await resizeImage(proofFile);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const fileExt = resized.name.split('.').pop() ?? 'jpg';
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, resized);
      if (uploadError) throw new Error(uploadError.message);
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
      await saveAttachmentRecord({
        user_id: user.id,
        task_id: task.id,
        project_id: null,
        file_name: `${proof.filePrefix}_${proofFile.name}`,
        file_type: resized.type,
        file_size_bytes: resized.size,
        file_url: publicUrl,
      });
    } catch (err: unknown) {
      setStageError(err instanceof Error ? err.message : 'Proof upload failed. Please try again.');
      setUploadingProof(false);
      return;
    }
    setUploadingProof(false);
    await handleAdvance('success');
  };

  const Icon = config.icon;

  return (
    <div className="space-y-2.5">
      <label className="flex items-center gap-2 text-[10px] font-extrabold text-primary uppercase tracking-widest">
        <Zap size={12} />
        Next Step
      </label>

      {showOutcomeForm ? (
        <>
          {showSuccessUpload && proof ? (
            /* ── Proof Upload (generic) ───────────────────────── */
            <div className="p-4 bg-surface-container border border-outline/15 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-[#34d399] shrink-0" />
                <p className="text-xs font-extrabold text-on-surface">{proof.title}</p>
              </div>
              <p className="text-[11px] text-on-surface-variant opacity-60 leading-relaxed">
                {proof.hint}
              </p>
              {proofPreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proofPreview}
                    alt="Proof photo"
                    className="w-full h-36 object-cover rounded-xl border border-[#34d399]/20"
                  />
                  <button
                    type="button"
                    onClick={() => { setProofFile(null); setProofPreview(''); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-surface-container/90 border border-outline/20 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => proofInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-5 border-2 border-dashed border-outline/25 rounded-xl text-[12px] font-bold text-on-surface-variant hover:border-[#34d399]/50 hover:text-[#34d399] transition-all"
                >
                  <Paperclip size={14} />
                  Tap to upload proof photo
                </button>
              )}
              <input
                ref={proofInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleSelectProof}
                className="hidden"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowSuccessUpload(false); setProofFile(null); setProofPreview(''); }}
                  disabled={uploadingProof || advancing}
                  className="px-3 py-2.5 text-[11px] font-bold text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleSuccessWithProof}
                  disabled={!proofFile || uploadingProof || advancing}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#34d399] text-surface font-bold text-xs shadow-lg shadow-[#34d399]/20 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {(uploadingProof || advancing) ? <Loader2 size={13} className="animate-spin" /> : <Package size={13} />}
                  {uploadingProof ? 'Uploading…' : advancing ? 'Saving…' : proof.confirmLabel}
                </button>
              </div>
            </div>
          ) : (
            /* ── Success / Fail Choice (generic) ───────────────── */
            <div className="p-4 bg-surface-container border border-outline/15 rounded-2xl space-y-3">
              <p className="text-xs font-extrabold text-on-surface">
                {config.outcomeQuestion ?? 'How did this go?'}
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => proof ? setShowSuccessUpload(true) : handleAdvance('success')}
                  disabled={advancing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#34d399] text-surface font-bold text-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-[#34d399]/20"
                >
                  <Package size={14} />
                  {config.successLabel ?? 'Success ✓'}
                </button>
                <button
                  type="button"
                  onClick={() => handleAdvance('failed')}
                  disabled={advancing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-error/10 border border-error/30 text-error font-bold text-xs hover:bg-error/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  <AlertTriangle size={14} />
                  {config.failLabel ?? 'Failed ✗'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => !advancing && setShowOutcomeForm(false)}
                className="text-[11px] font-bold text-on-surface-variant hover:text-on-surface transition-colors"
              >
                ← Cancel
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <button
            onClick={() => config.requiresOutcome ? setShowOutcomeForm(true) : handleAdvance()}
            disabled={advancing || isReadOnly}
            className={cn(
              'w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl font-bold text-sm shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm',
              config.colorClass,
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none'
            )}
          >
            {advancing ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
            {advancing ? 'Processing…' : config.label}
          </button>
          <p className="text-[10px] font-medium text-on-surface-variant opacity-55 px-1 leading-relaxed">
            {config.description}
          </p>
        </>
      )}

      {stageError && (
        <p className="text-[11px] font-bold text-error flex items-center gap-1.5">
          <AlertTriangle size={11} /> {stageError}
        </p>
      )}
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
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

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

  const processUpload = async (originalFile: File) => {
    if (originalFile.size > 5242880 && !originalFile.type.startsWith('image/')) {
      alert("File exceeds 5MB limit.");
      return;
    }
    setUploadingAttachment(true);
    try {
      const file = await resizeImage(originalFile);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop() || 'tmp';
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUpload(e.dataTransfer.files[0]);
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

              {/* Stage-Aware Action Panel */}
              <StageActionPanel
                task={task}
                onAdvanced={onUpdated}
                isReadOnly={isReadOnly}
              />

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
                      className={cn(fieldClass, 'pr-8 cursor-pointer appearance-none')}
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
                      className={cn(fieldClass, 'pr-8 cursor-pointer appearance-none')}
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
                      className={cn(fieldClass, 'pr-8 cursor-pointer appearance-none')}
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
                      className={cn(fieldClass, 'pr-8 cursor-pointer appearance-none')}
                    >
                      <option value="" disabled>Select...</option>
                      {JOB_TYPES.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* ── Files & Attachments ── */}
              <div
                className="pt-6 mt-6 border-t border-outline/10 relative"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Drag Overlay */}
                {isDraggingOver && (
                  <div className="absolute inset-0 z-10 bg-primary/10 border-2 border-primary border-dashed rounded-2xl flex items-center justify-center">
                    <p className="text-primary font-bold text-sm animate-pulse">Drop file here...</p>
                  </div>
                )}
                <div className="flex items-center justify-between mb-4 relative z-0">
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
                
                <div className="relative z-0">
                  {attachments.length === 0 ? (
                    <div className="p-4 border-2 border-dashed border-outline/15 rounded-2xl flex flex-col items-center justify-center gap-2">
                      <Paperclip size={20} className="text-on-surface-variant opacity-30" />
                      <p className="text-xs font-medium text-on-surface-variant opacity-50">Drag & drop or click Add File</p>
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
                  <Link href={`/contacts?id=${linkedContact.id}`} className="block">
                    <div className="p-3.5 bg-surface-container rounded-2xl border border-outline/10 flex items-center gap-3 hover:border-primary/40 hover:bg-surface-container-high transition-colors cursor-pointer group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={linkedContact.avatar || `https://picsum.photos/seed/${encodeURIComponent(linkedContact.name)}/100/100`}
                        alt={linkedContact.name}
                        className="w-9 h-9 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-on-surface truncate group-hover:text-primary transition-colors">{linkedContact.name}</p>
                        <p className="text-[10px] text-on-surface-variant font-medium opacity-60 truncate">
                          {[linkedContact.role, linkedContact.company].filter(Boolean).join(' @ ')}
                        </p>
                      </div>
                      <ArrowRight size={14} className="text-on-surface-variant opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all shrink-0" />
                    </div>
                  </Link>
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

              {/* Legacy: Next Action note from old tasks (read-only) */}
              {task.next_action && (
                <div className="pt-2 border-t border-outline/10">
                  <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-1.5 flex items-center gap-1 opacity-50">
                    <Zap size={10} /> Previous Note
                  </p>
                  <p className="text-[12px] font-semibold text-on-surface-variant leading-relaxed opacity-60">
                    {task.next_action}
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
