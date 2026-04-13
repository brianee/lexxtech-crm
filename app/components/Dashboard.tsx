'use client';

import React from 'react';
import {
  TrendingUp,
  Folder,
  Calendar,
  Users,
  CheckCircle2,
  ArrowRight,
  CheckCircle,
  UserPlus,
  FolderPlus,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import type { Task, Contact, Project } from '@/lib/types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

type ActivityItem = {
  id: string;
  type: 'task_done' | 'task_new' | 'contact' | 'project';
  title: string;
  time: string;
  raw: string;
};

function buildActivity(tasks: Task[], contacts: Contact[], projects: Project[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  tasks.forEach(t => {
    if (t.status === 'completed') {
      items.push({ id: `td-${t.id}`, type: 'task_done', title: `Completed "${t.title}"`, time: timeAgo(t.updated_at), raw: t.updated_at });
    } else {
      items.push({ id: `tn-${t.id}`, type: 'task_new', title: `Added task "${t.title}"`, time: timeAgo(t.created_at), raw: t.created_at });
    }
  });

  contacts.forEach(c => {
    items.push({ id: `c-${c.id}`, type: 'contact', title: `Added contact ${c.name}`, time: timeAgo(c.created_at), raw: c.created_at });
  });

  projects.forEach(p => {
    items.push({ id: `p-${p.id}`, type: 'project', title: `Created project "${p.name}"`, time: timeAgo(p.created_at), raw: p.created_at });
  });

  return items.sort((a, b) => new Date(b.raw).getTime() - new Date(a.raw).getTime()).slice(0, 8);
}

export default function Dashboard({ 
  initialTasks, 
  initialContacts,
  initialProjects,
  activeProjectCount,
  userName = '',
}: { 
  initialTasks: Task[]; 
  initialContacts: Contact[];
  initialProjects: Project[];
  activeProjectCount: number;
  userName?: string;
}) {
  const [chartRange, setChartRange] = React.useState<'7d' | '30d'>('7d');

  const tasks = initialTasks || [];
  const contacts = initialContacts || [];
  const projects = initialProjects || [];
  const projectCount = activeProjectCount || 0;

  const activityFeed = React.useMemo(() => buildActivity(tasks, contacts, projects), [tasks, contacts, projects]);

  const chartData = React.useMemo(() => {
    const data = [];
    const daysCount = chartRange === '7d' ? 7 : 30;
    const now = new Date();
    
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      
      const completedOnDay = tasks.filter(t => {
        if (t.status !== 'completed') return false;
        const taskDate = new Date(t.updated_at);
        return taskDate.getDate() === d.getDate() && taskDate.getMonth() === d.getMonth() && taskDate.getFullYear() === d.getFullYear();
      }).length;

      data.push({
        label: chartRange === '7d' ? d.toLocaleDateString('en-US', { weekday: 'short' }) : d.getDate().toString(),
        count: completedOnDay,
        active: i === 0, 
      });
    }

    const maxCount = Math.max(...data.map(d => d.count), 5); // baseline 5

    return data.map(d => ({
      ...d,
      percentage: Math.max((d.count / maxCount) * 100, 2)
    }));
  }, [tasks, chartRange]);

  const isToday = (iso?: string | null): boolean => {
    if (!iso) return false;
    return new Date(iso).toDateString() === new Date().toDateString();
  };

  const todayTasks = tasks.filter(t => isToday(t.due_date) && t.status !== 'completed');
  const highPriorityCount = tasks.filter(t => t.priority === 'high' || t.priority === 'critical').length;
  const topPriorityTasks = tasks.filter(t => t.priority === 'critical' || t.priority === 'high').slice(0, 3);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-extrabold text-on-surface leading-tight tracking-tight mb-3 font-headline">
            {getGreeting()}{userName ? `, ${userName}` : ''}.
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl font-medium">
            You have{' '}
            <span className="text-primary font-bold">{highPriorityCount} high-priority task{highPriorityCount !== 1 ? 's' : ''}</span>{' '}
            to focus on today. {todayTasks.length > 0 && (
              <><span className="text-primary font-bold">{todayTasks.length} task{todayTasks.length !== 1 ? 's' : ''}</span> due today.</>
            )}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container rounded-3xl p-7 transition-all hover:bg-surface-container-high border border-outline/20 group cursor-default">
          <div className="flex justify-between items-start mb-8">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
              <Folder size={22} fill="currentColor" fillOpacity={0.2} />
            </div>
            <span className="text-[10px] font-extrabold text-primary px-3 py-1 bg-primary/10 rounded-full uppercase tracking-wider border border-primary/10">Active</span>
          </div>
          <p className="text-on-surface-variant text-[10px] font-extrabold uppercase tracking-[0.15em] mb-1 opacity-70">Active Projects</p>
          <h3 className="text-4xl font-extrabold text-on-surface tracking-tight">{projectCount}</h3>
        </div>

        <div className="bg-surface-container rounded-3xl p-7 transition-all hover:bg-surface-container-high border border-outline/20 group cursor-default">
          <div className="flex justify-between items-start mb-8">
            <div className="w-11 h-11 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary group-hover:bg-tertiary group-hover:text-on-primary transition-all duration-300">
              <Calendar size={22} fill="currentColor" fillOpacity={0.2} />
            </div>
            {todayTasks.length > 0 && (
              <span className="text-[10px] font-extrabold text-error px-3 py-1 bg-error/10 rounded-full uppercase tracking-wider border border-error/10">{todayTasks.length} today</span>
            )}
          </div>
          <p className="text-on-surface-variant text-[10px] font-extrabold uppercase tracking-[0.15em] mb-1 opacity-70">Tasks Due Today</p>
          <h3 className="text-4xl font-extrabold text-on-surface tracking-tight">{String(todayTasks.length).padStart(2, '0')}</h3>
        </div>

        <div className="bg-surface-container rounded-3xl p-7 transition-all hover:bg-surface-container-high border border-outline/20 group cursor-default">
          <div className="flex justify-between items-start mb-8">
            <div className="w-11 h-11 rounded-xl bg-on-surface-variant/10 flex items-center justify-center text-on-surface-variant group-hover:bg-on-surface-variant group-hover:text-on-primary transition-all duration-300">
              <Users size={22} fill="currentColor" fillOpacity={0.2} />
            </div>
            <span className="text-[10px] font-extrabold text-on-surface-variant px-3 py-1 bg-surface-container-high rounded-full uppercase tracking-wider border border-outline/30">Network</span>
          </div>
          <p className="text-on-surface-variant text-[10px] font-extrabold uppercase tracking-[0.15em] mb-1 opacity-70">Total Contacts</p>
          <h3 className="text-4xl font-extrabold text-on-surface tracking-tight">{contacts.length}</h3>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Weekly Task Progress */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container rounded-3xl p-8 border border-outline/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
            <div>
              <h2 className="text-xl font-bold mb-1 flex items-center gap-2 font-headline">
                Weekly Task Progress
                <TrendingUp size={18} className="text-primary" />
              </h2>
              <p className="text-sm text-on-surface-variant font-medium">Your task completion overview for this week.</p>
            </div>
            <div className="flex bg-surface-container-lowest p-1 rounded-xl border border-outline/30">
              <button 
                onClick={() => setChartRange('7d')}
                className={cn("px-4 py-1.5 text-[10px] font-extrabold rounded-lg transition-all uppercase tracking-wider", chartRange === '7d' ? "bg-primary text-on-primary shadow-sm shadow-primary/10" : "text-on-surface-variant hover:text-on-surface")}
              >7D</button>
              <button 
                onClick={() => setChartRange('30d')}
                className={cn("px-4 py-1.5 text-[10px] font-extrabold rounded-lg transition-all uppercase tracking-wider", chartRange === '30d' ? "bg-primary text-on-primary shadow-sm shadow-primary/10" : "text-on-surface-variant hover:text-on-surface")}
              >30D</button>
            </div>
          </div>

          <div className="px-2 mt-8">
            <div className="h-48 relative z-10 w-full mt-4">
              {/* Grid Lines */}
              <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute bottom-[100%] w-full border-t border-outline/10 text-[9px] font-extrabold text-on-surface-variant/40 uppercase tracking-[0.2em]">
                  <span className="absolute bottom-1">Target Threshold</span>
                </div>
                <div className="absolute bottom-[75%] w-full border-t border-outline/10 text-[9px] font-extrabold text-on-surface-variant/40 uppercase tracking-[0.2em]">
                  <span className="absolute bottom-1">75% Capacity</span>
                </div>
                <div className="absolute bottom-[50%] w-full border-t border-outline/10 text-[9px] font-extrabold text-on-surface-variant/40 uppercase tracking-[0.2em]">
                  <span className="absolute bottom-1">50% Performance</span>
                </div>
                <div className="absolute bottom-[25%] w-full border-t border-outline/10 text-[9px] font-extrabold text-on-surface-variant/40 uppercase tracking-[0.2em]">
                  <span className="absolute bottom-1">25% Baseline</span>
                </div>
              </div>

              {/* Bars */}
              <div className={cn("absolute inset-0 flex items-end justify-between z-10", chartRange === '7d' ? 'gap-4' : 'gap-1')}>
                {chartData.map((item, i) => (
                  <div key={i} className="flex-1 w-full bg-primary/5 rounded-t-xl h-full relative overflow-hidden group" title={`${item.count} tasks completed`}>
                    <div className="absolute bottom-0 w-full bg-primary/20 transition-all group-hover:bg-primary/30" style={{ height: `${item.percentage}%` }}></div>
                    <div className="absolute bottom-0 w-full bg-primary transition-all group-hover:opacity-80 rounded-t-sm shadow-[0_-4px_15px_rgba(33,178,37,0.3)]" style={{ height: `${item.percentage}%` }}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Labels */}
            <div className={cn("flex justify-between mt-5 relative z-10", chartRange === '7d' ? 'gap-4' : 'gap-1')}>
              {chartData.map((item, i) => (
                <div key={i} className="flex-1 flex justify-center">
                  <span className={cn('text-[10px] font-bold uppercase tracking-widest text-center', item.active ? 'text-on-surface border-b-2 border-primary pb-1' : 'text-on-surface-variant/60')}>
                    {chartRange === '30d' && i % Math.ceil(30 / 5) !== 0 && !item.active ? '' : item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Priorities */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container rounded-3xl p-8 border border-outline/20 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold font-headline">Top Priorities</h2>
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] px-2.5 py-1 bg-primary/10 rounded-md border border-primary/10">Today</span>
          </div>
          <div className="space-y-3.5 flex-1">
            {topPriorityTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
                <CheckCircle2 size={32} className="text-primary opacity-50" />
                <p className="text-sm font-medium text-on-surface-variant text-center">No high-priority tasks.<br />You&apos;re all caught up!</p>
              </div>
            ) : (
              topPriorityTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-high/50 border border-outline/20 hover:border-primary/40 transition-all group cursor-pointer">
                  <div className="w-6 h-6 rounded-full border-2 border-primary/40 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                    <CheckCircle2 size={14} className="text-primary group-hover:text-on-primary scale-0 group-hover:scale-100 transition-transform" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-on-surface">{task.title}</p>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wide opacity-70">
                      {task.project?.name || 'No project'} • {task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today'}
                    </p>
                  </div>
                  {task.priority === 'critical' && (
                    <span className="w-2 h-2 rounded-full bg-error animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.4)]"></span>
                  )}
                </div>
              ))
            )}
          </div>
          <Link href="/tasks" className="w-full mt-8 py-3.5 text-xs font-bold text-on-surface-variant hover:text-primary transition-all flex items-center justify-center gap-2 group">
            View Complete Taskboard
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Relationship Proximity */}
      <div className="bg-surface-container-low rounded-3xl p-10 overflow-hidden relative border border-outline/20">
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3.5 py-1.5 bg-primary text-on-primary text-[10px] font-extrabold rounded-full tracking-[0.2em] uppercase shadow-lg shadow-primary/20">Deep Curation</span>
                <span className="text-on-surface-variant/60 text-[11px] font-bold uppercase tracking-widest">Last 30-90 Days</span>
              </div>
              <h2 className="text-3xl font-extrabold mb-4 tracking-tight font-headline">Relationship Proximity</h2>
              <p className="text-on-surface-variant leading-relaxed text-lg font-medium opacity-90">
                {contacts.length === 0
                  ? "Add your first contacts to start tracking your relationships and stay top-of-mind."
                  : "We've identified key contacts you haven't reached out to recently. A quick message can maintain valuable momentum in your network."}
              </p>
              <div className="mt-10 flex items-center gap-8">
                <div className="flex -space-x-3.5">
                  {contacts.slice(0, 3).map((contact) => (
                    <div
                      key={contact.id}
                      title={contact.name}
                      className="w-11 h-11 rounded-full border-2 border-surface-container-low bg-primary/10 text-primary flex items-center justify-center font-black text-sm cursor-pointer shadow-sm hover:scale-105 transition-transform"
                    >
                      {contact.avatar 
                        ? <img src={contact.avatar} alt={contact.name} className="w-full h-full rounded-full object-cover" />
                        : contact.name.charAt(0)
                      }
                    </div>
                  ))}
                  {contacts.length > 3 && (
                    <div className="w-11 h-11 rounded-full bg-surface-container-high border-2 border-surface-container-low flex items-center justify-center text-[10px] font-extrabold text-on-surface-variant">+{contacts.length - 3}</div>
                  )}
                </div>
                <Link href="/contacts" className="text-primary font-bold text-[13px] hover:text-primary-dim transition-colors flex items-center gap-2 group">
                  Manage Active Outreach
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rotate-[-45deg]" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-5 w-full lg:w-auto">
              {contacts.slice(0, 2).map((contact) => (
                <div key={contact.id} className="bg-surface-container-high/60 backdrop-blur-sm p-5 rounded-2xl flex items-center gap-4 border border-outline/20 group hover:border-primary/40 transition-all cursor-pointer min-w-[300px] shadow-sm">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full ring-2 ring-error/20 group-hover:ring-primary/40 transition-all overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-black text-base">
                      {contact.avatar
                        ? <img alt={contact.name} className="w-full h-full object-cover" src={contact.avatar} />
                        : contact.name.charAt(0)
                      }
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-error rounded-full border-2 border-surface-container-high flex items-center justify-center shadow-lg">
                      <AlertCircle size={10} className="text-white font-bold" />
                    </span>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-on-surface">{contact.name}</p>
                    <p className="text-[11px] text-on-surface-variant/80 font-medium">
                      {contact.last_interaction ? new Date(contact.last_interaction).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recently'}
                    </p>
                  </div>
                  <Link href="/contacts" className="ml-auto w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-on-primary">
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
      </div>

      {/* Real System Activity */}
      <div className="bg-surface-container rounded-3xl p-8 border border-outline/20">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-xl font-bold font-headline">System Activity</h2>
          <Link href="/insights" className="text-[11px] font-bold text-primary hover:bg-primary/5 px-4 py-2 rounded-lg transition-all uppercase tracking-widest border border-primary/20">Full Logs</Link>
        </div>
        {activityFeed.length === 0 ? (
          <p className="text-sm text-on-surface-variant opacity-50 py-4">No activity yet. Create a task, project, or contact to get started.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {activityFeed.map((item) => {
              const Icon = item.type === 'task_done' ? CheckCircle
                         : item.type === 'task_new' ? CheckCircle2
                         : item.type === 'contact' ? UserPlus
                         : FolderPlus;
              const bgColor = item.type === 'task_done' ? 'bg-primary/10'
                            : item.type === 'task_new' ? 'bg-tertiary/10'
                            : item.type === 'contact' ? 'bg-secondary/10'
                            : 'bg-on-surface-variant/10';
              const textColor = item.type === 'task_done' ? 'text-primary'
                              : item.type === 'task_new' ? 'text-tertiary'
                              : item.type === 'contact' ? 'text-secondary'
                              : 'text-on-surface-variant';
              const hoverColor = item.type === 'task_done' ? 'group-hover:bg-primary'
                               : item.type === 'task_new' ? 'group-hover:bg-tertiary'
                               : item.type === 'contact' ? 'group-hover:bg-secondary'
                               : 'group-hover:bg-on-surface-variant';
              return (
                <div key={item.id} className="flex gap-4 items-start group">
                  <div className={cn('mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all group-hover:text-on-primary', bgColor, textColor, hoverColor)}>
                    <Icon size={18} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[13px] font-bold text-on-surface leading-tight line-clamp-2">{item.title}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase font-extrabold tracking-widest mt-1.5 opacity-60">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
