'use client';

import React from 'react';
import {
  Search,
  Filter,
  Mail,
  MessageSquare,
  Phone,
  Star,
  BadgeCheck,
  ArrowRight,
  UserPlus,
  Zap,
  Globe,
  Briefcase,
  X,
  MapPin,
  CreditCard,
  TrendingUp,
  LayoutGrid,
  List,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Contact, RelationshipStatus, Task, Project } from '@/lib/types';
import { createContact, deleteContact } from '@/lib/actions/contacts';
import ContactModal from './ContactModal';

// ─── Add Contact Modal ────────────────────────────────────────────────────────

function AddContactModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (c: Contact) => void;
}) {
  const [form, setForm] = React.useState({
    name: '',
    role: '',
    company: '',
    email: '',
    phone: '',
    location: '',
    status: 'warm' as RelationshipStatus,
    category: 'Professional',
    context: '',
  });
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    try {
      const initials = encodeURIComponent(form.name.trim());
      const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=1a1f2e&textColor=21B225&fontSize=40`;
      const data = await createContact({
        ...form,
        avatar,
        interactions: 0,
        last_interaction: new Date().toISOString(),
      });
      onSave(data);
    } catch (err) {
      console.error(err);
      alert('Failed to add contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div
        className="bg-surface-container-low border border-outline/20 rounded-3xl p-10 w-full max-w-lg shadow-2xl"
        style={{ boxShadow: '0 0 0 1px rgba(33,178,37,0.08), 0 32px 64px rgba(0,0,0,0.5)' }}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-extrabold font-headline text-on-surface">Add Contact</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container rounded-xl transition-colors text-on-surface-variant"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                Full Name *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface placeholder-on-surface-variant/40"
                placeholder="e.g. Sarah Chen"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                Role
              </label>
              <input
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface placeholder-on-surface-variant/40"
                placeholder="e.g. CEO"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                Company
              </label>
              <input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface placeholder-on-surface-variant/40"
                placeholder="e.g. Sequoia"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface placeholder-on-surface-variant/40"
                placeholder="jane@acme.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface placeholder-on-surface-variant/40"
                placeholder="+1 212 555 0192"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                Location
              </label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface placeholder-on-surface-variant/40"
                placeholder="New York, USA"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                Relationship
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as RelationshipStatus }))
                }
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface"
              >
                <option value="warm">🟢 Warm</option>
                <option value="cold">🔵 Cold</option>
                <option value="dormant">⚫ Dormant</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                Context / Notes
              </label>
              <input
                value={form.context}
                onChange={(e) => setForm((f) => ({ ...f, context: e.target.value }))}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3.5 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface placeholder-on-surface-variant/40"
                placeholder="e.g. Met at Web Summit 2025"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-surface-container border border-outline/20 text-on-surface-variant font-bold rounded-2xl text-sm hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3.5 bg-primary text-on-primary font-bold rounded-2xl text-sm shadow-xl shadow-primary/20 hover:bg-primary-dim transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

// ─── List Row View ───────────────────────────────────────────────────────────────

function ContactRow({
  contact, onClick, isAdmin = false, contactProjects = [],
}: {
  contact: Contact; onClick: () => void; isAdmin?: boolean; contactProjects?: Project[];
}) {
  const statusColor = contact.status === 'warm'
    ? 'bg-primary/10 text-primary border-primary/20'
    : contact.status === 'cold'
    ? 'bg-secondary/10 text-secondary border-secondary/20'
    : 'bg-surface-container-highest text-on-surface-variant border-outline/20';
  const statusDot = contact.status === 'warm' ? 'bg-primary' : contact.status === 'cold' ? 'bg-secondary' : 'bg-on-surface-variant/40';

  const allTx = contactProjects.flatMap(p => p.transactions ?? []);
  const totalBilled = allTx.reduce((s, t) => s + Number(t.amount), 0);
  const outstanding = allTx.filter(t => t.status !== 'paid').reduce((s, t) => s + Number(t.amount), 0);
  const hasOverdue  = allTx.some(t => t.status === 'overdue');

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-6 py-4 bg-surface-container-low border border-outline/10 rounded-2xl hover:border-primary/30 hover:bg-surface-container transition-all cursor-pointer group"
    >
      {/* Avatar */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={contact.avatar || `https://picsum.photos/seed/${encodeURIComponent(contact.name)}/80/80`}
        alt={contact.name}
        className="w-10 h-10 rounded-xl object-cover shrink-0 ring-2 ring-surface-container"
      />

      {/* Name + role */}
      <div className="w-56 shrink-0">
        <p className="text-[14px] font-extrabold text-on-surface group-hover:text-primary transition-colors truncate">{contact.name}</p>
        <p className="text-[11px] font-medium text-on-surface-variant opacity-60 truncate">
          {[contact.role, contact.company].filter(Boolean).join(' @ ')}
        </p>
      </div>

      {/* Status badge */}
      <div className="w-24 shrink-0">
        <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border', statusColor)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', statusDot)} />
          {contact.status}
        </span>
      </div>

      {/* Location */}
      <div className="w-36 shrink-0">
        {contact.location ? (
          <p className="text-[12px] font-medium text-on-surface-variant opacity-70 flex items-center gap-1 truncate">
            <MapPin size={11} className="shrink-0" />{contact.location}
          </p>
        ) : <span className="text-[11px] text-on-surface-variant opacity-30">—</span>}
      </div>

      {/* Next step */}
      <div className="flex-1 min-w-0">
        {contact.next_step ? (
          <p className="text-[12px] font-medium text-on-surface-variant truncate flex items-center gap-1.5">
            <ArrowRight size={11} className="text-primary shrink-0" />
            {contact.next_step}
          </p>
        ) : <span className="text-[11px] text-on-surface-variant opacity-30">No next step</span>}
      </div>

      {/* Admin billing pill */}
      {isAdmin && allTx.length > 0 && (
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl border shrink-0',
          hasOverdue ? 'bg-error/5 border-error/20 text-error' : 'bg-primary/5 border-primary/15 text-primary'
        )}>
          <CreditCard size={12} />
          <span className="text-[11px] font-black">&#x20B1;{totalBilled.toFixed(2)}</span>
          {outstanding > 0 && (
            <span className="text-[10px] font-bold opacity-70">· &#x20B1;{outstanding.toFixed(2)} due</span>
          )}
        </div>
      )}

      {/* Arrow */}
      <ArrowRight size={15} className="text-outline group-hover:text-primary transition-colors shrink-0" />
    </div>
  );
}

// ─── Card View ──────────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onClick,
  isAdmin = false,
  contactProjects = [],
}: {
  contact: Contact;
  onClick: () => void;
  isAdmin?: boolean;
  contactProjects?: Project[];
}) {
  const statusColor =
    contact.status === 'warm'
      ? 'text-primary bg-primary/10 border-primary/10'
      : contact.status === 'cold'
      ? 'text-secondary bg-secondary/10 border-secondary/10'
      : 'text-on-surface-variant bg-surface-container-highest border-outline/20';

  const statusDot =
    contact.status === 'warm'
      ? 'bg-primary'
      : contact.status === 'cold'
      ? 'bg-secondary'
      : 'bg-on-surface-variant';

  return (
    <div
      onClick={onClick}
      className="group bg-surface-container-low rounded-[2.5rem] p-8 border border-outline/10 hover:border-primary/40 transition-all duration-300 flex flex-col hover:shadow-2xl hover:shadow-primary/5 cursor-pointer"
    >
      {/* Avatar + Status */}
      <div className="flex justify-between items-start mb-8">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={contact.name}
            className="w-20 h-20 rounded-[2rem] object-cover ring-4 ring-surface-container-low group-hover:ring-primary/20 transition-all duration-500"
            src={
              contact.avatar ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(contact.name)}&backgroundColor=1a1f2e&textColor=21B225&fontSize=40`
            }
          />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-xl border-4 border-surface-container-low flex items-center justify-center shadow-lg">
            <BadgeCheck size={12} className="text-on-primary" />
          </div>
        </div>
        <span
          className={cn(
            'flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border',
            statusColor
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', statusDot)} />
          {contact.status}
        </span>
      </div>

      {/* Name + Role */}
      <div className="mb-5">
        <h3 className="text-2xl font-extrabold text-on-surface group-hover:text-primary transition-colors font-headline mb-1.5">
          {contact.name}
        </h3>
        <p className="text-on-surface-variant font-bold text-[11px] uppercase tracking-[0.15em] opacity-70 flex items-center gap-2">
          <Briefcase size={13} className="opacity-50" />
          {contact.role}
          {contact.company ? ` @ ${contact.company}` : ''}
        </p>
        {contact.location && (
          <p className="text-on-surface-variant text-[11px] font-medium mt-1.5 flex items-center gap-1.5 opacity-60">
            <MapPin size={12} />
            {contact.location}
          </p>
        )}
        {contact.context && (
          <p className="text-on-surface-variant text-xs mt-2 font-medium opacity-60 line-clamp-2">
            {contact.context}
          </p>
        )}
      </div>

      {/* Admin Billing Summary */}
      {isAdmin && contactProjects.length > 0 && (() => {
        const allTx = contactProjects.flatMap(p => p.transactions ?? []);
        const totalBilled  = allTx.reduce((s, t) => s + t.amount, 0);
        const totalPaid    = allTx.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0);
        const outstanding  = allTx.filter(t => t.status !== 'paid').reduce((s, t) => s + t.amount, 0);
        const hasOverdue   = allTx.some(t => t.status === 'overdue');
        if (allTx.length === 0) return null;
        return (
          <div className={cn(
            'mb-5 p-4 rounded-2xl border flex items-center gap-3',
            hasOverdue
              ? 'bg-error/5 border-error/20'
              : 'bg-primary/5 border-primary/15'
          )}>
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
              hasOverdue ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
            )}>
              <CreditCard size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-[9px] font-extrabold uppercase tracking-widest mb-0.5',
                hasOverdue ? 'text-error/70' : 'text-primary/70'
              )}>
                {hasOverdue ? '⚠ Overdue Balance' : 'Billing Summary'}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-black text-on-surface">
                  ₱{totalBilled.toFixed(2)}
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant opacity-60">billed</span>
                {outstanding > 0 && (
                  <>
                    <span className="text-outline/30">·</span>
                    <span className={cn('text-[12px] font-black', hasOverdue ? 'text-error' : 'text-on-surface-variant')}>
                      ₱{outstanding.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold text-on-surface-variant opacity-60">outstanding</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-on-surface-variant opacity-50 mb-0.5">
                {contactProjects.length} project{contactProjects.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1 justify-end">
                <div className="w-16 h-1 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: totalBilled > 0 ? `${Math.min(100, (totalPaid / totalBilled) * 100)}%` : '0%' }}
                  />
                </div>
                <span className="text-[9px] font-bold text-on-surface-variant opacity-50">
                  {totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Stats */}
      <div className="space-y-3 mb-8">
        <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl border border-outline/10 group-hover:bg-surface-container-high transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Zap size={15} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5 opacity-60">
                Last Interaction
              </p>
              <p className="text-[13px] font-bold text-on-surface">
                {contact.last_interaction
                  ? new Date(contact.last_interaction).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Never'}
              </p>
            </div>
          </div>
          <ArrowRight
            size={15}
            className="text-outline group-hover:text-primary transition-colors"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl border border-outline/10 group-hover:bg-surface-container-high transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary">
              <Star size={15} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5 opacity-60">
                Interactions
              </p>
              <p className="text-[13px] font-bold text-on-surface">
                {contact.interactions} recorded
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-auto grid grid-cols-3 gap-3" onClick={(e) => e.stopPropagation()}>
        <a
          href={contact.email ? `mailto:${contact.email}` : undefined}
          className={cn(
            'flex flex-col items-center justify-center gap-2 py-4 bg-surface-container rounded-2xl border border-outline/10 hover:border-primary/40 hover:bg-primary/5 transition-all group/btn',
            !contact.email && 'opacity-40 pointer-events-none'
          )}
        >
          <Mail size={17} className="text-on-surface-variant group-hover/btn:text-primary transition-colors" />
          <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest group-hover/btn:text-primary">
            Email
          </span>
        </a>
        <button className="flex flex-col items-center justify-center gap-2 py-4 bg-surface-container rounded-2xl border border-outline/10 hover:border-primary/40 hover:bg-primary/5 transition-all group/btn">
          <MessageSquare
            size={17}
            className="text-on-surface-variant group-hover/btn:text-primary transition-colors"
          />
          <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest group-hover/btn:text-primary">
            Chat
          </span>
        </button>
        <a
          href={contact.phone ? `tel:${contact.phone}` : undefined}
          className={cn(
            'flex flex-col items-center justify-center gap-2 py-4 bg-surface-container rounded-2xl border border-outline/10 hover:border-primary/40 hover:bg-primary/5 transition-all group/btn',
            !contact.phone && 'opacity-40 pointer-events-none'
          )}
        >
          <Phone
            size={17}
            className="text-on-surface-variant group-hover/btn:text-primary transition-colors"
          />
          <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest group-hover/btn:text-primary">
            Call
          </span>
        </a>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Contacts({
  initialContacts,
  initialTasks,
  initialProjects,
  isAdmin = false,
}: {
  initialContacts: Contact[];
  initialTasks: Task[];
  initialProjects: Project[];
  isAdmin?: boolean;
}) {
  const [contacts, setContacts] = React.useState<Contact[]>(initialContacts || []);
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks || []);
  const [projects] = React.useState<Project[]>(initialProjects || []);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<RelationshipStatus | 'all'>('all');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = React.useState<'name' | 'status' | 'company' | 'interactions'>('name');

  React.useEffect(() => {
    setContacts(initialContacts || []);
  }, [initialContacts]);

  const handleSave = (contact: Contact) => {
    setContacts((prev) => [contact, ...prev]);
    setShowAddModal(false);
  };

  const handleUpdated = (updated: Contact) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedContact(updated);
  };

  const handleDeleted = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setSelectedContact(null);
  };

  const handleTaskAdded = (task: Task) => {
    setTasks((prev) => [task, ...prev]);
  };

  const filteredContacts = React.useMemo(() => {
    const base = contacts.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company?.toLowerCase().includes(search.toLowerCase()) ||
        c.role?.toLowerCase().includes(search.toLowerCase()) ||
        c.location?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    return [...base].sort((a, b) => {
      if (sortBy === 'status') {
        const order = { warm: 0, cold: 1, dormant: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      }
      if (sortBy === 'company') return (a.company ?? '').localeCompare(b.company ?? '');
      if (sortBy === 'interactions') return (b.interactions ?? 0) - (a.interactions ?? 0);
      return a.name.localeCompare(b.name);
    });
  }, [contacts, search, statusFilter, sortBy]);

  return (
    <>
      {/* Add Contact Modal */}
      {showAddModal && (
        <AddContactModal onClose={() => setShowAddModal(false)} onSave={handleSave} />
      )}

      {/* Contact Detail Modal */}
      {selectedContact && (
        <ContactModal
          contact={selectedContact}
          tasks={tasks}
          projects={projects}
          onClose={() => setSelectedContact(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
          onTaskAdded={handleTaskAdded}
          isAdmin={isAdmin}
        />
      )}

      <div className="space-y-12">
        {/* Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-3 font-headline">
              Network
            </h1>
            <p className="text-on-surface-variant max-w-xl text-lg font-medium leading-relaxed">
              Curate and cultivate your professional ecosystem with precision and intent.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative group">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search network..."
                className="pl-11 pr-4 py-3 bg-surface-container-low border border-outline/30 rounded-xl text-sm font-semibold focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none w-64 transition-all text-on-surface placeholder-on-surface-variant/40"
              />
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl text-sm shadow-xl shadow-primary/20 flex items-center gap-2 hover:opacity-90 transition-all hover:scale-[1.02]"
              >
                <UserPlus size={18} />
                Add Contact
              </button>
            )}
          </div>
        </section>

        {/* Network Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-low p-8 rounded-3xl border border-outline/20 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 opacity-70">
                Total Connections
              </p>
              <h3 className="text-4xl font-extrabold text-on-surface tracking-tight">
                {contacts.length}
              </h3>
              <div className="mt-6 flex items-center gap-2 text-primary font-bold text-xs">
                <Zap size={14} />
                <span>Your network</span>
              </div>
            </div>
            <Globe
              size={100}
              className="absolute -right-6 -bottom-6 text-primary opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700"
            />
          </div>
          <div className="bg-surface-container-low p-8 rounded-3xl border border-outline/20 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 opacity-70">
                Warm Contacts
              </p>
              <h3 className="text-4xl font-extrabold text-on-surface tracking-tight">
                {contacts.filter((c) => c.status === 'warm').length}
              </h3>
              <div className="mt-6 flex items-center gap-2 text-tertiary font-bold text-xs">
                <BadgeCheck size={14} />
                <span>Active relationships</span>
              </div>
            </div>
            <MessageSquare
              size={100}
              className="absolute -right-6 -bottom-6 text-tertiary opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700"
            />
          </div>
          <div className="bg-primary text-on-primary p-8 rounded-3xl border border-primary/20 relative overflow-hidden group shadow-xl shadow-primary/10">
            <div className="relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2 opacity-80">
                Dormant
              </p>
              <h3 className="text-4xl font-extrabold tracking-tight">
                {contacts.filter((c) => c.status === 'dormant').length}
              </h3>
              <div className="mt-6 flex items-center gap-2 font-bold text-xs">
                <Star size={14} fill="currentColor" />
                <span>Need re-engagement</span>
              </div>
            </div>
            <Zap
              size={100}
              className="absolute -right-6 -bottom-6 text-on-primary opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700"
            />
          </div>
        </section>

        {/* Filter tabs */}
        <div className="flex items-center justify-between border-b border-outline/10 pb-6">
          <div className="flex gap-10">
            {(['all', 'warm', 'cold', 'dormant'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'font-semibold text-sm relative capitalize transition-colors pb-0.5',
                  statusFilter === s
                    ? 'text-on-surface font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                {s === 'all' ? 'All Network' : s.charAt(0).toUpperCase() + s.slice(1)}
                {statusFilter === s && (
                  <span className="absolute -bottom-[26px] left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest opacity-50">
              {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
            </span>
            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2 bg-surface-container border border-outline/20 rounded-xl text-[11px] font-bold text-on-surface-variant uppercase tracking-widest outline-none cursor-pointer hover:border-primary/40 transition-colors"
              >
                <option value="name">Name A–Z</option>
                <option value="status">Status</option>
                <option value="company">Company</option>
                <option value="interactions">Most Active</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            </div>
            {/* View toggle */}
            <div className="flex items-center bg-surface-container border border-outline/20 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 rounded-lg transition-all', viewMode === 'grid' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
                title="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 rounded-lg transition-all', viewMode === 'list' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
                title="List view"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Contacts Grid / List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredContacts.length === 0 ? (
              <p className="text-sm text-on-surface-variant opacity-50 pl-2 col-span-full">
                {search ? `No contacts matching "${search}".` : 'No contacts found.'}
              </p>
            ) : (
            filteredContacts.map((contact) => {
              const contactProjects = projects.filter(p => p.contact_id === contact.id);
              return (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onClick={() => setSelectedContact(contact)}
                  isAdmin={isAdmin}
                  contactProjects={contactProjects}
                />
              );
            })
            )}

            {/* Add placeholder */}
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="border-2 border-dashed border-outline/30 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-6 hover:border-primary/50 hover:bg-surface-container transition-all duration-300 group min-h-[440px]"
              >
                <div className="w-20 h-20 rounded-[2rem] bg-surface-container-high flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all shadow-sm">
                  <UserPlus
                    size={36}
                    className="text-outline group-hover:text-on-primary transition-colors"
                  />
                </div>
                <div className="text-center">
                  <p className="font-bold text-on-surface text-2xl font-headline">Expand Your Network</p>
                  <p className="text-sm text-on-surface-variant max-w-[240px] mt-2 font-medium">
                    Add a new strategic connection to your professional ecosystem.
                  </p>
                </div>
              </button>
            )}
          </div>
        ) : (
          /* List view */
          <div className="space-y-2">
            {/* List header */}
            <div className="flex items-center gap-4 px-6 py-2 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest opacity-50">
              <div className="w-10 shrink-0" />
              <div className="w-56 shrink-0">Name</div>
              <div className="w-24 shrink-0">Status</div>
              <div className="w-36 shrink-0">Location</div>
              <div className="flex-1">Next Step</div>
              {isAdmin && <div className="w-48 shrink-0">Billing</div>}
              <div className="w-4 shrink-0" />
            </div>
            {filteredContacts.length === 0 ? (
              <p className="text-sm text-on-surface-variant opacity-50 pl-6 py-4">
                {search ? `No contacts matching "${search}".` : 'No contacts found.'}
              </p>
            ) : (
              filteredContacts.map((contact) => {
                const contactProjects = projects.filter(p => p.contact_id === contact.id);
                return (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    onClick={() => setSelectedContact(contact)}
                    isAdmin={isAdmin}
                    contactProjects={contactProjects}
                  />
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}
