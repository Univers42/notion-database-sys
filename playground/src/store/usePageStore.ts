// ── Page tree store ───────────────────────────────────────────────────────────
// Holds pages per workspace, tracks the active page, and maintains a
// localStorage-persisted recents list.
//
// Persistence modes:
//   1. Online  — all mutations go through the Fastify API → MongoDB
//   2. Offline — falls back to in-memory seed data (no persistence)
//
// Block edits use debounced persistence: local state updates instantly,
// then the full content[] array is PATCH'd to the API after 400ms idle.

import { create } from 'zustand';
import { api } from '../api/client';
import { SEED_PAGES, type SeedPage } from '../data/seedPages';
import type { Block, BlockType } from '@src/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageEntry {
  _id: string;
  title: string;
  icon?: string;
  workspaceId: string;
  parentPageId?: string | null;
  databaseId?: string | null;
  archivedAt?: string | null;
  /** Block content (only populated in offline/seed mode) */
  content?: Block[];
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
  seeded: boolean;                                // true once seed data is loaded

  fetchPages: (workspaceId: string, jwt: string) => Promise<void>;
  /** Fetch full page data (with content) from API */
  fetchPageContent: (pageId: string, jwt: string) => Promise<void>;
  /** Load seed pages into the store (call once after user store init) */
  seedOfflinePages: () => void;
  /** Seed pages to MongoDB via the API (online mode) */
  seedOnlinePages: (workspaceMap: Record<string, string>, jwt: string) => Promise<void>;
  openPage: (page: ActivePage) => void;
  addPage: (workspaceId: string, title: string, jwt: string, parentPageId?: string) => Promise<PageEntry | null>;
  deletePage: (pageId: string, workspaceId: string, jwt: string) => Promise<void>;
  clearWorkspace: (workspaceId: string) => void;

  // ── Block-level CRUD ──────────────────────────────────────────────────────
  updateBlock: (pageId: string, blockId: string, updates: Partial<Block>) => void;
  insertBlock: (pageId: string, afterBlockId: string, block: Block) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  changeBlockType: (pageId: string, blockId: string, newType: BlockType) => void;
  updatePageContent: (pageId: string, blocks: Block[]) => void;
  updatePageTitle: (pageId: string, title: string) => void;

  // Selectors
  pagesForWorkspace: (workspaceId: string) => PageEntry[];
  rootPages: (workspaceId: string) => PageEntry[];
  childPages: (parentId: string, workspaceId: string) => PageEntry[];
  /** Get full page data including content (for rendering) */
  pageById: (pageId: string) => PageEntry | undefined;
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

/** Convert seed page format to PageEntry (with content) */
function seedToEntry(sp: SeedPage): PageEntry {
  return {
    _id:          sp._id,
    title:        sp.title,
    icon:         sp.icon,
    workspaceId:  sp.workspaceId,
    parentPageId: sp.parentPageId ?? null,
    databaseId:   sp.databaseId ?? null,
    archivedAt:   sp.archivedAt ?? null,
    content:      sp.content,
  };
}

let _localIdCounter = 0;
function localId(): string {
  return `local-page-${++_localIdCounter}-${Date.now().toString(36)}`;
}

// ─── Debounced content persistence ───────────────────────────────────────────
// Block edits update Zustand immediately for snappy UI, then debounce-save
// the full content[] to the API after 400ms idle.

const _contentTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debouncePersistContent(pageId: string) {
  const existing = _contentTimers.get(pageId);
  if (existing) clearTimeout(existing);

  _contentTimers.set(pageId, setTimeout(() => {
    _contentTimers.delete(pageId);
    persistPageContent(pageId);
  }, 400));
}

/** Flush all pending debounced saves immediately (used on page unload) */
function flushPendingPersists() {
  for (const [pageId, timer] of _contentTimers.entries()) {
    clearTimeout(timer);
    _contentTimers.delete(pageId);
    // Use sendBeacon for reliability during page unload
    const state = usePageStore.getState();
    const page = state.pageById(pageId);
    if (!page?.content) continue;
    const jwt = getActiveJwt();
    if (!jwt) continue;
    const url = `${(import.meta.env as Record<string, string>)['VITE_API_URL'] ?? 'http://localhost:4000'}/api/pages/${pageId}`;
    // sendBeacon doesn't support custom headers — fall back to sync XHR
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('PATCH', url, false); // synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${jwt}`);
      xhr.send(JSON.stringify({ content: page.content }));
      console.log('[persist] flush: synced', pageId, 'status', xhr.status);
    } catch (err) {
      console.warn('[persist] flush failed for', pageId, err);
    }
  }
}

// Flush pending saves on page unload (refresh / tab close)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingPersists);
}

async function persistPageContent(pageId: string) {
  const state = usePageStore.getState();
  const page = state.pageById(pageId);
  if (!page?.content) return;

  const jwt = getActiveJwt();
  if (!jwt) return;

  try {
    await api.patch(`/api/pages/${pageId}`, { content: page.content }, jwt);
  } catch (err) {
    console.error('[persist] PATCH failed for', pageId, err);
  }
}

async function persistPageTitle(pageId: string, title: string) {
  const jwt = getActiveJwt();
  if (!jwt) return;
  try {
    await api.patch(`/api/pages/${pageId}`, { title }, jwt);
  } catch (err) {
    console.error('[persist] title PATCH failed for', pageId, err);
  }
}

/** Lazy JWT getter — avoids importing useUserStore at module top level */
function getActiveJwt(): string | null {
  try {
    const mod = (globalThis as any).__playgroundUserStore;
    if (!mod) return null;
    return mod.getState().activeJwt() || null;
  } catch {
    return null;
  }
}

// ─── Helper: locate & update a page in nested state ──────────────────────────

function updatePageInState(
  pages: Record<string, PageEntry[]>,
  pageId: string,
  updater: (page: PageEntry) => PageEntry,
): Record<string, PageEntry[]> {
  const newPages = { ...pages };
  for (const wsId of Object.keys(newPages)) {
    const list = newPages[wsId];
    const idx = list.findIndex(p => p._id === pageId);
    if (idx < 0) continue;
    newPages[wsId] = list.map((p, i) => i === idx ? updater(p) : p);
    return newPages;
  }
  return pages;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePageStore = create<PageStore>((set, get) => ({
  pages:      {},
  activePage: null,
  recents:    loadRecents(),
  loadingIds: new Set<string>(),
  seeded:     false,

  // ── Offline seed (fallback when API is unreachable) ─────────────────────

  seedOfflinePages: () => {
    if (get().seeded) return;
    const grouped: Record<string, PageEntry[]> = {};
    for (const sp of SEED_PAGES) {
      if (!grouped[sp.workspaceId]) grouped[sp.workspaceId] = [];
      grouped[sp.workspaceId].push(seedToEntry(sp));
    }
    set({ pages: grouped, seeded: true });
  },

  // ── Online seed — push seed pages to MongoDB via API ────────────────────
  // workspaceMap: { mockWsId → realWsId } mapping from useUserStore

  seedOnlinePages: async (workspaceMap, jwt) => {
    if (get().seeded) return;
    set({ seeded: true });

    // For each seed page, POST it to the API with the real workspace ID
    for (const sp of SEED_PAGES) {
      const realWsId = workspaceMap[sp.workspaceId];
      if (!realWsId) continue;

      try {
        const page = await api.post<PageEntry>(
          '/api/pages',
          {
            workspaceId: realWsId,
            title:       sp.title,
            icon:        sp.icon,
            content:     sp.content,
          },
          jwt,
        );
        // Add to local state
        set(s => ({
          pages: {
            ...s.pages,
            [realWsId]: [...(s.pages[realWsId] ?? []), page],
          },
        }));
      } catch (err) {
        console.warn('[pageStore] Failed to seed page:', sp.title, err);
      }
    }
  },

  // ── Fetch pages for a workspace ─────────────────────────────────────────

  fetchPages: async (workspaceId, jwt) => {
    if (!jwt) return; // offline — seed data already loaded
    if (get().loadingIds.has(workspaceId)) return;

    set(s => ({ loadingIds: new Set([...s.loadingIds, workspaceId]) }));
    try {
      // Use /all endpoint to get root + children (full sidebar tree)
      const data = await api.get<PageEntry[]>(`/api/pages/all?workspaceId=${workspaceId}`, jwt);
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

  // ── Fetch full page content from API ────────────────────────────────────

  fetchPageContent: async (pageId, jwt) => {
    if (!jwt) return; // offline — content already in memory
    try {
      const fullPage = await api.get<PageEntry>(`/api/pages/${pageId}`, jwt);
      if (!fullPage) return;
      set(s => ({
        pages: updatePageInState(s.pages, pageId, p => ({
          ...p,
          content: fullPage.content ?? p.content,
          title:   fullPage.title ?? p.title,
          icon:    fullPage.icon ?? p.icon,
        })),
      }));
    } catch (err) {
      console.warn('[pageStore] fetchPageContent failed:', pageId, err);
    }
  },

  // ── Open page (with auto-fetch of content) ─────────────────────────────

  openPage: (page) => {
    set(s => {
      const recents = [page, ...s.recents.filter(r => r.id !== page.id)].slice(0, 10);
      saveRecents(recents);
      return { activePage: page, recents };
    });
    // When opening a page, fetch its full content from MongoDB
    const jwt = getActiveJwt();
    if (jwt && page.kind === 'page') {
      get().fetchPageContent(page.id, jwt);
    }
  },

  // ── Add page ────────────────────────────────────────────────────────────

  addPage: async (workspaceId, title, jwt, parentPageId) => {
    // ── Online mode: POST to API → persisted in MongoDB ───────────────────
    if (jwt) {
      try {
        const page = await api.post<PageEntry>(
          '/api/pages',
          { workspaceId, title, parentPageId, content: [] },
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
    }

    // ── Offline mode: create locally ──────────────────────────────────────
    const newPage: PageEntry = {
      _id:          localId(),
      title,
      workspaceId,
      parentPageId: parentPageId ?? null,
      databaseId:   null,
      archivedAt:   null,
      content:      [],
    };
    set(s => ({
      pages: {
        ...s.pages,
        [workspaceId]: [...(s.pages[workspaceId] ?? []), newPage],
      },
    }));
    return newPage;
  },

  // ── Delete page ─────────────────────────────────────────────────────────

  deletePage: async (pageId, workspaceId, jwt) => {
    if (jwt) {
      try { await api.delete(`/api/pages/${pageId}`, jwt); } catch { /* silent */ }
    }
    set(s => ({
      pages: {
        ...s.pages,
        [workspaceId]: (s.pages[workspaceId] ?? []).filter(p => p._id !== pageId),
      },
    }));
  },

  clearWorkspace: (workspaceId) => {
    set(s => {
      const pages = { ...s.pages };
      delete pages[workspaceId];
      return { pages };
    });
  },

  // ── Block-level CRUD ──────────────────────────────────────────────────────
  // Each mutation: 1) update Zustand immediately  2) debounce-persist to API

  updateBlock: (pageId, blockId, updates) => {
    set(s => ({
      pages: updatePageInState(s.pages, pageId, page => ({
        ...page,
        content: (page.content ?? []).map(b => b.id === blockId ? { ...b, ...updates } : b),
      })),
    }));
    debouncePersistContent(pageId);
  },

  insertBlock: (pageId, afterBlockId, block) => {
    set(s => ({
      pages: updatePageInState(s.pages, pageId, page => {
        const content = [...(page.content ?? [])];
        const afterIdx = content.findIndex(b => b.id === afterBlockId);
        if (afterIdx >= 0) content.splice(afterIdx + 1, 0, block);
        else content.push(block);
        return { ...page, content };
      }),
    }));
    debouncePersistContent(pageId);
  },

  deleteBlock: (pageId, blockId) => {
    set(s => ({
      pages: updatePageInState(s.pages, pageId, page => ({
        ...page,
        content: (page.content ?? []).filter(b => b.id !== blockId),
      })),
    }));
    debouncePersistContent(pageId);
  },

  changeBlockType: (pageId, blockId, newType) => {
    set(s => ({
      pages: updatePageInState(s.pages, pageId, page => ({
        ...page,
        content: (page.content ?? []).map(b => b.id === blockId ? { ...b, type: newType } : b),
      })),
    }));
    debouncePersistContent(pageId);
  },

  updatePageContent: (pageId, blocks) => {
    set(s => ({
      pages: updatePageInState(s.pages, pageId, page => ({ ...page, content: blocks })),
    }));
    debouncePersistContent(pageId);
  },

  updatePageTitle: (pageId, title) => {
    set(s => ({
      pages: updatePageInState(s.pages, pageId, page => ({ ...page, title })),
    }));
    persistPageTitle(pageId, title);
  },

  // ── Selectors ───────────────────────────────────────────────────────────

  pagesForWorkspace: (workspaceId) => get().pages[workspaceId] ?? [],

  rootPages: (workspaceId) =>
    (get().pages[workspaceId] ?? []).filter(
      p => !p.parentPageId && !p.archivedAt,
    ),

  childPages: (parentId, workspaceId) =>
    (get().pages[workspaceId] ?? []).filter(
      p => p.parentPageId === parentId && !p.archivedAt,
    ),

  pageById: (pageId) => {
    const allPages = Object.values(get().pages).flat();
    return allPages.find(p => p._id === pageId);
  },
}));
