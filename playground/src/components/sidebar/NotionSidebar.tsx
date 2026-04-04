/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   NotionSidebar.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:06:16 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useEffect, useState } from 'react';
import {
  Search,
  Home,
  Mic,
  Sparkles,
  Inbox,
  BookOpen,
  Plus,
  Settings,
  LayoutGrid,
  Trash2,
  Mail,
  CalendarRange,
  Monitor,
  UserPlus,
  X,
  File,
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

/** Renders the 275px Notion-style sidebar with navigation, page tree, and user switching. */
export const NotionSidebar: React.FC<Props> = ({ onOpenHome, onOpenSettings }) => {
  const session        = useUserStore(s => s.activeSession());
  const _persona       = useUserStore(s => s.activePersona());
  const activePage     = usePageStore(s => s.activePage);
  const recents        = usePageStore(s => s.recents);
  const fetchPages     = usePageStore(s => s.fetchPages);
  const openPage       = usePageStore(s => s.openPage);
  const addPage        = usePageStore(s => s.addPage);
  const pagesForWs     = usePageStore(s => s.pagesForWorkspace);

  const [showInviteCTA, setShowInviteCTA] = useState(true);

  const jwt = session?.accessToken ?? '';

  // Fetch pages whenever the active user's workspaces change
  useEffect(() => {
    const allWs = [
      ...(session?.privateWorkspaces  ?? []),
      ...(session?.sharedWorkspaces   ?? []),
    ];
    for (const ws of allWs) {
      if (jwt) fetchPages(ws._id, jwt);
    }
  }, [session?.privateWorkspaces, session?.sharedWorkspaces, jwt, fetchPages]);


  function handleAddToWorkspace(wsId: string) {
    addPage(wsId, 'Untitled', jwt).then(page => {
      if (page) openPage({ id: page._id, workspaceId: wsId, kind: 'page', title: page.title });
    });
  }


  return (
    <aside
      className="w-[275px] h-full flex flex-col shrink-0 overflow-hidden bg-[var(--color-surface-secondary)]"
      style={{ boxShadow: 'inset -1px 0 0 0 var(--color-line)' }}
    >
      <WorkspaceSwitcher />

      <div className="flex flex-col gap-px pb-2 mx-2 cursor-pointer">
        <SidebarNavItem
          icon={<Search size={16} />}
          label="Search"
          onClick={() => {/* TODO: open search modal */}}
        />
        <SidebarNavItem
          icon={<Home size={16} />}
          label="Home"
          active={activePage === null}
          onClick={() => onOpenHome?.()}
        />
        <SidebarNavItem
          icon={<Mic size={16} />}
          label="Meetings"
          onClick={() => {/* placeholder */}}
        />
        <SidebarNavItem
          icon={<Sparkles size={16} />}
          label="Notion AI"
          onClick={() => {/* placeholder */}}
        />
        <SidebarNavItem
          icon={<Inbox size={16} />}
          label="Inbox"
          onClick={() => {/* placeholder */}}
        />
        <SidebarNavItem
          icon={<BookOpen size={16} />}
          label="Library"
          onClick={() => {/* placeholder */}}
        />
      </div>

      <div className="h-px w-full shrink-0 -mt-px z-[99]" style={{ boxShadow: 'transparent 0px 0px 0px', transition: 'box-shadow 300ms' }} />

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-1.5 pb-5">
        <div className="flex flex-col gap-3">

          <SidebarSection label="Recents">
            {recents.length > 0
              ? recents.slice(0, 8).map(r => (
                  <SidebarNavItem
                    key={r.id}
                    icon={r.icon
                      ? <span className="text-sm leading-none">{r.icon}</span>
                      : <File size={14} className="text-[var(--color-ink-faint)]" />
                    }
                    label={r.title ?? 'Untitled'}
                    active={activePage?.id === r.id}
                    onClick={() => openPage(r)}
                  />
                ))
              : (
                <p className="px-2 py-1 text-xs text-[var(--color-ink-faint)] italic">
                  Pages you visit will appear here
                </p>
              )
            }
          </SidebarSection>


          <SidebarSection label="Agents">
            <SidebarNavItem
              icon={<Plus size={14} />}
              label="New agent"
              subtle
              onClick={() => {/* placeholder */}}
            />
          </SidebarSection>


          {(session?.privateWorkspaces ?? []).map(ws => {
            const pages = pagesForWs(ws._id).filter(p => !p.parentPageId && !p.archivedAt);
            return (
              <SidebarSection
                key={ws._id}
                label="Private"
                defaultOpen
                onAdd={() => handleAddToWorkspace(ws._id)}
                onMore={() => {/* placeholder */}}
              >
                {pages.length === 0 && (
                  <p className="px-2 py-1 text-xs text-[var(--color-ink-faint)] italic">
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


          <SidebarSection label="Shared">
            {(session?.sharedWorkspaces ?? []).length > 0
              ? (session?.sharedWorkspaces ?? []).map(ws => {
                  const pages = pagesForWs(ws._id).filter(p => !p.parentPageId && !p.archivedAt);
                  return pages.map(page => (
                    <PageTreeItem
                      key={page._id}
                      page={page}
                      workspaceId={ws._id}
                      jwt={jwt}
                      depth={0}
                      activeId={activePage?.id}
                    />
                  ));
                })
              : (
                <SidebarNavItem
                  icon={<Plus size={14} className="text-[var(--color-accent)]" />}
                  label="Start collaborating"
                  subtle
                  onClick={() => {/* placeholder */}}
                />
              )
            }
          </SidebarSection>


          <SidebarSection label="Notion apps">
            <SidebarNavItem
              icon={<Mail size={16} />}
              label="Notion Mail"
              onClick={() => {/* placeholder */}}
            />
            <SidebarNavItem
              icon={<CalendarRange size={16} />}
              label="Notion Calendar"
              onClick={() => {/* placeholder */}}
            />
            <SidebarNavItem
              icon={<Monitor size={16} />}
              label="Notion Desktop"
              onClick={() => {/* placeholder */}}
            />
          </SidebarSection>

        </div>
      </nav>

      <div className="h-px w-full shrink-0 -mt-px z-[99]" style={{ boxShadow: '0 1px 0 var(--color-line)', transition: 'box-shadow 300ms' }} />

      <div className="px-2 pt-1 flex flex-col gap-px">
        <SidebarNavItem
          icon={<Settings size={16} />}
          label="Settings"
          onClick={() => onOpenSettings?.()}
        />
        <SidebarNavItem
          icon={<LayoutGrid size={16} />}
          label="Marketplace"
          onClick={() => {/* placeholder */}}
        />
        <SidebarNavItem
          icon={<Trash2 size={16} />}
          label="Trash"
          onClick={() => {/* placeholder */}}
        />
      </div>


      {showInviteCTA && (
        <div className="mx-2 mb-2 mt-1.5 relative">
          <div
            className="relative p-2 rounded-lg overflow-hidden cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors duration-100"
            style={{ boxShadow: 'var(--color-line) 0 0 0 1px' }}
          >
            <div className="flex items-start gap-2">
              <UserPlus size={20} className="shrink-0 text-[var(--color-ink)] mt-0.5" />
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-[12px] font-semibold text-[var(--color-ink)] leading-4">Invite members</p>
                <p className="text-[12px] text-[var(--color-ink-muted)] leading-4">Collaborate with your team.</p>
              </div>
            </div>
            {/* Dismiss button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowInviteCTA(false); }}
              className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-hover)]"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
