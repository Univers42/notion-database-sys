import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import wasm from 'vite-plugin-wasm';
import { dbmsMiddleware } from './server/dbmsMiddleware';

export default defineConfig(({ mode }) => {
  const root = __dirname;                       // src/
  const workspace = path.resolve(root, '..');   // project root
  const env = loadEnv(mode, workspace, '');

  return {
    root,
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
      {
        name: 'patch-d3-dsv-eval',
        enforce: 'pre' as const,
        transform(code: string, id: string) {
          if (!id.includes('d3-dsv') && !id.includes('chunk-')) return null;
          if (!code.includes('new Function("d"')) return null;
          return code.replace(
            /return new Function\("d", "return \{" \+ columns\.map\(function\(name, i\) \{\s*return JSON\.stringify\(name\) \+ ": d\[" \+ i \+ "\] \|\| \\"\\"";\[\s\S]*?\}\)\.join\(","\) \+ "\}"\);/,
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
        '@': workspace,
        '@src': root,
      },
    },
    build: {
      outDir: path.resolve(workspace, 'dist'),
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: [
          '**/store/dbms/**/_notion_state.json',
          '**/store/dbms/**/_field_map.json',
          '**/store/dbms/**/tasks.json',
          '**/store/dbms/**/contacts.json',
          '**/store/dbms/**/content.json',
          '**/store/dbms/**/inventory.json',
          '**/store/dbms/**/products.json',
          '**/store/dbms/**/projects.json',
          '**/store/dbms/**/*.csv',
          '**/store/dbms/**/*.sql',
          '**/store/dbms/**/*.seed.json',
        ],
      },
    },
    optimizeDeps: {
      exclude: ['formula-engine', 'mermaid'],
    },
  };
});
