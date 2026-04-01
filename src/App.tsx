/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   App.tsx                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:43:58 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:43:59 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useMemo } from 'react';
import { useDatabaseStore } from './store/useDatabaseStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DatabaseBlock } from './components/DatabaseBlock';
import { BlockHandle } from './components/ui/BlockHandle';
import type { PanelSection } from './components/ui/ActionPanel';
import { PageModal } from './components/PageModal';
import {
  ArrowSquarePathIcon, EmojiFaceIcon, StarIcon, ComposeIcon,
  ArrowMergeUpIcon, LockIcon, ArrowExpandDiagonalIcon,
  ArrowDiagonalUpRightIcon, PeekSideIcon, CopyLinkIcon, DuplicateIcon,
  ArrowTurnUpRightIcon, TrashIcon, AiFaceIcon, QuestionMarkCircleIcon,
} from './components/ui/Icons';
import { format } from 'date-fns';

function App() {
  const activeViewId = useDatabaseStore(s => s.activeViewId);
  const views = useDatabaseStore(s => s.views);
  const openPageId = useDatabaseStore(s => s.openPageId);
  const databases = useDatabaseStore(s => s.databases);
  const { openPage } = useDatabaseStore.getState();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  const [lockViews, setLockViews] = useState(false);

  /* Declarative sections for the BlockHandle action panel */
  const blockPanelSections: PanelSection[] = useMemo(() => {
    const viewLabel = view ? view.type.charAt(0).toUpperCase() + view.type.slice(1) : 'Table';
    const dbName = database?.name ?? 'Database';

    return [
      {
        label: `${dbName} · ${viewLabel}`,
        items: [
          { icon: <ArrowSquarePathIcon />, label: 'Turn into page' },
          { icon: <EmojiFaceIcon />, label: 'Edit icon' },
          { icon: <StarIcon />, label: 'Add to Favorites' },
          { icon: <ComposeIcon />, label: 'Rename', shortcut: 'Ctrl+⇧+R' },
          { icon: <ArrowMergeUpIcon />, label: 'Merge with CSV' },
          { type: 'toggle' as const, icon: <LockIcon />, label: 'Lock views', checked: lockViews, onToggle: setLockViews },
        ],
      },
      {
        items: [
          { icon: <ArrowExpandDiagonalIcon />, label: 'Open as page' },
          { icon: <ArrowDiagonalUpRightIcon />, label: 'Open in new tab', shortcut: 'Ctrl+⇧+↵', active: true },
          { icon: <PeekSideIcon />, label: 'Open in side peek', shortcut: 'Alt+Click' },
        ],
      },
      {
        items: [
          { icon: <CopyLinkIcon />, label: 'Copy link' },
          { icon: <DuplicateIcon />, label: 'Duplicate', shortcut: 'Ctrl+D' },
          { icon: <ArrowTurnUpRightIcon />, label: 'Move to', shortcut: 'Ctrl+⇧+P' },
          { icon: <TrashIcon />, label: 'Delete', shortcut: 'Del', danger: true },
        ],
      },
      {
        items: [
          { icon: <AiFaceIcon />, label: 'Ask AI', shortcut: 'Ctrl+J' },
        ],
      },
      {
        items: [
          { type: 'info' as const, lines: ['Last edited by user', `${format(new Date(), 'MMM d, yyyy h:mm a')}`] },
        ],
      },
      {
        items: [
          { type: 'link' as const, icon: <QuestionMarkCircleIcon className="w-4 h-4" />, label: 'Learn about databases', href: 'https://www.notion.com/help/intro-to-databases', muted: true },
        ],
      },
    ];
  }, [view, database, lockViews]);

  return (
    <div className="flex h-screen w-screen bg-surface-primary overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <ErrorBoundary>
          <BlockHandle
            className="flex-1 min-h-0"
            panelProps={{ sections: blockPanelSections, searchable: true, searchPlaceholder: 'Search actions…', width: 265 }}
          >
            <DatabaseBlock mode="full" />
          </BlockHandle>
        </ErrorBoundary>
      </div>

      {/* Page modal — respect openPagesIn setting */}
      {openPageId && (
        <PageModal
          pageId={openPageId}
          onClose={() => openPage(null)}
          mode={view?.settings?.openPagesIn || 'side_peek'}
        />
      )}
    </div>
  );
}

export default App;
