'use client';

import React from 'react';
import {
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  ArrowRight,
  Sparkles,
  Activity,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Users,
  FolderPlus,
  UserPlus,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { cn } from '@/lib/utils';
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
  contacts.forEach(c => items.push({ id: `c-${c.id}`, type: 'contact', title: `Added ${c.name}`, time: timeAgo(c.created_at), raw: c.created_at }));
  projects.forEach(p => items.push({ id: `p-${p.id}`, type: 'project', title: `Created "${p.name}"`, time: timeAgo(p.created_at), raw: p.created_at }));
  return items.sort((a, b) => new Date(b.raw).getTime() - new Date(a.raw).getTime()).slice(0, 8);
}

export default function Insights({ initialTasks, initialContacts, initialProjects }: {
  initialTasks: Task[];
  initialContacts: Contact[];
  initialProjects: Project[];
}) {
  const tasks = initialTasks || [];
  const contacts = initialContacts || [];
  const projects = initialProjects || [];

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;

  // Build last-7-days velocity for area chart
  const velocityData = React.useMemo(() => {
    const days = 7;
    const now = new Date();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (days - 1 - i));
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const value = tasks.filter(t => {
        const td = new Date(t.updated_at);
        return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      }).length;
      return { name: label, value };
    });
  }, [tasks]);

  // Contact interactions per week (last 4 weeks)
  const networkData = React.useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (3 - i) * 7 - 6);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (3 - i) * 7);
      const count = contacts.filter(c => {
        if (!c.last_interaction) return false;
        const d = new Date(c.last_interaction);
        return d >= weekStart && d <= weekEnd;
      }).length + contacts.length; // baseline: total contacts adds weight
      return { name: `Week ${i + 1}`, value: Math.max(count, i + 1) };
    });
  }, [contacts]);

  // Priority breakdown for pie chart
  const allocationData = React.useMemo(() => [
    { name: 'Critical', value: Math.max(tasks.filter(t => t.priority === 'critical').length, 1), color: '#ef4444' },
    { name: 'High', value: Math.max(tasks.filter(t => t.priority === 'high').length, 1), color: '#21B225' },
    { name: 'Medium', value: Math.max(tasks.filter(t => t.priority === 'medium').length, 1), color: '#f59e0b' },
    { name: 'Low', value: Math.max(tasks.filter(t => t.priority === 'low').length, 1), color: '#6366f1' },
  ], [tasks]);

  const activityFeed = React.useMemo(() => buildActivity(tasks, contacts, projects), [tasks, contacts, projects]);

  const prevWeekCompleted = tasks.filter(t => {
    if (t.status !== 'completed') return false;
    const d = new Date(t.updated_at);
    const diff = (Date.now() - d.getTime()) / 86400000;
    return diff > 7 && diff <= 14;
  }).length;
  const thisWeekCompleted = tasks.filter(t => {
    if (t.status !== 'completed') return false;
    const diff = (Date.now() - new Date(t.updated_at).getTime()) / 86400000;
    return diff <= 7;
  }).length;
  const velocityChange = prevWeekCompleted === 0 ? 100 : Math.round(((thisWeekCompleted - prevWeekCompleted) / prevWeekCompleted) * 100);

  return (
    <div className="space-y-12">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-3 font-headline">Insights</h1>
          <p className="text-on-surface-variant max-w-xl text-lg font-medium leading-relaxed">Advanced analytics and behavioral patterns for your personal and professional landscape.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex bg-surface-container-low p-1.5 rounded-xl border border-outline/30">
            <button className="px-5 py-2 text-[11px] font-bold rounded-lg bg-primary text-on-primary shadow-lg shadow-primary/10">Weekly</button>
            <button className="px-5 py-2 text-[11px] font-bold rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all">Monthly</button>
          </div>
          <button className="p-3 bg-surface-container-high text-on-surface border border-outline/30 rounded-xl hover:bg-surface-container-highest transition-colors">
            <Calendar size={20} />
          </button>
        </div>
      </section>

      {/* Top Insights Bento Grid */}
      <section className="grid grid-cols-12 gap-6">
        {/* Output Velocity Area Chart */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-low rounded-[2.5rem] p-10 border border-outline/10 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-12 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity size={18} className="text-primary" />
                <span className="text-[11px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Task Output</span>
              </div>
              <h3 className="text-3xl font-extrabold text-on-surface tracking-tight font-headline">Output Velocity</h3>
            </div>
            <div className="text-right">
              <div className={cn('flex items-center gap-1 font-black text-xl mb-1', velocityChange >= 0 ? 'text-primary' : 'text-error')}>
                {velocityChange >= 0 ? <TrendingUp size={20} /> : <TrendingUp size={20} className="rotate-180" />}
                <span>{velocityChange >= 0 ? '+' : ''}{velocityChange}%</span>
              </div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">vs Last Week</p>
            </div>
          </div>

          <div className="h-72 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#21B225" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#21B225" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: 'var(--on-surface-variant)', opacity: 0.5 }} dy={15} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--surface-container-highest)', borderRadius: '16px', border: '1px solid var(--outline-variant)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px' }}
                  itemStyle={{ color: 'var(--primary)', fontWeight: 800, fontSize: '12px' }}
                  labelStyle={{ color: 'var(--on-surface)', fontWeight: 800, fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}
                  formatter={(v) => [v != null ? `${v} tasks` : '—', 'Activity']}
                />
                <Area type="monotone" dataKey="value" stroke="#21B225" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
        </div>

        {/* Quick Stats Column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="flex-1 bg-primary text-on-primary rounded-[2.5rem] p-8 border border-primary/20 shadow-2xl shadow-primary/10 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2 opacity-80">Completed Tasks</p>
              <h3 className="text-4xl font-black tracking-tight mb-6">{completedTasks}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                  <span>Pending</span>
                  <span>{pendingTasks}</span>
                </div>
                <div className="w-full h-2 bg-on-primary/20 rounded-full overflow-hidden">
                  <div className="h-full bg-on-primary rounded-full transition-all" style={{ width: tasks.length ? `${Math.round((completedTasks / tasks.length) * 100)}%` : '0%' }}></div>
                </div>
              </div>
            </div>
            <Zap size={120} className="absolute -right-8 -bottom-8 text-on-primary opacity-10 rotate-12 group-hover:rotate-0 transition-transform" />
          </div>

          <div className="flex-1 bg-surface-container-low rounded-[2.5rem] p-8 border border-outline/10 group hover:border-primary/40 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary group-hover:bg-tertiary group-hover:text-on-primary transition-all duration-300">
                <Target size={24} />
              </div>
              <span className="text-[10px] font-black text-tertiary px-3 py-1 bg-tertiary/10 rounded-full uppercase tracking-widest border border-tertiary/10">On Track</span>
            </div>
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-2 opacity-70">Active Projects</p>
            <h3 className="text-3xl font-black text-on-surface tracking-tight">{projects.filter(p => p.status === 'active').length}</h3>
            <p className="text-xs font-bold text-on-surface-variant mt-3">{contacts.length} contacts in your network</p>
          </div>
        </div>
      </section>

      {/* Middle Section: Allocation & Network */}
      <section className="grid grid-cols-12 gap-6">
        {/* Task Priority Pie */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-surface-container-low rounded-[2.5rem] p-10 border border-outline/10">
          <div className="flex items-center gap-3 mb-10">
            <PieChartIcon size={20} className="text-primary" />
            <h3 className="text-xl font-extrabold text-on-surface tracking-tight font-headline">Task Priority Mix</h3>
          </div>

          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocationData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" animationDuration={1500}>
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--surface-container-highest)', borderRadius: '16px', border: '1px solid var(--outline-variant)', padding: '12px' }}
                  itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                  formatter={(v, name) => [v != null ? `${v} tasks` : '—', String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-on-surface">{tasks.length}</span>
              <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Total Tasks</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            {allocationData.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{item.name}</span>
                  <span className="text-sm font-black text-on-surface">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Network Velocity Bar Chart */}
        <div className="col-span-12 md:col-span-6 lg:col-span-8 bg-surface-container-low rounded-[2.5rem] p-10 border border-outline/10">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <BarChart3 size={20} className="text-primary" />
              <h3 className="text-xl font-extrabold text-on-surface tracking-tight font-headline">Network Velocity</h3>
            </div>
            <span className="text-[10px] font-black text-on-surface-variant px-4 py-2 rounded-lg border border-outline/30 uppercase tracking-widest">{contacts.length} Contacts</span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={networkData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: 'var(--on-surface-variant)', opacity: 0.5 }} dy={15} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'var(--surface-container-highest)', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: 'var(--surface-container-highest)', borderRadius: '16px', border: '1px solid var(--outline-variant)', padding: '12px' }}
                  itemStyle={{ color: 'var(--primary)', fontWeight: 800, fontSize: '12px' }}
                  formatter={(v) => [v != null ? `${v} interactions` : '—', 'Network']}
                />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={60} animationDuration={1500}>
                  {networkData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === networkData.length - 1 ? '#21B225' : 'var(--primary-dim)'} fillOpacity={index === networkData.length - 1 ? 1 : 0.3} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Strategic Recommendations */}
      <section className="bg-surface-container-low rounded-[3rem] p-12 border border-outline/20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <Sparkles size={24} className="text-primary" />
            <h2 className="text-3xl font-extrabold tracking-tight font-headline">Strategic Recommendations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface-container-high/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-outline/20 group hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                <Clock size={24} />
              </div>
              <h4 className="text-xl font-bold text-on-surface mb-3 font-headline">Morning Optimization</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed font-medium mb-8">Your peak cognitive performance occurs between <span className="text-primary font-bold">8:30 AM and 11:00 AM</span>. Shift your high-priority tasks to this window.</p>
              <button className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest group/btn">
                Optimize Calendar
                <ArrowUpRight size={16} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </button>
            </div>

            <div className="bg-surface-container-high/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-outline/20 group hover:border-tertiary/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary mb-6 group-hover:bg-tertiary group-hover:text-on-primary transition-all duration-300">
                <Users size={24} />
              </div>
              <h4 className="text-xl font-bold text-on-surface mb-3 font-headline">Network Expansion</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed font-medium mb-8">
                You have <span className="text-tertiary font-bold">{contacts.length} contacts</span>. {contacts.filter(c => c.status === 'dormant').length > 0 ? `${contacts.filter(c => c.status === 'dormant').length} dormant connections need re-engagement.` : 'Your network is actively engaged.'}
              </p>
              <button className="flex items-center gap-2 text-tertiary font-bold text-xs uppercase tracking-widest group/btn">
                View Contacts
                <ArrowUpRight size={16} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </button>
            </div>

            <div className="bg-surface-container-high/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-outline/20 group hover:border-secondary/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary mb-6 group-hover:bg-secondary group-hover:text-on-primary transition-all duration-300">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-xl font-bold text-on-surface mb-3 font-headline">Task Consolidation</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed font-medium mb-8">
                You have <span className="text-secondary font-bold">{pendingTasks} pending tasks</span> across {projects.filter(p => p.status === 'active').length} active projects. Batch similar ones into focused work sprints to reduce context switching.
              </p>
              <button className="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-widest group/btn">
                Batch Tasks
                <ArrowUpRight size={16} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute -top-48 -right-48 w-96 h-96 bg-tertiary/5 rounded-full blur-[120px] pointer-events-none"></div>
      </section>

      {/* Live Activity Feed */}
      <section className="bg-surface-container rounded-3xl p-8 border border-outline/20">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-xl font-bold font-headline">Activity Log</h2>
          <span className="text-[11px] font-bold text-on-surface-variant px-4 py-2 rounded-lg border border-outline/30 uppercase tracking-widest">{activityFeed.length} events</span>
        </div>
        {activityFeed.length === 0 ? (
          <p className="text-sm text-on-surface-variant opacity-50 py-4">No activity yet. Create tasks, projects, or contacts to populate this feed.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {activityFeed.map((item) => {
              const Icon = item.type === 'task_done' ? CheckCircle
                         : item.type === 'task_new' ? CheckCircle2
                         : item.type === 'contact' ? UserPlus
                         : FolderPlus;
              const bgColor = item.type === 'task_done' ? 'bg-primary/10' : item.type === 'task_new' ? 'bg-tertiary/10' : item.type === 'contact' ? 'bg-secondary/10' : 'bg-on-surface-variant/10';
              const textColor = item.type === 'task_done' ? 'text-primary' : item.type === 'task_new' ? 'text-tertiary' : item.type === 'contact' ? 'text-secondary' : 'text-on-surface-variant';
              const hoverColor = item.type === 'task_done' ? 'group-hover:bg-primary' : item.type === 'task_new' ? 'group-hover:bg-tertiary' : item.type === 'contact' ? 'group-hover:bg-secondary' : 'group-hover:bg-on-surface-variant';
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
      </section>
    </div>
  );
}
