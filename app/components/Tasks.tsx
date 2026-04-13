'use client';

import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Folder,
  Zap,
  Plus,
  ArrowRight,
  User,
  Sparkles,
  Trash2,
  Hash,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, Priority, Project, Contact, Status } from '@/lib/types';
import { createTask, updateTask, deleteTask } from '@/lib/actions/tasks';
import TaskModal from './TaskModal';
import { useTaskIntake } from '@/lib/contexts/TaskIntakeContext';
import { useToast } from '@/lib/contexts/ToastContext';

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];

// ─── Task Row Component ────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === 'critical') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 text-error font-bold text-[9px] uppercase tracking-widest border border-error/10">
        <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" /> Critical
      </div>
    );
  }
  if (priority === 'high') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-[9px] uppercase tracking-widest border border-primary/10">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" /> High
      </div>
    );
  }
  if (priority === 'medium') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-highest/30 text-on-surface-variant font-bold text-[9px] uppercase tracking-widest border border-outline-variant/10">
        <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant" /> Normal
      </div>
    );
  }
  return null;
}

function StatusBadge({ status }: { status: Status }) {
  if (status === 'overdue') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 text-error font-bold text-[9px] uppercase tracking-widest border border-error/10">
        <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" /> Overdue
      </div>
    );
  }
  if (status === 'in-progress') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-[9px] uppercase tracking-widest border border-primary/10">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" /> In Progress
      </div>
    );
  }
  return null;
}

function TaskRow({ 
  task, 
  dateLabel, 
  showStatusBadge = false, 
  onToggle, 
  onDelete, 
  onClick,
  isMuted = false,
  isReadOnly = false
}: { 
  task: Task; 
  dateLabel: string | React.ReactNode; 
  showStatusBadge?: boolean; 
  onToggle: (task: Task) => void; 
  onDelete: (id: string) => void; 
  onClick: (task: Task) => void;
  isMuted?: boolean;
  isReadOnly?: boolean;
}) {
  return (
    <div
      className={cn(
        'group flex items-center justify-between bg-surface-container-low rounded-2xl border border-outline-variant/10 hover:border-primary/20 transition-all shadow-sm hover:shadow-md',
        task.status === 'completed' && 'opacity-50',
        isMuted && "opacity-40 grayscale saturate-0"
      )}
    >
      <div 
        className="flex-1 flex items-center justify-between gap-4 p-5 cursor-pointer"
        onClick={() => onClick(task)}
      >
        <div className="flex items-center gap-5">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(task); }}
            className={cn(
              'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors',
              task.status === 'completed'
                ? 'bg-primary border-primary'
                : task.priority === 'critical'
                ? 'border-error/40 hover:border-primary'
                : 'border-outline-variant hover:border-primary'
            )}
          >
            {task.status === 'completed' && <CheckCircle2 size={14} className="text-on-primary" />}
          </button>
          <div>
            <h3 className={cn('font-bold text-on-surface group-hover:text-primary transition-colors', task.status === 'completed' && 'line-through')}>
              {task.title}
            </h3>
            <div className="text-xs text-on-surface-variant flex items-center flex-wrap gap-2 mt-1 font-medium">
              {task.project
                ? <span className="flex items-center gap-1.5"><Folder size={12} /> {task.project.name}</span>
                : task.contact
                ? <span className="flex items-center gap-1.5"><User size={12} /> {task.contact.name}</span>
                : null}
              {(task.registry_number || task.job_type) && (
                <div className="flex items-center gap-1.5">
                  {task.project || task.contact ? <span className="text-outline-variant/30">•</span> : null}
                  {task.registry_number && (
                    <span className="px-1.5 py-0.5 rounded bg-surface-container text-[9px] font-extrabold uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                      <Hash size={10} />{task.registry_number}
                    </span>
                  )}
                  {task.job_type && (
                    <span className="px-1.5 py-0.5 rounded bg-surface-container text-[9px] font-extrabold uppercase tracking-widest text-on-surface-variant flex items-center gap-1 truncate max-w-[100px]">
                      <Briefcase size={10} />{task.job_type}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {showStatusBadge ? (
            <StatusBadge status={task.status} />
          ) : (
            <PriorityBadge priority={task.priority} />
          )}
          {showStatusBadge && task.status !== 'overdue' && task.status !== 'in-progress' && (
            <PriorityBadge priority={task.priority} />
          )}
          {dateLabel && (
            <span className="text-[11px] font-bold text-on-surface-variant/70 uppercase">
              {dateLabel}
            </span>
          )}
          {!isReadOnly && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Tasks({ 
  initialTasks, 
  projects, 
  contacts,
  currentUserId,
  isAdmin = false
}: { 
  initialTasks: Task[]; 
  projects: Project[]; 
  contacts: Contact[];
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks || []);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [assignedOnly, setAssignedOnly] = React.useState(false);
  const { openIntake } = useTaskIntake();
  const { showToast } = useToast();

  React.useEffect(() => {
    setTasks(initialTasks || []);
  }, [initialTasks]);

  React.useEffect(() => {
    const stored = localStorage.getItem('tasks_assignedOnly');
    if (stored !== null) setAssignedOnly(stored === 'true');
  }, []);

  const handleToggle = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    try {
      await updateTask(task.id, { status: newStatus });
      if (newStatus === 'completed') {
        showToast('Task Completed', 'Ready to proceed to the next step', 'success');
      }
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  const handleDelete = async (id: string) => {
    const previous = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== id));
    
    try {
      await deleteTask(id);
      if (selectedTask?.id === id) {
        setSelectedTask(null);
      }
    } catch {
      setTasks(previous);
    }
  };

  const handleTaskUpdated = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTask(null);
  };

  const isToday = (iso?: string | null): boolean => {
    if (!iso) return false;
    return new Date(iso).toDateString() === new Date().toDateString();
  };

  const isUpcoming = (iso?: string | null): boolean => {
    if (!iso) return false;
    const d = new Date(iso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d > today && !isToday(iso);
  };

  const visibleTasks = React.useMemo(() => {
    return tasks.filter(t => {
      if (assignedOnly && currentUserId && t.assigned_to !== currentUserId) return false;
      return true;
    });
  }, [tasks, assignedOnly, currentUserId]);

  const todayTasks     = visibleTasks.filter(t => t.status !== 'completed' && isToday(t.due_date));
  const upcomingTasks  = visibleTasks.filter(t => t.status !== 'completed' && isUpcoming(t.due_date));
  const allOtherTasks  = visibleTasks.filter(t => t.status !== 'completed' && !isToday(t.due_date) && !isUpcoming(t.due_date));
  const completedTasks = visibleTasks.filter(t => t.status === 'completed');

  return (
    <>
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projects={projects}
          contacts={contacts}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleDelete}
          isReadOnly={!isAdmin && selectedTask.assigned_to !== currentUserId}
        />
      )}
      
      <div className="flex h-[calc(100vh-10rem)] overflow-hidden bg-background -mx-10 -mb-12">
      <section className="flex-1 overflow-y-auto custom-scrollbar p-12 lg:p-16">
        <div className="max-w-4xl mx-auto">
          <header className="mb-14">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-5xl font-extrabold tracking-tight text-on-surface font-headline">My Landscape</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-surface-container-high rounded-xl border border-outline/20 p-0.5">
                  <button
                    onClick={() => { setAssignedOnly(false); localStorage.setItem('tasks_assignedOnly', 'false'); }}
                    className={cn('px-3 py-2 rounded-lg text-xs font-bold transition-all', !assignedOnly ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
                  >All Tasks</button>
                  <button
                    onClick={() => { setAssignedOnly(true); localStorage.setItem('tasks_assignedOnly', 'true'); }}
                    className={cn('px-3 py-2 rounded-lg text-xs font-bold transition-all', assignedOnly ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
                  >Assigned to Me</button>
                </div>
                <button
                  onClick={() => openIntake()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dim transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus size={16} /> New Task
                </button>
              </div>
            </div>
            <p className="text-on-surface-variant text-base font-medium">
              {visibleTasks.length} task{visibleTasks.length !== 1 ? 's' : ''} total •{' '}
              <span className="text-primary font-bold">
                {visibleTasks.filter(t => t.priority === 'critical').length} critical focus item{visibleTasks.filter(t => t.priority === 'critical').length !== 1 ? 's' : ''}
              </span>
            </p>
          </header>

          <div className="space-y-16">
            <div className="task-group">
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl font-bold tracking-tight font-headline">Today</h2>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-widest border border-primary/20">{todayTasks.length} Pending</span>
              </div>
              <div className="space-y-4">
                {todayTasks.length === 0 ? (
                  <p className="text-sm text-on-surface-variant opacity-50 py-4">No tasks due today. Use Quick Entry to add one →</p>
                ) : (
                  todayTasks.map((task) => {
                    const isMuted = !isAdmin && !!currentUserId && task.assigned_to !== currentUserId;
                    const isReadOnly = !isAdmin && task.assigned_to !== currentUserId;
                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        dateLabel={task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today'}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        onClick={setSelectedTask}
                        isMuted={isMuted}
                        isReadOnly={isReadOnly}
                      />
                    );
                  })
                )}
              </div>
            </div>
            
            <div className="task-group">
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl font-bold tracking-tight font-headline">Upcoming</h2>
                <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-extrabold uppercase tracking-widest border border-outline/20">{upcomingTasks.length} Scheduled</span>
              </div>
              <div className="space-y-4">
                {upcomingTasks.length === 0 ? (
                  <p className="text-sm text-on-surface-variant opacity-50 py-4">No upcoming tasks scheduled. Great job staying ahead!</p>
                ) : (
                  upcomingTasks.map((task) => {
                    const isMuted = !isAdmin && !!currentUserId && task.assigned_to !== currentUserId;
                    const isReadOnly = !isAdmin && task.assigned_to !== currentUserId;
                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        dateLabel={task.due_date ? new Date(task.due_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        onClick={setSelectedTask}
                        isMuted={isMuted}
                        isReadOnly={isReadOnly}
                      />
                    );
                  })
                )}
              </div>
            </div>

            <div className="task-group">
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl font-bold tracking-tight font-headline">All Tasks</h2>
                <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-extrabold uppercase tracking-widest border border-outline/20">{allOtherTasks.length} Total</span>
              </div>
              <div className="space-y-4">
                {allOtherTasks.length === 0 ? (
                  <p className="text-sm text-on-surface-variant opacity-50 py-4">All tasks are scheduled in Today or Upcoming.</p>
                ) : (
                  allOtherTasks.map((task) => {
                    const isMuted = !isAdmin && !!currentUserId && task.assigned_to !== currentUserId;
                    const isReadOnly = !isAdmin && task.assigned_to !== currentUserId;
                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        dateLabel={task.due_date ? new Date(task.due_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'No date'}
                        showStatusBadge
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        onClick={setSelectedTask}
                        isMuted={isMuted}
                        isReadOnly={isReadOnly}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {completedTasks.length > 0 && (
              <div className="task-group">
                <div className="flex items-center gap-4 mb-8 text-on-surface-variant opacity-60">
                  <h2 className="text-2xl font-bold tracking-tight font-headline">Completed</h2>
                  <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-extrabold uppercase tracking-widest border border-outline/20">{completedTasks.length} Done</span>
                </div>
                <div className="space-y-4">
                  {completedTasks.map((task) => {
                    const isMuted = !isAdmin && !!currentUserId && task.assigned_to !== currentUserId;
                    const isReadOnly = !isAdmin && task.assigned_to !== currentUserId;
                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        dateLabel={task.due_date ? new Date(task.due_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'No date'}
                        showStatusBadge
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        onClick={setSelectedTask}
                        isMuted={isMuted}
                        isReadOnly={isReadOnly}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
