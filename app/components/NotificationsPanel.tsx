'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Clock, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, Contact, Notification, NotificationType } from '@/lib/types';
import { markNotificationRead } from '@/lib/actions/notifications';

interface NotificationsPanelProps {
  tasks: Task[];
  contacts: Contact[];
  dbNotifications?: Notification[];
  onClose: () => void;
}

type NotifItem = {
  id: string;
  type: NotificationType | 'overdue' | 'dormant' | 'due_soon';
  title: string;
  subtitle: string;
  time: string;
  isDb?: boolean;
  isRead?: boolean;
};

function buildNotifications(tasks: Task[], contacts: Contact[]): NotifItem[] {
  const items: NotifItem[] = [];
  const now = new Date();

  // Overdue tasks
  tasks
    .filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < now)
    .slice(0, 4)
    .forEach(t => {
      const days = Math.floor((now.getTime() - new Date(t.due_date!).getTime()) / 86400000);
      items.push({
        id: `overdue-${t.id}`,
        type: 'overdue',
        title: t.title,
        subtitle: `Overdue by ${days} day${days !== 1 ? 's' : ''}`,
        time: new Date(t.due_date!).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      });
    });

  // Tasks due today/tomorrow
  tasks
    .filter(t => {
      if (t.status === 'completed' || !t.due_date) return false;
      const d = new Date(t.due_date);
      const diff = Math.ceil((d.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
      return diff === 0 || diff === 1;
    })
    .slice(0, 3)
    .forEach(t => {
      const d = new Date(t.due_date!);
      const diff = Math.ceil((d.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
      items.push({
        id: `dueSoon-${t.id}`,
        type: 'due_soon',
        title: t.title,
        subtitle: diff === 0 ? 'Due today' : 'Due tomorrow',
        time: diff === 0 ? 'Today' : 'Tomorrow',
      });
    });

  // Dormant contacts (no interaction in 30+ days)
  contacts
    .filter(c => {
      if (!c.last_interaction) return true;
      const diff = (now.getTime() - new Date(c.last_interaction).getTime()) / 86400000;
      return diff > 30;
    })
    .slice(0, 3)
    .forEach(c => {
      const days = c.last_interaction
        ? Math.floor((now.getTime() - new Date(c.last_interaction).getTime()) / 86400000)
        : null;
      items.push({
        id: `dormant-${c.id}`,
        type: 'dormant',
        title: c.name,
        subtitle: days ? `No interaction in ${days} days` : 'Never interacted',
        time: c.last_interaction
          ? new Date(c.last_interaction).toLocaleDateString([], { month: 'short', day: 'numeric' })
          : 'Never',
      });
    });

  return items.slice(0, 8);
}

export default function NotificationsPanel({ tasks, contacts, dbNotifications = [], onClose }: NotificationsPanelProps) {
  const items = React.useMemo(() => {
    // 1. Map DB notifications into NotifItems
    const dbItems: NotifItem[] = dbNotifications
      .filter(n => !n.read) // Show unread only for simplicity, or we can gray out read ones
      .map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        subtitle: n.message,
        time: new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
        isDb: true,
        isRead: n.read,
      }));

    // 2. Computed
    const localItems = buildNotifications(tasks, contacts);
    
    return [...dbItems, ...localItems];
  }, [tasks, contacts, dbNotifications]);

  const iconFor = (type: NotifItem['type']) => {
    if (type === 'overdue')  return <AlertCircle size={16} className="text-error" />;
    if (type === 'due_soon') return <Clock size={16} className="text-tertiary" />;
    if (type === 'assignment') return <CheckCircle2 size={16} className="text-primary" />;
    if (type === 'comment')  return <AlertCircle size={16} className="text-primary" />;
    return <Users size={16} className="text-secondary" />;
  };

  const bgFor = (type: NotifItem['type']) => {
    if (type === 'overdue')  return 'bg-error/10';
    if (type === 'due_soon') return 'bg-tertiary/10';
    if (type === 'assignment' || type === 'comment') return 'bg-primary/10';
    return 'bg-secondary/10';
  };

  const handleItemClick = async (item: NotifItem) => {
    if (item.isDb && !item.isRead) {
      try {
        await markNotificationRead(item.id);
      } catch (e) {
        console.error(e);
      }
    }
    // onClose(); // optionally close after clicking
  };

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Invisible backdrop */}
      <div className="fixed inset-0 z-[45]" onClick={onClose} />

      <div
        className="absolute top-full right-0 mt-2 z-[46] bg-surface-container-low border border-outline/20 rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: 360, boxShadow: '0 0 0 1px rgba(33,178,37,0.08), 0 20px 40px rgba(0,0,0,0.4)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline/10">
          <div>
            <h3 className="text-sm font-extrabold text-on-surface">Notifications</h3>
            <p className="text-[10px] text-on-surface-variant mt-0.5">{items.length} alert{items.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <CheckCircle2 size={32} className="text-primary opacity-40" />
              <p className="text-sm font-bold text-on-surface-variant opacity-50">All clear! No alerts.</p>
            </div>
          ) : (
            <div className="divide-y divide-outline/10">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="w-full text-left flex items-start gap-3 px-5 py-4 hover:bg-surface-container transition-colors relative"
                >
                  {item.isDb && !item.isRead && (
                    <div className="absolute top-1/2 -translate-y-1/2 left-2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5', bgFor(item.type))}>
                    {iconFor(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-on-surface leading-tight line-clamp-1">{item.title}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">{item.subtitle}</p>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant opacity-50 shrink-0 mt-1">{item.time}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
