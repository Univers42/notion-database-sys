import React, { useState, useMemo } from 'react';
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
import type { ViewType, SchemaProperty } from './types/database';

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
    <div className="flex h-screen w-screen bg-white overflow-hidden">
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
      <div className="text-center text-gray-400 max-w-sm">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No view selected</h3>
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

  const thePage = pages[pageId];
  if (!thePage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
          <p className="text-gray-500">Page not found</p>
          <button onClick={onClose} className="mt-3 text-sm text-blue-500">Close</button>
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
          className="w-full text-3xl font-bold text-gray-900 placeholder:text-gray-300 outline-none border-none"
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
        <div className="border-t border-gray-200" />
      </div>

      {/* Page content area */}
      <div className={`${hPad} py-6`}>
        <PageContentEditor pageId={pageId} />
      </div>

      {/* Meta */}
      <div className={`${hPad} pb-8`}>
        <div className="text-xs text-gray-400 flex flex-col gap-1">
          <span>Created: {format(parseISO(thePage.createdAt), 'MMM d, yyyy h:mm a')}</span>
          <span>Updated: {format(parseISO(thePage.updatedAt), 'MMM d, yyyy h:mm a')}</span>
        </div>
      </div>
    </div>
  );

  /* Shared header bar */
  const headerBar = (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {database.icon && <span>{database.icon}</span>}
        <span>{database.name}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-700 font-medium truncate max-w-[200px]">{title || 'Untitled'}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => { duplicatePage(pageId); }}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors" title="Duplicate">
          <Copy className="w-4 h-4" />
        </button>
        <button onClick={() => { deletePage(pageId); onClose(); }}
          className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // ── SIDE PEEK: right-side panel ──────────────────────────────────
  if (mode === 'side_peek') {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
        <div
          className="w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200"
          onClick={e => e.stopPropagation()}
        >
          {headerBar}
          {pageContent('px-12')}
        </div>
      </div>
    );
  }

  // ── CENTER PEEK: centered dialog ─────────────────────────────────
  if (mode === 'center_peek') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div
          className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
          style={{ maxHeight: 'calc(100vh - 80px)' }}
          onClick={e => e.stopPropagation()}
        >
          {headerBar}
          {pageContent('px-12')}
        </div>
      </div>
    );
  }

  // ── FULL PAGE: full-screen overlay ───────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-150">
      {/* Full-page header — slightly different: back button + breadcrumb */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <button onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors" title="Back">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          {database.icon && <span className="text-lg">{database.icon}</span>}
          <span className="text-gray-500">{database.name}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-800 font-medium truncate max-w-[300px]">{title || 'Untitled'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { duplicatePage(pageId); }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors" title="Duplicate">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={() => { deletePage(pageId); onClose(); }}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Full-page body — wider content area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto">
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
            className="flex-1 text-sm text-gray-900 outline-none bg-transparent px-2 py-1 rounded hover:bg-gray-50 focus:bg-gray-50"
            placeholder="Empty" />
        );
      case 'number':
        return (
          <input type="number" value={val ?? ''}
            onChange={(e) => updatePageProperty(pageId, prop.id, e.target.value ? Number(e.target.value) : null)}
            className="flex-1 text-sm text-gray-900 outline-none bg-transparent px-2 py-1 rounded hover:bg-gray-50 focus:bg-gray-50 tabular-nums"
            placeholder="Empty" />
        );
      case 'select':
        return (
          <select value={val || ''}
            onChange={(e) => updatePageProperty(pageId, prop.id, e.target.value || null)}
            className="flex-1 text-sm text-gray-900 outline-none bg-transparent px-2 py-1 rounded hover:bg-gray-50 focus:bg-gray-50">
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
                    className="hover:text-red-600">×</button>
                </span>
              ) : null;
            })}
            <select value=""
              onChange={(e) => {
                if (e.target.value && !selected.includes(e.target.value)) {
                  updatePageProperty(pageId, prop.id, [...selected, e.target.value]);
                }
              }}
              className="text-xs text-gray-400 bg-transparent outline-none">
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
            className="flex-1 text-sm text-gray-900 outline-none bg-transparent px-2 py-1 rounded hover:bg-gray-50 focus:bg-gray-50" />
        );
      case 'checkbox':
        return (
          <button onClick={() => updatePageProperty(pageId, prop.id, !val)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${val ? 'bg-blue-500 border-blue-500' : 'border-gray-300 hover:border-gray-400'}`}>
            {val && <span className="text-white text-xs">✓</span>}
          </button>
        );
      case 'status':
        return (
          <select value={val || ''}
            onChange={(e) => updatePageProperty(pageId, prop.id, e.target.value || null)}
            className="flex-1 text-sm text-gray-900 outline-none bg-transparent px-2 py-1 rounded hover:bg-gray-50 focus:bg-gray-50">
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
            className="flex-1 text-sm text-gray-900 outline-none bg-transparent px-2 py-1 rounded hover:bg-gray-50 focus:bg-gray-50"
            placeholder="Person name" />
        );
      case 'place': {
        const placeVal = typeof val === 'object' && val ? val : null;
        return (
          <input type="text" value={placeVal?.address || (typeof val === 'string' ? val : '')}
            onChange={(e) => updatePageProperty(pageId, prop.id, { address: e.target.value })}
            className="flex-1 text-sm text-gray-900 outline-none bg-transparent px-2 py-1 rounded hover:bg-gray-50 focus:bg-gray-50"
            placeholder="Address..." />
        );
      }
      case 'id':
        return <span className="text-sm text-gray-500 font-mono tabular-nums px-2">{val || '—'}</span>;
      case 'files_media':
        return <span className="text-sm text-gray-400 italic px-2">{Array.isArray(val) && val.length > 0 ? `${val.length} file(s)` : 'No files'}</span>;
      case 'button':
        return (
          <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 rounded-md transition-colors">
            {prop.buttonConfig?.label || 'Click'}
          </button>
        );
      case 'created_time':
        return <span className="text-sm text-gray-500 px-2">{page.createdAt ? format(parseISO(page.createdAt), 'MMM d, yyyy h:mm a') : '-'}</span>;
      case 'last_edited_time':
        return <span className="text-sm text-gray-500 px-2">{page.updatedAt ? format(parseISO(page.updatedAt), 'MMM d, yyyy h:mm a') : '-'}</span>;
      case 'created_by':
        return <span className="text-sm text-gray-500 px-2">{page.createdBy || '—'}</span>;
      case 'last_edited_by':
        return <span className="text-sm text-gray-500 px-2">{page.lastEditedBy || '—'}</span>;
      default:
        return <span className="text-sm text-gray-400 px-2">—</span>;
    }
  };

  return (
    <div className="flex items-center gap-3 py-1.5 group hover:bg-gray-50 -mx-3 px-3 rounded-lg transition-colors">
      <div className="flex items-center gap-2 w-36 shrink-0">
        <span className="text-gray-400">{PROP_ICONS[prop.type] || <Hash className="w-3.5 h-3.5" />}</span>
        <span className="text-sm text-gray-500 truncate">{prop.name}</span>
      </div>
      {renderEditor()}
    </div>
  );
}

/* --- PageContentEditor --- */
function PageContentEditor({ pageId }: { pageId: string }) {
  const pages = useDatabaseStore(s => s.pages);
  const { updatePageContent } = useDatabaseStore.getState();
  const page = pages[pageId];
  if (!page) return null;

  const content = page.content || [];

  // Simple block editor: each block is a paragraph for now
  const handleBlockChange = (index: number, text: string) => {
    const newContent = [...content];
    newContent[index] = { ...newContent[index], content: text };
    updatePageContent(pageId, newContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newContent = [...content];
      newContent.splice(index + 1, 0, { id: crypto.randomUUID(), type: 'paragraph', content: '' });
      updatePageContent(pageId, newContent);
      // Focus new block after render
      setTimeout(() => {
        const blocks = document.querySelectorAll('[data-block-editor]');
        (blocks[index + 1] as HTMLElement)?.focus();
      }, 50);
    }
    if (e.key === 'Backspace' && content[index]?.content === '' && content.length > 1) {
      e.preventDefault();
      const newContent = content.filter((_, i) => i !== index);
      updatePageContent(pageId, newContent);
      setTimeout(() => {
        const blocks = document.querySelectorAll('[data-block-editor]');
        (blocks[Math.max(0, index - 1)] as HTMLElement)?.focus();
      }, 50);
    }
  };

  return (
    <div className="flex flex-col gap-1 min-h-[200px]">
      {content.length === 0 ? (
        <div
          contentEditable
          data-block-editor
          className="text-sm text-gray-400 outline-none py-1 focus:text-gray-900"
          onFocus={() => {
            if (content.length === 0) {
              updatePageContent(pageId, [{ id: crypto.randomUUID(), type: 'paragraph', content: '' }]);
            }
          }}
          suppressContentEditableWarning>
          Type '/' for commands, or just start writing...
        </div>
      ) : (
        content.map((block, i) => (
          <div key={block.id}
            contentEditable
            data-block-editor
            className={`text-sm outline-none py-0.5 leading-relaxed ${block.type === 'heading_1' ? 'text-2xl font-bold text-gray-900 mt-4 mb-1' :
              block.type === 'heading_2' ? 'text-xl font-semibold text-gray-900 mt-3 mb-1' :
                block.type === 'heading_3' ? 'text-lg font-medium text-gray-900 mt-2 mb-0.5' :
                  'text-gray-700'
              } empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300`}
            data-placeholder="Type '/' for commands..."
            onInput={(e) => handleBlockChange(i, (e.target as HTMLElement).textContent || '')}
            onKeyDown={(e) => handleKeyDown(e, i)}
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        ))
      )}
    </div>
  );
}

export default App;
