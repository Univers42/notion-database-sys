// ═══════════════════════════════════════════════════════════════════════════════
// PageModal — side_peek / center_peek / full_page page overlay
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { X, Copy, Trash2, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { PropertyRow } from './PropertyRow';
import { PageContentEditor } from './PageContentEditor';

type ModalMode = 'side_peek' | 'center_peek' | 'full_page';

interface PageModalProps {
  pageId: string;
  onClose: () => void;
  mode?: ModalMode;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_WIDTH = 400;
const MAX_WIDTH_RATIO = 0.92;
const CONTENT_WIDTHS = { narrow: 640, default: 896, wide: 1152, full: -1 } as const;
type ContentWidth = keyof typeof CONTENT_WIDTHS;

// ─── Resize handle ──────────────────────────────────────────────────────────

function ResizeHandle({ side = 'left', isResizing, onMouseDown }: {
  side?: 'left' | 'right';
  isResizing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`absolute top-0 ${side === 'left' ? '-left-1' : '-right-1'} w-2 h-full cursor-col-resize z-10 group`}
    >
      <div className={`w-0.5 h-full mx-auto transition-colors ${isResizing ? 'bg-accent-vivid' : 'bg-transparent group-hover:bg-accent-moderate'}`} />
    </div>
  );
}

// ─── Header bar (shared across modes) ───────────────────────────────────────

function ModalHeaderBar({ database, title, pageId, onClose }: {
  database: { icon?: string; name: string };
  title: string;
  pageId: string;
  onClose: () => void;
}) {
  const { deletePage, duplicatePage } = useDatabaseStore.getState();
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        {database.icon && <span>{database.icon}</span>}
        <span>{database.name}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-ink-body font-medium truncate max-w-[200px]">{title || 'Untitled'}</span>
      </div>
      <ActionButtons pageId={pageId} onClose={onClose} deletePage={deletePage} duplicatePage={duplicatePage} />
    </div>
  );
}

// ─── Action buttons (duplicate / delete / close) ────────────────────────────

function ActionButtons({ pageId, onClose, deletePage, duplicatePage }: {
  pageId: string;
  onClose: () => void;
  deletePage: (id: string) => void;
  duplicatePage: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => duplicatePage(pageId)}
        className="p-2 text-ink-muted hover:text-hover-text rounded-lg hover:bg-hover-surface2 transition-colors" title="Duplicate">
        <Copy className="w-4 h-4" />
      </button>
      <button onClick={() => { deletePage(pageId); onClose(); }}
        className="p-2 text-ink-muted hover:text-hover-danger-text rounded-lg hover:bg-hover-surface2 transition-colors" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
      <button onClick={onClose}
        className="p-2 text-ink-muted hover:text-hover-text rounded-lg hover:bg-hover-surface2 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Page inner content (icon + title + props + blocks + meta) ──────────────

function PageInnerContent({ page, database, pageId, hPad }: {
  page: { icon?: string; properties: Record<string, unknown>; createdAt: string; updatedAt: string };
  database: { titlePropertyId: string; properties: Record<string, import('../types/database').SchemaProperty>; icon?: string; name: string };
  pageId: string;
  hPad: string;
}) {
  const { updatePageProperty } = useDatabaseStore.getState();
  const title = (page.properties[database.titlePropertyId] as string) || '';
  const nonTitleProps = Object.values(database.properties).filter(p => p.id !== database.titlePropertyId);

  return (
    <div className="flex-1 overflow-auto">
      {/* Icon + Title */}
      <div className={`${hPad} pt-8 pb-4`}>
        <div className="flex items-center gap-3 mb-2">
          {page.icon && <span className="text-4xl">{page.icon}</span>}
        </div>
        <input
          type="text"
          value={title}
          onChange={e => updatePageProperty(pageId, database.titlePropertyId, e.target.value)}
          className="w-full text-3xl font-bold text-ink placeholder:text-ink-disabled outline-none border-none"
          placeholder="Untitled"
        />
      </div>

      {/* Properties */}
      <div className={`${hPad} pb-6`}>
        <div className="flex flex-col gap-2">
          {nonTitleProps.map(prop => (
            <PropertyRow key={prop.id} prop={prop} page={page as import('../types/database').Page} pageId={pageId} database={database as import('../types/database').DatabaseSchema} />
          ))}
        </div>
      </div>

      <div className={hPad}><div className="border-t border-line" /></div>

      <div className={`${hPad} py-6`}>
        <PageContentEditor pageId={pageId} />
      </div>

      <div className={`${hPad} pb-8`}>
        <div className="text-xs text-ink-muted flex flex-col gap-1">
          <span>Created: {format(parseISO(page.createdAt), 'MMM d, yyyy h:mm a')}</span>
          <span>Updated: {format(parseISO(page.updatedAt), 'MMM d, yyyy h:mm a')}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Side peek view ─────────────────────────────────────────────────────────

function SidePeekView({ page, database, pageId, onClose, panelWidth, isResizing, startResize }: {
  page: import('../types/database').Page;
  database: import('../types/database').DatabaseSchema;
  pageId: string;
  onClose: () => void;
  panelWidth: number;
  isResizing: boolean;
  startResize: (e: React.MouseEvent) => void;
}) {
  const title = (page.properties[database.titlePropertyId] as string) || 'Untitled';
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-scrim-light" onClick={onClose}>
      <div
        className="relative bg-surface-primary shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200"
        style={{ width: panelWidth, maxWidth: `${MAX_WIDTH_RATIO * 100}vw`, minWidth: MIN_WIDTH }}
        onClick={e => e.stopPropagation()}
      >
        <ResizeHandle side="left" isResizing={isResizing} onMouseDown={startResize} />
        <ModalHeaderBar database={database} title={title} pageId={pageId} onClose={onClose} />
        <PageInnerContent page={page} database={database} pageId={pageId} hPad="px-12" />
      </div>
    </div>
  );
}

// ─── Center peek view ───────────────────────────────────────────────────────

function CenterPeekView({ page, database, pageId, onClose, panelWidth, isResizing, startResize }: {
  page: import('../types/database').Page;
  database: import('../types/database').DatabaseSchema;
  pageId: string;
  onClose: () => void;
  panelWidth: number;
  isResizing: boolean;
  startResize: (e: React.MouseEvent) => void;
}) {
  const title = (page.properties[database.titlePropertyId] as string) || 'Untitled';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim-medium" onClick={onClose}>
      <div
        className="relative bg-surface-primary rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
        style={{ width: panelWidth, maxWidth: `${MAX_WIDTH_RATIO * 100}vw`, minWidth: MIN_WIDTH, maxHeight: 'calc(100vh - 80px)' }}
        onClick={e => e.stopPropagation()}
      >
        <ResizeHandle side="left" isResizing={isResizing} onMouseDown={startResize} />
        <ResizeHandle side="right" isResizing={isResizing} onMouseDown={startResize} />
        <ModalHeaderBar database={database} title={title} pageId={pageId} onClose={onClose} />
        <PageInnerContent page={page} database={database} pageId={pageId} hPad="px-12" />
      </div>
    </div>
  );
}

// ─── Full page view ─────────────────────────────────────────────────────────

function FullPageView({ page, database, pageId, onClose }: {
  page: import('../types/database').Page;
  database: import('../types/database').DatabaseSchema;
  pageId: string;
  onClose: () => void;
}) {
  const { deletePage, duplicatePage } = useDatabaseStore.getState();
  const title = (page.properties[database.titlePropertyId] as string) || 'Untitled';
  const [contentWidth, setContentWidth] = useState<ContentWidth>('default');
  const fullPageMaxW = contentWidth === 'full' ? 'none' : `${CONTENT_WIDTHS[contentWidth]}px`;

  return (
    <div className="fixed inset-0 z-50 bg-surface-primary flex flex-col animate-in fade-in duration-150">
      <FullPageHeader
        database={database}
        title={title}
        pageId={pageId}
        onClose={onClose}
        contentWidth={contentWidth}
        setContentWidth={setContentWidth}
        deletePage={deletePage}
        duplicatePage={duplicatePage}
      />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto transition-all duration-200" style={{ maxWidth: fullPageMaxW }}>
          <PageInnerContent page={page} database={database} pageId={pageId} hPad="px-16" />
        </div>
      </div>
    </div>
  );
}

function FullPageHeader({ database, title, pageId, onClose, contentWidth, setContentWidth, deletePage, duplicatePage }: {
  database: { icon?: string; name: string };
  title: string;
  pageId: string;
  onClose: () => void;
  contentWidth: ContentWidth;
  setContentWidth: (w: ContentWidth) => void;
  deletePage: (id: string) => void;
  duplicatePage: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between px-8 py-4 border-b border-line shrink-0">
      <div className="flex items-center gap-3 text-sm text-ink-muted">
        <button onClick={onClose}
          className="p-1.5 text-ink-muted hover:text-hover-text rounded-lg hover:bg-hover-surface2 transition-colors" title="Back">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        {database.icon && <span className="text-lg">{database.icon}</span>}
        <span className="text-ink-secondary">{database.name}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-ink-strong font-medium truncate max-w-[300px]">{title || 'Untitled'}</span>
      </div>
      <div className="flex items-center gap-1">
        <WidthToggle contentWidth={contentWidth} setContentWidth={setContentWidth} />
        <ActionButtons pageId={pageId} onClose={onClose} deletePage={deletePage} duplicatePage={duplicatePage} />
      </div>
    </div>
  );
}

function WidthToggle({ contentWidth, setContentWidth }: { contentWidth: ContentWidth; setContentWidth: (w: ContentWidth) => void }) {
  const widths: ContentWidth[] = ['narrow', 'default', 'wide', 'full'];
  const labels: Record<ContentWidth, string> = { narrow: '▕▏', default: '▕ ▏', wide: '▕  ▏', full: '▕   ▏' };
  return (
    <div className="flex items-center border border-line rounded-lg overflow-hidden mr-2">
      {widths.map(w => (
        <button
          key={w}
          onClick={() => setContentWidth(w)}
          className={`px-2 py-1 text-xs transition-colors ${contentWidth === w ? 'bg-surface-tertiary text-ink-strong font-medium' : 'text-ink-muted hover:text-hover-text hover:bg-hover-surface'}`}
          title={`${w.charAt(0).toUpperCase() + w.slice(1)} width`}
        >
          {labels[w]}
        </button>
      ))}
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────

export function PageModal({ pageId, onClose, mode = 'side_peek' }: PageModalProps) {
  const databases = useDatabaseStore(s => s.databases);
  const pages = useDatabaseStore(s => s.pages);
  const { getPageTitle } = useDatabaseStore.getState();

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

function PageNotFound({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim" onClick={onClose}>
      <div className="bg-surface-primary rounded-xl shadow-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
        <p className="text-ink-secondary">Page not found</p>
        <button onClick={onClose} className="mt-3 text-sm text-accent-text-soft">Close</button>
      </div>
    </div>
  );
}
