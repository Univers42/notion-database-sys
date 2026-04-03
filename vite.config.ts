import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path, { resolve } from 'path';
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
      // Patch d3-dsv's `new Function()` to avoid CSP eval violations.
      // d3-dsv uses `new Function("d", "return {" + ...)` for CSV column accessors.
      // Replace it with a safe closure-based equivalent.
      {
        name: 'patch-d3-dsv-eval',
        enforce: 'pre' as const,
        transform(code: string, id: string) {
          if (!id.includes('d3-dsv') && !id.includes('chunk-')) return null;
          if (!code.includes('new Function("d"')) return null;
          return code.replace(
            /return new Function\("d", "return \{" \+ columns\.map\(function\(name, i\) \{\s*return JSON\.stringify\(name\) \+ ": d\[" \+ i \+ "\] \|\| \\\"\\\"";[\s\S]*?\}\)\.join\(","\) \+ "\}"\);/,
            `return function(d) { var o = {}; columns.forEach(function(name, i) { o[name] = d[i] || ""; }); return o; };`,
          );
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@src': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          playground: resolve(__dirname, 'playground/index.html'),
        },
      },
    },
    server: {
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
      exclude: ['formula-engine', 'mermaid'],
    },
  };
});
