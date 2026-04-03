// ── Page tree store ───────────────────────────────────────────────────────────
// Holds pages per workspace, tracks the active page, and maintains a
// localStorage-persisted recents list.

import { create } from 'zustand';
import { api } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageEntry {
  _id: string;
  title: string;
  icon?: string;
  workspaceId: string;
  parentPageId?: string | null;
  databaseId?: string | null;
  archivedAt?: string | null;
}

export type ActivePageKind = 'page' | 'database' | 'home';

export interface ActivePage {
  id: string;
  workspaceId: string;
  kind: ActivePageKind;
  title?: string;
  icon?: string;
}

interface PageStore {
  pages: Record<string, PageEntry[]>;           // keyed by workspaceId
  activePage: ActivePage | null;
  recents: ActivePage[];                         // last 10 opened
  loadingIds: Set<string>;                       // workspaceIds currently fetching

  fetchPages: (workspaceId: string, jwt: string) => Promise<void>;
  openPage: (page: ActivePage) => void;
  addPage: (workspaceId: string, title: string, jwt: string, parentPageId?: string) => Promise<PageEntry | null>;
  deletePage: (pageId: string, workspaceId: string, jwt: string) => Promise<void>;
  clearWorkspace: (workspaceId: string) => void;

  // Selectors
  pagesForWorkspace: (workspaceId: string) => PageEntry[];
  rootPages: (workspaceId: string) => PageEntry[];
  childPages: (parentId: string, workspaceId: string) => PageEntry[];
}

const RECENTS_KEY = 'pg:recents';

function loadRecents(): ActivePage[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]') as ActivePage[];
  } catch {
    return [];
  }
}

function saveRecents(recents: ActivePage[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  } catch {
    // localStorage might be unavailable (e.g. private browsing quota)
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePageStore = create<PageStore>((set, get) => ({
  pages:      {},
  activePage: null,
  recents:    loadRecents(),
  loadingIds: new Set<string>(),

  fetchPages: async (workspaceId, jwt) => {
    if (get().loadingIds.has(workspaceId)) return;
    set(s => ({ loadingIds: new Set([...s.loadingIds, workspaceId]) }));
    try {
      const data = await api.get<PageEntry[]>(`/api/pages?workspaceId=${workspaceId}`, jwt);
      set(s => ({
        pages:      { ...s.pages, [workspaceId]: data },
        loadingIds: new Set([...s.loadingIds].filter(id => id !== workspaceId)),
      }));
    } catch {
      set(s => ({
        loadingIds: new Set([...s.loadingIds].filter(id => id !== workspaceId)),
      }));
    }
  },

  openPage: (page) => {
    set(s => {
      const recents = [page, ...s.recents.filter(r => r.id !== page.id)].slice(0, 10);
      saveRecents(recents);
      return { activePage: page, recents };
    });
  },

  addPage: async (workspaceId, title, jwt, parentPageId) => {
    try {
      const page = await api.post<PageEntry>(
        '/api/pages',
        { workspaceId, title, parentPageId },
        jwt,
      );
      set(s => ({
        pages: {
          ...s.pages,
          [workspaceId]: [...(s.pages[workspaceId] ?? []), page],
        },
      }));
      return page;
    } catch {
      return null;
    }
  },

  deletePage: async (pageId, workspaceId, jwt) => {
    try {
      await api.delete(`/api/pages/${pageId}`, jwt);
      set(s => ({
        pages: {
          ...s.pages,
          [workspaceId]: (s.pages[workspaceId] ?? []).filter(p => p._id !== pageId),
        },
      }));
    } catch {
      // silent
    }
  },

  clearWorkspace: (workspaceId) => {
    set(s => {
      const pages = { ...s.pages };
      delete pages[workspaceId];
      return { pages };
    });
  },

  pagesForWorkspace: (workspaceId) => get().pages[workspaceId] ?? [],

  rootPages: (workspaceId) =>
    (get().pages[workspaceId] ?? []).filter(
      p => !p.parentPageId && !p.archivedAt,
    ),

  childPages: (parentId, workspaceId) =>
    (get().pages[workspaceId] ?? []).filter(
      p => p.parentPageId === parentId && !p.archivedAt,
    ),
}));
