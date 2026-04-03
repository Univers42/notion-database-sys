import React, { useEffect, useState } from 'react';

import { useUserStore } from './store/useUserStore';
import { usePageStore } from './store/usePageStore';
import { NotionSidebar } from './components/sidebar/NotionSidebar';
import { MainContent }   from './components/MainContent';

/**
 * Root of the Playground app.
 *
 * On mount:
 * 1. `useUserStore.init()` logs in all 3 pre-seeded accounts in parallel.
 * 2. Renders a loading spinner while auth is in-flight.
 * 3. Once auth resolves (or gracefully fails), displays the split-panel layout.
 */
const App: React.FC = () => {
  const [ready, setReady] = useState(false);

  const initUsers   = useUserStore(s => s.init);
  const initialized = useUserStore(s => s.initialized);

  // Run once on mount
  useEffect(() => {
    if (initialized) { setReady(true); return; }
    initUsers().finally(() => setReady(true));
  }, [initUsers, initialized]);

  // ── Loading splash ────────────────────────────────────────────────────────

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[var(--color-surface-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full" />
          <p className="text-sm text-[var(--color-ink-muted)]">Signing in…</p>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-surface-primary)]">
      {/* Left sidebar (240 px) */}
      <NotionSidebar
        onOpenHome={() => usePageStore.setState({ activePage: null })}
      />

      {/* Content area */}
      <main className="flex-1 flex min-w-0 overflow-hidden">
        <MainContent />
      </main>
    </div>
  );
};

export default App;
