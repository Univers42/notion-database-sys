import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig(({ mode }) => {
  const root = __dirname;                       // playground/
  const workspace = path.resolve(root, '..');   // project root

  // Load env from workspace root (VITE_API_URL, etc.)
  const env = loadEnv(mode, workspace, '');

  return {
    root,
    plugins: [
      react(),
      tailwindcss(),
      wasm(),
    ],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(
        env.VITE_API_URL ?? 'http://localhost:4000',
      ),
    },
    resolve: {
      alias: {
        '@src': path.resolve(workspace, 'src'),
      },
    },
    build: {
      outDir: path.resolve(workspace, 'dist/playground'),
    },
    server: {
      port: 3001,
      host: '0.0.0.0',
    },
    optimizeDeps: {
      exclude: ['formula-engine', 'mermaid'],
    },
  };
});
