'use client';

import React from 'react';
import {
  PlusCircle,
  Filter,
  MoreVertical,
  FileText,
  PlaneTakeoff,
  Palette,
  CreditCard,
  Plane,
  Archive,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  Calendar,
  Trash2,
  X,
  Check,
  ArrowDownUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, Contact, Priority, Profile } from '@/lib/types';
import { createProject, deleteProject, updateProject } from '@/lib/actions/projects';
import { createContact } from '@/lib/actions/contacts';
import ProjectModal from './ProjectModal';

function AddProjectModal({ onClose, onSave, contacts, profiles }: { onClose: () => void; onSave: (p: Project) => void; contacts: Contact[]; profiles: Profile[] }) {
  const [form, setForm] = React.useState({ 
    name: '', description: '', tags: '',
    contact_id: '', assigned_user_id: '', due_date: '',
    category: '', estimated_budget: '', priority: 'medium' as Priority,
    newContactName: '', newContactCompany: ''
  });
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    
    try {
      let finalContactId = form.contact_id || undefined;
      
      // Inline contact creation
      if (form.contact_id === 'NEW') {
        if (!form.newContactName.trim()) {
           alert("Please provide a name for the new contact");
           setSaving(false);
           return;
        }
        const newContact = await createContact({
          name: form.newContactName.trim(),
          company: form.newContactCompany.trim() || undefined,
          status: 'warm'
        });
        finalContactId = newContact.id;
      }

      const data = await createProject({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        tags,
        contact_id: finalContactId,
        assigned_user_id: form.assigned_user_id || undefined,
        due_date: form.due_date || undefined,
        category: form.category.trim() || undefined,
        estimated_budget: form.estimated_budget ? parseFloat(form.estimated_budget) : undefined,
        priority: form.priority,
        progress: 0,
        status: 'active',
        team: [],
      });
      onSave(data);
    } catch (err) {
      console.error(err);
      alert('Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-low border border-outline/20 rounded-3xl p-10 w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-extrabold font-headline text-on-surface">New Project</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-xl transition-colors text-on-surface-variant">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="custom-scrollbar overflow-y-auto max-h-[70vh] p-1 -m-1 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Project Name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface"
                placeholder="e.g. Digital Lexx Ecosystem" />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Client / Contact *</label>
              <select required value={form.contact_id} onChange={e => setForm(f => ({...f, contact_id: e.target.value}))}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface cursor-pointer"
              >
                <option value="" disabled>Select a Client...</option>
                <option value="NEW" className="text-primary font-bold">+ Add New Contact</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
              </select>
              
              {form.contact_id === 'NEW' && (
                <div className="flex gap-3 bg-surface-container-highest p-3 rounded-xl border border-primary/20 animate-in fade-in zoom-in-95 duration-200">
                   <input required={form.contact_id === 'NEW'} value={form.newContactName} onChange={e => setForm(f => ({...f, newContactName: e.target.value}))}
                     className="w-full bg-surface-container border border-outline/10 rounded-lg p-2.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/40 placeholder-on-surface-variant/40"
                     placeholder="Contact Name *" />
                   <input value={form.newContactCompany} onChange={e => setForm(f => ({...f, newContactCompany: e.target.value}))}
                     className="w-full bg-surface-container border border-outline/10 rounded-lg p-2.5 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/40 placeholder-on-surface-variant/40"
                     placeholder="Company (Optional)" />
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Assigned Lead</label>
              <select value={form.assigned_user_id} onChange={e => setForm(f => ({ ...f, assigned_user_id: e.target.value }))}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface cursor-pointer"
              >
                <option value="">Unassigned</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || 'Unnamed Member'}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Target Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface [color-scheme:dark]" />
            </div>

            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                 className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface cursor-pointer"
              >
                 <option value="">Uncategorized</option>
                 <option value="Retainer">Retainer</option>
                 <option value="Consulting">Consulting</option>
                 <option value="Internal">Internal</option>
              </select>
            </div>

            <div>
               <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Estimated Budget (₱)</label>
               <input type="number" step="1000" min="0" value={form.estimated_budget} onChange={e => setForm(f => ({...f, estimated_budget: e.target.value}))}
                 className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface"
                 placeholder="0.00" />
            </div>

            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value as Priority}))}
                 className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface cursor-pointer"
              >
                 <option value="low">Low</option>
                 <option value="medium">Medium</option>
                 <option value="high">High</option>
                 <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Tags</label>
              <select value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface cursor-pointer"
              >
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
            
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/40 text-on-surface resize-none min-h-[80px]"
                placeholder="What is this project about?" />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-outline/10">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 bg-surface-container border border-outline/20 text-on-surface-variant font-bold rounded-2xl text-sm hover:bg-surface-container-high transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3.5 bg-primary text-on-primary font-bold rounded-2xl text-sm shadow-xl shadow-primary/20 hover:bg-primary-dim transition-all disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects({ initialProjects, contacts, profiles = [], currentUserId, isAdmin = true }: { initialProjects: Project[], contacts: Contact[], profiles?: Profile[], currentUserId?: string, isAdmin?: boolean }) {
  const [projects, setProjects] = React.useState<Project[]>(initialProjects || []);
  const [showModal, setShowModal] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'active' | 'completed' | 'archived' | 'template'>('active');
  const [sortBy, setSortBy] = React.useState<'recent' | 'az' | 'za' | 'progress_desc' | 'progress_asc'>('recent');
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [assignedOnly, setAssignedOnly] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem('projects_assignedOnly');
    if (stored !== null) setAssignedOnly(stored === 'true');
  }, []);

  const toggleAssignedOnly = (val: boolean) => {
    setAssignedOnly(val);
    localStorage.setItem('projects_assignedOnly', String(val));
  };

  React.useEffect(() => {
    setProjects(initialProjects || []);
  }, [initialProjects]);

  const handleSave = (project: Project) => {
    setProjects(prev => [project, ...prev]);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    const previous = [...projects];
    setProjects(prev => prev.filter(p => p.id !== id));
    
    try {
      await deleteProject(id);
    } catch {
      setProjects(previous);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'active' | 'completed' | 'archived') => {
    try {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus as any } : p));
      await updateProject(id, { status: newStatus as any });
      
      try {
        const { createProjectInteraction } = await import('@/lib/actions/project-interactions');
        await createProjectInteraction(id, `[System Log] Project status changed to ${newStatus}.`);
      } catch (e) { console.error(e); }
      
      setOpenMenuId(null);
    } catch {
      alert('Failed to update status');
      setProjects(projects); // revert
    }
  }

  // A project is "mine" if I'm the assigned lead OR in project_members
  const isMyProject = (p: Project) =>
    !currentUserId ||
    p.assigned_user_id === currentUserId ||
    (p.members ?? []).some(m => m.user_id === currentUserId);
  const visibleProjects = React.useMemo(() => {
    let base = projects;
    
    if (sortBy === 'progress_desc') {
      base = [...base].sort((a, b) => b.progress - a.progress);
    } else if (sortBy === 'progress_asc') {
      base = [...base].sort((a, b) => a.progress - b.progress);
    } else if (sortBy === 'az') {
      base = [...base].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'za') {
      base = [...base].sort((a, b) => b.name.localeCompare(a.name));
    } else {
      base = [...base].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return base;
  }, [projects, sortBy]);

  return (
    <>
      {showModal && (
        <AddProjectModal
          contacts={contacts}
          profiles={profiles}
          onClose={() => setShowModal(false)}
          onSave={(p) => { setProjects([p, ...projects]); setShowModal(false); }}
        />
      )}
      
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          contacts={contacts}
          profiles={profiles}
          isAdmin={isAdmin}
          onClose={() => setSelectedProject(null)}
          onUpdate={(updated) => { setProjects(projects.map(p => p.id === updated.id ? updated : p)); setSelectedProject(updated); }}
        />
      )}
      <div className="space-y-12">
        {/* Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-3 font-headline">Projects</h1>
            <p className="text-on-surface-variant max-w-xl text-lg font-medium leading-relaxed">Manage your active landscape of strategic commitments and professional initiatives.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Assigned to Me toggle */}
            {isAdmin && (
              <div className="flex items-center bg-surface-container-high rounded-xl border border-outline/20 p-0.5">
                <button
                  onClick={() => toggleAssignedOnly(false)}
                  className={cn('px-3 py-2 rounded-lg text-xs font-bold transition-all', !assignedOnly ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
                >All Projects</button>
                <button
                  onClick={() => toggleAssignedOnly(true)}
                  className={cn('px-3 py-2 rounded-lg text-xs font-bold transition-all', assignedOnly ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
                >Assigned to Me</button>
              </div>
            )}
            <div className="relative">
              <select
                 value={sortBy}
                 onChange={e => setSortBy(e.target.value as any)}
                 className="appearance-none pl-10 pr-8 py-2.5 bg-surface-container-high text-on-surface font-semibold border border-outline/30 rounded-xl text-sm hover:bg-surface-container-highest transition-colors cursor-pointer outline-none focus:border-primary/40"
              >
                <option value="recent">Most Recent</option>
                <option value="progress_desc">Highest Progress</option>
                <option value="progress_asc">Lowest Progress</option>
                <option value="az">Alphabetical (A-Z)</option>
                <option value="za">Alphabetical (Z-A)</option>
              </select>
              <ArrowDownUp size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            </div>
            {isAdmin && (
              <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl text-sm shadow-xl shadow-primary/20 flex items-center gap-2 hover:opacity-90 transition-all hover:scale-[1.02]">
                <PlusCircle size={18} />New Project
              </button>
            )}
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="col-span-1 p-7 bg-surface-container-low rounded-2xl flex flex-col justify-between h-36 border border-outline/20 hover:border-primary/20 transition-colors">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Active Projects</span>
            <span className="text-4xl font-extrabold text-on-surface">{projects.filter(p => p.status === 'active').length}</span>
          </div>
          <div className="col-span-1 p-7 bg-primary text-on-primary rounded-2xl flex flex-col justify-between h-36 border border-primary/20 shadow-xl shadow-primary/10">
            <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">Avg. Completion</span>
            <span className="text-4xl font-extrabold">
              {projects.length === 0 ? '—' : `${Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)}%`}
            </span>
          </div>
          <div className="col-span-1 md:col-span-2 p-7 bg-surface-container-low rounded-2xl flex items-center justify-between border border-outline/20 overflow-hidden relative group">
            <div className="z-10">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Quick Action</span>
              <h3 className="text-xl font-bold text-on-surface leading-tight font-headline">Start Tracking Progress</h3>
              <p className="text-sm font-medium text-primary mt-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Create your first project →
              </p>
            </div>
            <Calendar size={80} className="text-primary opacity-5 absolute -right-4 -bottom-4 rotate-12 transition-transform group-hover:rotate-0" />
            <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center border border-outline/20 z-10 shrink-0">
              <Calendar size={30} className="text-primary" />
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex gap-10 border-b border-outline/10">
          {([['active', 'Active Projects'], ['completed', 'Completed'], ['archived', 'Archived'], ['template', 'Templates']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'pb-4 border-b-2 font-semibold text-sm px-1 transition-colors',
                activeTab === tab
                  ? 'border-primary text-on-surface font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              )}
            >
              {label}
              <span className="ml-2 text-[10px] font-extrabold text-on-surface-variant/50">
                {projects.filter(p => p.status === tab).length}
              </span>
            </button>
          ))}
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {visibleProjects.filter(p => p.status === activeTab).length === 0 ? (
            <p className="text-sm text-on-surface-variant opacity-50 pl-2">
              {activeTab === 'active' ? 'No active projects.' : activeTab === 'archived' ? 'No archived projects.' : 'No templates created.'}
            </p>
          ) : (
            visibleProjects.filter(p => p.status === activeTab).map((project) => {
              const isMuted = assignedOnly && !isMyProject(project);
              return (
              <div 
                key={project.id} 
                onClick={() => setSelectedProject(project)}
                className={cn(
                  "group bg-surface-container-low p-8 rounded-2xl border border-outline/10 hover:border-primary/30 transition-all duration-300 flex flex-col cursor-pointer",
                  isMuted && "opacity-30 grayscale saturate-0"
                )}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(project.tags || []).map(tag => (
                        <span key={tag} className={cn(
                          'px-2.5 py-1 text-[10px] font-extrabold rounded uppercase tracking-wider',
                          tag === 'Strategic' ? 'bg-primary/10 text-primary' : 'bg-surface-container-highest text-on-surface-variant'
                        )}>{tag}</span>
                      ))}
                    </div>
                    <h3 className="text-2xl font-extrabold text-on-surface group-hover:text-primary transition-colors leading-tight font-headline">{project.name}</h3>
                    {project.description && <p className="text-sm text-on-surface-variant font-medium">{project.description}</p>}
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === project.id ? null : project.id); }}
                      className="p-2 hover:bg-surface-container rounded-xl transition-colors text-on-surface-variant z-10"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {openMenuId === project.id && (
                      <div className="absolute right-0 top-10 w-48 bg-surface-container-low border border-outline/10 rounded-xl shadow-xl z-50 overflow-hidden py-1" onClick={e => e.stopPropagation()}>
                        {project.status !== 'completed' && (
                          <button onClick={() => handleStatusChange(project.id, 'completed')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container flex items-center gap-2">
                            <Check size={14} className="text-primary"/> Mark Completed
                          </button>
                        )}
                        {project.status !== 'archived' && (
                          <button onClick={() => handleStatusChange(project.id, 'archived')} className="w-full text-left px-4 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container flex items-center gap-2">
                            <Archive size={14} className="text-on-surface-variant"/> Archive Project
                          </button>
                        )}
                        <div className="h-px bg-outline/10 my-1"></div>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-error hover:bg-error/10 flex items-center gap-2">
                          <Trash2 size={14}/> Delete Project
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex justify-between text-[11px] font-bold text-on-surface-variant mb-2.5 tracking-wider">
                    <span>PROGRESS TRACKER</span>
                    <span className="text-primary">{project.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(33,178,37,0.3)]" style={{ width: `${project.progress}%` }}></div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className={cn(
                    "flex items-center gap-2.5 px-3 py-1.5 rounded-full border",
                    project.status === 'active' ? 'bg-primary/5 border-primary/10' :
                    project.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20' :
                    'bg-surface-container border-outline/10'
                  )}>
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      project.status === 'active' ? 'bg-primary animate-pulse' :
                      project.status === 'completed' ? 'bg-emerald-500' :
                      'bg-on-surface-variant'
                    )}></span>
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wide",
                      project.status === 'active' ? 'text-on-surface' :
                      project.status === 'completed' ? 'text-emerald-500' :
                      'text-on-surface-variant'
                    )}>{project.status}</span>
                  </div>
                </div>
              </div>
            );
          })
          )}

          {/* Add New Project */}
          <button
            onClick={() => setShowModal(true)}
            className="border-2 border-dashed border-outline/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-5 hover:border-primary/50 hover:bg-surface-container transition-all duration-300 group min-h-[300px]"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all shadow-sm">
              <PlusCircle size={32} className="text-outline group-hover:text-on-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-bold text-on-surface text-xl font-headline">Start New Project</p>
              <p className="text-sm text-on-surface-variant max-w-[240px] mt-2 font-medium">Define a new horizon for your strategic goals and creative initiatives.</p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
