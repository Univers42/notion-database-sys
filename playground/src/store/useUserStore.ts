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

async function loginPersona(persona: StaticPersona) {
  try {
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: { id: string };
    }>('/api/auth/login', { email: persona.email, password: persona.password });
    return { userId: res.user.id, accessToken: res.accessToken, refreshToken: res.refreshToken };
  } catch {
    return null;
  }
}

async function fetchWorkspaces(jwt: string): Promise<Workspace[]> {
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

export const useUserStore = create<UserStore>((set, get) => ({
  personas:     INITIAL_PERSONAS.map(p => ({ ...p })),
  sessions:     {},
  activeUserId: '',
  initialized:  false,
  loading:      false,
  error:        null,

  init: async () => {
    if (get().initialized) return;
    set({ loading: true, error: null });

    const updatedPersonas = [...get().personas];
    const sessions: Record<string, UserSession> = {};
    let firstUserId = '';

    // Login all personas in parallel
    const loginResults = await Promise.all(INITIAL_PERSONAS.map(loginPersona));

    // Fetch workspaces for each logged-in user (sequential to avoid hammering a dev server)
    for (let i = 0; i < INITIAL_PERSONAS.length; i++) {
      const lr = loginResults[i];
      if (!lr) continue;
      const { userId, accessToken, refreshToken } = lr;
      updatedPersonas[i] = { ...updatedPersonas[i], id: userId };
      const workspaces = await fetchWorkspaces(accessToken);
      const { privateWorkspaces, sharedWorkspaces } = partition(workspaces, userId);
      sessions[userId] = { userId, accessToken, refreshToken, privateWorkspaces, sharedWorkspaces };
      if (!firstUserId) firstUserId = userId;
    }

    set({ personas: updatedPersonas, sessions, activeUserId: firstUserId, initialized: true, loading: false });
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
