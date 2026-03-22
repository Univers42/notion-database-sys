import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFormulaEngine } from './lib/engine/bridge';

// Await WASM formula engine before first render to avoid #ERROR flash
initFormulaEngine().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
