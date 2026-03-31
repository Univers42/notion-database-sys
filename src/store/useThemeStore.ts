import { create } from 'zustand';

// ═══════════════════════════════════════════════════════════════════════════════
// THEME STORE — Light / Dark / System preference
// ═══════════════════════════════════════════════════════════════════════════════

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'ndb-theme';

/** Read the OS-level color preference */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Read persisted preference from localStorage (defaults to 'system') */
function getStoredPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch { /* SSR / privacy */ }
  return 'system';
}

/** Apply the resolved theme to the DOM — single attribute swap,
 *  CSS custom properties cascade instantly with zero JS overhead. */
function applyTheme(resolved: ResolvedTheme): void {
  const el = document.documentElement;
  if (el.getAttribute('data-theme') === resolved) return; // no-op guard
  el.setAttribute('data-theme', resolved);
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface ThemeState {
  preference: ThemePreference;   // What the user chose
  resolved: ResolvedTheme;       // Actual theme applied to DOM
  setTheme: (pref: ThemePreference) => void;
  cycleTheme: () => void;        // light → dark → system → light
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const preference = getStoredPreference();
  const resolved = preference === 'system' ? getSystemTheme() : preference;

  // Apply immediately on store creation
  applyTheme(resolved);

  return {
    preference,
    resolved,

    setTheme: (pref) => {
      const next = pref === 'system' ? getSystemTheme() : pref;
      localStorage.setItem(STORAGE_KEY, pref);
      applyTheme(next);
      set({ preference: pref, resolved: next });
    },

    cycleTheme: () => {
      const order: ThemePreference[] = ['light', 'dark', 'system'];
      const idx = order.indexOf(get().preference);
      const next = order[(idx + 1) % order.length];
      get().setTheme(next);
    },
  };
});

// ─── Listen for OS-level changes when preference is "system" ─────────────────

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { preference } = useThemeStore.getState();
    if (preference === 'system') {
      const resolved = getSystemTheme();
      applyTheme(resolved);
      useThemeStore.setState({ resolved });
    }
  });
}
