'use client';

import React from 'react';
import { Search, CheckCircle2, Folder, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { Task, Project, Contact } from '@/lib/types';

type SearchResult = {
  id: string;
  type: 'task' | 'project' | 'contact';
  title: string;
  subtitle: string;
  href: string;
};

function buildResults(query: string, tasks: Task[], projects: Project[], contacts: Contact[]): SearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 4).forEach(t =>
    results.push({
      id: `t-${t.id}`, type: 'task', title: t.title,
      subtitle: `${t.status} · ${t.priority} priority`,
      href: '/tasks',
    })
  );
  projects.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)).slice(0, 3).forEach(p =>
    results.push({
      id: `p-${p.id}`, type: 'project', title: p.name,
      subtitle: p.description || `${p.progress}% complete`,
      href: '/projects',
    })
  );
  contacts.filter(c => c.name.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.role?.toLowerCase().includes(q)).slice(0, 3).forEach(c =>
    results.push({
      id: `c-${c.id}`, type: 'contact', title: c.name,
      subtitle: [c.role, c.company].filter(Boolean).join(' @ ') || c.status,
      href: '/contacts',
    })
  );

  return results;
}

const TYPE_ICON = { task: CheckCircle2, project: Folder, contact: Users };
const TYPE_COLOR = { task: 'text-primary bg-primary/10', project: 'text-secondary bg-secondary/10', contact: 'text-tertiary bg-tertiary/10' };

interface SearchDropdownProps {
  tasks: Task[];
  projects: Project[];
  contacts: Contact[];
}

export default function SearchDropdown({ tasks, projects, contacts }: SearchDropdownProps) {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = React.useMemo(() => buildResults(query, tasks, projects, contacts), [query, tasks, projects, contacts]);

  React.useEffect(() => {
    setSelectedIdx(0);
  }, [results]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); router.push(results[selectedIdx].href); setOpen(false); setQuery(''); }
    if (e.key === 'Escape')    { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div className="relative flex-1 max-w-xl">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 transition-colors group-focus-within:text-primary" size={18} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full bg-surface-container-low border border-outline/30 rounded-full py-2 pl-10 pr-8 text-xs focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all text-on-surface placeholder-on-surface-variant/40 outline-none"
          placeholder="Search tasks, projects, contacts…"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && query && (
        <>
          <div className="fixed inset-0 z-[44]" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 right-0 mt-2 z-[45] bg-surface-container-low border border-outline/20 rounded-2xl shadow-2xl overflow-hidden"
            style={{ boxShadow: '0 0 0 1px rgba(33,178,37,0.08), 0 20px 40px rgba(0,0,0,0.4)' }}
          >
            {results.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-sm text-on-surface-variant opacity-50">No results for <span className="font-bold text-on-surface">"{query}"</span></p>
              </div>
            ) : (
              <div>
                <p className="px-5 pt-3 pb-1 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest opacity-50">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </p>
                {results.map((r, i) => {
                  const Icon = TYPE_ICON[r.type];
                  return (
                    <button
                      key={r.id}
                      onClick={() => { router.push(r.href); setOpen(false); setQuery(''); }}
                      onMouseEnter={() => setSelectedIdx(i)}
                      className={cn(
                        'w-full flex items-center gap-3 px-5 py-3 text-left transition-colors',
                        i === selectedIdx ? 'bg-surface-container' : 'hover:bg-surface-container'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', TYPE_COLOR[r.type])}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-on-surface line-clamp-1">{r.title}</p>
                        <p className="text-[11px] text-on-surface-variant capitalize">{r.subtitle}</p>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-wider shrink-0">{r.type}</span>
                    </button>
                  );
                })}
                <div className="px-5 py-2 border-t border-outline/10 flex items-center gap-3">
                  <span className="text-[10px] text-on-surface-variant opacity-40">↑↓ to navigate</span>
                  <span className="text-[10px] text-on-surface-variant opacity-40">↵ to go</span>
                  <span className="text-[10px] text-on-surface-variant opacity-40">esc to close</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
