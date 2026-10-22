// ─── useHostAdapters — optional host-app integrations for cell editors ───────
// The component stays host-agnostic: the embedding app MAY provide workspace
// collaborators (person cells), an invite entry point, and a file-upload
// endpoint. Every editor degrades gracefully when a seam is absent.

import { createContext, useContext } from 'react';
import type { ComponentType } from 'react';
import type { FileAttachment } from '../types/database';

export interface CollaboratorEntry {
  id: string;
  name: string;
}

export interface HostAdapters {
  /** People authorized on this workspace — proposed by person cells. */
  collaborators?: CollaboratorEntry[];
  /** Opens the host's invite/connect flow ("+ Invite" in the person editor). */
  onInvitePerson?: (query: string) => void;
  /** Persists a file and returns its attachment; absent → small files inline as data URLs. */
  uploadFile?: (file: File) => Promise<FileAttachment>;
  /**
   * The host's locked diagram renderer; absent → the kit shows the source
   * only, it never renders Mermaid itself.
   */
  MermaidDiagram?: ComponentType<{ chart: string; codeTheme?: 'dark' | 'light' }>;
}

const HostAdaptersContext = createContext<HostAdapters>({});

export const HostAdaptersProvider = HostAdaptersContext.Provider;

export function useHostAdapters(): HostAdapters {
  return useContext(HostAdaptersContext);
}
