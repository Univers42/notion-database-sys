import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '@src/index.css';
import { initFormulaEngine } from '@src/lib/engine/bridge';

// Eagerly init theme so data-theme applies before first paint
import '@src/store/dbms/hardcoded/useThemeStore.ts';

initFormulaEngine().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
