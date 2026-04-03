// ── Multi-user store ──────────────────────────────────────────────────────────
// Manages 3 pre-defined users. All are "logged in" at startup (init() calls
// the API for each). switchUser(id) is instant — no auth forms needed.
// Gracefully degrades to empty workspaces if the API isn't running.

import { create } from 'zustand';
import { api } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaticPersona {
  /** Filled by init() after first successful login. Empty string until then. */
  id: string;
  email: string;
  password: string;
  name: string;
  emoji: string;
  roleBadge: string;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  settings?: Record<string, unknown>;
}

interface UserSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
  privateWorkspaces: Workspace[];  // workspaces owned by this user
  sharedWorkspaces: Workspace[];   // workspaces where user is member but not owner
}

interface UserStore {
  personas: StaticPersona[];
  sessions: Record<string, UserSession>;
  activeUserId: string;
  initialized: boolean;
  loading: boolean;
  error: string | null;

  init: () => Promise<void>;
  switchUser: (userId: string) => void;
  refreshWorkspaces: (userId: string) => Promise<void>;
  createWorkspace: (name: string, slug: string) => Promise<Workspace | null>;

  // Selectors
  activeSession: () => UserSession | null;
  activePersona: () => StaticPersona | null;
  activeJwt: () => string | null;
  personaById: (id: string) => StaticPersona | undefined;
}

// ─── Static personas (order: admin first so it's the default active user) ────

const INITIAL_PERSONAS: StaticPersona[] = [
  {
    id: '',
    email: 'admin@playground.local',
    password: 'playground123',
    name: 'Dylan Admin',
    emoji: '👑',
    roleBadge: 'Admin',
  },
  {
    id: '',
    email: 'alex@playground.local',
    password: 'playground123',
    name: 'Alex Collaborator',
    emoji: '🎨',
    roleBadge: 'Member',
  },
  {
    id: '',
    email: 'sam@playground.local',
    password: 'playground123',
    name: 'Sam Guest',
    emoji: '👁️',
    roleBadge: 'Guest',
  },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

/** Resolved API base URL — empty string means "no API configured → offline" */
const API_BASE: string = ((import.meta.env as Record<string, string>)['VITE_API_URL'] ?? '').trim();

async function loginPersona(persona: StaticPersona) {
  if (!API_BASE) return null; // no API configured → skip fetch entirely
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(
      `${API_BASE}/api/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: persona.email, password: persona.password }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return { userId: data.user.id as string, accessToken: data.accessToken as string, refreshToken: data.refreshToken as string };
  } catch {
    return null;
  }
}

async function fetchWorkspaces(jwt: string): Promise<Workspace[]> {
  if (!jwt || !API_BASE) return [];  // offline mode — skip network call
  try {
    return await api.get<Workspace[]>('/api/workspaces', jwt);
  } catch {
    return [];
  }
}

function partition(workspaces: Workspace[], ownerId: string) {
  return {
    privateWorkspaces: workspaces.filter(w => w.ownerId === ownerId),
    sharedWorkspaces:  workspaces.filter(w => w.ownerId !== ownerId),
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

// Module-level guard against React Strict Mode double-invoke
let _initInProgress = false;

export const useUserStore = create<UserStore>((set, get) => ({
  personas:     INITIAL_PERSONAS.map(p => ({ ...p })),
  sessions:     {},
  activeUserId: '',
  initialized:  false,
  loading:      false,
  error:        null,

  init: async () => {
    if (get().initialized || _initInProgress) return;
    _initInProgress = true;
    set({ loading: true, error: null });

    const updatedPersonas = [...get().personas];
    const sessions: Record<string, UserSession> = {};
    let firstUserId = '';

    // Try to log in the first persona as a connectivity check.
    // If it fails, skip all remaining logins and go to offline mode.
    const firstLogin = await loginPersona(INITIAL_PERSONAS[0]);

    if (firstLogin) {
      // API is reachable — process first result and login the rest
      const { userId, accessToken, refreshToken } = firstLogin;
      updatedPersonas[0] = { ...updatedPersonas[0], id: userId };
      const workspaces = await fetchWorkspaces(accessToken);
      const { privateWorkspaces, sharedWorkspaces } = partition(workspaces, userId);
      sessions[userId] = { userId, accessToken, refreshToken, privateWorkspaces, sharedWorkspaces };
      firstUserId = userId;

      // Login remaining personas
      const remainingResults = await Promise.all(INITIAL_PERSONAS.slice(1).map(loginPersona));
      for (let i = 0; i < remainingResults.length; i++) {
        const lr = remainingResults[i];
        if (!lr) continue;
        const idx = i + 1; // offset since we already did index 0
        updatedPersonas[idx] = { ...updatedPersonas[idx], id: lr.userId };
        const ws = await fetchWorkspaces(lr.accessToken);
        const parts = partition(ws, lr.userId);
        sessions[lr.userId] = { userId: lr.userId, accessToken: lr.accessToken, refreshToken: lr.refreshToken, privateWorkspaces: parts.privateWorkspaces, sharedWorkspaces: parts.sharedWorkspaces };
      }
    }

    // ── Offline fallback: if all API logins failed, create mock sessions ──
    if (Object.keys(sessions).length === 0) {
      console.info('[playground] API unreachable — running in offline mode with seed data');
      const sharedWs: Workspace = {
        _id: 'mock-ws-shared-team',
        name: 'Team Workspace',
        slug: 'team',
        ownerId: 'mock-user-0',
      };
      for (let i = 0; i < updatedPersonas.length; i++) {
        const mockId = `mock-user-${i}`;
        updatedPersonas[i] = { ...updatedPersonas[i], id: mockId };
        sessions[mockId] = {
          userId: mockId,
          accessToken: '',
          refreshToken: '',
          privateWorkspaces: [{
            _id: `mock-ws-private-${i}`,
            name: `Notion de ${updatedPersonas[i].name.split(' ')[0].toLowerCase()}`,
            slug: updatedPersonas[i].name.toLowerCase().replace(/\s+/g, '-'),
            ownerId: mockId,
          }],
          sharedWorkspaces: [sharedWs],
        };
        if (!firstUserId) firstUserId = mockId;
      }
    }

    set({ personas: updatedPersonas, sessions, activeUserId: firstUserId, initialized: true, loading: false });
    _initInProgress = false;
  },

  switchUser: (userId: string) => set({ activeUserId: userId }),

  refreshWorkspaces: async (userId: string) => {
    const session = get().sessions[userId];
    if (!session) return;
    const workspaces = await fetchWorkspaces(session.accessToken);
    const { privateWorkspaces, sharedWorkspaces } = partition(workspaces, userId);
    set(s => ({
      sessions: {
        ...s.sessions,
        [userId]: { ...session, privateWorkspaces, sharedWorkspaces },
      },
    }));
  },

  createWorkspace: async (name, slug) => {
    const jwt = get().activeJwt();
    if (!jwt) return null;
    try {
      const ws = await api.post<Workspace>('/api/workspaces', { name, slug }, jwt);
      const uid = get().activeUserId;
      await get().refreshWorkspaces(uid);
      return ws;
    } catch {
      return null;
    }
  },

  activeSession: () => {
    const { sessions, activeUserId } = get();
    return sessions[activeUserId] ?? null;
  },

  activePersona: () => {
    const { personas, activeUserId } = get();
    return personas.find(p => p.id === activeUserId) ?? personas[0] ?? null;
  },

  activeJwt: () => get().activeSession()?.accessToken ?? null,

  personaById: (id: string) => get().personas.find(p => p.id === id),
}));

// Expose on globalThis so usePageStore can access JWT without circular imports
(globalThis as any).__playgroundUserStore = useUserStore;
