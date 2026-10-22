import type { Notation } from './engine/chords.ts';

export type Theme = 'light' | 'dark' | 'auto';
export type Palette = 'esmeralda' | 'vino' | 'azul' | 'grafito';
export interface Settings { notation: Notation; theme: Theme; palette: Palette; zoom: number; wake: boolean }

const KEY = 'cantoral.settings';
const DEFAULTS: Settings = { notation: 'latin', theme: 'light', palette: 'esmeralda', zoom: 1, wake: true };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return { ...DEFAULTS, ...(raw ? (JSON.parse(raw) as Partial<Settings>) : {}) };
  } catch { return { ...DEFAULTS }; }
}

export const settings: Settings = load();
const dark = window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme(): void {
  const r = document.documentElement;
  r.dataset.mode = settings.theme === 'auto' ? (dark.matches ? 'dark' : 'light') : settings.theme;
  if (settings.palette === 'esmeralda') delete r.dataset.pal; else r.dataset.pal = settings.palette;
}
dark.addEventListener('change', applyTheme);

export function saveSettings(): void {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* sin almacenamiento: se usa solo en esta sesión */ }
  applyTheme();
}
