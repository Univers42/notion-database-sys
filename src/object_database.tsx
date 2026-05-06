/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   object_database.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:36:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, {
  createContext,
  forwardRef,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { format } from 'date-fns';
import {
  DatabaseStoreProvider,
  createDatabaseStore,
  type DatabaseStoreApi,
  useDatabaseStore,
  useStoreApi,
} from './store/useDatabaseStore';
import { useDbSource } from './hooks/useDbSource';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { PanelSection } from './components/ui/ActionPanel';
import {
  ArrowSquarePathIcon, EmojiFaceIcon, StarIcon, ComposeIcon,
  ArrowMergeUpIcon, LockIcon, ArrowExpandDiagonalIcon,
  ArrowDiagonalUpRightIcon, PeekSideIcon, CopyLinkIcon, DuplicateIcon,
  ArrowTurnUpRightIcon, TrashIcon, AiFaceIcon, QuestionMarkCircleIcon,
} from './components/ui/Icons';
import { cn } from './utils/cn';
import { HttpAdapter } from './component/adapters/HttpAdapter';
import type {
  ChangeEvent,
  ObjectDatabaseAdapter,
  ObjectDatabaseInstance,
  ObjectDatabaseProps,
} from './component/types';

const SOURCE_COLORS: Record<string, string> = {
  json: '#3b82f6',
  csv: '#f59e0b',
  mongodb: '#22c55e',
  postgresql: '#8b5cf6',
  adapter: '#64748b',
};

type DbSourceType = 'json' | 'csv' | 'mongodb' | 'postgresql';

const LazyDatabaseBlock = React.lazy(() => import('./components/DatabaseBlock').then(module => ({
  default: module.DatabaseBlock,
})));
const LazyBlockHandle = React.lazy(() => import('./components/ui/BlockHandle').then(module => ({
  default: module.BlockHandle,
})));
const LazyPageModal = React.lazy(() => import('./components/PageModal').then(module => ({
  default: module.PageModal,
})));

export const AdapterContext = createContext<ObjectDatabaseAdapter | null>(null);
export const AdapterProvider = AdapterContext.Provider;

type ObjectDatabaseWithStoreProps = ObjectDatabaseProps & {
  forwardedRef: React.ForwardedRef<ObjectDatabaseInstance>;
};

/** Embeddable root component for the full Notion database experience. */
export const ObjectDatabase = forwardRef<ObjectDatabaseInstance, ObjectDatabaseProps>(
  function ObjectDatabase(props, ref) {
    const store = useMemo(() => createDatabaseStore(), []);

    return (
      <DatabaseStoreProvider value={store}>
        <ObjectDatabaseWithStore {...props} forwardedRef={ref} />
      </DatabaseStoreProvider>
    );
  },
);

function ObjectDatabaseWithStore({
  mode = 'page',
  databaseId,
  adapter,
  theme,
  initialView,
  onPageOpen,
  className,
  forwardedRef,
}: Readonly<ObjectDatabaseWithStoreProps>) {
  const resolvedAdapter = useMemo<ObjectDatabaseAdapter>(
    () => adapter ?? new HttpAdapter(),
    [adapter],
  );
  const storeApi = useStoreApi();
  const dataSource = useDatabaseStore(s => s.activeDbmsSource) || 'adapter';

  useImperativeHandle(forwardedRef, () => ({
    refresh: async () => {
      await loadAdapterState(storeApi, resolvedAdapter);
    },
    getState: () => storeApi.getState(),
    openPage: (pageId: string | null) => storeApi.getState().openPage(pageId),
  }), [resolvedAdapter, storeApi]);

  return (
    <AdapterProvider value={resolvedAdapter}>
      <div
        className={cn('notion-object-database h-full w-full', className)}
        data-theme={theme}
        data-dbms-source={dataSource}
      >
        <ObjectDatabaseInner
          mode={mode}
          databaseId={databaseId}
          adapter={resolvedAdapter}
          initialView={initialView}
          onPageOpen={onPageOpen}
        />
      </div>
    </AdapterProvider>
  );
}

function ObjectDatabaseInner({
  mode,
  databaseId,
  adapter,
  initialView,
  onPageOpen,
}: Readonly<Required<Pick<ObjectDatabaseProps, 'mode'>> & {
  databaseId?: string;
  adapter: ObjectDatabaseAdapter;
  initialView?: string | null;
  onPageOpen?: (pageId: string | null) => void;
}>) {
  const [formulaReady, setFormulaReady] = useState(false);
  const activeViewId = useDatabaseStore(s => s.activeViewId);
  const views = useDatabaseStore(s => s.views);
  const openPageId = useDatabaseStore(s => s.openPageId);
  const databases = useDatabaseStore(s => s.databases);
  const dbmsLoading = useDatabaseStore(s => s.dbmsLoading);
  const dbmsError = useDatabaseStore(s => s.dbmsError);
  const setActiveView = useDatabaseStore(s => s.setActiveView);
  const storeApi = useStoreApi();
  const activeSource = useDbSource(s => s.activeSource);
  const setActiveSource = useDbSource(s => s.setActiveSource);
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const reloadFromAdapter = useCallback(
    async () => {
      await loadAdapterState(storeApi, adapter, { silent: true });
    },
    [adapter, storeApi],
  );

  useEffect(() => {
    let cancelled = false;

    initFormulaEngineOnce()
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[object-database] Formula engine init failed:', message);
      })
      .finally(() => {
        if (!cancelled) setFormulaReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadAdapterState(storeApi, adapter).then((storeSource) => {
      if (!cancelled && storeSource && storeSource !== activeSource) {
        setActiveSource(storeSource as DbSourceType);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [adapter, activeSource, setActiveSource, storeApi]);

  useEffect(() => {
    if (initialView && views[initialView] && activeViewId !== initialView) {
      setActiveView(initialView);
      return;
    }
    if (!databaseId) return;
    const nextView = Object.values(views).find(v => v.databaseId === databaseId);
    if (nextView && activeViewId !== nextView.id) setActiveView(nextView.id);
  }, [activeViewId, databaseId, initialView, setActiveView, views]);

  useEffect(() => {
    onPageOpen?.(openPageId);
  }, [onPageOpen, openPageId]);

  useDevFileChangeSubscription(adapter, reloadFromAdapter);

  const [lockViews, setLockViews] = useState(false);
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
      { items: [{ icon: <AiFaceIcon />, label: 'Ask AI', shortcut: 'Ctrl+J' }] },
      { items: [{ type: 'info' as const, lines: ['Last edited by user', `${format(new Date(), 'MMM d, yyyy h:mm a')}`] }] },
      {
        items: [
          {
            type: 'link' as const,
            icon: <QuestionMarkCircleIcon className="w-4 h-4" />,
            label: 'Learn about databases',
            href: 'https://www.notion.com/help/intro-to-databases',
            muted: true,
          },
        ],
      },
    ];
  }, [database, lockViews, view]);

  if (!formulaReady || dbmsLoading) {
    return <ObjectDatabaseLoading source={activeSource || 'adapter'} formulaPending={!formulaReady} />;
  }

  if (dbmsError) {
    return (
      <ObjectDatabaseError
        source={activeSource || 'adapter'}
        message={dbmsError}
        onRetry={async () => {
          await loadAdapterState(storeApi, adapter);
        }}
      />
    );
  }

  if (mode === 'inline') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<ObjectDatabaseLoading source={activeSource || 'adapter'} formulaPending={false} />}>
          <LazyDatabaseBlock
            mode="inline"
            databaseId={databaseId}
            initialViewId={initialView ?? undefined}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-surface-primary overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <ErrorBoundary>
          <Suspense fallback={<ObjectDatabaseLoading source={activeSource || 'adapter'} formulaPending={false} />}>
            <LazyBlockHandle
              className="flex-1 min-h-0"
              panelProps={{
                sections: blockPanelSections,
                searchable: true,
                searchPlaceholder: 'Search actions…',
                width: 265,
              }}
            >
              <LazyDatabaseBlock
                mode="full"
                databaseId={databaseId}
                initialViewId={initialView ?? undefined}
              />
            </LazyBlockHandle>
          </Suspense>
        </ErrorBoundary>
      </div>

      {openPageId && (
        <Suspense fallback={null}>
          <LazyPageModal
            pageId={openPageId}
            onClose={() => storeApi.getState().openPage(null)}
            mode={view?.settings?.openPagesIn || 'side_peek'}
          />
        </Suspense>
      )}
    </div>
  );
}

function ObjectDatabaseLoading({
  source,
  formulaPending,
}: Readonly<{ source: string; formulaPending: boolean }>) {
  const accentColor = SOURCE_COLORS[source] ?? '#3b82f6';
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-primary">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent"
          style={{ color: accentColor }}
        />
        <p className="text-sm text-ink-muted">
          {formulaPending ? 'Initializing formula engine' : 'Loading from'}{' '}
          <span className="font-semibold" style={{ color: accentColor }}>
            {source.toUpperCase()}
          </span>
          {formulaPending ? '…' : ' source…'}
        </p>
      </div>
    </div>
  );
}

function ObjectDatabaseError({
  source,
  message,
  onRetry,
}: Readonly<{ source: string; message: string; onRetry: () => void | Promise<void> }>) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-primary">
      <div className="flex flex-col items-center gap-3 max-w-md text-center">
        <div className="text-4xl">⚠️</div>
        <p className="text-sm font-medium text-ink-strong">
          Failed to load from {source.toUpperCase()} source
        </p>
        <p className="text-xs text-ink-muted">{message}</p>
        <button
          onClick={() => void onRetry()}
          className="mt-2 px-4 py-1.5 text-xs font-medium rounded-md
                     bg-accent text-white hover:bg-accent-bold transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function useDevFileChangeSubscription(adapter: ObjectDatabaseAdapter, onReload: () => void | Promise<void>): void {
  const storeApi = useStoreApi();
  const handleChange = useCallback((event: ChangeEvent) => {
    const state = storeApi.getState();
    switch (event.type) {
      case 'page-changed':
        state.patchPages({ [event.pageId]: event.changes });
        break;
      case 'page-inserted':
        storeApi.setState(current => ({ pages: { ...current.pages, [event.page.id]: event.page } }));
        break;
      case 'page-deleted':
        storeApi.setState((current) => {
          const pages = { ...current.pages };
          delete pages[event.pageId];
          return { pages };
        });
        break;
      case 'schema-changed':
      case 'state-replaced':
        void onReload();
        break;
    }
  }, [onReload, storeApi]);

  useEffect(() => {
    const unsubscribe = adapter.subscribe?.(handleChange);
    return unsubscribe;
  }, [adapter, handleChange]);
}

async function loadAdapterState(
  storeApi: DatabaseStoreApi,
  adapter: ObjectDatabaseAdapter,
  opts: { silent?: boolean } = {},
): Promise<string | null> {
  if (!opts.silent) storeApi.setState({ dbmsLoading: true, dbmsError: null });
  try {
    const loaded = await adapter.loadState();
    const current = storeApi.getState();
    const firstViewId = Object.keys(loaded.views)[0] ?? null;
    const activeViewId = current.activeViewId && loaded.views[current.activeViewId]
      ? current.activeViewId
      : firstViewId;
    const source = current.activeDbmsSource || 'adapter';

    storeApi.setState({
      databases: loaded.databases,
      pages: loaded.pages,
      views: loaded.views,
      activeViewId,
      activeDbmsSource: source,
      dbmsLoading: false,
      dbmsError: null,
    });

    return source;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[object-database] Load error:', message);
    if (!opts.silent) storeApi.setState({ dbmsError: message, dbmsLoading: false });
    return null;
  }
}

async function initFormulaEngineOnce(): Promise<void> {
  const bridgePath = './lib/engine/bridge';
  const bridge = await import(bridgePath) as { initFormulaEngine?: () => Promise<void> | void };
  await bridge.initFormulaEngine?.();
}

export default ObjectDatabase;
