/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   write-dts-map.mjs                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { readFile, writeFile } from 'node:fs/promises';

const declarationPath = new URL('../dist/index.d.ts', import.meta.url);
const mapPath = new URL('../dist/index.d.ts.map', import.meta.url);
const sourcePath = new URL('../src/index.ts', import.meta.url);

const [declaration, source] = await Promise.all([
  readFile(declarationPath, 'utf8'),
  readFile(sourcePath, 'utf8'),
]);

if (!declaration.includes('sourceMappingURL=index.d.ts.map')) {
  await writeFile(declarationPath, `${declaration}\n//# sourceMappingURL=index.d.ts.map\n`);
}

await writeFile(mapPath, JSON.stringify({
  version: 3,
  file: 'index.d.ts',
  sources: ['../src/index.ts'],
  sourcesContent: [source],
  names: [],
  mappings: '',
}, null, 2));
