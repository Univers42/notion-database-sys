/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   copy-styles.mjs                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(packageRoot, '../../src');

const sourceStylesPath = resolve(sourceRoot, 'index.css');
const sourceTokensPath = resolve(sourceRoot, 'theme.css');

const stylesOutputPath = resolve(packageRoot, 'styles.css');
const themeOutputPath = resolve(packageRoot, 'theme.css');
const tokensOutputPath = resolve(packageRoot, 'tokens.css');

const styles = await readFile(sourceStylesPath, 'utf8');
const tokens = await readFile(sourceTokensPath, 'utf8');

const packagedStyles = styles
  .replace('@import "./theme.css";', '@import "./tokens.css";')
  .replace('@source "./**/*.{ts,tsx}";', '@source "./dist/**/*.js";');

const compatibilityTheme = [
  '/* Backwards-compatible style entry. Prefer @notion-db/object-database/styles.css. */',
  '@import "./styles.css";',
  '',
].join('\n');

await Promise.all([
  writeFile(stylesOutputPath, packagedStyles),
  writeFile(tokensOutputPath, tokens),
  writeFile(themeOutputPath, compatibilityTheme),
]);
