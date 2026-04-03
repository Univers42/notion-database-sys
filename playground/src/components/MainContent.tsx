import React, { Suspense } from 'react';
import { Plus, FileText } from 'lucide-react';

// Reuse production components from src/ via the @src alias
import { ErrorBoundary }  from '@src/components/ErrorBoundary';
import { DatabaseBlock }  from '@src/components/DatabaseBlock';

import { usePageStore }  from '../store/usePageStore';
import { useUserStore }  from '../store/useUserStore';

/**
 * The right-hand content panel.
 *
 * ┌──────────────────────────────────────────┐
 * │  activePage = null   → Home splash       │
 * │  activePage.kind='database' → DatabaseBlock
 * │  activePage.kind='page'     → Page title + content
 * └──────────────────────────────────────────┘
 */
export const MainContent: React.FC = () => {
  const activePage = usePageStore(s => s.activePage);
  const addPage    = usePageStore(s => s.addPage);
  const openPage   = usePageStore(s => s.openPage);
  const session    = useUserStore(s => s.activeSession());
  const persona    = useUserStore(s => s.activePersona());

  const jwt      = session?.accessToken ?? '';
  const firstWsId = session?.privateWorkspaces[0]?._id ?? '';

  // ── Home / no-selection splash ──────────────────────────────────────────

  if (!activePage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 h-full bg-[var(--color-surface-primary)]">
        <p className="text-4xl">{persona?.emoji ?? '🏠'}</p>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-ink)] mb-1">
            {persona?.name ?? 'Welcome'}
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {session?.privateWorkspaces[0]?.name ?? 'Your workspace'} is ready.
          </p>
        </div>
        <button
          type="button"
          disabled={!firstWsId || !jwt}
          className={[
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
          onClick={async () => {
            if (!firstWsId || !jwt) return;
            const p = await addPage(firstWsId, 'Untitled', jwt);
            if (p) openPage({ id: p._id, workspaceId: firstWsId, kind: 'page', title: p.title });
          }}
        >
          <Plus size={16} />
          New page
        </button>
      </div>
    );
  }

  // ── Database view (reuses the real DatabaseBlock from src/) ─────────────

  if (activePage.kind === 'database') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingPane />}>
          <div className="flex-1 h-full overflow-auto bg-[var(--color-surface-primary)]">
            <DatabaseBlock
              databaseId={activePage.id}
              mode="full"
            />
          </div>
        </Suspense>
      </ErrorBoundary>
    );
  }

  // ── Plain page view ─────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col h-full overflow-auto bg-[var(--color-surface-primary)]">
      {/* Page header */}
      <div className="max-w-3xl w-full mx-auto px-14 pt-20 pb-4">
        <div className="text-5xl mb-3">{activePage.icon ?? <FileText />}</div>
        <h1
          contentEditable
          suppressContentEditableWarning
          className={[
            'text-4xl font-bold text-[var(--color-ink)] outline-none',
            'empty:before:content-[\'Untitled\'] empty:before:text-[var(--color-ink-faint)]',
          ].join(' ')}
        >
          {activePage.title}
        </h1>
      </div>

      {/* Page body placeholder */}
      <div
        className="max-w-3xl w-full mx-auto px-14 pb-20 text-[var(--color-ink-muted)] text-sm"
        contentEditable
        suppressContentEditableWarning
      >
        <p className="text-[var(--color-ink-faint)] italic">Press '/' for commands…</p>
      </div>
    </div>
  );
};

// ── LoadingPane ──────────────────────────────────────────────────────────────

const LoadingPane: React.FC = () => (
  <div className="flex-1 flex items-center justify-center h-full">
    <div className="animate-spin w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full" />
  </div>
);
