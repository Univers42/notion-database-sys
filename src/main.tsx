/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.tsx                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:44:03 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 17:44:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFormulaEngine } from './lib/engine/bridge';
import { useDatabaseStore } from './store/useDatabaseStore';

// Eagerly initialize the theme store so it applies data-theme before first paint
import './store/dbms/hardcoded/useThemeStore.ts';

// ─── Live file watcher — listen for server-side file change events ──────────
// When a flat file (JSON/CSV) is edited in the codespace, the server's
// inotify watcher reverse-syncs it and pushes a WebSocket event here.
// We surgically patch only the changed properties — zero page reload.
if (import.meta.hot) {
  import.meta.hot.on('dbms:file-changed', (data) => {
    const { file, source, patches } = data as {
      file: string; source: string;
      patches?: Record<string, Record<string, unknown>>;
    };
    console.log('[dbms] 📝 External file change:', file, `(${source})`);

    if (patches && Object.keys(patches).length > 0) {
      // Surgical update — patch only changed page properties in Zustand
      useDatabaseStore.getState().patchPages(patches);
      const n = Object.values(patches).reduce(
        (s, p) => s + Object.keys(p).length, 0,
      );
      console.log(`[dbms] ✅ Patched ${n} properties in ${Object.keys(patches).length} pages (no reload)`);
    } else {
      // Fallback — full refetch (should rarely happen)
      useDatabaseStore.getState().loadFromSource(undefined, { silent: true });
    }
  });
}

// Await WASM formula engine before first render to avoid #ERROR flash
initFormulaEngine().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
