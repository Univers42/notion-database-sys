/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.tsx                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:44:03 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 17:19:29 by dlesieur         ###   ########.fr       */
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
// We simply re-fetch the state — no full page reload.
if (import.meta.hot) {
  import.meta.hot.on('dbms:file-changed', (data) => {
    console.log('[dbms] 📝 External file change:', data.file, `(${data.source})`);
    useDatabaseStore.getState().loadFromSource(undefined, { silent: true });
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
