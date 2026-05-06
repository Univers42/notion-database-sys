/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   tsup.config.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 20:16:43 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { defineConfig } from 'tsup';

const PEER_EXTERNALS = [
  'react',
  'react-dom',
  'zustand',
  'lucide-react',
  'recharts',
  'tailwindcss',
  'motion',
  'clsx',
  'tailwind-merge',
  'date-fns',
  'katex',
  'leaflet',
  'mermaid',
  /^react\//,
  /^react-dom\//,
  /^zustand\//,
  /^@radix-ui\//,
  /^katex\//,
  /^leaflet\//,
] as const;

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2022',
  platform: 'browser',
  splitting: true,
  sourcemap: false,
  clean: true,
  minify: false,
  treeshake: true,
  dts: {
    entry: 'src/index.ts',
    resolve: true,
    compilerOptions: {
      declarationMap: true,
    },
  },
  outDir: 'dist',
  external: [...PEER_EXTERNALS],
  esbuildOptions(options) {
    options.conditions = ['import', 'module', 'browser'];
    options.jsx = 'automatic';
    options.loader = {
      ...options.loader,
      '.css': 'empty',
    };
  },
});
