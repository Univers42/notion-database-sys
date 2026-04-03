import React, { useEffect } from 'react';
import {
  Search,
  Home,
  CalendarDays,
  Inbox,
  BookOpen,
  Clock,
  Users,
  Settings,
  Trash2,
} from 'lucide-react';

import { useUserStore }  from '../../store/useUserStore';
import { usePageStore }  from '../../store/usePageStore';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { SidebarNavItem }    from './SidebarNavItem';
import { SidebarSection }    from './SidebarSection';
import { PageTreeItem }      from './PageTreeItem';

interface Props {
  onOpenHome?:     () => void;
  onOpenSettings?: () => void;
}

/**
 * Full 240 px-wide Notion-style left sidebar.
 *
 * Structure
 * ─────────
 * WorkspaceSwitcher (header)
 * ├── Search / Home / Meetings / Inbox / Library  (nav items)
 * ├── Recents
 * ├── [Private workspace pages]   (one section per private workspace)
 * ├── [Shared workspace pages]
 * └── Settings / Trash (footer)
 */
export const NotionSidebar: React.FC<Props> = ({ onOpenHome, onOpenSettings }) => {
  const session        = useUserStore(s => s.activeSession());
  const persona        = useUserStore(s => s.activePersona());
  const activePage     = usePageStore(s => s.activePage);
  const recents        = usePageStore(s => s.recents);
  const fetchPages     = usePageStore(s => s.fetchPages);
  const openPage       = usePageStore(s => s.openPage);
  const addPage        = usePageStore(s => s.addPage);
  const pagesForWs     = usePageStore(s => s.pagesForWorkspace);

  const jwt = session?.accessToken ?? '';

  // Fetch pages whenever the active user's workspaces change
  useEffect(() => {
    const allWs = [
      ...(session?.privateWorkspaces  ?? []),
      ...(session?.sharedWorkspaces   ?? []),
    ];
    for (const ws of allWs) {
      fetchPages(ws._id, jwt);
    }
  }, [session?.privateWorkspaces, session?.sharedWorkspaces, jwt, fetchPages]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function handleAddToWorkspace(wsId: string) {
    addPage(wsId, 'Untitled', jwt);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <aside
      className={[
        'w-[240px] h-full flex flex-col shrink-0 overflow-hidden',
        'bg-[var(--color-surface-secondary)] border-r border-[var(--color-line)]',
      ].join(' ')}
    >
      {/* ── Workspace switcher (top) ─────────────────────────────────────── */}
      <WorkspaceSwitcher />

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">

        {/* Top-level nav items */}
        <div className="flex flex-col gap-px mt-1">
          <SidebarNavItem
            icon={<Search size={15} />}
            label="Search"
            onClick={() => {/* TODO: open search modal */}}
          />
          <SidebarNavItem
            icon={<Home size={15} />}
            label="Home"
            active={activePage === null}
            onClick={() => onOpenHome?.()}
          />
          <SidebarNavItem
            icon={<CalendarDays size={15} />}
            label="Meetings"
            onClick={() => {/* placeholder */}}
          />
          <SidebarNavItem
            icon={<Inbox size={15} />}
            label="Inbox"
            onClick={() => {/* placeholder */}}
          />
          <SidebarNavItem
            icon={<BookOpen size={15} />}
            label="Library"
            onClick={() => {/* placeholder */}}
          />
        </div>

        {/* ── Recents ──────────────────────────────────────────────────── */}
        {recents.length > 0 && (
          <SidebarSection label="Recents">
            {recents.slice(0, 5).map(r => (
              <SidebarNavItem
                key={r.id}
                icon={<Clock size={13} />}
                label={r.title ?? 'Untitled'}
                active={activePage?.id === r.id}
                onClick={() => openPage(r)}
              />
            ))}
          </SidebarSection>
        )}

        {/* ── Private workspaces ───────────────────────────────────────── */}
        {(session?.privateWorkspaces ?? []).map(ws => {
          const pages = pagesForWs(ws._id).filter(p => !p.parentPageId && !p.archivedAt);
          return (
            <SidebarSection
              key={ws._id}
              label={ws.name}
              defaultOpen
              onAdd={() => handleAddToWorkspace(ws._id)}
            >
              {pages.length === 0 && (
                <p className="px-3 py-1 text-xs text-[var(--color-ink-faint)] italic">
                  No pages yet
                </p>
              )}
              {pages.map(page => (
                <PageTreeItem
                  key={page._id}
                  page={page}
                  workspaceId={ws._id}
                  jwt={jwt}
                  depth={0}
                  activeId={activePage?.id}
                />
              ))}
            </SidebarSection>
          );
        })}

        {/* ── Shared workspaces ────────────────────────────────────────── */}
        {(session?.sharedWorkspaces ?? []).map(ws => {
          const pages = pagesForWs(ws._id).filter(p => !p.parentPageId && !p.archivedAt);
          return (
            <SidebarSection
              key={ws._id}
              label={ws.name}
              defaultOpen
              onAdd={() => handleAddToWorkspace(ws._id)}
            >
              <div className="flex items-center gap-1 px-3 mb-1">
                <Users size={11} className="text-[var(--color-ink-faint)]" />
                <span className="text-[10px] text-[var(--color-ink-faint)]">Shared</span>
              </div>
              {pages.length === 0 && (
                <p className="px-3 py-1 text-xs text-[var(--color-ink-faint)] italic">
                  No pages yet
                </p>
              )}
              {pages.map(page => (
                <PageTreeItem
                  key={page._id}
                  page={page}
                  workspaceId={ws._id}
                  jwt={jwt}
                  depth={0}
                  activeId={activePage?.id}
                />
              ))}
            </SidebarSection>
          );
        })}

      </nav>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-2 pb-2 border-t border-[var(--color-line)] pt-1 flex flex-col gap-px">
        <SidebarNavItem
          icon={<Settings size={15} />}
          label="Settings"
          onClick={() => onOpenSettings?.()}
        />
        <SidebarNavItem
          icon={<Trash2 size={15} />}
          label="Trash"
          onClick={() => {/* placeholder */}}
        />
        {/* Current user display */}
        {persona && (
          <div className="flex items-center gap-2 mt-1 px-2 py-1">
            <span className="text-base leading-none">{persona.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--color-ink)] truncate">{persona.name}</p>
              <p className="text-[10px] text-[var(--color-ink-faint)] truncate">{persona.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
