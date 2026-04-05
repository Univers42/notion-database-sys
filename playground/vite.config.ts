import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import wasm from 'vite-plugin-wasm';

/**
 * Stub plugin for the WASM formula-engine package.
 * The main src/ tree imports bridge.ts which dynamically loads ./pkg/formula_engine.js.
 * That WASM artefact isn't built inside the playground Docker image, so we resolve
 * the import to a virtual no-op module. bridge.ts already handles WASM load failures
 * gracefully via its catch handler.
 */
function formulaEngineStub(): Plugin {
  const STUB_ID = '\0formula-engine-stub';
  return {
    name: 'playground:formula-engine-stub',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source.includes('pkg/formula_engine') && importer?.includes('engine/bridge')) {
        return { id: STUB_ID, moduleSideEffects: false };
      }
    },
    load(id) {
      if (id === STUB_ID) {
        return 'export default function init() { throw new Error("WASM not available"); }';
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const root = __dirname;                       // playground/
  const workspace = path.resolve(root, '..');   // project root

  // Load env from workspace root (VITE_API_URL, etc.)
  const env = loadEnv(mode, workspace, '');

  return {
    root,
    plugins: [
      formulaEngineStub(),
      react(),
      tailwindcss(),
      wasm(),
    ],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(
        env.VITE_API_URL || 'http://localhost:4000',
      ),
    },
    resolve: {
      alias: {
        '@src': path.resolve(workspace, 'src'),
      },
    },
    build: {
      outDir: path.resolve(root, 'build'),
    },
    server: {
      port: 3001,
      host: '0.0.0.0',
      watch: {
        usePolling: true,
      },
    },
    optimizeDeps: {
      exclude: ['formula-engine', 'mermaid'],
    },
  };
});
