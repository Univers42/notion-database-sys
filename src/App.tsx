import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useDatabaseStore } from './store/useDatabaseStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopBar } from './components/TopBar';
import { TableView } from './components/views/TableView';
import { BoardView } from './components/views/BoardView';
import { CalendarView } from './components/views/CalendarView';
import { TimelineView } from './components/views/TimelineView';
import { ListView } from './components/views/ListView';
import { GalleryView } from './components/views/GalleryView';
import { ChartView } from './components/views/ChartView';
import { DashboardView } from './components/views/DashboardView';
import { FeedView } from './components/views/FeedView';
import { MapView } from './components/views/MapView';
import { BlockHandle } from './components/ui/BlockHandle';
import type { PanelSection } from './components/ui/ActionPanel';
import {
  ArrowSquarePathIcon, EmojiFaceIcon, StarIcon, ComposeIcon,
  ArrowMergeUpIcon, LockIcon, ArrowExpandDiagonalIcon,
  ArrowDiagonalUpRightIcon, PeekSideIcon, CopyLinkIcon, DuplicateIcon,
  ArrowTurnUpRightIcon, TrashIcon, AiFaceIcon, QuestionMarkCircleIcon,
} from './components/ui/Icons';
import { X, FileText, Trash2, Copy, ChevronRight, Plus, Hash, Type, Calendar, CheckSquare, User, Link, Mail, Phone, List as ListIcon, CircleDot, MapPin, Fingerprint, MousePointerClick, Users, Tag, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { ViewType, SchemaProperty, Block, BlockType } from './types/database';
import { BlockRenderer } from './components/blocks/BlockRenderer';
import { SlashCommandMenu } from './components/blocks/SlashCommandMenu';
import { detectBlockType } from './lib/markdown';

const VIEW_COMPONENTS: Record<ViewType, React.ComponentType> = {
  table: TableView,
  board: BoardView,
  calendar: CalendarView,
  timeline: TimelineView,
  list: ListView,
  gallery: GalleryView,
  chart: ChartView,
  dashboard: DashboardView,
  feed: FeedView,
  map: MapView,
};

function App() {
  const activeViewId = useDatabaseStore(s => s.activeViewId);
  const views = useDatabaseStore(s => s.views);
  const openPageId = useDatabaseStore(s => s.openPageId);
  const databases = useDatabaseStore(s => s.databases);
  const { openPage } = useDatabaseStore.getState();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const ViewComponent = view ? VIEW_COMPONENTS[view.type] : null;

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
            <TopBar />
            {ViewComponent ? (
              <ErrorBoundary>
                <ViewComponent />
              </ErrorBoundary>
            ) : (
              <EmptyState />
            )}
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

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8" >
      <div className="text-center text-ink-muted max-w-sm">
        <FileText className="w-12 h-12 mx-auto mb-3 text-ink-disabled" />
        <h3 className="text-lg font-semibold text-ink-body-light mb-2">No view selected</h3>
        <p className="text-sm">Select a database and view from the sidebar to get started.</p>
      </div>
    </div>
  );
}

/* --- Page Modal — supports side_peek, center_peek, full_page modes --- */
function PageModal({ pageId, onClose, mode = 'side_peek' }: { pageId: string; onClose: () => void; mode?: 'side_peek' | 'center_peek' | 'full_page' }) {
  const databases = useDatabaseStore(s => s.databases);
  const pages = useDatabaseStore(s => s.pages);
  const { updatePageProperty, deletePage, duplicatePage, getPageTitle } = useDatabaseStore.getState();

  // ── Resizable panel state ──
  const DEFAULT_WIDTHS = { side_peek: 672, center_peek: 768, full_page: 896 };
  const MIN_WIDTH = 400;
  const MAX_WIDTH_RATIO = 0.92;
  const [panelWidth, setPanelWidth] = React.useState(DEFAULT_WIDTHS[mode]);
  const [isResizing, setIsResizing] = React.useState(false);
  const resizeRef = React.useRef<{ startX: number; startW: number } | null>(null);

  // Full-page content width presets
  const [contentWidth, setContentWidth] = React.useState<'narrow' | 'default' | 'wide' | 'full'>('default');
  const CONTENT_WIDTHS = { narrow: 640, default: 896, wide: 1152, full: -1 };

  React.useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const { startX, startW } = resizeRef.current;
      const maxW = window.innerWidth * MAX_WIDTH_RATIO;
      if (mode === 'side_peek') {
        // Drag left edge → startX - e.clientX increases width
        const newW = Math.min(Math.max(startW + (startX - e.clientX), MIN_WIDTH), maxW);
        setPanelWidth(newW);
      } else if (mode === 'center_peek') {
        // Drag either edge → double the delta
        const newW = Math.min(Math.max(startW + 2 * Math.abs(startX - e.clientX) * Math.sign(startX - e.clientX), MIN_WIDTH), maxW);
        setPanelWidth(Math.abs(newW));
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, mode]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startW: panelWidth };
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  /** Resize handle element (vertical bar on the panel edge) */
  const ResizeHandle = ({ side = 'left' }: { side?: 'left' | 'right' }) => (
    <div
      onMouseDown={startResize}
      className={`absolute top-0 ${side === 'left' ? '-left-1' : '-right-1'} w-2 h-full cursor-col-resize z-10 group`}
    >
      <div className={`w-0.5 h-full mx-auto transition-colors ${isResizing ? 'bg-accent-vivid' : 'bg-transparent group-hover:bg-accent-moderate'}`} />
    </div>
  );

  const thePage = pages[pageId];
  if (!thePage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim" onClick={onClose}>
        <div className="bg-surface-primary rounded-xl shadow-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
          <p className="text-ink-secondary">Page not found</p>
          <button onClick={onClose} className="mt-3 text-sm text-accent-text-soft">Close</button>
        </div>
      </div>
    );
  }

  const database = databases[thePage.databaseId];
  if (!database) return null;

  const title = getPageTitle(thePage);
  const allProps = Object.values(database.properties);
  const nonTitleProps = allProps.filter(p => p.id !== database.titlePropertyId);

  /* Shared inner content */
  const pageContent = (hPad: string) => (
    <div className="flex-1 overflow-auto">
      {/* Icon + Title */}
      <div className={`${hPad} pt-8 pb-4`}>
        <div className="flex items-center gap-3 mb-2">
          {thePage.icon && <span className="text-4xl">{thePage.icon}</span>}
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => updatePageProperty(pageId, database.titlePropertyId, e.target.value)}
          className="w-full text-3xl font-bold text-ink placeholder:text-ink-disabled outline-none border-none"
          placeholder="Untitled"
        />
      </div>

      {/* Properties */}
      <div className={`${hPad} pb-6`}>
        <div className="flex flex-col gap-2">
          {nonTitleProps.map(prop => (
            <PropertyRow key={prop.id} prop={prop} page={thePage} pageId={pageId} database={database} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className={hPad}>
        <div className="border-t border-line" />
      </div>

      {/* Page content area */}
      <div className={`${hPad} py-6`}>
        <PageContentEditor pageId={pageId} />
      </div>

      {/* Meta */}
      <div className={`${hPad} pb-8`}>
        <div className="text-xs text-ink-muted flex flex-col gap-1">
          <span>Created: {format(parseISO(thePage.createdAt), 'MMM d, yyyy h:mm a')}</span>
          <span>Updated: {format(parseISO(thePage.updatedAt), 'MMM d, yyyy h:mm a')}</span>
        </div>
      </div>
    </div>
  );

  /* Shared header bar */
  const headerBar = (
    <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        {database.icon && <span>{database.icon}</span>}
        <span>{database.name}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-ink-body font-medium truncate max-w-[200px]">{title || 'Untitled'}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => { duplicatePage(pageId); }}
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
    </div>
  );

  // ── SIDE PEEK: right-side panel ──────────────────────────────────
  if (mode === 'side_peek') {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-scrim-light" onClick={onClose}>
        <div
          className="relative bg-surface-primary shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200"
          style={{ width: panelWidth, maxWidth: `${MAX_WIDTH_RATIO * 100}vw`, minWidth: MIN_WIDTH }}
          onClick={e => e.stopPropagation()}
        >
          <ResizeHandle side="left" />
          {headerBar}
          {pageContent('px-12')}
        </div>
      </div>
    );
  }

  // ── CENTER PEEK: centered dialog ─────────────────────────────────
  if (mode === 'center_peek') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim-medium" onClick={onClose}>
        <div
          className="relative bg-surface-primary rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
          style={{ width: panelWidth, maxWidth: `${MAX_WIDTH_RATIO * 100}vw`, minWidth: MIN_WIDTH, maxHeight: 'calc(100vh - 80px)' }}
          onClick={e => e.stopPropagation()}
        >
          <ResizeHandle side="left" />
          <ResizeHandle side="right" />
          {headerBar}
          {pageContent('px-12')}
        </div>
      </div>
    );
  }

  // ── FULL PAGE: full-screen overlay ───────────────────────────────
  const fullPageMaxW = contentWidth === 'full' ? 'none' : `${CONTENT_WIDTHS[contentWidth]}px`;
  return (
    <div className="fixed inset-0 z-50 bg-surface-primary flex flex-col animate-in fade-in duration-150">
      {/* Full-page header — slightly different: back button + breadcrumb */}
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
          {/* Width toggle buttons */}
          <div className="flex items-center border border-line rounded-lg overflow-hidden mr-2">
            {(['narrow', 'default', 'wide', 'full'] as const).map(w => (
              <button
                key={w}
                onClick={() => setContentWidth(w)}
                className={`px-2 py-1 text-xs transition-colors ${contentWidth === w ? 'bg-surface-tertiary text-ink-strong font-medium' : 'text-ink-muted hover:text-hover-text hover:bg-hover-surface'}`}
                title={`${w.charAt(0).toUpperCase() + w.slice(1)} width`}
              >
                {w === 'narrow' ? '▕▏' : w === 'default' ? '▕ ▏' : w === 'wide' ? '▕  ▏' : '▕   ▏'}
              </button>
            ))}
          </div>
          <button onClick={() => { duplicatePage(pageId); }}
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
      </div>

      {/* Full-page body — resizable content area */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto transition-all duration-200" style={{ maxWidth: fullPageMaxW }}>
          {pageContent('px-16')}
        </div>
      </div>
    </div>
  );
}

/* --- PropertyRow --- */
function PropertyRow({ prop, page, pageId, database }: { prop: SchemaProperty; page: any; pageId: string; database: any }) {
  const { updatePageProperty } = useDatabaseStore.getState();
  const val = page.properties[prop.id];

  const PROP_ICONS: Record<string, React.ReactNode> = {
    text: <Type className="w-3.5 h-3.5" />,
    number: <Hash className="w-3.5 h-3.5" />,
    select: <ListIcon className="w-3.5 h-3.5" />,
    multi_select: <Tag className="w-3.5 h-3.5" />,
    status: <CircleDot className="w-3.5 h-3.5" />,
    date: <Calendar className="w-3.5 h-3.5" />,
    checkbox: <CheckSquare className="w-3.5 h-3.5" />,
    user: <User className="w-3.5 h-3.5" />,
    person: <Users className="w-3.5 h-3.5" />,
    url: <Link className="w-3.5 h-3.5" />,
    email: <Mail className="w-3.5 h-3.5" />,
    phone: <Phone className="w-3.5 h-3.5" />,
    place: <MapPin className="w-3.5 h-3.5" />,
    id: <Fingerprint className="w-3.5 h-3.5" />,
    files_media: <FileText className="w-3.5 h-3.5" />,
    button: <MousePointerClick className="w-3.5 h-3.5" />,
    created_time: <Clock className="w-3.5 h-3.5" />,
    last_edited_time: <Clock className="w-3.5 h-3.5" />,
    created_by: <User className="w-3.5 h-3.5" />,
    last_edited_by: <User className="w-3.5 h-3.5" />,
  };

  const renderEditor = () => {
    switch (prop.type) {
      case 'text':
      case 'url':
      case 'email':
      case 'phone':
        return (
          <input type={prop.type === 'email' ? 'email' : prop.type === 'url' ? 'url' : 'text'}
            value={val || ''}
            onChange={(e) => updatePageProperty(pageId, prop.id, e.target.value)}
            className="flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface"
            placeholder="Empty" />
        );
      case 'number':
        return (
          <input type="number" value={val ?? ''}
            onChange={(e) => updatePageProperty(pageId, prop.id, e.target.value ? Number(e.target.value) : null)}
            className="flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface tabular-nums"
            placeholder="Empty" />
        );
      case 'select':
        return (
          <select value={val || ''}
            onChange={(e) => updatePageProperty(pageId, prop.id, e.target.value || null)}
            className="flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface">
            <option value="">Empty</option>
            {prop.options?.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.value}</option>
            ))}
          </select>
        );
      case 'multi_select': {
        const selected: string[] = Array.isArray(val) ? val : [];
        return (
          <div className="flex-1 flex flex-wrap items-center gap-1 px-2 py-1">
            {selected.map(id => {
              const opt = prop.options?.find(o => o.id === id);
              return opt ? (
                <span key={id} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`}>
                  {opt.value}
                  <button onClick={() => updatePageProperty(pageId, prop.id, selected.filter(s => s !== id))}
                    className="hover:text-hover-danger-text-bold">×</button>
                </span>
              ) : null;
            })}
            <select value=""
              onChange={(e) => {
                if (e.target.value && !selected.includes(e.target.value)) {
                  updatePageProperty(pageId, prop.id, [...selected, e.target.value]);
                }
              }}
              className="text-xs text-ink-muted bg-transparent outline-none">
              <option value="">+ Add</option>
              {prop.options?.filter(o => !selected.includes(o.id)).map(opt => (
                <option key={opt.id} value={opt.id}>{opt.value}</option>
              ))}
            </select>
          </div>
        );
      }
      case 'date':
        return (
          <input type="date" value={val || ''}
            onChange={(e) => updatePageProperty(pageId, prop.id, e.target.value || null)}
            className="flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface" />
        );
      case 'checkbox':
        return (
          <button onClick={() => updatePageProperty(pageId, prop.id, !val)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${val ? 'bg-accent border-accent-border' : 'border-line-medium hover:border-hover-border-strong'}`}>
            {val && <span className="text-ink-inverse text-xs">✓</span>}
          </button>
        );
      case 'status':
        return (
          <select value={val || ''}
            onChange={(e) => updatePageProperty(pageId, prop.id, e.target.value || null)}
            className="flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface">
            <option value="">Empty</option>
            {prop.options?.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.value}</option>
            ))}
          </select>
        );
      case 'user':
      case 'person':
        return (
          <input type="text" value={val || ''}
            onChange={(e) => updatePageProperty(pageId, prop.id, e.target.value)}
            className="flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface"
            placeholder="Person name" />
        );
      case 'place': {
        const placeVal = typeof val === 'object' && val ? val : null;
        return (
          <input type="text" value={placeVal?.address || (typeof val === 'string' ? val : '')}
            onChange={(e) => updatePageProperty(pageId, prop.id, { address: e.target.value })}
            className="flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface"
            placeholder="Address..." />
        );
      }
      case 'id':
        return <span className="text-sm text-ink-secondary font-mono tabular-nums px-2">{val || '—'}</span>;
      case 'files_media':
        return <span className="text-sm text-ink-muted italic px-2">{Array.isArray(val) && val.length > 0 ? `${val.length} file(s)` : 'No files'}</span>;
      case 'button':
        return (
          <button className="px-3 py-1 bg-surface-tertiary hover:bg-hover-surface3 text-xs font-medium text-ink-body rounded-md transition-colors">
            {prop.buttonConfig?.label || 'Click'}
          </button>
        );
      case 'created_time':
        return <span className="text-sm text-ink-secondary px-2">{page.createdAt ? format(parseISO(page.createdAt), 'MMM d, yyyy h:mm a') : '-'}</span>;
      case 'last_edited_time':
        return <span className="text-sm text-ink-secondary px-2">{page.updatedAt ? format(parseISO(page.updatedAt), 'MMM d, yyyy h:mm a') : '-'}</span>;
      case 'created_by':
        return <span className="text-sm text-ink-secondary px-2">{page.createdBy || '—'}</span>;
      case 'last_edited_by':
        return <span className="text-sm text-ink-secondary px-2">{page.lastEditedBy || '—'}</span>;
      default:
        return <span className="text-sm text-ink-muted px-2">—</span>;
    }
  };

  return (
    <div className="flex items-center gap-3 py-1.5 group hover:bg-hover-surface -mx-3 px-3 rounded-lg transition-colors">
      <div className="flex items-center gap-2 w-36 shrink-0">
        <span className="text-ink-muted">{PROP_ICONS[prop.type] || <Hash className="w-3.5 h-3.5" />}</span>
        <span className="text-sm text-ink-secondary truncate">{prop.name}</span>
      </div>
      {renderEditor()}
    </div>
  );
}

/* --- PageContentEditor --- */
function PageContentEditor({ pageId }: { pageId: string }) {
  const pages = useDatabaseStore(s => s.pages);
  const {
    updatePageContent,
    insertBlock,
    deleteBlock,
    changeBlockType,
    updateBlock,
    createInlineDatabase,
  } = useDatabaseStore.getState();
  const page = pages[pageId];

  // Slash command state
  const [slashMenu, setSlashMenu] = useState<{ blockId: string; position: { x: number; y: number }; filter: string } | null>(null);
  const blockRefs = useRef<Map<string, HTMLElement>>(new Map());

  if (!page) return null;
  const content = page.content || [];

  /* ── Helpers ────────────────────────────────────────────────────── */

  const focusBlock = (blockId: string, cursorEnd = false) => {
    setTimeout(() => {
      const el = blockRefs.current.get(blockId) ?? document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
      if (!el) return;
      const editable = el.querySelector('[contenteditable]') as HTMLElement ?? el;
      editable.focus();
      if (cursorEnd && editable.childNodes.length) {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editable);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 30);
  };

  const getCaretRect = (): { x: number; y: number } => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.x !== 0 || rect.y !== 0) return { x: rect.x, y: rect.bottom };
    }
    return { x: 100, y: 300 };
  };

  /* ── Block content change — detects slash trigger & markdown shortcuts ── */

  const handleBlockChange = (blockId: string, text: string) => {
    // Check for slash trigger
    if (text.endsWith('/')) {
      const pos = getCaretRect();
      setSlashMenu({ blockId, position: pos, filter: '' });
      return;
    }

    // Update slash filter if menu is open
    if (slashMenu && slashMenu.blockId === blockId) {
      const slashIdx = text.lastIndexOf('/');
      if (slashIdx >= 0) {
        setSlashMenu(prev => prev ? { ...prev, filter: text.slice(slashIdx + 1) } : null);
        return;
      } else {
        setSlashMenu(null);
      }
    }

    // Detect markdown shortcuts (e.g. "## " at start → heading_2)
    const detection = detectBlockType(text);
    if (detection) {
      changeBlockType(pageId, blockId, detection.type);
      updateBlock(pageId, blockId, { content: detection.remainingContent });
      // Reposition cursor
      setTimeout(() => {
        const el = document.querySelector(`[data-block-id="${blockId}"] [contenteditable]`) as HTMLElement;
        if (el) {
          el.textContent = detection.remainingContent;
          el.focus();
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 30);
      return;
    }

    // Normal update
    updateBlock(pageId, blockId, { content: text });
  };

  /* ── Key down — Enter for new block, Backspace to delete empty ── */

  const handleKeyDown = (e: React.KeyboardEvent, blockId: string) => {
    const block = content.find(b => b.id === blockId);
    if (!block) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      // Don't handle Enter if slash menu is open (menu handles it)
      if (slashMenu) return;
      e.preventDefault();
      const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
      insertBlock(pageId, blockId, newBlock);
      focusBlock(newBlock.id);
    }

    if (e.key === 'Backspace' && block.content === '' && content.length > 1) {
      e.preventDefault();
      const idx = content.findIndex(b => b.id === blockId);
      const prevBlockId = idx > 0 ? content[idx - 1].id : null;
      deleteBlock(pageId, blockId);
      if (prevBlockId) focusBlock(prevBlockId, true);
    }

    // Arrow Up at first block — focus previous
    if (e.key === 'ArrowUp') {
      const idx = content.findIndex(b => b.id === blockId);
      if (idx > 0) {
        const sel = window.getSelection();
        const range = sel?.getRangeAt(0);
        if (range && range.startOffset === 0 && range.collapsed) {
          e.preventDefault();
          focusBlock(content[idx - 1].id, true);
        }
      }
    }

    // Arrow Down at last block — focus next
    if (e.key === 'ArrowDown') {
      const idx = content.findIndex(b => b.id === blockId);
      if (idx < content.length - 1) {
        const el = e.target as HTMLElement;
        const sel = window.getSelection();
        const range = sel?.getRangeAt(0);
        if (range && range.endOffset === (el.textContent?.length ?? 0) && range.collapsed) {
          e.preventDefault();
          focusBlock(content[idx + 1].id);
        }
      }
    }

    // Escape to close slash menu
    if (e.key === 'Escape' && slashMenu) {
      setSlashMenu(null);
    }
  };

  /* ── Slash command selection ── */

  const handleSlashSelect = (type: BlockType) => {
    if (!slashMenu) return;
    const { blockId } = slashMenu;
    setSlashMenu(null);

    // Remove the "/" and any filter text from the block content
    const block = content.find(b => b.id === blockId);
    if (block) {
      const slashIdx = block.content.lastIndexOf('/');
      const cleanContent = slashIdx >= 0 ? block.content.slice(0, slashIdx) : block.content;
      updateBlock(pageId, blockId, { content: cleanContent });
    }

    // Special init for certain block types
    if (type === 'database_inline') {
      const { databaseId, viewId } = createInlineDatabase();
      changeBlockType(pageId, blockId, type);
      updateBlock(pageId, blockId, { content: '', databaseId, viewId });
      // Insert a new paragraph after the inline database
      const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
      insertBlock(pageId, blockId, newBlock);
      focusBlock(newBlock.id);
    } else if (type === 'database_full_page') {
      const { databaseId, viewId } = createInlineDatabase('Untitled');
      changeBlockType(pageId, blockId, type);
      updateBlock(pageId, blockId, { content: '', databaseId, viewId });
      const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
      insertBlock(pageId, blockId, newBlock);
      focusBlock(newBlock.id);
    } else if (type === 'table_block') {
      updateBlock(pageId, blockId, { content: '' });
      changeBlockType(pageId, blockId, type);
      updateBlock(pageId, blockId, {
        tableData: [['', '', ''], ['', '', '']],
      });
    } else if (type === 'divider') {
      changeBlockType(pageId, blockId, type);
      // Insert a new paragraph after the divider
      const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
      insertBlock(pageId, blockId, newBlock);
      focusBlock(newBlock.id);
    } else {
      changeBlockType(pageId, blockId, type);
      focusBlock(blockId);
    }
  };

  /* ── New block button ── */

  const handleAddBlock = () => {
    const lastId = content.length > 0 ? content[content.length - 1].id : null;
    const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
    if (lastId) {
      insertBlock(pageId, lastId, newBlock);
    } else {
      updatePageContent(pageId, [newBlock]);
    }
    focusBlock(newBlock.id);
  };

  /* ── Register block ref ── */

  const registerBlockRef = useCallback((blockId: string, el: HTMLElement | null) => {
    if (el) blockRefs.current.set(blockId, el);
    else blockRefs.current.delete(blockId);
  }, []);

  /* ── Render ── */

  return (
    <div className="flex flex-col gap-0.5 min-h-[200px]">
      {content.length === 0 ? (
        <div
          contentEditable
          data-block-editor
          className="text-sm text-ink-muted outline-none py-1 focus:text-focus-text"
          onFocus={() => {
            if (content.length === 0) {
              const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
              updatePageContent(pageId, [newBlock]);
              focusBlock(newBlock.id);
            }
          }}
          suppressContentEditableWarning>
          Type '/' for commands, or just start writing...
        </div>
      ) : (
        content.map((block) => (
          <div
            key={block.id}
            ref={el => registerBlockRef(block.id, el)}
            data-block-id={block.id}
            className="group/block relative"
          >
            {/* Block handle on hover */}
            <div className="absolute -left-8 top-1 opacity-0 group-hover/block:opacity-100 transition-opacity flex items-center gap-0.5">
              <button
                onClick={() => {
                  const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
                  const idx = content.findIndex(b => b.id === block.id);
                  const prevId = idx > 0 ? content[idx - 1].id : null;
                  if (prevId) {
                    insertBlock(pageId, prevId, newBlock);
                  } else {
                    const updated = [newBlock, ...content];
                    updatePageContent(pageId, updated);
                  }
                  focusBlock(newBlock.id);
                }}
                className="p-0.5 text-ink-disabled hover:text-hover-text-muted rounded hover:bg-hover-surface2 transition-colors"
                title="Add block"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="p-0.5 text-ink-disabled hover:text-hover-text-muted rounded hover:bg-hover-surface2 transition-colors cursor-grab">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="5.5" cy="3.5" r="1.5" />
                  <circle cx="10.5" cy="3.5" r="1.5" />
                  <circle cx="5.5" cy="8" r="1.5" />
                  <circle cx="10.5" cy="8" r="1.5" />
                  <circle cx="5.5" cy="12.5" r="1.5" />
                  <circle cx="10.5" cy="12.5" r="1.5" />
                </svg>
              </div>
            </div>

            <BlockRenderer
              block={block}
              pageId={pageId}
              index={content.indexOf(block)}
              onChange={(text) => handleBlockChange(block.id, text)}
              onKeyDown={(e) => handleKeyDown(e, block.id)}
            />
          </div>
        ))
      )}

      {/* Add block button */}
      {content.length > 0 && (
        <button
          onClick={handleAddBlock}
          className="flex items-center gap-2 text-sm text-ink-disabled hover:text-hover-text-muted py-2 transition-colors group"
        >
          <Plus className="w-4 h-4" />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">Add a block</span>
        </button>
      )}

      {/* Slash command menu */}
      {slashMenu && (
        <SlashCommandMenu
          position={slashMenu.position}
          filter={slashMenu.filter}
          onSelect={handleSlashSelect}
          onClose={() => setSlashMenu(null)}
        />
      )}
    </div>
  );
}

export default App;
