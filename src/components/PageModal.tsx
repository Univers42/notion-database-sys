/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PageModal.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:30 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { SidePeekView } from './pageModal/PeekViews';
import { CenterPeekView } from './pageModal/PeekViews';
import { FullPageView } from './pageModal/FullPageView';
import { cn } from '../utils/cn';

type ModalMode = 'side_peek' | 'center_peek' | 'full_page';

interface PageModalProps {
  pageId: string;
  onClose: () => void;
  mode?: ModalMode;
}

/** Renders a page in side peek, center peek, or full page mode with property editing and content blocks. */
export function PageModal({ pageId, onClose, mode = 'side_peek' }: Readonly<PageModalProps>) {
  const databases = useDatabaseStore(s => s.databases);
  const pages = useDatabaseStore(s => s.pages);

  const { panelWidth, isResizing, startResize } = useResizablePanel({ mode });

  const thePage = pages[pageId];
  if (!thePage) return <PageNotFound onClose={onClose} />;

  const database = databases[thePage.databaseId];
  if (!database) return null;

  if (mode === 'side_peek') {
    return <SidePeekView page={thePage} database={database} pageId={pageId} onClose={onClose} panelWidth={panelWidth} isResizing={isResizing} startResize={startResize} />;
  }
  if (mode === 'center_peek') {
    return <CenterPeekView page={thePage} database={database} pageId={pageId} onClose={onClose} panelWidth={panelWidth} isResizing={isResizing} startResize={startResize} />;
  }
  return <FullPageView page={thePage} database={database} pageId={pageId} onClose={onClose} />;
}

function PageNotFound({ onClose }: Readonly<{ onClose: () => void }>) {
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-scrim")}>
      <button type="button" className={cn("fixed inset-0 appearance-none border-0 bg-transparent p-0 cursor-default")} onClick={onClose} tabIndex={-1} aria-label="Close" />
      <div className={cn("relative z-[60] bg-surface-primary rounded-xl shadow-2xl p-8 text-center")} onClick={e => e.stopPropagation()}>
        <p className={cn("text-ink-secondary")}>Page not found</p>
        <button onClick={onClose} className={cn("mt-3 text-sm text-accent-text-soft")}>Close</button>
      </div>
    </div>
  );
}
