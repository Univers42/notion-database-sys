import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import wasm from 'vite-plugin-wasm';
import { dbmsMiddleware } from './src/server/dbmsMiddleware';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      wasm(),
      {
        name: 'dbms-api',
        configureServer(server) {
          dbmsMiddleware(server);
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      headers: {
        'Content-Security-Policy': "script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:;",
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: [
          '**/src/store/dbms/**/_notion_state.json',
          '**/src/store/dbms/**/_field_map.json',
          '**/src/store/dbms/**/tasks.json',
          '**/src/store/dbms/**/contacts.json',
          '**/src/store/dbms/**/content.json',
          '**/src/store/dbms/**/inventory.json',
          '**/src/store/dbms/**/products.json',
          '**/src/store/dbms/**/projects.json',
          '**/src/store/dbms/**/*.csv',
          '**/src/store/dbms/**/*.sql',
          '**/src/store/dbms/**/*.seed.json',
        ],
      },
    },
    optimizeDeps: {
      exclude: ['formula-engine'],
    },
  };
});
