'use client';

import React from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Folder, Calendar, Clock, CheckCircle2, AlertCircle, PlayCircle, MoreHorizontal, MessageSquare, LayoutGrid, Plus, Hash, Briefcase, Filter, X, GripVertical, TrendingUp, Search, ChevronDown, ChevronUp, Rows3, Truck, PauseCircle, User, Radio, Flag, AlertTriangle, List, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';
import { cn } from '@/lib/utils';
import type { Task, Status, Project, Priority, Contact, Profile } from '@/lib/types';
import { updateTask } from '@/lib/actions/tasks';
import TaskModal from './TaskModal';
import ProjectModal from './ProjectModal';
import { useTaskIntake } from '@/lib/contexts/TaskIntakeContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { id: Status; label: string; color: string; bg: string; iconColor: string }[] = [
  { id: 'pending',     label: 'Backlog',     color: 'text-on-surface-variant', bg: 'bg-surface-container-highest/40', iconColor: 'bg-surface-container-highest text-on-surface-variant' },
  { id: 'in-progress', label: 'In Progress', color: 'text-secondary',          bg: 'bg-secondary/5',                  iconColor: 'bg-secondary/10 text-secondary' },
  { id: 'awaiting',    label: 'Awaiting',    color: 'text-tertiary',           bg: 'bg-tertiary/5',                   iconColor: 'bg-tertiary/10 text-tertiary' },
  { id: 'ready',       label: 'Ready',       color: 'text-[#34d399]',          bg: 'bg-[#34d399]/5',                  iconColor: 'bg-[#34d399]/10 text-[#34d399]' },
  { id: 'failed',      label: 'Failed',      color: 'text-[#fb923c]',          bg: 'bg-[#fb923c]/5',                  iconColor: 'bg-[#fb923c]/10 text-[#fb923c]' },
  { id: 'overdue',     label: 'Overdue',     color: 'text-error',              bg: 'bg-error/5',                      iconColor: 'bg-error/10 text-error' },
  { id: 'completed',   label: 'Done',        color: 'text-primary',            bg: 'bg-primary/5',                    iconColor: 'bg-primary/10 text-primary' },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'bg-error',
  high:     'bg-tertiary',
  medium:   'bg-secondary',
  low:      'bg-on-surface-variant/40',
};

const PRIORITY_TEXT: Record<Priority, string> = {
  critical: 'text-error bg-error/10 border-error/20',
  high:     'text-tertiary bg-tertiary/10 border-tertiary/20',
  medium:   'bg-secondary/10 text-secondary border-secondary/20',
  low:      'text-on-surface-variant bg-surface-container-highest border-outline/20',
};

// Project color palette (cycles through for multiple projects)
const PROJECT_COLORS = [
  'text-primary bg-primary/10 border-primary/20',
  'text-secondary bg-secondary/10 border-secondary/20',
  'text-tertiary bg-tertiary/10 border-tertiary/20',
  'text-error bg-error/10 border-error/20',
];

// Job Type color palette — each type gets a stable, distinct color
const JOB_TYPE_COLORS: Record<string, { badge: string; dot: string }> = {
  'Repair':       { badge: 'text-error bg-error/10 border-error/20',                             dot: 'bg-error' },
  'Installation': { badge: 'text-primary bg-primary/10 border-primary/20',                       dot: 'bg-primary' },
  'Maintenance':  { badge: 'text-tertiary bg-tertiary/10 border-tertiary/20',                    dot: 'bg-tertiary' },
  'Consultation': { badge: 'text-secondary bg-secondary/10 border-secondary/20',                 dot: 'bg-secondary' },
  'Design':       { badge: 'text-[#a78bfa] bg-[#a78bfa]/10 border-[#a78bfa]/20',                dot: 'bg-[#a78bfa]' },
  'Development':  { badge: 'text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/20',                dot: 'bg-[#38bdf8]' },
  'Inspection':   { badge: 'text-[#fb923c] bg-[#fb923c]/10 border-[#fb923c]/20',                dot: 'bg-[#fb923c]' },
  'Delivery':     { badge: 'text-[#34d399] bg-[#34d399]/10 border-[#34d399]/20',                dot: 'bg-[#34d399]' },
  'Other':        { badge: 'text-on-surface-variant bg-surface-container-highest border-outline/20', dot: 'bg-on-surface-variant/50' },
};

// Fallback palette for job types not in the map above
const JOB_TYPE_FALLBACK = [
  { badge: 'text-primary bg-primary/10 border-primary/20',    dot: 'bg-primary' },
  { badge: 'text-secondary bg-secondary/10 border-secondary/20', dot: 'bg-secondary' },
  { badge: 'text-tertiary bg-tertiary/10 border-tertiary/20', dot: 'bg-tertiary' },
  { badge: 'text-error bg-error/10 border-error/20',          dot: 'bg-error' },
  { badge: 'text-[#a78bfa] bg-[#a78bfa]/10 border-[#a78bfa]/20', dot: 'bg-[#a78bfa]' },
  { badge: 'text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/20', dot: 'bg-[#38bdf8]' },
];

function getJobTypeColor(jobType: string) {
  if (JOB_TYPE_COLORS[jobType]) return JOB_TYPE_COLORS[jobType];
  // Deterministic index from string characters
  const hash = jobType.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return JOB_TYPE_FALLBACK[hash % JOB_TYPE_FALLBACK.length];
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.ceil((d.getTime() - today.setHours(0,0,0,0)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0)  return `${Math.abs(diff)}d overdue`;
  if (diff < 7)  return `${diff}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function KanbanCard({
  task,
  projectColorMap,
  isDragOverlay = false,
  onClick,
  isMuted = false,
  isReadOnly = false,
}: {
  task: Task;
  projectColorMap: Map<string, string>;
  isDragOverlay?: boolean;
  onClick?: () => void;
  isMuted?: boolean;
  isReadOnly?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isReadOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const projectColor = task.project_id
    ? projectColorMap.get(task.project_id) ?? PROJECT_COLORS[0]
    : null;

  const dateStr = formatDate(task.due_date);
  const isOverdue = task.status !== 'completed' && task.due_date && new Date(task.due_date) < new Date();
  
  // LexxTech Specific Priority Highlight
  const isUrgentLexxTech = 
    (task.job_type === 'Repair' || task.job_type === 'Delivery') &&
    (task.priority === 'high' || task.priority === 'critical');

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => {
        if (!isDragging && !isDragOverlay && onClick) {
          onClick();
        }
      }}
      className={cn(
        'group bg-surface-container border border-outline/10 rounded-2xl p-4 cursor-pointer active:cursor-grabbing transition-all duration-200 relative',
        isDragging && 'opacity-40 scale-95',
        isDragOverlay && 'shadow-2xl shadow-black/40 rotate-1 cursor-grabbing scale-105 border-primary/30',
        task.status === 'completed' && !isDragOverlay && 'opacity-60',
        'hover:border-outline/30 hover:shadow-md hover:shadow-black/20',
        isMuted && 'opacity-40 grayscale saturate-0',
        isUrgentLexxTech && 'ring-2 ring-error/60 shadow-lg shadow-error/10 border-error/50'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* Priority dot */}
          <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', PRIORITY_COLORS[task.priority])} />
          <p className={cn(
            'text-[13px] font-bold text-on-surface leading-snug',
            task.status === 'completed' && 'line-through opacity-60'
          )}>
            {task.title}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {task.assignee && (
            <div className="flex items-center gap-1.5 bg-surface-container-highest pl-0.5 pr-2 py-0.5 rounded-full" title={task.assignee.full_name || 'Assignee'}>
              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden font-bold text-[8px] text-primary">
                {task.assignee.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={task.assignee.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  task.assignee.full_name?.charAt(0) || <User size={8} />
                )}
              </div>
              <span className="text-[9px] font-bold text-on-surface-variant truncate max-w-[70px]">
                {task.assignee.full_name?.split(' ')[0] || 'Unassigned'}
              </span>
            </div>
          )}
          <GripVertical
            size={14}
            className="text-on-surface-variant/30 group-hover:text-on-surface-variant/80 transition-colors shrink-0 cursor-grab active:cursor-grabbing"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mb-3">
        {/* Project tag */}
        {task.project && projectColor && (
          <div className="flex flex-wrap gap-1.5">
            <span className={cn(
              'inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md border',
              projectColor
            )}>
              <Folder size={10} />
              {task.project.name}
            </span>
            {/* Show project tags if present */}
            {task.project.tags && task.project.tags.length > 0 && task.project.tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded border border-outline/10 bg-surface-container-highest text-on-surface-variant">
                <Hash size={9} className="opacity-50" />{tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Registry, Job Type, Source, & Contact badging */}
        {(task.registry_number || task.job_type || task.source || task.contact) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            {task.registry_number && (
              <span className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant flex items-center gap-0.5">
                <Hash size={9} />{task.registry_number}
              </span>
            )}
            {task.job_type && (() => {
              const jc = getJobTypeColor(task.job_type!);
              return (
                <span className={cn('text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1', jc.badge)}>
                  <Briefcase size={9} className="opacity-70" />{task.job_type}
                </span>
              );
            })()}
            {task.source && (
              <span className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded border border-outline/10 text-on-surface-variant bg-surface-container flex items-center gap-1">
                <Radio size={9} className="opacity-70" />{task.source}
              </span>
            )}
            {task.contact && (
              <span className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded border border-outline/10 text-on-surface-variant bg-surface-container flex items-center gap-1 max-w-[120px] truncate">
                <User size={9} className="opacity-70 shrink-0" /> <span className="truncate">{task.contact.name}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className={cn(
          'text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded border',
          PRIORITY_TEXT[task.priority]
        )}>
          {task.priority}
        </span>
        {dateStr && (
          <span className={cn(
            'flex items-center gap-1 text-[10px] font-bold',
            isOverdue ? 'text-error' : 'text-on-surface-variant/60'
          )}>
            {isOverdue ? <AlertCircle size={11} /> : <Calendar size={11} />}
            {dateStr}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function KanbanColumn({
  col,
  tasks,
  projectColorMap,
  onAddTask,
  onCardClick,
  currentUserId,
  isAdmin,
}: {
  col: typeof COLUMNS[number];
  tasks: Task[];
  projectColorMap: Map<string, string>;
  onAddTask: (status: Status) => void;
  onCardClick: (t: Task) => void;
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  // Register this column as a dnd-kit droppable zone
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className={cn(
      'flex flex-col flex-1 shrink-0 min-w-[280px] max-w-[340px] rounded-3xl border h-full transition-all duration-150',
      col.bg,
      isOver ? 'border-primary/40 ring-2 ring-primary/20' : 'border-outline/10'
    )}>
      {/* Column header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline/10">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', col.iconColor)}>
            {col.id === 'pending'     && <Clock size={14} />}
            {col.id === 'in-progress' && <LayoutGrid size={14} />}
            {col.id === 'awaiting'    && <PauseCircle size={14} />}
            {col.id === 'ready'       && <Flag size={14} />}
            {col.id === 'failed'      && <AlertTriangle size={14} />}
            {col.id === 'overdue'     && <AlertCircle size={14} />}
            {col.id === 'completed'   && <CheckCircle2 size={14} />}
          </div>
          <span className={cn('text-[11px] font-extrabold uppercase tracking-widest', col.color)}>
            {col.label}
          </span>
          <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        {isAdmin && (
          <button
            onClick={() => onAddTask(col.id)}
            className="p-1 rounded-lg hover:bg-surface-container-highest transition-colors text-on-surface-variant hover:text-on-surface"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Cards — ref registered here so the whole card area is droppable */}
      <div ref={setNodeRef} className="flex-1 p-3 space-y-2.5 overflow-y-auto custom-scrollbar">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => {
                  const isMuted = !isAdmin && !!currentUserId && task.assigned_to !== currentUserId;
                  const isReadOnly = !isAdmin && task.assigned_to !== currentUserId;
                  return <KanbanCard key={task.id} task={task} projectColorMap={projectColorMap} onClick={() => onCardClick(task)} isMuted={isMuted} isReadOnly={isReadOnly} />;
          })}
        </SortableContext>

        {tasks.length === 0 && (
          <div className={cn(
            'flex flex-col items-center justify-center py-10 gap-2 rounded-2xl border-2 border-dashed transition-all',
            isOver ? 'border-primary/40 opacity-80' : 'border-outline/20 opacity-30'
          )}>
            <div className="w-8 h-8 border-2 border-dashed border-outline rounded-xl" />
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              {isOver ? 'Drop here' : 'Empty'}
            </span>
          </div>
        )}
      </div>

      {/* Add button */}
      {isAdmin && (
        <button
          onClick={() => onAddTask(col.id)}
          className="m-3 mt-0 py-2.5 border-2 border-dashed border-outline/20 rounded-2xl text-[11px] font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          Add task
        </button>
      )}
    </div>
  );
}

// ─── Project Swim Lane ────────────────────────────────────────────────────────

function ProjectSwimLane({
  project,
  tasks,
  projectColorMap,
  onAddTask,
  onCardClick,
  onProjectClick,
  currentUserId,
  isAdmin,
}: {
  project: Project;
  tasks: Task[];
  projectColorMap: Map<string, string>;
  onAddTask: (status: Status, projectId: string) => void;
  onCardClick: (t: Task) => void;
  onProjectClick?: () => void;
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  const projectColor = projectColorMap.get(project.id) ?? PROJECT_COLORS[0];

  const byStatus = (status: Status) => tasks.filter(t => t.status === status);

  const miniCols: { status: Status; label: string }[] = [
    { status: 'pending',     label: 'Backlog' },
    { status: 'in-progress', label: 'In Progress' },
    { status: 'completed',   label: 'Done' },
  ];

  return (
    <div className="bg-surface-container-low border border-outline/10 rounded-3xl overflow-hidden">
      {/* Header */}
      <div 
         className="flex items-center justify-between px-6 py-4 border-b border-outline/10 cursor-pointer hover:bg-surface-container transition-colors"
         onClick={onProjectClick}
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-1 h-10 rounded-full', projectColor.split(' ')[0].replace('text-', 'bg-'))} />
          <div>
            <h3 className="text-base font-extrabold text-on-surface font-headline hover:text-primary transition-colors">{project.name}</h3>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] font-bold text-on-surface-variant opacity-50 uppercase tracking-widest">
                {project.progress}% Complete
              </span>
              <span className="text-[10px] font-bold text-on-surface-variant opacity-50">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini columns */}
      <div className="grid grid-cols-3 divide-x divide-outline/10 p-4 gap-4">
        {miniCols.map(c => {
          const colTasks = byStatus(c.status);
          return (
            <div key={c.status} className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">
                  {c.label}
                </span>
                <span className="text-[9px] font-bold text-on-surface-variant bg-surface-container-highest px-1.5 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>
              <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {colTasks.map(task => {
                  const isMuted = !isAdmin && !!currentUserId && task.assigned_to !== currentUserId;
                  const isReadOnly = !isAdmin && task.assigned_to !== currentUserId;
                  return <KanbanCard key={task.id} task={task} projectColorMap={projectColorMap} onClick={() => onCardClick(task)} isMuted={isMuted} isReadOnly={isReadOnly} />;
                })}
              </SortableContext>
              {colTasks.length === 0 && (
                <div className="text-center py-4 text-[10px] text-on-surface-variant opacity-30 font-bold uppercase tracking-widest">
                  Empty
                </div>
              )}
              {isAdmin && (
                <button
                  onClick={() => onAddTask(c.status, project.id)}
                  className="w-full py-2 border border-dashed border-outline/15 rounded-xl text-[10px] font-bold text-on-surface-variant hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-1"
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── Task List View ───────────────────────────────────────────────────────────

type SortCol = 'title' | 'status' | 'priority' | 'job_type' | 'due_date' | 'assigned_to' | 'created_at';

const STATUS_ORDER: Record<string, number> = {
  'pending': 0, 'in-progress': 1, 'awaiting': 2, 'ready': 3, 'failed': 4, 'overdue': 5, 'completed': 6,
};
const PRIORITY_ORDER: Record<string, number> = {
  'critical': 0, 'high': 1, 'medium': 2, 'low': 3,
};

const STATUS_LABEL: Record<string, string> = {
  'pending': 'Backlog', 'in-progress': 'In Progress', 'awaiting': 'Awaiting',
  'ready': 'Ready', 'failed': 'Failed', 'overdue': 'Overdue', 'completed': 'Done',
};

const STATUS_STYLE: Record<string, string> = {
  'pending':     'bg-surface-container-highest text-on-surface-variant',
  'in-progress': 'bg-secondary/10 text-secondary',
  'awaiting':    'bg-tertiary/10 text-tertiary',
  'ready':       'bg-[#34d399]/10 text-[#34d399]',
  'failed':      'bg-[#fb923c]/10 text-[#fb923c]',
  'overdue':     'bg-error/10 text-error',
  'completed':   'bg-primary/10 text-primary',
};

function TaskListView({
  tasks,
  contacts,
  profiles,
  projectColorMap,
  onRowClick,
}: {
  tasks: Task[];
  contacts: Contact[];
  profiles: Profile[];
  projectColorMap: Map<string, string>;
  onRowClick: (t: Task) => void;
}) {
  const [sortCol, setSortCol] = React.useState<SortCol>('due_date');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sorted = React.useMemo(() => {
    return [...tasks].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'title':       cmp = (a.title || '').localeCompare(b.title || ''); break;
        case 'status':      cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9); break;
        case 'priority':    cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9); break;
        case 'job_type':    cmp = (a.job_type || '').localeCompare(b.job_type || ''); break;
        case 'due_date':    cmp = (a.due_date || 'zzz').localeCompare(b.due_date || 'zzz'); break;
        case 'created_at':  cmp = (a.created_at || '').localeCompare(b.created_at || ''); break;
        case 'assigned_to': {
          const pA = profiles.find(p => p.id === a.assigned_to)?.full_name || '';
          const pB = profiles.find(p => p.id === b.assigned_to)?.full_name || '';
          cmp = pA.localeCompare(pB);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tasks, sortCol, sortDir, profiles]);

  const SortHeader = ({ col, label }: { col: SortCol; label: string }) => (
    <th
      onClick={() => handleSort(col)}
      className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant cursor-pointer select-none hover:text-on-surface transition-colors group"
    >
      <div className="flex items-center gap-1.5">
        {label}
        {sortCol === col ? (
          sortDir === 'asc' ? <ChevronUp size={11} className="text-primary" /> : <ChevronDown size={11} className="text-primary" />
        ) : (
          <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-40 transition-opacity" />
        )}
      </div>
    </th>
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-on-surface-variant/40">
        <List size={40} strokeWidth={1.5} />
        <p className="text-sm font-bold">No tasks match your filters</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-outline/10 overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-surface-container-high/60">
          <tr className="border-b border-outline/10">
            <SortHeader col="title" label="Task" />
            <SortHeader col="job_type" label="Type" />
            <SortHeader col="status" label="Status" />
            <SortHeader col="priority" label="Priority" />
            <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant">Contact</th>
            <SortHeader col="assigned_to" label="Assigned To" />
            <SortHeader col="due_date" label="Due" />
            <SortHeader col="created_at" label="Created" />
          </tr>
        </thead>
        <tbody className="divide-y divide-outline/5 bg-surface-container">
          {sorted.map(task => {
            const jc = getJobTypeColor(task.job_type || '');
            const contact = contacts.find(c => c.id === task.contact_id);
            const assignee = profiles.find(p => p.id === task.assigned_to);
            const due = task.due_date ? formatDate(task.due_date) : null;
            const isOverdue = due?.includes('overdue');
            return (
              <tr
                key={task.id}
                onClick={() => onRowClick(task)}
                className="hover:bg-surface-container-high transition-colors cursor-pointer group"
              >
                {/* Title */}
                <td className="px-4 py-3 max-w-xs">
                  <div className="flex items-center gap-2.5">
                    {task.urgent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0" title="Urgent" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-on-surface text-[13px] truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                      {task.registry_number && (
                        <p className="text-[10px] text-on-surface-variant opacity-60 font-mono">{task.registry_number}</p>
                      )}
                    </div>
                  </div>
                </td>
                {/* Job Type */}
                <td className="px-4 py-3">
                  {task.job_type ? (
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border', jc.badge)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', jc.dot)} />
                      {task.job_type}
                    </span>
                  ) : <span className="text-on-surface-variant/30 text-xs">—</span>}
                </td>
                {/* Status */}
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-extrabold', STATUS_STYLE[task.status])}>
                    {STATUS_LABEL[task.status] ?? task.status}
                  </span>
                </td>
                {/* Priority */}
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-extrabold border capitalize', PRIORITY_TEXT[task.priority as Priority])}>
                    {task.priority}
                  </span>
                </td>
                {/* Contact */}
                <td className="px-4 py-3">
                  {contact ? (
                    <div>
                      <p className="text-[12px] font-semibold text-on-surface truncate max-w-[120px]">{contact.name}</p>
                      {contact.company && <p className="text-[10px] text-on-surface-variant opacity-60 truncate max-w-[120px]">{contact.company}</p>}
                    </div>
                  ) : <span className="text-on-surface-variant/30 text-xs">—</span>}
                </td>
                {/* Assigned To */}
                <td className="px-4 py-3">
                  {assignee ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[9px] shrink-0">
                        {assignee.avatar_url
                          ? <img src={assignee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          : assignee.full_name?.charAt(0)}
                      </div>
                      <span className="text-[12px] font-semibold text-on-surface truncate max-w-[100px]">{assignee.full_name}</span>
                    </div>
                  ) : <span className="text-on-surface-variant/30 text-xs">—</span>}
                </td>
                {/* Due Date */}
                <td className="px-4 py-3">
                  {due ? (
                    <span className={cn('text-[12px] font-semibold', isOverdue ? 'text-error' : 'text-on-surface-variant')}>
                      {due}
                    </span>
                  ) : <span className="text-on-surface-variant/30 text-xs">—</span>}
                </td>
                {/* Created At */}
                <td className="px-4 py-3">
                  <span className="text-[12px] text-on-surface-variant">
                    {task.created_at
                      ? new Date(task.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Kanban Component ────────────────────────────────────────────────────

export default function Kanban({
  initialTasks,
  initialProjects,
  contacts,
  profiles = [],
  currentUserId,
  isAdmin = false,
}: {
  initialTasks: Task[];
  initialProjects: Project[];
  contacts: Contact[];
  profiles?: Profile[];
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks);
  const [layoutMode, setLayoutMode] = React.useState<'board' | 'list'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('views_layoutMode') as 'board' | 'list') ?? 'board';
    return 'board';
  });
  const [view, setView] = React.useState<'status' | 'project'>('status');
  const [projectFilter, setProjectFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<Priority | 'all'>('all');
  const [jobTypeFilter, setJobTypeFilter] = React.useState<string>('all');
  const [assignedOnly, setAssignedOnly] = React.useState(false);

  const switchLayout = (mode: 'board' | 'list') => {
    setLayoutMode(mode);
    localStorage.setItem('views_layoutMode', mode);
  };

  React.useEffect(() => {
    const stored = localStorage.getItem('kanban_assignedOnly');
    if (stored !== null) setAssignedOnly(stored === 'true');
  }, []);
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
  const dragStartStatus = React.useRef<Status | null>(null);
  const { openIntake } = useTaskIntake();
  const { showToast } = useToast();

  // Build a stable project→color map
  const projectColorMap = React.useMemo(() => {
    const map = new Map<string, string>();
    initialProjects.forEach((p, i) => {
      map.set(p.id, PROJECT_COLORS[i % PROJECT_COLORS.length]);
    });
    return map;
  }, [initialProjects]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Sorted job types from available tasks
  const availableJobTypes = React.useMemo(() => {
    const types = new Set<string>();
    tasks.forEach(t => { if (t.job_type) types.add(t.job_type); });
    return Array.from(types).sort();
  }, [tasks]);

  // Filtered task list
  const filteredTasks = React.useMemo(() => tasks.filter(t => {
    if (projectFilter !== 'all' && t.project_id !== projectFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (jobTypeFilter !== 'all' && t.job_type !== jobTypeFilter) return false;
    if (assignedOnly && currentUserId && t.assigned_to !== currentUserId) return false;
    return true;
  }), [tasks, projectFilter, priorityFilter, jobTypeFilter, assignedOnly, currentUserId]);

  const tasksByStatus = React.useMemo(() => {
    const map = new Map<Status, Task[]>();
    COLUMNS.forEach(c => map.set(c.id, []));
    filteredTasks.forEach(t => map.get(t.status)?.push(t));
    return map;
  }, [filteredTasks]);

  // DnD handlers
  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task ?? null);
    dragStartStatus.current = task?.status ?? null;
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeId = active.id as string;
    const overId   = over.id as string;
    if (activeId === overId) return;

    const draggingTask = tasks.find(t => t.id === activeId);
    if (!draggingTask) return;

    // Case 1: dragged directly over a column droppable
    const targetCol = COLUMNS.find(c => c.id === overId);
    if (targetCol) {
      if (draggingTask.status !== targetCol.id) {
        setTasks(prev => prev.map(t =>
          t.id === activeId ? { ...t, status: targetCol.id } : t
        ));
      }
      return;
    }

    // Case 2: dragged over a sibling card — move to that card's column
    const overTask = tasks.find(t => t.id === overId);
    if (overTask && overTask.status !== draggingTask.status) {
      setTasks(prev => prev.map(t =>
        t.id === activeId ? { ...t, status: overTask.status } : t
      ));
    }
  };

  const handleDragEnd = async ({ active }: DragEndEvent) => {
    setActiveTask(null);
    const activeId = active.id as string;
    const finalTask = tasks.find(t => t.id === activeId);
    if (!finalTask) return;

    // Persist only if status actually changed from what it was at drag start
    if (finalTask.status !== dragStartStatus.current) {
      const originalStatus = dragStartStatus.current!;

      try {
        await updateTask(activeId, { status: finalTask.status });
        if (finalTask.status === 'completed' && originalStatus !== 'completed') {
          showToast('Task Completed', 'Ready to proceed to the next step', 'success');
        }
      } catch {
        setTasks(prev => prev.map(t =>
          t.id === activeId ? { ...t, status: originalStatus } : t
        ));
      }
    }
    dragStartStatus.current = null;
  };

  const handleTaskAdded = (task: Task) => {
    setTasks(prev => [task, ...prev]);
  };

  const handleTaskUpdated = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTask(null);
  };

  const handleTaskDeleted = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTask(null);
  };

  // Filter bar
  const filterBar = (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Project filter */}
      <div className="relative">
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="appearance-none bg-surface-container-low border border-outline/20 rounded-xl pl-4 pr-8 py-2 text-[11px] font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
        >
          <option value="all">All Projects</option>
          {initialProjects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
      </div>

      {/* Priority filter */}
      <div className="relative">
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value as Priority | 'all')}
          className="appearance-none bg-surface-container-low border border-outline/20 rounded-xl pl-4 pr-8 py-2 text-[11px] font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
      </div>

      {/* Job Type filter — colored pill buttons */}
      {availableJobTypes.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setJobTypeFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border transition-all',
              jobTypeFilter === 'all'
                ? 'bg-surface-container-highest text-on-surface border-outline/40'
                : 'text-on-surface-variant border-outline/20 hover:border-outline/40 hover:text-on-surface'
            )}
          >
            All Types
          </button>
          {availableJobTypes.map(j => {
            const jc = getJobTypeColor(j);
            const active = jobTypeFilter === j;
            return (
              <button
                key={j}
                onClick={() => setJobTypeFilter(active ? 'all' : j)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border transition-all',
                  active ? jc.badge : 'text-on-surface-variant border-outline/20 hover:border-outline/40 hover:text-on-surface'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', active ? jc.dot : 'bg-on-surface-variant/30')} />
                {j}
              </button>
            );
          })}
        </div>
      )}

      <div className="h-5 w-px bg-outline/20" />
      <span className="text-[11px] font-bold text-on-surface-variant opacity-50">
        {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
      </span>
    </div>
  );

  return (
    <>
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projects={initialProjects}
          contacts={contacts}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
          isReadOnly={!isAdmin && selectedTask.assigned_to !== currentUserId}
        />
      )}

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          contacts={contacts}
          profiles={profiles}
          isAdmin={isAdmin}
          onClose={() => setSelectedProject(null)}
        />
      )}

      <div className="space-y-8">
        {/* Page header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold text-on-surface tracking-tight font-headline mb-2">
                Views
              </h1>
              <p className="text-on-surface-variant text-base font-medium flex items-center gap-2">
                {layoutMode === 'board' ? 'Drag tasks across columns to update their status.' : 'Browse all tasks in a sortable list.'}
                <span className="w-1.5 h-1.5 rounded-full bg-outline/40 mx-2" />
                <span className="text-primary font-bold">
                  {tasks.filter(t => t.job_type === 'Repair' && t.status !== 'completed').length} Repairs
                </span>
                <span className="text-on-surface-variant/40">&bull;</span>
                <span className="text-[#34d399] font-bold">
                  {tasks.filter(t => t.job_type === 'Delivery' && t.status !== 'completed').length} Deliveries
                </span>
                <span className="text-on-surface-variant ml-1 font-normal opacity-70">pending</span>
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Board / List toggle */}
              <div className="flex items-center bg-surface-container-high rounded-xl border border-outline/20 p-0.5">
                <button
                  onClick={() => switchLayout('board')}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all', layoutMode === 'board' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
                >
                  <LayoutGrid size={13} /> Board
                </button>
                <button
                  onClick={() => switchLayout('list')}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all', layoutMode === 'list' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
                >
                  <List size={13} /> List
                </button>
              </div>

              {/* Assigned to Me toggle */}
                <div className="flex items-center bg-surface-container-high rounded-xl border border-outline/20 p-0.5">
                  <button
                    onClick={() => { setAssignedOnly(false); localStorage.setItem('kanban_assignedOnly', 'false'); }}
                    className={cn('px-3 py-2 rounded-lg text-xs font-bold transition-all', !assignedOnly ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
                  >All Tasks</button>
                  <button
                    onClick={() => { setAssignedOnly(true); localStorage.setItem('kanban_assignedOnly', 'true'); }}
                    className={cn('px-3 py-2 rounded-lg text-xs font-bold transition-all', assignedOnly ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
                  >Assigned to Me</button>
                </div>

              {/* New Task */}
              <button
                onClick={() => openIntake()}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dim transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus size={16} /> New Task
              </button>

            </div>
          </div>

          {filterBar}
        </div>

        {/* Board or List */}
        {layoutMode === 'list' ? (
          <TaskListView
            tasks={filteredTasks}
            contacts={contacts}
            profiles={profiles}
            projectColorMap={projectColorMap}
            onRowClick={setSelectedTask}
          />
        ) : (
        <DndContext
          id="kanban-board-dnd"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {view === 'status' ? (
            // ── By Status: Fixed height horizontal scroll container ──────────────────────────
            <div className="flex gap-5 items-stretch overflow-x-auto pb-4 custom-scrollbar h-[calc(100vh-280px)] min-h-[500px]">
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  tasks={tasksByStatus.get(col.id) ?? []}
                  projectColorMap={projectColorMap}
                  onAddTask={(status) => openIntake({ status })}
                  onCardClick={setSelectedTask}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          ) : (
            // ── By Project: swim lanes ────────────────────────────────────────
            <div className="space-y-5">
              {initialProjects
                .filter(p => projectFilter === 'all' || p.id === projectFilter)
                .map(project => {
                  const projectTasks = filteredTasks.filter(t => t.project_id === project.id);
                  return (
                    <ProjectSwimLane
                      key={project.id}
                      project={project}
                      tasks={projectTasks}
                      projectColorMap={projectColorMap}
                      onAddTask={(status, projectId) => openIntake({ status, projectId })}
                      onCardClick={setSelectedTask}
                      onProjectClick={() => setSelectedProject(project)}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                    />
                  );
                })}

              {/* Tasks with no project */}
              {(() => {
                const orphans = filteredTasks.filter(t => !t.project_id);
                if (orphans.length === 0) return null;
                return (
                  <div className="bg-surface-container-low border border-outline/10 rounded-3xl overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-outline/10">
                      <div className="w-1 h-10 rounded-full bg-on-surface-variant/20" />
                      <h3 className="text-base font-extrabold text-on-surface-variant">Unassigned</h3>
                      <span className="text-[10px] font-bold text-on-surface-variant opacity-50">{orphans.length} tasks</span>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-4">
                      {(['pending', 'in-progress', 'completed'] as Status[]).map(s => (
                        <div key={s} className="space-y-2">
                          <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest mb-2">
                            {s === 'pending' ? 'Backlog' : s === 'in-progress' ? 'In Progress' : 'Done'}
                          </p>
                          {orphans.filter(t => t.status === s).map(task => (
                            <KanbanCard key={task.id} task={task} projectColorMap={projectColorMap} onClick={() => setSelectedTask(task)} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Drag overlay — ghost card that follows cursor */}
          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeTask && (
              <KanbanCard task={activeTask} projectColorMap={projectColorMap} isDragOverlay />
            )}
          </DragOverlay>
        </DndContext>
        )}
      </div>
    </>
  );
}
