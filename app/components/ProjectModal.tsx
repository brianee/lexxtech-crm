'use client';

import React from 'react';
import {
  X, CheckCircle2, Circle, Search, CreditCard, Receipt, TrendingUp, AlertCircle, Calendar, Hash, FileText, ArrowRight,
  Briefcase,
  User,
  MoreVertical,
  Check,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, Task, BillingTransaction, ProjectInteraction, Contact, Profile, Priority } from '@/lib/types';
import { getProjectById, updateProject } from '@/lib/actions/projects';
import { createBillingTransaction, deleteBillingTransaction, updateBillingTransaction } from '@/lib/actions/billing';
import { createProjectInteraction, deleteProjectInteraction } from '@/lib/actions/project-interactions';
import { addProjectMember, removeProjectMember } from '@/lib/actions/project-members';
import { createClient } from '@/lib/supabase/client';
import { useTaskIntake } from '@/lib/contexts/TaskIntakeContext';

interface ProjectModalProps {
  project: Project;
  profiles?: Profile[];
  contacts?: Contact[];
  isAdmin?: boolean;
  onClose: () => void;
  onUpdate?: (updated: Project) => void;
}

export default function ProjectModal({ project: initialProject, profiles = [], contacts = [], isAdmin = false, onClose, onUpdate }: ProjectModalProps) {
  const [project, setProject] = React.useState<Project>(initialProject);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<'overview' | 'tasks' | 'billing' | 'team'>('overview');
  const [showMenu, setShowMenu] = React.useState(false);

  // Team member management state
  const [addMemberUserId, setAddMemberUserId] = React.useState('');
  const [addMemberRole, setAddMemberRole] = React.useState<'lead' | 'member'>('member');
  const [addingMember, setAddingMember] = React.useState(false);
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null);

  // Billing Form State
  const [showBillingForm, setShowBillingForm] = React.useState(false);
  const [bLines, setBLines] = React.useState([{ desc: '', amount: '' }]);
  const [bStatus, setBStatus] = React.useState<'pending' | 'paid' | 'overdue'>('pending');
  const [bDate, setBDate] = React.useState(new Date().toISOString().split('T')[0]);

  // Description & Interaction State
  const [descEditMode, setDescEditMode] = React.useState(false);
  const [descDraft, setDescDraft] = React.useState('');
  const [iContent, setIContent] = React.useState('');
  const [savingInteraction, setSavingInteraction] = React.useState(false);

  // Deep Details Editing State
  const [editMode, setEditMode] = React.useState(false);
  const [savingDetails, setSavingDetails] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
     due_date: '',
     priority: 'medium' as Priority,
     tags: '',
     contact_id: '',
     assigned_user_id: '',
     category: '',
     estimated_budget: ''
  });

  const [currentUserEmail, setCurrentUserEmail] = React.useState<string>('');

  // Transaction edit drawer
  const [editingTxId, setEditingTxId] = React.useState<string | null>(null);
  const [editingTxForm, setEditingTxForm] = React.useState<{
    lines: { desc: string; amount: string }[];
    status: 'pending' | 'paid' | 'overdue';
    date: string;
  }>({ lines: [{ desc: '', amount: '' }], status: 'pending', date: '' });

  const { openIntake } = useTaskIntake();

  React.useEffect(() => {
    // Fetch full project with tasks and billing
    let isMounted = true;
    getProjectById(initialProject.id).then(fullProject => {
      if (isMounted && fullProject) {
        // Fallback to empty array if no related data yet
        if (!fullProject.transactions) fullProject.transactions = [];
        if (!fullProject.tasks) fullProject.tasks = [];
        if (!fullProject.interactions) fullProject.interactions = [];
        setProject(fullProject);
        setDescDraft(fullProject.description || '');
        setEditForm({
          due_date: fullProject.due_date || '',
          priority: fullProject.priority || 'medium',
          tags: fullProject.tags?.join(', ') || '',
          contact_id: fullProject.contact_id || '',
          assigned_user_id: fullProject.assigned_user_id || '',
          category: fullProject.category || '',
          estimated_budget: fullProject.estimated_budget ? fullProject.estimated_budget.toString() : ''
        });
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [initialProject.id]);

  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setCurrentUserEmail(data.user.email);
    });
  }, []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleAddBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = bLines.filter(l => l.desc.trim() && parseFloat(l.amount) > 0);
    if (validLines.length === 0) return;

    // Serialize lines to JSON for multi-line support; single line uses plain text for backward compat
    const description = validLines.length === 1
      ? validLines[0].desc.trim()
      : JSON.stringify(validLines.map(l => ({ desc: l.desc.trim(), amount: parseFloat(l.amount) })));
    const totalAmount = validLines.reduce((sum, l) => sum + parseFloat(l.amount), 0);

    try {
      const newTx = await createBillingTransaction({
        project_id: project.id,
        description,
        amount: totalAmount,
        status: bStatus,
        date: bDate,
      });

      setProject(prev => ({
        ...prev,
        transactions: [newTx, ...(prev.transactions || [])]
      }));
      setShowBillingForm(false);
      setBLines([{ desc: '', amount: '' }]);
    } catch (err) {
      console.error(err);
      alert('Failed to add transaction');
    }
  };

  const handleDeleteTx = async (txId: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await deleteBillingTransaction(txId);
      setProject(prev => ({
        ...prev,
        transactions: (prev.transactions || []).filter(t => t.id !== txId)
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTxStatus = async (tx: BillingTransaction) => {
    const cycle: Record<string, 'pending' | 'paid' | 'overdue'> = { pending: 'paid', paid: 'overdue', overdue: 'pending' };
    const newStatus = cycle[tx.status];
    try {
      await updateBillingTransaction(tx.id, { status: newStatus });
      setProject(prev => ({
        ...prev,
        transactions: (prev.transactions || []).map(t => t.id === tx.id ? { ...t, status: newStatus } : t)
      }));
    } catch { alert('Failed to update status'); }
  };

  const handleStartTxEdit = (tx: BillingTransaction) => {
    setEditingTxId(tx.id);
    let lines: { desc: string; amount: string }[];
    try {
      const parsed = JSON.parse(tx.description) as { desc: string; amount: number }[];
      lines = parsed.map(l => ({ desc: l.desc, amount: l.amount.toString() }));
    } catch {
      lines = [{ desc: tx.description, amount: tx.amount.toString() }];
    }
    setEditingTxForm({ lines, status: tx.status, date: tx.date });
  };

  const handleSaveTxEdit = async () => {
    if (!editingTxId) return;
    const validLines = editingTxForm.lines.filter(l => l.desc.trim());
    if (validLines.length === 0) return;
    try {
      const description = validLines.length === 1
        ? validLines[0].desc.trim()
        : JSON.stringify(validLines.map(l => ({ desc: l.desc.trim(), amount: parseFloat(l.amount) || 0 })));
      const amount = validLines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
      const updates = { description, amount, status: editingTxForm.status, date: editingTxForm.date };
      await updateBillingTransaction(editingTxId, updates);
      setProject(prev => ({
        ...prev,
        transactions: (prev.transactions || []).map(t => t.id === editingTxId ? { ...t, ...updates } : t)
      }));
      setEditingTxId(null);
    } catch { alert('Failed to save changes'); }
  };

  const handleDownloadReceipt = (tx: BillingTransaction) => {
    const receiptDate = new Date(tx.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const receiptNumber = `RCP-${tx.id.slice(0, 8).toUpperCase()}`;

    // Parse multi-line items or fall back to single line
    let lineItems: { desc: string; amount: number }[];
    try {
      lineItems = JSON.parse(tx.description) as { desc: string; amount: number }[];
    } catch {
      lineItems = [{ desc: tx.description, amount: Number(tx.amount) }];
    }
    const lineItemsHtml = lineItems.map((l, i) => `
      <tr>
        <td>${l.desc}</td>
        ${i === 0 ? `<td rowspan="${lineItems.length}">${receiptDate}</td><td rowspan="${lineItems.length}"><span class="status-badge">${tx.status}</span></td>` : ''}
        <td>₱${l.amount.toFixed(2)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt – ${project.name}</title>
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
      <div class="info-item">
        <p>Client Name</p>
        <strong>${project.contact?.name || 'N/A'}</strong>
      </div>
      <div class="info-item">
        <p>Company</p>
        <strong>${project.contact?.company || 'N/A'}</strong>
      </div>
      <div class="info-item">
        <p>Email</p>
        <strong>${project.contact?.email || 'N/A'}</strong>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-label">Issued By</div>
    <div class="info-grid">
      <div class="info-item">
        <p>Project</p>
        <strong style="font-size:16px">${project.name}</strong>
      </div>
      <div class="info-item">
        <p>Account Email</p>
        <strong>${currentUserEmail || 'N/A'}</strong>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-label">Transaction Details</div>
    <table class="line-items">
      <thead>
        <tr>
          <th>Description</th>
          <th>Date</th>
          <th>Status</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>
    <div class="total-row">
      <span class="label">Total Due</span>
      <span class="amount">₱${Number(tx.amount).toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <span>Thank you for your business!</span>
    <span>Generated by LexxTech CRM &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</span>
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

  const handleStatusChange = async (newStatus: 'active' | 'completed' | 'archived') => {
    try {
      setProject(prev => ({ ...prev, status: newStatus as any }));
      await updateProject(project.id, { status: newStatus as any });
      setShowMenu(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
      setProject(prev => ({ ...prev, status: initialProject.status })); // revert
    }
  };

  const handleSaveDescription = async () => {
    try {
      const updatedDesc = descDraft.trim() || undefined;
      setProject(prev => ({ ...prev, description: updatedDesc }));
      await updateProject(project.id, { description: updatedDesc as any });
      
      const newInt = await createProjectInteraction(project.id, '[System Log] Project description updated.');
      setProject(prev => ({ ...prev, interactions: [newInt, ...(prev.interactions || [])] }));

      if (onUpdate) onUpdate({ ...project, description: updatedDesc as any });
      setDescEditMode(false);
    } catch (err) {
      alert('Failed to save description');
    }
  };

  const handleSaveDetails = async () => {
    try {
      setSavingDetails(true);
      const updates: any = {};
      const changes: string[] = [];

      if (editForm.due_date !== (project.due_date || '')) {
         updates.due_date = editForm.due_date || null;
         changes.push('Target Due Date');
      }
      if (editForm.priority !== (project.priority || '')) {
         updates.priority = editForm.priority;
         changes.push('Priority');
      }
      const newTags = editForm.tags.split(',').map(t => t.trim()).filter(Boolean);
      const oldTags = project.tags || [];
      if (newTags.join(',') !== oldTags.join(',')) {
         updates.tags = newTags;
         changes.push('Tags');
      }
      if (editForm.contact_id !== (project.contact_id || '')) {
         updates.contact_id = editForm.contact_id || null;
         changes.push('Contact Person');
      }
      if (editForm.assigned_user_id !== (project.assigned_user_id || '')) {
         updates.assigned_user_id = editForm.assigned_user_id || null;
         changes.push('Assigned Lead');
      }
      if (editForm.category !== (project.category || '')) {
         updates.category = editForm.category || null;
         changes.push('Category');
      }
      const oldBudget = project.estimated_budget?.toString() || '';
      if (editForm.estimated_budget !== oldBudget) {
         updates.estimated_budget = editForm.estimated_budget ? parseFloat(editForm.estimated_budget) : null;
         changes.push('Estimated Budget');
      }

      if (Object.keys(updates).length > 0) {
        await updateProject(project.id, updates);
        
        const newInt = await createProjectInteraction(project.id, `[System Log] Details edited: ${changes.join(', ')} updated.`);
        const resolvedContact = contacts.find(c => c.id === updates.contact_id) || project.contact;
        const resolvedProfile = profiles.find(p => p.id === updates.assigned_user_id) || project.assignee;
        
        const modifiedProject = { 
          ...project, 
          ...updates, 
          interactions: [newInt, ...(project.interactions || [])],
          contact: resolvedContact,
          assignee: resolvedProfile 
        };
        
        setProject(modifiedProject);
        if (onUpdate) onUpdate(modifiedProject);
      }
      setEditMode(false);
    } catch (err) {
      alert('Failed to save details updates.');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleAddInteraction = async () => {
    if (!iContent.trim()) return;
    setSavingInteraction(true);
    try {
      const newInt = await createProjectInteraction(project.id, iContent.trim());
      setProject(prev => ({
        ...prev,
        interactions: [newInt, ...(prev.interactions || [])]
      }));
      setIContent('');
    } catch {
      alert('Failed to save interaction');
    } finally {
      setSavingInteraction(false);
    }
  };

  const handleDeleteInteraction = async (id: string) => {
    if (!confirm('Delete this interaction log?')) return;
    try {
      await deleteProjectInteraction(id);
      setProject(prev => ({
        ...prev,
        interactions: (prev.interactions || []).filter(i => i.id !== id)
      }));
    } catch {
      alert('Failed to delete interaction');
    }
  };

  const transactions = project.transactions || [];
  const totalBilled = transactions.reduce((acc, t) => acc + Number(t.amount), 0);
  const totalPaid = transactions.filter(t => t.status === 'paid').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalPending = transactions.filter(t => t.status !== 'paid').reduce((acc, t) => acc + Number(t.amount), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-surface-container-low border border-outline/20 rounded-3xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]"
        style={{ boxShadow: '0 0 0 1px rgba(33,178,37,0.08), 0 32px 80px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 py-7 bg-surface-container-lowest border-b border-outline/10 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={cn(
                "px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded border",
                project.status === 'active' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface-container text-on-surface-variant border-outline/10'
              )}>
                {project.status}
              </span>
              {project.project_number && (
                <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded bg-surface-container-high text-on-surface-variant border border-outline/20">
                  <Hash size={10} className="inline mr-1 -mt-0.5" />{project.project_number}
                </span>
              )}
              {(project.tags || []).map(tag => (
                <span key={tag} className="text-[11px] font-bold text-on-surface-variant">#{tag}</span>
              ))}
            </div>
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight font-headline">{project.name}</h2>
          </div>
          <div className="flex items-center gap-2 relative">
            {isAdmin && (
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-surface-container rounded-xl transition-colors text-on-surface-variant hover:text-on-surface"
              >
                <MoreVertical size={20} />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-xl transition-colors text-on-surface-variant hover:text-on-surface">
              <X size={20} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-12 w-48 bg-surface-container-low border border-outline/10 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                {project.status !== 'completed' && (
                  <button onClick={() => handleStatusChange('completed')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container flex items-center gap-2">
                    <Check size={14} className="text-primary" /> Mark Completed
                  </button>
                )}
                {project.status !== 'archived' && (
                  <button onClick={() => handleStatusChange('archived')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container flex items-center gap-2">
                    <Archive size={14} className="text-on-surface-variant" /> Archive Project
                  </button>
                )}
                {project.status !== 'active' && (
                  <button onClick={() => handleStatusChange('active')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container flex items-center gap-2">
                    <TrendingUp size={14} className="text-secondary" /> Set as Active
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-8 border-b border-outline/10 shrink-0 overflow-x-auto custom-scrollbar">
          {[
            { id: 'overview', label: 'Overview & Status', icon: TrendingUp },
            { id: 'tasks', label: 'Associated Tasks', icon: CheckCircle2 },
            ...(isAdmin ? [
              { id: 'billing', label: 'Billing Transactions', icon: CreditCard },
              { id: 'team', label: 'Team', icon: User }
            ] : []),
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={cn(
                  'flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-sm transition-all',
                  tab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
                )}
              >
                <Icon size={16} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface-container-low p-8 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-container-low/50 backdrop-blur-sm z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : null}

          {/* TAB: BILLING */}
          {tab === 'billing' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-surface-container border border-outline/10 p-5 rounded-2xl">
                  <div className="flex items-center gap-3 text-on-surface-variant mb-2 font-bold text-xs uppercase tracking-widest">
                    <Receipt size={14} /> Total Billed
                  </div>
                  <div className="text-3xl font-black text-on-surface">₱{totalBilled.toFixed(2)}</div>
                </div>
                <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl">
                  <div className="flex items-center gap-3 text-primary mb-2 font-bold text-xs uppercase tracking-widest">
                    <CheckCircle2 size={14} /> Total Paid
                  </div>
                  <div className="text-3xl font-black text-primary">₱{totalPaid.toFixed(2)}</div>
                </div>
                <div className="bg-error/5 border border-error/20 p-5 rounded-2xl">
                  <div className="flex items-center gap-3 text-error mb-2 font-bold text-xs uppercase tracking-widest">
                    <AlertCircle size={14} /> Outstanding
                  </div>
                  <div className="text-3xl font-black text-error">₱{totalPending.toFixed(2)}</div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="bg-surface-container-lowest border border-outline/10 rounded-3xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-outline/10">
                  <h3 className="font-extrabold text-on-surface font-headline">Ledger</h3>
                  <button
                    onClick={() => setShowBillingForm(!showBillingForm)}
                    className="text-primary text-xs font-bold uppercase tracking-widest hover:underline"
                  >
                    + Add Record
                  </button>
                </div>

                {showBillingForm && (
                  <form onSubmit={handleAddBilling} className="p-6 bg-surface-container border-b border-outline/10 space-y-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Line Items</label>
                      {bLines.map((line, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            required
                            value={line.desc}
                            onChange={e => setBLines(lines => lines.map((l, i) => i === idx ? {...l, desc: e.target.value} : l))}
                            className="flex-1 bg-surface-container-highest border border-outline/10 rounded-lg p-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
                            placeholder={`Description ${idx + 1}`}
                          />
                          <input
                            required
                            type="number" step="0.01" min="0"
                            value={line.amount}
                            onChange={e => setBLines(lines => lines.map((l, i) => i === idx ? {...l, amount: e.target.value} : l))}
                            className="w-32 bg-surface-container-highest border border-outline/10 rounded-lg p-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
                            placeholder="0.00"
                          />
                          {bLines.length > 1 && (
                            <button type="button" onClick={() => setBLines(lines => lines.filter((_, i) => i !== idx))} className="p-2 text-on-surface-variant hover:text-error transition-colors">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => setBLines(l => [...l, { desc: '', amount: '' }])} className="text-primary text-xs font-bold hover:underline mt-1">
                        + Add Line
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Status</label>
                        <select value={bStatus} onChange={e => setBStatus(e.target.value as any)} className="w-full bg-surface-container-highest border border-outline/10 rounded-lg p-2.5 text-sm text-on-surface outline-none cursor-pointer">
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Date</label>
                        <input required type="date" value={bDate} onChange={e => setBDate(e.target.value)} className="w-full bg-surface-container-highest border border-outline/10 rounded-lg p-2.5 text-sm text-on-surface outline-none [color-scheme:dark]" />
                      </div>
                      <div className="flex items-end pb-0.5">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total</p>
                          <p className="font-black text-on-surface text-lg">₱{bLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button type="submit" className="px-6 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-lg uppercase tracking-wide hover:bg-primary-dim transition-all">Save Transaction</button>
                    </div>
                  </form>
                )}

                <div className="divide-y divide-outline/5">
                  {transactions.length === 0 ? (
                    <div className="p-8 text-center text-sm text-on-surface-variant/50">No transactions recorded for this project yet.</div>
                  ) : (
                    transactions.map(tx => (
                      <div key={tx.id} className="p-5 hover:bg-surface-container-low transition-colors group">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              {/* Clickable status icon cycles: pending → paid → overdue */}
                              <button
                                onClick={() => handleToggleTxStatus(tx)}
                                title={`Status: ${tx.status} — click to change`}
                                className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-transform hover:scale-110 active:scale-95 cursor-pointer",
                                  tx.status === 'paid' ? 'bg-primary/10 border-primary/20 text-primary' :
                                  tx.status === 'overdue' ? 'bg-error/10 border-error/20 text-error' :
                                  'bg-surface-container-high border-outline/10 text-on-surface-variant'
                                )}
                              >
                                {tx.status === 'paid' ? <CheckCircle2 size={16} /> : tx.status === 'overdue' ? <AlertCircle size={16} /> : <Circle size={16} />}
                              </button>
                              <div>
                                {(() => {
                                  try {
                                    const lines = JSON.parse(tx.description) as { desc: string; amount: number }[];
                                    return (
                                      <div className="space-y-0.5">
                                        {lines.map((l, i) => (
                                          <p key={i} className="text-sm text-on-surface flex gap-2">
                                            <span className="font-bold">{l.desc}</span>
                                            <span className="text-on-surface-variant font-medium">₱{l.amount.toFixed(2)}</span>
                                          </p>
                                        ))}
                                      </div>
                                    );
                                  } catch {
                                    return <p className="font-bold text-on-surface text-sm mb-0.5">{tx.description}</p>;
                                  }
                                })()}
                                <p className="text-xs text-on-surface-variant mt-0.5">{new Date(tx.date).toLocaleDateString()} · <span className="capitalize font-semibold">{tx.status}</span></p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-3">
                                {tx.status === 'paid' && (
                                  <button onClick={() => handleDownloadReceipt(tx)} className="text-[10px] font-bold text-primary uppercase border border-primary/20 bg-primary/5 px-2 py-1 rounded hover:bg-primary hover:text-on-primary transition-colors opacity-0 group-hover:opacity-100">
                                    Receipt
                                  </button>
                                )}
                                <span className={cn("font-black text-lg", tx.status === 'paid' ? 'text-primary' : tx.status === 'overdue' ? 'text-error' : 'text-on-surface')}>
                                  ₱{Number(tx.amount).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => handleStartTxEdit(tx)} className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors" title="Edit">
                                  <FileText size={14} />
                                </button>
                                <button onClick={() => handleDeleteTx(tx.id)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-colors" title="Delete">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Transaction Edit Drawer ── */}
          {editingTxId && (
            <div className="fixed inset-0 z-[60] flex">
              {/* Scrim */}
              <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setEditingTxId(null)} />
              {/* Drawer */}
              <div className="w-full max-w-sm bg-surface-container-low border-l border-outline/20 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between px-6 py-5 border-b border-outline/10 shrink-0">
                  <h3 className="font-extrabold text-on-surface font-headline">Edit Transaction</h3>
                  <button onClick={() => setEditingTxId(null)} className="p-2 hover:bg-surface-container rounded-xl transition-colors text-on-surface-variant"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Line Items */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest block">Line Items</label>
                    {editingTxForm.lines.map((line, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          value={line.desc}
                          onChange={e => setEditingTxForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? {...l, desc: e.target.value} : l) }))}
                          className="flex-1 bg-surface-container border border-outline/10 rounded-lg px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
                          placeholder={`Item ${idx + 1}`}
                        />
                        <input
                          type="number" step="0.01" min="0"
                          value={line.amount}
                          onChange={e => setEditingTxForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? {...l, amount: e.target.value} : l) }))}
                          className="w-28 bg-surface-container border border-outline/10 rounded-lg px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
                          placeholder="0.00"
                        />
                        {editingTxForm.lines.length > 1 && (
                          <button type="button" onClick={() => setEditingTxForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))} className="p-1.5 text-on-surface-variant hover:text-error transition-colors"><X size={13} /></button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => setEditingTxForm(f => ({ ...f, lines: [...f.lines, { desc: '', amount: '' }] }))} className="text-primary text-xs font-bold hover:underline">+ Add Line</button>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest block mb-2">Status</label>
                    <div className="flex gap-2">
                      {(['pending', 'paid', 'overdue'] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEditingTxForm(f => ({ ...f, status: s }))}
                          className={cn(
                            'flex-1 py-2 rounded-lg text-xs font-bold capitalize border transition-colors',
                            editingTxForm.status === s
                              ? s === 'paid' ? 'bg-primary text-on-primary border-primary'
                                : s === 'overdue' ? 'bg-error text-white border-error'
                                : 'bg-surface-container-high text-on-surface border-outline/30'
                              : 'bg-transparent text-on-surface-variant border-outline/10 hover:border-outline/30'
                          )}
                        >{s}</button>
                      ))}
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest block mb-2">Date</label>
                    <input type="date" value={editingTxForm.date} onChange={e => setEditingTxForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-surface-container border border-outline/10 rounded-lg px-3 py-2.5 text-sm text-on-surface outline-none [color-scheme:dark]" />
                  </div>

                  {/* Running Total */}
                  <div className="p-4 bg-surface-container rounded-xl border border-outline/10 flex justify-between items-center">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total</span>
                    <span className="text-2xl font-black text-on-surface">₱{editingTxForm.lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 px-6 py-4 border-t border-outline/10 flex gap-3">
                  <button onClick={() => setEditingTxId(null)} className="flex-1 py-3 bg-surface-container border border-outline/20 text-on-surface-variant font-bold rounded-xl text-sm hover:bg-surface-container-high transition-colors">Cancel</button>
                  <button onClick={handleSaveTxEdit} className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-xl text-sm hover:bg-primary-dim transition-all shadow-lg shadow-primary/20">Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TASKS */}
          {tab === 'tasks' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-end mb-4 px-1">
                <h3 className="text-lg font-extrabold text-on-surface">Task Roster</h3>
                <button
                  onClick={() => openIntake({ projectId: project.id, contactId: project.contact_id || undefined })}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-bold rounded-lg text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-primary/20 hover:shadow-primary/30"
                >
                  + New Task
                </button>
              </div>
              {(!project.tasks || project.tasks.length === 0) ? (
                <div className="bg-surface-container-lowest border border-outline/10 rounded-2xl p-10 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant/30 mb-4">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-on-surface mb-2">No tasks found</h3>
                  <p className="text-sm text-on-surface-variant">There are no tasks associated with this project yet.</p>
                </div>
              ) : (
                project.tasks.map(task => (
                  <div key={task.id} className="bg-surface-container-lowest border border-outline/10 p-5 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-start gap-4">
                      <CheckCircle2 size={18} className={task.status === 'completed' ? 'text-primary' : 'text-on-surface-variant/30'} />
                      <div>
                        <h4 className={cn("font-bold mb-1", task.status === 'completed' ? 'text-on-surface-variant line-through' : 'text-on-surface')}>{task.title}</h4>
                        <div className="flex items-center gap-3">
                          {task.registry_number && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                              <Hash size={10} className="inline mr-1" />{task.registry_number}
                            </span>
                          )}
                          {task.priority && (
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider",
                              task.priority === 'critical' ? 'text-error' : task.priority === 'high' ? 'text-tertiary' : 'text-on-surface-variant/50'
                            )}>
                              {task.priority} Priority
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: OVERVIEW */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="md:col-span-2 space-y-8">
                <div className="bg-surface-container-lowest border border-outline/10 p-8 rounded-3xl">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-extrabold text-lg text-on-surface flex items-center gap-2">
                      <FileText size={18} className="text-primary" /> Project Description
                    </h3>
                    <button onClick={() => setDescEditMode(!descEditMode)} className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">
                      {descEditMode ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  {descEditMode ? (
                    <div className="space-y-3">
                      <textarea
                        value={descDraft}
                        onChange={e => setDescDraft(e.target.value)}
                        className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-sm text-on-surface min-h-[100px] outline-none focus:ring-1 focus:ring-primary/40"
                        placeholder="Project description..."
                      />
                      <button onClick={handleSaveDescription} className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg text-xs hover:bg-primary-dim transition-all">Save Description</button>
                    </div>
                  ) : (
                    <p className="text-on-surface-variant leading-relaxed text-sm whitespace-pre-wrap">
                      {project.description || 'No description provided.'}
                    </p>
                  )}
                </div>

                {/* Interaction Log */}
                <div className="bg-surface-container-lowest border border-outline/10 p-8 rounded-3xl flex flex-col h-[500px]">
                  <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="font-extrabold text-lg text-on-surface flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-primary" /> Interaction Log
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4 pr-2">
                    {(!project.interactions || project.interactions.length === 0) ? (
                      <p className="text-sm text-on-surface-variant/50 text-center py-10">No interactions logged yet.</p>
                    ) : (
                      project.interactions.map(log => (
                        <div key={log.id} className="bg-surface-container p-4 rounded-xl relative group">
                          <button onClick={() => handleDeleteInteraction(log.id)} className="absolute top-2 right-2 p-1 text-on-surface-variant opacity-0 group-hover:opacity-100 hover:text-error transition-all"><X size={12} /></button>
                          <p className="text-xs text-on-surface-variant mb-1 font-semibold">{new Date(log.created_at).toLocaleString()}</p>
                          <p className="text-sm text-on-surface whitespace-pre-wrap">{log.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="shrink-0 flex gap-3">
                    <input
                      value={iContent}
                      onChange={e => setIContent(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddInteraction(); }}
                      placeholder="Log an update..."
                      className="flex-1 bg-surface-container border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <button onClick={handleAddInteraction} disabled={savingInteraction || !iContent.trim()} className="bg-primary text-on-primary px-5 rounded-xl font-bold text-sm hover:bg-primary-dim transition-all disabled:opacity-50">Log</button>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-surface-container-lowest border border-outline/10 p-6 rounded-3xl">
                  <div className="flex justify-between text-xs font-bold text-on-surface-variant mb-3 tracking-widest uppercase">
                    <span>Overall Progress</span>
                    <span className="text-primary">{project.progress}%</span>
                  </div>
                  <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(33,178,37,0.4)]" style={{ width: `${project.progress}%` }}></div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline/10 p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-outline/10">
                    <span className="text-xs font-bold text-on-surface-variant tracking-widest uppercase">Metadata</span>
                    {editMode ? (
                      <div className="flex gap-2">
                        <button onClick={() => setEditMode(false)} disabled={savingDetails} className="text-on-surface-variant px-3 py-1 rounded text-[10px] font-bold hover:bg-surface-container disabled:opacity-50">Cancel</button>
                        <button onClick={handleSaveDetails} disabled={savingDetails} className="bg-primary text-on-primary px-3 py-1 rounded text-[10px] font-bold hover:bg-primary-dim transition-colors disabled:opacity-50">Save</button>
                      </div>
                    ) : (
                      isAdmin && <button onClick={() => setEditMode(true)} className="text-[10px] font-bold text-primary hover:underline">Edit Details</button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 pb-4 border-b border-outline/10">
                    <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Created</span>
                    <span className="text-sm font-semibold text-on-surface">{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>

                  {editMode ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest block mb-1">Target Due Date</label>
                        <input type="date" value={editForm.due_date} onChange={e => setEditForm(f => ({...f, due_date: e.target.value}))} className="w-full bg-surface-container border border-outline/10 rounded-lg p-2 text-sm text-on-surface outline-none"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest block mb-1">Priority</label>
                        <select value={editForm.priority} onChange={e => setEditForm(f => ({...f, priority: e.target.value as any}))} className="w-full bg-surface-container border border-outline/10 rounded-lg p-2 text-sm text-on-surface outline-none cursor-pointer">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest block mb-1">Category</label>
                        <select value={editForm.category} onChange={e => setEditForm(f => ({...f, category: e.target.value}))} className="w-full bg-surface-container border border-outline/10 rounded-lg p-2 text-sm text-on-surface outline-none cursor-pointer">
                          <option value="">Uncategorized</option>
                          <option value="Retainer">Retainer</option>
                          <option value="Consulting">Consulting</option>
                          <option value="Internal">Internal</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest block mb-1">Est. Budget</label>
                        <input type="number" min="0" step="0.01" value={editForm.estimated_budget} onChange={e => setEditForm(f => ({...f, estimated_budget: e.target.value}))} className="w-full bg-surface-container border border-outline/10 rounded-lg p-2 text-sm text-on-surface outline-none" placeholder="0.00"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest block mb-1">Tags</label>
                        <select value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} className="w-full bg-surface-container border border-outline/10 rounded-lg p-2 text-sm text-on-surface outline-none cursor-pointer">
                          <option value="">No tag</option>
                          <option value="Brand Identity">Brand Identity</option>
                          <option value="Social Media">Social Media</option>
                          <option value="Web Development">Web Development</option>
                          <option value="UI/UX Design">UI/UX Design</option>
                          <option value="Consulting">Consulting</option>
                          <option value="SEO">SEO</option>
                          <option value="Maintenance">Maintenance</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest block mb-1">Assigned Lead</label>
                        <select value={editForm.assigned_user_id} onChange={e => setEditForm(f => ({...f, assigned_user_id: e.target.value}))} className="w-full bg-surface-container border border-outline/10 rounded-lg p-2 text-sm text-on-surface outline-none cursor-pointer">
                           <option value="">Unassigned</option>
                           {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || 'Unnamed Member'}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest block mb-1">Client / Contact</label>
                        <select value={editForm.contact_id} onChange={e => setEditForm(f => ({...f, contact_id: e.target.value}))} className="w-full bg-surface-container border border-outline/10 rounded-lg p-2 text-sm text-on-surface outline-none cursor-pointer">
                           <option value="">No Contact</option>
                           {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1 pb-4 border-b border-outline/10">
                        <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Status</span>
                        <span className="text-sm font-semibold text-on-surface capitalize">{project.status}</span>
                      </div>

                      {(project.assignee || project.assigned_lead) && (
                        <div className="flex flex-col gap-1 pb-4 border-b border-outline/10">
                          <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Assigned Lead</span>
                          <span className="text-sm font-semibold text-on-surface">{project.assignee?.full_name || project.assigned_lead}</span>
                        </div>
                      )}

                      {project.due_date && (
                        <div className="flex flex-col gap-1 pb-4 border-b border-outline/10">
                          <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Target Due Date</span>
                          <span className="text-sm font-semibold text-on-surface">{new Date(project.due_date).toLocaleDateString()}</span>
                        </div>
                      )}

                      {project.category && (
                        <div className="flex flex-col gap-1 pb-4 border-b border-outline/10">
                          <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Category</span>
                          <span className="text-sm font-semibold text-on-surface">{project.category}</span>
                        </div>
                      )}

                      {project.estimated_budget !== null && project.estimated_budget !== undefined && (
                        <div className="flex flex-col gap-1 pb-4 border-b border-outline/10">
                          <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Est. Budget</span>
                          <span className="text-sm font-black text-on-surface">₱{project.estimated_budget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}

                      {project.priority && (
                        <div className="flex flex-col gap-1 pb-4 border-b border-outline/10">
                          <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Priority</span>
                          <span className={cn("text-xs font-extrabold uppercase tracking-wider", project.priority === 'critical' ? 'text-error' : project.priority === 'high' ? 'text-tertiary' : 'text-on-surface-variant')}>{project.priority}</span>
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Tags</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {(project.tags && project.tags.length > 0) ? project.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-surface-container text-on-surface-variant rounded text-[10px] font-bold">
                              {tag}
                            </span>
                          )) : <span className="text-xs text-on-surface-variant">No tags</span>}
                        </div>
                      </div>

                      {project.contact && (
                        <div className="flex flex-col gap-1 pt-4 border-t border-outline/10">
                          <span className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5"><User size={10} /> Client / Contact</span>
                          <div className="flex items-center gap-3 mt-1.5 p-2 bg-surface-container rounded-lg">
                            <div className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary font-bold rounded-lg shrink-0">
                              {project.contact.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-on-surface truncate">{project.contact.name}</p>
                              <p className="text-[10px] text-on-surface-variant truncate">{project.contact.company || project.contact.role || 'No affiliation'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'team' && isAdmin && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-on-surface">Project Team</h3>
                  <p className="text-sm text-on-surface-variant font-medium">Manage members who have access to this project.</p>
                </div>
              </div>

              {/* Add Member Form */}
              <div className="bg-surface-container border border-outline/10 rounded-2xl p-5 space-y-3">
                <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Add Member</p>
                <div className="flex gap-3 items-center">
                  <select
                    value={addMemberUserId}
                    onChange={e => setAddMemberUserId(e.target.value)}
                    className="flex-1 bg-surface-container-high border border-outline/20 rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface outline-none cursor-pointer focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="">Select a team member...</option>
                    {profiles
                      .filter(p => !(project.members || []).some(m => m.user_id === p.id))
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                      ))
                    }
                  </select>
                  <select
                    value={addMemberRole}
                    onChange={e => setAddMemberRole(e.target.value as 'lead' | 'member')}
                    className="bg-surface-container-high border border-outline/20 rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface outline-none cursor-pointer focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="member">Member</option>
                    <option value="lead">Lead</option>
                  </select>
                  <button
                    disabled={!addMemberUserId || addingMember}
                    onClick={async () => {
                      if (!addMemberUserId) return;
                      setAddingMember(true);
                      try {
                        await addProjectMember(project.id, addMemberUserId, addMemberRole);
                        const profile = profiles.find(p => p.id === addMemberUserId);
                        const newMember = {
                          id: crypto.randomUUID(),
                          project_id: project.id,
                          user_id: addMemberUserId,
                          role: addMemberRole,
                          added_at: new Date().toISOString(),
                          full_name: profile?.full_name,
                          email: profile?.email,
                          avatar_url: profile?.avatar_url,
                        };
                        setProject(prev => ({ ...prev, members: [...(prev.members || []), newMember] }));
                        setAddMemberUserId('');
                      } catch { alert('Failed to add member'); }
                      finally { setAddingMember(false); }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm transition-all disabled:opacity-40 hover:bg-primary/90 shrink-0"
                  >
                    {addingMember ? (
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : '+ Add'}
                  </button>
                </div>
              </div>

              {/* Members List */}
              {(() => {
                // Merge the assigned lead (from project details) into the displayed list
                // if they're not already present in the project_members table
                const members = project.members || [];
                const assignedLeadEntry = (() => {
                  if (!project.assigned_user_id) return null;
                  const alreadyMember = members.some(m => m.user_id === project.assigned_user_id);
                  if (alreadyMember) return null;
                  const leadProfile = profiles.find(p => p.id === project.assigned_user_id) || project.assignee;
                  if (!leadProfile) return null;
                  return {
                    id: `lead-${project.assigned_user_id}`,
                    project_id: project.id,
                    user_id: project.assigned_user_id,
                    role: 'lead' as const,
                    added_at: project.created_at,
                    full_name: leadProfile.full_name,
                    email: leadProfile.email,
                    avatar_url: leadProfile.avatar_url,
                    isSyntheticLead: true,
                  };
                })();
                const displayMembers = assignedLeadEntry ? [assignedLeadEntry, ...members] : members;

                return (
                  <div className="bg-surface-container border border-outline/10 rounded-2xl overflow-hidden">
                    {displayMembers.length === 0 ? (
                      <p className="text-sm text-on-surface-variant text-center py-8">No team members yet. Add one above.</p>
                    ) : (
                      <div className="divide-y divide-outline/10">
                        {displayMembers.map(m => (
                          <div key={m.id} className="flex justify-between items-center px-5 py-4 hover:bg-surface-container-high/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                                {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : (m.full_name?.charAt(0) || <User size={14} />)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-on-surface">{m.full_name || m.email || 'Unnamed'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={cn(
                                    'text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded',
                                    m.role === 'lead' ? 'bg-primary/10 text-primary' : 'bg-surface-container-highest text-on-surface-variant'
                                  )}>{m.role}</span>
                                  {Boolean('isSyntheticLead' in m && (m as {isSyntheticLead?:boolean}).isSyntheticLead) && (
                                    <span className="text-[9px] text-on-surface-variant/50 font-medium">· Assigned in Details</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {Boolean('isSyntheticLead' in m && (m as {isSyntheticLead?:boolean}).isSyntheticLead) ? (
                              <span className="text-[10px] text-on-surface-variant/40 font-medium px-3">Project Lead</span>
                            ) : (
                              <button
                                disabled={removingMemberId === m.user_id}
                                onClick={async () => {
                                  setRemovingMemberId(m.user_id);
                                  try {
                                    await removeProjectMember(project.id, m.user_id);
                                    setProject(prev => ({ ...prev, members: (prev.members || []).filter(x => x.user_id !== m.user_id) }));
                                  } catch { alert('Failed to remove member'); }
                                  finally { setRemovingMemberId(null); }
                                }}
                                className="text-xs font-bold text-error hover:bg-error/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                              >
                                {removingMemberId === m.user_id ? 'Removing...' : 'Remove'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
