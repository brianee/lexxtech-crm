'use client';

import React from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'green' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'violet';
export type KanbanDefaultView = 'status' | 'project';

export interface AppSettings {
  theme: ThemeMode;
  accentColor: AccentColor;
  crmName: string;
  kanbanDefaultView: KanbanDefaultView;
  profile: {
    displayName: string;
    avatarUrl: string;
  };
  notifications: {
    overdueAlerts: boolean;
    dormantContactReminders: boolean;
    projectMilestoneAlerts: boolean;
  };
}

const DEFAULTS: AppSettings = {
  theme: 'dark',
  accentColor: 'green',
  crmName: 'lexxtech',
  kanbanDefaultView: 'status',
  profile: { displayName: '', avatarUrl: '' },
  notifications: {
    overdueAlerts: true,
    dormantContactReminders: true,
    projectMilestoneAlerts: true,
  },
};

const STORAGE_KEY = 'lexxtech_crm_settings';

// Accent color palettes: [primary, primary-dim]
export const ACCENT_COLORS: Record<AccentColor, { primary: string; dim: string; label: string; swatch: string }> = {
  green:  { primary: '#21B225', dim: '#1a8e1d', label: 'Emerald',  swatch: '#21B225' },
  indigo: { primary: '#6366f1', dim: '#4f52c5', label: 'Indigo',   swatch: '#6366f1' },
  amber:  { primary: '#f59e0b', dim: '#d97706', label: 'Amber',    swatch: '#f59e0b' },
  rose:   { primary: '#f43f5e', dim: '#e11d48', label: 'Rose',     swatch: '#f43f5e' },
  cyan:   { primary: '#06b6d4', dim: '#0891b2', label: 'Cyan',     swatch: '#06b6d4' },
  violet: { primary: '#8b5cf6', dim: '#7c3aed', label: 'Violet',   swatch: '#8b5cf6' },
};

// Light theme surface overrides
const LIGHT_SURFACES = {
  '--surface': '#f8f9fa',
  '--on-surface': '#1a1a2e',
  '--on-surface-variant': '#6b7280',
  '--surface-container-lowest': '#ffffff',
  '--surface-container-low': '#f1f3f5',
  '--surface-container': '#e9ecef',
  '--surface-container-high': '#dee2e6',
  '--surface-container-highest': '#ced4da',
  '--outline': '#adb5bd',
  '--outline-variant': '#ced4da',
  '--background': '#f0f2f5',
  '--on-primary': '#ffffff',
};

const DARK_SURFACES = {
  '--surface': '#0f1117',
  '--on-surface': '#e8eaed',
  '--on-surface-variant': '#9aa0a6',
  '--surface-container-lowest': '#0a0d12',
  '--surface-container-low': '#141820',
  '--surface-container': '#1a1f2e',
  '--surface-container-high': '#1f2535',
  '--surface-container-highest': '#252b3b',
  '--outline': '#3c4455',
  '--outline-variant': '#2a3040',
  '--background': '#0a0d12',
  '--on-primary': '#ffffff',
};

function applyTheme(theme: ThemeMode, accent: AccentColor) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const surfaces = isDark ? DARK_SURFACES : LIGHT_SURFACES;
  Object.entries(surfaces).forEach(([k, v]) => root.style.setProperty(k, v));
  const { primary, dim } = ACCENT_COLORS[accent];
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-dim', dim);
}

function load(): AppSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function save(settings: AppSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useSettings() {
  const [settings, setSettingsState] = React.useState<AppSettings>(DEFAULTS);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const loaded = load();
    setSettingsState(loaded);
    applyTheme(loaded.theme, loaded.accentColor);
    setMounted(true);
  }, []);

  const updateSettings = React.useCallback((patch: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)) => {
    setSettingsState(prev => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      save(next);
      applyTheme(next.theme, next.accentColor);
      return next;
    });
  }, []);

  return { settings, updateSettings, mounted };
}
